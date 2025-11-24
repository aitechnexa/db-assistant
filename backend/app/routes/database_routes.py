from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
from ..models.database import DatabaseConnection
from ..models.db_models import User
from ..controllers.database_controller import DatabaseController
from ..database import get_db
from .auth_routes import get_current_user

router = APIRouter(prefix="/api/databases", tags=["databases"])

@router.post("", response_model=DatabaseConnection)
async def add_database(
    connection: DatabaseConnection,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new database connection"""
    return await DatabaseController.add_database(db, current_user.id, connection)

@router.get("", response_model=List[DatabaseConnection])
async def get_databases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all database connections for the current user"""
    return await DatabaseController.get_databases(db, current_user.id)

@router.get("/{database_id}", response_model=DatabaseConnection)
async def get_database(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific database connection"""
    return await DatabaseController.get_database(db, current_user.id, database_id)

@router.put("/{database_id}", response_model=DatabaseConnection)
async def update_database(
    database_id: int,
    connection: DatabaseConnection,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a database connection"""
    return await DatabaseController.update_database(db, current_user.id, database_id, connection)

@router.delete("/{database_id}")
async def delete_database(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a database connection"""
    return await DatabaseController.delete_database(db, current_user.id, database_id)

@router.post("/test")
async def test_database_connection(connection: DatabaseConnection):
    """Test a database connection (no auth required for testing)"""
    return await DatabaseController.test_connection(connection)

@router.get("/{database_id}/status")
async def get_database_status(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get connection status for a database"""
    return await DatabaseController.get_connection_status(db, current_user.id, database_id)

@router.get("/{database_id}/schema")
async def get_database_schema(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get structured schema for a database"""
    return await DatabaseController.get_database_schema(db, current_user.id, database_id)
