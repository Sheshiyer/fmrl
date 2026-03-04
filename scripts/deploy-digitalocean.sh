#!/bin/bash
set -e

# DigitalOcean Deployment Script for PIP Analysis System
# Usage: ./deploy-digitalocean.sh [droplet-ip]

DROPLET_IP=${1:-""}
APP_NAME="pip-analysis"
REMOTE_USER="root"
REMOTE_DIR="/opt/${APP_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if doctl is installed
check_doctl() {
    if ! command -v doctl &> /dev/null; then
        log_error "doctl CLI is not installed. Installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install doctl
        else
            log_error "Please install doctl manually: https://docs.digitalocean.com/reference/doctl/how-to/install/"
            exit 1
        fi
    fi
    log_info "doctl is installed"
}

# Authenticate with DigitalOcean
authenticate() {
    log_info "Checking DigitalOcean authentication..."
    if ! doctl account get &> /dev/null; then
        log_warn "Not authenticated. Running doctl auth init..."
        doctl auth init
    fi
    log_info "Authenticated with DigitalOcean"
    doctl account get
}

# Create droplet if IP not provided
create_droplet() {
    if [ -z "$DROPLET_IP" ]; then
        log_info "Creating new droplet..."
        
        # Create droplet
        DROPLET_INFO=$(doctl compute droplet create "${APP_NAME}-server" \
            --size s-1vcpu-1gb \
            --region blr1 \
            --image ubuntu-24-04-x64 \
            --vpc-uuid 6bf96e65-683e-4985-8116-f439cd4e7e73 \
            --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
            --wait \
            --format ID,PublicIPv4 \
            --no-header)
        
        DROPLET_ID=$(echo "$DROPLET_INFO" | awk '{print $1}')
        DROPLET_IP=$(echo "$DROPLET_INFO" | awk '{print $2}')
        
        log_info "Droplet created with ID: $DROPLET_ID"
        log_info "Droplet IP: $DROPLET_IP"
        
        # Wait for droplet to be ready
        log_info "Waiting for droplet to be ready (30 seconds)..."
        sleep 30
    fi
}

# Setup server with Docker
setup_server() {
    log_info "Setting up server at $DROPLET_IP..."
    
    ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${DROPLET_IP} << 'ENDSSH'
        set -e
        
        # Update system
        apt-get update && apt-get upgrade -y
        
        # Install Docker
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            rm get-docker.sh
        fi
        
        # Install Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            apt-get install -y docker-compose-plugin
        fi
        
        # Create app directory
        mkdir -p /opt/pip-analysis
        
        echo "Server setup complete!"
ENDSSH
    
    log_info "Server setup complete"
}

# Deploy application
deploy_app() {
    log_info "Deploying application to $DROPLET_IP..."
    
    # Get project root directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    # Create a temporary directory for deployment files
    TEMP_DIR=$(mktemp -d)
    
    # Copy necessary files
    cp -r "$PROJECT_DIR/backend" "$TEMP_DIR/"
    cp -r "$PROJECT_DIR/frontend" "$TEMP_DIR/"
    cp "$PROJECT_DIR/docker-compose.yml" "$TEMP_DIR/"
    
    # Remove node_modules and __pycache__ to reduce transfer size
    rm -rf "$TEMP_DIR/frontend/node_modules" 2>/dev/null || true
    rm -rf "$TEMP_DIR/frontend/dist" 2>/dev/null || true
    find "$TEMP_DIR/backend" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    
    # Transfer files to server
    log_info "Transferring files to server..."
    rsync -avz --progress \
        -e "ssh -o StrictHostKeyChecking=no" \
        "$TEMP_DIR/" \
        ${REMOTE_USER}@${DROPLET_IP}:${REMOTE_DIR}/
    
    # Cleanup temp directory
    rm -rf "$TEMP_DIR"
    
    # Build and run on server
    log_info "Building and starting containers..."
    ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${DROPLET_IP} << ENDSSH
        cd ${REMOTE_DIR}
        
        # Stop existing containers
        docker compose down 2>/dev/null || true
        
        # Build and start
        docker compose build --no-cache
        docker compose up -d
        
        # Show status
        docker compose ps
        
        echo ""
        echo "Deployment complete!"
        echo "Application is running at: http://${DROPLET_IP}"
ENDSSH
    
    log_info "Deployment complete!"
    log_info "Application URL: http://${DROPLET_IP}"
}

# Main execution
main() {
    log_info "Starting DigitalOcean deployment..."
    
    check_doctl
    authenticate
    create_droplet
    setup_server
    deploy_app
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Deployment Successful!${NC}"
    echo "=========================================="
    echo "Application URL: http://${DROPLET_IP}"
    echo "Backend API: http://${DROPLET_IP}/api/v1"
    echo "Health Check: http://${DROPLET_IP}/api/v1/analysis/health"
    echo ""
    echo "To SSH into the server:"
    echo "  ssh root@${DROPLET_IP}"
    echo ""
    echo "To view logs:"
    echo "  ssh root@${DROPLET_IP} 'cd /opt/pip-analysis && docker compose logs -f'"
    echo "=========================================="
}

main
