from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config.settings import settings
from .routes import database_routes, query_routes, export_routes, auth_routes, chat_routes, conversation_routes, admin_routes
from .services.auth_service import AuthService

# Validate settings
settings.validate()

# Initialize AuthService to create default admin user
AuthService()

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}

# Include routers
app.include_router(auth_routes.router)
app.include_router(database_routes.router)
app.include_router(query_routes.router)
app.include_router(export_routes.router)
app.include_router(chat_routes.router)
app.include_router(conversation_routes.router)
app.include_router(admin_routes.router)  # Admin routes

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5010)
