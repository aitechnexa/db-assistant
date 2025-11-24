from sqlalchemy.orm import Session
from datetime import date
from app.models.db_models import QueryUsage, User, SubscriptionTier
from app.services.auth_service import AuthService
from fastapi import HTTPException, status

class QuotaService:
    """Service for managing user query quotas"""
    
    @staticmethod
    async def check_quota(db: Session, user_id: int) -> bool:
        """Check if user can make a query today"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        limits = AuthService.get_subscription_limits(user.subscription_tier)
        daily_limit = limits["daily_queries"]
        
        # Unlimited queries for PRO tier
        if daily_limit == -1:
            return True
        
        # Check today's usage
        today = date.today()
        usage = db.query(QueryUsage).filter(
            QueryUsage.user_id == user_id,
            QueryUsage.query_date == today
        ).first()
        
        if not usage:
            return True
        
        return usage.query_count < daily_limit
    
    @staticmethod
    async def increment_usage(db: Session, user_id: int) -> None:
        """Increment daily query count for user"""
        today = date.today()
        
        usage = db.query(QueryUsage).filter(
            QueryUsage.user_id == user_id,
            QueryUsage.query_date == today
        ).first()
        
        if usage:
            usage.query_count += 1
        else:
            usage = QueryUsage(
                user_id=user_id,
                query_date=today,
                query_count=1
            )
            db.add(usage)
        
        db.commit()
    
    @staticmethod
    async def get_quota_info(db: Session, user_id: int) -> dict:
        """Get quota information for a user"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        limits = AuthService.get_subscription_limits(user.subscription_tier)
        daily_limit = limits["daily_queries"]
        
        # Get today's usage
        today = date.today()
        usage = db.query(QueryUsage).filter(
            QueryUsage.user_id == user_id,
            QueryUsage.query_date == today
        ).first()
        
        queries_used = usage.query_count if usage else 0
        
        if daily_limit == -1:
            return {
                "subscription_tier": user.subscription_tier.value,
                "daily_limit": -1,
                "queries_used": queries_used,
                "queries_remaining": -1,  # unlimited
                "can_query": True
            }
        
        queries_remaining = max(0, daily_limit - queries_used)
        
        return {
            "subscription_tier": user.subscription_tier.value,
            "daily_limit": daily_limit,
            "queries_used": queries_used,
            "queries_remaining": queries_remaining,
            "can_query": queries_remaining > 0
        }
    
    @staticmethod
    async def enforce_quota(db: Session, user_id: int) -> None:
        """Enforce quota - raise exception if limit exceeded"""
        can_query = await QuotaService.check_quota(db, user_id)
        
        if not can_query:
            quota_info = await QuotaService.get_quota_info(db, user_id)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Daily query limit exceeded",
                    "quota_info": quota_info,
                    "upgrade_message": "Upgrade to BASIC or PRO for more queries"
                }
            )
    
    @staticmethod
    async def reset_daily_quotas(db: Session) -> int:
        """Reset all daily quotas (for cron job) - returns number of records reset"""
        # This doesn't actually reset, just allows new day's queries
        # QueryUsage records are kept for history
        # The check_quota method automatically handles new days
        return 0  # No-op since we keep historical data
