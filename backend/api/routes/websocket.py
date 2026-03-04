"""
WebSocket endpoints for real-time analysis
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict
import json
import asyncio

router = APIRouter()

# Store active connections
active_connections: Dict[str, WebSocket] = {}


class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a new connection."""
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        """Remove a connection."""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def send_message(self, client_id: str, message: dict):
        """Send a message to a specific client."""
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connections."""
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


@router.websocket("/metrics")
async def websocket_metrics(websocket: WebSocket):
    """
    WebSocket endpoint for real-time metrics streaming.
    Frontend connects here to receive live score updates.
    """
    client_id = str(id(websocket))
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "frame_metrics":
                # Receive frame metrics from frontend, could compute advanced metrics here
                metrics = message.get("metrics", {})
                # TODO: Compute nonlinear dynamics (fractal dimension, Hurst, Lyapunov, etc.)
                await manager.send_message(client_id, {
                    "type": "metrics",
                    "fractalDimension": 1.5 + (metrics.get("colorEntropy", 0) * 0.1),
                    "hurstExponent": 0.5 + (metrics.get("avgIntensity", 128) / 255 * 0.3),
                    "lyapunovExponent": -0.1,
                    "dfaAlpha": 1.0,
                })
            elif msg_type == "ping":
                await manager.send_message(client_id, {"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        manager.disconnect(client_id)
        print(f"WebSocket metrics error: {e}")


@router.websocket("/realtime")
async def websocket_realtime(websocket: WebSocket):
    """
    WebSocket endpoint for real-time metric streaming.
    
    Message types:
    - auth: Authenticate the connection
    - session_start: Start a new analysis session
    - session_end: End the current session
    - frame: Submit a frame for real-time analysis
    - ping: Keep-alive ping
    """
    client_id = str(id(websocket))
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "ping":
                await manager.send_message(client_id, {"type": "pong"})
            
            elif msg_type == "auth":
                # TODO: Implement authentication
                await manager.send_message(client_id, {
                    "type": "auth_success",
                    "client_id": client_id
                })
            
            elif msg_type == "session_start":
                settings = message.get("settings", {})
                await manager.send_message(client_id, {
                    "type": "session_started",
                    "session_id": f"session_{client_id}",
                    "settings": settings
                })
            
            elif msg_type == "session_end":
                await manager.send_message(client_id, {
                    "type": "session_ended"
                })
            
            elif msg_type == "frame":
                # TODO: Process frame and return metrics
                # For now, return placeholder data
                await manager.send_message(client_id, {
                    "type": "metrics",
                    "payload": {
                        "timestamp": message.get("payload", {}).get("timestamp", 0),
                        "metrics": {
                            "avgIntensity": 128,
                            "lightQuantaDensity": 0.4,
                            "innerNoise": 22.5
                        },
                        "scores": {
                            "energy": 65,
                            "symmetry": 72,
                            "coherence": 58,
                            "complexity": 45,
                            "regulation": 68,
                            "colorBalance": 80
                        }
                    }
                })
            
            else:
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}"
                })
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        manager.disconnect(client_id)
        print(f"WebSocket error: {e}")
