# Register Endpoint

## Overview

Create a new user account with email, password, and basic profile information. After successful registration, a verification email is sent to the provided email address.

**Endpoint:** `POST /api/v1/auth/register`

**Authentication Required:** No

**Rate Limiting:** 10 requests per hour per IP address

---

## Request

### Headers

```
Content-Type: application/json
X-Client-Version: 1.0.0 (optional)
X-Device-ID: <unique-device-identifier> (optional)
```

### Request Body Schema

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `email` | string | Yes | User's email address | Valid email format, unique, max 255 characters |
| `password` | string | Yes | User's password | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |
| `name` | string | Yes | User's full name | Min 2 characters, max 100 characters |
| `acceptTerms` | boolean | Yes | Terms and conditions acceptance | Must be `true` |
| `newsletter` | boolean | No | Subscribe to newsletter | Default: false |

### Request Body Example

```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "Jane Smith",
  "acceptTerms": true,
  "newsletter": false
}
```

### Validation Rules

- **Email:**
  - Must be a valid email format (RFC 5322)
  - Must be unique (not already registered)
  - Maximum length: 255 characters
  - Case-insensitive uniqueness check

- **Password:**
  - Minimum length: 8 characters
  - Maximum length: 128 characters
  - Must contain at least one uppercase letter (A-Z)
  - Must contain at least one lowercase letter (a-z)
  - Must contain at least one number (0-9)
  - Recommended: Include special characters (!@#$%^&*)
  - Cannot contain common patterns (e.g., "password123", "12345678")

- **Name:**
  - Minimum length: 2 characters
  - Maximum length: 100 characters
  - Supports Unicode characters (international names)
  - Trimmed of leading/trailing whitespace

- **AcceptTerms:**
  - Must be explicitly set to `true`
  - Registration fails if not accepted

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_9h8g7f6d5s4a3z2x1c",
      "email": "newuser@example.com",
      "name": "Jane Smith",
      "role": "user",
      "emailVerified": false,
      "createdAt": "2026-01-10T14:30:00Z",
      "preferences": {
        "language": "en",
        "currency": "USD",
        "measurementUnit": "metric",
        "newsletter": false
      }
    },
    "verification": {
      "emailSent": true,
      "expiresAt": "2026-01-11T14:30:00Z",
      "message": "A verification email has been sent to newuser@example.com"
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h"
  }
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `user.id` | string | Unique user identifier |
| `user.email` | string | User's email address |
| `user.name` | string | User's full name |
| `user.role` | string | User role (always "user" for registration) |
| `user.emailVerified` | boolean | Email verification status (always false initially) |
| `user.createdAt` | string | Account creation timestamp (ISO 8601) |
| `user.preferences` | object | Default user preferences |
| `verification.emailSent` | boolean | Whether verification email was sent |
| `verification.expiresAt` | string | Verification link expiration (24 hours) |
| `verification.message` | string | User-friendly message about verification |

---

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter",
        "code": "WEAK_PASSWORD"
      },
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_EMAIL"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-10T14:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h"
  }
}
```

### 409 Conflict - Email Already Exists

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "An account with this email address already exists",
    "details": {
      "email": "newuser@example.com",
      "suggestion": "Try logging in or use password reset if you forgot your password"
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h"
  }
}
```

### 422 Unprocessable Entity - Terms Not Accepted

```json
{
  "success": false,
  "error": {
    "code": "TERMS_NOT_ACCEPTED",
    "message": "You must accept the terms and conditions to register",
    "details": {
      "termsUrl": "https://kitchenxpert.com/terms",
      "privacyUrl": "https://kitchenxpert.com/privacy"
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h"
  }
}
```

### 429 Too Many Requests - Rate Limit Exceeded

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many registration attempts. Please try again later",
    "details": {
      "limit": 10,
      "resetAt": "2026-01-10T15:30:00Z",
      "retryAfter": 3600
    }
  },
  "meta": {
    "timestamp": "2026-01-10T14:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h"
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
    "timestamp": "2026-01-10T14:30:00Z",
    "requestId": "req_9a8b7c6d5e4f3g2h"
  }
}
```

---

## Rate Limiting

**Limit:** 10 requests per hour per IP address

**Headers Returned:**

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1736526000
```

**Exceeded Behavior:**
- Returns 429 status code
- Provides `retryAfter` seconds in response
- Stricter limits apply for suspicious patterns (VPN, repeated failures)

---

## Security Considerations

### Password Requirements
- Enforces strong password policy
- Passwords hashed using bcrypt with 12 salt rounds
- Common passwords are rejected (uses dictionary check)
- Password strength score calculated using zxcvbn algorithm

### Email Verification
- Verification email sent immediately after registration
- Verification link expires after 24 hours
- Account cannot log in until email is verified
- Resend verification option available

### Anti-Fraud Measures
- IP-based rate limiting
- Disposable email detection and blocking
- reCAPTCHA integration (optional, based on risk score)
- Suspicious pattern detection (multiple accounts from same IP)

