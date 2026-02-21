import * as THREE from 'three';

/**
 * Evenement de selection
 */
export interface SelectionEvent {
  type: 'select' | 'deselect' | 'multi-select';
  objects: THREE.Object3D[];
  added?: THREE.Object3D[];
  removed?: THREE.Object3D[];
}

/**
 * Systeme de selection d'objets 3D
 * Supporte la selection simple, multi-selection (Shift+clic) et la box selection
 */
export class SelectionSystem {
  private selected: Set<THREE.Object3D> = new Set();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private selectableFilter: (obj: THREE.Object3D) => boolean;
  private highlightColor: number = 0x4488ff;
  private highlightIntensity: number = 0.3;
  private onSelectionChange?: (event: SelectionEvent) => void;

  // Box selection state
  private boxSelectStart: THREE.Vector2 | null = null;
  private boxSelectEnd: THREE.Vector2 | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    selectableFilter?: (obj: THREE.Object3D) => boolean
  ) {
    this.scene = scene;
    this.camera = camera;
    this.selectableFilter = selectableFilter || ((obj) => {
      // By default, select objects that have an id and are not helpers
      return !!(obj.userData.id) && !obj.name.startsWith('__');
    });
  }

  /**
   * Selection par raycasting a partir des coordonnees souris normalisees (-1 a 1)
   */
  selectAtPoint(ndc: THREE.Vector2, addToSelection: boolean = false): THREE.Object3D | null {
    if (!this.camera) {
      return null;
    }

    this.raycaster.setFromCamera(ndc, this.camera);

    const selectables = this.getSelectableObjects();
    const intersects = this.raycaster.intersectObjects(selectables, true);

    if (intersects.length === 0) {
      if (!addToSelection) {
        this.clearSelection();
      }
      return null;
    }

    // Find the top-level selectable parent
    let target = intersects[0]!.object;
    while (target.parent && !this.selectableFilter(target)) {
      target = target.parent;
    }

    if (!this.selectableFilter(target)) {
      if (!addToSelection) {
        this.clearSelection();
      }
      return null;
    }

    if (addToSelection) {
      // Toggle selection for multi-select
      if (this.selected.has(target)) {
        this.removeFromSelection(target);
      } else {
        this.addToSelection(target);
      }
    } else {
      // Single selection
      this.setSelection([target]);
    }

    return target;
  }

  /**
   * Commence une selection par boite
   */
  startBoxSelect(ndc: THREE.Vector2): void {
    this.boxSelectStart = ndc.clone();
    this.boxSelectEnd = ndc.clone();
  }

  /**
   * Met a jour la selection par boite
   */
  updateBoxSelect(ndc: THREE.Vector2): void {
    this.boxSelectEnd = ndc.clone();
  }

  /**
   * Termine la selection par boite et selectionne les objets dans la zone
   */
  endBoxSelect(addToSelection: boolean = false): THREE.Object3D[] {
    if (!this.boxSelectStart || !this.boxSelectEnd) {
      return [];
    }

    const min = new THREE.Vector2(
      Math.min(this.boxSelectStart.x, this.boxSelectEnd.x),
      Math.min(this.boxSelectStart.y, this.boxSelectEnd.y)
    );
    const max = new THREE.Vector2(
      Math.max(this.boxSelectStart.x, this.boxSelectEnd.x),
      Math.max(this.boxSelectStart.y, this.boxSelectEnd.y)
    );

    try {
      const selectables = this.getSelectableObjects();
      const inBox: THREE.Object3D[] = [];

      for (const obj of selectables) {
        // Project object center to NDC
        const worldPos = new THREE.Vector3();
        obj.getWorldPosition(worldPos);
        const projected = worldPos.project(this.camera);

        if (
          projected.x >= min.x && projected.x <= max.x &&
          projected.y >= min.y && projected.y <= max.y
        ) {
          inBox.push(obj);
        }
      }

      if (addToSelection) {
        for (const obj of inBox) {
          this.addToSelection(obj);
        }
      } else {
        this.setSelection(inBox);
      }

      return inBox;
    } finally {
      // Always reset box selection state, even on exception
      this.boxSelectStart = null;
      this.boxSelectEnd = null;
    }
  }

  /**
   * Definit la selection a un ensemble d'objets
   */
  setSelection(objects: THREE.Object3D[]): void {
    const removed = [...this.selected].filter((o) => !objects.includes(o));
    const added = objects.filter((o) => !this.selected.has(o));

    // Unhighlight removed
    for (const obj of removed) {
      this.highlightObject(obj, false);
    }

    this.selected.clear();

    for (const obj of objects) {
      this.selected.add(obj);
      this.highlightObject(obj, true);
    }

    this.emitEvent({
      type: objects.length > 1 ? 'multi-select' : 'select',
      objects: [...this.selected],
      added,
      removed,
    });
  }

  /**
   * Ajoute un objet a la selection
   */
  addToSelection(object: THREE.Object3D): void {
    if (this.selected.has(object)) return;
    this.selected.add(object);
    this.highlightObject(object, true);

    this.emitEvent({
      type: 'multi-select',
      objects: [...this.selected],
      added: [object],
    });
  }

  /**
   * Retire un objet de la selection
   */
  removeFromSelection(object: THREE.Object3D): void {
    if (!this.selected.has(object)) return;
    this.selected.delete(object);
    this.highlightObject(object, false);

    this.emitEvent({
      type: this.selected.size > 0 ? 'multi-select' : 'deselect',
      objects: [...this.selected],
      removed: [object],
    });
  }

  /**
   * Vide la selection
   */
  clearSelection(): void {
    if (this.selected.size === 0) return;
    const removed = [...this.selected];

    for (const obj of removed) {
      this.highlightObject(obj, false);
    }
    this.selected.clear();

    this.emitEvent({
      type: 'deselect',
      objects: [],
      removed,
    });
  }

  /**
   * Retourne les objets selectionnes
   */
  getSelection(): THREE.Object3D[] {
    return [...this.selected];
  }

  /**
   * Retourne le premier objet selectionne
   */
  getPrimarySelection(): THREE.Object3D | null {
    return this.selected.size > 0 ? [...this.selected][0] ?? null : null;
  }

  /**
   * Verifie si un objet est selectionne
   */
  isSelected(object: THREE.Object3D): boolean {
    return this.selected.has(object);
  }

  /**
   * Retourne les limites de la box selection courante (pour l'overlay UI)
   */
  getBoxSelectBounds(): { min: THREE.Vector2; max: THREE.Vector2 } | null {
    if (!this.boxSelectStart || !this.boxSelectEnd) return null;
    return {
      min: new THREE.Vector2(
        Math.min(this.boxSelectStart.x, this.boxSelectEnd.x),
        Math.min(this.boxSelectStart.y, this.boxSelectEnd.y)
      ),
      max: new THREE.Vector2(
        Math.max(this.boxSelectStart.x, this.boxSelectEnd.x),
        Math.max(this.boxSelectStart.y, this.boxSelectEnd.y)
      ),
    };
  }

  /**
   * Enregistre un callback de changement de selection
   */
  onSelectionChanged(callback: (event: SelectionEvent) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * Met a jour la camera (si elle change)
   */
  updateCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Recupere les objets selectionnables dans la scene
   */
  private getSelectableObjects(): THREE.Object3D[] {
    const result: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (this.selectableFilter(child)) {
        result.push(child);
      }
    });
    return result;
  }

  /**
   * Applique / retire la surbrillance
   */
  private highlightObject(object: THREE.Object3D, highlight: boolean): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (highlight) {
          if (!child.userData._originalMaterial) {
            child.userData._originalMaterial = child.material;
          }
          // Dispose previously cloned highlight material before creating a new one
          if (child.userData._highlightedMaterial) {
            (child.userData._highlightedMaterial as THREE.Material).dispose();
          }
          const mat = (child.material as THREE.Material).clone();
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.emissive.setHex(this.highlightColor);
            mat.emissiveIntensity = this.highlightIntensity;
          }
          child.userData._highlightedMaterial = mat;
          child.material = mat;
        } else {
          if (child.userData._originalMaterial) {
            // Dispose the cloned highlight material
            if (child.userData._highlightedMaterial) {
              (child.userData._highlightedMaterial as THREE.Material).dispose();
              delete child.userData._highlightedMaterial;
            }
            child.material = child.userData._originalMaterial;
            delete child.userData._originalMaterial;
          }
        }
      }
    });
  }

  private emitEvent(event: SelectionEvent): void {
    this.onSelectionChange?.(event);
  }
}
