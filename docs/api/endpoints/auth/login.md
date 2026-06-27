# Login Endpoint

## Overview

Authenticate a user with email and password credentials to receive access and
refresh tokens for API access.

**Endpoint:** `POST /api/v1/auth/login`

**Authentication Required:** No

**Rate Limiting:** 5 requests per minute per IP address

---

## Request

### Headers

```
Content-Type: application/json
X-Client-Version: 1.0.0 (optional)
X-Device-ID: <unique-device-identifier> (optional)
```

### Request Body Schema

| Field        | Type    | Required | Description             | Constraints                            |
| ------------ | ------- | -------- | ----------------------- | -------------------------------------- |
| `email`      | string  | Yes      | User's email address    | Valid email format, max 255 characters |
| `password`   | string  | Yes      | User's password         | Min 8 characters, max 128 characters   |
| `rememberMe` | boolean | No       | Extend session duration | Default: false                         |

### Request Body Example

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

### Validation Rules

- **Email:**
  - Must be a valid email format (RFC 5322)
  - Case-insensitive matching
  - Maximum length: 255 characters

- **Password:**
  - Minimum length: 8 characters
  - Maximum length: 128 characters
  - Accepts any valid UTF-8 characters

- **RememberMe:**
  - If `true`, refresh token expires in 30 days
  - If `false`, refresh token expires in 7 days

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_7k8j9h2g3f4d5s6a",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "emailVerified": true,
      "createdAt": "2025-12-15T10:30:00Z",
      "lastLoginAt": "2026-01-10T14:22:15Z",
      "preferences": {
        "language": "en",
        "currency": "USD",
        "measurementUnit": "metric"
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3JfN2s4ajloMmczZjRkNXM2YSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzM2NTIyNTM1LCJleHAiOjE3MzY1MjYxMzV9.8k7j6h5g4f3d2s1a0z9x8c7v6b5n4m3",
      "refreshToken": "rt_9x8c7v6b5n4m3l2k1j0h9g8f7e6d5c4b3a2s1",
      "tokenType": "Bearer",
      "expiresIn": 3600,
      "refreshExpiresIn": 2592000
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:22:15Z",
    "requestId": "req_1a2b3c4d5e6f7g8h"
  }
}
```

### Response Fields

| Field                     | Type    | Description                                        |
| ------------------------- | ------- | -------------------------------------------------- |
| `user.id`                 | string  | Unique user identifier                             |
| `user.email`              | string  | User's email address                               |
| `user.name`               | string  | User's full name                                   |
| `user.role`               | string  | User role (user, partner, admin)                   |
| `user.emailVerified`      | boolean | Email verification status                          |
| `user.createdAt`          | string  | Account creation timestamp (ISO 8601)              |
| `user.lastLoginAt`        | string  | Most recent login timestamp (ISO 8601)             |
| `user.preferences`        | object  | User preferences object                            |
| `tokens.accessToken`      | string  | JWT access token for API authentication            |
| `tokens.refreshToken`     | string  | Refresh token for obtaining new access tokens      |
| `tokens.tokenType`        | string  | Token type (always "Bearer")                       |
| `tokens.expiresIn`        | number  | Access token expiration in seconds (3600 = 1 hour) |
| `tokens.refreshExpiresIn` | number  | Refresh token expiration in seconds                |

---

## Error Responses

### 400 Bad Request - Invalid Input

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-10T14:22:15Z",
    "requestId": "req_1a2b3c4d5e6f7g8h"
  }
}
```

### 401 Unauthorized - Invalid Credentials

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "details": null
  },
  "meta": {
    "timestamp": "2026-01-10T14:22:15Z",
    "requestId": "req_1a2b3c4d5e6f7g8h"
  }
}
```

### 403 Forbidden - Account Locked

```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account has been locked due to multiple failed login attempts",
    "details": {
      "lockedUntil": "2026-01-10T15:22:15Z",
      "remainingMinutes": 60
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:22:15Z",
    "requestId": "req_1a2b3c4d5e6f7g8h"
  }
}
```

### 422 Unprocessable Entity - Email Not Verified

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email address before logging in",
    "details": {
      "email": "user@example.com",
      "verificationSentAt": "2026-01-10T14:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:22:15Z",
    "requestId": "req_1a2b3c4d5e6f7g8h"
  }
}
```

### 429 Too Many Requests - Rate Limit Exceeded

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. Please try again later",
    "details": {
      "limit": 5,
      "resetAt": "2026-01-10T14:23:15Z",
      "retryAfter": 60
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:22:15Z",
    "requestId": "req_1a2b3c4d5e6f7g8h"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred. Please try again later",
    "details": null
  },
  "meta": {
    "timestamp": "2026-01-10T14:22:15Z",
    "requestId": "req_1a2b3c4d5e6f7g8h"
  }
}
```

---

## Rate Limiting

**Limit:** 5 requests per minute per IP address

**Headers Returned:**

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1736522595
```

**Exceeded Behavior:**

- Returns 429 status code
- Provides `retryAfter` seconds in response
- IP-based throttling with exponential backoff after repeated violations

---

## Security Considerations

### Password Security

