# Kitchen Designs Endpoint

## Overview

Create and submit kitchen design configurations with dimensions, budget, and
component specifications using a 3D coordinate system.

**Endpoint:** `POST /api/v1/kitchen/designs`

**Authentication Required:** Yes

**Rate Limiting:** 20 requests per hour per user

---

## Request

### Headers

```
Authorization: Bearer <access-token>
Content-Type: application/json
```

### Request Body Schema

| Field                     | Type   | Required | Description                 | Constraints                                                        |
| ------------------------- | ------ | -------- | --------------------------- | ------------------------------------------------------------------ |
| `name`                    | string | Yes      | Design name                 | Max 100 characters                                                 |
| `dimensions`              | object | Yes      | Kitchen dimensions in cm    | -                                                                  |
| `dimensions.length`       | number | Yes      | Length in cm                | 100-1000                                                           |
| `dimensions.width`        | number | Yes      | Width in cm                 | 100-1000                                                           |
| `dimensions.height`       | number | Yes      | Height in cm                | 200-350                                                            |
| `budget`                  | number | Yes      | Total budget in USD         | Min 1000                                                           |
| `components`              | array  | Yes      | Array of kitchen components | -                                                                  |
| `components[].type`       | string | Yes      | Component type              | refrigerator, oven, dishwasher, sink, cabinet, countertop, cooktop |
| `components[].productId`  | string | Yes      | Product catalog ID          | Must exist in catalog                                              |
| `components[].position`   | object | Yes      | 3D coordinates in cm        | -                                                                  |
| `components[].position.x` | number | Yes      | X coordinate                | Within kitchen length                                              |
| `components[].position.y` | number | Yes      | Y coordinate                | Within kitchen width                                               |
| `components[].position.z` | number | Yes      | Z coordinate (height)       | Within kitchen height                                              |
| `components[].rotation`   | number | No       | Rotation in degrees         | 0-360, Default: 0                                                  |

### Request Body Example

```json
{
  "name": "Modern Minimalist Kitchen",
  "dimensions": {
    "length": 450,
    "width": 350,
    "height": 250
  },
  "budget": 15000,
  "components": [
    {
      "type": "refrigerator",
      "productId": "prod_5h7g6f4d3s2a1z",
      "position": { "x": 0, "y": 0, "z": 0 },
      "rotation": 0
    },
    {
      "type": "oven",
      "productId": "prod_8j9k0l1m2n3o4p",
      "position": { "x": 150, "y": 0, "z": 0 },
      "rotation": 0
    },
    {
      "type": "sink",
      "productId": "prod_3a2b1c0d9e8f",
      "position": { "x": 300, "y": 0, "z": 90 },
      "rotation": 0
    }
  ]
}
```

### Validation Rules

- **Dimensions:**
  - Must create realistic kitchen proportions
  - Height typically 200-350cm for ceiling clearance
  - Minimum area: 3 square meters

- **Budget:**
  - Must be at least 1000 USD
  - Cannot exceed 1,000,000 USD

- **Components:**
  - No overlapping positions (collision detection)
  - Components must fit within kitchen dimensions
  - Product IDs must exist in catalog
  - Maximum 50 components per design

- **3D Coordinate System:**
  - Origin (0,0,0) at bottom-left corner of kitchen floor
  - X-axis: Length dimension
  - Y-axis: Width dimension
  - Z-axis: Height dimension

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "design": {
      "id": "design_9a8b7c6d5e4f3g2h",
      "name": "Modern Minimalist Kitchen",
      "userId": "usr_7k8j9h2g3f4d5s6a",
      "dimensions": {
        "length": 450,
        "width": 350,
        "height": 250,
        "unit": "cm",
        "area": 15.75
      },
      "budget": 15000,
      "totalCost": 12450.5,
      "remainingBudget": 2549.5,
      "componentsCount": 3,
      "status": "draft",
      "createdAt": "2026-01-10T17:00:00Z",
      "updatedAt": "2026-01-10T17:00:00Z",
      "shareUrl": "https://kitchenxpert.com/designs/design_9a8b7c6d5e4f3g2h",
      "preview3DUrl": "https://cdn.kitchenxpert.com/designs/design_9a8b7c6d5e4f3g2h/preview.glb"
    },
    "validation": {
      "passedAllChecks": true,
      "warnings": [],
      "suggestions": [
        "Consider adding a dishwasher for household of 4",
        "Work triangle could be optimized by repositioning sink"
      ]
    }
  },
  "meta": {
    "timestamp": "2026-01-10T17:00:00Z",
    "requestId": "req_5d4c3b2a1z0y9x8w"
  }
}
```

---

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid design data",
    "details": [
      {
        "field": "dimensions.length",
        "message": "Length must be between 100 and 1000 cm",
        "value": 50
      },
      {
        "field": "budget",
        "message": "Budget must be at least 1000 USD",
        "value": 500
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

### 404 Not Found - Product Not Found

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "One or more products not found in catalog",
    "details": {
      "invalidProductIds": ["prod_invalid123"]
    }
  }
}
```

