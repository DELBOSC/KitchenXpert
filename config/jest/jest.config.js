/**
 * Configuration Jest de base pour tous les projets
 */

module.exports = {
  // Configuration multi-projet
  projects: [
    '<rootDir>/config/jest/jest.frontend.js',
    '<rootDir>/config/jest/jest.backend.js',
    '<rootDir>/config/jest/jest.ai-modules.js',
    '<rootDir>/config/jest/jest.integration.js',
  ],

  // Coverage global
  collectCoverageFrom: [
    'packages/*/src/**/*.{ts,tsx,js,jsx}',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.stories.{ts,tsx,js,jsx}',
    '!packages/*/src/**/__tests__/**',
    '!packages/*/src/**/__mocks__/**',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Watch mode
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  // Timeouts
  testTimeout: 10000,

  // Max workers
  maxWorkers: '50%',

  // Bail early
  bail: false,

  // Verbose output
  verbose: true,
};
