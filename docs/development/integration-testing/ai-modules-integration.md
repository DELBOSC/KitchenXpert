# AI Modules Integration Testing

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [Testing AI Service Integration](#testing-ai-service-integration)
- [Mocking ML Models](#mocking-ml-models)
- [Testing Design Generation Flow](#testing-design-generation-flow)
- [Testing Appliance Recommendations](#testing-appliance-recommendations)
- [Performance Testing for AI Endpoints](#performance-testing-for-ai-endpoints)
- [Best Practices](#best-practices)

## Overview

AI modules integration tests verify that the Python FastAPI AI service
integrates correctly with the Node.js backend and frontend.

## Testing AI Service Integration

### Backend to AI Service Test

```typescript
// tests/integration/ai/ai-service.integration.test.ts
import { AIService } from '@/services/ai.service';
import { testDb } from '../../helpers/database';

describe('AI Service Integration', () => {
  it('should communicate with AI service', async () => {
    const response = await AIService.ping();
    expect(response.status).toBe('healthy');
  });

  it('should generate design', async () => {
    const params = {
      style: 'modern',
      dimensions: { width: 12, height: 10 },
      budget: 5000,
    };

    const design = await AIService.generateDesign(params);

    expect(design).toHaveProperty('id');
    expect(design).toHaveProperty('appliances');
    expect(design.appliances.length).toBeGreaterThan(0);
  });

  it('should handle AI service timeout', async () => {
    jest.setTimeout(10000);

    await expect(
      AIService.generateDesign(
        {
          style: 'modern',
          dimensions: { width: 12, height: 10 },
        },
        { timeout: 100 } // Very short timeout
      )
    ).rejects.toThrow('Timeout');
  });
});
```

### Python AI Service Tests

```python
# packages/ai-modules/tests/test_integration.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_generate_design():
    """Test design generation endpoint."""
    payload = {
        "style": "modern",
        "dimensions": {"width": 12, "height": 10},
        "budget": 5000
    }

    response = client.post("/api/v1/designs/generate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "design" in data["data"]
    assert len(data["data"]["design"]["appliances"]) > 0


def test_recommend_appliances():
    """Test appliance recommendation endpoint."""
    payload = {
        "category": "refrigerators",
        "budget": 2000,
        "preferences": {
            "energyEfficient": True,
            "capacity": "large"
        }
    }

    response = client.post("/api/v1/recommendations/appliances", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["recommendations"]) > 0


@pytest.mark.asyncio
async def test_concurrent_requests():
    """Test handling concurrent requests."""
    import asyncio
    from httpx import AsyncClient

    async with AsyncClient(app=app, base_url="http://test") as ac:
        tasks = [
            ac.post("/api/v1/designs/generate", json={
                "style": "modern",
                "dimensions": {"width": 10, "height": 10}
            })
            for _ in range(10)
        ]

        responses = await asyncio.gather(*tasks)

    assert all(r.status_code == 200 for r in responses)
```

## Mocking ML Models

### Mock Model for Tests

```python
# packages/ai-modules/tests/conftest.py
import pytest
from unittest.mock import Mock, AsyncMock


@pytest.fixture
def mock_design_model():
    """Mock design generation model."""
    model = Mock()
    model.predict = AsyncMock(return_value={
        "appliances": [
            {
                "type": "refrigerator",
                "position": {"x": 0, "y": 0},
                "model": "modern-fridge-001"
            },
            {
                "type": "dishwasher",
                "position": {"x": 5, "y": 0},
                "model": "modern-dishwasher-001"
            }
        ],
        "layout": "L-shaped",
        "confidence": 0.95
    })
    return model


@pytest.fixture
def mock_recommendation_model():
    """Mock recommendation model."""
    model = Mock()
    model.predict = AsyncMock(return_value=[
        {
            "product_id": "REF-001",
            "score": 0.95,
            "reason": "High energy efficiency"
        },
        {
            "product_id": "REF-002",
            "score": 0.88,
            "reason": "Within budget"
        }
    ])
    return model


# Use in tests
def test_design_generation_with_mock(mock_design_model):
    """Test with mocked model."""
    from app.services.design_service import DesignService

    # Inject mock model
    service = DesignService(model=mock_design_model)

    result = await service.generate({
        "style": "modern",
        "dimensions": {"width": 12, "height": 10}
    })

    assert len(result["appliances"]) == 2
    mock_design_model.predict.assert_called_once()
```

### Mock Model Responses

```typescript
// Backend test - mock AI service responses
jest.mock('@/services/ai.service', () => ({
  AIService: {
    generateDesign: jest.fn().mockResolvedValue({
      id: 'mock-design-id',
      appliances: [
        {
          type: 'refrigerator',
          position: { x: 0, y: 0 },
          model: 'modern-fridge-001',
        },
      ],
      layout: 'L-shaped',
    }),

    recommendAppliances: jest.fn().mockResolvedValue({
      recommendations: [
        {
          productId: 'REF-001',
          score: 0.95,
          reason: 'High energy efficiency',
        },
      ],
    }),
  },
}));
```

## Testing Design Generation Flow

### End-to-End Design Generation

```typescript
// tests/integration/design-generation.test.ts
import request from 'supertest';
import app from '@/app';
import { getAuthToken } from '../helpers/auth';

describe('Design Generation Flow', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const auth = await getAuthToken();
    authToken = auth.token;
    userId = auth.user.id;
  });

  it('should complete design generation flow', async () => {
    // 1. Request design generation
    const generateResponse = await request(app)
      .post('/api/v1/designs/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'AI Generated Kitchen',
        style: 'modern',
        dimensions: { width: 12, height: 10 },
        budget: 5000,
      })
      .expect(201);

    expect(generateResponse.body.success).toBe(true);
    const designId = generateResponse.body.data.id;

    // 2. Check generation status
    const statusResponse = await request(app)
      .get(`/api/v1/designs/${designId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(statusResponse.body.data.status).toMatch(
      /pending|processing|completed/
    );

    // 3. Wait for completion (with timeout)
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (!completed && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const checkResponse = await request(app)
        .get(`/api/v1/designs/${designId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      completed = checkResponse.body.data.status === 'completed';
      attempts++;
    }

    expect(completed).toBe(true);

    // 4. Retrieve completed design
    const designResponse = await request(app)
      .get(`/api/v1/designs/${designId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const design = designResponse.body.data;
    expect(design.appliances).toBeDefined();
    expect(design.appliances.length).toBeGreaterThan(0);
  });
});
```

## Testing Appliance Recommendations

### Recommendation Integration Test

```typescript
// tests/integration/recommendations.test.ts
import request from 'supertest';
import app from '@/app';
import { getAuthToken } from '../helpers/auth';

describe('Appliance Recommendations', () => {
  let authToken: string;

  beforeAll(async () => {
    const auth = await getAuthToken();
    authToken = auth.token;
  });

  it('should get personalized recommendations', async () => {
    const response = await request(app)
      .post('/api/v1/recommendations/appliances')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        category: 'refrigerators',
        budget: 2000,
        preferences: {
          energyEfficient: true,
          capacity: 'large',
          features: ['water-dispenser', 'ice-maker'],
        },
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.recommendations).toBeInstanceOf(Array);
    expect(response.body.data.recommendations.length).toBeGreaterThan(0);

    const firstRec = response.body.data.recommendations[0];
    expect(firstRec).toHaveProperty('productId');
    expect(firstRec).toHaveProperty('score');
    expect(firstRec).toHaveProperty('reason');
    expect(firstRec.score).toBeGreaterThanOrEqual(0);
    expect(firstRec.score).toBeLessThanOrEqual(1);
  });

  it('should filter by budget', async () => {
    const response = await request(app)
      .post('/api/v1/recommendations/appliances')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        category: 'refrigerators',
        budget: 1000, // Lower budget
      })
      .expect(200);

    // Verify all recommendations are within budget
    for (const rec of response.body.data.recommendations) {
      const product = await prisma.product.findUnique({
        where: { id: rec.productId },
      });
      expect(product.price).toBeLessThanOrEqual(1000);
    }
  });
});
```

### Python Recommendation Tests

```python
# packages/ai-modules/tests/test_recommendations.py
import pytest
from app.services.recommendation_service import RecommendationService
from app.schemas.recommendation import RecommendationParams


@pytest.mark.asyncio
async def test_recommend_refrigerators():
    """Test refrigerator recommendations."""
    params = RecommendationParams(
        category="refrigerators",
        budget=2000,
        preferences={
            "energyEfficient": True,
            "capacity": "large"
        }
    )

    recommendations = await RecommendationService.get_recommendations(params)

    assert len(recommendations) > 0
    assert all(r.score >= 0 and r.score <= 1 for r in recommendations)
    assert all(r.product_id is not None for r in recommendations)


@pytest.mark.asyncio
async def test_personalized_recommendations(mock_user_history):
    """Test personalized recommendations based on user history."""
    params = RecommendationParams(
        category="dishwashers",
        user_id="test-user-123"
    )

    recommendations = await RecommendationService.get_recommendations(
        params,
        user_history=mock_user_history
    )

    # Verify personalization worked
    assert len(recommendations) > 0
    # First recommendation should align with user preferences
    assert recommendations[0].score > 0.8
```

## Performance Testing for AI Endpoints

### Load Testing

```typescript
// tests/integration/ai-performance.test.ts
import request from 'supertest';
import app from '@/app';

describe('AI Endpoints Performance', () => {
  it('should handle concurrent design generation requests', async () => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post('/api/v1/designs/generate')
        .send({
          name: `Design ${i}`,
          style: 'modern',
          dimensions: { width: 10, height: 10 },
        })
    );

    const startTime = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;

    // All requests should succeed
    expect(responses.every((r) => r.status === 201)).toBe(true);

    // Should complete within reasonable time (adjust as needed)
    expect(duration).toBeLessThan(30000); // 30 seconds
  });

  it('should respond within timeout', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .post('/api/v1/designs/generate')
      .send({
        style: 'modern',
        dimensions: { width: 12, height: 10 },
      })
      .expect(201);

    const duration = Date.now() - startTime;

    // Should respond within 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});
```

### Python Performance Tests

```python
# packages/ai-modules/tests/test_performance.py
import pytest
import asyncio
import time
from app.services.design_service import DesignService


@pytest.mark.asyncio
async def test_design_generation_performance():
    """Test design generation performance."""
    params = {
        "style": "modern",
        "dimensions": {"width": 12, "height": 10}
    }

    start_time = time.time()
    result = await DesignService.generate(params)
    duration = time.time() - start_time

    assert result is not None
    assert duration < 3.0  # Should complete in less than 3 seconds


@pytest.mark.asyncio
async def test_concurrent_design_generation():
    """Test handling concurrent design generation."""
    tasks = [
        DesignService.generate({
            "style": "modern",
            "dimensions": {"width": 10, "height": 10}
        })
        for _ in range(10)
    ]

    start_time = time.time()
    results = await asyncio.gather(*tasks)
    duration = time.time() - start_time

    assert len(results) == 10
    assert all(r is not None for r in results)
    assert duration < 30.0  # All should complete in less than 30 seconds
```

## Best Practices

### 1. Use Fixtures for Test Data

```python
@pytest.fixture
def sample_design_params():
    """Sample design parameters for testing."""
    return {
        "style": "modern",
        "dimensions": {"width": 12, "height": 10},
        "budget": 5000,
        "preferences": {
            "colorScheme": "neutral",
            "layout": "L-shaped"
        }
    }
```

### 2. Mock Heavy Computations

```python
@pytest.fixture
def mock_ml_inference(monkeypatch):
    """Mock ML model inference for faster tests."""
    async def mock_predict(*args, **kwargs):
        return {
            "result": "mocked",
            "confidence": 0.95
        }

    monkeypatch.setattr(
        "app.models.design_model.predict",
        mock_predict
    )
```

### 3. Test Error Scenarios

```python
@pytest.mark.asyncio
async def test_invalid_dimensions():
    """Test handling of invalid dimensions."""
    params = {
        "style": "modern",
        "dimensions": {"width": -1, "height": 0}  # Invalid
    }

    with pytest.raises(ValueError):
        await DesignService.generate(params)
```

### 4. Verify Model Outputs

```typescript
it('should return valid AI response format', async () => {
  const response = await AIService.generateDesign({
    style: 'modern',
    dimensions: { width: 12, height: 10 },
  });

  // Verify response structure
  expect(response).toMatchObject({
    id: expect.any(String),
    appliances: expect.arrayContaining([
      expect.objectContaining({
        type: expect.any(String),
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      }),
    ]),
  });
});
```

## Related Documentation

- [Integration Testing Overview](./overview.md) - Testing strategy
- [Frontend-Backend Integration](./frontend-backend-integration.md) - API
  testing
- [Performance Optimization](../performance-optimization.md) - Performance
  tuning
- [AI Service API](../../api/ai-service.md) - AI service documentation
