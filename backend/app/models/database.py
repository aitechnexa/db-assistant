from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class DatabaseType(str, Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"

class DatabaseConnection(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., description="Friendly name for the database")
    type: DatabaseType
    host: Optional[str] = None
    port: Optional[int] = None
    database: str
    username: Optional[str] = None
    password: Optional[str] = None
    
    class Config:
        use_enum_values = True

class QueryRequest(BaseModel):
    database_id: str
    question: str
    use_deep_think: bool = False

class QueryResponse(BaseModel):
    answer: str
    summary: str
    sql_query: str
    results: List[Dict[str, Any]]
    row_count: int
    columns: List[str]
    reasoning: Optional[str] = None  # Chain-of-thought reasoning from o1 model

class ExportRequest(BaseModel):
    data: List[Dict[str, Any]]
    filename: str = "export"

class QueryExportRequest(BaseModel):
    database_id: str
    sql_query: str
    filename: str = "export"
