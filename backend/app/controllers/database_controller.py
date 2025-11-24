from fastapi import HTTPException
from typing import List
from sqlalchemy.orm import Session
from ..models.database import DatabaseConnection
from ..services.database_service import DatabaseService
from ..services.auth_service import AuthService
from ..models.db_models import User, DatabaseConnection as DBDatabaseConnection


class DatabaseController:
    """Controller for database connection operations"""
    
    @staticmethod
    async def add_database(db: Session, user_id: int, connection: DatabaseConnection) -> DatabaseConnection:
        """Add a new database connection with quota enforcement"""
        try:
            # Get user to check subscription tier
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Check connection limits based on subscription tier
            limits = AuthService.get_subscription_limits(user.subscription_tier)
            max_connections = limits["max_connections"]
            
            # Count existing connections
            existing_count = db.query(DBDatabaseConnection).filter(
                DBDatabaseConnection.user_id == user_id
            ).count()
            
            # Enforce limit (unless unlimited for PRO tier)
            if max_connections != -1 and existing_count >= max_connections:
                tier_name = user.subscription_tier.value.capitalize()
                raise HTTPException(
                    status_code=403,
                    detail=f"{tier_name} tier allows {max_connections} database connection(s). You currently have {existing_count}. Please upgrade your plan to add more databases."
                )
            
            # Test connection first
            is_valid = await DatabaseService.test_connection(connection)
            if not is_valid:
                raise HTTPException(
                    status_code=400, 
                    detail="Database connection test failed. Please check your credentials."
                )
            
            new_connection = await DatabaseService.add_connection(db, user_id, connection)
            return new_connection
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to add database: {str(e)}")
    
    @staticmethod
    async def get_databases(db: Session, user_id: int) -> List[DatabaseConnection]:
        """Get all database connections for a user"""
        try:
            return await DatabaseService.get_all_connections(db, user_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch databases: {str(e)}")
    
    @staticmethod
    async def get_database(db: Session, user_id: int, database_id: int) -> DatabaseConnection:
        """Get a specific database connection"""
        try:
            connection = await DatabaseService.get_connection(db, user_id, database_id)
            if not connection:
                raise HTTPException(status_code=404, detail="Database connection not found")
            return connection
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch database: {str(e)}")
    
    @staticmethod
    async def update_database(db: Session, user_id: int, database_id: int, connection: DatabaseConnection) -> DatabaseConnection:
        """Update a database connection"""
        try:
            # Test connection first if credentials are being updated
            if connection.password and connection.password != "****":
                is_valid = await DatabaseService.test_connection(connection)
                if not is_valid:
                    raise HTTPException(
                        status_code=400,
                        detail="Database connection test failed. Please check your credentials."
                    )
            
            updated_connection = await DatabaseService.update_connection(db, user_id, database_id, connection)
            if not updated_connection:
                raise HTTPException(status_code=404, detail="Database connection not found")
            return updated_connection
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update database: {str(e)}")
    
    @staticmethod
    async def delete_database(db: Session, user_id: int, database_id: int) -> dict:
        """Delete a database connection"""
        try:
            success = await DatabaseService.delete_connection(db, user_id, database_id)
            if not success:
                raise HTTPException(status_code=404, detail="Database connection not found")
            return {"message": "Database connection deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete database: {str(e)}")
    
    @staticmethod
    async def test_connection(connection: DatabaseConnection) -> dict:
        """Test a database connection"""
        try:
            is_valid = await DatabaseService.test_connection(connection)
            return {
                "success": is_valid,
                "message": "Connection successful" if is_valid else "Connection failed"
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
    
    @staticmethod
    async def get_connection_status(db: Session, user_id: int, database_id: int) -> dict:
        """Get connection status for a database"""
        try:
            connection = await DatabaseService.get_connection(db, user_id, database_id)
            if not connection:
                raise HTTPException(status_code=404, detail="Database connection not found")
            
            is_valid = await DatabaseService.test_connection(connection)
            return {
                "database_id": database_id,
                "status": "connected" if is_valid else "disconnected",
                "last_checked": "now"
            }
        except HTTPException:
            raise
        except Exception as e:
            return {
                "database_id": database_id,
                "status": "error",
                "message": str(e)
            }

    @staticmethod
    async def get_database_schema(db: Session, user_id: int, database_id: int) -> dict:
        """Get structured schema for a database"""
        try:
            connection = await DatabaseService.get_connection(db, user_id, database_id)
            if not connection:
                raise HTTPException(status_code=404, detail="Database connection not found")
            
            return await DatabaseService.get_schema_structure(db, user_id, database_id)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch database schema: {str(e)}")
