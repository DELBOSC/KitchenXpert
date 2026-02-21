"""
Tests for the API routes module.

Tests cover:
- Layout optimization endpoint
- Style recommendation endpoint
- Budget optimization endpoint
- Space analysis endpoint
- Service singleton getters
- Error handling for all endpoints
"""

import pytest
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from src.main import app
from src.api.routes import (
    get_layout_optimizer,
    get_style_recommender,
    get_budget_optimizer,
    get_space_analyzer,
    HealthResponse,
    ErrorResponse,
    ServiceInfo,
)
from src.models.kitchen import (
    MeasurementUnit,
    KitchenStyle,
    KitchenShape,
    RoomDimensions,
    WallSegment,
    RoomConfiguration,
    BudgetRange,
    UserPreferences,
    ApplianceCategory,
)
from src.models.recommendations import (
    StylePreferenceInput,
    BudgetCategory,
)


class TestServiceSingletons:
    """Test service singleton getters."""

    def test_get_layout_optimizer_returns_instance(self):
        """Test that get_layout_optimizer returns an instance."""
        optimizer = get_layout_optimizer()
        assert optimizer is not None
        from src.services.layout_optimizer import LayoutOptimizer
        assert isinstance(optimizer, LayoutOptimizer)

    def test_get_layout_optimizer_singleton(self):
        """Test that get_layout_optimizer returns same instance."""
        optimizer1 = get_layout_optimizer()
        optimizer2 = get_layout_optimizer()
        assert optimizer1 is optimizer2

    def test_get_style_recommender_returns_instance(self):
        """Test that get_style_recommender returns an instance."""
        recommender = get_style_recommender()
        assert recommender is not None
        from src.services.style_recommender import StyleRecommender
        assert isinstance(recommender, StyleRecommender)

    def test_get_style_recommender_singleton(self):
        """Test that get_style_recommender returns same instance."""
        recommender1 = get_style_recommender()
        recommender2 = get_style_recommender()
        assert recommender1 is recommender2

    def test_get_budget_optimizer_returns_instance(self):
        """Test that get_budget_optimizer returns an instance."""
        optimizer = get_budget_optimizer()
        assert optimizer is not None
        from src.services.budget_optimizer import BudgetOptimizer
        assert isinstance(optimizer, BudgetOptimizer)

    def test_get_space_analyzer_returns_instance(self):
        """Test that get_space_analyzer returns an instance."""
        analyzer = get_space_analyzer()
        assert analyzer is not None
        from src.services.space_analyzer import SpaceAnalyzer
        assert isinstance(analyzer, SpaceAnalyzer)


class TestHealthCheckEndpoint:
    """Test the health check endpoint."""

    def test_health_check_success(self):
        """Test health check returns healthy status."""
        client = TestClient(app)
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "KitchenXpert AI Services"
        assert data["version"] == "1.0.0"

    def test_health_check_services_status(self):
        """Test health check reports all services."""
        client = TestClient(app)
        response = client.get("/api/health")

        data = response.json()
        services = data["services_available"]

        assert len(services) == 4
        assert all(v is True for v in services.values())


