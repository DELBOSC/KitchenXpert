/**
 * Tests for KitchenRenderer class
 * @file src/__tests__/renderer.test.ts
 */

import * as THREE from 'three';
import { KitchenRenderer, RendererConfig } from '../engine/renderer';

// Mock Three.js
jest.mock('three', () => {
  const mockDomElement = document.createElement('canvas');
  mockDomElement.toDataURL = jest.fn(() => 'data:image/png;base64,mockdata');

  return {
    WebGLRenderer: jest.fn().mockImplementation(() => ({
      domElement: mockDomElement,
      setPixelRatio: jest.fn(),
      setSize: jest.fn(),
      render: jest.fn(),
      dispose: jest.fn(),
      shadowMap: {
        enabled: false,
        type: 0,
      },
      toneMapping: 0,
      toneMappingExposure: 1,
      outputColorSpace: '',
    })),
    PCFSoftShadowMap: 2,
    ACESFilmicToneMapping: 4,
    SRGBColorSpace: 'srgb',
    Scene: jest.fn().mockImplementation(() => ({})),
    Camera: jest.fn().mockImplementation(() => ({})),
    // The renderer module instantiates Vector2/ShaderMaterial/etc. at
    // import time (the SSR shader uniforms). Provide minimal stubs so
    // the module loads without throwing.
    Vector2: jest.fn().mockImplementation((x = 0, y = 0) => ({ x, y, set: jest.fn() })),
    Vector3: jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({ x, y, z, set: jest.fn() })),
    ShaderMaterial: jest.fn().mockImplementation((opts) => ({ ...opts, dispose: jest.fn() })),
    Color: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
  };
});

