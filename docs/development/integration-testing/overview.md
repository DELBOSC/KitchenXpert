# Integration Testing Overview

**Last Updated:** 2026-01-10

## Table of Contents

- [What is Integration Testing](#what-is-integration-testing)
- [Scope](#scope)
- [Integration Testing Strategy](#integration-testing-strategy)
- [Test Database Setup](#test-database-setup)
- [Running Integration Tests](#running-integration-tests)
- [Integration Test Examples](#integration-test-examples)
- [Best Practices](#best-practices)

## What is Integration Testing

Integration testing verifies that different modules or services work together
correctly. Unlike unit tests that test individual components in isolation,
integration tests validate the interactions between components.

### Integration vs Unit vs E2E

| Type        | Scope                 | Speed  | Coverage |
| ----------- | --------------------- | ------ | -------- |
| Unit        | Single function/class | Fast   | High     |
| Integration | Multiple components   | Medium | Medium   |
| E2E         | Entire application    | Slow   | Low      |

## Scope

### What We Test

1. **API Endpoints** - Full request/response cycle
2. **Database Operations** - CRUD with real database
3. **External Services** - Third-party API integration
4. **Authentication Flow** - Login, registration, token validation
5. **Business Logic** - Service layer with dependencies

### What We Don't Test

- Individual functions (unit tests)
- UI interactions (E2E tests)
- Performance (performance tests)
- Security vulnerabilities (security tests)

## Integration Testing Strategy

### Test Pyramid

```
Integration Testing in KitchenXpert
┌─────────────────────────────────┐
│   E2E Tests (10%)               │
├─────────────────────────────────┤
│   Integration Tests (20%)       │
│   - API + Database              │
│   - Service Integration         │
│   - External APIs               │
├─────────────────────────────────┤
│   Unit Tests (70%)              │
└─────────────────────────────────┘
```

### Test Categories

1. **API Integration Tests** - Test HTTP endpoints
2. **Database Integration Tests** - Test database operations
3. **Service Integration Tests** - Test service interactions
4. **External API Tests** - Test third-party integrations

## Test Database Setup

### PostgreSQL Test Database

```bash
# Create test database
createdb kitchenxpert_test

# Run migrations
DATABASE_URL=postgresql://localhost/kitchenxpert_test pnpm prisma migrate deploy

# Setup completed automatically in tests
```

### Test Database Configuration

```typescript
// tests/helpers/database.ts
import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.TEST_DATABASE_URL ||
        'postgresql://localhost/kitchenxpert_test',
    },
  },
});

export async function cleanDatabase() {
  const tables = ['users', 'designs', 'products', 'orders'];

  for (const table of tables) {
    await testDb.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
  }
}
```

## Running Integration Tests

### Command Line

```bash
# Run all integration tests
pnpm test:integration

# Run specific test file
pnpm test:integration auth.integration.test.ts

# Run with coverage
pnpm test:integration --coverage

# Run in watch mode
pnpm test:integration --watch
```

### Configuration

```javascript
// jest.config.integration.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
};
```

## Integration Test Examples

### API Integration Test

```typescript
// tests/integration/api/users.integration.test.ts
import request from 'supertest';
import app from '@/app';
import { testDb, cleanDatabase } from '../../helpers/database';

describe('User API Integration', () => {
  beforeAll(async () => {
    await testDb.$connect();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');

      // Verify in database
      const user = await testDb.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeTruthy();
    });
  });
});
```

### Database Integration Test

```typescript
// tests/integration/database/design.integration.test.ts
import { DesignRepository } from '@/repositories/design.repository';
import { testDb, cleanDatabase } from '../../helpers/database';

describe('Design Repository Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should create design with relationships', async () => {
    // Create user first
    const user = await testDb.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    // Create design
    const design = await DesignRepository.create({
      name: 'Test Kitchen',
      userId: user.id,
      data: { layout: 'L-shaped' },
    });

    expect(design.id).toBeDefined();
    expect(design.userId).toBe(user.id);

    // Verify relationships
    const designWithUser = await testDb.design.findUnique({
      where: { id: design.id },
      include: { user: true },
    });

    expect(designWithUser.user.email).toBe('test@example.com');
  });
});
```

### Service Integration Test

```typescript
// tests/integration/services/order.integration.test.ts
import { OrderService } from '@/services/order.service';
import { testDb, cleanDatabase } from '../../helpers/database';

describe('Order Service Integration', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should create order with products', async () => {
    // Setup test data
    const user = await testDb.user.create({
      data: { email: 'test@example.com', name: 'Test' },
    });

    const product = await testDb.product.create({
      data: {
        sku: 'TEST-001',
        name: 'Test Product',
        price: 99.99,
        category: 'refrigerators',
      },
    });

    // Create order
    const order = await OrderService.create({
      userId: user.id,
      items: [
        {
          productId: product.id,
          quantity: 2,
          price: product.price,
        },
      ],
    });

    expect(order.total).toBe(199.98);
    expect(order.items).toHaveLength(1);

    // Verify in database
    const dbOrder = await testDb.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });

    expect(dbOrder.items[0].productId).toBe(product.id);
  });
});
```

## Best Practices

### 1. Use Test Database

Always use a separate test database:

```typescript
const DATABASE_URL =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;
```

### 2. Clean Database Between Tests

```typescript
beforeEach(async () => {
  await cleanDatabase();
});
```

### 3. Use Transactions (Optional)

```typescript
let transaction;

beforeEach(async () => {
  transaction = await testDb.$transaction();
});

afterEach(async () => {
  await transaction.rollback();
});
```

### 4. Test Real Scenarios

```typescript
it('should complete user registration flow', async () => {
  // 1. Register
  const registerResponse = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'test@example.com', password: 'pass123' });

  // 2. Verify email would be sent
  // 3. Login
  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'test@example.com', password: 'pass123' });

  expect(loginResponse.body.data.token).toBeDefined();
});
```

### 5. Mock External Services

```typescript
// Mock email service
jest.mock('@/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

// Mock payment gateway
jest.mock('@/services/payment.service', () => ({
  processPayment: jest.fn().mockResolvedValue({
    success: true,
    transactionId: 'test-123',
  }),
}));
```

### 6. Test Error Scenarios

```typescript
it('should handle database connection error', async () => {
  // Simulate database error
  jest
    .spyOn(testDb.user, 'create')
    .mockRejectedValue(new Error('Connection failed'));

  await expect(
    UserService.create({ email: 'test@example.com' })
  ).rejects.toThrow('Connection failed');
});
```

### 7. Use Factories for Test Data

```typescript
import { createUser, createProduct } from '../../factories';

it('should create order', async () => {
  const user = await createUser();
  const product = await createProduct();

  const order = await OrderService.create({
    userId: user.id,
    items: [{ productId: product.id, quantity: 1 }],
  });

  expect(order).toBeDefined();
});
```

## Related Documentation

- [Integration Testing Setup](./setup.md) - Detailed setup guide
- [E2E Testing](./e2e-testing.md) - End-to-end testing
- [CI Integration](./ci-integration.md) - Running tests in CI
- [Testing Guide](../testing.md) - General testing practices
