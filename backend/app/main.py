from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api.endpoints import router as api_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An AI-powered agentic travel planner using LangChain, Google Maps API, and vector personalization.",
    version="1.0.0"
)

# Set up CORS middleware to allow connections from Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; specify exact ports in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints
app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": f"Welcome to the {settings.PROJECT_NAME} Backend API. Access /docs for Swagger documentation."}
