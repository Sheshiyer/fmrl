#!/bin/bash
# Build and push Docker images to Docker Hub
# Usage: ./scripts/build-push.sh

set -e

DOCKER_REGISTRY="${DOCKER_REGISTRY:-mohan1711}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "🐳 Building and pushing images to Docker Hub..."
echo "   Registry: $DOCKER_REGISTRY"
echo "   Tag: $IMAGE_TAG"
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Build backend
echo "📦 Building backend..."
docker build -t ${DOCKER_REGISTRY}/pip-backend:${IMAGE_TAG} -t ${DOCKER_REGISTRY}/pip-backend:latest ./backend

# Build frontend
echo "📦 Building frontend..."
docker build -t ${DOCKER_REGISTRY}/pip-frontend:${IMAGE_TAG} -t ${DOCKER_REGISTRY}/pip-frontend:latest ./frontend

# Push images
echo "🚀 Pushing backend to Docker Hub..."
docker push ${DOCKER_REGISTRY}/pip-backend:${IMAGE_TAG}
docker push ${DOCKER_REGISTRY}/pip-backend:latest

echo "🚀 Pushing frontend to Docker Hub..."
docker push ${DOCKER_REGISTRY}/pip-frontend:${IMAGE_TAG}
docker push ${DOCKER_REGISTRY}/pip-frontend:latest

echo ""
echo "✅ Images pushed successfully!"
echo "   - ${DOCKER_REGISTRY}/pip-backend:${IMAGE_TAG}"
echo "   - ${DOCKER_REGISTRY}/pip-frontend:${IMAGE_TAG}"
