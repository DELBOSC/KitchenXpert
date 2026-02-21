# Testing Overview

**Last Updated:** 2026-01-10

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Frameworks](#testing-frameworks)
- [Test Coverage Requirements](#test-coverage-requirements)
- [Running Tests](#running-tests)
- [Writing Good Tests](#writing-good-tests)
- [Mocking Strategies](#mocking-strategies)
- [Test Data Management](#test-data-management)
- [Test Organization](#test-organization)

## Testing Philosophy

KitchenXpert follows the **testing pyramid** approach:

```
        /\
       /E2E\          10% - End-to-End Tests
      /______\
     /Integration\    20% - Integration Tests
    /____________\
   /     Unit     \   70% - Unit Tests
  /______________\
```

### Principles

1. **Write tests first** - TDD when possible
2. **Fast feedback** - Tests should run quickly
3. **Independent tests** - No dependencies between tests
4. **Descriptive names** - Tests should explain what they test
5. **AAA pattern** - Arrange, Act, Assert

## Testing Frameworks

### Backend (Node.js/TypeScript)

| Framework | Purpose | Documentation |
|-----------|---------|---------------|
| Jest | Unit & integration testing | [jestjs.io](https://jestjs.io) |
| Supertest | HTTP assertion testing | [github.com/visionmedia/supertest](https://github.com/visionmedia/supertest) |
| ts-jest | TypeScript support for Jest | [github.com/kulshekhar/ts-jest](https://github.com/kulshekhar/ts-jest) |

### Frontend (React)

| Framework | Purpose | Documentation |
|-----------|---------|---------------|
| Jest | Test runner | [jestjs.io](https://jestjs.io) |
| React Testing Library | Component testing | [testing-library.com/react](https://testing-library.com/react) |
| @testing-library/user-event | User interaction simulation | [testing-library.com/docs/user-event](https://testing-library.com/docs/user-event) |

### E2E Testing

| Framework | Purpose | Documentation |
|-----------|---------|---------------|
| Playwright | E2E browser testing | [playwright.dev](https://playwright.dev) |

### AI Modules (Python)

| Framework | Purpose | Documentation |
|-----------|---------|---------------|
| pytest | Testing framework | [pytest.org](https://docs.pytest.org) |
| pytest-asyncio | Async test support | [github.com/pytest-dev/pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio) |
| pytest-cov | Coverage reporting | [github.com/pytest-dev/pytest-cov](https://github.com/pytest-dev/pytest-cov) |

## Test Coverage Requirements

### Coverage Targets

- **Minimum**: 80% overall coverage
- **Target**: 85%+ overall coverage
- **Critical paths**: 95%+ coverage (auth, payments, data integrity)

### Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Check coverage thresholds
pnpm test:coverage --coverage-threshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

### Jest Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/index.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Running Tests

### All Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Unit Tests

```bash
# Run only unit tests
pnpm test:unit

# Run specific test file
pnpm test user.service.test.ts

# Run tests matching pattern
pnpm test --testNamePattern="should create user"
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration

# Run with real database
DATABASE_URL=postgresql://localhost/test pnpm test:integration
```

### E2E Tests

```bash
# Run E2E tests
pnpm test:e2e

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test
pnpm test:e2e tests/e2e/login.spec.ts
```

### Python Tests

```bash
cd packages/ai-modules

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_design_generation.py

# Run with verbose output
pytest -v
```

## Writing Good Tests

### Unit Test Example (Backend)

```typescript
// user.service.test.ts
import { UserService } from './user.service';
import { prisma } from '@/db/client';

// Mock Prisma
jest.mock('@/db/client', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const expectedUser = {
        id: '123',
        email: userData.email,
        name: userData.name,
        createdAt: new Date()
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(expectedUser);

      // Act
      const result = await UserService.create(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          name: userData.name
        })
      });
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User'
      };

      (prisma.user.create as jest.Mock).mockRejectedValue(
        new Error('Unique constraint violation')
      );

      // Act & Assert
      await expect(UserService.create(userData)).rejects.toThrow();
    });
  });
});
```

### Component Test Example (Frontend)

```typescript
// UserProfile.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './UserProfile';
import { fetchUser } from '@/api/users';

// Mock API
jest.mock('@/api/users');

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display user information', async () => {
    // Arrange
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    };

    (fetchUser as jest.Mock).mockResolvedValue(mockUser);

    // Act
    render(<UserProfile userId="123" />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('should update user name on submit', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    };

    (fetchUser as jest.Mock).mockResolvedValue(mockUser);

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Act
    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Profile updated')).toBeInTheDocument();
    });
  });
});
```

### Integration Test Example

```typescript
// auth.integration.test.ts
import request from 'supertest';
import app from '@/app';
import { prisma } from '@/db/client';

describe('Authentication API', () => {
  beforeAll(async () => {
    // Setup test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear users table
    await prisma.user.deleteMany();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### E2E Test Example (Playwright)

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');

    // Fill in credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/dashboard');

    // Verify user is logged in
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

### Python Test Example

```python
# tests/test_design_generation.py
import pytest
from app.services.design_service import DesignService
from app.schemas.design import DesignParams

@pytest.mark.asyncio
async def test_generate_design():
    """Test design generation."""
    # Arrange
    params = DesignParams(
        style="modern",
        dimensions={"width": 12, "height": 10},
        budget=5000
    )

    # Act
    result = await DesignService.generate(params)

    # Assert
    assert result is not None
    assert result.style == "modern"
    assert len(result.appliances) > 0

@pytest.mark.asyncio
async def test_generate_design_invalid_params():
    """Test design generation with invalid params."""
    # Arrange
    params = DesignParams(
        style="invalid",
        dimensions={"width": -1, "height": 10},
        budget=-1000
    )

    # Act & Assert
    with pytest.raises(ValueError):
        await DesignService.generate(params)
```

## Mocking Strategies

### Mocking External APIs

```typescript
// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
});

it('should fetch user data', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ id: '123', name: 'Test' })
  });

  const user = await fetchUser('123');
  expect(user.name).toBe('Test');
});
```

### Mocking Database

```typescript
// Create mock Prisma client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

jest.mock('@/db/client', () => ({
  prisma: mockPrisma
}));
```

### Mocking Time

```typescript
// Mock Date
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-10'));
});

afterAll(() => {
  jest.useRealTimers();
});

it('should use mocked time', () => {
  const now = new Date();
  expect(now.toISOString()).toBe('2026-01-10T00:00:00.000Z');
});
```

## Test Data Management

### Factories

```typescript
// tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export const createUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  createdAt: new Date(),
  ...overrides
});

// Usage
const user = createUser({ email: 'specific@example.com' });
```

### Fixtures

```typescript
// tests/fixtures/users.json
[
  {
    "id": "test-user-1",
    "email": "user1@example.com",
    "name": "Test User 1"
  },
  {
    "id": "test-user-2",
    "email": "user2@example.com",
    "name": "Test User 2"
  }
]

// Load in tests
import users from './fixtures/users.json';
```

### Database Seeding

```typescript
// tests/helpers/seed.ts
export async function seedDatabase() {
  await prisma.user.createMany({
    data: [
      { email: 'admin@example.com', name: 'Admin', role: 'admin' },
      { email: 'user@example.com', name: 'User', role: 'user' }
    ]
  });
}

// Use in tests
beforeEach(async () => {
  await seedDatabase();
});
```

## Test Organization

### Directory Structure

```
tests/
├── unit/                 # Unit tests
│   ├── services/
│   ├── utils/
│   └── validators/
├── integration/          # Integration tests
│   ├── api/
│   ├── database/
│   └── services/
├── e2e/                  # End-to-end tests
│   ├── auth.spec.ts
│   ├── design.spec.ts
│   └── catalog.spec.ts
├── fixtures/             # Test data
├── factories/            # Test data factories
└── helpers/              # Test utilities
```

### Test Naming

```typescript
// Format: should_expectedBehavior_whenStateUnderTest
describe('UserService', () => {
  it('should return user when valid ID is provided', () => {});
  it('should throw error when user not found', () => {});
  it('should update user email when valid email provided', () => {});
});
```

## Related Documentation

- [Integration Testing](./integration-testing/overview.md) - Integration test details
- [E2E Testing](./integration-testing/e2e-testing.md) - E2E test guide
- [CI Integration](./integration-testing/ci-integration.md) - CI/CD testing
- [Coding Standards](./coding-standards.md) - Code standards
