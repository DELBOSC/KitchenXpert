/** @type {import('jest').Config} */
module.exports = {
  displayName: '3d-engine',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(glsl|vert|frag)$': '<rootDir>/src/test/__mocks__/shaderMock.js',
    // Three.js's `examples/jsm` add-ons ship as ESM and break Jest's
    // CommonJS loader. We stub them out for unit tests; tests that need
    // the real post-processing should be opt-in (e.g. Playwright).
    '^three/examples/jsm/.+': '<rootDir>/src/test/__mocks__/three-jsm-stub.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transformIgnorePatterns: [
    // Three.js core ships ESM too in some entry points; let it through
    // ts-jest. The `examples/jsm` add-ons are stubbed via moduleNameMapper.
    'node_modules/(?!(three)/)',
  ],
};
