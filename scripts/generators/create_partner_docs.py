#!/usr/bin/env python3
"""
Script to create all Partner documentation files for KitchenXpert
"""

import os

# Ensure we're in the right directory
os.chdir('c:/Users/AA/KitchenXpertProject')

files = {}

# File 3: API Integration Guide
files['docs/partner/onboarding/api-integration.md'] = '''# Partner API Integration Guide

**Last Updated:** 2026-01-10

Complete guide to integrating with the KitchenXpert Partner API for automated catalog management, analytics, and order processing.

## Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Core Endpoints](#core-endpoints)
4. [Webhook Events](#webhook-events)
5. [Rate Limits](#rate-limits)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Pagination and Filtering](#pagination-and-filtering)
9. [Testing in Sandbox](#testing-in-sandbox)

---

## Authentication

### OAuth 2.0 Client Credentials Flow

The KitchenXpert Partner API uses OAuth 2.0 for authentication.

**Step 1: Obtain Access Token**

```bash
curl -X POST https://api.kitchenxpert.com/partners/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "catalog:read catalog:write analytics:read"
}
```

**Step 2: Use Access Token**

Include the access token in the Authorization header for all API requests.

### API Scopes

- `catalog:read` - Read product catalog
- `catalog:write` - Upload and modify products
- `analytics:read` - Access analytics data
- `orders:read` - View order information
- `webhooks:manage` - Configure webhooks

---

## Base URLs

### Production
```
https://api.kitchenxpert.com/partners/v1
```

### Sandbox (Testing)
```
https://sandbox-api.kitchenxpert.com/partners/v1
```

**Always test in sandbox first before using production API.**

---

## Core Endpoints

### POST /auth/token
**Get Access Token**

Authenticate and receive an access token for API requests.

### POST /catalog/upload
**Bulk Upload Products**

Upload multiple products at once (recommended for initial catalog setup).

**Request Example:**
```json
{
  "products": [
    {
      "id": "CAB-001",
      "name": "Modern Base Cabinet",
      "category": "cabinet",
      "price": 299.99,
      "currency": "EUR",
      "dimensions": {"width": 60, "height": 72, "depth": 58, "unit": "cm"},
      "brand": "YourBrand",
      "model": "MB-60"
    }
  ]
}
```

### POST /catalog/products
**Create Single Product**

Create or add a single product to your catalog.

### PUT /catalog/products/{id}
**Update Existing Product**

Update product information (price, stock, etc.).

### DELETE /catalog/products/{id}
**Remove Product**

Remove a product from your catalog (soft delete - can be restored).

### GET /catalog/products
**List All Products**

Retrieve your product catalog with pagination and filtering.

### GET /catalog/sync-status
**Check Sync Status**

Check the status of bulk uploads and catalog synchronization.

### GET /analytics
**Performance Metrics**

Access product performance analytics.

### POST /webhooks/register
**Register Webhook**

Register a webhook endpoint to receive real-time notifications.

---

## Webhook Events

### Available Events

**order.created** - Triggered when a user creates an order containing your products

**order.updated** - Order status changed (paid, shipped, completed, cancelled)

**inventory.low** - Product stock falls below threshold (default: 10 units)

**product.viewed** - User views your product page (aggregated hourly)

**product.added_to_design** - User adds your product to a kitchen design

**design.completed** - User saves/completes a design with your products

### Webhook Payload Example

```json
{
  "event": "order.created",
  "timestamp": "2026-01-10T14:30:00Z",
  "webhook_id": "wh_abc123",
  "data": {
    "order_id": "ORD-12345",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "items": [
      {
        "product_id": "CAB-001",
        "quantity": 2,
        "price": 299.99
      }
    ],
    "total": 599.98,
    "currency": "EUR"
  }
}
```

---

## Rate Limits

### By Tier

**Basic:** 100 requests/hour
**Pro:** 1,000 requests/hour
**Enterprise:** Unlimited

### Rate Limit Response

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Retry after 60 seconds.",
  "retry_after": 60
}
```

**HTTP Status:** 429 Too Many Requests

---

## Error Handling

### Standard Error Format

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  },
  "request_id": "req_abc123"
}
```

### Common Error Codes

**Authentication Errors:**
- `invalid_credentials` (401) - Invalid API key or secret
- `token_expired` (401) - Access token has expired
- `insufficient_scope` (403) - Missing required scope

**Validation Errors:**
- `validation_error` (400) - Invalid request data
- `missing_required_field` (400) - Required field missing
- `invalid_format` (400) - Data format incorrect

**Resource Errors:**
- `not_found` (404) - Resource doesn't exist
- `duplicate` (409) - Resource already exists

**Server Errors:**
- `internal_error` (500) - Server error
- `service_unavailable` (503) - Temporary outage

---

## Code Examples

### JavaScript (Node.js)

```javascript
const axios = require('axios');

class KitchenXpertAPI {
  constructor(clientId, clientSecret, baseURL = 'https://api.kitchenxpert.com/partners/v1') {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseURL = baseURL;
    this.accessToken = null;
  }

  async authenticate() {
    const response = await axios.post(`${this.baseURL}/auth/token`, {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    this.accessToken = response.data.access_token;
    return this.accessToken;
  }

  async createProduct(product) {
    if (!this.accessToken) await this.authenticate();

    const response = await axios.post(
      `${this.baseURL}/catalog/products`,
      product,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );

    return response.data;
  }
}

// Usage
const api = new KitchenXpertAPI('pk_live_abc123', 'sk_live_def456');
await api.createProduct({
  id: 'CAB-001',
  name: 'Modern Base Cabinet',
  category: 'cabinet',
  price: 299.99,
  currency: 'EUR',
  dimensions: { width: 60, height: 72, depth: 58, unit: 'cm' },
  brand: 'YourBrand',
  model: 'MB-60'
});
```

### Python

```python
import requests

class KitchenXpertAPI:
    def __init__(self, client_id, client_secret, base_url='https://api.kitchenxpert.com/partners/v1'):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url
        self.access_token = None

    def authenticate(self):
        response = requests.post(f'{self.base_url}/auth/token', json={
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret
        })
        response.raise_for_status()

        self.access_token = response.json()['access_token']
        return self.access_token

    def _headers(self):
        if not self.access_token:
            self.authenticate()
        return {'Authorization': f'Bearer {self.access_token}'}

    def create_product(self, product):
        response = requests.post(
            f'{self.base_url}/catalog/products',
            headers=self._headers(),
            json=product
        )
        response.raise_for_status()
        return response.json()

# Usage
api = KitchenXpertAPI('pk_live_abc123', 'sk_live_def456')
result = api.create_product({
    'id': 'CAB-001',
    'name': 'Modern Base Cabinet',
    'category': 'cabinet',
    'price': 299.99,
    'currency': 'EUR',
    'dimensions': {'width': 60, 'height': 72, 'depth': 58, 'unit': 'cm'},
    'brand': 'YourBrand',
    'model': 'MB-60'
})
```

### PHP

```php
<?php

class KitchenXpertAPI {
    private $clientId;
    private $clientSecret;
    private $baseURL;
    private $accessToken;

    public function __construct($clientId, $clientSecret,
                               $baseURL = 'https://api.kitchenxpert.com/partners/v1') {
        $this->clientId = $clientId;
        $this->clientSecret = $clientSecret;
        $this->baseURL = $baseURL;
    }

    public function authenticate() {
        $ch = curl_init("$this->baseURL/auth/token");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'grant_type' => 'client_credentials',
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret
        ]));

        $response = curl_exec($ch);
        curl_close($ch);

        $data = json_decode($response, true);
        $this->accessToken = $data['access_token'];

        return $this->accessToken;
    }

    public function createProduct($product) {
        if (!$this->accessToken) {
            $this->authenticate();
        }

        $ch = curl_init("$this->baseURL/catalog/products");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            "Authorization: Bearer $this->accessToken"
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($product));

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }
}

// Usage
$api = new KitchenXpertAPI('pk_live_abc123', 'sk_live_def456');
$result = $api->createProduct([
    'id' => 'CAB-001',
    'name' => 'Modern Base Cabinet',
    'category' => 'cabinet',
    'price' => 299.99,
    'currency' => 'EUR',
    'dimensions' => ['width' => 60, 'height' => 72, 'depth' => 58, 'unit' => 'cm'],
    'brand' => 'YourBrand',
    'model' => 'MB-60'
]);
?>
```

### cURL

```bash
# Get access token
TOKEN=$(curl -X POST https://api.kitchenxpert.com/partners/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "pk_live_abc123",
    "client_secret": "sk_live_def456"
  }' | jq -r '.access_token')

# Create product
curl -X POST https://api.kitchenxpert.com/partners/v1/catalog/products \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "CAB-001",
    "name": "Modern Base Cabinet",
    "category": "cabinet",
    "price": 299.99,
    "currency": "EUR",
    "dimensions": {"width": 60, "height": 72, "depth": 58, "unit": "cm"},
    "brand": "YourBrand",
    "model": "MB-60"
  }'
```

---

## Pagination and Filtering

### Pagination

Large result sets are paginated. Default page size is 50, maximum is 100.

**Request:**
```bash
GET /catalog/products?page=2&limit=100
```

**Response includes pagination metadata:**
```json
{
  "products": [...],
  "pagination": {
    "total": 250,
    "page": 2,
    "per_page": 100,
    "pages": 3,
    "has_more": true
  }
}
```

### Filtering

Filter results by multiple criteria:

```bash
GET /catalog/products?category=cabinet&status=active&min_price=100&max_price=500
```

**Available Filters:**
- `category` - Product category
- `status` - active, inactive, deleted
- `min_price` / `max_price` - Price range
- `brand` - Filter by brand
- `search` - Text search in name/description
- `has_3d_model` - true/false
- `in_stock` - true/false

---

## Testing in Sandbox

### Sandbox Environment

Always test in sandbox before production:

**Sandbox URL:**
```
https://sandbox-api.kitchenxpert.com/partners/v1
```

**Features:**
- Identical API to production
- Test data included
- No real transactions
- Unlimited rate limits
- Reset on-demand

### Test Credentials

Generate sandbox credentials in Partner Portal:
- Prefix: `pk_test_` and `sk_test_`

### Test Data

Sandbox includes:
- 50+ sample products
- Test user accounts
- Sample kitchen designs
- Simulated orders

---

## API Support

**Developer Support:**
- Email: developers@kitchenxpert.com
- Response Time: 24 hours (Pro), 8 hours (Enterprise)
- Documentation: docs.kitchenxpert.com/partners/api

**Interactive API Explorer:**
- api-explorer.kitchenxpert.com

**Postman Collection:**
- Download from partner portal

---

*Last Updated: 2026-01-10*
'''

# Write all files
for filepath, content in files.items():
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Created: {filepath}')

print('Onboarding files completed!')
