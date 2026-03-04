#!/bin/bash
# Local Docker development script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

case "$1" in
    build)
        echo "Building Docker images..."
        docker compose build
        ;;
    up)
        echo "Starting containers..."
        docker compose up -d
        echo ""
        echo "Application running at:"
        echo "  Frontend: http://localhost"
        echo "  Backend API: http://localhost:8000"
        ;;
    down)
        echo "Stopping containers..."
        docker compose down
        ;;
    logs)
        docker compose logs -f ${2:-}
        ;;
    restart)
        echo "Restarting containers..."
        docker compose restart
        ;;
    rebuild)
        echo "Rebuilding and restarting..."
        docker compose down
        docker compose build --no-cache
        docker compose up -d
        ;;
    status)
        docker compose ps
        ;;
    *)
        echo "Usage: $0 {build|up|down|logs|restart|rebuild|status}"
        echo ""
        echo "Commands:"
        echo "  build   - Build Docker images"
        echo "  up      - Start containers in background"
        echo "  down    - Stop and remove containers"
        echo "  logs    - View container logs (optionally specify service: logs backend)"
        echo "  restart - Restart containers"
        echo "  rebuild - Rebuild images and restart"
        echo "  status  - Show container status"
        exit 1
        ;;
esac
