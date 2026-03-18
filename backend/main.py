"""
PIP Analysis System - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from api.routes import analysis, baseline, capture, export, profile, session, snapshot, timeline, websocket
from db import database_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting FMRL Backend v{settings.VERSION}")
    yield
    # Shutdown
    print("Shutting down FMRL Backend")


app = FastAPI(
    title="FMRL API",
    description="Frequency Modulated Reality Lens — Real-time biofield analysis API",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])
app.include_router(capture.router, prefix="/api/v1/capture", tags=["Capture"])
app.include_router(profile.router, prefix="/api/v1/profile", tags=["Profile"])
app.include_router(session.router, prefix="/api/v1/sessions", tags=["Sessions"])
app.include_router(snapshot.router, prefix="/api/v1/snapshots", tags=["Snapshots"])
app.include_router(timeline.router, prefix="/api/v1/timeline", tags=["Timeline"])
app.include_router(baseline.router, prefix="/api/v1/baseline", tags=["Baseline"])
app.include_router(export.router, prefix="/api/v1/export", tags=["Export"])
app.include_router(websocket.router, prefix="/ws/v1", tags=["WebSocket"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "PIP Analysis System",
        "version": settings.VERSION,
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    persistence = await database_manager.healthcheck()
    return {
        "status": "healthy",
        "persistence": persistence,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
