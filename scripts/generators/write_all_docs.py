#!/usr/bin/env python3
import os

# Define base path
base_path = "docs/api/endpoints"

# File 3: refresh-token.md (simplified but complete)
refresh_token_content = """# Refresh Token Endpoint

## Overview

Obtain a new access token using a valid refresh token with token rotation strategy.

**Endpoint:** `POST /api/v1/auth/refresh`

**Authentication Required:** Yes (Refresh Token)

**Rate Limiting:** 20 requests per hour per user

---

## Request

### Headers

```
Content-Type: application/json
```

### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | Yes | Valid refresh token from login |

### Request Body Example

```json
{
  "refreshToken": "rt_9x8c7v6b5n4m3l2k1j0h9g8f7e6d5c4b3a2s1"
}
```

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "rt_8w7v6u5t4s3r2q1p0o9n8m7l6k5j4h3g2f1e",
      "tokenType": "Bearer",
      "expiresIn": 3600,
      "refreshExpiresIn": 2592000
    }
  },
  "meta": {
    "timestamp": "2026-01-10T15:00:00Z",
    "requestId": "req_5d4c3b2a1z0y9x8w"
  }
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Refresh token is invalid or has expired",
    "details": {
      "action": "Please log in again"
    }
  }
}
```

### 403 Forbidden - Token Already Used

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_ALREADY_USED",
    "message": "This refresh token has already been used",
    "details": {
      "securityAlert": true,
      "action": "All sessions revoked. Please log in again."
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
    "message": "Too many token refresh attempts",
    "details": {
      "limit": 20,
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
    "message": "An unexpected error occurred"
  }
}
```

---

## Security Considerations

- **Token Rotation:** Each refresh token is single-use
- **Theft Detection:** Reuse of old token triggers security alert
- **Session Revocation:** All user sessions revoked on suspicious activity

---

## Code Examples

### cURL

```bash
curl -X POST https://api.kitchenxpert.com/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "rt_9x8c7v6b5n4m3l2k1j0h9g8f7e6d5c4b3a2s1"}'
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const refreshAccessToken = async (refreshToken) => {
  const response = await axios.post(
    'https://api.kitchenxpert.com/api/v1/auth/refresh',
    { refreshToken }
  );
  
  const { tokens } = response.data.data;
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  
  return tokens;
};
```

### Python (Requests)

```python
import requests

def refresh_access_token(refresh_token: str) -> dict:
    response = requests.post(
        "https://api.kitchenxpert.com/api/v1/auth/refresh",
        json={"refreshToken": refresh_token}
    )
    response.raise_for_status()
    return response.json()["data"]["tokens"]
```

---

## Related Endpoints

- [Login](./login.md) - Initial authentication
- [Logout](./logout.md) - Invalidate tokens

---

**Last Updated:** 2026-01-10
"""

# Write files
with open(os.path.join(base_path, "auth/refresh-token.md"), "w", encoding="utf-8") as f:
    f.write(refresh_token_content)
    print("Created: refresh-token.md")

print("Documentation files created successfully!")
