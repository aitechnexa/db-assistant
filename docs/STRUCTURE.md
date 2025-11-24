# Project Structure

## Backend Architecture (MVC Pattern)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI application entry point
│   │
│   ├── config/                      # Configuration
│   │   ├── __init__.py
│   │   └── settings.py              # Application settings & environment variables
│   │
│   ├── models/                      # Data models (Pydantic)
│   │   ├── __init__.py
│   │   └── models.py                # Request/Response models
│   │
│   ├── routes/                      # API Routes (Endpoints)
│   │   ├── __init__.py
│   │   ├── database_routes.py       # Database connection endpoints
│   │   ├── query_routes.py          # Query execution endpoints
│   │   └── export_routes.py         # Export endpoints (CSV/XLSX)
│   │
│   ├── controllers/                 # Business Logic Controllers
│   │   ├── __init__.py
│   │   ├── database_controller.py   # Database operations controller
│   │   ├── query_controller.py      # Query processing controller
│   │   └── export_controller.py     # Export operations controller
│   │
│   ├── services/                    # Core Business Services
│   │   ├── __init__.py
│   │   ├── database_service.py      # Database connection & query service
│   │   └── langgraph_service.py     # LangGraph AI service
│   │
│   └── utils/                       # Utility Functions
│       ├── __init__.py
│       └── export_utils.py          # CSV/XLSX export utilities
│
├── data/                            # Data storage (gitignored)
│   └── connections.json             # Encrypted database connections
│
├── Dockerfile                       # Backend Docker configuration
└── requirements.txt                 # Python dependencies

```

## Frontend Architecture

```
frontend/
├── src/
│   ├── App.jsx                      # Main application component
│   ├── main.jsx                     # React entry point
│   └── index.css                    # Global styles (TailwindCSS)
│
├── public/                          # Static assets
├── Dockerfile                       # Frontend Docker configuration
├── package.json                     # Node dependencies
├── vite.config.js                   # Vite configuration
├── tailwind.config.js               # TailwindCSS configuration
├── postcss.config.js                # PostCSS configuration
└── index.html                       # HTML entry point
```

## Root Configuration

```
db-assistant/
├── docker-compose.yml               # Docker Compose orchestration
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── README.md                        # Project documentation
└── STRUCTURE.md                     # This file
```

## Architecture Layers

### 1. Routes Layer (`routes/`)
- **Purpose**: Define API endpoints and HTTP methods
- **Responsibility**: Route incoming requests to appropriate controllers
- **Example**: `POST /api/databases` → `DatabaseController.add_database()`

### 2. Controllers Layer (`controllers/`)
- **Purpose**: Handle HTTP request/response logic
- **Responsibility**: Validate input, call services, format responses, handle errors
- **Example**: Validate database connection before adding

### 3. Services Layer (`services/`)
- **Purpose**: Core business logic and data operations
- **Responsibility**: Database operations, AI processing, data transformation
- **Example**: Execute SQL queries, generate SQL from natural language

### 4. Utils Layer (`utils/`)
- **Purpose**: Reusable utility functions
- **Responsibility**: Helper functions that don't fit in services
- **Example**: CSV/XLSX export functions

### 5. Models Layer (`models/`)
- **Purpose**: Data structure definitions
- **Responsibility**: Define request/response schemas, validation rules
- **Example**: `DatabaseConnection`, `QueryRequest`, `QueryResponse`

### 6. Config Layer (`config/`)
- **Purpose**: Application configuration
- **Responsibility**: Environment variables, settings, constants
- **Example**: API keys, database paths, CORS origins

## Data Flow

```
Client Request
    ↓
Route (routes/)
    ↓
Controller (controllers/)
    ↓
Service (services/)
    ↓
Database / External API
    ↓
Service (services/)
    ↓
Controller (controllers/)
    ↓
Route (routes/)
    ↓
Client Response
```

## Key Design Patterns

1. **MVC (Model-View-Controller)**: Separation of concerns
2. **Singleton**: DatabaseService maintains single instance
3. **Dependency Injection**: Services injected into controllers
4. **Repository Pattern**: DatabaseService acts as repository
5. **Service Layer Pattern**: Business logic isolated in services

## Benefits of This Structure

✅ **Maintainability**: Clear separation of concerns  
✅ **Testability**: Each layer can be tested independently  
✅ **Scalability**: Easy to add new features  
✅ **Readability**: Intuitive file organization  
✅ **Reusability**: Services can be reused across controllers  
✅ **Flexibility**: Easy to swap implementations  

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY`: OpenAI API key for LangGraph
- `DATABASE_ENCRYPTION_KEY`: 32-byte key for encrypting database credentials