describe('KitchenRenderer', () => {
  let renderer: KitchenRenderer;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock container
    mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(mockContainer, 'clientHeight', { value: 600, configurable: true });
    mockContainer.appendChild = jest.fn();
    mockContainer.removeChild = jest.fn();

    renderer = new KitchenRenderer(mockContainer);
  });

  afterEach(() => {
    renderer.dispose();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a WebGL renderer with default configuration', () => {
      expect(THREE.WebGLRenderer).toHaveBeenCalledWith({
        antialias: true,
        alpha: false,
      });
    });

    it('should create renderer with custom configuration', () => {
      const config: RendererConfig = {
        antialias: false,
        alpha: true,
      };

      const customRenderer = new KitchenRenderer(mockContainer, config);

      expect(THREE.WebGLRenderer).toHaveBeenCalledWith({
        antialias: false,
        alpha: true,
      });

      customRenderer.dispose();
    });

    it('should append canvas to container', () => {
      expect(mockContainer.appendChild).toHaveBeenCalledWith(renderer.renderer.domElement);
    });

    it('should set pixel ratio', () => {
      expect(renderer.renderer.setPixelRatio).toHaveBeenCalled();
    });

    it('should set size based on container dimensions', () => {
      expect(renderer.renderer.setSize).toHaveBeenCalledWith(800, 600);
    });

    it('should enable shadows when configured', () => {
      const config: RendererConfig = {
        shadowsEnabled: true,
        shadowMapType: THREE.PCFSoftShadowMap,
      };

      const shadowRenderer = new KitchenRenderer(mockContainer, config);

      expect(shadowRenderer.renderer.shadowMap.enabled).toBe(true);
      shadowRenderer.dispose();
    });

    it('should configure tone mapping', () => {
      const config: RendererConfig = {
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
      };

      const toneRenderer = new KitchenRenderer(mockContainer, config);

      expect(toneRenderer.renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
      expect(toneRenderer.renderer.toneMappingExposure).toBe(1.5);
      toneRenderer.dispose();
    });
  });

  describe('resize', () => {
    it('should resize renderer to container dimensions', () => {
      Object.defineProperty(mockContainer, 'clientWidth', { value: 1024 });
      Object.defineProperty(mockContainer, 'clientHeight', { value: 768 });

      renderer.resize();

      expect(renderer.renderer.setSize).toHaveBeenCalledWith(1024, 768);
    });
  });

  describe('startRenderLoop', () => {
    it('should start the render loop', () => {
      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.Camera();

      renderer.startRenderLoop(mockScene, mockCamera);

      // Advance timers to trigger animation frame
      jest.advanceTimersByTime(16);

      expect(renderer.renderer.render).toHaveBeenCalledWith(mockScene, mockCamera);
    });

    it('should call onBeforeRender callback if provided', () => {
      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.Camera();
      const onBeforeRender = jest.fn();

      renderer.startRenderLoop(mockScene, mockCamera, onBeforeRender);

      jest.advanceTimersByTime(16);

      expect(onBeforeRender).toHaveBeenCalled();
    });

    it('should not start multiple render loops', () => {
      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.Camera();

      renderer.startRenderLoop(mockScene, mockCamera);
      renderer.startRenderLoop(mockScene, mockCamera);

      jest.advanceTimersByTime(16);

      // Should render twice: 1 immediate call + 1 from rAF after 16ms
      // (not 3+, which would indicate duplicate loops)
      expect(renderer.renderer.render).toHaveBeenCalledTimes(2);
    });
  });

  describe('stopRenderLoop', () => {
    it('should stop the render loop', () => {
      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.Camera();

      renderer.startRenderLoop(mockScene, mockCamera);
      renderer.stopRenderLoop();

      const renderCallCount = (renderer.renderer.render as jest.Mock).mock.calls.length;

      jest.advanceTimersByTime(100);

      // No additional renders should occur
      expect(renderer.renderer.render).toHaveBeenCalledTimes(renderCallCount);
    });
  });

  describe('renderFrame', () => {
    it('should render a single frame', () => {
      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.Camera();

      renderer.renderFrame(mockScene, mockCamera);

      expect(renderer.renderer.render).toHaveBeenCalledWith(mockScene, mockCamera);
    });
  });

  describe('takeScreenshot', () => {
    it('should return data URL from canvas', () => {
      const screenshot = renderer.takeScreenshot();

      expect(screenshot).toBe('data:image/png;base64,mockdata');
    });

    it('should use specified mime type and quality', () => {
      renderer.takeScreenshot('image/jpeg', 0.8);

      expect(renderer.renderer.domElement.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    });
  });

  describe('setShadowsEnabled', () => {
    it('should enable shadows', () => {
      renderer.setShadowsEnabled(true);

      expect(renderer.renderer.shadowMap.enabled).toBe(true);
    });

    it('should disable shadows', () => {
      renderer.setShadowsEnabled(false);

      expect(renderer.renderer.shadowMap.enabled).toBe(false);
    });
  });

  describe('setToneMapping', () => {
    it('should set tone mapping and exposure', () => {
      renderer.setToneMapping(THREE.ACESFilmicToneMapping, 1.2);

      expect(renderer.renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
      expect(renderer.renderer.toneMappingExposure).toBe(1.2);
    });

    it('should use default exposure if not specified', () => {
      renderer.setToneMapping(THREE.ACESFilmicToneMapping);

      expect(renderer.renderer.toneMappingExposure).toBe(1.0);
    });
  });

  describe('getThreeRenderer', () => {
    it('should return the underlying WebGL renderer', () => {
      expect(renderer.getThreeRenderer()).toBe(renderer.renderer);
    });
  });

  describe('dispose', () => {
    it('should stop render loop', () => {
      const mockScene = new THREE.Scene();
      const mockCamera = new THREE.Camera();

      renderer.startRenderLoop(mockScene, mockCamera);
      renderer.dispose();

      const renderCallCount = (renderer.renderer.render as jest.Mock).mock.calls.length;
      jest.advanceTimersByTime(100);

      expect(renderer.renderer.render).toHaveBeenCalledTimes(renderCallCount);
    });

    it('should remove canvas from container', () => {
      // Simulate canvas being in container
      Object.defineProperty(renderer.renderer.domElement, 'parentElement', {
        value: mockContainer,
      });

      renderer.dispose();

      expect(mockContainer.removeChild).toHaveBeenCalledWith(renderer.renderer.domElement);
    });

    it('should dispose WebGL renderer', () => {
      renderer.dispose();

      expect(renderer.renderer.dispose).toHaveBeenCalled();
    });
  });

  describe('window resize handling', () => {
    it('should add resize event listener on construction', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      const newRenderer = new KitchenRenderer(mockContainer);

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      newRenderer.dispose();
      addEventListenerSpy.mockRestore();
    });

    it('should remove resize event listener on dispose', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      renderer.dispose();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });
});
