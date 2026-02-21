# AI Design Generation Endpoint

## Overview

Generate AI-powered kitchen designs based on questionnaire answers, returning personalized design with alternatives. Supports async processing for complex designs.

**Endpoint:** `POST /api/v1/ai/design-generation`

**Authentication Required:** Yes

**Rate Limiting:** 5 requests per hour per user

---

## Request

### Headers

```
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `questionnaire` | object | Yes | User questionnaire answers | - |
| `questionnaire.kitchenDimensions` | object | Yes | Room dimensions in cm | - |
| `questionnaire.kitchenDimensions.length` | number | Yes | Length in cm | 100-1000 |
| `questionnaire.kitchenDimensions.width` | number | Yes | Width in cm | 100-1000 |
| `questionnaire.kitchenDimensions.height` | number | Yes | Height in cm | 200-350 |
| `questionnaire.style` | string | Yes | Design style preference | modern, traditional, minimalist, rustic, industrial, scandinavian |
| `questionnaire.budget` | number | Yes | Total budget in USD | Min 1000 |
| `questionnaire.cookingHabits` | array | Yes | Cooking habits/preferences | - |
| `questionnaire.householdSize` | number | Yes | Number of household members | 1-20 |
| `questionnaire.priorities` | array | Yes | Design priorities | efficiency, aesthetics, storage, sustainability, technology |
| `async` | boolean | No | Process asynchronously | Default: false |

### Request Body Example

```json
{
  "questionnaire": {
    "kitchenDimensions": {
      "length": 450,
      "width": 350,
      "height": 250
    },
    "style": "modern",
    "budget": 20000,
    "cookingHabits": ["frequent_cooking", "baking", "entertaining"],
    "householdSize": 4,
    "priorities": ["efficiency", "storage", "aesthetics"]
  },
  "async": false
}
```

---

## Response

### Success Response (200 OK) - Synchronous

```json
{
  "success": true,
  "data": {
    "design": {
      "id": "ai_design_5k7j9h2g",
      "name": "Modern Efficiency Kitchen",
      "description": "AI-generated modern kitchen optimized for efficiency and storage",
      "score": 92,
      "dimensions": {
        "length": 450,
        "width": 350,
        "height": 250,
        "unit": "cm"
      },
      "totalCost": 18750,
      "components": [
        {
          "type": "refrigerator",
          "productId": "prod_5h7g6f4d3s2a1z",
          "productName": "SmartCool Pro Refrigerator",
          "price": 1299.99,
          "position": {"x": 0, "y": 0, "z": 0},
          "reason": "Energy-efficient model matches sustainability priority"
        },
        {
          "type": "oven",
          "productId": "prod_8j9k0l1m2n3o4p",
          "productName": "MultiChef Pro Oven",
          "price": 2199.99,
          "position": {"x": 150, "y": 0, "z": 0},
          "reason": "Excellent for baking based on cooking habits"
        }
      ],
      "features": [
        "Work triangle optimization for efficiency",
        "Ample storage solutions with 12 cabinets",
        "Smart appliance integration",
        "Energy-efficient lighting"
      ],
      "preview3DUrl": "https://cdn.kitchenxpert.com/ai-designs/ai_design_5k7j9h2g/preview.glb"
    },
    "alternatives": [
      {
        "id": "ai_design_alt1",
        "name": "Budget-Optimized Modern Kitchen",
        "score": 85,
        "totalCost": 16500,
        "description": "Cost-optimized alternative maintaining modern style",
        "componentsCount": 8
      },
      {
        "id": "ai_design_alt2",
        "name": "Premium Modern Kitchen",
        "score": 95,
        "totalCost": 22000,
        "description": "Enhanced design with premium appliances and features",
        "componentsCount": 12
      }
    ],
    "analysis": {
      "workflowEfficiency": 95,
      "storageCapacity": 88,
      "aestheticScore": 92,
      "budgetUtilization": 93.75,
      "sustainabilityScore": 90
    }
  },
  "meta": {
    "timestamp": "2026-01-10T17:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h",
    "processingTime": 4.2
  }
}
```

### Async Response (202 Accepted)

```json
{
  "success": true,
  "data": {
    "taskId": "task_9h8g7f6d5s4a",
    "status": "processing",
    "estimatedCompletionTime": "2026-01-10T17:35:00Z",
    "pollUrl": "/api/v1/ai/design-generation/task_9h8g7f6d5s4a",
    "webhookUrl": null
  },
  "meta": {
    "timestamp": "2026-01-10T17:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h"
  }
}
```

---

## Error Responses

### 400 Bad Request - Invalid Questionnaire

```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUESTIONNAIRE",
    "message": "Invalid questionnaire data",
    "details": [
      {
        "field": "questionnaire.budget",
        "message": "Budget must be at least 1000 USD",
        "value": 500
      },
      {
        "field": "questionnaire.style",
        "message": "Invalid style. Must be one of: modern, traditional, minimalist, rustic, industrial, scandinavian",
        "value": "futuristic"
      }
    ]
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 422 Unprocessable Entity - Impossible Constraints

