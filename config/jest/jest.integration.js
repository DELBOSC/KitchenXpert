/**
 * Jest Configuration for Integration Tests
 *
 * Purpose:
 * - End-to-end testing of integrated system components
 * - Tests with real database, Redis, and external services
 * - Validates complete user flows and API contracts
 * - Ensures proper interaction between modules
 *
 * Usage:
 * - Run integration tests: npm run test:integration
 * - Run specific suite: npm test -- --config=config/jest/jest.integration.js auth
 * - Debug mode: node --inspect-brk node_modules/.bin/jest --config=config/jest/jest.integration.js
 *
 * Scope:
 * - API endpoint tests (REST, GraphQL)
 * - Database integration tests
 * - Authentication/Authorization flows
 * - Payment processing integration
 * - External service integration (Stripe, AWS S3, etc.)
 * - Complete user journey tests
 *
 * @see https://jestjs.io/docs/configuration
 */

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,

  // ============================================================
  // Display Name
  // ============================================================

  displayName: {
    name: 'INTEGRATION',
    color: 'blue',
  },

  // ============================================================
  // Test Matching
  // ============================================================

  /**
   * Only run integration tests
   */
  testMatch: [
    '**/__tests__/integration/**/*.test.ts',
    '**/__tests__/integration/**/*.test.tsx',
    '**/integration/**/*.test.ts',
    '**/integration/**/*.test.tsx',
    '**/*.integration.test.ts',
    '**/*.integration.test.tsx',
  ],

  /**
   * Ignore patterns
   */
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__fixtures__/',
  ],

  // ============================================================
  // Test Environment
  // ============================================================

  /**
   * Use Node environment for integration tests
   * - Most integration tests are API/backend focused
   */
  testEnvironment: 'node',

  // ============================================================
  // Setup and Teardown
  // ============================================================

  /**
   * Global setup - runs once before all tests
   * - Start test database
   * - Run migrations
   * - Seed test data
   * - Start Redis
   * - Configure AWS mocks
   */
  globalSetup: '<rootDir>/config/jest/global-setup-integration.js',

  /**
   * Global teardown - runs once after all tests
   * - Stop test database
   * - Clear Redis
   * - Clean up temporary files
   * - Reset external service mocks
   */
  globalTeardown: '<rootDir>/config/jest/global-teardown-integration.js',

  /**
   * Setup files to run before each test file
   */
  setupFilesAfterEnv: [
    '<rootDir>/config/jest/setup-tests.js',
    '<rootDir>/config/jest/setup-integration-tests.js',
  ],

  // ============================================================
  // Timeout Configuration
  // ============================================================

  /**
   * Increased timeout for integration tests
   * - Database operations
   * - External API calls
   * - File uploads/downloads
   */
  testTimeout: 30000, // 30 seconds (default is 5s)

  // ============================================================
  // Transform Configuration
  // ============================================================

  /**
   * TypeScript transformation
   */
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
        },
      },
    ],
  },

  // ============================================================
  // Module Configuration
  // ============================================================

  /**
   * Module name mapper
   * - Path aliases
   * - Mock static assets (not needed in integration tests)
   */
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
  },

  /**
   * Module directories
   */
  moduleDirectories: ['node_modules', 'src'],

  // ============================================================
  // Coverage Configuration
  // ============================================================

  /**
   * Collect coverage from integration tests
   */
  collectCoverage: true,

  /**
   * Coverage thresholds for integration tests
   * - Focus on critical paths and error handling
   */
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  /**
   * Files to collect coverage from
   */
  collectCoverageFrom: [
    'src/api/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    'src/controllers/**/*.{ts,tsx}',
    'src/middleware/**/*.{ts,tsx}',
    'src/models/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.mock.ts',
    '!**/*.stub.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],

  /**
   * Coverage reporters
   */
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],

  /**
   * Coverage directory
   */
  coverageDirectory: './coverage/integration',

  // ============================================================
  // Execution Configuration
  // ============================================================

  /**
   * Run tests serially (not in parallel)
   * - Prevents database conflicts
   * - Ensures proper test isolation
   * - More predictable test execution
   */
  maxWorkers: 1,

  /**
   * Run tests in sequence (one at a time)
   */
  runInBand: true,

  /**
   * Bail after first test failure
   * - Integration tests are slow, fail fast
   */
  bail: false, // Set to true to stop on first failure

  /**
   * Verbose output
   */
  verbose: true,

  // ============================================================
  // Error Handling
  // ============================================================

  /**
   * Detect open handles (database connections, timers, etc.)
   */
  detectOpenHandles: true,

  /**
   * Force exit after tests
   * - Some database connections may keep process alive
   */
  forceExit: true,

  /**
   * Detect leaks in test execution
   */
  detectLeaks: false, // Enable if experiencing memory issues

  // ============================================================
  // Global Variables
  // ============================================================

  /**
   * Global test configuration
   */
  globals: {
    'ts-jest': {
      isolatedModules: false, // Allow imports between files
      diagnostics: {
        warnOnly: true,
      },
    },
    // Integration test globals
    INTEGRATION_TEST: true,
    TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kitchenxpert_test',
    TEST_REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379/1',
    TEST_API_PORT: process.env.TEST_API_PORT || 3001,
    MOCK_EXTERNAL_SERVICES: true,
  },

  // ============================================================
  // Reporters
  // ============================================================

  /**
   * Test reporters
   */
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage/integration',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        suiteName: 'Integration Tests',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'KitchenXpert Integration Test Report',
        outputPath: './coverage/integration/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
        sort: 'status',
      },
    ],
  ],

  // ============================================================
  // Cache
  // ============================================================

  /**
   * Disable cache for integration tests
   * - Ensures fresh test execution
   */
  cache: false,

  // ============================================================
  // Watch Mode (disabled for integration tests)
  // ============================================================

  watchman: false,
};

