/**
 * Configuration Jest pour le frontend (React)
 */

module.exports = {
  displayName: 'frontend',
  testEnvironment: 'jsdom',
  rootDir: '../..',
  testMatch: [
    '<rootDir>/packages/frontend/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/packages/frontend/src/**/*.{spec,test}.{ts,tsx,js,jsx}',
    '<rootDir>/packages/ui-components/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/packages/ui-components/src/**/*.{spec,test}.{ts,tsx,js,jsx}',
    '<rootDir>/packages/design-system/src/**/__tests__/**/*.{ts,tsx,js,jsx}',
    '<rootDir>/packages/design-system/src/**/*.{spec,test}.{ts,tsx,js,jsx}',
  ],

  setupFilesAfterEnv: ['<rootDir>/config/jest/setup-tests.js'],

  moduleNameMapper: {
    // Aliases
    '^@/(.*)$': '<rootDir>/packages/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/packages/frontend/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/packages/frontend/src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/packages/frontend/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/packages/frontend/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/packages/frontend/src/services/$1',
    '^@store/(.*)$': '<rootDir>/packages/frontend/src/store/$1',
    '^@types/(.*)$': '<rootDir>/packages/frontend/src/types/$1',
    '^@assets/(.*)$': '<rootDir>/packages/frontend/src/assets/$1',
    '^@styles/(.*)$': '<rootDir>/packages/frontend/src/styles/$1',
    '^@3d/(.*)$': '<rootDir>/packages/3d-engine/src/$1',
    '^@common/(.*)$': '<rootDir>/packages/common/src/$1',

    // File mocks
    '\\.(css|less|scss|sass)$': '<rootDir>/config/jest/mocks/style-mock.js',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/config/jest/mocks/file-mock.js',
    '\\.svg$': '<rootDir>/config/jest/mocks/svg-mock.js',
  },

  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  transformIgnorePatterns: [
    'node_modules/(?!(three|@react-three|react-spring)/)',
  ],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__tests__/',
    '/__mocks__/',
    '\\.stories\\.(ts|tsx|js|jsx)$',
  ],

  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },

  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  collectCoverageFrom: [
    'packages/frontend/src/**/*.{ts,tsx,js,jsx}',
    'packages/ui-components/src/**/*.{ts,tsx,js,jsx}',
    'packages/design-system/src/**/*.{ts,tsx,js,jsx}',
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx,js,jsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
};
