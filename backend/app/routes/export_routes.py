from fastapi import APIRouter, HTTPException, Response, Depends
from sqlalchemy.orm import Session
from ..models import ExportRequest, QueryExportRequest
from ..controllers.export_controller import ExportController
from ..database import get_db
from .auth_routes import get_current_user
from ..models.db_models import User

router = APIRouter(prefix="/api/export", tags=["export"])

@router.post("/csv")
async def export_csv(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export query results to CSV"""
    return await ExportController.export_csv(request)

@router.post("/xlsx")
async def export_xlsx(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export query results to XLSX"""
    return await ExportController.export_xlsx(request)

@router.post("/query/csv")
async def export_query_csv(
    request: QueryExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export full query results to CSV (server-side execution)"""
    return await ExportController.export_query_csv(db, current_user.id, request)
