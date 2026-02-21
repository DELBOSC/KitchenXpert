import * as THREE from 'three';

/**
 * Options for the PathTracerPreview
 */
export interface PathTracerOptions {
  /** Maximum number of accumulated samples. Default: 64 */
  maxSamples?: number;
  /** Resolution multiplier relative to the canvas size. Default: 1.0 */
  resolution?: number;
  /** Enable depth-of-field simulation. Default: false */
  depthOfField?: boolean;
  /** Focal length for DOF (distance to focus plane in world units). Default: 5.0 */
  focalLength?: number;
  /** Aperture size for DOF effect (larger = more blur). Default: 0.02 */
  aperture?: number;
  /** Called after each sample with progress (0 to 1) */
  onProgress?: (progress: number) => void;
  /** Called when all samples are accumulated, with a data URL of the result */
  onComplete?: (dataUrl: string) => void;
}

/**
 * Quality presets for the path tracer preview
 */
export type PathTracerQuality = 'preview' | 'standard' | 'high';

/**
 * Blend shader for progressive accumulation.
 *
 * Each new sample is blended into the accumulation buffer using:
 *   result = mix(accumulated, newSample, 1 / (sampleCount + 1))
 *
 * This produces a running average that converges as more samples are added.
 */
const AccumulationBlendShader = {
  uniforms: {
    tAccum: { value: null as THREE.Texture | null },
    tNew: { value: null as THREE.Texture | null },
    sampleWeight: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tAccum;
    uniform sampler2D tNew;
    uniform float sampleWeight;
    varying vec2 vUv;
    void main() {
      vec4 accumColor = texture2D(tAccum, vUv);
      vec4 newColor = texture2D(tNew, vUv);
      gl_FragColor = mix(accumColor, newColor, sampleWeight);
    }
  `,
};

/**
 * Progressive path-tracer preview mode.
 *
 * Produces photorealistic renders by accumulating multiple jittered samples
 * of the scene over time. Each sample introduces sub-pixel camera jitter
 * (for anti-aliasing) and optional lens jitter (for depth-of-field).
 *
 * The accumulation uses a ping-pong buffer strategy:
 * 1. Render the scene with a jittered camera to a temporary target
 * 2. Blend the temporary target into the accumulation buffer
 * 3. Copy the blend result back to the accumulation buffer
 * 4. Repeat until maxSamples is reached
 *
 * Usage:
 * ```ts
 * const pathTracer = new PathTracerPreview(renderer, {
 *   maxSamples: 128,
 *   depthOfField: true,
 *   focalLength: 5,
 *   aperture: 0.03,
 *   onProgress: (p) => console.log(`${(p * 100).toFixed(0)}%`),
 *   onComplete: (url) => { downloadImage(url); },
 * });
 *
 * pathTracer.startRender(scene, camera);
 * // ... in render loop: pathTracer renders automatically via rAF
 * // pathTracer.stopRender() to cancel early
 * ```
 */
export class PathTracerPreview {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  // Render targets for ping-pong accumulation
  private accumBufferA: THREE.WebGLRenderTarget | null = null;
  private accumBufferB: THREE.WebGLRenderTarget | null = null;
  private sampleTarget: THREE.WebGLRenderTarget | null = null;

  // Blend pass resources
  private blendMaterial: THREE.ShaderMaterial | null = null;
  private blendScene: THREE.Scene | null = null;
  private blendCamera: THREE.OrthographicCamera | null = null;
  private blendQuad: THREE.Mesh | null = null;

  // Copy pass to display result
  private copyMaterial: THREE.MeshBasicMaterial | null = null;
  private copyScene: THREE.Scene | null = null;
  private copyQuad: THREE.Mesh | null = null;

  private sampleCount: number = 0;
  private maxSamples: number = 64;
  private resolutionMultiplier: number = 1.0;
  private isRenderingActive: boolean = false;
  private animationFrameId: number | null = null;

  // Depth of field settings
  private depthOfFieldEnabled: boolean = false;
  private focalLength: number = 5.0;
  private aperture: number = 0.02;

  // Callbacks
  private onProgressCallback?: (progress: number) => void;
  private onCompleteCallback?: (dataUrl: string) => void;

  // Store original camera state to restore after rendering
  private originalCameraMatrix: THREE.Matrix4 | null = null;

  constructor(renderer: THREE.WebGLRenderer, options?: PathTracerOptions) {
    this.renderer = renderer;

    if (options) {
      this.maxSamples = options.maxSamples ?? 64;
      this.resolutionMultiplier = options.resolution ?? 1.0;
      this.depthOfFieldEnabled = options.depthOfField ?? false;
      this.focalLength = options.focalLength ?? 5.0;
      this.aperture = options.aperture ?? 0.02;
      this.onProgressCallback = options.onProgress;
      this.onCompleteCallback = options.onComplete;
    }
  }

  /**
   * Start progressive rendering. Each frame adds a sample with slight
   * camera jitter for anti-aliasing and an optional DOF effect.
   * Accumulates over multiple frames until maxSamples is reached.
   */
  startRender(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.isRenderingActive) {
      this.stopRender();
    }

    this.scene = scene;
    this.camera = camera;
    this.sampleCount = 0;
    this.isRenderingActive = true;

    // Save original camera projection matrix
    this.originalCameraMatrix = camera.projectionMatrix.clone();

    // Initialize render targets at the desired resolution
    const canvas = this.renderer.domElement;
    const width = Math.floor(canvas.width * this.resolutionMultiplier);
    const height = Math.floor(canvas.height * this.resolutionMultiplier);

    const targetParams: THREE.WebGLRenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    };

    this.accumBufferA = new THREE.WebGLRenderTarget(
      width,
      height,
      targetParams
    );
    this.accumBufferB = new THREE.WebGLRenderTarget(
      width,
      height,
      targetParams
    );
    this.sampleTarget = new THREE.WebGLRenderTarget(
      width,
      height,
      targetParams
    );

    // Create the blend pass (full-screen quad with accumulation shader)
    this.blendMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AccumulationBlendShader.uniforms),
      vertexShader: AccumulationBlendShader.vertexShader,
      fragmentShader: AccumulationBlendShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.blendScene = new THREE.Scene();
    this.blendCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const blendGeometry = new THREE.PlaneGeometry(2, 2);
    this.blendQuad = new THREE.Mesh(blendGeometry, this.blendMaterial);
    this.blendScene.add(this.blendQuad);

    // Create the copy pass to display the result on screen
    this.copyMaterial = new THREE.MeshBasicMaterial({ map: null });
    this.copyScene = new THREE.Scene();
    this.copyQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.copyMaterial
    );
    this.copyScene.add(this.copyQuad);

    // Start the accumulation loop
    this.renderNextSample();
  }

  /**
   * Stop rendering and return the current accumulated result as a data URL.
   */
  stopRender(): string {
    this.isRenderingActive = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Restore original camera projection matrix
    if (this.camera && this.originalCameraMatrix) {
      this.camera.projectionMatrix.copy(this.originalCameraMatrix);
      this.originalCameraMatrix = null;
    }

    // Read the current accumulation buffer to a data URL
    const dataUrl = this.readAccumulationBuffer();

    return dataUrl;
  }

  /**
   * Get current render progress (0 to 1)
   */
  get progress(): number {
    return this.maxSamples > 0
      ? Math.min(this.sampleCount / this.maxSamples, 1)
      : 0;
  }

  /**
   * Check if the path tracer is currently rendering
   */
  get isRendering(): boolean {
    return this.isRenderingActive;
  }

  /**
   * Configure render quality
   */
  setQuality(quality: PathTracerQuality): void {
    switch (quality) {
      case 'preview':
        this.maxSamples = 16;
        break;
      case 'standard':
        this.maxSamples = 64;
        break;
      case 'high':
        this.maxSamples = 256;
        break;
    }
  }

  /**
   * Update options dynamically (only takes effect on next startRender)
   */
  setOptions(options: Partial<PathTracerOptions>): void {
    if (options.maxSamples !== undefined) this.maxSamples = options.maxSamples;
    if (options.resolution !== undefined)
      this.resolutionMultiplier = options.resolution;
    if (options.depthOfField !== undefined)
      this.depthOfFieldEnabled = options.depthOfField;
    if (options.focalLength !== undefined)
      this.focalLength = options.focalLength;
    if (options.aperture !== undefined) this.aperture = options.aperture;
    if (options.onProgress !== undefined)
      this.onProgressCallback = options.onProgress;
    if (options.onComplete !== undefined)
      this.onCompleteCallback = options.onComplete;
  }

  /**
   * Render the next sample and schedule the following one.
   * Uses requestAnimationFrame for non-blocking progressive rendering.
   */
  private renderNextSample = (): void => {
    if (
      !this.isRenderingActive ||
      !this.scene ||
      !this.camera ||
      !this.accumBufferA ||
      !this.accumBufferB ||
      !this.sampleTarget ||
      !this.blendMaterial ||
      !this.blendScene ||
      !this.blendCamera
    ) {
      return;
    }

    if (this.sampleCount >= this.maxSamples) {
      this.finishRender();
      return;
    }

    // 1. Apply jitter to camera for sub-pixel anti-aliasing
    this.applyJitter();

    // 2. Render the jittered scene to the sample target
    this.renderer.setRenderTarget(this.sampleTarget);
    this.renderer.render(this.scene, this.camera);

    // 3. Blend the new sample with the accumulation buffer
    const sampleWeight = 1.0 / (this.sampleCount + 1);

    // Read from accumBufferA, blend with sampleTarget, write to accumBufferB
    this.blendMaterial.uniforms['tAccum']!.value =
      this.accumBufferA.texture;
    this.blendMaterial.uniforms['tNew']!.value =
      this.sampleTarget.texture;
    this.blendMaterial.uniforms['sampleWeight']!.value = sampleWeight;

    this.renderer.setRenderTarget(this.accumBufferB);
    this.renderer.render(this.blendScene, this.blendCamera);

    // 4. Swap buffers (ping-pong)
    const temp = this.accumBufferA;
    this.accumBufferA = this.accumBufferB;
    this.accumBufferB = temp;

    // 5. Display current result on screen
    this.displayResult();

    // 6. Restore camera projection
    this.restoreCamera();

    this.sampleCount++;

    // Report progress
    if (this.onProgressCallback) {
      this.onProgressCallback(this.progress);
    }

    // Schedule next sample
    this.animationFrameId = requestAnimationFrame(this.renderNextSample);
  };

  /**
   * Apply sub-pixel jitter and optional depth-of-field lens jitter to the camera.
   *
   * For anti-aliasing: adds a random sub-pixel offset to the camera's projection
   * matrix. This shifts the rendered image by a fraction of a pixel, and when
   * averaged over many samples, produces smooth edges.
   *
   * For DOF: jitters the camera position on a virtual lens disk and adjusts the
   * projection to still focus on the focal plane. Objects at the focal distance
   * remain sharp while others become blurry.
   */
  private applyJitter(): void {
    if (!this.camera) return;

    // Save original projection if not already saved
    if (!this.originalCameraMatrix) {
      this.originalCameraMatrix = this.camera.projectionMatrix.clone();
    }

    const canvas = this.renderer.domElement;
    const width = canvas.width * this.resolutionMultiplier;
    const height = canvas.height * this.resolutionMultiplier;

    // Sub-pixel jitter for anti-aliasing (Halton-like random offset)
    const jitterX = (Math.random() - 0.5) / width;
    const jitterY = (Math.random() - 0.5) / height;

    // Clone and modify the projection matrix to add jitter
    const jitteredMatrix = this.originalCameraMatrix.clone();
    const elements = jitteredMatrix.elements;

    // Add the jitter to the projection matrix translation components
    // elements[8] and elements[9] correspond to the NDC offset
    elements[8] = (elements[8] ?? 0) + jitterX * 2;
    elements[9] = (elements[9] ?? 0) + jitterY * 2;

    this.camera.projectionMatrix.copy(jitteredMatrix);

    // Optional DOF lens jitter
    if (
      this.depthOfFieldEnabled &&
      this.camera instanceof THREE.PerspectiveCamera
    ) {
      // Sample a random point on a disk (lens aperture)
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * this.aperture;
      const lensOffsetX = Math.cos(angle) * radius;
      const lensOffsetY = Math.sin(angle) * radius;

      // Adjust the projection matrix to account for the lens offset
      // while keeping the focal plane in focus
      const focusRatio = this.focalLength;
      elements[8] = (elements[8] ?? 0) + (lensOffsetX * 2) / focusRatio;
      elements[9] = (elements[9] ?? 0) + (lensOffsetY * 2) / focusRatio;

      // Shift the camera position slightly on the lens
      // This creates the depth-of-field bokeh effect
      elements[12] = (elements[12] ?? 0) + lensOffsetX;
      elements[13] = (elements[13] ?? 0) + lensOffsetY;

      this.camera.projectionMatrix.copy(jitteredMatrix);
    }
  }

  /**
   * Restore the original camera projection matrix after each sample.
   */
  private restoreCamera(): void {
    if (this.camera && this.originalCameraMatrix) {
      this.camera.projectionMatrix.copy(this.originalCameraMatrix);
    }
  }

  /**
   * Display the current accumulation buffer result on screen.
   */
  private displayResult(): void {
    if (
      !this.accumBufferA ||
      !this.copyMaterial ||
      !this.copyScene ||
      !this.blendCamera
    ) {
      return;
    }

    this.copyMaterial.map = this.accumBufferA.texture;
    this.copyMaterial.needsUpdate = true;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.copyScene, this.blendCamera);
  }

  /**
   * Finish the render: report completion and read the final image.
   */
  private finishRender(): void {
    this.isRenderingActive = false;

    // Restore camera
    this.restoreCamera();

    // Display final result
    this.displayResult();

    // Read final image and notify
    if (this.onCompleteCallback) {
      const dataUrl = this.readAccumulationBuffer();
      this.onCompleteCallback(dataUrl);
    }
  }

  /**
   * Read the current accumulation buffer pixels and return as a data URL.
   *
   * Uses a temporary canvas to convert the WebGL render target's pixel
   * data into a PNG image.
   */
  private readAccumulationBuffer(): string {
    if (!this.accumBufferA) {
      return '';
    }

    const width = this.accumBufferA.width;
    const height = this.accumBufferA.height;

    // Read pixels from the accumulation buffer
    const pixelBuffer = new Float32Array(width * height * 4);
    this.renderer.readRenderTargetPixels(
      this.accumBufferA,
      0,
      0,
      width,
      height,
      pixelBuffer
    );

    // Convert float pixels to 8-bit RGBA for canvas
    const imageData = new ImageData(width, height);
    for (let i = 0; i < pixelBuffer.length; i += 4) {
      // Clamp and convert from float [0,1] to uint8 [0,255]
      imageData.data[i] = Math.min(255, Math.max(0, Math.round((pixelBuffer[i] ?? 0) * 255)));
      imageData.data[i + 1] = Math.min(255, Math.max(0, Math.round((pixelBuffer[i + 1] ?? 0) * 255)));
      imageData.data[i + 2] = Math.min(255, Math.max(0, Math.round((pixelBuffer[i + 2] ?? 0) * 255)));
      imageData.data[i + 3] = Math.min(255, Math.max(0, Math.round((pixelBuffer[i + 3] ?? 0) * 255)));
    }

    // WebGL render targets are stored bottom-to-top, so we need to flip vertically
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    // Flip the image vertically by drawing rows in reverse
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      return '';
    }
    tempCtx.putImageData(imageData, 0, 0);

    // Flip by drawing upside down
    ctx.save();
    ctx.scale(1, -1);
    ctx.drawImage(tempCanvas, 0, -height);
    ctx.restore();

    return canvas.toDataURL('image/png');
  }

  /**
   * Dispose all GPU resources and stop any active rendering.
   */
  dispose(): void {
    this.isRenderingActive = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Restore camera
    if (this.camera && this.originalCameraMatrix) {
      this.camera.projectionMatrix.copy(this.originalCameraMatrix);
      this.originalCameraMatrix = null;
    }

    // Dispose render targets
    if (this.accumBufferA) {
      this.accumBufferA.dispose();
      this.accumBufferA = null;
    }
    if (this.accumBufferB) {
      this.accumBufferB.dispose();
      this.accumBufferB = null;
    }
    if (this.sampleTarget) {
      this.sampleTarget.dispose();
      this.sampleTarget = null;
    }

    // Dispose materials
    if (this.blendMaterial) {
      this.blendMaterial.dispose();
      this.blendMaterial = null;
    }
    if (this.copyMaterial) {
      this.copyMaterial.dispose();
      this.copyMaterial = null;
    }

    // Dispose geometries in quads
    if (this.blendQuad) {
      this.blendQuad.geometry.dispose();
      this.blendQuad = null;
    }
    if (this.copyQuad) {
      this.copyQuad.geometry.dispose();
      this.copyQuad = null;
    }

    // Clear scene references
    this.blendScene = null;
    this.blendCamera = null;
    this.copyScene = null;
    this.scene = null;
    this.camera = null;
  }
}
