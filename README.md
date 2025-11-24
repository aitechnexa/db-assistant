# Database Query Assistant 🤖

A natural language database query assistant powered by LangGraph, FastAPI, and React. Ask questions about your data in plain English and get SQL queries with results.

![Architecture](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

## ✨ Features

- 🤖 Natural language to SQL conversion using LangGraph
- 🗄️ Multi-database support (PostgreSQL, MySQL, SQLite)
- ✏️ **Edit database credentials** with connection testing
- 🔌 **Real-time connection status** indicators
- 🔐 **User authentication** with JWT tokens
- 🌙 **Dark mode** with keyboard shortcuts
- 📊 Display top 10 rows from query results
- 📥 Export results as CSV or XLSX
- 🎨 Modern, minimalist UI with TailwindCSS
- 🐳 Dockerized frontend and backend

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenAI API Key

### Step 1: Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# Generate encryption key with: openssl rand -hex 16
```

### Step 2: Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### Step 3: Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

**Default Login:**
- Username: `admin`
- Password: `admin123`

### Step 4: Stop Services

```bash
docker-compose down
```

## 📖 Usage Guide

### Adding a Database Connection

1. Click the **"Add Database"** button in the UI
2. Fill in connection details:
   - **Name**: Friendly name (e.g., "Sales DB")
   - **Type**: PostgreSQL, MySQL, or SQLite
   - **Host**: Database host (e.g., localhost or host.docker.internal)
   - **Port**: Database port (5432 for PostgreSQL, 3306 for MySQL)
   - **Database**: Database name
   - **Username**: Database username
   - **Password**: Database password
3. Click **"Save"** to store the connection

### Querying Your Data

1. Select a database from the dropdown
2. Type your question in natural language:
   - "How much profit did Grapes make?"
   - "What are the total sales for all products?"
   - "Which product generated the most profit?"
3. Click **"Send"** or press Enter
4. View:
   - Natural language answer
   - Generated SQL query
   - Top 10 rows of results
5. Download results as CSV or XLSX

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React UI  │─────▶│  FastAPI    │─────▶│  LangGraph  │
│  (Port 5173)│      │  (Port 8000)│      │   Agent     │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  SQLAlchemy │
                     │   Multi-DB  │
                     └─────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           PostgreSQL    MySQL      SQLite
```

### Tech Stack

**Backend:**
- FastAPI - Modern Python web framework
- LangGraph - Agentic workflow for SQL generation
- SQLAlchemy - Database ORM
- OpenAI GPT-4 - Natural language understanding
- Pandas - Data manipulation and export

**Frontend:**
- React 18 - UI library
- Vite - Build tool
- TailwindCSS - Styling
- Lucide React - Icons

## 🔒 Security

- Database credentials encrypted with Fernet (symmetric encryption)
- API keys stored in environment variables
- CORS configured for security
- No credentials stored in frontend
- Encrypted database connections file

## 🛠️ Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Rebuild Containers

```bash
docker-compose up --build
```

## 📝 API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

**Databases:**
- `POST /api/databases` - Add new database connection
- `GET /api/databases` - List all databases
- `GET /api/databases/{id}` - Get specific database
- `PUT /api/databases/{id}` - Update database connection
- `DELETE /api/databases/{id}` - Remove database
- `POST /api/databases/test` - Test connection
- `GET /api/databases/{id}/status` - Check connection status

**Queries:**
- `POST /api/query` - Execute natural language query
- `POST /api/export/csv` - Export results as CSV
- `POST /api/export/xlsx` - Export results as XLSX

## 📚 Documentation

For detailed documentation, see the [`docs/`](./docs) folder:

- **[FEATURES.md](./docs/FEATURES.md)** - Complete feature documentation
- **[UPGRADE.md](./docs/UPGRADE.md)** - Upgrade guide for new features
- **[QUICKSTART.md](./docs/QUICKSTART.md)** - Quick start guide
- **[STRUCTURE.md](./docs/STRUCTURE.md)** - Project structure
- **[INSTALLATION_INSTRUCTIONS.md](./docs/INSTALLATION_INSTRUCTIONS.md)** - Installation steps

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change ports in docker-compose.yml
ports:
  - "8001:8000"  # Backend
  - "5174:5173"  # Frontend
```

**Database connection fails:**
- Use `host.docker.internal` instead of `localhost` for local databases
- Ensure database is accessible from Docker container
- Check firewall settings

**OpenAI API errors:**
- Verify API key is correct in `.env`
- Check API quota and billing

## 📄 License

MIT License - feel free to use for personal or commercial projects
