/**
 * Mock for Three.js objects used in tests
 * Provides lightweight implementations of Three.js classes
 */

// Mock Vector3
export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  add(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  sub(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  multiplyScalar(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  normalize(): this {
    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    if (length > 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }
    return this;
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  clamp(min: Vector3, max: Vector3): this {
    this.x = Math.max(min.x, Math.min(max.x, this.x));
    this.y = Math.max(min.y, Math.min(max.y, this.y));
    this.z = Math.max(min.z, Math.min(max.z, this.z));
    return this;
  }

  distanceTo(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  unproject(_camera: unknown): this {
    return this;
  }

  project(_camera: unknown): this {
    return this;
  }
}

// Mock Vector2
export class Vector2 {
  x: number;
  y: number;

  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
}

// Mock Euler
export class Euler {
  x: number;
  y: number;
  z: number;
  order: string;

  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }

  clone(): Euler {
    return new Euler(this.x, this.y, this.z, this.order);
  }

  toArray(): [number, number, number, string] {
    return [this.x, this.y, this.z, this.order];
  }
}

// Mock Color
export class Color {
  r: number;
  g: number;
  b: number;

  constructor(color?: number | string) {
    if (typeof color === 'number') {
      this.r = ((color >> 16) & 255) / 255;
      this.g = ((color >> 8) & 255) / 255;
      this.b = (color & 255) / 255;
    } else {
      this.r = 1;
      this.g = 1;
      this.b = 1;
    }
  }

  setHex(hex: number): this {
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }
}

// Mock Box3
export class Box3 {
  min: Vector3;
  max: Vector3;

  constructor(min?: Vector3, max?: Vector3) {
    this.min = min || new Vector3(Infinity, Infinity, Infinity);
    this.max = max || new Vector3(-Infinity, -Infinity, -Infinity);
  }

  setFromObject(object: Object3D): this {
    // Simple bounding box based on position and scale
    const pos = object.position;
    const scale = object.scale;
    this.min = new Vector3(pos.x - scale.x / 2, pos.y - scale.y / 2, pos.z - scale.z / 2);
    this.max = new Vector3(pos.x + scale.x / 2, pos.y + scale.y / 2, pos.z + scale.z / 2);
    return this;
  }

  intersectsBox(box: Box3): boolean {
    return !(
      this.max.x < box.min.x ||
      this.min.x > box.max.x ||
      this.max.y < box.min.y ||
      this.min.y > box.max.y ||
      this.max.z < box.min.z ||
      this.min.z > box.max.z
    );
  }

  containsBox(box: Box3): boolean {
    return (
      this.min.x <= box.min.x &&
      box.max.x <= this.max.x &&
      this.min.y <= box.min.y &&
      box.max.y <= this.max.y &&
      this.min.z <= box.min.z &&
      box.max.z <= this.max.z
    );
  }

  getCenter(target: Vector3): Vector3 {
    target.x = (this.min.x + this.max.x) / 2;
    target.y = (this.min.y + this.max.y) / 2;
    target.z = (this.min.z + this.max.z) / 2;
    return target;
  }

  getSize(target: Vector3): Vector3 {
    target.x = this.max.x - this.min.x;
    target.y = this.max.y - this.min.y;
    target.z = this.max.z - this.min.z;
    return target;
  }

  isEmpty(): boolean {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }

  expandByObject(object: Object3D): this {
    const box = new Box3().setFromObject(object);
    this.union(box);
    return this;
  }

  union(box: Box3): this {
    this.min.x = Math.min(this.min.x, box.min.x);
    this.min.y = Math.min(this.min.y, box.min.y);
    this.min.z = Math.min(this.min.z, box.min.z);
    this.max.x = Math.max(this.max.x, box.max.x);
    this.max.y = Math.max(this.max.y, box.max.y);
    this.max.z = Math.max(this.max.z, box.max.z);
    return this;
  }
}

// Mock Plane
export class Plane {
  normal: Vector3;
  constant: number;

  constructor(normal?: Vector3, constant?: number) {
    this.normal = normal || new Vector3(0, 1, 0);
    this.constant = constant || 0;
  }

  setFromNormalAndCoplanarPoint(normal: Vector3, point: Vector3): this {
    this.normal = normal.clone();
    this.constant = -point.x * normal.x - point.y * normal.y - point.z * normal.z;
    return this;
  }
}

// Mock Ray
export class Ray {
  origin: Vector3;
  direction: Vector3;

  constructor(origin?: Vector3, direction?: Vector3) {
    this.origin = origin || new Vector3();
    this.direction = direction || new Vector3(0, 0, -1);
  }

  intersectPlane(plane: Plane, target: Vector3): Vector3 | null {
    const denominator =
      plane.normal.x * this.direction.x +
      plane.normal.y * this.direction.y +
      plane.normal.z * this.direction.z;

    if (Math.abs(denominator) < 0.0001) {
      return null;
    }

    const t =
      -(
        plane.normal.x * this.origin.x +
        plane.normal.y * this.origin.y +
        plane.normal.z * this.origin.z +
        plane.constant
      ) / denominator;

    target.x = this.origin.x + t * this.direction.x;
    target.y = this.origin.y + t * this.direction.y;
    target.z = this.origin.z + t * this.direction.z;

    return target;
  }
}

// Mock Object3D
export class Object3D {
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
  visible: boolean;
  name: string;
  userData: Record<string, unknown>;
  parent: Object3D | null;
  children: Object3D[];

  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.visible = true;
    this.name = '';
    this.userData = {};
    this.parent = null;
    this.children = [];
  }

  add(child: Object3D): this {
    child.parent = this;
    this.children.push(child);
    return this;
  }

  remove(child: Object3D): this {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return this;
  }

  traverse(callback: (object: Object3D) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }

  getObjectByName(name: string): Object3D | undefined {
    if (this.name === name) {
      return this;
    }
    for (const child of this.children) {
      const result = child.getObjectByName(name);
      if (result) {
        return result;
      }
    }
    return undefined;
  }

  clone(): Object3D {
    const clone = new Object3D();
    clone.position = this.position.clone();
    clone.rotation = this.rotation.clone();
    clone.scale = this.scale.clone();
    clone.visible = this.visible;
    clone.name = this.name;
    clone.userData = { ...this.userData };
    return clone;
  }

  updateMatrixWorld(_force?: boolean): void {
    // No-op for mock
  }

  lookAt(_target: Vector3): void {
    // No-op for mock
  }
}

// Mock Material
export class Material {
  dispose = jest.fn();
  clone(): Material {
    return new Material();
  }
}

export class MeshStandardMaterial extends Material {
  color: Color;
  roughness: number;
  metalness: number;
  emissive: Color;
  emissiveIntensity: number;

  constructor(params?: { color?: number; roughness?: number; metalness?: number }) {
    super();
    this.color = new Color(params?.color);
    this.roughness = params?.roughness ?? 1;
    this.metalness = params?.metalness ?? 0;
    this.emissive = new Color(0);
    this.emissiveIntensity = 0;
  }

  clone(): MeshStandardMaterial {
    const cloned = new MeshStandardMaterial();
    cloned.color = this.color;
    cloned.roughness = this.roughness;
    cloned.metalness = this.metalness;
    cloned.emissive = this.emissive;
    cloned.emissiveIntensity = this.emissiveIntensity;
    return cloned;
  }
}

// Mock Geometry
export class BufferGeometry {
  dispose = jest.fn();
}

export class BoxGeometry extends BufferGeometry {
  constructor(_width?: number, _height?: number, _depth?: number) {
    super();
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(_width?: number, _height?: number) {
    super();
  }
}

// Mock Mesh
export class Mesh extends Object3D {
  geometry: BufferGeometry;
  material: Material | Material[];

  constructor(geometry?: BufferGeometry, material?: Material | Material[]) {
    super();
    this.geometry = geometry || new BufferGeometry();
    this.material = material || new Material();
  }

  castShadow = false;
  receiveShadow = false;
}

// Mock Scene
export class Scene extends Object3D {
  background: Color | null = null;
  fog: Fog | null = null;

  constructor() {
    super();
  }
}

// Mock Fog
export class Fog {
  color: Color;
  near: number;
  far: number;

  constructor(color: number, near: number, far: number) {
    this.color = new Color(color);
    this.near = near;
    this.far = far;
  }
}

// Mock Camera
export class Camera extends Object3D {
  constructor() {
    super();
  }
}

export class PerspectiveCamera extends Camera {
  fov: number;
  aspect: number;
  near: number;
  far: number;

  constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
    super();
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  updateProjectionMatrix = jest.fn();
}

// Mock Lights
export class Light extends Object3D {
  color: Color;
  intensity: number;

  constructor(color?: number, intensity?: number) {
    super();
    this.color = new Color(color);
    this.intensity = intensity ?? 1;
  }
}

export class AmbientLight extends Light {
  constructor(color?: number, intensity?: number) {
    super(color, intensity);
  }
}

export class DirectionalLight extends Light {
  castShadow = false;
  shadow = {
    mapSize: { width: 512, height: 512 },
    camera: {
      near: 0.5,
      far: 500,
      left: -10,
      right: 10,
      top: 10,
      bottom: -10,
    },
    bias: 0,
  };

  constructor(color?: number, intensity?: number) {
    super(color, intensity);
  }
}

export class HemisphereLight extends Light {
  groundColor: Color;

  constructor(skyColor?: number, groundColor?: number, intensity?: number) {
    super(skyColor, intensity);
    this.groundColor = new Color(groundColor);
  }
}

// Mock Helpers
export class AxesHelper extends Object3D {
  constructor(_size?: number) {
    super();
    this.name = '__axes_helper__';
  }
}

export class GridHelper extends Object3D {
  constructor(_size?: number, _divisions?: number, _color1?: number, _color2?: number) {
    super();
    this.name = '__grid_helper__';
  }
}

// Mock WebGLRenderer
export class WebGLRenderer {
  domElement: HTMLCanvasElement;
  shadowMap = {
    enabled: false,
    type: 0,
  };
  toneMapping = 0;
  toneMappingExposure = 1;
  outputColorSpace = 'srgb';

  constructor(_params?: { antialias?: boolean; alpha?: boolean }) {
    this.domElement = document.createElement('canvas');
  }

  setPixelRatio = jest.fn();
  setSize = jest.fn();
  render = jest.fn();
  dispose = jest.fn();
}

// Mock Raycaster
export class Raycaster {
  ray: Ray;

  constructor() {
    this.ray = new Ray();
  }

  setFromCamera(_coords: Vector2, _camera: Camera): void {
    // No-op for mock
  }

  intersectObjects(
    _objects: Object3D[],
    _recursive?: boolean
  ): { object: Object3D; point: Vector3 }[] {
    return [];
  }
}

// Three.js constants
export const PCFSoftShadowMap = 2;
export const ACESFilmicToneMapping = 4;
export const NoToneMapping = 0;
export const SRGBColorSpace = 'srgb';
export type ShadowMapType = number;
export type ToneMapping = number;
