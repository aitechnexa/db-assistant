# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env
```

Add the following to `.env`:
```bash
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
DATABASE_ENCRYPTION_KEY=$(openssl rand -hex 16)
```

Or generate the encryption key manually:
```bash
openssl rand -hex 16
```

### Step 2: Start the Application

```bash
# Build and start both frontend and backend with Docker Compose
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### Step 3: Access the Application

- **Frontend UI**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📝 First Time Usage

### 1. Add a Database Connection

Click **"Add Database"** button and fill in:

**For PostgreSQL:**
```
Name: My Sales DB
Type: PostgreSQL
Host: host.docker.internal (for local DB) or your DB host
Port: 5432
Database: sales_db
Username: postgres
Password: your_password
```

**For MySQL:**
```
Name: My MySQL DB
Type: MySQL
Host: host.docker.internal
Port: 3306
Database: mydb
Username: root
Password: your_password
```

**For SQLite:**
```
Name: Local SQLite
Type: SQLite
Database: mydata (will create mydata.db)
```

> **Note**: When connecting to a database on your local machine from Docker, use `host.docker.internal` instead of `localhost`.

### 2. Ask Questions

Select your database and type natural language questions:

- "How much profit did product ABC make?"
- "What are the total sales for all products?"
- "Which product generated the most profit?"
- "Show me the top 5 customers by revenue"

### 3. View Results

- See the natural language answer
- View the generated SQL query
- Browse the top 10 rows of results
- Download as CSV or XLSX

## 🛠️ Development Mode

### Backend Only

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Only

```bash
cd frontend
npm install
npm run dev
```

## 🐛 Troubleshooting

### Port Already in Use

Edit `docker-compose.yml` and change the ports:
```yaml
ports:
  - "8001:8000"  # Backend
  - "5174:5173"  # Frontend
```

### Database Connection Fails

- Use `host.docker.internal` instead of `localhost` for local databases
- Ensure your database allows connections from Docker
- Check firewall settings
- Verify credentials are correct

### OpenAI API Errors

- Verify your API key is correct in `.env`
- Check your OpenAI account has credits
- Ensure you have access to GPT-4

### Docker Build Fails

```bash
# Clean up and rebuild
docker-compose down
docker system prune -a
docker-compose up --build
```

## 📦 Stopping the Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## 🔄 Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild containers
docker-compose up --build
```

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [STRUCTURE.md](STRUCTURE.md) to understand the codebase
- Explore the API documentation at http://localhost:8000/docs
- Add multiple database connections
- Try complex SQL queries

## 🆘 Getting Help

- Check the logs: `docker-compose logs -f`
- Backend logs: `docker-compose logs -f backend`
- Frontend logs: `docker-compose logs -f frontend`

## 🎉 You're Ready!

Start querying your databases with natural language! 🚀
