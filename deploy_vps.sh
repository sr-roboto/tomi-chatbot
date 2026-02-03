#!/bin/bash

# Deployment Helper Script
# Run this on your VPS to start the services

echo "🚀 Starting Deployment..."

# 1. Update system and install Docker if not present (although image usually has it)
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
else
    echo "✅ Docker is already installed."
fi

# 2. Check for Docker Compose
if ! docker compose version &> /dev/null; then
    echo "Docker Compose plugin not found. Attempting to install..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

# 3. Pull latest images (optional, if using pre-built, but here we build)
echo "📦 Building and Starting Containers..."
docker compose -f docker-compose.vps.yml up -d --build

# 4. Pull the specific model for Ollama
echo "🤖 Initializing Ollama Model (llama3.2)..."
# Wait a moment for Ollama service to be ready
sleep 10
docker exec -it ollama ollama pull llama3.2

# 5. Show status
echo "------------------------------------------------"
echo "✅ Deployment Complete!"
echo "Server is running on port 8000"

echo ""
echo "Stats:"
docker compose -f docker-compose.vps.yml ps
echo "------------------------------------------------"
