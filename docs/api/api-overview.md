# KitchenXpert API Overview

## Table of Contents

- [Introduction](#introduction)
- [Base URLs](#base-urls)
- [RESTful Architecture](#restful-architecture)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Versioning Strategy](#versioning-strategy)
- [Request/Response Patterns](#requestresponse-patterns)
- [Error Handling](#error-handling)
- [Pagination](#pagination)
- [Filtering and Sorting](#filtering-and-sorting)
- [Field Selection](#field-selection)
- [Response Compression](#response-compression)
- [Webhooks](#webhooks)
- [SDKs and Client Libraries](#sdks-and-client-libraries)
- [Resources](#resources)

## Introduction

The KitchenXpert API is a comprehensive RESTful API that enables developers to integrate kitchen design, product catalog, AI-powered recommendations, and order management capabilities into their applications. Built on modern web standards, the API provides consistent, predictable interfaces for all operations.

**Key Features:**
- AI-powered kitchen design generation
- Extensive product catalog (100,000+ products)
- 3D kitchen visualization and collaboration
- Appliance recommendations
- Real-time design validation
- Partner integration capabilities
- Comprehensive analytics

## Base URLs

### Production
```
https://api.kitchenxpert.com/v1
```

### Development/Staging
```
http://localhost:4000/api/v1
```

### Sandbox (Testing)
```
https://sandbox-api.kitchenxpert.com/v1
```

All API requests must use HTTPS in production. HTTP requests will be automatically redirected to HTTPS.

## RESTful Architecture

The KitchenXpert API follows REST principles:

- **Resources** are represented as nouns (e.g., `/designs`, `/products`, `/users`)
- **HTTP methods** indicate actions:
  - `GET` - Retrieve resources
  - `POST` - Create new resources
  - `PUT` - Replace resources entirely
  - `PATCH` - Partially update resources
  - `DELETE` - Remove resources
- **Stateless** - Each request contains all necessary information
- **HATEOAS** - Responses include links to related resources

### Resource Naming Conventions

- Use plural nouns for collections: `/api/v1/products`
- Use singular for single resource: `/api/v1/products/{id}`
- Nested resources: `/api/v1/designs/{id}/components`
- Actions on resources: `/api/v1/designs/{id}/validate`

## Authentication

KitchenXpert API supports multiple authentication methods:

### JWT Bearer Tokens (Recommended)

After successful login, include the access token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Lifetimes:**
- Access Token: 15 minutes
- Refresh Token: 7 days

### OAuth2

Supported OAuth2 providers:
- Google
- GitHub
- Microsoft

**OAuth2 Flow:**

```bash
# Step 1: Redirect user to authorization URL
GET https://api.kitchenxpert.com/v1/auth/oauth/google

# Step 2: Handle callback with authorization code
GET https://yourapp.com/callback?code=AUTH_CODE

# Step 3: Exchange code for tokens
POST https://api.kitchenxpert.com/v1/auth/oauth/token
Content-Type: application/json

{
  "code": "AUTH_CODE",
  "provider": "google"
}
```

### API Keys (Partner Integration)

For server-to-server communication:

```http
X-API-Key: kx_live_1234567890abcdef
```

**Example Request:**

```bash
curl -X GET "https://api.kitchenxpert.com/v1/catalog/products" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

```javascript
// JavaScript (axios)
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.kitchenxpert.com/v1',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const response = await api.get('/catalog/products');
```

```python
# Python (requests)
import requests

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://api.kitchenxpert.com/v1/catalog/products',
    headers=headers
)
```

## Rate Limiting

Rate limits are enforced per user and per API key to ensure fair usage and system stability.

### Rate Limit Tiers

| Tier | Requests/Hour | Requests/Minute | Burst Limit |
|------|---------------|-----------------|-------------|
| **Free** | 100 | 10 | 20 |
| **Basic** | 1,000 | 50 | 100 |
| **Pro** | 10,000 | 500 | 1,000 |
| **Enterprise** | Unlimited | Custom | Custom |

### Rate Limit Headers

Every API response includes rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704908400
X-RateLimit-Retry-After: 60
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "resetAt": "2026-01-10T12:00:00Z"
    }
  }
}
```

### Endpoint-Specific Rate Limits

Certain endpoints have additional restrictions:

- `/auth/login` - 5 requests/minute
- `/auth/register` - 3 requests/hour
- `/ai/design-generation` - 10 requests/hour (Free), 100/hour (Pro)
- `/catalog/search` - 50 requests/minute

## Versioning Strategy

KitchenXpert API uses URL-based versioning for major versions:

```
https://api.kitchenxpert.com/v1/...
https://api.kitchenxpert.com/v2/...
```

### Version Support Policy

- Current version: **v1** (stable)
- Each major version supported for 24 months after deprecation announcement
- Breaking changes only in major versions
- New features added to current version
- Bug fixes backported to supported versions

### API Version Header

Optionally specify version via header:

```http
Accept: application/vnd.kitchenxpert.v1+json
```

## Request/Response Patterns

### Standard Request Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
X-Request-ID: {unique-id}
Accept-Encoding: gzip, br
```

### Standard Response Format

**Success Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "design",
    "attributes": {
      "name": "Modern Kitchen",
      "createdAt": "2026-01-10T10:30:00Z"
    }
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-01-10T10:30:00Z"
  }
}
```

**Collection Response:**

```json
{
  "data": [
    {
      "id": "1",
      "type": "product",
      "attributes": { ... }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1000,
      "totalPages": 50
    }
  },
  "links": {
    "self": "/api/v1/products?page=1",
    "next": "/api/v1/products?page=2",
    "last": "/api/v1/products?page=50"
  }
}
```

## Error Handling

### Standard Error Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for one or more fields",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "INVALID_EMAIL"
      }
    ],
    "requestId": "req_abc123",
    "timestamp": "2026-01-10T10:30:00Z",
    "documentation": "https://docs.kitchenxpert.com/errors/validation-error"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **200** | OK | Successful GET, PUT, PATCH |
| **201** | Created | Successful POST |
| **204** | No Content | Successful DELETE |
| **400** | Bad Request | Invalid request format/parameters |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Resource already exists |
| **422** | Unprocessable Entity | Validation error |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side error |
| **503** | Service Unavailable | Temporary outage |

### Error Codes

Common error codes:

- `AUTHENTICATION_REQUIRED` - Missing authentication
- `INVALID_TOKEN` - Malformed or expired token
- `INSUFFICIENT_PERMISSIONS` - Unauthorized action
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `VALIDATION_ERROR` - Input validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `DUPLICATE_RESOURCE` - Resource already exists
- `INTERNAL_ERROR` - Unexpected server error

## Pagination

### Offset-Based Pagination

Default pagination method:

```http
GET /api/v1/products?page=2&limit=20
```

**Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Items per page

**Response:**

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 1000,
      "totalPages": 50,
      "hasNext": true,
      "hasPrev": true
    }
  },
  "links": {
    "first": "/api/v1/products?page=1&limit=20",
    "prev": "/api/v1/products?page=1&limit=20",
    "self": "/api/v1/products?page=2&limit=20",
    "next": "/api/v1/products?page=3&limit=20",
    "last": "/api/v1/products?page=50&limit=20"
  }
}
```

### Cursor-Based Pagination

For real-time data and large datasets:

```http
GET /api/v1/designs?cursor=eyJpZCI6MTIzLCJ0cyI6MTYwNDkwODQwMH0&limit=20
```

**Response:**

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "cursor": "eyJpZCI6MTQzLCJ0cyI6MTYwNDkwODQwMH0",
      "hasNext": true,
      "limit": 20
    }
  },
  "links": {
    "next": "/api/v1/designs?cursor=eyJpZCI6MTQzLCJ0cyI6MTYwNDkwODQwMH0&limit=20"
  }
}
```

## Filtering and Sorting

### Filtering

Use query parameters for filtering:

```http
GET /api/v1/products?category=cabinet&brand=IKEA&minPrice=100&maxPrice=500
```

**Complex Filters:**

```http
GET /api/v1/products?filter[category][in]=cabinet,worktop&filter[price][gte]=100
```

**Supported Operators:**
- `eq` - Equal to
- `ne` - Not equal to
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `in` - In array
- `nin` - Not in array
- `contains` - String contains
- `startswith` - String starts with

### Sorting

```http
GET /api/v1/products?sort=price          # Ascending
GET /api/v1/products?sort=-price         # Descending
GET /api/v1/products?sort=brand,price    # Multiple fields
```

### Search

Full-text search:

```http
GET /api/v1/products?search=stainless%20steel%20sink
```

## Field Selection

Request only needed fields using sparse fieldsets:

```http
GET /api/v1/products?fields=id,name,price,images
```

**Response:**

```json
{
  "data": [
    {
      "id": "1",
      "name": "Modern Cabinet",
      "price": 299.99,
      "images": ["url1.jpg"]
    }
  ]
}
```

### Including Related Resources

```http
GET /api/v1/designs/123?include=components,user
```

## Response Compression

Enable compression to reduce bandwidth:

```http
Accept-Encoding: gzip, br
```

**Supported Algorithms:**
- `gzip` - Standard compression
- `br` - Brotli (higher compression ratio)

Responses >1KB are automatically compressed.

## Webhooks

Subscribe to events and receive real-time notifications:

**Supported Events:**
- `design.created`
- `design.updated`
- `design.deleted`
- `order.created`
- `order.completed`
- `catalog.product.updated`

See [Webhooks Documentation](./webhooks/overview.md) for details.

## SDKs and Client Libraries

### Official SDKs

**JavaScript/TypeScript**
```bash
npm install @kitchenxpert/sdk
```

```javascript
import KitchenXpert from '@kitchenxpert/sdk';

const client = new KitchenXpert({
  apiKey: 'your-api-key',
  environment: 'production'
});

const products = await client.catalog.listProducts();
```

**Python**
```bash
pip install kitchenxpert
```

```python
from kitchenxpert import KitchenXpertClient

client = KitchenXpertClient(api_key='your-api-key')
products = client.catalog.list_products()
```

**PHP**
```bash
composer require kitchenxpert/sdk
```

**Ruby**
```bash
gem install kitchenxpert
```

**Go**
```bash
go get github.com/kitchenxpert/sdk-go
```

### Community Libraries

- **React Hooks**: `@kitchenxpert/react-hooks`
- **Vue Composables**: `@kitchenxpert/vue`
- **.NET SDK**: `KitchenXpert.SDK`
- **Java SDK**: `com.kitchenxpert:sdk`

## Resources

### Documentation Links

- **API Reference**: https://docs.kitchenxpert.com/api
- **OpenAPI Specification**: [openapi.yaml](./openapi.yaml)
- **Postman Collection**: [Download](./postman-collection.json)
- **Swagger UI**: https://api.kitchenxpert.com/docs
- **Code Examples**: https://github.com/kitchenxpert/api-examples
- **Changelog**: https://docs.kitchenxpert.com/changelog

### Support

- **Developer Portal**: https://developers.kitchenxpert.com
- **Community Forum**: https://community.kitchenxpert.com
- **Support Email**: api-support@kitchenxpert.com
- **Status Page**: https://status.kitchenxpert.com
- **GitHub Issues**: https://github.com/kitchenxpert/api/issues

### Code Examples

All examples are available in multiple languages at:
https://github.com/kitchenxpert/api-examples

**Quick Start Example (cURL):**

```bash
# Login
curl -X POST https://api.kitchenxpert.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Get products
curl -X GET https://api.kitchenxpert.com/v1/catalog/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create design
curl -X POST https://api.kitchenxpert.com/v1/kitchen/designs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Kitchen",
    "dimensions": {
      "width": 400,
      "height": 250,
      "depth": 60
    }
  }'
```

---

**Last Updated:** 2026-01-10

**API Version:** v1

**Related Documentation:**
- [Authentication Guide](./endpoints/auth/login.md)
- [Error Handling](../architecture/backend.md#error-handling)
- [Security Best Practices](../architecture/security.md)
