#!/bin/bash
# Deploy to production server (pulls pre-built images)
# Usage: ./scripts/deploy-prod.sh

set -e

DROPLET_IP="206.189.139.224"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-mohan1711}"
REMOTE_DIR="/opt/pip-analysis"

echo "🚀 Deploying to production server..."
echo "   Server: $DROPLET_IP"
echo "   Registry: $DOCKER_REGISTRY"
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Copy docker-compose.prod.yml to server
echo "📤 Copying docker-compose to server..."
scp docker-compose.prod.yml root@${DROPLET_IP}:${REMOTE_DIR}/docker-compose.yml

# Deploy on server
echo "🔄 Pulling and restarting containers..."
ssh root@${DROPLET_IP} << EOF
    cd ${REMOTE_DIR}
    
    # Set registry
    export DOCKER_REGISTRY=${DOCKER_REGISTRY}
    export IMAGE_TAG=latest
    
    # Pull latest images
    docker compose pull
    
    # Restart containers
    docker compose up -d --force-recreate
    
    # Cleanup
    docker image prune -f
    
    # Show status
    docker compose ps
EOF

echo ""
echo "✅ Deployment complete!"
echo "   🌐 https://biofield.live"
