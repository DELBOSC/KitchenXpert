/**
 * Jest setup for 3D Engine tests
 * Mocks browser APIs and Three.js components
 */

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16) as unknown as number;
});

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
  writable: true,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock WebGLRenderingContext
const mockWebGLContext = {
  getExtension: jest.fn(),
  getParameter: jest.fn(() => 16),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  viewport: jest.fn(),
  createProgram: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  useProgram: jest.fn(),
  createTexture: jest.fn(),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  getAttribLocation: jest.fn(() => 0),
  getUniformLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  uniform1i: jest.fn(),
  uniform1f: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  deleteBuffer: jest.fn(),
  deleteTexture: jest.fn(),
  deleteProgram: jest.fn(),
  deleteShader: jest.fn(),
  canvas: {
    width: 800,
    height: 600,
  },
};

// Mock CanvasRenderingContext2D for sprite rendering
const mock2DContext = {
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillText: jest.fn(),
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  measureText: jest.fn(() => ({ width: 10 })),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  drawImage: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  setTransform: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1,
  })),
  putImageData: jest.fn(),
  canvas: { width: 64, height: 64 },
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: '',
  textBaseline: '',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineCap: 'butt',
  lineJoin: 'miter',
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(function (contextType: string) {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return mockWebGLContext;
  }
  if (contextType === '2d') {
    return mock2DContext;
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock toDataURL for screenshots
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockdata');

// Extend Jest matchers if needed
expect.extend({
  toBeNearVector3(
    received: { x: number; y: number; z: number },
    expected: { x: number; y: number; z: number },
    precision = 0.0001
  ) {
    const pass =
      Math.abs(received.x - expected.x) < precision &&
      Math.abs(received.y - expected.y) < precision &&
      Math.abs(received.z - expected.z) < precision;

    if (pass) {
      return {
        message: () =>
          `expected (${received.x}, ${received.y}, ${received.z}) not to be near (${expected.x}, ${expected.y}, ${expected.z})`,
        pass: true,
      };
    }
    return {
      message: () =>
        `expected (${received.x}, ${received.y}, ${received.z}) to be near (${expected.x}, ${expected.y}, ${expected.z})`,
      pass: false,
    };
  },
});

// Suppress console warnings from Three.js in tests
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const message = args[0];
  if (typeof message === 'string' && message.includes('THREE')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};
