from typing import List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from ..models.database import DatabaseConnection as PydanticDatabaseConnection, DatabaseType
from ..models.db_models import DatabaseConnection as DBDatabaseConnection
from ..config.settings import settings
from decimal import Decimal
from datetime import date, datetime, timedelta
from cryptography.fernet import Fernet
from fastapi import HTTPException
import time


class DatabaseService:
    """Service for database connection management and operations (PostgreSQL-backed)"""
    
    _engines: dict = {}           # {connection_id: (engine, last_used_timestamp)}
    _fernet = Fernet(settings.DATABASE_ENCRYPTION_KEY.encode())
    _schema_cache: dict = {}        # {cache_key: (schema_text, expires_at)}
    _engine_ttl = 7200              # Dispose idle engines after 2 hours
    
    @classmethod
    def _encrypt(cls, value: str) -> str:
        """Encrypt a string value"""
        if not value:
            return ""
        return cls._fernet.encrypt(value.encode()).decode()
    
    @classmethod
    def _decrypt(cls, value: str) -> str:
        """Decrypt a string value"""
        if not value:
            return ""
        try:
            return cls._fernet.decrypt(value.encode()).decode()
        except Exception:
            return ""
    
    @classmethod
    def _db_to_pydantic(cls, db_conn: DBDatabaseConnection, include_password: bool = False) -> PydanticDatabaseConnection:
        """Convert SQLAlchemy model to Pydantic model"""
        return PydanticDatabaseConnection(
            id=str(db_conn.id),
            name=db_conn.name,
            type=db_conn.type,
            host=db_conn.host,
            port=db_conn.port,
            database=db_conn.database,
            username=cls._decrypt(db_conn.encrypted_username) if db_conn.encrypted_username else None,
            password=cls._decrypt(db_conn.encrypted_password) if include_password and db_conn.encrypted_password else "****"
        )
    
    @classmethod
    async def add_connection(cls, db: Session, user_id: int, connection: PydanticDatabaseConnection) -> PydanticDatabaseConnection:
        """Add a new database connection"""
        db_connection = DBDatabaseConnection(
            user_id=user_id,
            name=connection.name,
            type=connection.type,
            host=connection.host,
            port=connection.port,
            database=connection.database,
            encrypted_username=cls._encrypt(connection.username) if connection.username else None,
            encrypted_password=cls._encrypt(connection.password) if connection.password else None
        )
        
        db.add(db_connection)
        db.commit()
        db.refresh(db_connection)
        
        return cls._db_to_pydantic(db_connection)
    
    @classmethod
    async def get_all_connections(cls, db: Session, user_id: int) -> List[PydanticDatabaseConnection]:
        """Get all database connections for a user (without passwords)"""
        db_connections = db.query(DBDatabaseConnection).filter(
            DBDatabaseConnection.user_id == user_id
        ).all()
        
        return [cls._db_to_pydantic(conn) for conn in db_connections]
    
    @classmethod
    async def get_connection(cls, db: Session, user_id: int, connection_id: int) -> Optional[PydanticDatabaseConnection]:
        """Get a specific connection by ID for a user"""
        db_connection = db.query(DBDatabaseConnection).filter(
            DBDatabaseConnection.id == connection_id,
            DBDatabaseConnection.user_id == user_id
        ).first()
        
        if not db_connection:
            return None
        
        return cls._db_to_pydantic(db_connection, include_password=True)
    
    @classmethod
    async def update_connection(cls, db: Session, user_id: int, connection_id: int, updated_connection: PydanticDatabaseConnection) -> Optional[PydanticDatabaseConnection]:
        """Update a database connection"""
        db_connection = db.query(DBDatabaseConnection).filter(
            DBDatabaseConnection.id == connection_id,
            DBDatabaseConnection.user_id == user_id
        ).first()
        
        if not db_connection:
            return None
        
        # Update fields
        db_connection.name = updated_connection.name
        db_connection.type = updated_connection.type
        db_connection.host = updated_connection.host
        db_connection.port = updated_connection.port
        db_connection.database = updated_connection.database
        
        # Only update credentials if provided
        if updated_connection.username and updated_connection.username != "****":
            db_connection.encrypted_username = cls._encrypt(updated_connection.username)
        if updated_connection.password and updated_connection.password != "****":
            db_connection.encrypted_password = cls._encrypt(updated_connection.password)
        
        db.commit()
        db.refresh(db_connection)
        
        # Close old engine if exists
        if connection_id in cls._engines:
            cls._engines[connection_id][0].dispose()
            del cls._engines[connection_id]
        
        return cls._db_to_pydantic(db_connection)
    
    @classmethod
    async def delete_connection(cls, db: Session, user_id: int, connection_id: int) -> bool:
        """Delete a database connection"""
        db_connection = db.query(DBDatabaseConnection).filter(
            DBDatabaseConnection.id == connection_id,
            DBDatabaseConnection.user_id == user_id
        ).first()
        
        if not db_connection:
            return False
        
        db.delete(db_connection)
        db.commit()
        
        # Close engine if exists
        if connection_id in cls._engines:
            cls._engines[connection_id][0].dispose()
            del cls._engines[connection_id]
        
        return True
    
    @classmethod
    def _evict_idle_engines(cls):
        """Dispose engines that haven't been used in _engine_ttl seconds."""
        now = time.time()
        idle = [cid for cid, (eng, ts) in cls._engines.items() if now - ts > cls._engine_ttl]
        for cid in idle:
            try:
                cls._engines[cid][0].dispose()
            except Exception:
                pass
            del cls._engines[cid]

    @classmethod
    def _get_engine(cls, db: Session, user_id: int, connection_id: int) -> Optional[Engine]:
        """Get or create SQLAlchemy engine for a connection (with LRU eviction)."""
        cls._evict_idle_engines()

        if connection_id in cls._engines:
            engine, _ = cls._engines[connection_id]
            cls._engines[connection_id] = (engine, time.time())
            return engine

        db_connection = db.query(DBDatabaseConnection).filter(
            DBDatabaseConnection.id == connection_id,
            DBDatabaseConnection.user_id == user_id,
        ).first()

        if not db_connection:
            return None

        try:
            connection = cls._db_to_pydantic(db_connection, include_password=True)
            connection_string = cls._build_connection_string(connection)
            engine = create_engine(
                connection_string,
                pool_size=2,
                max_overflow=1,
                pool_recycle=1800,
            )
            cls._engines[connection_id] = (engine, time.time())
            return engine
        except Exception as e:
            print(f"Error creating engine: {e}")
            return None
    
    @classmethod
    def _build_connection_string(cls, connection: PydanticDatabaseConnection) -> str:
        """Build SQLAlchemy connection string"""
        if connection.type == DatabaseType.SQLITE:
            return f"sqlite:///{settings.DATA_DIR}/{connection.database}.db"
        
        elif connection.type == DatabaseType.POSTGRESQL:
            return f"postgresql://{connection.username}:{connection.password}@{connection.host}:{connection.port}/{connection.database}"
        
        elif connection.type == DatabaseType.MYSQL:
            return f"mysql+pymysql://{connection.username}:{connection.password}@{connection.host}:{connection.port}/{connection.database}"
        
        raise ValueError(f"Unsupported database type: {connection.type}")
    
    @classmethod
    async def test_connection(cls, connection: PydanticDatabaseConnection) -> bool:
        """Test if a database connection is valid"""
        try:
            connection_string = cls._build_connection_string(connection)
            engine = create_engine(connection_string)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()
            return True
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False
    
    @classmethod
    def _convert_value(cls, value):
        """Convert non-JSON-serializable types to serializable ones"""
        if isinstance(value, Decimal):
            return float(value)
        elif isinstance(value, (date, datetime)):
            return value.isoformat()
        elif isinstance(value, bytes):
            return value.decode('utf-8', errors='ignore')
        return value
    
    @classmethod
    async def execute_query(cls, db: Session, user_id: int, connection_id: int, query: str, limit: int = None):
        """Execute a SQL query and return results"""
        if limit is None:
            limit = settings.DEFAULT_QUERY_LIMIT
            
        engine = cls._get_engine(db, user_id, connection_id)
        if not engine:
            raise ValueError(f"No engine found for connection {connection_id}")
        
        try:
            with engine.connect() as conn:
                result = conn.execute(text(query))
                
                # Fetch limited rows
                rows = result.fetchmany(limit)
                
                # Get column names
                columns = list(result.keys())
                
                # Convert to list of dicts with type conversion
                data = []
                for row in rows:
                    row_dict = {}
                    for col, value in zip(columns, row):
                        row_dict[col] = cls._convert_value(value)
                    data.append(row_dict)
                
                return {
                    "columns": columns,
                    "data": data,
                    "row_count": len(data)
                }
        except Exception as e:
            print(f"Query execution error: {e}")
            raise
    
    @classmethod
    async def get_schema_info(cls, db: Session, user_id: int, connection_id: int) -> str:
        """Get database schema information for LangGraph with sample data (cached)"""
        cache_key = f"{user_id}_{connection_id}"
        
        # Check cache first
        if cache_key in cls._schema_cache:
            cached_data, expires_at = cls._schema_cache[cache_key]
            if time.time() < expires_at:
                print(f"📊 Schema cache hit for connection {connection_id}")
                return cached_data
        
        engine = cls._get_engine(db, user_id, connection_id)
        if not engine:
            return ""
        
        # Fetch connection to determine type
        db_connection = db.query(DBDatabaseConnection).filter(
            DBDatabaseConnection.id == connection_id,
            DBDatabaseConnection.user_id == user_id
        ).first()
        
        if not db_connection:
            return ""
        
        try:
            with engine.connect() as conn:
                if db_connection.type == DatabaseType.POSTGRESQL:
                    schema_query = """
                    SELECT table_name, column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public'
                    ORDER BY table_name, ordinal_position
                    """
                elif db_connection.type == DatabaseType.MYSQL:
                    schema_query = f"""
                    SELECT table_name, column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = '{db_connection.database}'
                    ORDER BY table_name, ordinal_position
                    """
                else:  # SQLite
                    schema_query = """
                    SELECT m.name as table_name, p.name as column_name, p.type as data_type
                    FROM sqlite_master m
                    LEFT JOIN pragma_table_info(m.name) p
                    WHERE m.type = 'table'
                    ORDER BY m.name
                    """
                
                result = conn.execute(text(schema_query))
                rows = result.fetchall()
                
                # Format schema info with sample data
                schema_info = "Database Schema:\n\n"
                current_table = None
                table_columns = {}
                
                # Group columns by table
                for row in rows:
                    table_name, column_name, data_type = row[0], row[1], row[2]
                    if table_name not in table_columns:
                        table_columns[table_name] = []
                    table_columns[table_name].append((column_name, data_type))
                
                # For each table, get schema and sample data
                for table_name, columns in table_columns.items():
                    schema_info += f"\nTable: {table_name}\n"
                    schema_info += "Columns:\n"
                    for col_name, col_type in columns:
                        schema_info += f"  - {col_name} ({col_type})\n"
                    
                    # Get sample data (3 rows)
                    try:
                        # Safely quote table name to handle special characters
                        safe_table = table_name.replace('"', '""')
                        sample_query = f'SELECT * FROM "{safe_table}" LIMIT 3'
                        sample_result = conn.execute(text(sample_query))
                        sample_rows = sample_result.fetchall()
                        
                        if sample_rows:
                            schema_info += "Sample Data (showing patterns):\n"
                            for i, sample_row in enumerate(sample_rows, 1):
                                schema_info += f"  Row {i}: "
                                col_values = []
                                for col_idx, (col_name, _) in enumerate(columns):
                                    if col_idx < len(sample_row):
                                        val = sample_row[col_idx]
                                        # Truncate long values
                                        val_str = str(val)[:50] if val is not None else "NULL"
                                        col_values.append(f"{col_name}={val_str}")
                                schema_info += ", ".join(col_values) + "\n"
                    except Exception as e:
                        # If sample data retrieval fails, just skip it
                        schema_info += f"  (Sample data unavailable: {str(e)[:50]})\n"
                
                print(f"📊 Schema retrieved with sample data ({len(rows)} columns)")
                
                # Cache the result
                cls._schema_cache[cache_key] = (schema_info, time.time() + settings.SCHEMA_CACHE_TTL)
                return schema_info
        except Exception as e:
            print(f"Error getting schema: {e}")
            return ""

    @classmethod
    async def get_schema_structure(cls, db: Session, user_id: int, connection_id: int) -> dict:
        """Get structured database schema information"""
        engine = cls._get_engine(db, user_id, connection_id)
        if not engine:
            return {}
        
        # Fetch connection to determine type
        db_connection = db.query(DBDatabaseConnection).filter(
            DBDatabaseConnection.id == connection_id,
            DBDatabaseConnection.user_id == user_id
        ).first()
        
        if not db_connection:
            return {}
        
        try:
            with engine.connect() as conn:
                if db_connection.type == DatabaseType.POSTGRESQL:
                    query = """
                    SELECT table_name, column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public'
                    ORDER BY table_name, ordinal_position
                    """
                elif db_connection.type == DatabaseType.MYSQL:
                    query = f"""
                    SELECT table_name, column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_schema = '{db_connection.database}'
                    ORDER BY table_name, ordinal_position
                    """
                else:  # SQLite
                    query = """
                    SELECT m.name as table_name, p.name as column_name, p.type as data_type
                    FROM sqlite_master m
                    LEFT JOIN pragma_table_info(m.name) p
                    WHERE m.type = 'table'
                    ORDER BY m.name
                    """
                
                result = conn.execute(text(query))
                rows = result.fetchall()
                
                # Format schema structure
                tables = {}
                
                for row in rows:
                    table_name, column_name, data_type = row[0], row[1], row[2]
                    
                    if table_name not in tables:
                        tables[table_name] = []
                    
                    tables[table_name].append({
                        "name": column_name,
                        "type": data_type
                    })
                
                return tables
        except Exception as e:
            print(f"Error getting schema structure: {e}")
            return {}
