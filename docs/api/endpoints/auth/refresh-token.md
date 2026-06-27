# Refresh Token Endpoint

## Overview

Obtain a new access token using a valid refresh token. Implements token rotation
strategy where each refresh token is single-use and a new one is issued with
each refresh.

**Endpoint:** **Authentication Required:** Yes (Refresh Token)

**Rate Limiting:** 20 requests per hour per user

---

## Request

### Headers

### Request Body Schema

| Field | Type   | Required | Description         | Constraints                    |
| ----- | ------ | -------- | ------------------- | ------------------------------ |
| \     | string | Yes      | Valid refresh token | Must be active and not expired |

### Request Body Example

### Validation Rules

- **RefreshToken:**
  - Must be a valid, active refresh token
  - Cannot be expired
  - Cannot have been previously used (single-use policy)
  - Must belong to an existing, non-deleted user account

---

## Response

### Success Response (200 OK)

---

## Error Responses

### 401 Unauthorized - Invalid or Expired Token

### 403 Forbidden - Token Already Used

### 429 Too Many Requests

### 500 Internal Server Error

---

## Rate Limiting

**Limit:** 20 requests per hour per user

---

## Security Considerations

### Token Rotation Strategy

- Each refresh token is single-use only
- Old refresh token invalidated when used
- New refresh token issued with each refresh
- Prevents token replay attacks

### Token Theft Detection

- If a used token is reused, indicates potential theft
- All user sessions automatically revoked
- Security alert sent to user's email

---

## Code Examples

### cURL

### JavaScript (Axios)

### Python (Requests)

---

## Related Endpoints

- [Login](./login.md) - Initial authentication
- [Logout](./logout.md) - Invalidate tokens

---

## Notes

- **Token Rotation:** Store new refresh token, discard old one
- **Single Use:** Refresh tokens can only be used once
- **Silent Refresh:** Implement automatic refresh before expiration

---

**Last Updated:** 2026-01-10
