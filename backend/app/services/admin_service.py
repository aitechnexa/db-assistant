from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.db_models import User, DatabaseConnection, QueryUsage, Payment, SubscriptionTier, PaymentStatus
from app.models.admin_models import UserStats, TierStatistics, SystemAnalytics,PaymentRecord
from fastapi import HTTPException


class AdminService:
    """Service for admin operations and analytics"""
    
    @staticmethod
    async def get_all_users_with_stats(db: Session, tier_filter: Optional[str] = None) -> List[UserStats]:
        """Get all users with their statistics"""
        query = db.query(User)
        
        # Apply tier filter if provided
        if tier_filter:
            query = query.filter(User.subscription_tier == tier_filter)
        
        users = query.all()
        
        user_stats = []
        for user in users:
            # Count connections
            connection_count = db.query(DatabaseConnection).filter(
                DatabaseConnection.user_id == user.id
            ).count()
            
            # Count total queries
            total_queries = db.query(func.sum(QueryUsage.query_count)).filter(
                QueryUsage.user_id == user.id
            ).scalar() or 0
            
            user_stats.append(UserStats(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                subscription_tier=user.subscription_tier,
                is_active=user.is_active,
                is_admin=user.is_admin,
                created_at=user.created_at,
                last_active_at=user.last_active_at,
                connection_count=connection_count,
                total_queries=int(total_queries)
            ))
        
        return user_stats
    
    @staticmethod
    async def get_tier_statistics(db: Session) -> List[TierStatistics]:
        """Get user distribution by subscription tier"""
        total_users = db.query(User).count()
        
        if total_users == 0:
            return []
        
        tier_stats = []
        for tier in SubscriptionTier:
            count = db.query(User).filter(User.subscription_tier == tier).count()
            percentage = (count / total_users) * 100 if total_users > 0 else 0
            
            tier_stats.append(TierStatistics(
                tier=tier,
                user_count=count,
                percentage=round(percentage, 2)
            ))
        
        return tier_stats
    
    @staticmethod
    async def get_system_analytics(db: Session) -> SystemAnalytics:
        """Get overall system analytics"""
        total_users = db.query(User).count()
        
        # Active users (used service in last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        active_users = db.query(User).filter(
            User.last_active_at >= thirty_days_ago
        ).count()
        
        total_connections = db.query(DatabaseConnection).count()
        
        total_queries = db.query(func.sum(QueryUsage.query_count)).scalar() or 0
        
        tier_distribution = await AdminService.get_tier_statistics(db)
        
        return SystemAnalytics(
            total_users=total_users,
            active_users=active_users,
            total_connections=total_connections,
            total_queries=int(total_queries),
            tier_distribution=tier_distribution
        )
    
    @staticmethod
    async def get_payment_history(
        db: Session,
        user_id: Optional[int] = None,
        status_filter: Optional[str] = None,
        limit: int = 100
    ) -> List[PaymentRecord]:
        """Get payment history with optional filters"""
        query = db.query(Payment).join(User)
        
        if user_id:
            query = query.filter(Payment.user_id == user_id)
        
        if status_filter:
            query = query.filter(Payment.status == status_filter)
        
        payments = query.order_by(Payment.payment_date.desc()).limit(limit).all()
        
        payment_records = []
        for payment in payments:
            user = db.query(User).filter(User.id == payment.user_id).first()
            payment_records.append(PaymentRecord(
                id=payment.id,
                user_id=payment.user_id,
                user_email=user.email,
                user_name=user.full_name,
                tier=payment.tier,
                amount=float(payment.amount),
                payment_method=payment.payment_method,
                status=payment.status,
                payment_date=payment.payment_date,
                notes=payment.notes
            ))
        
        return payment_records
    
    @staticmethod
    async def update_user_tier(
        db: Session,
        user_id: int,
        new_tier: SubscriptionTier,
        payment_amount: Optional[float] = None,
        payment_method: str = "manual",
        notes: Optional[str] = None
    ) -> User:
        """Update user subscription tier and record payment"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user tier
        old_tier = user.subscription_tier
        user.subscription_tier = new_tier
        
        # Record payment if amount provided
        if payment_amount and payment_amount > 0:
            payment = Payment(
                user_id=user_id,
                tier=new_tier,
                amount=payment_amount,
                payment_method=payment_method,
                status=PaymentStatus.COMPLETED,
                notes=notes or f"Upgraded from {old_tier.value} to {new_tier.value}"
            )
            db.add(payment)
        
        db.commit()
        db.refresh(user)
        
        return user
