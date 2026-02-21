import * as THREE from 'three';
import { AccessibilityChecker } from '../ai/accessibility-checker';
import type { AccessibilityZone } from '../ai/accessibility-checker';
import type { PlacedItem3D, RoomConfig } from '../ai/ai-assistant';

/**
 * Overlay visuel d'accessibilite PMR
 * Affiche les zones accessibles, problematiques, cercles de rotation et bandes de hauteur
 */
export class AccessibilityOverlay {
  private scene: THREE.Scene;
  private overlayGroup: THREE.Group;
  private visible: boolean;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = '__accessibility_overlay__';
    this.overlayGroup.visible = false;
    this.visible = false;
    this.scene.add(this.overlayGroup);
  }

  /**
   * Affiche l'overlay d'accessibilite
   */
  show(items: PlacedItem3D[], room: RoomConfig, checker: AccessibilityChecker): void {
    this.clear();

    const data = checker.generateAccessibilityOverlay(items, room);

    this.renderAccessibleZones(data.accessibleZones);
    this.renderProblemAreas(data.problemAreas);
    this.renderTurningCircles(data.turningCircles);
    this.renderReachZones(data.reachZones);

    this.overlayGroup.visible = true;
    this.visible = true;
  }

  /**
   * Cache l'overlay
   */
  hide(): void {
    this.overlayGroup.visible = false;
    this.visible = false;
  }

  /**
   * Retourne la visibilite courante
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Toggle visibilite
   */
  toggle(items?: PlacedItem3D[], room?: RoomConfig, checker?: AccessibilityChecker): void {
    if (this.visible) {
      this.hide();
    } else if (items && room && checker) {
      this.show(items, room, checker);
    }
  }

  /**
   * Nettoie les meshes de l'overlay
   */
  clear(): void {
    while (this.overlayGroup.children.length > 0) {
      const child = this.overlayGroup.children[0]!;
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.overlayGroup.remove(child);
    }
  }

  /**
   * Libere toutes les ressources
   */
  dispose(): void {
    this.clear();
    this.scene.remove(this.overlayGroup);
  }

  // --- Rendus internes ---

  private renderAccessibleZones(zones: AccessibilityZone[]): void {
    const material = new THREE.MeshBasicMaterial({
      color: 0x22c55e, // vert
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (const zone of zones) {
      const geometry = new THREE.PlaneGeometry(zone.size.x, zone.size.z);
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(zone.position);
      mesh.userData = { type: 'accessibility_zone', zoneType: 'accessible' };
      mesh.renderOrder = 1;
      this.overlayGroup.add(mesh);
    }
  }

  private renderProblemAreas(zones: AccessibilityZone[]): void {
    const material = new THREE.MeshBasicMaterial({
      color: 0xef4444, // rouge
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (const zone of zones) {
      const geometry = new THREE.PlaneGeometry(zone.size.x, zone.size.z);
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(zone.position);
      mesh.userData = { type: 'accessibility_zone', zoneType: 'problem' };
      mesh.renderOrder = 2;
      this.overlayGroup.add(mesh);
    }
  }

  private renderTurningCircles(zones: AccessibilityZone[]): void {
    for (const zone of zones) {
      // Cercle pointille bleu au sol
      const radius = zone.size.x / 2;
      const segments = 64;
      const points: THREE.Vector3[] = [];

      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(theta) * radius,
          0,
          Math.sin(theta) * radius
        ));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: 0x3b82f6, // bleu
        dashSize: 0.05,
        gapSize: 0.03,
        linewidth: 2,
      });

      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      line.position.set(zone.position.x, zone.position.y, zone.position.z);
      line.userData = { type: 'accessibility_zone', zoneType: 'turning_circle' };
      line.renderOrder = 3;
      this.overlayGroup.add(line);

      // Remplissage semi-transparent
      const circleGeometry = new THREE.CircleGeometry(radius, segments);
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
      circleMesh.rotation.x = -Math.PI / 2;
      circleMesh.position.copy(zone.position);
      circleMesh.userData = { type: 'accessibility_zone', zoneType: 'turning_circle_fill' };
      circleMesh.renderOrder = 1;
      this.overlayGroup.add(circleMesh);
    }
  }

  private renderReachZones(zones: AccessibilityZone[]): void {
    const material = new THREE.MeshBasicMaterial({
      color: 0xeab308, // jaune
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (const zone of zones) {
      const isXWall = zone.size.z < 0.1;
      const width = isXWall ? zone.size.x : zone.size.z;
      const height = zone.size.y;

      const geometry = new THREE.PlaneGeometry(width, height);
      const mesh = new THREE.Mesh(geometry, material.clone());

      mesh.position.copy(zone.position);

      if (!isXWall) {
        mesh.rotation.y = Math.PI / 2;
      }

      mesh.userData = { type: 'accessibility_zone', zoneType: 'reach_zone' };
      mesh.renderOrder = 1;
      this.overlayGroup.add(mesh);
    }
  }
}
