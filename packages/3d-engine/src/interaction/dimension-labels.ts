import * as THREE from 'three';

/**
 * Info d'une cote affichee
 */
export interface DimensionInfo {
  value: number; // en metres
  label: string; // texte formate
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: 'x' | 'y' | 'z';
}

/**
 * Systeme d'affichage de cotes automatiques
 * Affiche les dimensions de l'objet selectionne et les distances aux murs/voisins
 */
export class DimensionLabels {
  private scene: THREE.Scene;
  private labelsGroup: THREE.Group;
  private sprites: THREE.Sprite[] = [];
  private lines: THREE.Line[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = '__dimension_labels__';
    this.scene.add(this.labelsGroup);
  }

  /**
   * Affiche les dimensions d'un objet selectionne
   */
  showObjectDimensions(object: THREE.Object3D): void {
    this.clear();
    if (!object) return;

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const min = box.min;
    const max = box.max;

    // Largeur (X) — en bas, devant l'objet
    this.addDimension(
      new THREE.Vector3(min.x, min.y, max.z + 0.15),
      new THREE.Vector3(max.x, min.y, max.z + 0.15),
      size.x,
      'x'
    );

    // Profondeur (Z) — a droite
    this.addDimension(
      new THREE.Vector3(max.x + 0.15, min.y, min.z),
      new THREE.Vector3(max.x + 0.15, min.y, max.z),
      size.z,
      'z'
    );

    // Hauteur (Y) — a gauche
    this.addDimension(
      new THREE.Vector3(min.x - 0.15, min.y, min.z),
      new THREE.Vector3(min.x - 0.15, max.y, min.z),
      size.y,
      'y'
    );
  }

  /**
   * Affiche les distances aux murs pendant le deplacement
   */
  showDistancesToWalls(object: THREE.Object3D, walls: THREE.Object3D[]): void {
    const objectBox = new THREE.Box3().setFromObject(object);
    const objectCenter = objectBox.getCenter(new THREE.Vector3());

    for (const wall of walls) {
      const wallBox = new THREE.Box3().setFromObject(wall);
      const wallCenter = wallBox.getCenter(new THREE.Vector3());
      const wallSize = wallBox.getSize(new THREE.Vector3());

      const isXWall = wallSize.x > wallSize.z;
      let distance: number;
      let start: THREE.Vector3;
      let end: THREE.Vector3;
      let axis: 'x' | 'z';

      if (isXWall) {
        // Distance along Z
        if (wallCenter.z < objectCenter.z) {
          distance = objectBox.min.z - wallBox.max.z;
          start = new THREE.Vector3(objectCenter.x, 0.02, wallBox.max.z);
          end = new THREE.Vector3(objectCenter.x, 0.02, objectBox.min.z);
        } else {
          distance = wallBox.min.z - objectBox.max.z;
          start = new THREE.Vector3(objectCenter.x, 0.02, objectBox.max.z);
          end = new THREE.Vector3(objectCenter.x, 0.02, wallBox.min.z);
        }
        axis = 'z';
      } else {
        // Distance along X
        if (wallCenter.x < objectCenter.x) {
          distance = objectBox.min.x - wallBox.max.x;
          start = new THREE.Vector3(wallBox.max.x, 0.02, objectCenter.z);
          end = new THREE.Vector3(objectBox.min.x, 0.02, objectCenter.z);
        } else {
          distance = wallBox.min.x - objectBox.max.x;
          start = new THREE.Vector3(objectBox.max.x, 0.02, objectCenter.z);
          end = new THREE.Vector3(wallBox.min.x, 0.02, objectCenter.z);
        }
        axis = 'x';
      }

      if (distance > 0 && distance < 5) {
        this.addDimension(start, end, distance, axis, 0x888888);
      }
    }
  }

