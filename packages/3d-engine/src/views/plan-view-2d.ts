import * as THREE from 'three';

/**
 * 2D architectural floor plan view.
 * Switches to an orthographic top-down camera and renders
 * wall outlines, furniture bounding boxes, and room dimension annotations.
 */
export class PlanView2D {
  private scene: THREE.Scene;
  private orthoCamera: THREE.OrthographicCamera;
  private planGroup: THREE.Group;
  private active: boolean = false;
  private savedCameraState: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.planGroup = new THREE.Group();
    this.planGroup.name = '__plan_2d__';
  }

  /**
   * Switch to 2D plan view.
   * Creates an orthographic camera looking straight down, generates wall outlines,
   * furniture bounding boxes projected to XZ, and dimension annotations.
   */
  activate(
    roomWidth: number,
    roomDepth: number,
    objects: Map<string, THREE.Object3D>
  ): THREE.OrthographicCamera {
    // Save current main camera state for later restoration
    const mainCamera = this.findPerspectiveCamera();
    if (mainCamera) {
      this.savedCameraState = {
        position: mainCamera.position.clone(),
        target: new THREE.Vector3(0, 0, 0),
      };
    }

    this.active = true;

    // Configure orthographic camera looking straight down
    const padding = 1.0;
    const halfWidth = (roomWidth + padding * 2) / 2;
    const halfDepth = (roomDepth + padding * 2) / 2;
    this.orthoCamera.left = -halfWidth;
    this.orthoCamera.right = halfWidth;
    this.orthoCamera.top = halfDepth;
    this.orthoCamera.bottom = -halfDepth;
    this.orthoCamera.near = 0.1;
    this.orthoCamera.far = 100;
    this.orthoCamera.position.set(roomWidth / 2, 10, roomDepth / 2);
    this.orthoCamera.up.set(0, 0, -1);
    this.orthoCamera.lookAt(roomWidth / 2, 0, roomDepth / 2);
    this.orthoCamera.updateProjectionMatrix();

    // Hide 3D shadows and lights
    this.scene.traverse((child) => {
      if (child instanceof THREE.Light) {
        child.userData.__planViewVisible = child.visible;
        child.visible = false;
      }
      if (child instanceof THREE.Mesh) {
        child.userData.__planViewCastShadow = child.castShadow;
        child.userData.__planViewReceiveShadow = child.receiveShadow;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    // Clear any previous plan overlays and generate fresh
    this.clearPlanGroup();
    this.scene.add(this.planGroup);
    this.generatePlanOverlays(roomWidth, roomDepth, objects);

    return this.orthoCamera;
  }

  /**
   * Return to 3D perspective view.
   * Restores saved camera state, re-enables lights/shadows, removes plan overlays.
   */
  deactivate(): { position: THREE.Vector3; target: THREE.Vector3 } | null {
    if (!this.active) {
      return null;
    }

    this.active = false;

    // Restore lights and shadows
    this.scene.traverse((child) => {
      if (child instanceof THREE.Light && child.userData.__planViewVisible !== undefined) {
        child.visible = child.userData.__planViewVisible as boolean;
        delete child.userData.__planViewVisible;
      }
      if (child instanceof THREE.Mesh) {
        if (child.userData.__planViewCastShadow !== undefined) {
          child.castShadow = child.userData.__planViewCastShadow as boolean;
          delete child.userData.__planViewCastShadow;
        }
        if (child.userData.__planViewReceiveShadow !== undefined) {
          child.receiveShadow = child.userData.__planViewReceiveShadow as boolean;
          delete child.userData.__planViewReceiveShadow;
        }
      }
    });

    // Remove plan overlays
    this.clearPlanGroup();
    this.scene.remove(this.planGroup);

    const state = this.savedCameraState;
    this.savedCameraState = null;
    return state;
  }

  /**
   * Refresh outlines when objects change (re-generates plan overlays).
   */
  refresh(
    roomWidth: number,
    roomDepth: number,
    objects: Map<string, THREE.Object3D>
  ): void {
    if (!this.active) {
      return;
    }

    this.clearPlanGroup();
    this.generatePlanOverlays(roomWidth, roomDepth, objects);
  }

  isActive(): boolean {
    return this.active;
  }

  getCamera(): THREE.OrthographicCamera {
    return this.orthoCamera;
  }

  dispose(): void {
    if (this.active) {
      this.deactivate();
    }
    this.clearPlanGroup();
  }

  // --- Private helpers ---

  /**
   * Generates all plan overlays: wall outlines, furniture bounding boxes, dimension labels.
   */
  private generatePlanOverlays(
    roomWidth: number,
    roomDepth: number,
    objects: Map<string, THREE.Object3D>
  ): void {
    const planY = 0.05; // Slightly above floor to avoid z-fighting

    // Draw wall outlines
    this.drawWallOutlines(roomWidth, roomDepth, objects, planY);

    // Draw furniture bounding boxes projected to XZ
    this.drawFurnitureOutlines(objects, planY);

    // Draw room dimension annotations
    this.drawRoomDimensions(roomWidth, roomDepth, planY);
  }

  /**
   * Draws thick rectangle outlines for each wall object.
   */
  private drawWallOutlines(
    roomWidth: number,
    roomDepth: number,
    objects: Map<string, THREE.Object3D>,
    planY: number
  ): void {
    let hasWalls = false;

    for (const [, obj] of objects) {
      if (obj.userData.type !== 'wall') {
        continue;
      }
      hasWalls = true;

      const box = new THREE.Box3().setFromObject(obj);
      this.drawRectangleOutline(
        box.min.x,
        box.min.z,
        box.max.x,
        box.max.z,
        planY,
        0xffffff
      );
    }

    // If no wall objects found, draw a default room outline
    if (!hasWalls) {
      this.drawRectangleOutline(0, 0, roomWidth, roomDepth, planY, 0xffffff);
    }
  }

  /**
   * Draws bounding boxes projected to XZ for furniture objects.
   */
  private drawFurnitureOutlines(
    objects: Map<string, THREE.Object3D>,
    planY: number
  ): void {
    for (const [, obj] of objects) {
      const objType = obj.userData.type as string | undefined;
      if (objType === 'wall' || objType === 'floor') {
        continue;
      }

      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) {
        continue;
      }

      this.drawRectangleOutline(
        box.min.x,
        box.min.z,
        box.max.x,
        box.max.z,
        planY + 0.01,
        0x4488ff
      );
    }
  }

  /**
   * Draws a rectangle outline on the XZ plane using LineSegments.
   */
  private drawRectangleOutline(
    minX: number,
    minZ: number,
    maxX: number,
    maxZ: number,
    y: number,
    color: number
  ): void {
    const vertices = new Float32Array([
      // Bottom edge
      minX, y, minZ, maxX, y, minZ,
      // Right edge
      maxX, y, minZ, maxX, y, maxZ,
      // Top edge
      maxX, y, maxZ, minX, y, maxZ,
      // Left edge
      minX, y, maxZ, minX, y, minZ,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const material = new THREE.LineBasicMaterial({
      color,
      linewidth: 2,
    });

    const lineSegments = new THREE.LineSegments(geometry, material);
    this.planGroup.add(lineSegments);
  }

  /**
   * Draws room dimension annotation lines with text sprites
   * showing width and depth in meters.
   */
  private drawRoomDimensions(
    roomWidth: number,
    roomDepth: number,
    planY: number
  ): void {
    const offset = 0.4; // Offset from room edge for annotation lines

    // Width annotation (along X axis, below the room)
    const widthStartX = 0;
    const widthEndX = roomWidth;
    const widthZ = -offset;

    this.drawAnnotationLine(
      new THREE.Vector3(widthStartX, planY, widthZ),
      new THREE.Vector3(widthEndX, planY, widthZ),
      `${Math.round(roomWidth * 1000)} mm`
    );

    // Depth annotation (along Z axis, left of the room)
    const depthStartZ = 0;
    const depthEndZ = roomDepth;
    const depthX = -offset;

    this.drawAnnotationLine(
      new THREE.Vector3(depthX, planY, depthStartZ),
      new THREE.Vector3(depthX, planY, depthEndZ),
      `${Math.round(roomDepth * 1000)} mm`
    );
  }

  /**
   * Draws an annotation line with end caps and a label sprite at the midpoint.
   */
  private drawAnnotationLine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    text: string
  ): void {
    // Main line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffcc00, linewidth: 1 });
    const line = new THREE.Line(lineGeom, lineMat);
    this.planGroup.add(line);

    // End caps
    this.drawEndCap(start, start, end);
    this.drawEndCap(end, start, end);

    // Label sprite at midpoint
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    midpoint.y += 0.02;
    const sprite = this.createTextSprite(text);
    sprite.position.copy(midpoint);
    this.planGroup.add(sprite);
  }

  /**
   * Draws a small perpendicular end cap line at a point.
   */
  private drawEndCap(
    point: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3
  ): void {
    const dir = lineEnd.clone().sub(lineStart).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    if (perp.lengthSq() === 0) {
      perp.set(0.06, 0, 0);
    } else {
      perp.multiplyScalar(0.06);
    }

    const capStart = point.clone().add(perp);
    const capEnd = point.clone().sub(perp);

    const geom = new THREE.BufferGeometry().setFromPoints([capStart, capEnd]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffcc00 });
    const cap = new THREE.Line(geom, mat);
    this.planGroup.add(cap);
  }

  /**
   * Creates a text sprite using a Canvas texture (following existing DimensionLabels pattern).
   */
  private createTextSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
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
    ctx.fillStyle = '#FFCC00';
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
    sprite.scale.set(0.6, 0.15, 1);

    return sprite;
  }

  /**
   * Finds the first PerspectiveCamera in the scene (or its parent).
   */
  private findPerspectiveCamera(): THREE.PerspectiveCamera | null {
    let found: THREE.PerspectiveCamera | null = null;
    this.scene.traverse((child) => {
      if (child instanceof THREE.PerspectiveCamera && !found) {
        found = child;
      }
    });
    return found;
  }

  /**
   * Removes and disposes all children from the plan group.
   */
  private clearPlanGroup(): void {
    for (let i = this.planGroup.children.length - 1; i >= 0; i--) {
      const child = this.planGroup.children[i]!;

      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }

      if (child instanceof THREE.Sprite) {
        const spriteMat = child.material as THREE.SpriteMaterial;
        spriteMat.map?.dispose();
        spriteMat.dispose();
      }

      this.planGroup.remove(child);
    }
  }
}
