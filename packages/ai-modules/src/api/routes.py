"""
API routes for KitchenXpert AI modules.
Defines FastAPI endpoints for layout optimization, style recommendations,
budget optimization, and space analysis.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..models.recommendations import (
    LayoutOptimizationRequest,
    LayoutOptimizationResult,
    StyleRecommendationRequest,
    StyleRecommendationResponse,
    BudgetOptimizationRequest,
    BudgetOptimizationResult,
    SpaceAnalysisRequest,
    SpaceAnalysisResult,
)
from ..services.layout_optimizer import LayoutOptimizer
from ..services.style_recommender import StyleRecommender
from ..services.budget_optimizer import BudgetOptimizer
from ..services.space_analyzer import SpaceAnalyzer


# Create router
router = APIRouter(prefix="/api", tags=["AI Services"])


# Service instances (singleton pattern for efficiency)
_layout_optimizer: LayoutOptimizer | None = None
_style_recommender: StyleRecommender | None = None
_budget_optimizer: BudgetOptimizer | None = None
_space_analyzer: SpaceAnalyzer | None = None


def get_layout_optimizer() -> LayoutOptimizer:
    """Get or create layout optimizer instance."""
    global _layout_optimizer
    if _layout_optimizer is None:
        _layout_optimizer = LayoutOptimizer()
    return _layout_optimizer


def get_style_recommender() -> StyleRecommender:
    """Get or create style recommender instance."""
    global _style_recommender
    if _style_recommender is None:
        _style_recommender = StyleRecommender()
    return _style_recommender


def get_budget_optimizer() -> BudgetOptimizer:
    """Get or create budget optimizer instance."""
    global _budget_optimizer
    if _budget_optimizer is None:
        _budget_optimizer = BudgetOptimizer()
    return _budget_optimizer


def get_space_analyzer() -> SpaceAnalyzer:
    """Get or create space analyzer instance."""
    global _space_analyzer
    if _space_analyzer is None:
        _space_analyzer = SpaceAnalyzer()
    return _space_analyzer


# Health check response model
class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    services_available: Dict[str, bool]


# Error response model
class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check the health status of the AI services."
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns the status of all AI services.
    """
    return HealthResponse(
        status="healthy",
        service="KitchenXpert AI Services",
        version="1.0.0",
        services_available={
            "layout_optimizer": True,
            "style_recommender": True,
            "budget_optimizer": True,
            "space_analyzer": True,
        }
    )


@router.post(
    "/optimize-layout",
    response_model=LayoutOptimizationResult,
    summary="Optimize Kitchen Layout",
    description="Use genetic algorithms to optimize kitchen layout for ergonomics, storage, and workflow.",
    responses={
        200: {"description": "Layout optimization successful"},
        400: {"description": "Invalid request parameters"},
        500: {"description": "Internal server error"},
    }
)
async def optimize_layout(request: LayoutOptimizationRequest) -> LayoutOptimizationResult:
    """
    Optimize kitchen layout using genetic algorithms.

    This endpoint takes a room configuration and user preferences,
    then uses genetic algorithms to find optimal placements for
    cabinets and appliances.

    The optimization considers:
    - Work triangle efficiency (sink, stove, refrigerator)
    - Storage capacity
    - Workflow and zone organization
    - Space utilization
    - Accessibility requirements

    Args:
        request: Layout optimization request with room config and preferences

    Returns:
        Optimized kitchen configurations with scores and recommendations
    """
    try:
        optimizer = get_layout_optimizer()
        result = optimizer.optimize(request)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="; ".join(result.errors) if result.errors else "Layout optimization failed"
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Layout optimization error: {str(e)}"
        )


