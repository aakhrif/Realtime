#!/bin/bash

# Production Deployment Script for Realtime Video Chat App
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
APP_NAME="realtime-video-chat"
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Deploying $APP_NAME to $ENVIRONMENT environment..."

# Create necessary directories
mkdir -p ssl
mkdir -p logs

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

# Remove old images (optional)
read -p "🗑️  Remove old Docker images? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker image prune -f
    docker system prune -f
fi

# Build and start containers
echo "🏗️  Building and starting containers..."
docker-compose -f $COMPOSE_FILE up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f $COMPOSE_FILE ps

# Test the application
echo "🧪 Testing application health..."
sleep 5

# Check health endpoint
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy and running!"
    echo "🌐 Access your app at: http://localhost"
    echo "📊 Direct app access: http://localhost:3000"
else
    echo "❌ Health check failed. Please check the logs:"
    docker-compose -f $COMPOSE_FILE logs realtime-app
    exit 1
fi

# Show logs (optional)
read -p "📋 Show application logs? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f $COMPOSE_FILE logs -f --tail=50
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📝 Management commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Stop app:      docker-compose down"
echo "  Restart app:   docker-compose restart"
echo "  Update app:    ./deploy.sh"
