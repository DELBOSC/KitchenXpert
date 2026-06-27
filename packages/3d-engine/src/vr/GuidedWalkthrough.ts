/**
 * GuidedWalkthrough (F15: Guided VR Walkthrough Tour)
 *
 * Provides automated camera tours through a kitchen design:
 * - Work Triangle tour (sink -> hob -> fridge)
 * - Full kitchen tour around the perimeter
 * - Catmull-Rom spline interpolation for smooth camera movement
 * - Annotation sprites at key points (info, warning, tip)
 * - Play/Pause/Stop/Next/Previous controls
 * - Speed control (0.5x, 1x, 2x)
 * - Auto-pause at annotation waypoints
 *
 * Designed to work with both regular 3D view and VR mode.
 */

import * as THREE from 'three';

// ────────────────────────────── Types ──────────────────────────────

export interface Waypoint {
  /** Camera position at this waypoint */
  position: THREE.Vector3;
  /** Point the camera should look at */
  lookAt: THREE.Vector3;
  /** Time to spend at this waypoint (seconds), 0 = just pass through */
  duration: number;
  /** Optional annotation to display at this waypoint */
  annotation?: {
    text: string;
    type: 'info' | 'warning' | 'tip';
  };
}

export interface KitchenItem {
  id: string;
  type: string; // 'sink', 'hob', 'fridge', 'oven', 'dishwasher', etc.
  name: string;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  dimensions?: { width: number; height: number; depth: number };
}

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}

export type WalkthroughState = 'idle' | 'playing' | 'paused' | 'at_annotation';

export interface WalkthroughEventMap {
  stateChange: { state: WalkthroughState };
  waypointReached: { index: number; waypoint: Waypoint };
  annotationShow: { text: string; type: string; index: number };
  annotationHide: { index: number };
  progress: { progress: number; currentWaypoint: number; totalWaypoints: number };
  complete: void;
}

type EventCallback<T> = (data: T) => void;

// ────────────────────────────── Constants ──────────────────────────────

const EYE_HEIGHT = 1.65; // meters
const ANNOTATION_PAUSE_DURATION = 3.0; // seconds to pause at annotation points
const DEFAULT_TRANSITION_DURATION = 2.0; // seconds between waypoints
const ANNOTATION_OFFSET = new THREE.Vector3(0, 0.3, 0); // offset above look point

// Annotation colors by type
const ANNOTATION_COLORS: Record<string, number> = {
  info: 0x3b82f6, // blue
  warning: 0xf59e0b, // amber
  tip: 0x10b981, // green
};

// ────────────────────────────── GuidedWalkthrough Class ──────────────────────────────

export class GuidedWalkthrough {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private clock = new THREE.Clock(false);

  // Tour state
  private _state: WalkthroughState = 'idle';
  private waypoints: Waypoint[] = [];
  private currentWaypointIndex = 0;
  private spline: THREE.CatmullRomCurve3 | null = null;
  private lookAtSpline: THREE.CatmullRomCurve3 | null = null;
  private splineProgress = 0; // 0 to 1 across current segment
  private segmentDuration = DEFAULT_TRANSITION_DURATION;
  private annotationTimer = 0;
  private speedMultiplier = 1.0;

  // Annotations
  private annotationSprites: THREE.Sprite[] = [];
  private annotationGroup: THREE.Group;

  // Event system
  private listeners: Map<string, Set<EventCallback<any>>> = new Map();