@router.post(
    "/recommend-style",
    response_model=StyleRecommendationResponse,
    summary="Recommend Kitchen Style",
    description="Get ML-based style recommendations based on user preferences.",
    responses={
        200: {"description": "Style recommendations generated"},
        400: {"description": "Invalid request parameters"},
        500: {"description": "Internal server error"},
    }
)
async def recommend_style(request: StyleRecommendationRequest) -> StyleRecommendationResponse:
    """
    Get kitchen style recommendations based on user preferences.

    This endpoint analyzes user preferences including:
    - Color preferences
    - Material preferences
    - Lifestyle factors
    - Existing home style
    - Design priorities

    And returns matching kitchen styles with:
    - Match scores
    - Key characteristics
    - Recommended features
    - Color palettes
    - Material suggestions

    Args:
        request: Style recommendation request with user preferences

    Returns:
        Ranked style recommendations with detailed feature suggestions
    """
    try:
        recommender = get_style_recommender()
        result = recommender.recommend(request)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="; ".join(result.errors) if result.errors else "Style recommendation failed"
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Style recommendation error: {str(e)}"
        )


@router.post(
    "/optimize-budget",
    response_model=BudgetOptimizationResult,
    summary="Optimize Kitchen Budget",
    description="Optimize kitchen configuration within budget constraints.",
    responses={
        200: {"description": "Budget optimization successful"},
        400: {"description": "Invalid request parameters"},
        500: {"description": "Internal server error"},
    }
)
async def optimize_budget(request: BudgetOptimizationRequest) -> BudgetOptimizationResult:
    """
    Optimize kitchen budget allocation and find cost-saving alternatives.

    This endpoint provides:
    - Optimal budget allocations by category
    - Product alternatives at different price points
    - Cost-saving opportunities
    - Budget recommendations

    The optimization considers:
    - User priorities for different categories
    - Fixed items that cannot be changed
    - Quality vs. cost tradeoffs
    - Standard budget allocation best practices

    Args:
        request: Budget optimization request with budget and priorities

    Returns:
        Optimized budget allocations and product alternatives
    """
    try:
        optimizer = get_budget_optimizer()
        result = optimizer.optimize(request)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="; ".join(result.errors) if result.errors else "Budget optimization failed"
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Budget optimization error: {str(e)}"
        )


@router.post(
    "/analyze-space",
    response_model=SpaceAnalysisResult,
    summary="Analyze Kitchen Space",
    description="Perform comprehensive 3D space analysis of kitchen configuration.",
    responses={
        200: {"description": "Space analysis completed"},
        400: {"description": "Invalid request parameters"},
        500: {"description": "Internal server error"},
    }
)
async def analyze_space(request: SpaceAnalysisRequest) -> SpaceAnalysisResult:
    """
    Perform comprehensive 3D space analysis.

    This endpoint analyzes:
    - Space utilization efficiency
    - Storage capacity
    - Accessibility compliance
    - Workflow and ergonomics
    - Spatial conflicts between items

    The analysis provides:
    - Detailed metrics for each category
    - Overall space score
    - Specific recommendations for improvement
    - Conflict detection and resolution suggestions

    Args:
        request: Space analysis request with room and configuration

    Returns:
        Comprehensive space analysis with metrics and recommendations
    """
    try:
        analyzer = get_space_analyzer()
        result = analyzer.analyze(request)

        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="; ".join(result.errors) if result.errors else "Space analysis failed"
            )

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Space analysis error: {str(e)}"
        )


# Additional utility endpoints

class ServiceInfo(BaseModel):
    """Service information response."""
    name: str
    description: str
    endpoints: list[str]


@router.get(
    "/info",
    response_model=ServiceInfo,
    summary="Service Information",
    description="Get information about available AI services."
)
async def get_service_info() -> ServiceInfo:
    """
    Get information about available AI services.

    Returns a description of the service and available endpoints.
    """
    return ServiceInfo(
        name="KitchenXpert AI Services",
        description="AI-powered services for kitchen design optimization including "
                    "layout optimization, style recommendations, budget optimization, "
                    "and space analysis.",
        endpoints=[
            "POST /api/optimize-layout - Optimize kitchen layout using genetic algorithms",
            "POST /api/recommend-style - Get style recommendations based on preferences",
            "POST /api/optimize-budget - Optimize budget allocation and find alternatives",
            "POST /api/analyze-space - Perform comprehensive 3D space analysis",
            "GET /api/health - Health check endpoint",
            "GET /api/info - Service information",
        ]
    )
