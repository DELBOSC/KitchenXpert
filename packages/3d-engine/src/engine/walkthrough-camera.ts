import * as THREE from 'three';

/**
 * Configuration for the first-person walkthrough camera.
 */
export interface WalkthroughConfig {
  /** Eye height in meters. Default 1.65m. */
  eyeHeight: number;
  /** Movement speed in m/s. Default 3.0. */
  moveSpeed: number;
  /** Mouse look sensitivity in radians/pixel. Default 0.002. */
  lookSpeed: number;
  /** Collision radius in meters. Default 0.3m. */
  collisionRadius: number;
}

const DEFAULT_CONFIG: WalkthroughConfig = {
  eyeHeight: 1.65,
  moveSpeed: 3.0,
  lookSpeed: 0.002,
  collisionRadius: 0.3,
};

/**
 * First-person walkthrough camera with WASD movement, mouse look,
 * pointer lock, and wall collision detection.
 */
export class WalkthroughCamera {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private config: WalkthroughConfig;
  private active: boolean = false;
  private velocity: THREE.Vector3;
  private keys: Map<string, boolean>;
  private euler: THREE.Euler;
  private walls: THREE.Object3D[] = [];
  private raycaster: THREE.Raycaster;

  // Bound event handlers for proper cleanup
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnPointerLockChange: () => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    config?: Partial<WalkthroughConfig>
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.velocity = new THREE.Vector3();
    this.keys = new Map<string, boolean>();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.raycaster = new THREE.Raycaster();

