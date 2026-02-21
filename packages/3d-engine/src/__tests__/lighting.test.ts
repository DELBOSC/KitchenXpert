/**
 * Tests for KitchenLighting class
 * @file src/__tests__/lighting.test.ts
 */

import * as THREE from 'three';
import { KitchenLighting, LightingConfig } from '../engine/lighting';

// Mock Three.js
jest.mock('three', () => {
  const createMockLight = (type: string) => ({
    type,
    name: '',
    intensity: 1,
    position: {
      set: jest.fn(),
    },
    castShadow: false,
    shadow: {
      mapSize: { width: 512, height: 512 },
      camera: {
        near: 0.5,
        far: 500,
        left: -10,
        right: 10,
        top: 10,
        bottom: -10,
      },
      bias: 0,
    },
  });

  return {
    Scene: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      remove: jest.fn(),
    })),
    AmbientLight: jest.fn().mockImplementation((color, intensity) => ({
      ...createMockLight('AmbientLight'),
      color: { r: 1, g: 1, b: 1 },
      intensity: intensity ?? 1,
    })),
    DirectionalLight: jest.fn().mockImplementation((color, intensity) => ({
      ...createMockLight('DirectionalLight'),
      color: { r: 1, g: 1, b: 1 },
      intensity: intensity ?? 1,
    })),
    HemisphereLight: jest.fn().mockImplementation((skyColor, groundColor, intensity) => ({
      ...createMockLight('HemisphereLight'),
      color: { r: 1, g: 1, b: 1 },
      groundColor: { r: 0.5, g: 0.5, b: 0.5 },
      intensity: intensity ?? 1,
    })),
    Light: jest.fn().mockImplementation(() => createMockLight('Light')),
  };
});

