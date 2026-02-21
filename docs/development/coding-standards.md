# Coding Standards

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [TypeScript/JavaScript Standards](#typescriptjavascript-standards)
- [Python Standards](#python-standards)
- [React Best Practices](#react-best-practices)
- [API Design Principles](#api-design-principles)
- [Database Conventions](#database-conventions)
- [Error Handling](#error-handling)
- [Logging Best Practices](#logging-best-practices)
- [Security Best Practices](#security-best-practices)
- [Performance Considerations](#performance-considerations)

## Overview

This document defines the coding standards for KitchenXpert. Following these standards ensures consistency, maintainability, and quality across the codebase.

### Core Principles

1. **Readability** - Code is read more often than written
2. **Consistency** - Follow established patterns
3. **Simplicity** - Keep it simple, avoid over-engineering
4. **Maintainability** - Write code that's easy to change
5. **Testability** - Make code easy to test

## TypeScript/JavaScript Standards

### ESLint Configuration

Located at `config/linters/eslintrc.js`:

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error'
  }
};
```

### Prettier Configuration

Located at `config/linters/prettierrc.js`:

```javascript
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'avoid'
};
```

### Naming Conventions

```typescript
// camelCase for variables and functions
const userId = '123';
function calculateTotal(items: Item[]): number {}

// PascalCase for classes and interfaces
class UserService {}
interface IUser {}

// UPPER_SNAKE_CASE for constants
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// Boolean variables use is/has/can prefix
const isAuthenticated = true;
const hasPermission = false;
const canEdit = true;
```

### File Organization

```typescript
// 1. Imports (ordered: built-in, external, internal, relative)
import { readFile } from 'fs/promises';
import express from 'express';
import { UserService } from '@/services/user.service';
import { authenticate } from '../middleware/auth';

// 2. Constants
const MAX_PAGE_SIZE = 100;

// 3. Types/Interfaces
interface UserListQuery {
  page?: number;
  limit?: number;
}

// 4. Main code
export class UserController {
  // ...
}
```

### Type Safety

```typescript
// ❌ Avoid 'any'
function processData(data: any): any {
  return data.value;
}

// ✅ Use specific types
function processData<T>(data: { value: T }): T {
  return data.value;
}

// ✅ Use type guards
function isUser(obj: unknown): obj is IUser {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}
```

## Python Standards

### PEP 8 Compliance

```python
"""User service module."""

from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

# Constants
MAX_LOGIN_ATTEMPTS = 5
PASSWORD_MIN_LENGTH = 8


class UserService:
    """Service for user operations."""

    def __init__(self, db_session):
        """Initialize UserService."""
        self.db = db_session

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user.

        Args:
            user_data: User creation data

        Returns:
            Created user

        Raises:
            ValueError: If email already exists
        """
        pass
```

### Type Hints

```python
from typing import List, Optional, Dict, Any

def calculate_total(items: List[Dict[str, Any]]) -> float:
    """Calculate total price."""
    return sum(item['price'] for item in items)

def find_user(user_id: str) -> Optional[User]:
    """Find user by ID."""
    return db.query(User).filter(User.id == user_id).first()
```

### Docstrings (Google Style)

```python
def complex_function(param1: str, param2: int) -> Dict[str, Any]:
    """Brief description.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Dictionary containing results

    Raises:
        ValueError: If param1 is empty
    """
    pass
```

## React Best Practices

### Component Structure

```typescript
import { memo } from 'react';
import type { FC } from 'react';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (id: string) => void;
}

export const ProductCard: FC<ProductCardProps> = memo(({ product, onAddToCart }) => {
  const handleAddToCart = () => {
    onAddToCart?.(product.id);
  };

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
```

### Hooks Best Practices

```typescript
// Custom hooks use 'use' prefix
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  // ... implementation
  return [storedValue, setStoredValue] as const;
}

// Use useCallback for functions passed to children
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);

// Use useMemo for expensive computations
const expensiveValue = useMemo(() => compute(data), [data]);
```

## API Design Principles

### RESTful Conventions

```typescript
GET    /api/v1/users              // List users
GET    /api/v1/users/:id          // Get user
POST   /api/v1/users              // Create user
PUT    /api/v1/users/:id          // Update user
DELETE /api/v1/users/:id          // Delete user

// Nested resources
GET    /api/v1/users/:id/designs
```

### Response Format

```typescript
// Success response
interface SuccessResponse<T> {
  success: true;
  data: T;
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

## Database Conventions

### Table Naming

```sql
-- Plural, snake_case
CREATE TABLE users (...);
CREATE TABLE design_templates (...);

-- Junction tables
CREATE TABLE user_roles (...);
```

### Column Naming

```sql
-- snake_case
user_id
first_name
created_at

-- Boolean prefix
is_active
has_subscription
```

### Indexes

```sql
-- Format: idx_<table>_<column(s)>
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_designs_user_id ON designs(user_id);
```

## Error Handling

### Custom Error Classes

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
```

### Error Middleware

```typescript
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Error occurred', { error: error.message });

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
```

## Logging Best Practices

```typescript
// Use appropriate log levels
logger.error('Database connection failed', { error });
logger.warn('Rate limit approaching', { userId });
logger.info('User logged in', { userId });
logger.debug('Query executed', { query });

// Include context
logger.info('Design created', {
  userId: user.id,
  designId: design.id
});

// Never log sensitive data
// ❌ logger.info('User', { password: user.password });
// ✅ logger.info('User created', { userId: user.id });
```

## Security Best Practices

### Input Validation

```typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

const userData = createUserSchema.parse(req.body);
```

### SQL Injection Prevention

```typescript
// ✅ Use parameterized queries
const user = await prisma.user.findUnique({ where: { email } });

// ❌ Never concatenate user input
const users = await knex.raw(`SELECT * FROM users WHERE email = '${email}'`);
```

### XSS Prevention

```typescript
// ✅ React automatically escapes
return <div>{userInput}</div>;

// ✅ Sanitize if using innerHTML
import DOMPurify from 'isomorphic-dompurify';
const clean = DOMPurify.sanitize(userInput);
```

## Performance Considerations

### Database Queries

```typescript
// ❌ N+1 query problem
for (const user of users) {
  const designs = await Design.findAll({ where: { userId: user.id } });
}

// ✅ Use eager loading
const users = await User.findAll({ include: [Design] });

// ✅ Use pagination
const users = await User.findAll({
  offset: (page - 1) * limit,
  limit: limit
});
```

### React Performance

```typescript
// ✅ Use memo for expensive components
export const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* render */}</div>;
});

// ✅ Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

### Caching

```typescript
async function getUser(id: string): Promise<User> {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await prisma.user.findUnique({ where: { id } });
  if (user) {
    await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
  }
  return user;
}
```

## Related Documentation

- [Development Setup](./setup.md) - Environment setup
- [Git Workflow](./git-workflow.md) - Branching and commits
- [Testing Guide](./testing.md) - Testing practices
- [API Documentation](../api/overview.md) - API reference
