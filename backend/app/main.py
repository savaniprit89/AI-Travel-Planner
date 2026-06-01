from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import engine, Base
from app.api.endpoints import router as api_router



# Create app ONLY ONCE
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An AI-powered agentic travel planner using LangChain, Google Maps API, and vector personalization.",
    version="1.0.0"
)
from pathlib import Path

frontend_path = Path("static/dist")

if frontend_path.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(frontend_path), html=True),
        name="frontend",
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB init
Base.metadata.create_all(bind=engine)

# API routes FIRST
app.include_router(api_router, prefix="/api")

# Root API route (NOT frontend)
@app.get("/api")
def root():
    return {"message": f"{settings.PROJECT_NAME} API running"}

# ----------------------------
# STATIC FRONTEND (PUT LAST)
# ----------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_path = os.path.join(BASE_DIR, "static", "dist")

app.mount(
    "/",
    StaticFiles(directory=frontend_path, html=True),
    name="static"
)