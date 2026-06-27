import * as THREE from 'three';

/**
 * Types de caméra prédéfinis pour la visualisation de cuisine
 */
export enum CameraPreset {
  TOP_VIEW = 'top', // Vue du dessus (plan 2D)
  ISOMETRIC = 'isometric', // Vue isométrique
  FRONT = 'front', // Vue de face
  PERSPECTIVE = 'perspective', // Vue perspective libre
}

/**
 * Configuration de caméra
 */
export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  position?: [number, number, number];
  lookAt?: [number, number, number];
}

/**
 * Gestionnaire de caméra pour le moteur 3D
 */
export class KitchenCamera {
  public camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private aspect: number;
  private savedPosition: THREE.Vector3 | null = null;
  private savedTarget: THREE.Vector3 | null = null;

  constructor(container: HTMLElement, config: CameraConfig = {}) {
    this.aspect = container.clientWidth / container.clientHeight;

    // Paramètres par défaut
    const fov = config.fov || 50;
    const near = config.near || 0.1;
    const far = config.far || 1000;

    this.camera = new THREE.PerspectiveCamera(fov, this.aspect, near, far);
    this.target = new THREE.Vector3(0, 0, 0);

    // Position initiale
    if (config.position) {
      this.camera.position.set(...config.position);
    } else {
      this.camera.position.set(10, 10, 10);
    }

    // Point de vue initial
    if (config.lookAt) {
      this.target.set(...config.lookAt);
    }

    this.camera.lookAt(this.target);
  }

  /**
   * Applique un preset de caméra
   */
  applyPreset(preset: CameraPreset, kitchenSize: { width: number; depth: number }): void {
    const { width, depth } = kitchenSize;
    const centerX = width / 2;
    const centerZ = depth / 2;
    const maxDim = Math.max(width, depth);

    switch (preset) {
      case CameraPreset.TOP_VIEW:
        // Vue du dessus - parfait pour le plan 2D
        this.camera.position.set(centerX, maxDim * 1.5, centerZ);
        this.target.set(centerX, 0, centerZ);
        break;

      case CameraPreset.ISOMETRIC:
        // Vue isométrique - classique pour les cuisines
        const isoDistance = maxDim * 1.5;
        this.camera.position.set(centerX + isoDistance, isoDistance * 0.8, centerZ + isoDistance);
        this.target.set(centerX, 0, centerZ);
        break;

      case CameraPreset.FRONT:
        // Vue de face
        this.camera.position.set(centerX, maxDim * 0.6, maxDim * 1.5);
        this.target.set(centerX, maxDim * 0.4, centerZ);
        break;

      case CameraPreset.PERSPECTIVE:
        // Vue perspective libre
        this.camera.position.set(centerX + maxDim * 0.8, maxDim * 0.5, centerZ + maxDim * 0.8);
        this.target.set(centerX, maxDim * 0.3, centerZ);
        break;
    }

    this.camera.lookAt(this.target);
  }

  /**
   * Met à jour le ratio d'aspect lors du redimensionnement
   */
  updateAspect(width: number, height: number): void {
    this.aspect = width / height;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Définit la position de la caméra
   */
  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  /**
   * Définit le point de vue (lookAt target)
   */
  setTarget(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  /**
   * Récupère la position actuelle
   */
  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  /**
   * Récupère le target actuel
   */
  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  /**
   * Zoom sur un objet spécifique
   */
  focusOnObject(object: THREE.Object3D, distance: number = 5): void {
    // Calculer le bounding box de l'objet
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      console.warn('KitchenCamera: cannot focus on empty object');
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Calculer la distance optimale
    const maxSize = Math.max(size.x, size.y, size.z);
    const optimalDistance = maxSize * distance;

    // Diriger la caméra vers l'objet
    const direction = this.camera.position.clone().sub(this.target).normalize();
    this.camera.position.copy(center).add(direction.multiplyScalar(optimalDistance));
    this.target.copy(center);
    this.camera.lookAt(this.target);
  }

  /**
   * Cadre toute la scène dans la vue
   */
  frameScene(scene: THREE.Scene): void {
    const box = new THREE.Box3();

    // Calculer le bounding box de tous les objets visibles
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        box.expandByObject(object);
      }
    });

    if (box.isEmpty()) {
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Distance calculée en fonction du FOV
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;

    // Positionner la caméra
    const direction = new THREE.Vector3(1, 0.8, 1).normalize();
    this.camera.position.copy(center).add(direction.multiplyScalar(distance));
    this.target.copy(center);
    this.camera.lookAt(this.target);
  }

  /**
   * Camera view type for the named views
   */
  static readonly NAMED_VIEWS = ['top', 'front', 'right', 'left', 'back'] as const;

  /**
   * Positionne la camera sur une vue nommee (top, front, right, left, back)
   * Calcule la position et le lookAt en fonction des dimensions de la piece
   */
  setCameraView(
    view: 'top' | 'front' | 'right' | 'left' | 'back',
    roomDimensions: { width: number; depth: number; height: number }
  ): void {
    const { width, depth, height } = roomDimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const centerZ = depth / 2;
    const maxDim = Math.max(width, depth, height);
    const viewDistance = maxDim * 1.8;

    switch (view) {
      case 'top':
        // Vue du dessus (plan)
        this.camera.position.set(centerX, viewDistance, centerZ);
        this.target.set(centerX, 0, centerZ);
        break;

      case 'front':
        // Vue de face (depuis +Z, regardant vers -Z)
        this.camera.position.set(centerX, centerY, depth + viewDistance * 0.6);
        this.target.set(centerX, centerY, centerZ);
        break;

      case 'right':
        // Vue de droite (depuis +X, regardant vers -X)
        this.camera.position.set(width + viewDistance * 0.6, centerY, centerZ);
        this.target.set(centerX, centerY, centerZ);
        break;

      case 'left':
        // Vue de gauche (depuis -X, regardant vers +X)
        this.camera.position.set(-viewDistance * 0.6, centerY, centerZ);
        this.target.set(centerX, centerY, centerZ);
        break;

      case 'back':
        // Vue arriere (depuis -Z, regardant vers +Z)
        this.camera.position.set(centerX, centerY, -viewDistance * 0.6);
        this.target.set(centerX, centerY, centerZ);
        break;
    }

    this.camera.lookAt(this.target);
  }

  /**
   * Sauvegarde l'etat actuel de la camera (position + target)
   */
  saveState(): void {
    this.savedPosition = this.camera.position.clone();
    this.savedTarget = this.target.clone();
  }

  /**
   * Restaure l'etat sauvegarde de la camera
   */
  restoreState(): void {
    if (this.savedPosition && this.savedTarget) {
      this.camera.position.copy(this.savedPosition);
      this.target.copy(this.savedTarget);
      this.camera.lookAt(this.target);
      this.savedPosition = null;
      this.savedTarget = null;
    }
  }

  /**
   * Obtient la caméra Three.js native
   */
  getThreeCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Convertit une position écran en position monde
   */
  screenToWorld(x: number, y: number, z: number = 0): THREE.Vector3 {
    const vector = new THREE.Vector3(x, y, z);
    vector.unproject(this.camera);
    return vector;
  }

  /**
   * Convertit une position monde en position écran
   */
  worldToScreen(position: THREE.Vector3): THREE.Vector2 {
    const vector = position.clone();
    vector.project(this.camera);
    return new THREE.Vector2(vector.x, vector.y);
  }
}
