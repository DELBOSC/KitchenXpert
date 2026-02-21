import * as THREE from 'three';
import { generateId } from '../utils/generate-id';

/**
 * A completed or in-progress measurement between two points.
 */
export interface Measurement {
  id: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  distance: number;
  line: THREE.Line;
  label: THREE.Sprite;
}

/**
 * Interactive measurement tool for the 3D kitchen editor.
 * Click twice on the floor plane to measure distances.
 * Displays dashed yellow lines with distance labels in cm.
 */
export class MeasurementTool {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private measureGroup: THREE.Group;
  private measurements: Map<string, Measurement>;
  private active: boolean = false;
  private pendingStart: THREE.Vector3 | null = null;
  private previewLine: THREE.Line | null = null;
  private previewLabel: THREE.Sprite | null = null;
  private floorPlane: THREE.Plane;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.measureGroup = new THREE.Group();
    this.measureGroup.name = '__measurements__';
    this.measurements = new Map<string, Measurement>();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.scene.add(this.measureGroup);
  }

  /**
   * Activates or deactivates the measurement tool.
   * When deactivated, clears any pending start point and preview line.
   */
  setActive(active: boolean): void {
    this.active = active;

    if (!active) {
      this.pendingStart = null;
      this.clearPreview();
    }
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Handles a click in NDC (Normalized Device Coordinates).
   * First click sets the start point. Second click completes the measurement.
   * Returns true if a measurement was completed on this click.
   */
  handleClick(ndc: THREE.Vector2): boolean {
    if (!this.active) {
      return false;
    }

    const hitPoint = this.raycastFloor(ndc);
    if (!hitPoint) {
      return false;
    }

    if (this.pendingStart === null) {
      // First click: set start point
      this.pendingStart = hitPoint.clone();
      return false;
    }

    // Second click: create the final measurement
    const start = this.pendingStart;
    const end = hitPoint.clone();
    const distance = start.distanceTo(end);

    // Generate unique id
    const id = generateId('measure');

    // Create measurement line (dashed yellow)
    const line = this.createMeasurementLine(start, end, 1.0);

    // Create label sprite at midpoint
    const label = this.createDistanceLabel(start, end, distance, 1.0);

    // Store the measurement
    const measurement: Measurement = {
      id,
      start: start.clone(),
      end: end.clone(),
      distance,
      line,
      label,
    };

    this.measurements.set(id, measurement);
    this.measureGroup.add(line);
    this.measureGroup.add(label);

    // Reset pending state and clear preview
    this.pendingStart = null;
    this.clearPreview();

    return true;
  }

  /**
   * Handles mouse move in NDC for the preview line between first and second click.
   */
  handleMouseMove(ndc: THREE.Vector2): void {
    if (!this.active || this.pendingStart === null) {
      return;
    }

    const hitPoint = this.raycastFloor(ndc);
    if (!hitPoint) {
      return;
    }

    // Clear previous preview
    this.clearPreview();

    // Create preview line (semi-transparent)
    this.previewLine = this.createMeasurementLine(this.pendingStart, hitPoint, 0.5);
    this.measureGroup.add(this.previewLine);

    // Create preview label
    const distance = this.pendingStart.distanceTo(hitPoint);
    this.previewLabel = this.createDistanceLabel(this.pendingStart, hitPoint, distance, 0.5);
    this.measureGroup.add(this.previewLabel);
  }

  /**
   * Removes a specific measurement by ID.
   */
  removeMeasurement(id: string): void {
    const measurement = this.measurements.get(id);
    if (!measurement) {
      return;
    }

    this.disposeMeasurementVisuals(measurement);
    this.measurements.delete(id);
  }

  /**
   * Removes all measurements.
   */
  clearAll(): void {
    for (const [, measurement] of this.measurements) {
      this.disposeMeasurementVisuals(measurement);
    }
    this.measurements.clear();
    this.clearPreview();
    this.pendingStart = null;
  }

  /**
   * Returns all current measurements as an array.
   */
  getMeasurements(): Measurement[] {
    return Array.from(this.measurements.values());
  }

  /**
   * Disposes the measurement tool and removes all visuals from the scene.
   */
  dispose(): void {
    this.clearAll();
    this.scene.remove(this.measureGroup);
  }

  // --- Private helpers ---

  /**
   * Raycasts from NDC coordinates against the floor plane.
   * Returns the intersection point or null.
   */
  private raycastFloor(ndc: THREE.Vector2): THREE.Vector3 | null {
    this.raycaster.setFromCamera(ndc, this.camera);

    const intersection = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.floorPlane, intersection);

    return result;
  }

  /**
   * Creates a dashed yellow measurement line between two points.
   */
  private createMeasurementLine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    opacity: number
  ): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

    const material = new THREE.LineDashedMaterial({
      color: 0xffd700,
      dashSize: 0.1,
      gapSize: 0.05,
      linewidth: 2,
      transparent: opacity < 1.0,
      opacity,
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();

    return line;
  }

  /**
   * Creates a distance label sprite at the midpoint between two points.
   * Displays the distance in cm (format: "123.4 cm").
   */
  private createDistanceLabel(
    start: THREE.Vector3,
    end: THREE.Vector3,
    distance: number,
    opacity: number
  ): THREE.Sprite {
    const distanceMm = Math.round(distance * 1000);
    const text = `${distanceMm} mm`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * opacity})`;
    ctx.font = 'bold 28px Arial';
    const textWidth = ctx.measureText(text).width;
    const padding = 10;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = 36;
    const bgX = (canvas.width - bgWidth) / 2;
    const bgY = (canvas.height - bgHeight) / 2;

    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 6);
    ctx.fill();

    // Text
    ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      opacity,
    });

    const sprite = new THREE.Sprite(material);

    // Position at midpoint, slightly above the line
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    midpoint.y += 0.15;
    sprite.position.copy(midpoint);
    sprite.scale.set(0.6, 0.15, 1);

    return sprite;
  }

  /**
   * Clears the preview line and label.
   */
  private clearPreview(): void {
    if (this.previewLine) {
      this.measureGroup.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }

    if (this.previewLabel) {
      this.measureGroup.remove(this.previewLabel);
      const spriteMat = this.previewLabel.material as THREE.SpriteMaterial;
      spriteMat.map?.dispose();
      spriteMat.dispose();
      this.previewLabel = null;
    }
  }

  /**
   * Disposes the visual objects (line + label) of a measurement.
   */
  private disposeMeasurementVisuals(measurement: Measurement): void {
    // Dispose line
    this.measureGroup.remove(measurement.line);
    measurement.line.geometry.dispose();
    (measurement.line.material as THREE.Material).dispose();

    // Dispose label
    this.measureGroup.remove(measurement.label);
    const spriteMat = measurement.label.material as THREE.SpriteMaterial;
    spriteMat.map?.dispose();
    spriteMat.dispose();
  }
}