/**
 * ============================================================
 * Global Setup Script (global-setup-integration.js)
 * ============================================================
 *
 * // config/jest/global-setup-integration.js
 *
 * const { exec } = require('child_process');
 * const util = require('util');
 * const execAsync = util.promisify(exec);
 *
 * module.exports = async () => {
 *   console.log('🔧 Setting up integration test environment...');
 *
 *   // 1. Create test database
 *   console.log('📦 Creating test database...');
 *   try {
 *     await execAsync('createdb kitchenxpert_test');
 *   } catch (error) {
 *     // Database might already exist
 *     console.log('Database already exists, continuing...');
 *   }
 *
 *   // 2. Run migrations
 *   console.log('🔄 Running database migrations...');
 *   await execAsync('npm run db:migrate:test');
 *
 *   // 3. Seed test data
 *   console.log('🌱 Seeding test data...');
 *   await execAsync('npm run db:seed:test');
 *
 *   // 4. Start Redis (if not already running)
 *   console.log('🔴 Checking Redis connection...');
 *   // Add Redis connection check
 *
 *   // 5. Set environment variables
 *   process.env.NODE_ENV = 'test';
 *   process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kitchenxpert_test';
 *   process.env.REDIS_URL = 'redis://localhost:6379/1';
 *
 *   console.log('✅ Integration test environment ready!');
 * };
 */

/**
 * ============================================================
 * Global Teardown Script (global-teardown-integration.js)
 * ============================================================
 *
 * // config/jest/global-teardown-integration.js
 *
 * const { exec } = require('child_process');
 * const util = require('util');
 * const execAsync = util.promisify(exec);
 *
 * module.exports = async () => {
 *   console.log('🧹 Cleaning up integration test environment...');
 *
 *   // 1. Rollback migrations (optional)
 *   console.log('↩️  Rolling back database...');
 *   // await execAsync('npm run db:rollback:test');
 *
 *   // 2. Drop test database (optional - useful for CI)
 *   if (process.env.CI) {
 *     console.log('🗑️  Dropping test database...');
 *     try {
 *       await execAsync('dropdb kitchenxpert_test');
 *     } catch (error) {
 *       console.error('Failed to drop database:', error);
 *     }
 *   }
 *
 *   // 3. Clear Redis test database
 *   console.log('🔴 Clearing Redis...');
 *   // Add Redis flush logic
 *
 *   console.log('✅ Cleanup complete!');
 * };
 */

