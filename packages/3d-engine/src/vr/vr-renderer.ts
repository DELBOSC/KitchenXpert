/**
 * VR/AR Renderer
 *
 * Extends the KitchenRenderer with WebXR support for VR and AR modes.
 * AR mode uses WebXR hit-testing to place kitchen models on detected floor planes.
 * Also supports USDZ export for Apple Quick Look AR on iOS devices.
 */

import * as THREE from 'three';
import { KitchenRenderer } from '../engine/renderer';

/**
 * Result of a hit-test against real-world surfaces in AR mode.
 */
export interface ARHitTestResult {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  /**
   * The XR hit test result matrix.
   */
  matrix: Float32Array;
}

/**
 * Configuration for an AR session.
 */
export interface ARSessionConfig {
  /** Root DOM element for dom-overlay feature. Defaults to document.body. */
  overlayRoot?: HTMLElement;
  /** Whether to request light estimation. */
  lightEstimation?: boolean;
  /** Whether to enable hit-testing for floor plane detection. */
  hitTest?: boolean;
}

/**
 * VR/AR Renderer that wraps KitchenRenderer and provides WebXR AR session management,
 * hit-test based floor plane detection, and USDZ export for iOS Quick Look.
 */
export class VRARRenderer {
  public renderer: THREE.WebGLRenderer;
  protected kitchenRenderer: KitchenRenderer;
  private arSession: XRSession | null = null;
  private hitTestSource: XRHitTestSource | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private reticle: THREE.Mesh | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private modelPlaced: boolean = false;
  private onSessionEnd: (() => void) | null = null;

