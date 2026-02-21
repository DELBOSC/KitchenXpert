import * as THREE from 'three';
import { CollisionSystem } from '../physics/collision';

/**
 * Mode de manipulation
 */
export enum ManipulationMode {
  TRANSLATE = 'translate', // Déplacement
  ROTATE = 'rotate',       // Rotation
  SCALE = 'scale',         // Échelle
}

/**
 * Événement de manipulation
 */
export interface ManipulationEvent {
  type: 'start' | 'move' | 'end';
  object: THREE.Object3D;
  mode: ManipulationMode;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
  scale?: THREE.Vector3;
}

/**
 * Gestionnaire de manipulation d'objets 3D
 */
export class ObjectManipulator {
  private selectedObject: THREE.Object3D | null = null;
  private mode: ManipulationMode = ManipulationMode.TRANSLATE;
  private collisionSystem: CollisionSystem;
  private scene: THREE.Scene;
  private _camera: THREE.Camera;

  // État du drag
  private isDragging: boolean = false;
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private initialPosition: THREE.Vector3 = new THREE.Vector3();

  // Callbacks
  private onManipulationCallback?: (event: ManipulationEvent) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    collisionSystem: CollisionSystem
  ) {
    this.scene = scene;
    this._camera = camera;
    this.collisionSystem = collisionSystem;
  }

  /**
   * Sélectionne un objet pour manipulation
   */
  selectObject(object: THREE.Object3D | null): void {
    // Désélectionner l'objet précédent
    if (this.selectedObject) {
      this.highlightObject(this.selectedObject, false);
    }

    this.selectedObject = object;

    // Mettre en surbrillance le nouvel objet
    if (this.selectedObject) {
      this.highlightObject(this.selectedObject, true);
    }
  }

  /**
   * Récupère l'objet sélectionné
   */
  getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }

  /**
   * Change le mode de manipulation
   */
  setMode(mode: ManipulationMode): void {
    this.mode = mode;
  }

  /**
   * Récupère le mode actuel
   */
  getMode(): ManipulationMode {
    return this.mode;
  }

  /**
   * Récupère la caméra
   */
  getCamera(): THREE.Camera {
    return this._camera;
  }

  /**
   * Démarre le drag d'un objet
   */
  startDrag(intersectionPoint: THREE.Vector3): void {
    if (!this.selectedObject) {
      return;
    }

    this.isDragging = true;
    this.initialPosition.copy(this.selectedObject.position);

    // Créer un plan de drag au niveau de l'objet
    this.dragPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0), // Plan horizontal
      this.selectedObject.position
    );

    // Calculer l'offset entre le point d'intersection et la position de l'objet
    this.dragOffset.copy(intersectionPoint).sub(this.selectedObject.position);

    this.emitManipulationEvent('start');
  }

  /**
   * Met à jour le drag
   */
  updateDrag(ray: THREE.Raycaster): void {
    if (!this.isDragging || !this.selectedObject) {
      return;
    }

    // Trouver l'intersection avec le plan de drag
    const intersection = new THREE.Vector3();
    ray.ray.intersectPlane(this.dragPlane, intersection);

    if (intersection) {
      // Nouvelle position = intersection - offset
      let newPosition = intersection.sub(this.dragOffset);

      // Snap à la grille si activé
      newPosition = this.collisionSystem.snapToGrid(newPosition);

      // Vérifier les collisions
      const isValid = this.collisionSystem.isValidPosition(
        this.selectedObject,
        newPosition,
        this.scene
      );

      if (isValid) {
        this.selectedObject.position.copy(newPosition);
        this.emitManipulationEvent('move');
      } else {
        // Chercher la position valide la plus proche
        const validPosition = this.collisionSystem.findNearestValidPosition(
          this.selectedObject,
          newPosition,
          this.scene
        );

        if (validPosition) {
          this.selectedObject.position.copy(validPosition);
          this.emitManipulationEvent('move');
        }
      }
    }
  }

  /**
   * Termine le drag
   */
  endDrag(): void {
    if (!this.isDragging) {
      return;
    }

    this.isDragging = false;

    // Vérifier la position finale
    if (this.selectedObject) {
      const finalCollision = this.collisionSystem.checkCollision(this.selectedObject);

      if (finalCollision.collides && !this.collisionSystem.getConstraints().allowOverlap) {
        // Retour à la position initiale si collision
        this.selectedObject.position.copy(this.initialPosition);
      }

      this.emitManipulationEvent('end');
    }
  }

  /**
   * Rotate l'objet sélectionné
   */
  rotateObject(angleY: number): void {
    if (!this.selectedObject) {
      return;
    }

    this.selectedObject.rotation.y += angleY;
    this.emitManipulationEvent('move');
  }

  /**
   * Scale l'objet sélectionné
   */
  scaleObject(factor: number): void {
    if (!this.selectedObject) {
      return;
    }

    const newScale = this.selectedObject.scale.clone().multiplyScalar(factor);

    // Limites de scale
    const minScale = 0.5;
    const maxScale = 2.0;

    if (
      newScale.x >= minScale &&
      newScale.x <= maxScale &&
      newScale.y >= minScale &&
      newScale.y <= maxScale &&
      newScale.z >= minScale &&
      newScale.z <= maxScale
    ) {
      this.selectedObject.scale.copy(newScale);
      this.emitManipulationEvent('move');
    }
  }

  /**
   * Supprime l'objet sélectionné
   */
  deleteSelectedObject(): void {
    if (!this.selectedObject) {
      return;
    }

    this.scene.remove(this.selectedObject);
    this.collisionSystem.removeCollisionObject(this.selectedObject);
    this.selectedObject = null;
  }

  /**
   * Duplique l'objet sélectionné
   */
  duplicateSelectedObject(): THREE.Object3D | null {
    if (!this.selectedObject) {
      return null;
    }

    const clone = this.selectedObject.clone();

    // Décaler légèrement la position
    clone.position.add(new THREE.Vector3(0.5, 0, 0.5));

    this.scene.add(clone);
    this.collisionSystem.addCollisionObject(clone);

    return clone;
  }

  /**
   * Met en surbrillance un objet
   */
  private highlightObject(object: THREE.Object3D, highlight: boolean): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (highlight) {
          // Sauvegarder le matériau original
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material;
          }

          // Appliquer un matériau de surbrillance
          const highlightMaterial = (child.material as THREE.Material).clone();
          if (highlightMaterial instanceof THREE.MeshStandardMaterial) {
            highlightMaterial.emissive.setHex(0x4488ff);
            highlightMaterial.emissiveIntensity = 0.3;
          }
          child.material = highlightMaterial;
        } else {
          // Restaurer le matériau original
          if (child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
            delete child.userData.originalMaterial;
          }
        }
      }
    });
  }

  /**
   * Enregistre un callback pour les événements de manipulation
   */
  onManipulation(callback: (event: ManipulationEvent) => void): void {
    this.onManipulationCallback = callback;
  }

  /**
   * Émet un événement de manipulation
   */
  private emitManipulationEvent(type: 'start' | 'move' | 'end'): void {
    if (!this.onManipulationCallback || !this.selectedObject) {
      return;
    }

    this.onManipulationCallback({
      type,
      object: this.selectedObject,
      mode: this.mode,
      position: this.selectedObject.position.clone(),
      rotation: this.selectedObject.rotation.clone(),
      scale: this.selectedObject.scale.clone(),
    });
  }

  /**
   * Reset l'état
   */
  reset(): void {
    this.selectObject(null);
    this.isDragging = false;
  }
}
