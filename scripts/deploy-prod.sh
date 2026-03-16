#!/bin/bash
# Deploy to production server (pulls pre-built images)
# Usage: ./scripts/deploy-prod.sh

set -e

DROPLET_IP="206.189.139.224"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-mohan1711}"
APP_DOMAIN="${APP_DOMAIN:-fmrl.tryambakam.space}"
REMOTE_DIR="/opt/pip-analysis"

echo "🚀 Deploying to production server..."
echo "   Server: $DROPLET_IP"
echo "   Registry: $DOCKER_REGISTRY"
echo "   Domain: $APP_DOMAIN"
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Copy docker-compose.prod.yml to server
echo "📤 Copying docker-compose to server..."
scp docker-compose.prod.yml root@${DROPLET_IP}:${REMOTE_DIR}/docker-compose.prod.yml

# Deploy on server
echo "🔄 Pulling and restarting containers..."
ssh root@${DROPLET_IP} << EOF
    cd ${REMOTE_DIR}

    cat > .env.production << ENVFILE
DOCKER_REGISTRY=${DOCKER_REGISTRY}
IMAGE_TAG=latest
APP_DOMAIN=${APP_DOMAIN}
ENVFILE

    # Pull latest images
    docker compose --env-file .env.production -f docker-compose.prod.yml pull

    # Restart containers
    docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate
    
    # Cleanup
    docker image prune -f
    
    # Show status
    docker compose --env-file .env.production -f docker-compose.prod.yml ps
EOF

echo ""
echo "✅ Deployment complete!"
echo "   🌐 https://${APP_DOMAIN}"
