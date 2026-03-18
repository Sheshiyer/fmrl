"""
Configuration settings for PIP Analysis Backend
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    VERSION: str = "0.0.1"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    # Include desktop WebView origins used by Tauri builds/dev.
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://pip:pip@localhost:5432/pip_analysis"
    DATABASE_ECHO: bool = False
    BIOFIELD_PERSISTENCE_ENABLED: bool = False
    BIOFIELD_SCORE_RECIPE_VERSION: str = "v1"
    BIOFIELD_METRIC_RECIPE_VERSION: str = "v1"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Analysis
    DEFAULT_ANALYSIS_MODE: str = "fullBody"
    REAL_TIME_FPS: int = 15
    METRIC_BUFFER_SIZE: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
