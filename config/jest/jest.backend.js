/**
 * Configuration Jest pour le backend (Node.js)
 */

module.exports = {
  displayName: 'backend',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: [
    '<rootDir>/packages/backend/src/**/__tests__/**/*.{ts,js}',
    '<rootDir>/packages/backend/src/**/*.{spec,test}.{ts,js}',
  ],

  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', {
      tsconfig: '<rootDir>/packages/backend/tsconfig.json',
    }],
  },

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/packages/backend/src/$1',
    '^@common/(.*)$': '<rootDir>/packages/common/src/$1',
  },

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/',
    '/__mocks__/',
  ],

  collectCoverageFrom: [
    'packages/backend/src/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],

  setupFilesAfterEnv: ['<rootDir>/config/jest/setup-tests.js'],

  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  moduleFileExtensions: ['ts', 'js', 'json'],
};
