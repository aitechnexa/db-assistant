from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import QueryRequest, QueryResponse
from app.models.db_models import User
from app.routes.auth_routes import get_current_user
from app.services.quota_service import QuotaService
from app.controllers.query_controller import QueryController

router = APIRouter(prefix="/api/query", tags=["queries"])

@router.post("", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Execute a natural language query with quota enforcement"""
    # Check and enforce quota
    await QuotaService.enforce_quota(db, current_user.id)
    
    # Execute the query
    response = await QueryController.execute_query(db, current_user.id, request)
    
    # Increment usage
    await QuotaService.increment_usage(db, current_user.id)
    
    return response

@router.get("/quota")
async def get_quota(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's quota information"""
    return await QuotaService.get_quota_info(db, current_user.id)
