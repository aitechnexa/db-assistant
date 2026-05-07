import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

class Settings:
    # API Settings
    APP_NAME = "Database Query Assistant API"
    APP_VERSION = "1.0.0"
    APP_DESCRIPTION = "Natural language database query assistant with LangGraph"
    
    # LLM Provider: "ollama" or "openai"
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
    
    # Ollama Settings
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
    OLLAMA_TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0"))
    
    # OpenAI Settings
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Schema cache TTL in seconds
    SCHEMA_CACHE_TTL = int(os.getenv("SCHEMA_CACHE_TTL", "1800"))  # 30 minutes
    
    # Database Settings
    DATABASE_ENCRYPTION_KEY = os.getenv("DATABASE_ENCRYPTION_KEY")
    DATA_DIR = "data"
    
    # JWT Settings
    SECRET_KEY = os.getenv("DATABASE_ENCRYPTION_KEY", Fernet.generate_key().decode())  # Reuse encryption key
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS = 24
    
    # CORS Settings
    CORS_ORIGINS = [
        # Local development
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5020",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5020",
        # Production
        "https://db-assistant.aitechnexa.com",
        "http://db-assistant.aitechnexa.com",
        "http://152.42.248.82",
        "http://152.42.248.82:5020",
    ]
    
    # Query Settings
    DEFAULT_QUERY_LIMIT = 1000  # Reduced from 5000 for low memory environments
    MAX_EXPORT_LIMIT = 10000    # Maximum for exports to prevent OOM
    
    @classmethod
    def validate(cls):
        """Validate required settings"""
        if cls.LLM_PROVIDER == "openai" and not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in environment variables (required when LLM_PROVIDER=openai)")
        
        if not cls.DATABASE_ENCRYPTION_KEY:
            cls.DATABASE_ENCRYPTION_KEY = Fernet.generate_key().decode()
            print(f"⚠️  Generated encryption key: {cls.DATABASE_ENCRYPTION_KEY}")
            print("Add this to your .env file as DATABASE_ENCRYPTION_KEY")
        
        return True

settings = Settings()