### Data Privacy
- Passwords never stored in plain text
- Personal data encrypted at rest
- GDPR and CCPA compliant
- Right to deletion supported

---

## Code Examples

### cURL

```bash
curl -X POST https://api.kitchenxpert.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Client-Version: 1.0.0" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "name": "Jane Smith",
    "acceptTerms": true,
    "newsletter": false
  }'
```

### JavaScript (Axios)

```javascript
import axios from 'axios';

const register = async (email, password, name, acceptTerms, newsletter = false) => {
  try {
    const response = await axios.post(
      'https://api.kitchenxpert.com/api/v1/auth/register',
      {
        email,
        password,
        name,
        acceptTerms,
        newsletter
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0.0'
        }
      }
    );

    const { user, verification } = response.data.data;

    console.log('Registration successful!');
    console.log('User ID:', user.id);
    console.log('Verification:', verification.message);

    return { user, verification };
  } catch (error) {
    if (error.response) {
      const errorCode = error.response.data.error.code;

      switch (errorCode) {
        case 'EMAIL_EXISTS':
          console.error('Email already registered:', error.response.data.error.details.suggestion);
          break;
        case 'VALIDATION_ERROR':
          console.error('Validation errors:');
          error.response.data.error.details.forEach(err => {
            console.error(`- ${err.field}: ${err.message}`);
          });
          break;
        case 'TERMS_NOT_ACCEPTED':
          console.error('Terms must be accepted to register');
          break;
        case 'RATE_LIMIT_EXCEEDED':
          const retryAfter = error.response.data.error.details.retryAfter;
          console.error(`Too many attempts. Retry in ${retryAfter} seconds`);
          break;
        default:
          console.error('Registration failed:', error.response.data.error.message);
      }
    }
    throw error;
  }
};

// Usage
register(
  'newuser@example.com',
  'SecurePassword123!',
  'Jane Smith',
  true,
  false
)
  .then(({ user, verification }) => {
    console.log('Welcome,', user.name);
    console.log('Please check your email to verify your account');
  })
  .catch(error => {
    console.error('Registration error:', error);
  });
```

### Python (Requests)

```python
import requests
from typing import Dict

def register(
    email: str,
    password: str,
    name: str,
    accept_terms: bool,
    newsletter: bool = False
) -> Dict:
    """
    Register a new user account.

    Args:
        email: User's email address
        password: User's password (must meet security requirements)
        name: User's full name
        accept_terms: Must be True to accept terms and conditions
        newsletter: Subscribe to newsletter (default: False)

    Returns:
        Dictionary containing user data and verification info

    Raises:
        requests.exceptions.HTTPError: If registration fails
    """
    url = "https://api.kitchenxpert.com/api/v1/auth/register"

    headers = {
        "Content-Type": "application/json",
        "X-Client-Version": "1.0.0"
    }

    payload = {
        "email": email,
        "password": password,
        "name": name,
        "acceptTerms": accept_terms,
        "newsletter": newsletter
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()

        data = response.json()
        user = data["data"]["user"]
        verification = data["data"]["verification"]

        print(f"Registration successful!")
        print(f"User ID: {user['id']}")
        print(f"Verification: {verification['message']}")

        return {"user": user, "verification": verification}

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            error_data = e.response.json()
            print("Validation errors:")
            for detail in error_data['error']['details']:
                print(f"  - {detail['field']}: {detail['message']}")
        elif e.response.status_code == 409:
            error_data = e.response.json()
            print(f"Email already exists: {error_data['error']['details']['suggestion']}")
        elif e.response.status_code == 429:
            error_data = e.response.json()
            retry_after = error_data['error']['details']['retryAfter']
            print(f"Rate limit exceeded. Retry after {retry_after} seconds")
        else:
            print(f"Registration error: {e}")
        raise

# Usage
if __name__ == "__main__":
    try:
        result = register(
            email="newuser@example.com",
            password="SecurePassword123!",
            name="Jane Smith",
            accept_terms=True,
            newsletter=False
        )

        print(f"\nWelcome, {result['user']['name']}!")
        print("Please check your email to verify your account.")

    except Exception as e:
        print(f"Registration failed: {e}")
```

---

## Related Endpoints

- [Login](./login.md) - Authenticate with credentials
- [Verify Email](./verify-email.md) - Confirm email address
- [Resend Verification](./resend-verification.md) - Request new verification email
- [Check Email Availability](./check-email.md) - Check if email is available before registration

---

## Notes

- **Email Uniqueness:** Each email address can only be registered once. Duplicate registrations return 409 error.
- **Password Security:** Weak passwords are rejected. Use combination of uppercase, lowercase, numbers, and special characters.
- **Email Verification Required:** Users must verify email before logging in. Unverified accounts cannot access protected endpoints.
- **Default Preferences:** New accounts receive default preferences (English, USD, metric) which can be updated later.
- **Newsletter Opt-in:** Newsletter subscription is optional and can be changed anytime in account settings.
- **Account Deletion:** Users can delete their account at any time via the account settings.

---

**Last Updated:** 2026-01-10
