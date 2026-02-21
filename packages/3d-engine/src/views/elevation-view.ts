import * as THREE from 'three';

/**
 * Which wall to show in elevation view.
 */
export type ElevationWall = 'back' | 'left' | 'right' | 'front';

/**
 * Wall elevation view.
 * Positions an orthographic camera perpendicular to a selected wall
 * and displays outlines of objects near that wall.
 */
export class ElevationView {
  private scene: THREE.Scene;
  private orthoCamera: THREE.OrthographicCamera;
  private elevationGroup: THREE.Group;
  private active: boolean = false;
  private activeWall: ElevationWall | null = null;
  private savedCameraState: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.elevationGroup = new THREE.Group();
    this.elevationGroup.name = '__elevation__';
  }

  /**
   * Activates elevation view for the specified wall.
   * Camera is positioned perpendicular to the wall.
   * Only objects within 0.5m of the selected wall are outlined.
   */
  activate(
    wall: ElevationWall,
    roomWidth: number,
    roomDepth: number,
    roomHeight: number,
    objects: Map<string, THREE.Object3D>
  ): THREE.OrthographicCamera {
    // Save current camera state
    const mainCamera = this.findPerspectiveCamera();
    if (mainCamera) {
      this.savedCameraState = {
        position: mainCamera.position.clone(),
        target: new THREE.Vector3(0, 0, 0),
      };
    }

    this.active = true;
    this.activeWall = wall;

    // Configure camera based on wall
    this.configureCameraForWall(wall, roomWidth, roomDepth, roomHeight);

    // Clear previous elevation overlays
    this.clearElevationGroup();
    this.scene.add(this.elevationGroup);

    // Draw wall background outline
    this.drawWallOutline(wall, roomWidth, roomDepth, roomHeight);

    // Draw outlines of objects near the wall
    this.drawObjectOutlines(wall, roomWidth, roomDepth, roomHeight, objects);

    return this.orthoCamera;
  }

  /**
   * Deactivates elevation view and returns saved camera state.
   */
  deactivate(): { position: THREE.Vector3; target: THREE.Vector3 } | null {
    if (!this.active) {
      return null;
    }

    this.active = false;
    this.activeWall = null;

    this.clearElevationGroup();
    this.scene.remove(this.elevationGroup);

    const state = this.savedCameraState;
    this.savedCameraState = null;
    return state;
  }

  getActiveWall(): ElevationWall | null {
    return this.activeWall;
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
    this.clearElevationGroup();
  }

  // --- Private helpers ---

  /**
   * Configures the orthographic camera to look perpendicular to the selected wall.
   */
  private configureCameraForWall(
    wall: ElevationWall,
    roomWidth: number,
    roomDepth: number,
    roomHeight: number
  ): void {
    const w = roomWidth;
    const h = roomHeight;
    const d = roomDepth;
    const padding = 0.5;

    // Determine the horizontal and vertical extents for the ortho frustum
    let horizontalExtent: number;
    let verticalExtent: number;

    switch (wall) {
      case 'back':
      case 'front':
        horizontalExtent = w;
        verticalExtent = h;
        break;
      case 'left':
      case 'right':
        horizontalExtent = d;
        verticalExtent = h;
        break;
    }

    const halfH = (horizontalExtent + padding * 2) / 2;
    const halfV = (verticalExtent + padding * 2) / 2;
    this.orthoCamera.left = -halfH;
    this.orthoCamera.right = halfH;
    this.orthoCamera.top = halfV;
    this.orthoCamera.bottom = -halfV;
    this.orthoCamera.near = 0.1;
    this.orthoCamera.far = 100;

    // Position and look-at based on wall
    switch (wall) {
      case 'back':
        // Camera behind the back wall (z = 0), looking toward +z at back wall
        this.orthoCamera.position.set(w / 2, h / 2, d + 5);
        this.orthoCamera.lookAt(w / 2, h / 2, 0);
        break;
      case 'left':
        // Camera to the left of the left wall (x = 0), looking toward +x
        this.orthoCamera.position.set(-5, h / 2, d / 2);
        this.orthoCamera.lookAt(0, h / 2, d / 2);
        break;
      case 'right':
        // Camera to the right of the right wall (x = w), looking toward -x
        this.orthoCamera.position.set(w + 5, h / 2, d / 2);
        this.orthoCamera.lookAt(w, h / 2, d / 2);
        break;
      case 'front':
        // Camera in front of the front wall (z = depth), looking toward -z
        this.orthoCamera.position.set(w / 2, h / 2, -5);
        this.orthoCamera.lookAt(w / 2, h / 2, d);
        break;
    }

    this.orthoCamera.updateProjectionMatrix();
  }

  /**
   * Draws the wall background rectangle outline.
   */
  private drawWallOutline(
    wall: ElevationWall,
    roomWidth: number,
    roomDepth: number,
    roomHeight: number
  ): void {
    const corners = this.getWallCorners(wall, roomWidth, roomDepth, roomHeight);
    this.drawRectangleFromCorners(corners, 0xffffff);
  }

  /**
   * Gets the four corners of a wall rectangle in 3D space.
   */
  private getWallCorners(
    wall: ElevationWall,
    roomWidth: number,
    roomDepth: number,
    roomHeight: number
  ): [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] {
    const w = roomWidth;
    const h = roomHeight;
    const d = roomDepth;

    switch (wall) {
      case 'back':
        return [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(w, 0, 0),
          new THREE.Vector3(w, h, 0),
          new THREE.Vector3(0, h, 0),
        ];
      case 'front':
        return [
          new THREE.Vector3(0, 0, d),
          new THREE.Vector3(w, 0, d),
          new THREE.Vector3(w, h, d),
          new THREE.Vector3(0, h, d),
        ];
      case 'left':
        return [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, d),
          new THREE.Vector3(0, h, d),
          new THREE.Vector3(0, h, 0),
        ];
      case 'right':
        return [
          new THREE.Vector3(w, 0, 0),
          new THREE.Vector3(w, 0, d),
          new THREE.Vector3(w, h, d),
          new THREE.Vector3(w, h, 0),
        ];
    }
  }

  /**
   * Draws a rectangle from four corner points using LineSegments.
   */
  private drawRectangleFromCorners(
    corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
    color: number
  ): void {
    const vertices = new Float32Array([
      // Edge 0-1
      corners[0].x, corners[0].y, corners[0].z,
      corners[1].x, corners[1].y, corners[1].z,
      // Edge 1-2
      corners[1].x, corners[1].y, corners[1].z,
      corners[2].x, corners[2].y, corners[2].z,
      // Edge 2-3
      corners[2].x, corners[2].y, corners[2].z,
      corners[3].x, corners[3].y, corners[3].z,
      // Edge 3-0
      corners[3].x, corners[3].y, corners[3].z,
      corners[0].x, corners[0].y, corners[0].z,
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const lineSegments = new THREE.LineSegments(geometry, material);
    this.elevationGroup.add(lineSegments);
  }

  /**
   * Draws outlines for objects within 0.5m of the selected wall.
   * Outlines are projected as rectangles in the wall-facing plane.
   */
  private drawObjectOutlines(
    wall: ElevationWall,
    roomWidth: number,
    roomDepth: number,
    _roomHeight: number,
    objects: Map<string, THREE.Object3D>
  ): void {
    const proximityThreshold = 0.5;

    for (const [, obj] of objects) {
      const objType = obj.userData.type as string | undefined;
      if (objType === 'wall' || objType === 'floor') {
        continue;
      }

      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) {
        continue;
      }

      // Check if object is within 0.5m of the selected wall
      if (!this.isNearWall(box, wall, roomWidth, roomDepth, proximityThreshold)) {
        continue;
      }

      // Project bounding box to the wall plane
      const projectedCorners = this.projectToWallPlane(box, wall, roomWidth, roomDepth);
      this.drawRectangleFromCorners(projectedCorners, 0x4488ff);
    }
  }

  /**
   * Checks whether a bounding box is within threshold distance of a wall.
   */
  private isNearWall(
    box: THREE.Box3,
    wall: ElevationWall,
    roomWidth: number,
    roomDepth: number,
    threshold: number
  ): boolean {
    switch (wall) {
      case 'back':
        return box.min.z <= threshold;
      case 'front':
        return box.max.z >= roomDepth - threshold;
      case 'left':
        return box.min.x <= threshold;
      case 'right':
        return box.max.x >= roomWidth - threshold;
    }
  }

  /**
   * Projects a bounding box onto the plane of a wall,
   * returning four corners in 3D as a rectangle in the wall plane.
   */
  private projectToWallPlane(
    box: THREE.Box3,
    wall: ElevationWall,
    roomWidth: number,
    roomDepth: number
  ): [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] {
    switch (wall) {
      case 'back':
        // Project onto z=0 plane, rectangle in XY
        return [
          new THREE.Vector3(box.min.x, box.min.y, 0),
          new THREE.Vector3(box.max.x, box.min.y, 0),
          new THREE.Vector3(box.max.x, box.max.y, 0),
          new THREE.Vector3(box.min.x, box.max.y, 0),
        ];
      case 'front':
        // Project onto z=depth plane, rectangle in XY
        return [
          new THREE.Vector3(box.min.x, box.min.y, roomDepth),
          new THREE.Vector3(box.max.x, box.min.y, roomDepth),
          new THREE.Vector3(box.max.x, box.max.y, roomDepth),
          new THREE.Vector3(box.min.x, box.max.y, roomDepth),
        ];
      case 'left':
        // Project onto x=0 plane, rectangle in ZY
        return [
          new THREE.Vector3(0, box.min.y, box.min.z),
          new THREE.Vector3(0, box.min.y, box.max.z),
          new THREE.Vector3(0, box.max.y, box.max.z),
          new THREE.Vector3(0, box.max.y, box.min.z),
        ];
      case 'right':
        // Project onto x=width plane, rectangle in ZY
        return [
          new THREE.Vector3(roomWidth, box.min.y, box.min.z),
          new THREE.Vector3(roomWidth, box.min.y, box.max.z),
          new THREE.Vector3(roomWidth, box.max.y, box.max.z),
          new THREE.Vector3(roomWidth, box.max.y, box.min.z),
        ];
    }
  }

  /**
   * Finds the first PerspectiveCamera in the scene.
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
   * Removes and disposes all children from the elevation group.
   */
  private clearElevationGroup(): void {
    for (let i = this.elevationGroup.children.length - 1; i >= 0; i--) {
      const child = this.elevationGroup.children[i]!;

      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }

      if (child instanceof THREE.Sprite) {
        const spriteMat = child.material as THREE.SpriteMaterial;
        spriteMat.map?.dispose();
        spriteMat.dispose();
      }

      this.elevationGroup.remove(child);
    }
  }
}
