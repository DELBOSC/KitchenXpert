/**
 * Jest Configuration for AI Modules Testing
 *
 * Purpose:
 * - Specialized configuration for testing AI/ML modules
 * - Handles TensorFlow.js, ML models, and AI recommendation tests
 * - Mocks heavy ML dependencies for faster test execution
 * - Increased timeouts for model loading and inference
 *
 * Usage:
 * - Run AI tests: npm test -- --config=config/jest/jest.ai-modules.js
 * - Run specific AI test: npm test -- ai-modules/recommendations.test.ts
 * - Watch mode: npm test -- --watch --config=config/jest/jest.ai-modules.js
 *
 * Scope:
 * - AI recommendation engine tests
 * - ML model integration tests
 * - Computer vision tests (kitchen design analysis)
 * - Natural language processing tests (search, chat)
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
    name: 'AI-MODULES',
    color: 'magenta',
  },

  // ============================================================
  // Test Matching
  // ============================================================

  /**
   * Only run tests in ai-modules directory
   */
  testMatch: [
    '**/ai-modules/**/*.test.ts',
    '**/ai-modules/**/*.test.tsx',
    '**/ai-modules/**/*.spec.ts',
    '**/ai-modules/**/*.spec.tsx',
  ],

  /**
   * Ignore certain test files
   */
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/__fixtures__/', '/__mocks__/'],

  // ============================================================
  // Test Environment
  // ============================================================

  /**
   * Use Node environment for AI tests (not jsdom)
   * - TensorFlow.js works better in Node environment
   * - No browser APIs needed for ML tests
   */
  testEnvironment: 'node',

  // ============================================================
  // Setup Files
  // ============================================================

  /**
   * Setup files to run before tests
   */
  setupFilesAfterEnv: [
    '<rootDir>/config/jest/setup-tests.js',
    '<rootDir>/config/jest/setup-ai-tests.js',
  ],

  // ============================================================
  // Timeout Configuration
  // ============================================================

  /**
   * Increase timeout for ML operations
   * - Model loading can take several seconds
   * - Inference on large datasets needs more time
   */
  testTimeout: 10000, // 10 seconds (default is 5s)

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
          isolatedModules: true,
        },
      },
    ],
  },

  // ============================================================
  // Module Mocks
  // ============================================================

  /**
   * Mock heavy ML dependencies
   * - Speeds up test execution
   * - Prevents loading actual model files
   */
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,

    // Mock TensorFlow.js
    '@tensorflow/tfjs': '<rootDir>/config/jest/mocks/tensorflow-mock.js',
    '@tensorflow/tfjs-node': '<rootDir>/config/jest/mocks/tensorflow-mock.js',

    // Mock ML model files
    '\\.onnx$': '<rootDir>/config/jest/mocks/model-mock.js',
    '\\.pb$': '<rootDir>/config/jest/mocks/model-mock.js',
    '\\.h5$': '<rootDir>/config/jest/mocks/model-mock.js',
    '\\.tflite$': '<rootDir>/config/jest/mocks/model-mock.js',

    // Mock large data files
    '\\.bin$': '<rootDir>/config/jest/mocks/file-mock.js',
    '\\.weights$': '<rootDir>/config/jest/mocks/file-mock.js',
  },

  // ============================================================
  // Coverage Configuration
  // ============================================================

  /**
   * Coverage thresholds for AI modules
   * - Lower than general code due to ML complexity
   * - Focus on critical paths and error handling
   */
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './ai-modules/recommendations/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './ai-modules/search/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  /**
   * Files to exclude from coverage
   */
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__tests__/',
    '/__mocks__/',
    '/config/',
    '\\.mock\\.[jt]s$',
    '\\.stub\\.[jt]s$',
    '/models/', // Trained model files
    '/datasets/', // Training datasets
  ],

  /**
   * Coverage reporters
   */
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],

  // ============================================================
  // Global Configuration
  // ============================================================

  /**
   * Global variables available in tests
   */
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        warnOnly: true,
      },
    },
    // AI-specific globals
    AI_TEST_MODE: true,
    MOCK_ML_MODELS: true,
    SKIP_MODEL_LOADING: true,
  },

  // ============================================================
  // Module Directories
  // ============================================================

  /**
   * Directories to search for modules
   */
  moduleDirectories: ['node_modules', 'src', 'ai-modules'],

  // ============================================================
  // Cache Configuration
  // ============================================================

  /**
   * Disable cache for AI tests
   * - Model mocks may change frequently during development
   * - Prevents stale mock issues
   */
  cache: false,

  // ============================================================
  // Error Handling
  // ============================================================

  /**
   * Bail after first test failure
   * - AI tests can be slow, fail fast to save time
   */
  bail: 1,

  /**
   * Verbose output for debugging
   */
  verbose: true,

  // ============================================================
  // Performance
  // ============================================================

  /**
   * Run tests in parallel
   * - Speeds up AI test suite
   * - Each worker gets its own ML mock
   */
  maxWorkers: '50%',

  /**
   * Detect open handles (memory leaks from ML operations)
   */
  detectOpenHandles: true,

  /**
   * Force exit after tests complete
   * - Some ML libraries may keep process alive
   */
  forceExit: true,

  // ============================================================
  // Reporters
  // ============================================================

  /**
   * Custom reporters for AI test results
   */
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage/ai-modules',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        suiteName: 'AI Modules Tests',
      },
    ],
  ],
};

