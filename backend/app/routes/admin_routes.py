from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.routes.auth_routes import get_current_user
from app.models.db_models import User
from app.models.admin_models import (
    UserStats,
    SystemAnalytics,
    PaymentRecord,
    UpdateUserTierRequest
)
from app.services.admin_service import AdminService

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to ensure user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/users", response_model=List[UserStats])
async def get_all_users(
    tier: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get all users with statistics (admin only)"""
    return await AdminService.get_all_users_with_stats(db, tier_filter=tier)


@router.get("/analytics", response_model=SystemAnalytics)
async def get_system_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get overall system analytics (admin only)"""
    return await AdminService.get_system_analytics(db)


@router.get("/payments", response_model=List[PaymentRecord])
async def get_payments(
    user_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get payment history with optional filters (admin only)"""
    return await AdminService.get_payment_history(db, user_id, status, limit)


@router.post("/users/{user_id}/tier")
async def update_user_tier(
    user_id: int,
    request: UpdateUserTierRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update user subscription tier (admin only)"""
    user = await AdminService.update_user_tier(
        db=db,
        user_id=user_id,
        new_tier=request.tier,
        payment_amount=request.payment_amount,
        payment_method=request.payment_method or "manual",
        notes=request.notes
    )
    
    return {
        "message": f"User {user.email} upgraded to {request.tier.value}",
        "user_id": user.id,
        "new_tier": user.subscription_tier.value
    }
