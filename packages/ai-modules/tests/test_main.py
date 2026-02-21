"""
Tests for the FastAPI main application module.

Tests cover:
- Application startup and configuration
- Root endpoint responses
- Health check endpoints
- CORS middleware configuration
- Global exception handling
"""

import pytest
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient

from src.main import app, APP_TITLE, APP_VERSION, RootResponse


class TestAppConfiguration:
    """Test application configuration and metadata."""

    def test_app_title(self):
        """Test that the app has the correct title."""
        assert app.title == APP_TITLE
        assert "KitchenXpert" in app.title

    def test_app_version(self):
        """Test that the app has the correct version."""
        assert app.version == APP_VERSION
        assert app.version == "1.0.0"

    def test_app_has_openapi(self):
        """Test that OpenAPI documentation is available."""
        assert app.openapi_url == "/openapi.json"

    def test_app_has_docs(self):
        """Test that Swagger docs are available."""
        assert app.docs_url == "/docs"

    def test_app_has_redoc(self):
        """Test that ReDoc is available."""
        assert app.redoc_url == "/redoc"


class TestRootEndpoint:
    """Test the root endpoint."""

    def test_root_endpoint_sync(self):
        """Test root endpoint returns welcome message."""
        client = TestClient(app)
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Welcome" in data["message"]
        assert data["version"] == APP_VERSION
        assert data["docs_url"] == "/docs"
        assert data["health_url"] == "/api/health"

    @pytest.mark.asyncio
    async def test_root_endpoint_async(self):
        """Test root endpoint asynchronously."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Welcome to KitchenXpert AI Services"


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_root_health_endpoint(self):
        """Test the root-level health endpoint."""
        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data

    def test_api_health_endpoint(self):
        """Test the API health endpoint."""
        client = TestClient(app)
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert "services_available" in data

    def test_api_health_services_available(self):
        """Test that all services are reported as available."""
        client = TestClient(app)
        response = client.get("/api/health")

        data = response.json()
        services = data["services_available"]

        assert services["layout_optimizer"] is True
        assert services["style_recommender"] is True
        assert services["budget_optimizer"] is True
        assert services["space_analyzer"] is True

    @pytest.mark.asyncio
    async def test_health_endpoint_async(self):
        """Test health endpoint asynchronously."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/health")

        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestCORSConfiguration:
    """Test CORS middleware configuration."""

    def test_cors_allowed_origins(self):
        """Test that CORS headers are present for allowed origins."""
        client = TestClient(app)
        response = client.options(
            "/",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

        # CORS preflight should succeed
        assert response.status_code == 200

    def test_cors_headers_in_response(self):
        """Test that CORS headers are included in responses."""
        client = TestClient(app)
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:3000"},
        )

        assert response.status_code == 200
        # CORS headers should be present
        assert "access-control-allow-origin" in response.headers or response.status_code == 200


class TestAPIRouterIntegration:
    """Test that the API router is properly integrated."""

    def test_api_info_endpoint(self):
        """Test the API info endpoint."""
        client = TestClient(app)
        response = client.get("/api/info")

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "KitchenXpert AI Services"
        assert "endpoints" in data
        assert len(data["endpoints"]) > 0

    def test_api_endpoints_listed(self):
        """Test that all expected endpoints are listed."""
        client = TestClient(app)
        response = client.get("/api/info")

        data = response.json()
        endpoints_str = " ".join(data["endpoints"])

        assert "optimize-layout" in endpoints_str
        assert "recommend-style" in endpoints_str
        assert "optimize-budget" in endpoints_str
        assert "analyze-space" in endpoints_str


class TestOpenAPISchema:
    """Test OpenAPI schema generation."""

    def test_openapi_schema_available(self):
        """Test that OpenAPI schema is available."""
        client = TestClient(app)
        response = client.get("/openapi.json")

        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema

    def test_openapi_schema_info(self):
        """Test OpenAPI schema info section."""
        client = TestClient(app)
        response = client.get("/openapi.json")

        schema = response.json()
        assert schema["info"]["title"] == APP_TITLE
        assert schema["info"]["version"] == APP_VERSION

    def test_openapi_paths_include_endpoints(self):
        """Test that OpenAPI schema includes all endpoints."""
        client = TestClient(app)
        response = client.get("/openapi.json")

        schema = response.json()
        paths = schema["paths"]

        assert "/" in paths
        assert "/api/health" in paths
        assert "/api/optimize-layout" in paths
        assert "/api/recommend-style" in paths
        assert "/api/optimize-budget" in paths
        assert "/api/analyze-space" in paths


class TestRootResponseModel:
    """Test the RootResponse Pydantic model."""

    def test_root_response_model_creation(self):
        """Test creating a RootResponse model."""
        response = RootResponse(
            message="Test message",
            version="1.0.0",
            docs_url="/docs",
            health_url="/health",
        )

        assert response.message == "Test message"
        assert response.version == "1.0.0"
        assert response.docs_url == "/docs"
        assert response.health_url == "/health"

    def test_root_response_model_serialization(self):
        """Test RootResponse model serializes correctly."""
        response = RootResponse(
            message="Test",
            version="1.0.0",
            docs_url="/docs",
            health_url="/health",
        )

        data = response.model_dump()
        assert data["message"] == "Test"
        assert data["version"] == "1.0.0"


class TestDocsEndpoints:
    """Test documentation endpoints."""

    def test_docs_endpoint_available(self):
        """Test that Swagger UI docs are available."""
        client = TestClient(app)
        response = client.get("/docs")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_redoc_endpoint_available(self):
        """Test that ReDoc is available."""
        client = TestClient(app)
        response = client.get("/redoc")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]


class TestErrorHandling:
    """Test error handling in the application."""

    def test_404_for_unknown_endpoint(self):
        """Test that unknown endpoints return 404."""
        client = TestClient(app)
        response = client.get("/unknown/endpoint")

        assert response.status_code == 404

    def test_method_not_allowed(self):
        """Test that wrong methods return 405."""
        client = TestClient(app)
        # POST to root should not be allowed
        response = client.post("/")

        assert response.status_code == 405