- Passwords are hashed using bcrypt with 12 salt rounds
- Original passwords are never stored or logged
- Failed login attempts are tracked per IP and account

### Account Protection

- Account automatically locks after 5 failed login attempts within 15 minutes
- Lock duration: 1 hour (increases with repeated lockouts)
- Account unlock via email verification or time expiration

### Token Security

- Access tokens expire after 1 hour
- Refresh tokens are single-use (token rotation)
- Tokens are invalidated on logout
- All tokens are revoked when password is changed

### Audit Logging

- All login attempts are logged (success and failure)
- IP address, device, and timestamp recorded
- Suspicious activity triggers security alerts

---

## Code Examples

### cURL

```bash
curl -X POST https://api.kitchenxpert.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Client-Version: 1.0.0" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "rememberMe": true
  }'
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const login = async (email, password, rememberMe = false) => {
  try {
    const response = await axios.post(
      'https://api.kitchenxpert.com/api/v1/auth/login',
      {
        email,
        password,
        rememberMe,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0.0',
        },
      }
    );

    const { user, tokens } = response.data.data;

    // Store tokens securely
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    return { user, tokens };
  } catch (error) {
    if (error.response) {
      // Handle specific error codes
      const errorCode = error.response.data.error.code;

      switch (errorCode) {
        case 'INVALID_CREDENTIALS':
          console.error('Invalid email or password');
          break;
        case 'ACCOUNT_LOCKED':
          console.error(
            'Account is locked:',
            error.response.data.error.details
          );
          break;
        case 'RATE_LIMIT_EXCEEDED':
          console.error(
            'Too many attempts, retry after:',
            error.response.data.error.details.retryAfter
          );
          break;
        default:
          console.error('Login failed:', error.response.data.error.message);
      }
    }
    throw error;
  }
};

// Usage
login('user@example.com', 'SecurePassword123!', true)
  .then(({ user, tokens }) => {
    console.log('Logged in as:', user.name);
    console.log('Access token expires in:', tokens.expiresIn, 'seconds');
  })
  .catch((error) => {
    console.error('Login error:', error);
  });
```

### Python (Requests)

```python
import requests
import json
from datetime import datetime, timedelta

def login(email: str, password: str, remember_me: bool = False) -> dict:
    """
    Authenticate user and receive access tokens.

    Args:
        email: User's email address
        password: User's password
        remember_me: Extend session duration

    Returns:
        Dictionary containing user data and tokens

    Raises:
        requests.exceptions.HTTPError: If login fails
    """
    url = "https://api.kitchenxpert.com/api/v1/auth/login"

    headers = {
        "Content-Type": "application/json",
        "X-Client-Version": "1.0.0"
    }

    payload = {
        "email": email,
        "password": password,
        "rememberMe": remember_me
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        user = data["data"]["user"]
        tokens = data["data"]["tokens"]

        # Store tokens securely (use secure storage in production)
        with open('.tokens.json', 'w') as f:
            json.dump({
                "accessToken": tokens["accessToken"],
                "refreshToken": tokens["refreshToken"],
                "expiresAt": (datetime.now() + timedelta(seconds=tokens["expiresIn"])).isoformat()
            }, f)

        return {"user": user, "tokens": tokens}

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            error_data = e.response.json()
            print(f"Authentication failed: {error_data['error']['message']}")
        elif e.response.status_code == 429:
            error_data = e.response.json()
            retry_after = error_data['error']['details']['retryAfter']
            print(f"Rate limit exceeded. Retry after {retry_after} seconds")
        elif e.response.status_code == 403:
            error_data = e.response.json()
            print(f"Account locked: {error_data['error']['message']}")
            print(f"Locked until: {error_data['error']['details']['lockedUntil']}")
        else:
            print(f"Login error: {e}")
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise

# Usage
if __name__ == "__main__":
    try:
        result = login(
            email="user@example.com",
            password="SecurePassword123!",
            remember_me=True
        )

        print(f"Logged in as: {result['user']['name']}")
        print(f"User ID: {result['user']['id']}")
        print(f"Access token expires in: {result['tokens']['expiresIn']} seconds")

    except Exception as e:
        print(f"Login failed: {e}")
```

---

## Related Endpoints

- [Register](./register.md) - Create a new user account
- [Refresh Token](./refresh-token.md) - Obtain new access token using refresh
  token
- [Logout](./logout.md) - Invalidate current session tokens
- [Password Reset Request](./password-reset-request.md) - Request password reset
  email
- [User Profile](../user/user-profile.md) - Get authenticated user's profile

---

## Notes

- **Session Management:** Access tokens are short-lived (1 hour) for security.
  Use refresh tokens to obtain new access tokens without re-authenticating.
- **Multi-Device Support:** Each login creates a separate session. Users can be
  logged in on multiple devices simultaneously.
- **Remember Me:** When enabled, refresh token validity extends from 7 days to
  30 days.
- **Email Verification:** Users must verify their email before logging in.
  Unverified accounts receive a 422 error.
- **Password Changes:** All active sessions are invalidated when a user changes
  their password.

---

**Last Updated:** 2026-01-10
