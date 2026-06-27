# Catalog Products Endpoint

## Overview

Retrieve kitchen appliance products from the catalog with extensive filtering,
sorting, and pagination capabilities.

**Endpoint:** **Authentication Required:** No (Public endpoint)

**Rate Limiting:** 100 requests per minute per IP

---

## Request

### Query Parameters

| Parameter | Type   | Required | Description         | Default   |
| --------- | ------ | -------- | ------------------- | --------- |
| \         | string | No       | Search term         | -         |
| \         | string | No       | Product category    | -         |
| \         | string | No       | Brand name          | -         |
| \         | number | No       | Minimum price (USD) | 0         |
| \         | number | No       | Maximum price (USD) | -         |
| \         | string | No       | Energy efficiency   | -         |
| \         | number | No       | Page number         | 1         |
| \         | number | No       | Results per page    | 20        |
| \         | string | No       | Sort field          | price:asc |

**Categories:** refrigerator, oven, dishwasher, cooktop, range, microwave, hood

**Energy Classes:** A+++, A++, A+, A, B, C, D

**Sort Options:** price:asc, price:desc, name:asc, name:desc, rating:desc,
newest

### Request Examples

---

## Response

### Success Response (200 OK)

---

## Error Responses

### 400 Bad Request

### 429 Too Many Requests

### 500 Internal Server Error

---

## Code Examples

### cURL

### JavaScript (Axios)

\https://api.kitchenxpert.com/api/v1/catalog/products?### Python (Requests)

---

## Related Endpoints

- [Product Details](./product-details.md) - Get detailed product information
- [Product Compare](./product-compare.md) - Compare multiple products

---

**Last Updated:** 2026-01-10