  /**
   * Affiche les distances aux objets voisins
   */
  showDistancesToNeighbors(object: THREE.Object3D, neighbors: Map<string, THREE.Object3D>): void {
    const objectBox = new THREE.Box3().setFromObject(object);
    const objectCenter = objectBox.getCenter(new THREE.Vector3());
    const objectId = object.userData.id;

    for (const [id, other] of neighbors) {
      if (id === objectId) continue;
      if (other.userData.type === 'wall' || other.userData.type === 'floor') continue;

      const otherBox = new THREE.Box3().setFromObject(other);
      const otherCenter = otherBox.getCenter(new THREE.Vector3());

      // Distance on X axis
      let dx = 0;
      if (objectCenter.x > otherCenter.x) {
        dx = objectBox.min.x - otherBox.max.x;
      } else {
        dx = otherBox.min.x - objectBox.max.x;
      }

      // Distance on Z axis
      let dz = 0;
      if (objectCenter.z > otherCenter.z) {
        dz = objectBox.min.z - otherBox.max.z;
      } else {
        dz = otherBox.min.z - objectBox.max.z;
      }

      const overlapX = objectBox.min.x < otherBox.max.x && objectBox.max.x > otherBox.min.x;
      const overlapZ = objectBox.min.z < otherBox.max.z && objectBox.max.z > otherBox.min.z;

      // Show X distance if Z overlaps
      if (overlapZ && dx > 0 && dx < 3) {
        const y = Math.max(objectBox.max.y, otherBox.max.y) + 0.1;
        const z = (objectCenter.z + otherCenter.z) / 2;
        const startX = objectCenter.x > otherCenter.x ? otherBox.max.x : objectBox.max.x;
        const endX = objectCenter.x > otherCenter.x ? objectBox.min.x : otherBox.min.x;

        this.addDimension(
          new THREE.Vector3(startX, y, z),
          new THREE.Vector3(endX, y, z),
          dx,
          'x',
          0x44aaff
        );
      }

      // Show Z distance if X overlaps
      if (overlapX && dz > 0 && dz < 3) {
        const y = Math.max(objectBox.max.y, otherBox.max.y) + 0.1;
        const x = (objectCenter.x + otherCenter.x) / 2;
        const startZ = objectCenter.z > otherCenter.z ? otherBox.max.z : objectBox.max.z;
        const endZ = objectCenter.z > otherCenter.z ? objectBox.min.z : otherBox.min.z;

        this.addDimension(
          new THREE.Vector3(x, y, startZ),
          new THREE.Vector3(x, y, endZ),
          dz,
          'z',
          0x44aaff
        );
      }
    }
  }

  /**
   * Ajoute une cote (ligne + label)
   */
  private addDimension(
    start: THREE.Vector3,
    end: THREE.Vector3,
    value: number,
    _direction: 'x' | 'y' | 'z',
    color: number = 0xff4444
  ): void {
    // Line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(lineGeom, lineMat);
    this.labelsGroup.add(line);
    this.lines.push(line);

    // End caps (small perpendicular lines)
    this.addEndCap(start, start, end, color);
    this.addEndCap(end, start, end, color);

    // Text label sprite
    const midPoint = start.clone().add(end).multiplyScalar(0.5);
    midPoint.y += 0.08;

    const label = this.formatDimension(value);
    const sprite = this.createTextSprite(label, color);
    sprite.position.copy(midPoint);
    this.labelsGroup.add(sprite);
    this.sprites.push(sprite);
  }

  /**
   * Ajoute un trait de terminaison perpendiculaire
   */
  private addEndCap(
    point: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3,
    color: number
  ): void {
    const dir = lineEnd.clone().sub(lineStart).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    if (perp.length() === 0) {
      perp.set(0.04, 0, 0);
    } else {
      perp.multiplyScalar(0.04);
    }

    const capStart = point.clone().add(perp);
    const capEnd = point.clone().sub(perp);

    const geom = new THREE.BufferGeometry().setFromPoints([capStart, capEnd]);
    const mat = new THREE.LineBasicMaterial({ color });
    const cap = new THREE.Line(geom, mat);
    this.labelsGroup.add(cap);
    this.lines.push(cap);
  }

  /**
   * Cree un sprite texte pour afficher la dimension
   */
  private createTextSprite(text: string, color: number = 0xff4444): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    // Set the font before measuring
    ctx.font = 'bold 28px Arial';
    const textWidth = ctx.measureText(text).width;
    const padding = 8;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = 36;
    const bgX = (canvas.width - bgWidth) / 2;
    const bgY = (canvas.height - bgHeight) / 2;

    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 6);
    ctx.fill();

    // Text
    const hexStr = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = hexStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.5, 0.125, 1);

    // Store canvas reference for proper cleanup
    sprite.userData.canvas = canvas;

    return sprite;
  }

  /**
   * Formate une dimension en texte lisible
   */
  private formatDimension(meters: number): string {
    const mm = Math.round(meters * 1000);
    return `${mm} mm`;
  }

  /**
   * Efface toutes les cotes
   */
  clear(): void {
    for (const sprite of this.sprites) {
      this.labelsGroup.remove(sprite);
      const spriteMat = sprite.material as THREE.SpriteMaterial;
      if (spriteMat.map) {
        spriteMat.map.dispose();
      }
      spriteMat.dispose();
      sprite.userData.canvas = null;
    }
    for (const line of this.lines) {
      this.labelsGroup.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.sprites = [];
    this.lines = [];
  }

  /**
   * Active/desactive la visibilite
   */
  setVisible(visible: boolean): void {
    this.labelsGroup.visible = visible;
  }

  isVisible(): boolean {
    return this.labelsGroup.visible;
  }

  /**
   * Dispose le systeme
   */
  dispose(): void {
    this.clear();
    this.scene.remove(this.labelsGroup);
  }
}
