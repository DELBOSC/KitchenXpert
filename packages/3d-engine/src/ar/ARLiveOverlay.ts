/**
 * ARLiveOverlay
 *
 * Three.js-based AR overlay system that uses WebXR to render a kitchen model
 * on top of the device camera feed. Provides:
 *  - WebXR immersive-ar session management with hit-test
 *  - Kitchen model placement on detected floor surfaces
 *  - Before/after split view comparison
 *  - AR screenshot capture
 *  - Web Share API integration for sharing AR views
 *
 * Builds on top of the existing VRARRenderer for low-level XR session handling,
 * adding higher-level features specific to the live AR overlay experience.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AROverlayConfig {
  /** DOM element to use for dom-overlay feature. */
  overlayRoot?: HTMLElement;
  /** Whether to enable light estimation. Default: true. */
  lightEstimation?: boolean;
  /** Scale factor for the kitchen model relative to real-world meters. Default: 1. */
  modelScale?: number;
}

export interface SplitViewConfig {
  /** URL or data-URL of the "before" photo */
  beforePhotoUrl: string;
  /** Split position as a fraction (0 = all before, 1 = all AR). Default: 0.5 */
  splitPosition?: number;
}

// ---------------------------------------------------------------------------
// ARLiveOverlay
// ---------------------------------------------------------------------------

export class ARLiveOverlay {
  // Three.js core
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  // XR session state
  private xrSession: XRSession | null = null;
  private hitTestSource: XRHitTestSource | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private reticle: THREE.Mesh | null = null;
  private modelPlaced: boolean = false;

  // Kitchen model
  private kitchenGroup: THREE.Group | null = null;
  private modelScale: number = 1;

  // Split view
  private splitViewActive: boolean = false;
  private splitCanvas: HTMLCanvasElement | null = null;
  private splitBeforeImage: HTMLImageElement | null = null;
  private splitPosition: number = 0.5;

  // Callbacks
  private onSessionEndCallback: (() => void) | null = null;
  private onPlacedCallback: (() => void) | null = null;
  private boundSessionEndListener: (() => void) | null = null;

  constructor(container: HTMLElement, config?: AROverlayConfig) {
    this.container = container;
    this.modelScale = config?.modelScale ?? 1;

    // Create scene
    this.scene = new THREE.Scene();

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.01,
      100,
    );