/**
 * ============================================================
 * Integration Test Setup (setup-integration-tests.js)
 * ============================================================
 *
 * // config/jest/setup-integration-tests.js
 *
 * import { Pool } from 'pg';
 * import Redis from 'ioredis';
 *
 * // Database connection pool
 * global.testDbPool = new Pool({
 *   connectionString: process.env.TEST_DATABASE_URL,
 * });
 *
 * // Redis client
 * global.testRedis = new Redis(process.env.TEST_REDIS_URL);
 *
 * // Clean up before each test
 * beforeEach(async () => {
 *   // Clear Redis cache
 *   await global.testRedis.flushdb();
 *
 *   // Truncate tables (preserve migrations)
 *   await global.testDbPool.query(`
 *     TRUNCATE TABLE
 *       users,
 *       products,
 *       orders,
 *       designs
 *     RESTART IDENTITY CASCADE;
 *   `);
 * });
 *
 * // Cleanup after all tests
 * afterAll(async () => {
 *   await global.testDbPool.end();
 *   await global.testRedis.quit();
 * });
 */

/**
 * ============================================================
 * Example Integration Test
 * ============================================================
 *
 * // __tests__/integration/api/auth.integration.test.ts
 *
 * import request from 'supertest';
 * import { app } from '../../../src/app';
 *
 * describe('Authentication API Integration', () => {
 *   describe('POST /api/auth/register', () => {
 *     it('should register a new user', async () => {
 *       const response = await request(app)
 *         .post('/api/auth/register')
 *         .send({
 *           email: 'test@example.com',
 *           password: 'SecurePass123!',
 *           firstName: 'Test',
 *           lastName: 'User',
 *         })
 *         .expect(201);
 *
 *       expect(response.body).toHaveProperty('user');
 *       expect(response.body).toHaveProperty('token');
 *       expect(response.body.user.email).toBe('test@example.com');
 *     });
 *
 *     it('should reject duplicate email', async () => {
 *       // First registration
 *       await request(app)
 *         .post('/api/auth/register')
 *         .send({
 *           email: 'duplicate@example.com',
 *           password: 'SecurePass123!',
 *         });
 *
 *       // Duplicate registration
 *       const response = await request(app)
 *         .post('/api/auth/register')
 *         .send({
 *           email: 'duplicate@example.com',
 *           password: 'SecurePass123!',
 *         })
 *         .expect(409);
 *
 *       expect(response.body.error).toContain('already exists');
 *     });
 *   });
 *
 *   describe('POST /api/auth/login', () => {
 *     beforeEach(async () => {
 *       // Create test user
 *       await request(app)
 *         .post('/api/auth/register')
 *         .send({
 *           email: 'login@example.com',
 *           password: 'SecurePass123!',
 *         });
 *     });
 *
 *     it('should login with correct credentials', async () => {
 *       const response = await request(app)
 *         .post('/api/auth/login')
 *         .send({
 *           email: 'login@example.com',
 *           password: 'SecurePass123!',
 *         })
 *         .expect(200);
 *
 *       expect(response.body).toHaveProperty('token');
 *       expect(response.body.user.email).toBe('login@example.com');
 *     });
 *
 *     it('should reject incorrect password', async () => {
 *       const response = await request(app)
 *         .post('/api/auth/login')
 *         .send({
 *           email: 'login@example.com',
 *           password: 'WrongPassword',
 *         })
 *         .expect(401);
 *
 *       expect(response.body.error).toContain('Invalid credentials');
 *     });
 *   });
 * });
 */

// TODO: Add database transaction support for better test isolation
// TODO: Add API contract testing with Pact or similar
// TODO: Add WebSocket integration tests
// TODO: Add file upload/download integration tests
// TODO: Consider adding Playwright for full E2E browser tests