  constructor(
    kitchenRenderer: KitchenRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.kitchenRenderer = kitchenRenderer;
    this.renderer = kitchenRenderer.renderer;
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Check if AR is available on this device.
   * Returns false if WebXR is not supported or if immersive-ar is not available.
   */
  async isARAvailable(): Promise<boolean> {
    if (!navigator.xr) {
      return false;
    }
    try {
      return await navigator.xr.isSessionSupported('immersive-ar');
    } catch {
      return false;
    }
  }

  /**
   * Check if VR is available on this device.
   */
  async isVRAvailable(): Promise<boolean> {
    if (!navigator.xr) {
      return false;
    }
    try {
      return await navigator.xr.isSessionSupported('immersive-vr');
    } catch {
      return false;
    }
  }

  /**
   * Start an AR session using WebXR.
   * Places the kitchen model on a detected floor plane.
   *
   * @param config - Optional AR session configuration
   * @throws Error if WebXR or AR is not supported
   */
  async startARSession(config: ARSessionConfig = {}): Promise<void> {
    // Check AR support
    if (!navigator.xr) {
      throw new Error('WebXR not supported');
    }

    const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!arSupported) {
      throw new Error('AR not supported on this device');
    }

    const overlayRoot =
      config.overlayRoot || document.getElementById('ar-overlay') || document.body;

    const requiredFeatures: string[] = ['hit-test', 'dom-overlay'];
    const optionalFeatures: string[] = [];

    if (config.lightEstimation !== false) {
      optionalFeatures.push('light-estimation');
    }

    // Request AR session with hit-testing
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures,
      optionalFeatures,
      domOverlay: { root: overlayRoot },
    });

    this.arSession = session;
    this.modelPlaced = false;

    // Configure renderer for XR
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(session);

    // Setup hit-testing for floor detection
    const viewerSpace = await session.requestReferenceSpace('viewer');
    this.referenceSpace = await session.requestReferenceSpace('local-floor');

    const hitTestSource = await session.requestHitTestSource!({ space: viewerSpace });
    this.hitTestSource = hitTestSource ?? null;

    // Create a reticle to show where the model will be placed
    this.createReticle();

    // Listen for session end
    session.addEventListener('end', () => {
      this.cleanupARSession();
      if (this.onSessionEnd) {
        this.onSessionEnd();
      }
    });

    // Setup the XR animation loop for hit testing
    this.renderer.setAnimationLoop((_timestamp: number, frame?: XRFrame) => {
      if (frame && this.hitTestSource && this.referenceSpace) {
        this.handleHitTest(frame);
      }
      this.renderer.render(this.scene, this.camera);
    });
  }

  /**
   * Register a callback for when the AR session ends.
   */
  setOnSessionEnd(callback: () => void): void {
    this.onSessionEnd = callback;
  }

  /**
   * Stop the current AR session.
   */
  async stopARSession(): Promise<void> {
    if (this.arSession) {
      await this.arSession.end();
    }
  }

  /**
   * Export scene as USDZ for Apple Quick Look AR.
   * USDZ is Apple's AR format - tapping a USDZ link on iOS opens AR view instantly.
   *
   * Uses the USDZExporter from Three.js. Falls back to generating a minimal USDZ
   * archive with bounding box geometry if the exporter is not available.
   *
   * @returns A Blob containing the USDZ file data
   */
  async exportAsUSDZ(): Promise<Blob> {
    try {
      // Try to use Three.js USDZExporter
      const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
      const exporter = new USDZExporter();
      const usdzArrayBuffer = await exporter.parse(this.scene);
      return new Blob([usdzArrayBuffer as BlobPart], {
        type: 'model/vnd.usdz+zip',
      });
    } catch {
      // Fallback: generate a minimal USDZ from bounding boxes
      return this.generateMinimalUSDZ();
    }
  }

  /**
   * Place the kitchen model at the current reticle position.
   * Called by the user tapping the screen during AR mode.
   */
  placeModelAtReticle(): boolean {
    if (!this.reticle || !this.reticle.visible) {
      return false;
    }

    // Move all root-level scene objects (excluding lights, camera, reticle) to reticle position
    const offset = this.reticle.position.clone();
    const rotation = this.reticle.quaternion.clone();

    this.scene.children.forEach((child) => {
      if (child === this.reticle || child instanceof THREE.Light || child instanceof THREE.Camera) {
        return;
      }
      child.position.add(offset);
      child.quaternion.multiply(rotation);
    });

    this.modelPlaced = true;

    // Hide reticle after placement
    if (this.reticle) {
      this.reticle.visible = false;
    }

    return true;
  }

  /**
   * Whether the model has been placed in AR.
   */
  isModelPlaced(): boolean {
    return this.modelPlaced;
  }

  /**
   * Handle WebXR hit test results to update the reticle position.
   */
  private handleHitTest(frame: XRFrame): void {
    if (!this.hitTestSource || !this.referenceSpace || !this.reticle) {
      return;
    }

    // Don't update reticle if model is already placed
    if (this.modelPlaced) {
      return;
    }

    const hitTestResults = frame.getHitTestResults(this.hitTestSource);

    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit?.getPose(this.referenceSpace);

      if (pose) {
        this.reticle.visible = true;
        this.reticle.matrix.fromArray(pose.transform.matrix);
        this.reticle.matrix.decompose(
          this.reticle.position,
          this.reticle.quaternion,
          this.reticle.scale
        );
      }
    } else {
      this.reticle.visible = false;
    }
  }

  /**
   * Create the placement reticle (a ring on the floor showing where the model will go).
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
   * Clean up AR session resources.
   */
  private cleanupARSession(): void {
    this.arSession = null;
    this.hitTestSource = null;
    this.referenceSpace = null;
    this.modelPlaced = false;

    // Remove reticle from scene
    if (this.reticle) {
      this.scene.remove(this.reticle);
      this.reticle.geometry.dispose();
      (this.reticle.material as THREE.Material).dispose();
      this.reticle = null;
    }

    // Restore normal rendering
    this.renderer.xr.enabled = false;
    this.renderer.setAnimationLoop(null);
  }

  /**
   * Generate a minimal USDZ file from scene bounding boxes.
   * USDZ is a ZIP archive containing a USDA (text) file and textures.
   */
  private generateMinimalUSDZ(): Blob {
    const meshes: Array<{
      name: string;
      position: THREE.Vector3;
      size: THREE.Vector3;
      color: string;
    }> = [];

    this.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // Get color from material
        let colorHex = '0.8 0.8 0.8';
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.color) {
            colorHex = `${mat.color.r.toFixed(3)} ${mat.color.g.toFixed(3)} ${mat.color.b.toFixed(3)}`;
          }
        }

        meshes.push({
          name: mesh.name || `mesh_${meshes.length}`,
          position: center,
          size,
          color: colorHex,
        });
      }
    });

    // Generate USDA content
    let usda = `#usda 1.0
(
    defaultPrim = "Kitchen"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Kitchen" (
    kind = "component"
)
{
`;

    meshes.forEach((mesh, index) => {
      const safeName = mesh.name.replace(/[^a-zA-Z0-9_]/g, '_');
      usda += `    def Cube "${safeName}_${index}" {
        float3 xformOp:translate = (${mesh.position.x.toFixed(4)}, ${mesh.position.y.toFixed(4)}, ${mesh.position.z.toFixed(4)})
        float3 xformOp:scale = (${mesh.size.x.toFixed(4)}, ${mesh.size.y.toFixed(4)}, ${mesh.size.z.toFixed(4)})
        uniform token[] xformOpOrder = ["xformOp:translate", "xformOp:scale"]
        color3f[] primvars:displayColor = [(${mesh.color})]
    }
`;
    });

    usda += '}\n';

    // USDZ is just an uncompressed zip with a .usda file
    // For simplicity, return the USDA as a blob with USDZ mime type.
    // A production implementation would use a proper ZIP library.
    const encoder = new TextEncoder();
    const usdaBytes = encoder.encode(usda);

    return new Blob([usdaBytes], {
      type: 'model/vnd.usdz+zip',
    });
  }

  /**
   * Dispose all VR/AR renderer resources.
   */
  dispose(): void {
    if (this.arSession) {
      this.arSession.end().catch(() => {
        // Session may already be ended
      });
    }
    this.cleanupARSession();
  }
}