    // Create renderer with alpha for AR pass-through
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // Basic lighting for the overlaid model
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
  }

  // -----------------------------------------------------------------------
  // Static utility
  // -----------------------------------------------------------------------

  /**
   * Check whether the device supports WebXR immersive-ar sessions.
   */
  static async isARSupported(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      return false;
    }
    try {
      return await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // AR session lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start a WebXR AR session with hit-test support.
   */
  async startAR(config?: AROverlayConfig): Promise<void> {
    if (!navigator.xr) {
      throw new Error('WebXR is not supported on this device');
    }

    const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!arSupported) {
      throw new Error('AR is not supported on this device');
    }

    const overlayRoot =
      config?.overlayRoot ??
      document.getElementById('ar-overlay') ??
      document.body;

    const requiredFeatures: string[] = ['hit-test', 'dom-overlay'];
    const optionalFeatures: string[] = [];

    if (config?.lightEstimation !== false) {
      optionalFeatures.push('light-estimation');
    }

    // Request immersive-ar session
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures,
      optionalFeatures,
      domOverlay: { root: overlayRoot },
    });

    this.xrSession = session;
    this.modelPlaced = false;

    // Configure renderer for XR
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(session);

    // Setup hit-testing for floor plane detection
    const viewerSpace = await session.requestReferenceSpace('viewer');
    this.referenceSpace = await session.requestReferenceSpace('local-floor');

    const hts = await session.requestHitTestSource!({ space: viewerSpace });
    this.hitTestSource = hts ?? null;

    // Create placement reticle
    this.createReticle();

    // Session end handler — store ref so we can remove it in cleanup
    this.boundSessionEndListener = () => {
      this.cleanupSession();
      if (this.onSessionEndCallback) {
        this.onSessionEndCallback();
      }
    };
    session.addEventListener('end', this.boundSessionEndListener);

    // Animation loop with hit-test handling
    this.renderer.setAnimationLoop((_timestamp: number, frame?: XRFrame) => {
      if (frame && this.hitTestSource && this.referenceSpace) {
        this.processHitTest(frame);
      }
      this.renderer.render(this.scene, this.camera);
    });
  }

  /**
   * Stop the current AR session.
   */
  async stopAR(): Promise<void> {
    if (this.xrSession) {
      await this.xrSession.end();
    }
  }

  /**
   * Register a callback invoked when the AR session ends.
   */
  onSessionEnd(callback: () => void): void {
    this.onSessionEndCallback = callback;
  }

  /**
   * Register a callback invoked when the model is placed.
   */
  onModelPlaced(callback: () => void): void {
    this.onPlacedCallback = callback;
  }

  // -----------------------------------------------------------------------
  // Kitchen model placement
  // -----------------------------------------------------------------------

  /**
   * Set the kitchen model (THREE.Group) to be displayed in AR.
   * The group will be placed at the detected floor surface when the user taps.
   */
  placeKitchenModel(kitchenGroup: THREE.Group): void {
    // Remove any previously placed kitchen model
    if (this.kitchenGroup) {
      this.scene.remove(this.kitchenGroup);
    }

    this.kitchenGroup = kitchenGroup;
    kitchenGroup.scale.setScalar(this.modelScale);
    kitchenGroup.visible = false; // Hidden until placed
    this.scene.add(kitchenGroup);
  }

  /**
   * Confirm placement at the current reticle position.
   * Called when the user taps the screen during AR.
   */
  confirmPlacement(): boolean {
    if (!this.reticle || !this.reticle.visible || !this.kitchenGroup) {
      return false;
    }

    // Position kitchen at reticle
    this.kitchenGroup.position.copy(this.reticle.position);
    this.kitchenGroup.quaternion.copy(this.reticle.quaternion);
    this.kitchenGroup.visible = true;
    this.modelPlaced = true;

    // Hide reticle
    this.reticle.visible = false;

    if (this.onPlacedCallback) {
      this.onPlacedCallback();
    }

    return true;
  }

  /**
   * Whether the kitchen model has been placed.
   */
  isPlaced(): boolean {
    return this.modelPlaced;
  }

  /**
   * Rotate the placed kitchen model by the given angle (radians).
   */
  rotateModel(angleRad: number): void {
    if (this.kitchenGroup && this.modelPlaced) {
      this.kitchenGroup.rotateY(angleRad);
    }
  }

  /**
   * Scale the placed kitchen model.
   */
  scaleModel(factor: number): void {
    if (this.kitchenGroup && this.modelPlaced) {
      this.kitchenGroup.scale.multiplyScalar(factor);
    }
  }

  // -----------------------------------------------------------------------
  // Split view (before / after)
  // -----------------------------------------------------------------------

  /**
   * Enable split-screen view: left = "before" photo, right = AR camera + model.
   */
  enableSplitView(config: SplitViewConfig): void {
    // Clean up any existing split view before creating a new one
    if (this.splitViewActive) {
      this.disableSplitView();
    }

    this.splitViewActive = true;
    this.splitPosition = config.splitPosition ?? 0.5;

    // Create the before image
    this.splitBeforeImage = new Image();
    this.splitBeforeImage.crossOrigin = 'anonymous';
    this.splitBeforeImage.src = config.beforePhotoUrl;

    // Create a canvas overlay for compositing
    this.splitCanvas = document.createElement('canvas');
    this.splitCanvas.width = this.container.clientWidth;
    this.splitCanvas.height = this.container.clientHeight;
    this.splitCanvas.style.position = 'absolute';
    this.splitCanvas.style.top = '0';
    this.splitCanvas.style.left = '0';
    this.splitCanvas.style.pointerEvents = 'none';
    this.splitCanvas.style.zIndex = '10';
    this.container.appendChild(this.splitCanvas);

    // Draw the "before" side on each frame
    const drawSplit = () => {
      if (!this.splitViewActive || !this.splitCanvas || !this.splitBeforeImage) return;

      const ctx = this.splitCanvas.getContext('2d');
      if (!ctx) return;

      const w = this.splitCanvas.width;
      const h = this.splitCanvas.height;
      const splitX = Math.round(w * this.splitPosition);

      ctx.clearRect(0, 0, w, h);

      // Draw the "before" photo on the left side
      if (this.splitBeforeImage.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, h);
        ctx.clip();
        ctx.drawImage(this.splitBeforeImage, 0, 0, w, h);
        ctx.restore();
      }

      // Draw divider line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();

      // Labels
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(splitX - 60, h / 2 - 12, 50, 24);
      ctx.fillRect(splitX + 10, h / 2 - 12, 50, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Avant', splitX - 35, h / 2 + 4);
      ctx.fillText('Apres', splitX + 35, h / 2 + 4);

      requestAnimationFrame(drawSplit);
    };

    drawSplit();
  }

  /**
   * Disable split-screen view.
   */
  disableSplitView(): void {
    this.splitViewActive = false;
    if (this.splitCanvas && this.splitCanvas.parentNode) {
      this.splitCanvas.parentNode.removeChild(this.splitCanvas);
    }
    this.splitCanvas = null;
    this.splitBeforeImage = null;
  }

  /**
   * Update split position (0-1).
   */
  setSplitPosition(position: number): void {
    this.splitPosition = Math.max(0, Math.min(1, position));
  }

  // -----------------------------------------------------------------------
  // Screenshot & Sharing
  // -----------------------------------------------------------------------

  /**
   * Capture the current AR view as a screenshot Blob (PNG).
   */
  async captureScreenshot(): Promise<Blob> {
    // Render a frame to ensure the canvas is up to date
    this.renderer.render(this.scene, this.camera);

    return new Promise<Blob>((resolve, reject) => {
      this.renderer.domElement.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to capture screenshot'));
          }
        },
        'image/png',
        1.0,
      );
    });
  }

  /**
   * Share the current AR view using the Web Share API.
   * Falls back to download if the Web Share API is not available.
   */
  async shareARView(): Promise<void> {
    const blob = await this.captureScreenshot();
    const file = new File([blob], `kitchen-ar-${Date.now()}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'KitchenXpert AR View',
        text: 'Check out my kitchen design in AR!',
        files: [file],
      });
    } else {
      // Fallback: trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Delayed revocation for downloads
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  // -----------------------------------------------------------------------
  // Getters
  // -----------------------------------------------------------------------

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Create the floor-detection reticle (ring indicator).
   */
  private createReticle(): void {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    this.reticle = new THREE.Mesh(geometry, material);
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
  }

  /**
   * Process hit-test results to update the reticle position.
   */
  private processHitTest(frame: XRFrame): void {
    if (!this.hitTestSource || !this.referenceSpace || !this.reticle) {
      return;
    }

    // Don't update reticle after model is placed
    if (this.modelPlaced) {
      return;
    }

    const results = frame.getHitTestResults(this.hitTestSource);

    if (results.length > 0) {
      const hit = results[0];
      const pose = hit?.getPose(this.referenceSpace);

      if (pose) {
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(pose.transform.matrix);
        this.reticle.matrix.decompose(
          this.reticle.position,
          this.reticle.quaternion,
          this.reticle.scale,
        );
      }
    } else {
      this.reticle.visible = false;
    }
  }

  /**
   * Clean up all AR session resources.
   */
  private cleanupSession(): void {
    // Remove session end listener to avoid leaks
    if (this.xrSession && this.boundSessionEndListener) {
      this.xrSession.removeEventListener('end', this.boundSessionEndListener);
      this.boundSessionEndListener = null;
    }

    this.xrSession = null;
    this.hitTestSource = null;
    this.referenceSpace = null;
    this.modelPlaced = false;

    // Remove reticle
    if (this.reticle) {
      this.scene.remove(this.reticle);
      this.reticle.geometry.dispose();
      (this.reticle.material as THREE.Material).dispose();
      this.reticle = null;
    }

    // Disable split view if active
    if (this.splitViewActive) {
      this.disableSplitView();
    }

    // Restore normal rendering
    this.renderer.xr.enabled = false;
    this.renderer.setAnimationLoop(null);
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    if (this.xrSession) {
      this.xrSession.end().catch(() => {
        // Session may already be ended
      });
    }

    this.cleanupSession();

    // Remove kitchen model
    if (this.kitchenGroup) {
      this.scene.remove(this.kitchenGroup);
      this.kitchenGroup = null;
    }

    // Dispose renderer
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();

    // Clear scene
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0]!;
      this.scene.remove(child);
    }
  }
}
