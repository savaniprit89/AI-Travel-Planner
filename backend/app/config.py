import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Agentic Travel Planner"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./travel_planner.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    
    # Third-party APIs
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