class TestLayoutOptimizationEndpoint:
    """Test the layout optimization endpoint."""

    def test_optimize_layout_success(self, basic_room_configuration, basic_user_preferences):
        """Test successful layout optimization."""
        client = TestClient(app)

        request_data = {
            "room": basic_room_configuration.model_dump(),
            "preferences": basic_user_preferences.model_dump(),
            "existing_items": [],
            "fixed_positions": {},
            "optimization_priorities": ["ergonomics", "storage"],
            "population_size": 10,
            "generations": 10,
        }

        response = client.post("/api/optimize-layout", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "best_configuration" in data
        assert "fitness_score" in data

    def test_optimize_layout_with_minimal_data(self):
        """Test layout optimization with minimal required data."""
        client = TestClient(app)

        request_data = {
            "room": {
                "dimensions": {
                    "width": 300,
                    "length": 250,
                    "height": 250,
                    "unit": "cm",
                },
                "walls": [],
                "utilities": [],
            },
            "preferences": {
                "budget": {"min_amount": 5000, "max_amount": 15000, "currency": "EUR"},
                "style": "modern",
                "required_appliances": ["refrigerator", "cooktop"],
            },
            "population_size": 10,
            "generations": 10,
        }

        response = client.post("/api/optimize-layout", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_optimize_layout_returns_work_triangle(self, basic_room_configuration, basic_user_preferences):
        """Test that optimization returns work triangle analysis."""
        client = TestClient(app)

        request_data = {
            "room": basic_room_configuration.model_dump(),
            "preferences": basic_user_preferences.model_dump(),
            "existing_items": [],
            "population_size": 10,
            "generations": 10,
        }

        response = client.post("/api/optimize-layout", json=request_data)

        data = response.json()
        # Work triangle may or may not be present depending on items placed
        assert "work_triangle" in data

    def test_optimize_layout_invalid_room(self):
        """Test layout optimization with invalid room data."""
        client = TestClient(app)

        request_data = {
            "room": {
                "dimensions": {
                    "width": -100,  # Invalid negative width
                    "length": 250,
                    "height": 250,
                    "unit": "cm",
                },
                "walls": [],
                "utilities": [],
            },
            "preferences": {
                "budget": {"min_amount": 5000, "max_amount": 15000},
                "style": "modern",
            },
        }

        response = client.post("/api/optimize-layout", json=request_data)

        assert response.status_code == 422  # Validation error


class TestStyleRecommendationEndpoint:
    """Test the style recommendation endpoint."""

    def test_recommend_style_success(self):
        """Test successful style recommendation."""
        client = TestClient(app)

        request_data = {
            "preferences": {
                "preferred_colors": ["white", "gray"],
                "preferred_materials": ["wood", "quartz"],
                "lifestyle": "family",
                "existing_home_style": "modern",
                "priorities": ["functionality", "durability"],
                "dislikes": ["ornate details"],
            },
            "num_recommendations": 3,
        }

        response = client.post("/api/recommend-style", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "recommendations" in data
        assert len(data["recommendations"]) <= 3

    def test_recommend_style_with_budget(self):
        """Test style recommendation with budget constraint."""
        client = TestClient(app)

        request_data = {
            "preferences": {
                "preferred_colors": ["navy", "white"],
                "preferred_materials": ["marble", "brass"],
                "lifestyle": "entertaining",
            },
            "budget": {
                "min_amount": 20000,
                "max_amount": 40000,
                "currency": "EUR",
            },
            "num_recommendations": 2,
        }

        response = client.post("/api/recommend-style", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "top_recommendation" in data

    def test_recommend_style_returns_analysis(self):
        """Test that recommendation returns analysis summary."""
        client = TestClient(app)

        request_data = {
            "preferences": {
                "preferred_colors": ["white"],
                "lifestyle": "minimalist",
            },
            "num_recommendations": 1,
        }

        response = client.post("/api/recommend-style", json=request_data)

        data = response.json()
        assert "analysis_summary" in data
        assert len(data["analysis_summary"]) > 0

    def test_recommend_style_empty_preferences(self):
        """Test style recommendation with empty preferences."""
        client = TestClient(app)

        request_data = {
            "preferences": {},
            "num_recommendations": 3,
        }

        response = client.post("/api/recommend-style", json=request_data)

        assert response.status_code == 200
        data = response.json()
        # Should still return recommendations with neutral scores
        assert data["success"] is True


class TestBudgetOptimizationEndpoint:
    """Test the budget optimization endpoint."""

    def test_optimize_budget_success_without_config(self):
        """Test budget optimization without existing configuration."""
        client = TestClient(app)

        request_data = {
            "total_budget": 20000,
            "currency": "EUR",
            "priorities": {
                "cabinets": 7,
                "appliances": 8,
                "countertops": 5,
            },
            "fixed_items": [],
            "optimization_goal": "maximize_value",
        }

        response = client.post("/api/optimize-budget", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "allocations" in data
        assert len(data["allocations"]) > 0

    def test_optimize_budget_allocations_sum(self):
        """Test that budget allocations approximately sum to total."""
        client = TestClient(app)

        request_data = {
            "total_budget": 15000,
            "currency": "EUR",
            "priorities": {},
        }

        response = client.post("/api/optimize-budget", json=request_data)

        data = response.json()
        allocations = data["allocations"]

        total_allocated = sum(a["allocated_amount"] for a in allocations)
        # Allow some tolerance
        assert abs(total_allocated - 15000) < 1.0

    def test_optimize_budget_with_configuration(self, basic_kitchen_configuration, basic_user_preferences):
        """Test budget optimization with existing configuration."""
        client = TestClient(app)

        request_data = {
            "total_budget": 15000,
            "currency": "EUR",
            "current_configuration": basic_kitchen_configuration.model_dump(),
            "preferences": basic_user_preferences.model_dump(),
            "priorities": {
                "cabinets": 6,
                "appliances": 7,
            },
        }

        response = client.post("/api/optimize-budget", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "original_total" in data
        assert "optimized_total" in data

    def test_optimize_budget_recommendations(self):
        """Test that budget optimization provides recommendations."""
        client = TestClient(app)

        request_data = {
            "total_budget": 10000,
            "currency": "EUR",
        }

        response = client.post("/api/optimize-budget", json=request_data)

        data = response.json()
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)


class TestSpaceAnalysisEndpoint:
    """Test the space analysis endpoint."""

    def test_analyze_space_success(self, basic_room_configuration, basic_kitchen_configuration):
        """Test successful space analysis."""
        client = TestClient(app)

        request_data = {
            "room": basic_room_configuration.model_dump(),
            "configuration": basic_kitchen_configuration.model_dump(),
            "analyze_accessibility": True,
            "analyze_storage": True,
            "analyze_workflow": True,
        }

        response = client.post("/api/analyze-space", json=request_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "utilization" in data
        assert "overall_score" in data

    def test_analyze_space_utilization_metrics(self, basic_room_configuration, basic_kitchen_configuration):
        """Test that space analysis returns utilization metrics."""
        client = TestClient(app)

        request_data = {
            "room": basic_room_configuration.model_dump(),
            "configuration": basic_kitchen_configuration.model_dump(),
        }

        response = client.post("/api/analyze-space", json=request_data)

        data = response.json()
        utilization = data["utilization"]

        assert "total_floor_area" in utilization
        assert "usable_floor_area" in utilization
        assert "cabinet_footprint" in utilization
        assert "utilization_percentage" in utilization
        assert "efficiency_rating" in utilization

    def test_analyze_space_accessibility(self, basic_room_configuration, basic_kitchen_configuration):
        """Test space analysis accessibility analysis."""
        client = TestClient(app)

        request_data = {
            "room": basic_room_configuration.model_dump(),
            "configuration": basic_kitchen_configuration.model_dump(),
            "analyze_accessibility": True,
        }

        response = client.post("/api/analyze-space", json=request_data)

        data = response.json()
        # Accessibility analysis should be present when requested
        if data.get("accessibility"):
            assert "wheelchair_accessible" in data["accessibility"]
            assert "minimum_passage_width" in data["accessibility"]

    def test_analyze_space_workflow(self, basic_room_configuration, basic_kitchen_configuration):
        """Test space analysis workflow analysis."""
        client = TestClient(app)

        request_data = {
            "room": basic_room_configuration.model_dump(),
            "configuration": basic_kitchen_configuration.model_dump(),
            "analyze_workflow": True,
        }

        response = client.post("/api/analyze-space", json=request_data)

        data = response.json()
        if data.get("workflow"):
            assert "flow_efficiency" in data["workflow"]
            assert "zones" in data["workflow"]

    def test_analyze_space_conflicts(self, basic_room_configuration, basic_kitchen_configuration):
        """Test space analysis conflict detection."""
        client = TestClient(app)

        request_data = {
            "room": basic_room_configuration.model_dump(),
            "configuration": basic_kitchen_configuration.model_dump(),
        }

        response = client.post("/api/analyze-space", json=request_data)

        data = response.json()
        assert "conflicts" in data
        assert isinstance(data["conflicts"], list)


class TestServiceInfoEndpoint:
    """Test the service info endpoint."""

    def test_service_info_success(self):
        """Test service info endpoint returns correct data."""
        client = TestClient(app)
        response = client.get("/api/info")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "KitchenXpert AI Services"
        assert "description" in data
        assert len(data["description"]) > 0

    def test_service_info_lists_endpoints(self):
        """Test service info lists all endpoints."""
        client = TestClient(app)
        response = client.get("/api/info")

        data = response.json()
        endpoints = data["endpoints"]

        assert len(endpoints) >= 6
        endpoint_names = " ".join(endpoints)
        assert "optimize-layout" in endpoint_names
        assert "recommend-style" in endpoint_names
        assert "optimize-budget" in endpoint_names
        assert "analyze-space" in endpoint_names
        assert "health" in endpoint_names


class TestResponseModels:
    """Test response model definitions."""

    def test_health_response_model(self):
        """Test HealthResponse model creation."""
        response = HealthResponse(
            status="healthy",
            service="Test Service",
            version="1.0.0",
            services_available={"test": True},
        )

        assert response.status == "healthy"
        assert response.service == "Test Service"
        assert response.services_available["test"] is True

    def test_error_response_model(self):
        """Test ErrorResponse model creation."""
        response = ErrorResponse(
            error="Test Error",
            detail="Something went wrong",
        )

        assert response.error == "Test Error"
        assert response.detail == "Something went wrong"

    def test_service_info_model(self):
        """Test ServiceInfo model creation."""
        info = ServiceInfo(
            name="Test Service",
            description="A test service",
            endpoints=["GET /test", "POST /test"],
        )

        assert info.name == "Test Service"
        assert len(info.endpoints) == 2


class TestAsyncEndpoints:
    """Test async behavior of endpoints."""

    @pytest.mark.asyncio
    async def test_health_check_async(self):
        """Test health check endpoint asynchronously."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/health")

        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_info_endpoint_async(self):
        """Test info endpoint asynchronously."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/info")

        assert response.status_code == 200
        assert "KitchenXpert" in response.json()["name"]
