from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class SubscriptionTier(str,Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"


# Admin Response Models
class UserStats(BaseModel):
    id: int
    email: str
    full_name: str
    subscription_tier: SubscriptionTier
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_active_at: Optional[datetime]
    connection_count: int
    total_queries: int
    
    class Config:
        from_attributes = True


class TierStatistics(BaseModel):
    tier: SubscriptionTier
    user_count: int
    percentage: float


class SystemAnalytics(BaseModel):
    total_users: int
    active_users: int
    total_connections: int
    total_queries: int
    tier_distribution: List[TierStatistics]


class PaymentRecord(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_name: str
    tier: SubscriptionTier
    amount: float
    payment_method: Optional[str]
    status: PaymentStatus
    payment_date: datetime
    notes: Optional[str]
    
    class Config:
        from_attributes = True


class UpdateUserTierRequest(BaseModel):
    tier: SubscriptionTier
    payment_amount: Optional[float] = None
    payment_method: Optional[str] = "manual"
    notes: Optional[str] = None
