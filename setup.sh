#!/bin/bash

# Database Query Assistant - Setup Script
# This script helps you set up the application quickly

set -e

echo "🚀 Database Query Assistant - Setup"
echo "===================================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file already exists"
else
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    
    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    
    # Update .env with generated key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-32-byte-encryption-key-generate-random/$ENCRYPTION_KEY/" .env
    else
        # Linux
        sed -i "s/your-32-byte-encryption-key-generate-random/$ENCRYPTION_KEY/" .env
    fi
    
    echo "✅ .env file created with encryption key"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your OpenAI API key!"
    echo "   Open .env and replace 'sk-your-openai-api-key-here' with your actual key"
    echo ""
    read -p "Press Enter when you've added your OpenAI API key..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ docker-compose is available"
echo ""

# Ask user if they want to build and start
echo "Ready to build and start the application?"
echo ""
echo "This will:"
echo "  1. Build Docker images for frontend and backend"
echo "  2. Start both containers"
echo "  3. Make the app available at:"
echo "     - Frontend: http://localhost:5173"
echo "     - Backend: http://localhost:8000"
echo "     - API Docs: http://localhost:8000/docs"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔨 Building and starting containers..."
    echo "This may take a few minutes on first run..."
    echo ""
    
    docker-compose up --build -d
    
    echo ""
    echo "✅ Application started successfully!"
    echo ""
    echo "📍 Access points:"
    echo "   Frontend UI:  http://localhost:5173"
    echo "   Backend API:  http://localhost:8000"
    echo "   API Docs:     http://localhost:8000/docs"
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs:        docker-compose logs -f"
    echo "   Stop app:         docker-compose down"
    echo "   Restart:          docker-compose restart"
    echo ""
    echo "🎉 Happy querying!"
else
    echo ""
    echo "Setup cancelled. Run this script again when ready."
    echo ""
    echo "To start manually:"
    echo "  docker-compose up --build"
fi