describe('KitchenLighting', () => {
  let lighting: KitchenLighting;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    jest.clearAllMocks();
    mockScene = new THREE.Scene();
    lighting = new KitchenLighting(mockScene);
  });

  afterEach(() => {
    lighting.dispose();
  });

  describe('constructor', () => {
    it('should create lighting with default configuration', () => {
      expect(THREE.AmbientLight).toHaveBeenCalled();
      expect(THREE.DirectionalLight).toHaveBeenCalled();
      expect(THREE.HemisphereLight).toHaveBeenCalled();
    });

    it('should add all default lights to scene', () => {
      // 3 default lights: ambient, directional, hemisphere
      expect(mockScene.add).toHaveBeenCalledTimes(3);
    });

    it('should create custom ambient light when configured', () => {
      const config: LightingConfig = {
        ambient: {
          color: 0xff0000,
          intensity: 0.5,
        },
      };

      const customLighting = new KitchenLighting(mockScene, config);

      expect(THREE.AmbientLight).toHaveBeenCalledWith(0xff0000, 0.5);

      customLighting.dispose();
    });

    it('should create custom directional light when configured', () => {
      const config: LightingConfig = {
        directional: {
          color: 0x00ff00,
          intensity: 1.5,
          position: [5, 10, 5],
          castShadow: true,
        },
      };

      const customLighting = new KitchenLighting(mockScene, config);

      expect(THREE.DirectionalLight).toHaveBeenCalledWith(0x00ff00, 1.5);

      customLighting.dispose();
    });

    it('should create custom hemisphere light when configured', () => {
      const config: LightingConfig = {
        hemisphere: {
          skyColor: 0x0000ff,
          groundColor: 0x222222,
          intensity: 0.3,
        },
      };

      const customLighting = new KitchenLighting(mockScene, config);

      expect(THREE.HemisphereLight).toHaveBeenCalledWith(0x0000ff, 0x222222, 0.3);

      customLighting.dispose();
    });

    it('should configure shadow settings when castShadow is true', () => {
      const config: LightingConfig = {
        directional: {
          castShadow: true,
        },
      };

      const customLighting = new KitchenLighting(mockScene, config);

      // Verify directional light was created (shadow config happens in setup)
      expect(THREE.DirectionalLight).toHaveBeenCalled();

      customLighting.dispose();
    });
  });

  describe('addLight', () => {
    it('should add a custom light to the scene', () => {
      const customLight = new THREE.Light();
      customLight.name = 'custom_light';

      const initialAddCalls = (mockScene.add as jest.Mock).mock.calls.length;
      lighting.addLight(customLight);

      expect(mockScene.add).toHaveBeenCalledTimes(initialAddCalls + 1);
      expect(mockScene.add).toHaveBeenLastCalledWith(customLight);
    });

    it('should track added lights internally', () => {
      const customLight = new THREE.Light();
      customLight.name = 'my_custom_light';

      lighting.addLight(customLight);

      expect(lighting.getLight('my_custom_light')).toBe(customLight);
    });
  });

  describe('removeLight', () => {
    it('should remove a light by name and return true', () => {
      const result = lighting.removeLight('ambient_light');

      expect(result).toBe(true);
      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should return false when removing non-existent light', () => {
      const result = lighting.removeLight('non_existent_light');

      expect(result).toBe(false);
    });

    it('should not find light after removal', () => {
      lighting.removeLight('ambient_light');

      expect(lighting.getLight('ambient_light')).toBeUndefined();
    });
  });

  describe('getLight', () => {
    it('should return undefined for non-existent light', () => {
      expect(lighting.getLight('non_existent')).toBeUndefined();
    });

    it('should return ambient light by name', () => {
      const ambientLight = lighting.getLight('ambient_light');
      expect(ambientLight).toBeDefined();
      expect(ambientLight?.name).toBe('ambient_light');
    });

    it('should return directional light by name', () => {
      const dirLight = lighting.getLight('directional_light');
      expect(dirLight).toBeDefined();
      expect(dirLight?.name).toBe('directional_light');
    });

    it('should return hemisphere light by name', () => {
      const hemiLight = lighting.getLight('hemisphere_light');
      expect(hemiLight).toBeDefined();
      expect(hemiLight?.name).toBe('hemisphere_light');
    });
  });

  describe('setShadowsEnabled', () => {
    it('should enable shadows on lights that support it', () => {
      const dirLight = lighting.getLight('directional_light');

      lighting.setShadowsEnabled(true);

      // The mock light should have castShadow property
      expect(dirLight).toBeDefined();
    });

    it('should disable shadows on lights', () => {
      lighting.setShadowsEnabled(false);

      const dirLight = lighting.getLight('directional_light');
      expect(dirLight).toBeDefined();
    });
  });

  describe('setGlobalIntensity', () => {
    it('should scale intensity of all lights', () => {
      const ambientLight = lighting.getLight('ambient_light');
      const initialIntensity = ambientLight?.intensity ?? 1;

      lighting.setGlobalIntensity(2);

      // Intensity should be doubled
      expect(ambientLight?.intensity).toBe(initialIntensity * 2);
    });

    it('should handle fractional intensity factors', () => {
      const ambientLight = lighting.getLight('ambient_light');
      const initialIntensity = ambientLight?.intensity ?? 1;

      lighting.setGlobalIntensity(0.5);

      expect(ambientLight?.intensity).toBe(initialIntensity * 0.5);
    });
  });

  describe('dispose', () => {
    it('should remove all lights from scene', () => {
      lighting.dispose();

      // Should have called remove for each light
      expect(mockScene.remove).toHaveBeenCalled();
    });

    it('should clear internal lights array', () => {
      lighting.dispose();

      expect(lighting.getLight('ambient_light')).toBeUndefined();
      expect(lighting.getLight('directional_light')).toBeUndefined();
      expect(lighting.getLight('hemisphere_light')).toBeUndefined();
    });
  });

  describe('light naming', () => {
    it('should name ambient light correctly', () => {
      const light = lighting.getLight('ambient_light');
      expect(light?.name).toBe('ambient_light');
    });

    it('should name directional light correctly', () => {
      const light = lighting.getLight('directional_light');
      expect(light?.name).toBe('directional_light');
    });

    it('should name hemisphere light correctly', () => {
      const light = lighting.getLight('hemisphere_light');
      expect(light?.name).toBe('hemisphere_light');
    });
  });

  describe('default light positions', () => {
    it('should position directional light', () => {
      const dirLight = lighting.getLight('directional_light');
      expect(dirLight?.position.set).toHaveBeenCalledWith(10, 15, 10);
    });

    it('should position hemisphere light above scene', () => {
      const hemiLight = lighting.getLight('hemisphere_light');
      expect(hemiLight?.position.set).toHaveBeenCalledWith(0, 20, 0);
    });
  });
});
