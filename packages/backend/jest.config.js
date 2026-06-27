/** @type {import('jest').Config} */
module.exports = {
  displayName: 'backend',
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@kitchenxpert/common$': '<rootDir>/../common/src/index.ts',
    // NodeNext requires `.js` on relative imports — strip it so jest resolves to `.ts`.
    '^(\\.\\.?\\/.+)\\.js$': '$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(@kitchenxpert)/)'],
  setupFiles: ['<rootDir>/src/test/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/test/**',
    '!src/database/migrations/**',
    '!src/database/seeds/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Coverage floor reflects ACTUAL backend coverage (~20-32%), NOT a target.
  // It is an anti-regression ratchet, not the goal. Debt: raise toward 50%
  // by adding use-cases/ tests (currently 0% covered). See CLAUDE.md.
  coverageThreshold: {
    global: {
      branches: 17,
      functions: 18,
      lines: 25,
      statements: 25,
    },
  },
  testTimeout: 10000,
  verbose: true,
};