```json
{
  "success": false,
  "error": {
    "code": "IMPOSSIBLE_CONSTRAINTS",
    "message": "Cannot generate design with given constraints",
    "details": {
      "reason": "Budget too low for required dimensions and household size",
      "minimumBudget": 5000,
      "suggestion": "Increase budget or reduce kitchen dimensions"
    }
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "AI generation limit reached for this hour",
    "details": {
      "limit": 5,
      "resetAt": "2026-01-10T18:00:00Z",
      "retryAfter": 1800
    }
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred during AI generation"
  }
}
```

---

## Design Scoring

AI-generated designs are scored 0-100 based on:

- **Workflow Efficiency (25%):** Work triangle optimization, movement paths
- **Storage Capacity (20%):** Available storage vs. household needs
- **Aesthetic Alignment (20%):** Match to selected style preferences
- **Budget Utilization (20%):** Cost-effectiveness and value
- **Sustainability (15%):** Energy efficiency and eco-friendly choices

---

## Code Examples

### cURL

```bash
curl -X POST https://api.kitchenxpert.com/api/v1/ai/design-generation \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "questionnaire": {
      "kitchenDimensions": {"length": 450, "width": 350, "height": 250},
      "style": "modern",
      "budget": 20000,
      "cookingHabits": ["frequent_cooking", "baking"],
      "householdSize": 4,
      "priorities": ["efficiency", "storage"]
    },
    "async": false
  }'
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const generateDesign = async (questionnaire, async = false) => {
  const response = await axios.post(
    'https://api.kitchenxpert.com/api/v1/ai/design-generation',
    {
      questionnaire,
      async
    },
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.data;
};

// Usage
const questionnaire = {
  kitchenDimensions: {length: 450, width: 350, height: 250},
  style: 'modern',
  budget: 20000,
  cookingHabits: ['frequent_cooking', 'baking', 'entertaining'],
  householdSize: 4,
  priorities: ['efficiency', 'storage', 'aesthetics']
};

generateDesign(questionnaire)
  .then(data => {
    console.log('Generated design:', data.design.name);
    console.log('Design score:', data.design.score);
    console.log('Total cost:', data.design.totalCost);
    console.log('Alternatives:', data.alternatives.length);
  });
```

### Python (Requests)

```python
import requests

def generate_design(questionnaire, access_token, async_processing=False):
    url = "https://api.kitchenxpert.com/api/v1/ai/design-generation"

    payload = {
        "questionnaire": questionnaire,
        "async": async_processing
    }

    response = requests.post(
        url,
        json=payload,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    response.raise_for_status()

    return response.json()["data"]

# Usage
questionnaire = {
    "kitchenDimensions": {"length": 450, "width": 350, "height": 250},
    "style": "modern",
    "budget": 20000,
    "cookingHabits": ["frequent_cooking", "baking", "entertaining"],
    "householdSize": 4,
    "priorities": ["efficiency", "storage", "aesthetics"]
}

result = generate_design(questionnaire, "your_access_token")
print(f"Generated design: {result['design']['name']}")
print(f"Design score: {result['design']['score']}")
print(f"Total cost: ${result['design']['totalCost']}")
print(f"Alternatives: {len(result['alternatives'])}")
```

---

## Related Endpoints

- [Save Generated Design](./save-design.md) - Save AI-generated design to user account
- [Get Task Status](./task-status.md) - Check async task status
- [Appliance Recommendation](./appliance-recommendation.md) - Get appliance suggestions

---

## Notes

- **Processing Time:** Synchronous generation takes 3-8 seconds. Use async for complex designs.
- **Alternative Designs:** Always provides 2-3 alternative designs with different budget/feature trade-offs.
- **3D Preview:** Automatically generated 3D model included in response.
- **Customization:** Generated designs can be modified after creation.
- **Save Design:** Use separate endpoint to save generated design to user account.

---

**Last Updated:** 2026-01-10
