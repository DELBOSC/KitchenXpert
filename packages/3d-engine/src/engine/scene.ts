import * as THREE from 'three';
import { KitchenModel3D, Object3D as KitchenObject3D } from '@kitchenxpert/common';

/**
 * Configuration de la scène 3D
 */
export interface SceneConfig {
  backgroundColor?: number;
  fogEnabled?: boolean;
  fogColor?: number;
  fogNear?: number;
  fogFar?: number;
  gridEnabled?: boolean;
  gridSize?: number;
  gridDivisions?: number;
}

/**
 * Gestionnaire de scène 3D pour la visualisation de cuisine
 */
export class KitchenScene {
  public scene: THREE.Scene;
  private objects: Map<string, THREE.Object3D>;
  private grid?: THREE.GridHelper;
  private config: Required<SceneConfig>;

  constructor(config: SceneConfig = {}) {
    this.scene = new THREE.Scene();
    this.objects = new Map();

    // Configuration par défaut
    this.config = {
      backgroundColor: 0xf5f5f5,
      fogEnabled: true,
      fogColor: 0xf5f5f5,
      fogNear: 10,
      fogFar: 100,
      gridEnabled: true,
      gridSize: 20,
      gridDivisions: 20,
      ...config,
    };

    this.initialize();
  }

  /**
   * Initialise la scène
   */
  private initialize(): void {
    // Background
    this.scene.background = new THREE.Color(this.config.backgroundColor);

    // Fog pour la profondeur
    if (this.config.fogEnabled) {
      this.scene.fog = new THREE.Fog(
        this.config.fogColor,
        this.config.fogNear,
        this.config.fogFar
      );
    }

    // Grille au sol pour repères
    if (this.config.gridEnabled) {
      this.createGrid();
    }

    // Axes helper pour debug (X=rouge, Y=vert, Z=bleu)
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.name = '__axes_helper__';
    this.scene.add(axesHelper);
  }

  /**
   * Crée une grille au sol
   */
  private createGrid(): void {
    this.grid = new THREE.GridHelper(
      this.config.gridSize,
      this.config.gridDivisions,
      0x888888,
      0xcccccc
    );
    this.grid.name = '__grid_helper__';
    this.scene.add(this.grid);
  }

  /**
   * Ajoute un objet à la scène
   */
  addObject(id: string, object: THREE.Object3D): void {
    object.userData.id = id;
    this.objects.set(id, object);
    this.scene.add(object);
  }

  /**
   * Supprime un objet de la scène
   */
  removeObject(id: string): boolean {
    const object = this.objects.get(id);
    if (object) {
      this.scene.remove(object);
      this.objects.delete(id);

      // Dispose geometry and materials to free memory
      this.disposeObject(object);
      return true;
    }
    return false;
  }

  /**
   * Récupère un objet par ID
   */
  getObject(id: string): THREE.Object3D | undefined {
    return this.objects.get(id);
  }

  /**
   * Récupère tous les objets
   */
  getAllObjects(): Map<string, THREE.Object3D> {
    return new Map(this.objects);
  }

  /**
   * Vide la scène de tous les objets (garde les helpers)
   */
  clear(): void {
    this.objects.forEach((object) => {
      this.scene.remove(object);
      this.disposeObject(object);
    });
    this.objects.clear();
  }

