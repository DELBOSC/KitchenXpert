"""
KitchenXpert AI Services - FastAPI Application Entry Point.

This module provides the main FastAPI application for the KitchenXpert AI services.
It includes endpoints for:
- Kitchen layout optimization using genetic algorithms
- Style recommendations based on user preferences
- Budget optimization and cost analysis
- 3D space analysis and workflow optimization

Run with: uvicorn src.main:app --host 0.0.0.0 --port 5000 --reload
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Application metadata
APP_TITLE = "KitchenXpert AI Services"
APP_DESCRIPTION = """
## KitchenXpert AI Services API

This API provides AI-powered services for kitchen design and optimization.

### Features

* **Layout Optimization** - Use genetic algorithms to find optimal kitchen layouts
* **Style Recommendations** - Get personalized style recommendations based on preferences
* **Budget Optimization** - Optimize your kitchen budget and find cost-saving alternatives
* **Space Analysis** - Comprehensive 3D space analysis for utilization and accessibility

### Getting Started

1. Use the `/api/health` endpoint to verify the service is running
2. Check `/api/info` for detailed service information
3. Use the appropriate endpoint for your optimization needs

### Authentication

Currently, this API does not require authentication. For production use,
implement appropriate authentication mechanisms.
"""
APP_VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting KitchenXpert AI Services...")
    logger.info(f"Version: {APP_VERSION}")
    logger.info("Initializing AI services...")

    # Pre-initialize services for faster first request
    from .api.routes import (
        get_layout_optimizer,
        get_style_recommender,
        get_budget_optimizer,
        get_space_analyzer,
    )

    try:
        get_layout_optimizer()
        get_style_recommender()
        get_budget_optimizer()
        get_space_analyzer()
        logger.info("All AI services initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing services: {e}")

    logger.info("KitchenXpert AI Services started successfully")
    logger.info("API documentation available at /docs")

    yield

    # Shutdown
    logger.info("Shutting down KitchenXpert AI Services...")
    logger.info("Cleanup complete")


# Create FastAPI application
app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled errors.
    """
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if app.debug else "An unexpected error occurred",
        }
    )


# Include API routes
app.include_router(router)


# Root endpoint
class RootResponse(BaseModel):
    """Root endpoint response."""
    message: str
    version: str
    docs_url: str
    health_url: str


@app.get(
    "/",
    response_model=RootResponse,
    summary="Root",
    description="Root endpoint with service information."
)
async def root() -> RootResponse:
    """
    Root endpoint.

    Returns basic service information and links to documentation.
    """
    return RootResponse(
        message="Welcome to KitchenXpert AI Services",
        version=APP_VERSION,
        docs_url="/docs",
        health_url="/api/health",
    )


# Health check at root level (in addition to /api/health)
@app.get("/health", include_in_schema=False)
async def root_health():
    """Root-level health check."""
    return {"status": "healthy", "service": APP_TITLE}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info",
    )
