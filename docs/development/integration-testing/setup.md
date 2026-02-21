# Integration Testing Setup

**Last Updated:** 2026-01-10

## Table of Contents

- [Environment Configuration](#environment-configuration)
- [Database Seeding](#database-seeding)
- [Mock Services](#mock-services)
- [Test Data Factories](#test-data-factories)
- [Cleanup Procedures](#cleanup-procedures)
- [Test Utilities](#test-utilities)

## Environment Configuration

### Test Environment Variables

Create `.env.test`:

```env
# Application
NODE_ENV=test
PORT=3001

# Test Database
TEST_DATABASE_URL=postgresql://localhost:5432/kitchenxpert_test
TEST_MONGODB_URI=mongodb://localhost:27017/kitchenxpert_test
TEST_REDIS_URL=redis://localhost:6379/1

# Test Secrets (different from production)
JWT_SECRET=test_jwt_secret_for_testing_only
SESSION_SECRET=test_session_secret

# Mock Services
STRIPE_SECRET_KEY=sk_test_mock
AWS_S3_BUCKET=kitchenxpert-test
EMAIL_ENABLED=false

# Disable external services in tests
AI_SERVICE_URL=http://localhost:8001
```

### Jest Configuration

```javascript
// jest.config.integration.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.integration.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially for database
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
};
```

### Global Setup

```typescript
// tests/global-setup.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('Setting up test environment...');

  // Create test database
  try {
    await execAsync('createdb kitchenxpert_test');
  } catch (error) {
    // Database might already exist
  }

  // Run migrations
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  await execAsync('pnpm prisma migrate deploy');

  console.log('Test environment ready');
}
```

### Global Teardown

```typescript
// tests/global-teardown.ts
export default async function globalTeardown() {
  console.log('Cleaning up test environment...');
  // Keep database for debugging
  // Or drop it: await execAsync('dropdb kitchenxpert_test');
}
```

## Database Seeding

### Seed Helper

```typescript
// tests/helpers/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

export async function seedDatabase() {
  // Create test users
  const hashedPassword = await hash('password123', 10);

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@test.com',
        name: 'Test Admin',
        hashedPassword,
        role: 'admin'
      },
      {
        email: 'user@test.com',
        name: 'Test User',
        hashedPassword,
        role: 'user'
      },
      {
        email: 'partner@test.com',
        name: 'Test Partner',
        hashedPassword,
        role: 'partner'
      }
    ]
  });

  // Create test products
  await prisma.product.createMany({
    data: [
      {
        sku: 'REF-001',
        name: 'Test Refrigerator',
        price: 999.99,
        category: 'refrigerators',
        manufacturer: 'Test Brand'
      },
      {
        sku: 'DW-001',
        name: 'Test Dishwasher',
        price: 599.99,
        category: 'dishwashers',
        manufacturer: 'Test Brand'
      }
    ]
  });
}

export async function cleanDatabase() {
  const tables = ['orders', 'designs', 'products', 'users'];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}
```

## Mock Services

### Mock Email Service

```typescript
// tests/mocks/email.service.mock.ts
export const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
};

jest.mock('@/services/email.service', () => mockEmailService);
```

### Mock Payment Gateway

```typescript
// tests/mocks/payment.service.mock.ts
export const mockPaymentService = {
  processPayment: jest.fn().mockResolvedValue({
    success: true,
    transactionId: 'test_txn_123',
    amount: 1000
  }),

  refund: jest.fn().mockResolvedValue({
    success: true,
    refundId: 'test_ref_123'
  })
};

jest.mock('@/services/payment.service', () => mockPaymentService);
```

### Mock S3 Service

```typescript
// tests/mocks/s3.service.mock.ts
export const mockS3Service = {
  upload: jest.fn().mockResolvedValue({
    url: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
    key: 'test-file.jpg'
  }),

  delete: jest.fn().mockResolvedValue(true),

  getSignedUrl: jest.fn().mockReturnValue(
    'https://test-bucket.s3.amazonaws.com/signed-url'
  )
};

jest.mock('@/services/s3.service', () => mockS3Service);
```

## Test Data Factories

### User Factory

```typescript
// tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';
import { hash } from 'bcrypt';
import { prisma } from '@/db/client';

export async function createUser(overrides = {}) {
  const hashedPassword = await hash('password123', 10);

  return await prisma.user.create({
    data: {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      hashedPassword,
      role: 'user',
      ...overrides
    }
  });
}

export async function createAdmin() {
  return await createUser({ role: 'admin' });
}

export async function createPartner() {
  return await createUser({ role: 'partner' });
}
```

### Product Factory

```typescript
// tests/factories/product.factory.ts
import { faker } from '@faker-js/faker';
import { prisma } from '@/db/client';

export async function createProduct(overrides = {}) {
  return await prisma.product.create({
    data: {
      sku: faker.string.alphanumeric(10).toUpperCase(),
      name: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price()),
      category: 'refrigerators',
      manufacturer: faker.company.name(),
      description: faker.commerce.productDescription(),
      ...overrides
    }
  });
}

export async function createProducts(count: number) {
  return await Promise.all(
    Array.from({ length: count }, () => createProduct())
  );
}
```

### Design Factory

```typescript
// tests/factories/design.factory.ts
import { faker } from '@faker-js/faker';
import { prisma } from '@/db/client';

export async function createDesign(userId: string, overrides = {}) {
  return await prisma.design.create({
    data: {
      name: `${faker.word.adjective()} Kitchen`,
      userId,
      data: {
        layout: 'L-shaped',
        dimensions: { width: 12, height: 10 }
      },
      ...overrides
    }
  });
}
```

## Cleanup Procedures

### Test Setup

```typescript
// tests/setup.integration.ts
import { cleanDatabase } from './helpers/seed';

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();

  // Reset all mocks
  jest.clearAllMocks();
});

afterAll(async () => {
  // Close database connections
  await prisma.$disconnect();
});
```

### Cleanup Helpers

```typescript
// tests/helpers/cleanup.ts
export async function cleanupUser(userId: string) {
  await prisma.design.deleteMany({ where: { userId } });
  await prisma.order.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

export async function cleanupProduct(productId: string) {
  await prisma.orderItem.deleteMany({ where: { productId } });
  await prisma.product.delete({ where: { id: productId } });
}
```

## Test Utilities

### Authentication Helper

```typescript
// tests/helpers/auth.ts
import jwt from 'jsonwebtoken';
import { createUser } from '../factories/user.factory';

export async function getAuthToken(user = null) {
  if (!user) {
    user = await createUser();
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return { token, user };
}

export async function getAdminToken() {
  const admin = await createAdmin();
  return await getAuthToken(admin);
}
```

### Request Helper

```typescript
// tests/helpers/request.ts
import request from 'supertest';
import app from '@/app';

export function authenticatedRequest(token: string) {
  return request(app).set('Authorization', `Bearer ${token}`);
}

export async function createAuthenticatedUser() {
  const { token, user } = await getAuthToken();
  const req = authenticatedRequest(token);
  return { req, user, token };
}
```

### Assertion Helpers

```typescript
// tests/helpers/assertions.ts
export function expectSuccess(response: any) {
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
}

export function expectError(response: any, code: string) {
  expect(response.body.success).toBe(false);
  expect(response.body.error.code).toBe(code);
}

export function expectValidationError(response: any) {
  expectError(response, 'VALIDATION_ERROR');
  expect(response.body.error.details).toBeDefined();
}
```

### Wait Helpers

```typescript
// tests/helpers/wait.ts
export async function waitFor(
  condition: () => boolean,
  timeout = 5000
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function waitForDatabase() {
  await waitFor(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  });
}
```

## Related Documentation

- [Integration Testing Overview](./overview.md) - Testing strategy
- [E2E Testing](./e2e-testing.md) - End-to-end tests
- [Testing Guide](../testing.md) - General testing
- [Development Setup](../setup.md) - Environment setup
