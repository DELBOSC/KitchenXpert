/**
 * Test Setup for Frontend Package
 * Configures Vitest with React Testing Library and global mocks
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Initialize i18n for all tests (loads French/English translations)
import '../i18n/i18n';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

// Mock IntersectionObserver
class IntersectionObserverMock {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock scroll
Element.prototype.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch
global.fetch = vi.fn();

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:4000/api/v1',
    MODE: 'test',
    DEV: false,
    PROD: false,
    SSR: false,
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7),
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Suppress console errors in tests (can be re-enabled per test)
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  sessionStorageMock.getItem.mockReturnValue(null);
});

// Clean up after each test
afterEach(() => {
  vi.clearAllTimers();
});

// Add custom matchers if needed
expect.extend({
  toHaveBeenCalledWithMatch(received: ReturnType<typeof vi.fn>, ...args: unknown[]) {
    const calls = received.mock.calls;
    const pass = calls.some((call) =>
      args.every((arg, index) => {
        if (typeof arg === 'object' && arg !== null) {
          return JSON.stringify(call[index]).includes(JSON.stringify(arg));
        }
        return call[index] === arg;
      })
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected function not to have been called with matching args`
          : `Expected function to have been called with matching args`,
    };
  },
});

// Declare custom matcher types
declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveBeenCalledWithMatch(...args: unknown[]): T;
  }
}