  /**
   * Dispose proprement un objet et libère la mémoire
   */
  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }

  /**
   * Sérialise la scène en KitchenModel3D
   */
  toKitchenModel(cameraPosition: THREE.Vector3, cameraTarget: THREE.Vector3): KitchenModel3D {
    const objects: KitchenObject3D[] = [];

    this.objects.forEach((object, id) => {
      const type = (object.userData.type || 'custom') as KitchenObject3D['type'];

      objects.push({
        id,
        type,
        position: object.position.toArray(),
        rotation: object.rotation.toArray().slice(0, 3) as [number, number, number],
        scale: object.scale.toArray(),
        modelUrl: object.userData.modelUrl,
        textureUrl: object.userData.textureUrl,
        metadata: object.userData.metadata,
      });
    });

    // Collect materials and textures info from objects
    const materialsInfo: Record<string, unknown>[] = [];
    const texturesInfo: Record<string, unknown>[] = [];
    const materialsSeen = new Set<string>();
    const texturesSeen = new Set<string>();

    this.objects.forEach((object) => {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            if (mat && !materialsSeen.has(mat.uuid)) {
              materialsSeen.add(mat.uuid);
              materialsInfo.push({
                uuid: mat.uuid,
                name: mat.name || 'unnamed',
                type: mat.type,
                color: mat instanceof THREE.MeshStandardMaterial ? mat.color.getHex() : undefined,
                roughness: mat instanceof THREE.MeshStandardMaterial ? mat.roughness : undefined,
                metalness: mat instanceof THREE.MeshStandardMaterial ? mat.metalness : undefined,
              });

              // Extract texture info from standard materials
              if (mat instanceof THREE.MeshStandardMaterial) {
                const textureMaps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'] as const;
                textureMaps.forEach((mapName) => {
                  const texture = mat[mapName];
                  if (texture && !texturesSeen.has(texture.uuid)) {
                    texturesSeen.add(texture.uuid);
                    texturesInfo.push({
                      uuid: texture.uuid,
                      name: texture.name || 'unnamed',
                      mapType: mapName,
                      sourceFile: texture.userData?.sourceFile || texture.image?.src,
                    });
                  }
                });
              }
            }
          });
        }
      });
    });

    return {
      version: '1.0.0',
      scene: {
        backgroundColor: this.config.backgroundColor,
        fog: this.config.fogEnabled
          ? {
              enabled: true,
              color: this.config.fogColor,
              near: this.config.fogNear,
              far: this.config.fogFar,
            }
          : { enabled: false },
        grid: {
          enabled: this.config.gridEnabled,
          size: this.config.gridSize,
          divisions: this.config.gridDivisions,
        },
        objectCount: this.objects.size,
        materials: materialsInfo,
        textures: texturesInfo,
      },
      camera: {
        position: cameraPosition.toArray(),
        target: cameraTarget.toArray(),
      },
      objects,
    };
  }

  /**
   * Charge une scène depuis un KitchenModel3D
   */
  async fromKitchenModel(model: KitchenModel3D): Promise<void> {
    this.clear();

    // Apply scene configuration if present
    const sceneData = model.scene as Record<string, unknown> | undefined;
    if (sceneData) {
      // Apply background color
      if (typeof sceneData.backgroundColor === 'number') {
        this.config.backgroundColor = sceneData.backgroundColor;
        this.scene.background = new THREE.Color(sceneData.backgroundColor);
      }

      // Apply fog settings
      const fogData = sceneData.fog as Record<string, unknown> | undefined;
      if (fogData && fogData.enabled === true) {
        this.config.fogEnabled = true;
        this.config.fogColor = typeof fogData.color === 'number' ? fogData.color : this.config.fogColor;
        this.config.fogNear = typeof fogData.near === 'number' ? fogData.near : this.config.fogNear;
        this.config.fogFar = typeof fogData.far === 'number' ? fogData.far : this.config.fogFar;
        this.scene.fog = new THREE.Fog(this.config.fogColor, this.config.fogNear, this.config.fogFar);
      } else if (fogData && fogData.enabled === false) {
        this.config.fogEnabled = false;
        this.scene.fog = null;
      }

      // Apply grid settings
      const gridData = sceneData.grid as Record<string, unknown> | undefined;
      if (gridData) {
        if (typeof gridData.enabled === 'boolean') {
          this.config.gridEnabled = gridData.enabled;
          this.toggleGrid(gridData.enabled);
        }
        if (typeof gridData.size === 'number') {
          this.config.gridSize = gridData.size;
        }
        if (typeof gridData.divisions === 'number') {
          this.config.gridDivisions = gridData.divisions;
        }
      }
    }

    // Load all objects from the model
    const loadPromises = model.objects.map((objData) => this.loadObject(objData));
    await Promise.all(loadPromises);
  }

  /**
   * Charge un objet individuel depuis les données KitchenObject3D
   */
  private async loadObject(objData: KitchenObject3D): Promise<void> {
    let threeObject: THREE.Object3D;

    // If a modelUrl is provided, try to load the external model
    if (objData.modelUrl) {
      threeObject = await this.loadExternalModel(objData.modelUrl, objData.textureUrl);
    } else {
      // Create a placeholder geometry based on object type
      threeObject = this.createPlaceholderObject(objData.type);
    }

    // Apply position, rotation, and scale
    threeObject.position.fromArray(objData.position);
    threeObject.rotation.set(objData.rotation[0], objData.rotation[1], objData.rotation[2]);
    threeObject.scale.fromArray(objData.scale);

    // Store metadata in userData
    threeObject.userData = {
      id: objData.id,
      type: objData.type,
      modelUrl: objData.modelUrl,
      textureUrl: objData.textureUrl,
      metadata: objData.metadata || {},
    };

    // Add the object to the scene
    this.addObject(String(objData.id), threeObject);
  }

  /**
   * Charge un modèle externe (GLTF/GLB)
   */
  private async loadExternalModel(modelUrl: string, textureUrl?: string): Promise<THREE.Object3D> {
    // Dynamic import for GLTFLoader to avoid bundling issues
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      return new Promise((resolve, _reject) => {
        loader.load(
          modelUrl,
          async (gltf) => {
            const model = gltf.scene;

            // Apply custom texture if provided
            if (textureUrl) {
              const textureLoader = new THREE.TextureLoader();
              try {
                const texture = await new Promise<THREE.Texture>((texResolve, texReject) => {
                  textureLoader.load(
                    textureUrl,
                    (tex) => texResolve(tex),
                    undefined,
                    (err) => texReject(err)
                  );
                });

                // Apply texture to all meshes in the model
                model.traverse((child) => {
                  if (child instanceof THREE.Mesh) {
                    if (child.material instanceof THREE.MeshStandardMaterial) {
                      child.material.map = texture;
                      child.material.needsUpdate = true;
                    }
                  }
                });
              } catch {
                console.warn(`Failed to load texture: ${textureUrl}`);
              }
            }

            // Enable shadows on all meshes
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            resolve(model);
          },
          undefined,
          (error) => {
            console.warn(`Failed to load model from ${modelUrl}:`, error);
            // Return a placeholder if model loading fails
            resolve(this.createPlaceholderObject('custom'));
          }
        );
      });
    } catch {
      console.warn('GLTFLoader not available, using placeholder');
      return this.createPlaceholderObject('custom');
    }
  }

  /**
   * Crée un objet de remplacement basé sur le type
   */
  private createPlaceholderObject(type: KitchenObject3D['type']): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;

    switch (type) {
      case 'appliance':
        // Appliances: typically box-shaped (oven, fridge, dishwasher)
        geometry = new THREE.BoxGeometry(0.6, 0.85, 0.6);
        material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.3,
          metalness: 0.8,
        });
        break;

      case 'furniture':
        // Furniture: cabinets, typically boxes
        geometry = new THREE.BoxGeometry(0.6, 0.72, 0.56);
        material = new THREE.MeshStandardMaterial({
          color: 0x8b4513,
          roughness: 0.7,
          metalness: 0.1,
        });
        break;

      case 'wall':
        // Walls: flat vertical planes
        geometry = new THREE.BoxGeometry(2, 2.5, 0.15);
        material = new THREE.MeshStandardMaterial({
          color: 0xeeeeee,
          roughness: 0.8,
          metalness: 0.1,
        });
        break;

      case 'floor':
        // Floor: horizontal plane
        geometry = new THREE.PlaneGeometry(4, 4);
        material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.6,
          metalness: 0.1,
        });
        // Rotate to be horizontal
        const floorMesh = new THREE.Mesh(geometry, material);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        return floorMesh;

      case 'ceiling':
        // Ceiling: horizontal plane at the top
        geometry = new THREE.PlaneGeometry(4, 4);
        material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.9,
          metalness: 0.0,
        });
        // Rotate to face down
        const ceilingMesh = new THREE.Mesh(geometry, material);
        ceilingMesh.rotation.x = Math.PI / 2;
        return ceilingMesh;

      case 'custom':
      default:
        // Custom: generic box
        geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        material = new THREE.MeshStandardMaterial({
          color: 0x888888,
          roughness: 0.5,
          metalness: 0.3,
        });
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * Toggle la visibilité de la grille
   */
  toggleGrid(visible: boolean): void {
    if (this.grid) {
      this.grid.visible = visible;
    }
  }

  /**
   * Change la couleur de fond
   */
  setBackgroundColor(color: number): void {
    this.scene.background = new THREE.Color(color);
  }

  /**
   * Obtient la scène Three.js native
   */
  getThreeScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Dispose complètement la scène
   */
  dispose(): void {
    this.clear();
    // Dispose grid geometry and materials before removing
    if (this.grid) {
      this.grid.geometry?.dispose();
      if (this.grid.material) {
        if (Array.isArray(this.grid.material)) {
          this.grid.material.forEach(m => m.dispose());
        } else {
          this.grid.material.dispose();
        }
      }
      this.scene.remove(this.grid);
      this.grid = undefined;
    }
    // Dispose axes helper geometry and materials before removing
    const axesHelper = this.scene.getObjectByName('__axes_helper__');
    if (axesHelper) {
      if ('geometry' in axesHelper && (axesHelper as THREE.LineSegments).geometry) {
        (axesHelper as THREE.LineSegments).geometry.dispose();
      }
      if ('material' in axesHelper && (axesHelper as THREE.LineSegments).material) {
        const mat = (axesHelper as THREE.LineSegments).material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
      this.scene.remove(axesHelper);
    }
  }
}
