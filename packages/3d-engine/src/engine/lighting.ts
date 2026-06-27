import * as THREE from 'three';

/**
 * Configuration d'éclairage
 */
export interface LightingConfig {
  ambient?: {
    color?: number;
    intensity?: number;
  };
  directional?: {
    color?: number;
    intensity?: number;
    position?: [number, number, number];
    castShadow?: boolean;
  };
  hemisphere?: {
    skyColor?: number;
    groundColor?: number;
    intensity?: number;
  };
}

/**
 * Gestionnaire d'éclairage pour la scène de cuisine
 */
export class KitchenLighting {
  private lights: THREE.Light[] = [];
  private scene: THREE.Scene;
  private baseIntensities = new Map<THREE.Light, number>();

  constructor(scene: THREE.Scene, config: LightingConfig = {}) {
    this.scene = scene;
    this.setupLighting(config);
  }

  /**
   * Configure l'éclairage de la scène
   */
  private setupLighting(config: LightingConfig): void {
    // Lumière ambiante (éclairage global)
    if (config.ambient !== undefined) {
      const ambientColor = config.ambient?.color ?? 0xffffff;
      const ambientIntensity = config.ambient?.intensity ?? 0.6;
      const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
      ambientLight.name = 'ambient_light';
      this.addLight(ambientLight);
    } else {
      // Default ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      ambientLight.name = 'ambient_light';
      this.addLight(ambientLight);
    }

    // Lumière directionnelle (simule le soleil)
    if (config.directional !== undefined) {
      const dirColor = config.directional?.color ?? 0xffffff;
      const dirIntensity = config.directional?.intensity ?? 0.8;
      const dirLight = new THREE.DirectionalLight(dirColor, dirIntensity);

      // Position par défaut (soleil en haut à droite)
      const position = config.directional?.position ?? [10, 15, 10];
      dirLight.position.set(...position);

      // Configuration des ombres
      if (config.directional?.castShadow) {
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = -10;
        dirLight.shadow.bias = -0.001;
      }

      dirLight.name = 'directional_light';
      this.addLight(dirLight);
    } else {
      // Default directional light
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(10, 15, 10);
      dirLight.name = 'directional_light';
      this.addLight(dirLight);
    }

    // Lumière hémisphérique (ciel/sol)
    if (config.hemisphere !== undefined) {
      const skyColor = config.hemisphere?.skyColor ?? 0x87ceeb;
      const groundColor = config.hemisphere?.groundColor ?? 0x444444;
      const hemiIntensity = config.hemisphere?.intensity ?? 0.4;
      const hemiLight = new THREE.HemisphereLight(skyColor, groundColor, hemiIntensity);
      hemiLight.position.set(0, 20, 0);
      hemiLight.name = 'hemisphere_light';
      this.addLight(hemiLight);
    } else {
      // Default hemisphere light
      const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4);
      hemiLight.position.set(0, 20, 0);
      hemiLight.name = 'hemisphere_light';
      this.addLight(hemiLight);
    }
  }

  /**
   * Ajoute une lumière personnalisée
   */
  addLight(light: THREE.Light): void {
    this.lights.push(light);
    this.scene.add(light);
  }

  /**
   * Supprime une lumière par nom
   */
  removeLight(name: string): boolean {
    const index = this.lights.findIndex((light) => light.name === name);
    if (index !== -1) {
      const light = this.lights[index];
      if (light) {
        this.scene.remove(light);
      }
      this.lights.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Récupère une lumière par nom
   */
  getLight(name: string): THREE.Light | undefined {
    return this.lights.find((light) => light.name === name);
  }

  /**
   * Change l'intensite d'une lumiere par nom
   */
  setIntensity(name: string, intensity: number): void {
    const light = this.lights.find((l) => l.name === name || l.name === `${name}_light`);
    if (light) {
      light.intensity = intensity;
    }
  }

  /**
   * Active/désactive toutes les ombres
   */
  setShadowsEnabled(enabled: boolean): void {
    this.lights.forEach((light) => {
      if (
        light instanceof THREE.DirectionalLight ||
        light instanceof THREE.SpotLight ||
        light instanceof THREE.PointLight
      ) {
        light.castShadow = enabled;
      }
    });
  }

  /**
   * Ajuste l'intensité globale de l'éclairage
   */
  setGlobalIntensity(factor: number): void {
    this.scene.traverse((child) => {
      if (child instanceof THREE.Light) {
        if (!this.baseIntensities.has(child)) {
          this.baseIntensities.set(child, child.intensity);
        }
        child.intensity = (this.baseIntensities.get(child) || 1) * factor;
      }
    });
  }

  /**
   * Dispose toutes les lumières
   */
  dispose(): void {
    this.lights.forEach((light) => {
      this.scene.remove(light);
    });
    this.lights = [];
  }
}
