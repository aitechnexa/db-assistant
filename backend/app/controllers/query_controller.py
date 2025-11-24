from fastapi import HTTPException
from sqlalchemy.orm import Session
from ..models import QueryRequest, QueryResponse
from ..services.database_service import DatabaseService
from ..services.langgraph_service import LangGraphService

class QueryController:
    """Controller for query operations"""
    
    @staticmethod
    async def execute_query(db: Session, user_id: int, request: QueryRequest) -> QueryResponse:
        """Execute a natural language query"""
        try:
            # Validate database connection exists
            connection = await DatabaseService.get_connection(db, user_id, int(request.database_id))
            if not connection:
                raise HTTPException(
                    status_code=404, 
                    detail="Database connection not found"
                )
            
            # Get database schema
            schema = await DatabaseService.get_schema_info(db, user_id, int(request.database_id))
            
            # Generate SQL query using LangGraph (with optional deep thinking)
            sql_result = await LangGraphService.generate_sql(
                question=request.question,
                schema=schema,
                use_deep_think=request.use_deep_think
            )
            
            if sql_result.get("error"):
                raise HTTPException(
                    status_code=500, 
                    detail=f"SQL generation failed: {sql_result['error']}"
                )
            
            sql_query = sql_result["sql_query"]
            
            # Execute the query
            query_results = await DatabaseService.execute_query(
                db=db,
                user_id=user_id,
                connection_id=int(request.database_id),
                query=sql_query
            )
            
            # Generate natural language answer and summary
            answer_result = await LangGraphService.generate_answer(
                question=request.question,
                results=query_results
            )
            
            return QueryResponse(
                answer=answer_result["answer"],
                summary=answer_result["summary"],
                sql_query=sql_query,
                results=query_results["data"],
                row_count=query_results["row_count"],
                columns=query_results["columns"],
                reasoning=sql_result.get("reasoning", None)
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Query execution failed: {str(e)}"
            )
