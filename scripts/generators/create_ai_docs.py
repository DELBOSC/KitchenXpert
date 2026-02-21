#!/usr/bin/env python3
# Script to create AI endpoint documentation files

import os

# Design Generation Documentation
design_generation = """# AI Design Generation Endpoint

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
curl -X POST https://api.kitchenxpert.com/api/v1/ai/design-generation \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
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
"""

# Appliance Recommendation Documentation
appliance_recommendation = """# Appliance Recommendation Endpoint

## Overview

Get AI-powered appliance recommendations based on kitchen information, cooking habits, and budget with scored recommendations and detailed analysis.

**Endpoint:** `POST /api/v1/ai/appliance-recommendation`

**Authentication Required:** Yes

**Rate Limiting:** 10 requests per hour per user

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
| `kitchenInfo` | object | Yes | Kitchen information | - |
| `kitchenInfo.dimensions` | object | Yes | Kitchen dimensions in cm | - |
| `kitchenInfo.dimensions.length` | number | Yes | Length in cm | 100-1000 |
| `kitchenInfo.dimensions.width` | number | Yes | Width in cm | 100-1000 |
| `kitchenInfo.style` | string | No | Design style | modern, traditional, minimalist, rustic, industrial, scandinavian |
| `kitchenInfo.existingAppliances` | array | No | Existing appliances | Array of product IDs |
| `cookingHabits` | object | Yes | Cooking preferences | - |
| `cookingHabits.frequency` | string | Yes | Cooking frequency | rarely, occasionally, frequently, daily |
| `cookingHabits.techniques` | array | Yes | Cooking techniques used | baking, grilling, steaming, frying, slow_cooking, pressure_cooking |
| `cookingHabits.householdSize` | number | Yes | Number of people | 1-20 |
| `budget` | object | Yes | Budget constraints | - |
| `budget.min` | number | No | Minimum budget USD | >= 0 |
| `budget.max` | number | Yes | Maximum budget USD | > min |
| `budget.flexible` | boolean | No | Budget flexibility | Default: false |
| `priorities` | array | Yes | Recommendation priorities | energy_efficiency, performance, brand, aesthetics, warranty, smart_features |

### Request Body Example

```json
{
  "kitchenInfo": {
    "dimensions": {
      "length": 450,
      "width": 350
    },
    "style": "modern",
    "existingAppliances": []
  },
  "cookingHabits": {
    "frequency": "frequently",
    "techniques": ["baking", "steaming", "grilling"],
    "householdSize": 4
  },
  "budget": {
    "min": 1000,
    "max": 5000,
    "flexible": true
  },
  "priorities": ["energy_efficiency", "performance", "warranty"]
}
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "productId": "prod_5h7g6f4d3s2a1z",
        "name": "SmartCool Pro Refrigerator",
        "brand": "Bosch",
        "category": "refrigerator",
        "price": 1299.99,
        "score": 95,
        "matchReasons": [
          "Excellent energy efficiency (A+++) matches your top priority",
          "Optimal capacity (450L) for household of 4",
          "Modern design aligns with your kitchen style",
          "5-year warranty provides excellent coverage"
        ],
        "pros": [
          "Top energy rating saves $200/year on electricity",
          "Advanced AI temperature control",
          "WiFi connectivity for smart home integration",
          "No-Frost technology reduces maintenance"
        ],
        "cons": [
          "Higher initial cost compared to basic models",
          "Requires smart home setup for full features",
          "Slightly larger footprint (60cm width)"
        ],
        "energyClass": "A+++",
        "specifications": {
          "capacity": "450L",
          "annualConsumption": "180kWh",
          "noiseLevel": "38dB",
          "warranty": "5 years"
        },
        "imageUrl": "https://cdn.kitchenxpert.com/products/prod_5h7g6f4d3s2a1z/main.jpg"
      },
      {
        "productId": "prod_8j9k0l1m2n3o4p",
        "name": "MultiChef Pro Oven",
        "brand": "Miele",
        "category": "oven",
        "price": 2199.99,
        "score": 92,
        "matchReasons": [
          "Excellent for baking (matches your cooking technique)",
          "Steam function perfect for healthy cooking",
          "Premium warranty (5 years) aligns with priority",
          "High performance rating for frequent use"
        ],
        "pros": [
          "12 cooking functions including steam baking",
          "Precise temperature control (+/- 1°C)",
          "Self-cleaning pyrolytic function",
          "Large 76L capacity"
        ],
        "cons": [
          "Premium price point",
          "Requires 220V connection",
          "Professional installation recommended"
        ],
        "energyClass": "A++",
        "specifications": {
          "capacity": "76L",
          "functions": 12,
          "maxTemperature": "300°C",
          "warranty": "5 years"
        },
        "imageUrl": "https://cdn.kitchenxpert.com/products/prod_8j9k0l1m2n3o4p/main.jpg"
      },
      {
        "productId": "prod_3a2b1c0d9e8f",
        "name": "SteamMaster Cooktop",
        "brand": "Samsung",
        "category": "cooktop",
        "price": 899.99,
        "score": 88,
        "matchReasons": [
          "Induction technology highly energy efficient",
          "Flexible cooking zones for grilling technique",
          "Fits within budget constraints",
          "Modern aesthetic matches kitchen style"
        ],
        "pros": [
          "Fast heating with induction technology",
          "Easy to clean glass surface",
          "Flexible zone configuration",
          "Child safety lock included"
        ],
        "cons": [
          "Requires induction-compatible cookware",
          "Moderate warranty (2 years)",
          "No built-in ventilation"
        ],
        "energyClass": "A+",
        "specifications": {
          "zones": 4,
          "maxPower": "7400W",
          "warranty": "2 years"
        },
        "imageUrl": "https://cdn.kitchenxpert.com/products/prod_3a2b1c0d9e8f/main.jpg"
      }
    ],
    "totalEstimatedCost": 4399.97,
    "budgetUtilization": 87.99,
    "alternativeCategories": [
      {
        "category": "dishwasher",
        "recommended": true,
        "reason": "Highly recommended for household of 4 to save time and water",
        "estimatedCost": 800,
        "topPick": {
          "productId": "prod_7g6f5d4s3a2z",
          "name": "EcoClean Dishwasher",
          "price": 799.99
        }
      },
      {
        "category": "microwave",
        "recommended": false,
        "reason": "Optional for your cooking habits, but adds convenience",
        "estimatedCost": 300
      }
    ],
    "savingsAnalysis": {
      "estimatedAnnualEnergySavings": 420,
      "paybackPeriod": 3.1,
      "lifetimeSavings": 4200
    }
  },
  "meta": {
    "timestamp": "2026-01-10T18:00:00Z",
    "requestId": "req_1z2y3x4w5v6u",
    "processingTime": 2.8
  }
}
```

---

## Error Responses

### 400 Bad Request - Invalid Input

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid request data",
    "details": [
      {
        "field": "budget.max",
        "message": "Maximum budget is required",
        "code": "MISSING_FIELD"
      },
      {
        "field": "cookingHabits.frequency",
        "message": "Must be one of: rarely, occasionally, frequently, daily",
        "value": "sometimes"
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

### 422 Unprocessable Entity - No Recommendations

```json
{
  "success": false,
  "error": {
    "code": "NO_RECOMMENDATIONS",
    "message": "No recommendations available for given criteria",
    "details": {
      "reason": "Budget constraints too restrictive for quality appliances matching priorities",
      "suggestion": "Increase budget to at least $2000 or adjust priorities",
      "minimumBudget": 2000
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
    "message": "Recommendation limit reached for this hour",
    "details": {
      "limit": 10,
      "resetAt": "2026-01-10T19:00:00Z",
      "retryAfter": 3600
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
    "message": "An unexpected error occurred during recommendation generation"
  }
}
```

---

## Scoring System

Recommendations are scored 0-100 based on weighted criteria:

- **Priority Alignment (40%):** How well the product matches user's stated priorities
- **Budget Fit (20%):** Value for money and price within budget
- **Feature Match (20%):** Compatibility with cooking habits and techniques
- **Energy Efficiency (10%):** Energy rating and operational costs
- **User Reviews (10%):** Average customer rating and review count

### Score Ranges

- **90-100:** Excellent match, highly recommended
- **80-89:** Very good match, strong consideration
- **70-79:** Good match, suitable option
- **60-69:** Acceptable match, may require compromises
- **Below 60:** Not recommended for your needs

---

## Code Examples

### cURL

```bash
curl -X POST https://api.kitchenxpert.com/api/v1/ai/appliance-recommendation \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "kitchenInfo": {
      "dimensions": {"length": 450, "width": 350},
      "style": "modern"
    },
    "cookingHabits": {
      "frequency": "frequently",
      "techniques": ["baking", "steaming"],
      "householdSize": 4
    },
    "budget": {
      "max": 5000,
      "flexible": true
    },
    "priorities": ["energy_efficiency", "performance"]
  }'
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const getRecommendations = async (criteria) => {
  const response = await axios.post(
    'https://api.kitchenxpert.com/api/v1/ai/appliance-recommendation',
    criteria,
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
const criteria = {
  kitchenInfo: {
    dimensions: {length: 450, width: 350},
    style: 'modern',
    existingAppliances: []
  },
  cookingHabits: {
    frequency: 'frequently',
    techniques: ['baking', 'steaming', 'grilling'],
    householdSize: 4
  },
  budget: {
    min: 1000,
    max: 5000,
    flexible: true
  },
  priorities: ['energy_efficiency', 'performance', 'warranty']
};

getRecommendations(criteria)
  .then(data => {
    console.log(`Found ${data.recommendations.length} recommendations`);
    console.log(`Total cost: $${data.totalEstimatedCost}`);
    console.log(`Budget utilization: ${data.budgetUtilization}%`);

    data.recommendations.forEach(rec => {
      console.log(`\n${rec.name} (Score: ${rec.score})`);
      console.log(`Price: $${rec.price}`);
      console.log('Match reasons:', rec.matchReasons.join(', '));
    });
  });
```

### Python (Requests)

```python
import requests

def get_appliance_recommendations(criteria, access_token):
    url = "https://api.kitchenxpert.com/api/v1/ai/appliance-recommendation"

    response = requests.post(
        url,
        json=criteria,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    response.raise_for_status()

    return response.json()["data"]

# Usage
criteria = {
    "kitchenInfo": {
        "dimensions": {"length": 450, "width": 350},
        "style": "modern",
        "existingAppliances": []
    },
    "cookingHabits": {
        "frequency": "frequently",
        "techniques": ["baking", "steaming", "grilling"],
        "householdSize": 4
    },
    "budget": {
        "min": 1000,
        "max": 5000,
        "flexible": True
    },
    "priorities": ["energy_efficiency", "performance", "warranty"]
}

result = get_appliance_recommendations(criteria, "your_access_token")

print(f"Found {len(result['recommendations'])} recommendations")
print(f"Total cost: ${result['totalEstimatedCost']}")
print(f"Budget utilization: {result['budgetUtilization']}%")

for rec in result['recommendations']:
    print(f"\n{rec['name']} (Score: {rec['score']})")
    print(f"Price: ${rec['price']}")
    print(f"Energy Class: {rec['energyClass']}")
    print(f"Match reasons: {', '.join(rec['matchReasons'])}")
```

---

## Related Endpoints

- [Product Details](../catalog/product-details.md) - Get detailed product information
- [Design Generation](./design-generation.md) - Generate complete kitchen design
- [Compatibility Check](./compatibility-check.md) - Check appliance compatibility

---

## Notes

- **Personalized Recommendations:** Results tailored to your specific cooking habits and preferences
- **Budget Flexibility:** Setting `flexible: true` may show items slightly above budget if they offer significant value
- **Energy Savings:** Includes analysis of long-term savings from energy-efficient appliances
- **Alternative Categories:** Suggests additional appliance categories you might not have considered
- **Real-time Pricing:** Prices and availability updated hourly

---

**Last Updated:** 2026-01-10
"""

# Write AI endpoint documentation files
with open('docs/api/endpoints/ai/design-generation.md', 'w', encoding='utf-8') as f:
    f.write(design_generation)
print("Created: design-generation.md")

with open('docs/api/endpoints/ai/appliance-recommendation.md', 'w', encoding='utf-8') as f:
    f.write(appliance_recommendation)
print("Created: appliance-recommendation.md")

print("\nAll API endpoint documentation files created successfully!")
print("\nSummary:")
print("  - docs/api/endpoints/ai/design-generation.md")
print("  - docs/api/endpoints/ai/appliance-recommendation.md")
