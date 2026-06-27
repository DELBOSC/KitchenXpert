import * as THREE from 'three';

/**
 * Configuration for a cabinet/appliance animation
 */
export interface AnimationConfig {
  type: 'door_swing' | 'door_slide' | 'drawer_pull' | 'oven_drop' | 'fridge_open';
  duration: number; // ms
  easing: 'linear' | 'easeInOut' | 'easeOut';
}

/**
 * Internal state for a running animation
 */
interface AnimationState {
  objectId: string;
  mesh: THREE.Object3D;
  config: AnimationConfig;
  progress: number; // 0 to 1
  direction: 'opening' | 'closing';
  originalTransform: { position: THREE.Vector3; rotation: THREE.Euler };
  startTime: number;
}

/**
 * Easing functions for smooth animations
 */
function easeLinear(t: number): number {
  return t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOut(t: number): number {
  return t * (2 - t);
}

function getEasingFunction(easing: AnimationConfig['easing']): (t: number) => number {
  switch (easing) {
    case 'linear':
      return easeLinear;
    case 'easeInOut':
      return easeInOut;
    case 'easeOut':
      return easeOut;
    default:
      return easeInOut;
  }
}

/**
 * Degrees to radians helper
 */
function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Cabinet door and drawer animation system.
 *
 * Handles open/close animations for:
 * - Standard cabinet doors (swing open to 110 degrees)
 * - Sliding doors (translate along X axis)
 * - Drawers (pull out along Z axis, 80% of depth)
 * - Oven doors (drop down 90 degrees around bottom edge)
 * - Fridge doors (swing open 120 degrees around side hinge)
 *
 * Call `update()` every frame in the render loop to advance animations.
 */
export class AnimationSystem {
  private activeAnimations: Map<string, AnimationState> = new Map();
  private clock: THREE.Clock = new THREE.Clock();

  /**
   * Toggle open/close animation for an object (door, drawer, etc.)
   * If the object is currently closed or closing, it will open.
   * If the object is currently open or opening, it will close.
   */
  toggleAnimation(objectId: string, mesh: THREE.Object3D, config: AnimationConfig): void {
    if (config.duration <= 0) {
      throw new Error(
        `AnimationSystem: config.duration must be greater than 0, received ${config.duration}`
      );
    }

    const existing = this.activeAnimations.get(objectId);

    if (existing) {
      // Reverse the current animation direction
      existing.direction = existing.direction === 'opening' ? 'closing' : 'opening';
      // Adjust start time so progress continues smoothly from current position
      existing.startTime = performance.now() - existing.progress * existing.config.duration;

      // When reversing, we need to re-base the start time for the remaining animation
      if (existing.direction === 'closing') {
        existing.startTime = performance.now() - (1 - existing.progress) * existing.config.duration;
      }
      return;
    }

    // Create a new animation state
    const state: AnimationState = {
      objectId,
      mesh,
      config,
      progress: 0,
      direction: 'opening',
      originalTransform: {
        position: mesh.position.clone(),
        rotation: mesh.rotation.clone(),
      },
      startTime: performance.now(),
    };

    this.activeAnimations.set(objectId, state);
  }

  /**
   * Animate a cabinet door swinging open (rotation around hinge axis).
   * Opens to 110 degrees for standard doors.
   *
   * The hinge pivot is at the left edge of the door. To rotate around
   * that edge, we translate the door so the hinge is at the origin,
   * apply rotation, then translate back.
   */
  private animateDoorSwing(mesh: THREE.Object3D, state: AnimationState): void {
    const easingFn = getEasingFunction(state.config.easing);
    const easedProgress = easingFn(state.progress);

    // Target angle: 110 degrees for standard cabinet doors
    const targetAngle = degToRad(110);

    // Calculate the current angle based on direction
    let currentAngle: number;
    if (state.direction === 'opening') {
      currentAngle = easedProgress * targetAngle;
    } else {
      currentAngle = (1 - easedProgress) * targetAngle;
    }

    // Compute the door bounding box to find the hinge edge offset
    const bbox = new THREE.Box3().setFromObject(mesh);
    const doorWidth = bbox.max.x - bbox.min.x;

    // Reset to original rotation
    mesh.rotation.copy(state.originalTransform.rotation);
    mesh.position.copy(state.originalTransform.position);

    // To rotate around the hinge (left edge), we offset to pivot:
    // 1. Translate so the hinge edge is at origin
    // 2. Rotate around Y axis
    // 3. Translate back
    const hingeOffset = -doorWidth / 2;

    // Apply hinge-based rotation using a pivot group technique inline
    const pivotX = state.originalTransform.position.x + hingeOffset;
    const pivotZ = state.originalTransform.position.z;

    const dx = state.originalTransform.position.x - pivotX;
    const dz = state.originalTransform.position.z - pivotZ;

    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);

    mesh.position.x = pivotX + dx * cos - dz * sin;
    mesh.position.z = pivotZ + dx * sin + dz * cos;
    mesh.rotation.y = state.originalTransform.rotation.y + currentAngle;
  }

  /**
   * Animate a sliding door (translate along X axis).
   * Slides by the full width of the door.
   */
  private animateDoorSlide(mesh: THREE.Object3D, state: AnimationState): void {
    const easingFn = getEasingFunction(state.config.easing);
    const easedProgress = easingFn(state.progress);

    // Calculate the slide distance from the bounding box
    const bbox = new THREE.Box3().setFromObject(mesh);
    const doorWidth = bbox.max.x - bbox.min.x;

    let slideAmount: number;
    if (state.direction === 'opening') {
      slideAmount = easedProgress * doorWidth;
    } else {
      slideAmount = (1 - easedProgress) * doorWidth;
    }

    mesh.position.x = state.originalTransform.position.x + slideAmount;
  }

  /**
   * Animate a drawer pulling out (translate along Z axis).
   * Full extension: 80% of drawer depth.
   */
  private animateDrawerPull(mesh: THREE.Object3D, state: AnimationState): void {
    const easingFn = getEasingFunction(state.config.easing);
    const easedProgress = easingFn(state.progress);

    // Calculate the pull distance from the bounding box (80% of depth)
    const bbox = new THREE.Box3().setFromObject(mesh);
    const drawerDepth = bbox.max.z - bbox.min.z;
    const maxExtension = drawerDepth * 0.8;

    let pullAmount: number;
    if (state.direction === 'opening') {
      pullAmount = easedProgress * maxExtension;
    } else {
      pullAmount = (1 - easedProgress) * maxExtension;
    }

    mesh.position.z = state.originalTransform.position.z + pullAmount;
  }

  /**
   * Animate oven door dropping down (rotation around bottom edge).
   * Rotates from 0 to -90 degrees around the X axis.
   */
  private animateOvenDrop(mesh: THREE.Object3D, state: AnimationState): void {
    const easingFn = getEasingFunction(state.config.easing);
    const easedProgress = easingFn(state.progress);

    // Target angle: -90 degrees (door drops forward)
    const targetAngle = degToRad(-90);

    let currentAngle: number;
    if (state.direction === 'opening') {
      currentAngle = easedProgress * targetAngle;
    } else {
      currentAngle = (1 - easedProgress) * targetAngle;
    }

    // Compute pivot at the bottom edge
    const bbox = new THREE.Box3().setFromObject(mesh);
    const doorHeight = bbox.max.y - bbox.min.y;

    // Reset to original transform
    mesh.rotation.copy(state.originalTransform.rotation);
    mesh.position.copy(state.originalTransform.position);

    // Pivot at the bottom edge: offset is -height/2 in Y
    const pivotY = state.originalTransform.position.y - doorHeight / 2;
    const pivotZ = state.originalTransform.position.z;

    const dy = state.originalTransform.position.y - pivotY;
    const dz = state.originalTransform.position.z - pivotZ;

    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);

    mesh.position.y = pivotY + dy * cos - dz * sin;
    mesh.position.z = pivotZ + dy * sin + dz * cos;
    mesh.rotation.x = state.originalTransform.rotation.x + currentAngle;
  }

  /**
   * Animate fridge door opening (rotation around side hinge).
   * Rotates from 0 to 120 degrees around the Y axis.
   */
  private animateFridgeOpen(mesh: THREE.Object3D, state: AnimationState): void {
    const easingFn = getEasingFunction(state.config.easing);
    const easedProgress = easingFn(state.progress);

    // Target angle: 120 degrees for fridge doors (wider swing)
    const targetAngle = degToRad(120);

    let currentAngle: number;
    if (state.direction === 'opening') {
      currentAngle = easedProgress * targetAngle;
    } else {
      currentAngle = (1 - easedProgress) * targetAngle;
    }

    // Compute pivot at the hinge side (left edge)
    const bbox = new THREE.Box3().setFromObject(mesh);
    const doorWidth = bbox.max.x - bbox.min.x;

    // Reset to original transform
    mesh.rotation.copy(state.originalTransform.rotation);
    mesh.position.copy(state.originalTransform.position);

    // Pivot at the hinge edge (left side of fridge door)
    const hingeOffset = -doorWidth / 2;
    const pivotX = state.originalTransform.position.x + hingeOffset;
    const pivotZ = state.originalTransform.position.z;

    const dx = state.originalTransform.position.x - pivotX;
    const dz = state.originalTransform.position.z - pivotZ;

    const cos = Math.cos(currentAngle);
    const sin = Math.sin(currentAngle);

    mesh.position.x = pivotX + dx * cos - dz * sin;
    mesh.position.z = pivotZ + dx * sin + dz * cos;
    mesh.rotation.y = state.originalTransform.rotation.y + currentAngle;
  }

  /**
   * Update all active animations. Call this in the render loop.
   */
  update(): void {
    const now = performance.now();
    const completedIds: string[] = [];

    for (const [id, state] of this.activeAnimations) {
      const elapsed = now - state.startTime;
      const rawProgress = Math.min(elapsed / state.config.duration, 1);

      state.progress = rawProgress;

      // Dispatch to the appropriate animation handler
      switch (state.config.type) {
        case 'door_swing':
          this.animateDoorSwing(state.mesh, state);
          break;
        case 'door_slide':
          this.animateDoorSlide(state.mesh, state);
          break;
        case 'drawer_pull':
          this.animateDrawerPull(state.mesh, state);
          break;
        case 'oven_drop':
          this.animateOvenDrop(state.mesh, state);
          break;
        case 'fridge_open':
          this.animateFridgeOpen(state.mesh, state);
          break;
      }

      // Check if animation is complete
      if (rawProgress >= 1) {
        completedIds.push(id);
      }
    }

    // Remove completed animations
    for (const id of completedIds) {
      this.activeAnimations.delete(id);
    }
  }

  /**
   * Check if any animation is currently playing
   */
  get isAnimating(): boolean {
    return this.activeAnimations.size > 0;
  }

  /**
   * Get the number of active animations
   */
  get activeCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * Check if a specific object has an active animation
   */
  isObjectAnimating(objectId: string): boolean {
    return this.activeAnimations.has(objectId);
  }

  /**
   * Get the animation state for a specific object (if any)
   */
  getAnimationState(objectId: string): AnimationState | undefined {
    return this.activeAnimations.get(objectId);
  }

  /**
   * Stop all animations and reset positions to original transforms
   */
  resetAll(): void {
    for (const [, state] of this.activeAnimations) {
      state.mesh.position.copy(state.originalTransform.position);
      state.mesh.rotation.copy(state.originalTransform.rotation);
    }
    this.activeAnimations.clear();
  }

  /**
   * Stop a specific animation and reset its position
   */
  resetAnimation(objectId: string): void {
    const state = this.activeAnimations.get(objectId);
    if (state) {
      state.mesh.position.copy(state.originalTransform.position);
      state.mesh.rotation.copy(state.originalTransform.rotation);
      this.activeAnimations.delete(objectId);
    }
  }

  /**
   * Create default animation configs for common cabinet/appliance types
   */
  static getDefaultConfig(type: AnimationConfig['type']): AnimationConfig {
    switch (type) {
      case 'door_swing':
        return { type: 'door_swing', duration: 400, easing: 'easeInOut' };
      case 'door_slide':
        return { type: 'door_slide', duration: 350, easing: 'easeOut' };
      case 'drawer_pull':
        return { type: 'drawer_pull', duration: 300, easing: 'easeOut' };
      case 'oven_drop':
        return { type: 'oven_drop', duration: 500, easing: 'easeInOut' };
      case 'fridge_open':
        return { type: 'fridge_open', duration: 600, easing: 'easeInOut' };
      default:
        return { type: 'door_swing', duration: 400, easing: 'easeInOut' };
    }
  }

  /**
   * Dispose the animation system and release resources.
   * Resets all active animations before clearing.
   */
  dispose(): void {
    this.resetAll();
    this.clock.stop();
  }
}