    // Pre-bind event handlers
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnPointerLockChange = this.onPointerLockChange.bind(this);
  }

  /**
   * Activates the walkthrough mode.
   * Requests pointer lock, sets camera height, and registers input listeners.
   */
  activate(startPosition?: THREE.Vector3): void {
    if (this.active) {
      return;
    }

    this.active = true;

    // Set camera position
    if (startPosition) {
      this.camera.position.copy(startPosition);
    }
    this.camera.position.y = this.config.eyeHeight;

    // Initialize euler from current camera rotation
    this.euler.setFromQuaternion(this.camera.quaternion);

    // Clear key state
    this.keys.clear();

    // Request pointer lock
    this.domElement.requestPointerLock();

    // Register event listeners
    document.addEventListener('keydown', this.boundOnKeyDown);
    document.addEventListener('keyup', this.boundOnKeyUp);
    document.addEventListener('mousemove', this.boundOnMouseMove);
    document.addEventListener('pointerlockchange', this.boundOnPointerLockChange);
  }

  /**
   * Deactivates the walkthrough mode.
   * Exits pointer lock and removes event listeners.
   */
  deactivate(): void {
    if (!this.active) {
      return;
    }

    this.active = false;

    // Exit pointer lock
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }

    // Remove event listeners
    document.removeEventListener('keydown', this.boundOnKeyDown);
    document.removeEventListener('keyup', this.boundOnKeyUp);
    document.removeEventListener('mousemove', this.boundOnMouseMove);
    document.removeEventListener('pointerlockchange', this.boundOnPointerLockChange);

    // Reset velocity and keys
    this.velocity.set(0, 0, 0);
    this.keys.clear();
  }

  /**
   * Updates camera position based on pressed keys and collision detection.
   * Should be called once per frame with the time delta.
   */
  update(delta: number): void {
    if (!this.active) {
      return;
    }

    // Compute desired movement direction in camera-local space
    const moveDirection = new THREE.Vector3();

    if (this.keys.get('KeyW') || this.keys.get('ArrowUp')) {
      moveDirection.z -= 1;
    }
    if (this.keys.get('KeyS') || this.keys.get('ArrowDown')) {
      moveDirection.z += 1;
    }
    if (this.keys.get('KeyA') || this.keys.get('ArrowLeft')) {
      moveDirection.x -= 1;
    }
    if (this.keys.get('KeyD') || this.keys.get('ArrowRight')) {
      moveDirection.x += 1;
    }

    // Normalize to prevent faster diagonal movement
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();
    }

    // Transform direction from camera-local to world space (only yaw, no pitch)
    const yawRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.euler.y, 0));
    moveDirection.applyQuaternion(yawRotation);

    // Apply speed
    this.velocity.copy(moveDirection).multiplyScalar(this.config.moveSpeed * delta);

    // Keep movement on the XZ plane (maintain eye height)
    this.velocity.y = 0;

    // Collision detection: try to move, sliding along wall normals on collision
    if (this.velocity.lengthSq() > 0) {
      const newPosition = this.camera.position.clone().add(this.velocity);
      const resolvedPosition = this.resolveCollision(this.camera.position, newPosition);
      resolvedPosition.y = this.config.eyeHeight;
      this.camera.position.copy(resolvedPosition);
    }
  }

  /**
   * Sets the wall objects used for collision detection.
   */
  setWalls(walls: THREE.Object3D[]): void {
    this.walls = walls;
  }

  isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    this.deactivate();
    this.walls = [];
  }

  // --- Private event handlers ---

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.active) {
      return;
    }
    this.keys.set(event.code, true);
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (!this.active) {
      return;
    }
    this.keys.set(event.code, false);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.active || document.pointerLockElement !== this.domElement) {
      return;
    }

    // Update yaw (horizontal) and pitch (vertical)
    this.euler.y -= event.movementX * this.config.lookSpeed;
    this.euler.x -= event.movementY * this.config.lookSpeed;

    // Clamp pitch to +/- 85 degrees to prevent flipping
    const maxPitch = (85 * Math.PI) / 180;
    this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));

    // Apply rotation to camera
    this.camera.quaternion.setFromEuler(this.euler);
  }

  private onPointerLockChange(): void {
    // If pointer lock was lost (e.g., ESC pressed), deactivate walkthrough
    if (this.active && document.pointerLockElement !== this.domElement) {
      this.deactivate();
    }
  }

  // --- Private collision helpers ---

  /**
   * Resolves collision between current position and desired new position.
   * If a collision is detected, slides along the wall normal.
   */
  private resolveCollision(currentPos: THREE.Vector3, desiredPos: THREE.Vector3): THREE.Vector3 {
    if (this.walls.length === 0) {
      return desiredPos;
    }

    const moveVector = desiredPos.clone().sub(currentPos);
    const moveLength = moveVector.length();

    if (moveLength === 0) {
      return desiredPos;
    }

    const moveDirection = moveVector.clone().normalize();

    // Raycast in the movement direction from the current position (at foot level)
    const rayOrigin = currentPos.clone();
    rayOrigin.y = this.config.eyeHeight * 0.5; // Ray from mid-body height

    this.raycaster.set(rayOrigin, moveDirection);
    this.raycaster.far = moveLength + this.config.collisionRadius;

    const intersections = this.raycaster.intersectObjects(this.walls, true);

    if (intersections.length === 0) {
      return desiredPos;
    }

    const closest = intersections[0]!;

    if (closest.distance > moveLength + this.config.collisionRadius) {
      // No actual collision within range
      return desiredPos;
    }

    // Collision detected: slide along the wall
    if (closest.face) {
      const wallNormal = closest.face.normal.clone();
      // Transform normal to world space
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(closest.object.matrixWorld);
      wallNormal.applyMatrix3(normalMatrix).normalize();
      wallNormal.y = 0; // Keep sliding on XZ plane
      wallNormal.normalize();

      // Remove the component of movement that goes into the wall
      const dot = moveVector.dot(wallNormal);
      if (dot < 0) {
        // Moving toward the wall, remove that component
        const slideVector = moveVector.clone().sub(wallNormal.multiplyScalar(dot));
        const slidePos = currentPos.clone().add(slideVector);

        // Verify the slide position is also collision-free
        const slideDir = slideVector.clone();
        const slideLength = slideDir.length();
        if (slideLength > 0.001) {
          slideDir.normalize();
          this.raycaster.set(rayOrigin, slideDir);
          this.raycaster.far = slideLength + this.config.collisionRadius;
          const slideIntersections = this.raycaster.intersectObjects(this.walls, true);

          if (slideIntersections.length > 0) {
            const slideClosest = slideIntersections[0]!;
            if (slideClosest.distance <= slideLength + this.config.collisionRadius) {
              // Also blocked in slide direction, stay put
              return currentPos;
            }
          }
        }

        return slidePos;
      }
    }

    // Fallback: stop at collision point minus radius
    const safeDistance = Math.max(0, closest.distance - this.config.collisionRadius);
    return currentPos.clone().add(moveDirection.multiplyScalar(safeDistance));
  }
}
