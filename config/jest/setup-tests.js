/**
 * Jest Setup Configuration for KitchenXpert
 *
 * Purpose:
 * - Configures the test environment before running tests
 * - Adds custom matchers and global test utilities
 * - Mocks browser APIs and global objects
 * - Sets up cleanup and error handling
 *
 * Usage:
 * - Automatically loaded before each test file
 * - Configured in jest.config.js via setupFilesAfterEnv
 *
 * Jest Configuration (jest.config.js):
 * setupFilesAfterEnv: ['<rootDir>/config/jest/setup-tests.js']
 *
 * @see https://jestjs.io/docs/configuration#setupfilesafterenv-array
 */

// ============================================================
// Testing Library Setup
// ============================================================

/**
 * Import jest-dom custom matchers
 * - Provides DOM-specific assertions like toBeInTheDocument(), toHaveClass(), etc.
 */
import '@testing-library/jest-dom';

/**
 * Import React Testing Library cleanup
 * - Automatically cleans up after each test
 */
import { cleanup } from '@testing-library/react';

// ============================================================
// Automatic Cleanup
// ============================================================

/**
 * Clean up after each test
 * - Unmounts React trees
 * - Clears DOM between tests
 * - Prevents test pollution
 */
afterEach(() => {
  cleanup();
});

// ============================================================
// Global Fetch Mock
// ============================================================

/**
 * Mock the global fetch API
 * - Required for tests that use fetch
 * - Prevents actual network requests
 * - Can be overridden in individual tests
 */
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: function () {
      return this;
    },
  })
);

// Reset fetch mock before each test
beforeEach(() => {
  global.fetch.mockClear();
});

// ============================================================
// Browser API Mocks
// ============================================================

/**
 * Mock window.matchMedia
 * - Required for responsive design tests
 * - Used by many UI libraries for media query detection
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

/**
 * Mock IntersectionObserver
 * - Required for lazy loading and infinite scroll tests
 * - Used by many animation and visibility libraries
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observedElements = new Set();
  }

  observe(element) {
    this.observedElements.add(element);
  }

  unobserve(element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.observedElements.clear();
  }

  takeRecords() {
    return [];
  }

  // Helper for triggering intersection in tests
  triggerIntersection(entries) {
    this.callback(entries, this);
  }
};

/**
 * Mock ResizeObserver
 * - Required for responsive component tests
 * - Used for element size change detection
 */
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observedElements = new Set();
  }

  observe(element) {
    this.observedElements.add(element);
  }

  unobserve(element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.observedElements.clear();
  }

  // Helper for triggering resize in tests
  triggerResize(entries) {
    this.callback(entries, this);
  }
};

/**
 * Mock window.scrollTo
 * - Prevents console errors in tests
 */
global.scrollTo = jest.fn();

/**
 * Mock window.localStorage
 * - In-memory storage for tests
 */
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Clear localStorage before each test
beforeEach(() => {
  window.localStorage.clear();
});

/**
 * Mock window.sessionStorage
 * - In-memory storage for tests
 */
const sessionStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Clear sessionStorage before each test
beforeEach(() => {
  window.sessionStorage.clear();
});

// ============================================================
// WebGL Mock (for 3D configurator tests)
// ============================================================

/**
 * Mock WebGL context
 * - Required for Three.js and 3D design tool tests
 */
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      getShaderPrecisionFormat: jest.fn(() => ({
        precision: 1,
        rangeMin: 1,
        rangeMax: 1,
      })),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      viewport: jest.fn(),
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
    };
  }
  return null;
});

// ============================================================
// Console Suppression
// ============================================================

/**
 * Suppress known console warnings/errors in tests
 * - Reduces noise in test output
 * - Only suppresses expected warnings
 */
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress specific React warnings
  console.error = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Not implemented: HTMLFormElement.prototype.submit') ||
        message.includes('Warning: ReactDOM.render') ||
        message.includes('Warning: useLayoutEffect does nothing on the server'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('componentWillReceiveProps') ||
        message.includes('componentWillMount'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// ============================================================
// Custom Matchers
// ============================================================

/**
 * Add custom Jest matchers
 * - Domain-specific assertions for KitchenXpert
 */
expect.extend({
  /**
   * Check if a value is a valid kitchen dimension
   * @param {number} received - The dimension to check
   * @param {number} min - Minimum allowed dimension
   * @param {number} max - Maximum allowed dimension
   */
  toBeValidKitchenDimension(received, min = 0, max = 10000) {
    const pass =
      typeof received === 'number' &&
      !Number.isNaN(received) &&
      received >= min &&
      received <= max;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid kitchen dimension between ${min} and ${max}`
          : `expected ${received} to be a valid kitchen dimension between ${min} and ${max}`,
    };
  },

  /**
   * Check if a value is a valid product SKU
   * @param {string} received - The SKU to check
   */
  toBeValidSKU(received) {
    const skuPattern = /^[A-Z]{2,4}-\d{4,6}$/;
    const pass = typeof received === 'string' && skuPattern.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to match SKU pattern (e.g., CAB-1234)`
          : `expected ${received} to match SKU pattern (e.g., CAB-1234)`,
    };
  },

  /**
   * Check if a value is a valid color hex code
   * @param {string} received - The color to check
   */
  toBeValidHexColor(received) {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const pass = typeof received === 'string' && hexPattern.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid hex color`
          : `expected ${received} to be a valid hex color (e.g., #ffffff or #fff)`,
    };
  },
});

// ============================================================
// Global Test Utilities
// ============================================================

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Maximum wait time in ms
 * @param {number} interval - Check interval in ms
 */
global.waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Condition not met within timeout');
};

/**
 * Simulate a delay in tests
 * @param {number} ms - Delay in milliseconds
 */
global.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// Test Environment Info
// ============================================================

console.log('🧪 Jest test environment initialized');
console.log(`📦 Node version: ${process.version}`);
console.log(`🔧 Test environment: ${process.env.NODE_ENV || 'test'}`);

// TODO: Add more custom matchers specific to KitchenXpert domain
// TODO: Consider adding global test data factories (e.g., createMockProduct)
// TODO: Add MSW (Mock Service Worker) for API mocking if needed
