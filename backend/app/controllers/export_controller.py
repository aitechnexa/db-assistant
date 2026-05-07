from fastapi import HTTPException, Response
from ..models import ExportRequest, QueryExportRequest
from ..utils.export_utils import export_to_csv, export_to_xlsx
from ..config.settings import settings

class ExportController:
    """Controller for export operations"""
    
    @staticmethod
    async def export_csv(request: ExportRequest) -> Response:
        """Export query results to CSV"""
        try:
            csv_data = export_to_csv(request.data)
            return Response(
                content=csv_data,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={request.filename}.csv"
                }
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"CSV export failed: {str(e)}"
            )
    
    @staticmethod
    async def export_xlsx(request: ExportRequest) -> Response:
        """Export query results to XLSX"""
        try:
            xlsx_data = export_to_xlsx(request.data)
            return Response(
                content=xlsx_data,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename={request.filename}.xlsx"
                }
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"XLSX export failed: {str(e)}"
            )

    @staticmethod
    async def export_query_csv(db, user_id: int, request: QueryExportRequest) -> Response:
        """Export query results to CSV by executing SQL directly"""
        try:
            from ..services.database_service import DatabaseService
            
            # Execute query with configured max export limit
            results = await DatabaseService.execute_query(
                db=db,
                user_id=user_id,
                connection_id=request.database_id,
                query=request.sql_query,
                limit=settings.MAX_EXPORT_LIMIT
            )
            
            csv_data = export_to_csv(results["data"])
            
            return Response(
                content=csv_data,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={request.filename}.csv"
                }
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Query export failed: {str(e)}"
            )