/**
 * ============================================================
 * AI Test Setup (setup-ai-tests.js)
 * ============================================================
 *
 * Create this file to mock TensorFlow and ML dependencies:
 *
 * // config/jest/setup-ai-tests.js
 *
 * // Mock TensorFlow.js
 * jest.mock('@tensorflow/tfjs', () => ({
 *   loadLayersModel: jest.fn(() => Promise.resolve({
 *     predict: jest.fn((input) => ({
 *       dataSync: () => [0.1, 0.9, 0.3],
 *       dispose: jest.fn(),
 *     })),
 *     dispose: jest.fn(),
 *   })),
 *   tensor: jest.fn((data) => ({
 *     shape: [data.length],
 *     dispose: jest.fn(),
 *   })),
 *   tidy: jest.fn((fn) => fn()),
 * }));
 *
 * // Mock recommendation model
 * global.mockRecommendationModel = {
 *   predict: jest.fn((userId, productIds) => ({
 *     recommendations: [
 *       { productId: 'prod-1', score: 0.95 },
 *       { productId: 'prod-2', score: 0.87 },
 *     ],
 *   })),
 * };
 *
 * // Mock image classification model
 * global.mockImageClassifier = {
 *   classify: jest.fn((imageBuffer) => ({
 *     predictions: [
 *       { class: 'modern-kitchen', confidence: 0.92 },
 *       { class: 'traditional-kitchen', confidence: 0.73 },
 *     ],
 *   })),
 * };
 */

/**
 * ============================================================
 * Example AI Test
 * ============================================================
 *
 * // ai-modules/recommendations/collaborative-filtering.test.ts
 *
 * import { CollaborativeFilter } from './collaborative-filtering';
 *
 * describe('CollaborativeFilter', () => {
 *   let filter: CollaborativeFilter;
 *
 *   beforeEach(() => {
 *     filter = new CollaborativeFilter({
 *       numFactors: 10,
 *       learningRate: 0.01,
 *     });
 *   });
 *
 *   describe('predict', () => {
 *     it('should predict user preferences', async () => {
 *       const userId = 'user-123';
 *       const productIds = ['prod-1', 'prod-2', 'prod-3'];
 *
 *       const predictions = await filter.predict(userId, productIds);
 *
 *       expect(predictions).toHaveLength(3);
 *       expect(predictions[0]).toHaveProperty('productId');
 *       expect(predictions[0]).toHaveProperty('score');
 *       expect(predictions[0].score).toBeGreaterThanOrEqual(0);
 *       expect(predictions[0].score).toBeLessThanOrEqual(1);
 *     });
 *
 *     it('should handle cold start problem', async () => {
 *       const newUserId = 'user-new';
 *       const productIds = ['prod-1', 'prod-2'];
 *
 *       const predictions = await filter.predict(newUserId, productIds);
 *
 *       // Should return average scores for new users
 *       expect(predictions).toHaveLength(2);
 *       predictions.forEach((pred) => {
 *         expect(pred.score).toBeGreaterThan(0);
 *       });
 *     });
 *
 *     it('should handle errors gracefully', async () => {
 *       const invalidUserId = null;
 *       const productIds = ['prod-1'];
 *
 *       await expect(
 *         filter.predict(invalidUserId, productIds)
 *       ).rejects.toThrow('Invalid user ID');
 *     });
 *   });
 *
 *   describe('train', () => {
 *     it('should train model on user interactions', async () => {
 *       const interactions = [
 *         { userId: 'user-1', productId: 'prod-1', rating: 5 },
 *         { userId: 'user-1', productId: 'prod-2', rating: 3 },
 *         { userId: 'user-2', productId: 'prod-1', rating: 4 },
 *       ];
 *
 *       const result = await filter.train(interactions);
 *
 *       expect(result.epochs).toBeGreaterThan(0);
 *       expect(result.loss).toBeLessThan(1);
 *       expect(result.accuracy).toBeGreaterThan(0.5);
 *     });
 *   });
 * });
 */

// TODO: Add integration tests with real TensorFlow models (in separate config)
// TODO: Add performance benchmarks for ML operations
// TODO: Add visual regression tests for AI-generated designs
// TODO: Consider adding GPU-accelerated testing for production models
