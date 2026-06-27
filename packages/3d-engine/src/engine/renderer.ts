import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * Custom Screen-Space Reflections (SSR) shader for realistic reflections
 * on stainless steel appliances, glass, and polished countertops.
 *
 * Uses a simplified ray-marching approach in screen space:
 * - Samples the depth buffer to determine surface positions
 * - Reflects the view direction against the surface normal
 * - Marches along the reflected ray in screen space to find intersections
 * - Blends the reflected color with the original surface color
 */
const SSRShader: THREE.ShaderMaterial['defines'] & {
  uniforms: Record<string, THREE.IUniform>;
  vertexShader: string;
  fragmentShader: string;
} = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 100.0 },
    thickness: { value: 0.018 },
    maxDistance: { value: 0.3 },
    opacity: { value: 0.5 },
    maxSteps: { value: 50 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float thickness;
    uniform float maxDistance;
    uniform float opacity;
    uniform int maxSteps;
    varying vec2 vUv;

    float linearizeDepth(float depth) {
      float z = depth * 2.0 - 1.0;
      return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float depth = texture2D(tDepth, vUv).r;
      float linearDepth = linearizeDepth(depth);

      // Skip background pixels (very far depth)
      if (depth >= 1.0) {
        gl_FragColor = color;
        return;
      }

      // Compute reflection direction in screen space
      // Use the gradient of depth to approximate the surface normal
      float dDepthX = linearizeDepth(texture2D(tDepth, vUv + vec2(1.0 / resolution.x, 0.0)).r) - linearDepth;
      float dDepthY = linearizeDepth(texture2D(tDepth, vUv + vec2(0.0, 1.0 / resolution.y)).r) - linearDepth;

      // Approximate screen-space normal from depth gradient
      vec3 normal = normalize(vec3(-dDepthX, -dDepthY, 1.0 / resolution.x));

      // View direction in screen space (simplified)
      vec3 viewDir = vec3(0.0, 0.0, -1.0);
      vec3 reflectDir = reflect(viewDir, normal);

      // March along the reflection direction in screen space
      vec2 reflectUV = reflectDir.xy * 0.5;
      vec2 marchUV = vUv;
      float marchDepth = linearDepth;
      vec4 reflectedColor = vec4(0.0);
      float reflectionWeight = 0.0;

      float stepSize = maxDistance / float(maxSteps);

      for (int i = 0; i < 50; i++) {
        if (i >= maxSteps) break;

        marchUV += reflectUV * stepSize;
        marchDepth += reflectDir.z * stepSize * cameraFar * 0.1;

        // Check bounds
        if (marchUV.x < 0.0 || marchUV.x > 1.0 || marchUV.y < 0.0 || marchUV.y > 1.0) {
          break;
        }

        float sampledDepth = linearizeDepth(texture2D(tDepth, marchUV).r);
        float depthDiff = marchDepth - sampledDepth;

        // Hit detection: the marched ray is behind a surface within thickness tolerance
        if (depthDiff > 0.0 && depthDiff < thickness * cameraFar) {
          reflectedColor = texture2D(tDiffuse, marchUV);
          // Fade based on distance traveled
          float fadeFactor = 1.0 - float(i) / float(maxSteps);
          reflectionWeight = fadeFactor * opacity;
          break;
        }
      }

      // Blend reflection with original color
      gl_FragColor = mix(color, reflectedColor, reflectionWeight);
    }
  `,
};

/**
 * Render quality level
 */
export type RenderQuality = 'low' | 'medium' | 'high';

/**
 * Configuration du renderer
 */
export interface RendererConfig {
  antialias?: boolean;
  alpha?: boolean;
  shadowsEnabled?: boolean;
  shadowMapType?: THREE.ShadowMapType;
  pixelRatio?: number;
  toneMapping?: THREE.ToneMapping;
  toneMappingExposure?: number;
}

/**
 * Gestionnaire de rendu 3D
 */
export class KitchenRenderer {
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private animationFrameId?: number;
  private isRendering: boolean = false;
  private activeCamera: THREE.Camera | null = null;

  // Post-processing
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private ssrPass: ShaderPass | null = null;
  private ssrEnabled: boolean = false;
  private bloomPass: UnrealBloomPass | null = null;
  private postProcessingEnabled: boolean = false;
  private currentScene: THREE.Scene | null = null;
  private depthRenderTarget: THREE.WebGLRenderTarget | null = null;
  private depthMaterial: THREE.MeshDepthMaterial | null = null;

  constructor(container: HTMLElement, config: RendererConfig = {}) {
    this.container = container;

    // Configuration par défaut
    const rendererConfig = {
      antialias: config.antialias !== undefined ? config.antialias : true,
      alpha: config.alpha !== undefined ? config.alpha : false,
    };

    this.renderer = new THREE.WebGLRenderer(rendererConfig);

    // Configuration du renderer
    this.setupRenderer(config);

    // Ajouter le canvas au container
    this.container.appendChild(this.renderer.domElement);

    // Redimensionner au bon format
    this.resize();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);

    // Handle WebGL context loss
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
  }

  /**
   * Configure le renderer avec les paramètres
   */
  private setupRenderer(config: RendererConfig): void {
    // Pixel ratio pour les écrans haute résolution
    const pixelRatio = config.pixelRatio || Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);

    // Shadows
    if (config.shadowsEnabled) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = config.shadowMapType || THREE.PCFSoftShadowMap;
    }

    // Tone mapping pour un rendu plus réaliste
    this.renderer.toneMapping = config.toneMapping || THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = config.toneMappingExposure || 1.0;

    // Output encoding pour les couleurs correctes
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  /**
   * Initialise le post-processing pipeline (EffectComposer, SSAO, Bloom)
   */
  initPostProcessing(scene: THREE.Scene, camera: THREE.Camera): void {
    this.currentScene = scene;

    // Dispose existing depth render target before recreation to prevent memory leak
    if (this.depthRenderTarget) {
      this.depthRenderTarget.dispose();
      this.depthRenderTarget = null;
    }

    // Create effect composer
    this.composer = new EffectComposer(this.renderer);

    // Render pass — renders the scene normally as the first pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // SSAO pass — subtle ambient occlusion
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.ssaoPass = new SSAOPass(scene, camera, width, height);
    this.ssaoPass.kernelRadius = 0.5;
    this.ssaoPass.minDistance = 0.005;
    this.ssaoPass.maxDistance = 0.1;
    this.composer.addPass(this.ssaoPass);

    // SSR pass — screen-space reflections for stainless steel, glass, polished countertops
    this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.FloatType,
    });
    this.depthMaterial = new THREE.MeshDepthMaterial();
    this.depthMaterial.depthPacking = THREE.RGBADepthPacking;

    this.ssrPass = new ShaderPass(SSRShader);
    this.ssrPass.uniforms['resolution']!.value.set(width, height);
    this.ssrPass.uniforms['thickness']!.value = 0.018;
    this.ssrPass.uniforms['maxDistance']!.value = 0.3;
    this.ssrPass.uniforms['opacity']!.value = 0.5;
    if ((camera as THREE.PerspectiveCamera).near !== undefined) {
      this.ssrPass.uniforms['cameraNear']!.value = (camera as THREE.PerspectiveCamera).near;
      this.ssrPass.uniforms['cameraFar']!.value = (camera as THREE.PerspectiveCamera).far;
    }
    this.ssrPass.enabled = this.ssrEnabled;
    this.composer.addPass(this.ssrPass);

    // Bloom pass — low intensity for metallic/glass highlights
    const resolution = new THREE.Vector2(width, height);
    this.bloomPass = new UnrealBloomPass(resolution, 0.2, 0.4, 0.85);
    this.composer.addPass(this.bloomPass);
  }

  /**
   * Active ou desactive le post-processing
   */
  setPostProcessingEnabled(enabled: boolean): void {
    this.postProcessingEnabled = enabled;
  }

  /**
   * Active ou desactive le SSR (Screen-Space Reflections) pass
   */
  setSSREnabled(enabled: boolean): void {
    this.ssrEnabled = enabled;
    if (this.ssrPass) {
      this.ssrPass.enabled = enabled;
    }
  }

  /**
   * Retourne si le SSR est actif
   */
  isSSREnabled(): boolean {
    return this.ssrEnabled;
  }

  /**
   * Retourne si le post-processing est actif
   */
  isPostProcessingEnabled(): boolean {
    return this.postProcessingEnabled;
  }

  /**
   * Ajuste les parametres de post-processing selon le niveau de qualite
   */
  setRenderQuality(quality: RenderQuality): void {
    if (!this.ssaoPass || !this.bloomPass) return;

    switch (quality) {
      case 'low':
        this.ssaoPass.kernelRadius = 0.3;
        this.ssaoPass.minDistance = 0.01;
        this.ssaoPass.maxDistance = 0.15;
        this.bloomPass.strength = 0.1;
        this.bloomPass.radius = 0.2;
        this.bloomPass.threshold = 0.9;
        // SSR disabled in low quality for performance
        this.setSSREnabled(false);
        break;
      case 'medium':
        this.ssaoPass.kernelRadius = 0.5;
        this.ssaoPass.minDistance = 0.005;
        this.ssaoPass.maxDistance = 0.1;
        this.bloomPass.strength = 0.2;
        this.bloomPass.radius = 0.4;
        this.bloomPass.threshold = 0.85;
        // SSR subtle in medium quality
        this.setSSREnabled(true);
        if (this.ssrPass) {
          this.ssrPass.uniforms['opacity']!.value = 0.25;
          this.ssrPass.uniforms['maxDistance']!.value = 0.15;
          this.ssrPass.uniforms['maxSteps']!.value = 30;
        }
        break;
      case 'high':
        this.ssaoPass.kernelRadius = 0.8;
        this.ssaoPass.minDistance = 0.002;
        this.ssaoPass.maxDistance = 0.08;
        this.bloomPass.strength = 0.3;
        this.bloomPass.radius = 0.5;
        this.bloomPass.threshold = 0.8;
        // SSR full in high quality
        this.setSSREnabled(true);
        if (this.ssrPass) {
          this.ssrPass.uniforms['opacity']!.value = 0.5;
          this.ssrPass.uniforms['maxDistance']!.value = 0.3;
          this.ssrPass.uniforms['maxSteps']!.value = 50;
        }
        break;
    }
  }

  /**
   * Redimensionne le renderer
   */
  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);

    // Resize post-processing composer
    if (this.composer) {
      this.composer.setSize(width, height);
    }

    // Resize SSR depth render target and update resolution uniform
    if (this.depthRenderTarget) {
      this.depthRenderTarget.setSize(width, height);
    }
    if (this.ssrPass) {
      this.ssrPass.uniforms['resolution']!.value.set(width, height);
    }
  }

  /**
   * Handler pour le redimensionnement de fenêtre
   */
  private handleResize = (): void => {
    this.resize();
  };

  /**
   * Handler for WebGL context loss events
   */
  private handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.isRendering = false;
    console.error('KitchenRenderer: WebGL context lost');
  };

  /**
   * Change la camera active pour le rendu (perspective / orthographique)
   */
  setActiveCamera(camera: THREE.Camera): void {
    this.activeCamera = camera;
  }

  /**
   * Retourne la camera active
   */
  getActiveCamera(): THREE.Camera | null {
    return this.activeCamera;
  }

  /**
   * Démarre la boucle de rendu
   */
  startRenderLoop(scene: THREE.Scene, camera: THREE.Camera, onBeforeRender?: () => void): void {
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.activeCamera = camera;
    this.currentScene = scene;

    // Initialize post-processing only when enabled and not already done
    if (this.postProcessingEnabled && !this.composer) {
      this.initPostProcessing(scene, camera);
    }

    const animate = (): void => {
      if (!this.isRendering) {
        return;
      }

      this.animationFrameId = requestAnimationFrame(animate);

      // Callback avant le rendu
      if (onBeforeRender) {
        onBeforeRender();
      }

      const currentCamera = this.activeCamera || camera;

      // Update render pass camera when camera changes
      if (this.renderPass) {
        this.renderPass.camera = currentCamera;
      }

      // Update SSR depth texture when SSR is enabled
      if (
        this.ssrPass?.enabled &&
        this.depthRenderTarget &&
        this.depthMaterial &&
        this.currentScene
      ) {
        const originalOverrideMaterial = this.currentScene.overrideMaterial;
        this.currentScene.overrideMaterial = this.depthMaterial;
        this.renderer.setRenderTarget(this.depthRenderTarget);
        this.renderer.render(this.currentScene, currentCamera);
        this.renderer.setRenderTarget(null);
        this.currentScene.overrideMaterial = originalOverrideMaterial;
        this.ssrPass.uniforms['tDepth']!.value = this.depthRenderTarget.texture;

        // Update camera uniforms
        if ((currentCamera as THREE.PerspectiveCamera).near !== undefined) {
          this.ssrPass.uniforms['cameraNear']!.value = (
            currentCamera as THREE.PerspectiveCamera
          ).near;
          this.ssrPass.uniforms['cameraFar']!.value = (
            currentCamera as THREE.PerspectiveCamera
          ).far;
        }
      }

      // Use post-processing composer when enabled, otherwise standard render
      if (this.postProcessingEnabled && this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(scene, currentCamera);
      }
    };

    animate();
  }

  /**
   * Arrête la boucle de rendu
   */
  stopRenderLoop(): void {
    this.isRendering = false;
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  /**
   * Rendu d'une seule frame (sans boucle)
   */
  renderFrame(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.postProcessingEnabled && this.composer) {
      if (this.renderPass) {
        this.renderPass.camera = camera;
      }

      // Generate depth texture for SSR when enabled
      if (this.ssrPass?.enabled && this.depthRenderTarget && this.depthMaterial) {
        const originalOverrideMaterial = scene.overrideMaterial;
        scene.overrideMaterial = this.depthMaterial;
        this.renderer.setRenderTarget(this.depthRenderTarget);
        this.renderer.render(scene, camera);
        this.renderer.setRenderTarget(null);
        scene.overrideMaterial = originalOverrideMaterial;
        this.ssrPass.uniforms['tDepth']!.value = this.depthRenderTarget.texture;

        if ((camera as THREE.PerspectiveCamera).near !== undefined) {
          this.ssrPass.uniforms['cameraNear']!.value = (camera as THREE.PerspectiveCamera).near;
          this.ssrPass.uniforms['cameraFar']!.value = (camera as THREE.PerspectiveCamera).far;
        }
      }

      this.composer.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  /**
   * Prend un screenshot de la scène
   */
  takeScreenshot(mimeType: string = 'image/png', quality: number = 1.0): string {
    return this.renderer.domElement.toDataURL(mimeType, quality);
  }

  /**
   * Active/désactive les ombres
   */
  setShadowsEnabled(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
  }

  /**
   * Change le tone mapping
   */
  setToneMapping(toneMapping: THREE.ToneMapping, exposure: number = 1.0): void {
    this.renderer.toneMapping = toneMapping;
    this.renderer.toneMappingExposure = exposure;
  }

  /**
   * Récupère le renderer Three.js natif
   */
  getThreeRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Dispose proprement le renderer
   */
  dispose(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);

    // Dispose post-processing resources
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    this.renderPass = null;
    this.ssaoPass = null;
    this.ssrPass = null;
    this.bloomPass = null;
    this.currentScene = null;

    // Dispose SSR resources
    if (this.depthRenderTarget) {
      this.depthRenderTarget.dispose();
      this.depthRenderTarget = null;
    }
    if (this.depthMaterial) {
      this.depthMaterial.dispose();
      this.depthMaterial = null;
    }

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.renderer.dispose();
  }
}