  // Original camera state for restore
  private originalPosition = new THREE.Vector3();
  private originalQuaternion = new THREE.Quaternion();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.annotationGroup = new THREE.Group();
    this.annotationGroup.name = 'guided-walkthrough-annotations';
    this.scene.add(this.annotationGroup);
  }

  // ────────────────────────────── State ──────────────────────────────

  get state(): WalkthroughState {
    return this._state;
  }

  get isPlaying(): boolean {
    return this._state === 'playing';
  }

  get currentWaypoint(): number {
    return this.currentWaypointIndex;
  }

  get totalWaypoints(): number {
    return this.waypoints.length;
  }

  // ────────────────────────────── Tour Generation ──────────────────────────────

  /**
   * Generate a tour along the work triangle path (sink -> hob -> fridge).
   * Creates waypoints at each station with transition points in between.
   */
  generateWorkTriangleTour(kitchenItems: KitchenItem[]): Waypoint[] {
    const sink = kitchenItems.find((i) => i.type === 'sink');
    const hob = kitchenItems.find((i) => i.type === 'hob' || i.type === 'cooktop');
    const fridge = kitchenItems.find((i) => i.type === 'fridge' || i.type === 'refrigerator');

    const waypoints: Waypoint[] = [];

    // If we can't find all three, create a basic tour
    const stations = [sink, hob, fridge].filter(Boolean) as KitchenItem[];

    if (stations.length === 0) {
      // No items found, return a simple center-point tour
      return [
        {
          position: new THREE.Vector3(0, EYE_HEIGHT, 2),
          lookAt: new THREE.Vector3(0, 1, 0),
          duration: 3,
          annotation: { text: "Vue d'ensemble de la cuisine", type: 'info' },
        },
      ];
    }

    // Start: overview position (center, looking at average of stations)
    const center = new THREE.Vector3();
    stations.forEach((s) => center.add(s.position));
    center.divideScalar(stations.length);

    waypoints.push({
      position: new THREE.Vector3(center.x, EYE_HEIGHT, center.z + 2.5),
      lookAt: new THREE.Vector3(center.x, 1.0, center.z),
      duration: 2,
      annotation: {
        text: "Triangle de travail - Vue d'ensemble",
        type: 'info',
      },
    });

    // Visit each station
    for (const station of stations) {
      // Approach waypoint (stand 1m in front)
      const approachOffset = new THREE.Vector3(0, 0, 1.0);
      const approachPos = station.position.clone().add(approachOffset);
      approachPos.y = EYE_HEIGHT;

      waypoints.push({
        position: approachPos,
        lookAt: station.position.clone().setY(1.0),
        duration: 0.5,
      });

      // Station waypoint (pause here with annotation)
      const stationPos = station.position.clone();
      stationPos.y = EYE_HEIGHT;
      stationPos.z += 0.6;

      const typeLabels: Record<string, string> = {
        sink: 'Evier - Zone de lavage',
        hob: 'Plaque de cuisson - Zone de cuisson',
        cooktop: 'Plaque de cuisson - Zone de cuisson',
        fridge: 'Refrigerateur - Zone de stockage',
        refrigerator: 'Refrigerateur - Zone de stockage',
      };

      waypoints.push({
        position: stationPos,
        lookAt: station.position.clone().setY(0.9),
        duration: ANNOTATION_PAUSE_DURATION,
        annotation: {
          text: typeLabels[station.type] || station.name,
          type: 'info',
        },
      });
    }

    // Return to overview
    waypoints.push({
      position: new THREE.Vector3(center.x, EYE_HEIGHT, center.z + 2.5),
      lookAt: new THREE.Vector3(center.x, 1.0, center.z),
      duration: 2,
      annotation: {
        text: 'Fin de la visite du triangle de travail',
        type: 'tip',
      },
    });

    return waypoints;
  }

  /**
   * Generate a full tour around the kitchen perimeter.
   * Starts at entrance, tours the perimeter, pauses at each major appliance,
   * ends at center for overview.
   */
  generateFullTour(kitchenItems: KitchenItem[], roomDimensions: RoomDimensions): Waypoint[] {
    const { width, depth } = roomDimensions;
    const waypoints: Waypoint[] = [];

    const cx = width / 2;
    const cz = depth / 2;

    // Start: entrance (center-front)
    waypoints.push({
      position: new THREE.Vector3(cx, EYE_HEIGHT, depth - 0.5),
      lookAt: new THREE.Vector3(cx, 1.0, cz),
      duration: 2,
      annotation: { text: 'Bienvenue dans votre cuisine', type: 'info' },
    });

    // Walk along the left wall
    waypoints.push({
      position: new THREE.Vector3(0.8, EYE_HEIGHT, depth - 1),
      lookAt: new THREE.Vector3(0.3, 1.0, cz),
      duration: 0,
    });

    waypoints.push({
      position: new THREE.Vector3(0.8, EYE_HEIGHT, 1),
      lookAt: new THREE.Vector3(0.3, 1.0, 0.5),
      duration: 0,
    });

    // Walk along the back wall
    waypoints.push({
      position: new THREE.Vector3(1, EYE_HEIGHT, 0.8),
      lookAt: new THREE.Vector3(cx, 1.0, 0.3),
      duration: 0,
    });

    waypoints.push({
      position: new THREE.Vector3(width - 1, EYE_HEIGHT, 0.8),
      lookAt: new THREE.Vector3(width - 0.3, 1.0, 0.3),
      duration: 0,
    });

    // Walk along the right wall
    waypoints.push({
      position: new THREE.Vector3(width - 0.8, EYE_HEIGHT, 1),
      lookAt: new THREE.Vector3(width - 0.3, 1.0, cz),
      duration: 0,
    });

    waypoints.push({
      position: new THREE.Vector3(width - 0.8, EYE_HEIGHT, depth - 1),
      lookAt: new THREE.Vector3(width - 0.3, 1.0, depth - 0.5),
      duration: 0,
    });

    // Visit major appliances along the way
    const majorAppliances = kitchenItems.filter((item) =>
      ['sink', 'hob', 'cooktop', 'fridge', 'refrigerator', 'oven', 'dishwasher'].includes(item.type)
    );

    for (const appliance of majorAppliances) {
      const viewPos = appliance.position.clone();
      // Position camera 1m back from appliance
      viewPos.z = Math.min(viewPos.z + 1.0, depth - 0.5);
      viewPos.y = EYE_HEIGHT;

      const typeNames: Record<string, string> = {
        sink: 'Evier',
        hob: 'Plaque de cuisson',
        cooktop: 'Plaque de cuisson',
        fridge: 'Refrigerateur',
        refrigerator: 'Refrigerateur',
        oven: 'Four',
        dishwasher: 'Lave-vaisselle',
      };

      waypoints.push({
        position: viewPos,
        lookAt: appliance.position.clone().setY(0.9),
        duration: ANNOTATION_PAUSE_DURATION,
        annotation: {
          text: typeNames[appliance.type] || appliance.name,
          type: 'info',
        },
      });
    }

    // End: center overview
    waypoints.push({
      position: new THREE.Vector3(cx, EYE_HEIGHT + 0.5, cz),
      lookAt: new THREE.Vector3(cx, 0.5, cz - 1),
      duration: 3,
      annotation: {
        text: "Vue d'ensemble - Fin de la visite",
        type: 'tip',
      },
    });

    return waypoints;
  }

  // ────────────────────────────── Playback Controls ──────────────────────────────

  /**
   * Start or resume the guided tour with the given waypoints.
   * If waypoints are provided, they replace the current tour.
   */
  play(waypoints?: Waypoint[]): void {
    if (waypoints && waypoints.length > 0) {
      this.waypoints = waypoints;
      this.currentWaypointIndex = 0;
      this.splineProgress = 0;
      this.annotationTimer = 0;

      // Save original camera state
      this.originalPosition.copy(this.camera.position);
      this.originalQuaternion.copy(this.camera.quaternion);

      // Build splines
      this.buildSplines();

      // Create annotation sprites
      this.createAnnotationSprites();
    }

    if (this.waypoints.length === 0) {
      return;
    }

    this.setState('playing');
    this.clock.start();
  }

  /**
   * Pause the tour at the current position.
   */
  pause(): void {
    if (this._state === 'playing' || this._state === 'at_annotation') {
      this.setState('paused');
      this.clock.stop();
    }
  }

  /**
   * Skip to the next waypoint.
   */
  next(): void {
    if (this.currentWaypointIndex < this.waypoints.length - 1) {
      this.currentWaypointIndex++;
      this.splineProgress = 0;
      this.annotationTimer = 0;
      this.applyWaypoint(this.waypoints[this.currentWaypointIndex]!);
      this.emitProgress();

      if (this._state === 'playing' || this._state === 'at_annotation') {
        this.checkAnnotation();
      }
    }
  }

  /**
   * Skip to the previous waypoint.
   */
  previous(): void {
    if (this.currentWaypointIndex > 0) {
      this.currentWaypointIndex--;
      this.splineProgress = 0;
      this.annotationTimer = 0;
      this.applyWaypoint(this.waypoints[this.currentWaypointIndex]!);
      this.emitProgress();

      if (this._state === 'playing' || this._state === 'at_annotation') {
        this.checkAnnotation();
      }
    }
  }

  /**
   * Stop the tour and reset to the starting position.
   */
  stop(): void {
    this.setState('idle');
    this.clock.stop();
    this.currentWaypointIndex = 0;
    this.splineProgress = 0;
    this.annotationTimer = 0;

    // Restore original camera position
    this.camera.position.copy(this.originalPosition);
    this.camera.quaternion.copy(this.originalQuaternion);

    // Remove annotation sprites
    this.clearAnnotationSprites();
  }

  /**
   * Set the playback speed multiplier.
   */
  setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(5.0, multiplier));
  }

  /**
   * Get the current progress as a value from 0 to 1.
   */
  getProgress(): number {
    if (this.waypoints.length <= 1) return 0;
    const segmentProgress = this.splineProgress;
    const waypointContribution = this.currentWaypointIndex / (this.waypoints.length - 1);
    const segmentContribution = segmentProgress / (this.waypoints.length - 1);
    return Math.min(1, waypointContribution + segmentContribution);
  }

  /**
   * Get the current waypoint data.
   */
  getCurrentWaypoint(): Waypoint | null {
    return this.waypoints[this.currentWaypointIndex] ?? null;
  }

  // ────────────────────────────── Update Loop ──────────────────────────────

  /**
   * Update the walkthrough. Call this in your animation loop.
   */
  update(deltaTime: number): void {
    if (this._state !== 'playing' && this._state !== 'at_annotation') {
      return;
    }

    const dt = deltaTime * this.speedMultiplier;

    // Handle annotation pause
    if (this._state === 'at_annotation') {
      this.annotationTimer += dt;
      const currentWp = this.waypoints[this.currentWaypointIndex];
      const pauseDuration = currentWp?.duration ?? ANNOTATION_PAUSE_DURATION;

      if (this.annotationTimer >= pauseDuration) {
        // Annotation pause complete, move to next waypoint
        this.emit('annotationHide', { index: this.currentWaypointIndex });
        this.annotationTimer = 0;

        if (this.currentWaypointIndex < this.waypoints.length - 1) {
          this.currentWaypointIndex++;
          this.splineProgress = 0;
          this.setState('playing');
          this.emitProgress();
        } else {
          // Tour complete
          this.emit('complete', undefined as any);
          this.stop();
          return;
        }
      }
      return;
    }

    // Playing state: interpolate camera along spline
    if (!this.spline || !this.lookAtSpline) {
      return;
    }

    // Calculate duration for this segment
    this.segmentDuration = DEFAULT_TRANSITION_DURATION;
    const currentWp = this.waypoints[this.currentWaypointIndex];
    if (currentWp && currentWp.duration === 0) {
      // Pass-through waypoint, use default transition time
      this.segmentDuration = DEFAULT_TRANSITION_DURATION;
    }

    // Advance progress
    this.splineProgress += dt / this.segmentDuration;

    if (this.splineProgress >= 1.0) {
      // Reached current waypoint
      this.splineProgress = 1.0;
      this.applyWaypoint(this.waypoints[this.currentWaypointIndex]!);
      this.emit('waypointReached', {
        index: this.currentWaypointIndex,
        waypoint: this.waypoints[this.currentWaypointIndex]!,
      });
      this.emitProgress();

      // Check if we should pause for annotation
      this.checkAnnotation();

      // Re-read state since checkAnnotation() may have changed it to 'at_annotation'
      if ((this._state as string) !== 'at_annotation') {
        // Move to next segment
        if (this.currentWaypointIndex < this.waypoints.length - 1) {
          this.currentWaypointIndex++;
          this.splineProgress = 0;
          this.emitProgress();
        } else {
          // Tour complete
          this.emit('complete', undefined as any);
          this.stop();
          return;
        }
      }
    } else {
      // Interpolate camera position and lookAt
      this.interpolateCamera();
    }
  }

  // ────────────────────────────── Annotations ──────────────────────────────

  /**
   * Add a standalone annotation at a position.
   */
  addAnnotation(
    position: THREE.Vector3,
    text: string,
    type: 'info' | 'warning' | 'tip' = 'info'
  ): void {
    const sprite = this.createAnnotationSprite(text, type);
    sprite.position.copy(position).add(ANNOTATION_OFFSET);
    this.annotationGroup.add(sprite);
    this.annotationSprites.push(sprite);
  }

  // ────────────────────────────── Event System ──────────────────────────────

  on<K extends keyof WalkthroughEventMap>(
    event: K,
    callback: EventCallback<WalkthroughEventMap[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof WalkthroughEventMap>(
    event: K,
    callback: EventCallback<WalkthroughEventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit<K extends keyof WalkthroughEventMap>(event: K, data: WalkthroughEventMap[K]): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // ────────────────────────────── Internal ──────────────────────────────

  private setState(state: WalkthroughState): void {
    if (this._state !== state) {
      this._state = state;
      this.emit('stateChange', { state });
    }
  }

  private buildSplines(): void {
    if (this.waypoints.length < 2) {
      this.spline = null;
      this.lookAtSpline = null;
      return;
    }

    const positions = this.waypoints.map((wp) => wp.position.clone());
    const lookAts = this.waypoints.map((wp) => wp.lookAt.clone());

    this.spline = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.5);
    this.lookAtSpline = new THREE.CatmullRomCurve3(lookAts, false, 'catmullrom', 0.5);
  }

  private interpolateCamera(): void {
    if (!this.spline || !this.lookAtSpline || this.waypoints.length < 2) {
      return;
    }

    // Convert waypoint index + segment progress to overall spline t
    const totalSegments = this.waypoints.length - 1;

    // Smooth easing (ease in-out)
    const localT = this.splineProgress;
    const easedLocalT = localT < 0.5 ? 2 * localT * localT : 1 - Math.pow(-2 * localT + 2, 2) / 2;

    // Interpolate between current and next waypoint on the spline
    const prevIdx = this.currentWaypointIndex;
    const nextIdx = Math.min(prevIdx + 1, this.waypoints.length - 1);
    const prevT = prevIdx / totalSegments;
    const nextT = nextIdx / totalSegments;
    const segT = prevT + (nextT - prevT) * easedLocalT;

    const pos = this.spline.getPoint(segT);
    const lookAt = this.lookAtSpline.getPoint(segT);

    this.camera.position.copy(pos);
    this.camera.lookAt(lookAt);
  }

  private applyWaypoint(waypoint: Waypoint): void {
    this.camera.position.copy(waypoint.position);
    this.camera.lookAt(waypoint.lookAt);
  }

  private checkAnnotation(): void {
    const wp = this.waypoints[this.currentWaypointIndex];
    if (wp && wp.annotation && wp.duration > 0) {
      this.setState('at_annotation');
      this.annotationTimer = 0;
      this.emit('annotationShow', {
        text: wp.annotation.text,
        type: wp.annotation.type,
        index: this.currentWaypointIndex,
      });
    }
  }

  private emitProgress(): void {
    this.emit('progress', {
      progress: this.getProgress(),
      currentWaypoint: this.currentWaypointIndex,
      totalWaypoints: this.waypoints.length,
    });
  }

  // ────────────────────────────── Annotation Sprites ──────────────────────────────

  private createAnnotationSprites(): void {
    this.clearAnnotationSprites();

    this.waypoints.forEach((wp, index) => {
      if (wp.annotation) {
        const sprite = this.createAnnotationSprite(wp.annotation.text, wp.annotation.type);
        sprite.position.copy(wp.lookAt).add(ANNOTATION_OFFSET);
        sprite.userData = { waypointIndex: index };
        this.annotationGroup.add(sprite);
        this.annotationSprites.push(sprite);
      }
    });
  }

  private createAnnotationSprite(text: string, type: 'info' | 'warning' | 'tip'): THREE.Sprite {
    // Create a canvas for the annotation billboard
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    // Background
    const color = ANNOTATION_COLORS[type] ?? ANNOTATION_COLORS['info'] ?? 0x3b82f6;
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 12);
    ctx.fill();

    // Icon
    const icons: Record<string, string> = {
      info: 'i',
      warning: '!',
      tip: '*',
    };
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.beginPath();
    ctx.arc(40, canvas.height / 2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillText(icons[type] || 'i', 40, canvas.height / 2);

    // Text
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Word wrap
    const maxWidth = canvas.width - 80;
    const words = text.split(' ');
    let line = '';
    let y = canvas.height / 2 - 12;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, 68, y);
        line = word;
        y += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 68, y);

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    sprite.name = `annotation-${type}`;

    return sprite;
  }

  private clearAnnotationSprites(): void {
    this.annotationSprites.forEach((sprite) => {
      this.annotationGroup.remove(sprite);
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
    });
    this.annotationSprites = [];
  }

  // ────────────────────────────── Cleanup ──────────────────────────────

  /**
   * Dispose all resources used by the walkthrough.
   */
  dispose(): void {
    this.stop();
    this.clearAnnotationSprites();
    this.scene.remove(this.annotationGroup);
    this.listeners.clear();
    this.waypoints = [];
    this.spline = null;
    this.lookAtSpline = null;
  }
}

export default GuidedWalkthrough;
