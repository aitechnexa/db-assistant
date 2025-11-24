from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    username: str  # Keep as username for compatibility, but it's email
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    subscription_tier: SubscriptionTier
    is_active: bool
    is_admin: bool
    query_quota_remaining: int
    max_connections: int
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
