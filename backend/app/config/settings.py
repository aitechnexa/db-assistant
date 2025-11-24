import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

load_dotenv()

class Settings:
    # API Settings
    APP_NAME = "Database Query Assistant API"
    APP_VERSION = "1.0.0"
    APP_DESCRIPTION = "Natural language database query assistant with LangGraph"
    
    # OpenAI Settings
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = "gpt-4o-mini"
    OPENAI_REASONING_MODEL = "o1"  # Reasoning model for complex query understanding with chain-of-thought
        
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
        "http://db-assistant.aitechnexa.com"
    ]
    
    # Query Settings
    DEFAULT_QUERY_LIMIT = 5000
    
    @classmethod
    def validate(cls):
        """Validate required settings"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        if not cls.DATABASE_ENCRYPTION_KEY:
            cls.DATABASE_ENCRYPTION_KEY = Fernet.generate_key().decode()
            print(f"⚠️  Generated encryption key: {cls.DATABASE_ENCRYPTION_KEY}")
            print("Add this to your .env file as DATABASE_ENCRYPTION_KEY")
        
        return True

settings = Settings()
