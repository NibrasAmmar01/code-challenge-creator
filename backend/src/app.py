from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from clerk_backend_api import Clerk  
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from src.routes import challenge

# Clerk SDK
clerk_sdk = Clerk(bearer_auth=os.getenv("CLERK_SECRET_KEY"))

app = FastAPI(
    title="Code Challenge Creator API",
    description="API for generating coding challenges using AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(challenge.router, prefix="/api/challenges", tags=["Challenges"])

@app.get("/")
async def root():
    return {
        "message": "Code Challenge Creator API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    }