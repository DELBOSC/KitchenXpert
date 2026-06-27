import * as THREE from 'three';
import { generateId } from '../utils/generate-id';

export interface MeasurementData {
  id: string;
  type: 'distance' | 'angle' | 'area';
  points: THREE.Vector3[];
  value: number;
  unit: string;
  label: string;
}

export class MeasurementTools {
  private scene: THREE.Scene;
  private measurements: Map<string, { data: MeasurementData; visuals: THREE.Group }> = new Map();
  private activeMeasurement: {
    type: 'distance' | 'angle' | 'area';
    points: THREE.Vector3[];
  } | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  startMeasurement(type: 'distance' | 'angle' | 'area'): void {
    this.activeMeasurement = { type, points: [] };
  }

  addPoint(point: THREE.Vector3): MeasurementData | null {
    if (!this.activeMeasurement) return null;
    this.activeMeasurement.points.push(point.clone());

    const needed = this.activeMeasurement.type === 'distance' ? 2 : 3;

    if (this.activeMeasurement.points.length >= needed) {
      const measurement = this.finalizeMeasurement();
      this.activeMeasurement = null;
      return measurement;
    }
    return null;
  }

  private finalizeMeasurement(): MeasurementData {
    const active = this.activeMeasurement!;
    let value = 0;
    let unit = '';
    let label = '';

    switch (active.type) {
      case 'distance': {
        const dist = active.points[0]!.distanceTo(active.points[1]!);
        value = Math.round(dist * 1000); // Convert to mm
        unit = 'mm';
        label = `${value} mm`;
        break;
      }
      case 'angle': {
        const v1 = active.points[0]!.clone().sub(active.points[1]!);
        const v2 = active.points[2]!.clone().sub(active.points[1]!);
        value = Math.round(THREE.MathUtils.radToDeg(v1.angleTo(v2)));
        unit = '\u00B0';
        label = `${value}\u00B0`;
        break;
      }
      case 'area': {
        // Triangle area from 3 points
        const a = active.points[0]!.distanceTo(active.points[1]!);
        const b = active.points[1]!.distanceTo(active.points[2]!);
        const c = active.points[2]!.distanceTo(active.points[0]!);
        const s = (a + b + c) / 2;
        value = Math.round(Math.sqrt(s * (s - a) * (s - b) * (s - c)) * 10000) / 10000;
        unit = 'm\u00B2';
        label = `${value.toFixed(2)} m\u00B2`;
        break;
      }
    }

    const measurement: MeasurementData = {
      id: generateId('meas'),
      type: active.type,
      points: active.points,
      value,
      unit,
      label,
    };

    this.addVisual(measurement);
    return measurement;
  }

  private addVisual(m: MeasurementData): void {
    const group = new THREE.Group();
    group.userData = { measurementId: m.id };

    const lineMat = new THREE.LineBasicMaterial({ color: 0xff6600, linewidth: 2 });

    if (m.type === 'distance') {
      const geo = new THREE.BufferGeometry().setFromPoints(m.points);
      const line = new THREE.Line(geo, lineMat);
      group.add(line);

      // End markers
      m.points.forEach((p) => {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.02, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        sphere.position.copy(p);
        group.add(sphere);
      });

      // Label sprite
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, 128, 42);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      const midpoint = m.points[0]!.clone().add(m.points[1]!).multiplyScalar(0.5);
      sprite.position.copy(midpoint);
      sprite.position.y += 0.15;
      sprite.scale.set(0.5, 0.125, 1);
      group.add(sprite);
    } else if (m.type === 'angle') {
      // Draw angle lines
      const geo = new THREE.BufferGeometry().setFromPoints(m.points);
      const line = new THREE.Line(geo, lineMat);
      group.add(line);
    } else if (m.type === 'area') {
      // Draw triangle outline
      const geo = new THREE.BufferGeometry().setFromPoints([...m.points, m.points[0]!]);
      const line = new THREE.Line(geo, lineMat);
      group.add(line);

      // Fill
      const triGeo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        m.points[0]!.x,
        m.points[0]!.y + 0.01,
        m.points[0]!.z,
        m.points[1]!.x,
        m.points[1]!.y + 0.01,
        m.points[1]!.z,
        m.points[2]!.x,
        m.points[2]!.y + 0.01,
        m.points[2]!.z,
      ]);
      triGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const fill = new THREE.Mesh(
        triGeo,
        new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        })
      );
      group.add(fill);
    }

    this.scene.add(group);
    this.measurements.set(m.id, { data: m, visuals: group });
  }

  removeMeasurement(id: string): void {
    const m = this.measurements.get(id);
    if (m) {
      this.scene.remove(m.visuals);
      m.visuals.traverse((child: THREE.Object3D) => {
        if ('geometry' in child && (child as any).geometry) {
          (child as any).geometry.dispose();
        }
        if ('material' in child && (child as any).material) {
          const mat = (child as any).material;
          if (Array.isArray(mat)) {
            mat.forEach((m: THREE.Material) => m.dispose());
          } else {
            mat.dispose();
          }
        }
        // Dispose canvas textures from sprites
        if (child instanceof THREE.Sprite && child.material.map) {
          child.material.map.dispose();
        }
      });
      this.measurements.delete(id);
    }
  }

  clearAll(): void {
    const ids = Array.from(this.measurements.keys());
    ids.forEach((id) => this.removeMeasurement(id));
  }

  getMeasurements(): MeasurementData[] {
    return Array.from(this.measurements.values()).map((m) => m.data);
  }

  cancelActive(): void {
    this.activeMeasurement = null;
  }

  isActive(): boolean {
    return this.activeMeasurement !== null;
  }

  dispose(): void {
    this.clearAll();
    this.activeMeasurement = null;
  }
}
