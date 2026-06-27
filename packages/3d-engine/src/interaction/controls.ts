import * as THREE from 'three';

/**
 * Mode du TransformControls
 */
export type TransformMode = 'translate' | 'rotate' | 'scale';

/**
 * Evenement de transformation
 */
export interface TransformEvent {
  type: 'start' | 'change' | 'end';
  mode: TransformMode;
  object: THREE.Object3D;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

/**
 * Wrapper pour OrbitControls + TransformControls
 * Gere la coordination entre les deux (desactive orbit pendant la transformation)
 */
export class ControlsManager {
  private orbitControls: InstanceType<
    typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls
  > | null = null;
  private transformControls: InstanceType<
    typeof import('three/examples/jsm/controls/TransformControls.js').TransformControls
  > | null = null;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private scene: THREE.Scene;
  private initialized = false;
  private transformMode: TransformMode = 'translate';
  private onTransformCallback?: (event: TransformEvent) => void;

  // State before transform starts (for undo)
  private transformStartPosition: THREE.Vector3 | null = null;
  private transformStartRotation: THREE.Euler | null = null;
  private transformStartScale: THREE.Vector3 | null = null;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
  }

  /**
   * Initialise les controles (charge les modules async)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const [{ OrbitControls }, { TransformControls }] = await Promise.all([
      import('three/examples/jsm/controls/OrbitControls.js'),
      import('three/examples/jsm/controls/TransformControls.js'),
    ]);

    // OrbitControls
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.maxPolarAngle = Math.PI * 0.85;
    this.orbitControls.minDistance = 1;
    this.orbitControls.maxDistance = 50;
    this.orbitControls.target.set(0, 0, 0);

    // TransformControls
    this.transformControls = new TransformControls(this.camera, this.domElement);
    this.transformControls.setMode(this.transformMode);
    this.transformControls.setSize(0.8);
    this.transformControls.setSpace('world');
    this.scene.add(this.transformControls);

    // Disable orbit while transforming
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.transformControls.addEventListener('dragging-changed', (event: any) => {
      if (this.orbitControls) {
        this.orbitControls.enabled = !event.value;
      }
    });

    // Transform start
    this.transformControls.addEventListener('mouseDown', () => {
      const obj = this.transformControls?.object;
      if (obj) {
        this.transformStartPosition = obj.position.clone();
        this.transformStartRotation = obj.rotation.clone();
        this.transformStartScale = obj.scale.clone();

        this.emitTransformEvent('start', obj);
      }
    });

    // Transform change
    this.transformControls.addEventListener('objectChange', () => {
      const obj = this.transformControls?.object;
      if (obj) {
        this.emitTransformEvent('change', obj);
      }
    });

    // Transform end
    this.transformControls.addEventListener('mouseUp', () => {
      const obj = this.transformControls?.object;
      if (obj) {
        this.emitTransformEvent('end', obj);
      }
    });

    this.initialized = true;
  }

  /**
   * Attache le TransformControls a un objet
   */
  attach(object: THREE.Object3D): void {
    this.transformControls?.attach(object);
  }

  /**
   * Detache le TransformControls
   */
  detach(): void {
    this.transformControls?.detach();
  }

  /**
   * Change le mode du TransformControls
   */
  setMode(mode: TransformMode): void {
    this.transformMode = mode;
    this.transformControls?.setMode(mode);
  }

  /**
   * Retourne le mode actuel
   */
  getMode(): TransformMode {
    return this.transformMode;
  }

  /**
   * Retourne l'etat initial de la transformation en cours
   */
  getTransformStart(): {
    position: THREE.Vector3 | null;
    rotation: THREE.Euler | null;
    scale: THREE.Vector3 | null;
  } {
    return {
      position: this.transformStartPosition,
      rotation: this.transformStartRotation,
      scale: this.transformStartScale,
    };
  }

  /**
   * Change l'espace de reference (world / local)
   */
  setSpace(space: 'world' | 'local'): void {
    this.transformControls?.setSpace(space);
  }

  /**
   * Active/desactive le snap pour la translation
   */
  setTranslationSnap(snap: number | null): void {
    this.transformControls?.setTranslationSnap(snap);
  }

  /**
   * Active/desactive le snap pour la rotation
   */
  setRotationSnap(snap: number | null): void {
    this.transformControls?.setRotationSnap(snap);
  }

  /**
   * Active/desactive le snap pour le scale
   */
  setScaleSnap(snap: number | null): void {
    this.transformControls?.setScaleSnap(snap);
  }

  /**
   * Met a jour les controles (a appeler dans la boucle de rendu)
   */
  update(): void {
    if (this.orbitControls?.enabled) {
      this.orbitControls.update();
    }
  }

  /**
   * Definit la cible de l'orbit
   */
  setOrbitTarget(target: THREE.Vector3): void {
    this.orbitControls?.target.copy(target);
  }

  /**
   * Active/desactive les controles d'orbite
   */
  setOrbitEnabled(enabled: boolean): void {
    if (this.orbitControls) {
      this.orbitControls.enabled = enabled;
    }
  }

  /**
   * Enregistre un callback de transformation
   */
  onTransform(callback: (event: TransformEvent) => void): void {
    this.onTransformCallback = callback;
  }

  /**
   * Verifie si l'utilisateur est en train de transformer un objet
   */
  isDragging(): boolean {
    return this.transformControls?.dragging ?? false;
  }

  /**
   * Retourne l'objet actuellement attache
   */
  getAttachedObject(): THREE.Object3D | undefined {
    return this.transformControls?.object;
  }

  /**
   * Active/desactive tous les controles (orbit + transform)
   */
  setEnabled(enabled: boolean): void {
    if (this.orbitControls) {
      this.orbitControls.enabled = enabled;
    }
    if (this.transformControls) {
      this.transformControls.enabled = enabled;
    }
  }

  /**
   * Dispose les controles
   */
  dispose(): void {
    if (this.transformControls) {
      this.scene.remove(this.transformControls);
      this.transformControls.dispose();
      this.transformControls = null;
    }
    if (this.orbitControls) {
      this.orbitControls.dispose();
      this.orbitControls = null;
    }
    this.initialized = false;
  }

  private emitTransformEvent(type: TransformEvent['type'], object: THREE.Object3D): void {
    this.onTransformCallback?.({
      type,
      mode: this.transformMode,
      object,
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
    });
  }
}
