import * as THREE from 'three';

/**
 * Options d'export GLTF
 */
export interface GLTFExportOptions {
  binary?: boolean; // true = .glb, false = .gltf
  includeCustomProps?: boolean;
  onlyVisible?: boolean;
}

/**
 * Options de screenshot
 */
export interface ScreenshotOptions {
  width: number;
  height: number;
  superSampling?: number; // 1, 2 or 4
  format?: 'image/png' | 'image/jpeg';
  quality?: number; // 0-1 pour jpeg
  transparent?: boolean;
}

/**
 * Utilitaire d'export GLTF et screenshot HD
 */
export class GLTFExporterUtil {
  /**
   * Exporte la scene en GLTF/GLB
   */
  async exportScene(
    scene: THREE.Scene,
    options: GLTFExportOptions = {}
  ): Promise<ArrayBuffer | string> {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();

    // Filter scene to only include kitchen objects
    const exportScene = new THREE.Scene();
    scene.traverse((child) => {
      // Skip helpers and internal objects
      if (child.name.startsWith('__')) return;
      if (child instanceof THREE.GridHelper) return;
      if (child instanceof THREE.AxesHelper) return;

      if (options.onlyVisible && !child.visible) return;

      if (child.userData.id || child.userData.type === 'wall' || child.userData.type === 'floor') {
        exportScene.add(child.clone());
      }
    });

    return new Promise((resolve, reject) => {
      exporter.parse(
        exportScene,
        (result: ArrayBuffer | object) => {
          if (options.binary) {
            resolve(result as ArrayBuffer);
          } else {
            resolve(JSON.stringify(result, null, 2));
          }
        },
        (error: unknown) => reject(error),
        {
          binary: options.binary ?? true,
        }
      );
    });
  }

  /**
   * Telecharge l'export en fichier
   */
  async downloadGLTF(
    scene: THREE.Scene,
    filename: string = 'kitchen',
    binary: boolean = true
  ): Promise<void> {
    const result = await this.exportScene(scene, { binary });

    const blob = binary
      ? new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })
      : new Blob([result as string], { type: 'model/gltf+json' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = binary ? `${filename}.glb` : `${filename}.gltf`;
    link.click();

    // Delayed revocation for download to complete
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /**
   * Screenshot HD avec supersampling
   */
  takeScreenshot(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: ScreenshotOptions
  ): string {
    const { width, height, superSampling = 2, format = 'image/png', quality = 1.0 } = options;

    // Save original state
    const originalSize = new THREE.Vector2();
    renderer.getSize(originalSize);
    const originalPixelRatio = renderer.getPixelRatio();

    // Render at high resolution
    const renderWidth = width * superSampling;
    const renderHeight = height * superSampling;
    renderer.setPixelRatio(1);
    renderer.setSize(renderWidth, renderHeight, false);

    // Update camera aspect
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    // Render
    renderer.render(scene, camera);

    // Get data URL
    const dataUrl = renderer.domElement.toDataURL(format, quality);

    // Restore original state
    renderer.setPixelRatio(originalPixelRatio);
    renderer.setSize(originalSize.x, originalSize.y, false);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = originalSize.x / originalSize.y;
      camera.updateProjectionMatrix();
    }

    return dataUrl;
  }

  /**
   * Telecharge un screenshot
   */
  downloadScreenshot(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: ScreenshotOptions,
    filename: string = 'kitchen-screenshot'
  ): void {
    const dataUrl = this.takeScreenshot(renderer, scene, camera, options);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}.${options.format === 'image/jpeg' ? 'jpg' : 'png'}`;
    link.click();
  }
}
