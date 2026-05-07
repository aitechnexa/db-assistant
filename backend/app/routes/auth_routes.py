from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta, date
from dataclasses import dataclass
from app.database import get_db
from app.models.auth import UserCreate, UserLogin, UserResponse, Token
from app.models.db_models import User, QueryUsage
from app.services.auth_service import AuthService
from app.config.settings import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()


@dataclass
class AuthUser:
    """Lightweight user object built from JWT claims — no DB query needed."""
    id: int
    email: str
    subscription_tier: str
    is_active: bool
    is_admin: bool


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthUser:
    """Validate JWT and return AuthUser built from claims (zero DB queries)."""
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    if not payload.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    return AuthUser(
        id=payload["sub"],
        email=payload.get("email", ""),
        subscription_tier=payload.get("tier", "free"),
        is_active=payload.get("is_active", True),
        is_admin=payload.get("is_admin", False),
    )

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        new_user = await AuthService.register_user(db, user_data)
        
        # Get limits for the user's tier
        limits = AuthService.get_subscription_limits(new_user.subscription_tier)
        
        # Get remaining quota (0 initially since no queries made)
        quota_remaining = limits["daily_queries"]
        
        return UserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            subscription_tier=new_user.subscription_tier,
            is_active=new_user.is_active,
            is_admin=new_user.is_admin,
            query_quota_remaining=quota_remaining,
            max_connections=limits["max_connections"]
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token with user info"""
    user = await AuthService.authenticate_user(db, credentials.username, credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    access_token = AuthService.create_access_token(
        user=user,
        expires_delta=access_token_expires,
    )
    
    # Get limits for the user's tier
    limits = AuthService.get_subscription_limits(user.subscription_tier)
    
    # Get today's query usage
    today = date.today()
    usage = db.query(QueryUsage).filter(
        QueryUsage.user_id == user.id,
        QueryUsage.query_date == today
    ).first()
    
    queries_used = usage.query_count if usage else 0
    quota_remaining = max(0, limits["daily_queries"] - queries_used) if limits["daily_queries"] > 0 else -1
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        subscription_tier=user.subscription_tier,
        is_active=user.is_active,
        is_admin=user.is_admin,
        query_quota_remaining=quota_remaining,
        max_connections=limits["max_connections"]
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    limits = AuthService.get_subscription_limits(current_user.subscription_tier)
    
    # Get today's query usage
    today = date.today()
    usage = db.query(QueryUsage).filter(
        QueryUsage.user_id == current_user.id,
        QueryUsage.query_date == today
    ).first()
    
    queries_used = usage.query_count if usage else 0
    quota_remaining = max(0, limits["daily_queries"] - queries_used) if limits["daily_queries"] > 0 else -1
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        subscription_tier=current_user.subscription_tier,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        query_quota_remaining=quota_remaining,
        max_connections=limits["max_connections"]
    )