### 422 Unprocessable Entity - Component Collision

```json
{
  "success": false,
  "error": {
    "code": "COMPONENT_COLLISION",
    "message": "Component placement collision detected",
    "details": {
      "conflictingComponents": [
        {
          "id": "comp_1",
          "type": "refrigerator",
          "position": { "x": 0, "y": 0, "z": 0 }
        },
        {
          "id": "comp_2",
          "type": "oven",
          "position": { "x": 10, "y": 0, "z": 0 }
        }
      ],
      "suggestion": "Move components at least 60cm apart"
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
    "message": "Too many design creation requests",
    "details": { "limit": 20, "retryAfter": 3600 }
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## 3D Coordinate System

### Coordinate Reference

```
       Z (height)
       |
       |    Y (width)
       |   /
       |  /
       | /
       |/_____ X (length)
      O
```

### Positioning Guidelines

- **Floor Level:** Z = 0
- **Counter Height:** Z = 85-95cm
- **Wall Cabinets:** Z = 140-200cm
- **Standard Appliance Depth:** 60cm
- **Work Triangle:** Keep sink, stove, refrigerator within 4-7 meters total

---

## Code Examples

### cURL

```bash
curl -X POST https://api.kitchenxpert.com/api/v1/kitchen/designs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Modern Kitchen",
    "dimensions": {"length": 450, "width": 350, "height": 250},
    "budget": 15000,
    "components": [
      {
        "type": "refrigerator",
        "productId": "prod_5h7g6f4d3s2a1z",
        "position": {"x": 0, "y": 0, "z": 0}
      }
    ]
  }'
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const createDesign = async (designData) => {
  const response = await axios.post(
    'https://api.kitchenxpert.com/api/v1/kitchen/designs',
    designData,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.data;
};

// Usage
const design = {
  name: 'Modern Minimalist Kitchen',
  dimensions: { length: 450, width: 350, height: 250 },
  budget: 15000,
  components: [
    {
      type: 'refrigerator',
      productId: 'prod_5h7g6f4d3s2a1z',
      position: { x: 0, y: 0, z: 0 },
    },
  ],
};

createDesign(design).then((data) => {
  console.log('Design created:', data.design.id);
  console.log('Total cost:', data.design.totalCost);
});
```

### Python (Requests)

```python
import requests

def create_design(design_data, access_token):
    url = "https://api.kitchenxpert.com/api/v1/kitchen/designs"

    response = requests.post(
        url,
        json=design_data,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    response.raise_for_status()

    return response.json()["data"]

# Usage
design = {
    "name": "Modern Minimalist Kitchen",
    "dimensions": {"length": 450, "width": 350, "height": 250},
    "budget": 15000,
    "components": [
        {
            "type": "refrigerator",
            "productId": "prod_5h7g6f4d3s2a1z",
            "position": {"x": 0, "y": 0, "z": 0}
        }
    ]
}

result = create_design(design, "your_access_token")
print(f"Design created: {result['design']['id']}")
print(f"Total cost: ${result['design']['totalCost']}")
```

---

## Related Endpoints

- [Get Design](./get-design.md) - Retrieve existing design
- [Update Design](./update-design.md) - Modify existing design
- [Delete Design](./delete-design.md) - Remove design
- [Validate Design](./kitchen-validation.md) - Validate design without saving

---

## Notes

- **Draft Status:** Newly created designs are saved as "draft" and can be edited
- **3D Preview:** Automatically generated 3D model available via preview3DUrl
- **Collision Detection:** Automatic validation prevents overlapping components
- **Budget Tracking:** System calculates total cost based on selected products
- **Share URL:** Each design gets a unique shareable URL

---

**Last Updated:** 2026-01-10
