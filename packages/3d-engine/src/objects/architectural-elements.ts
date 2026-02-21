import * as THREE from 'three';

/**
 * Configuration d'une porte
 */
export interface DoorConfig {
  id: string;
  width: number;       // metres
  height: number;      // metres
  wallId?: string;
  position: THREE.Vector3;
  rotation: number;    // radians autour de l'axe Y
  type: 'standard' | 'sliding' | 'french';
  openDirection: 'left' | 'right';
  isOpen: boolean;
  openAngle: number;   // 0 a Math.PI/2
}

/**
 * Configuration d'une fenetre
 */
export interface WindowConfig {
  id: string;
  width: number;       // metres
  height: number;      // metres
  sillHeight: number;  // hauteur depuis le sol
  wallId?: string;
  position: THREE.Vector3;
  rotation: number;
  type: 'single' | 'double' | 'french' | 'skylight';
}

/**
 * Donnees serializees pour les portes (position en objet plat)
 */
export interface DoorConfigJSON {
  id: string;
  width: number;
  height: number;
  wallId?: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  type: 'standard' | 'sliding' | 'french';
  openDirection: 'left' | 'right';
  isOpen: boolean;
  openAngle: number;
}

/**
 * Donnees serializees pour les fenetres (position en objet plat)
 */
export interface WindowConfigJSON {
  id: string;
  width: number;
  height: number;
  sillHeight: number;
  wallId?: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  type: 'single' | 'double' | 'french' | 'skylight';
}

/**
 * Gestionnaire d'elements architecturaux (portes et fenetres)
 *
 * Genere les meshes 3D pour les portes et fenetres avec :
 * - Cadres, panneaux et poignees pour les portes
 * - Cadres, vitres et eclairage pour les fenetres
 * - Detection de zone de degagement pour les portes
 * - Serialisation/deserialisation JSON
 */
export class ArchitecturalElements {
  private scene: THREE.Scene;
  private doors: Map<string, { config: DoorConfig; mesh: THREE.Group }> = new Map();
  private windows: Map<string, { config: WindowConfig; mesh: THREE.Group }> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // ---- PORTES ----

  /**
   * Ajoute une porte a la scene
   */
  addDoor(config: DoorConfig): THREE.Group {
    const group = new THREE.Group();
    group.userData = { ...config, type: 'door', id: config.id };

    // Materiau du cadre
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.8 });
    const frameThickness = 0.04;
    const frameDepth = 0.15;

    // Montant gauche
    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, config.height, frameDepth),
      frameMat
    );
    leftFrame.position.set(-config.width / 2, config.height / 2, 0);
    leftFrame.castShadow = true;
    group.add(leftFrame);

    // Montant droit
    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, config.height, frameDepth),
      frameMat
    );
    rightFrame.position.set(config.width / 2, config.height / 2, 0);
    rightFrame.castShadow = true;
    group.add(rightFrame);

    // Traverse haute
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(config.width + frameThickness * 2, frameThickness, frameDepth),
      frameMat
    );
    topFrame.position.set(0, config.height, 0);
    topFrame.castShadow = true;
    group.add(topFrame);

    // Panneau de porte
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 0.6 });
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(config.width - 0.02, config.height - 0.02, 0.04),
      doorMat
    );
    doorPanel.castShadow = true;

    // Pivot de la porte (pour l'ouverture)
    const doorPivot = new THREE.Group();
    const pivotX = config.openDirection === 'left' ? -config.width / 2 : config.width / 2;
    doorPivot.position.set(pivotX, 0, 0);
    doorPanel.position.set(
      config.openDirection === 'left' ? config.width / 2 - 0.01 : -config.width / 2 + 0.01,
      config.height / 2,
      0
    );
    doorPivot.add(doorPanel);

    // Appliquer l'angle d'ouverture
    if (config.isOpen) {
      const angle = config.openDirection === 'left' ? config.openAngle : -config.openAngle;
      doorPivot.rotation.y = angle;
    }

    group.add(doorPivot);

    // Poignee de porte
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.8, roughness: 0.2 });
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8),
      handleMat
    );
    handle.rotation.x = Math.PI / 2;
    const handleX = config.openDirection === 'left' ? config.width / 2 - 0.08 : -config.width / 2 + 0.08;
    handle.position.set(handleX, config.height * 0.45, 0.03);
    doorPanel.add(handle);

    // Arc au sol (indicateur de zone de degagement)
    const arcGeo = new THREE.RingGeometry(config.width * 0.95, config.width, 32, 1, 0, Math.PI / 2);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(pivotX, 0.01, 0);
    if (config.openDirection === 'right') arc.rotation.z = Math.PI / 2;
    group.add(arc);

    // Positionner le groupe dans la scene
    group.position.copy(config.position);
    group.rotation.y = config.rotation;

    this.scene.add(group);
    this.doors.set(config.id, { config, mesh: group });
    return group;
  }

  /**
   * Supprime une porte de la scene
   */
  removeDoor(id: string): void {
    const door = this.doors.get(id);
    if (door) {
      this.scene.remove(door.mesh);
      door.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
      this.doors.delete(id);
    }
  }

  /**
   * Bascule l'etat ouvert/ferme d'une porte
   */
  toggleDoor(id: string): void {
    const door = this.doors.get(id);
    if (door) {
      door.config.isOpen = !door.config.isOpen;
      this.removeDoor(id);
      this.addDoor(door.config);
    }
  }

  /**
   * Met a jour la configuration d'une porte
   */
  updateDoor(id: string, updates: Partial<DoorConfig>): void {
    const door = this.doors.get(id);
    if (door) {
      const newConfig = { ...door.config, ...updates };
      this.removeDoor(id);
      this.addDoor(newConfig);
    }
  }

  // ---- FENETRES ----

  /**
   * Ajoute une fenetre a la scene
   */
  addWindow(config: WindowConfig): THREE.Group {
    const group = new THREE.Group();
    group.userData = { ...config, type: 'window', id: config.id };

    const frameMat = new THREE.MeshStandardMaterial({ color: 0xEEEEEE, roughness: 0.3 });
    const frameThickness = 0.04;
    const frameDepth = 0.12;

    // Cadre exterieur - montant gauche
    group.add(this.createFramePart(
      frameThickness, config.height, frameDepth,
      new THREE.Vector3(-config.width / 2, config.sillHeight + config.height / 2, 0),
      frameMat
    ));

    // Cadre exterieur - montant droit
    group.add(this.createFramePart(
      frameThickness, config.height, frameDepth,
      new THREE.Vector3(config.width / 2, config.sillHeight + config.height / 2, 0),
      frameMat
    ));

    // Cadre exterieur - traverse haute
    group.add(this.createFramePart(
      config.width + frameThickness * 2, frameThickness, frameDepth,
      new THREE.Vector3(0, config.sillHeight + config.height, 0),
      frameMat
    ));

    // Appui de fenetre (sill)
    const sillMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.5 });
    group.add(this.createFramePart(
      config.width + frameThickness * 2 + 0.04, frameThickness + 0.02, frameDepth + 0.04,
      new THREE.Vector3(0, config.sillHeight, 0),
      sillMat
    ));

    // Vitrage
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88CCFF,
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.8,
    });

    if (config.type === 'double' || config.type === 'french') {
      // Meneau central
      group.add(this.createFramePart(
        frameThickness / 2, config.height, frameDepth,
        new THREE.Vector3(0, config.sillHeight + config.height / 2, 0),
        frameMat
      ));

      // Deux vitres
      const paneW = (config.width - frameThickness / 2) / 2 - 0.02;
      const leftGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(paneW, config.height - 0.04),
        glassMat
      );
      leftGlass.position.set(-config.width / 4, config.sillHeight + config.height / 2, 0);
      group.add(leftGlass);

      const rightGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(paneW, config.height - 0.04),
        glassMat
      );
      rightGlass.position.set(config.width / 4, config.sillHeight + config.height / 2, 0);
      group.add(rightGlass);
    } else {
      // Vitre unique
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(config.width - 0.04, config.height - 0.04),
        glassMat
      );
      glass.position.set(0, config.sillHeight + config.height / 2, 0);
      group.add(glass);
    }

    // Lumiere passant a travers la fenetre
    const windowLight = new THREE.RectAreaLight(0xffffff, 0.5, config.width, config.height);
    windowLight.position.set(0, config.sillHeight + config.height / 2, 0.1);
    group.add(windowLight);

    // Positionner le groupe
    group.position.copy(config.position);
    group.rotation.y = config.rotation;

    this.scene.add(group);
    this.windows.set(config.id, { config, mesh: group });
    return group;
  }

  /**
   * Supprime une fenetre de la scene
   */
  removeWindow(id: string): void {
    const win = this.windows.get(id);
    if (win) {
      this.scene.remove(win.mesh);
      win.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
      });
      this.windows.delete(id);
    }
  }

  /**
   * Met a jour la configuration d'une fenetre
   */
  updateWindow(id: string, updates: Partial<WindowConfig>): void {
    const win = this.windows.get(id);
    if (win) {
      const newConfig = { ...win.config, ...updates };
      this.removeWindow(id);
      this.addWindow(newConfig);
    }
  }

  /**
   * Cree un element de cadre (barre rectangulaire)
   */
  private createFramePart(
    w: number,
    h: number,
    d: number,
    pos: THREE.Vector3,
    mat: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    return mesh;
  }

  // ---- ACCESSEURS ----

  /**
   * Retourne les configurations de toutes les portes
   */
  getDoors(): DoorConfig[] {
    return Array.from(this.doors.values()).map(d => d.config);
  }

  /**
   * Retourne les configurations de toutes les fenetres
   */
  getWindows(): WindowConfig[] {
    return Array.from(this.windows.values()).map(w => w.config);
  }

  /**
   * Retourne le mesh d'une porte par ID
   */
  getDoorMesh(id: string): THREE.Group | undefined {
    return this.doors.get(id)?.mesh;
  }

  /**
   * Retourne le mesh d'une fenetre par ID
   */
  getWindowMesh(id: string): THREE.Group | undefined {
    return this.windows.get(id)?.mesh;
  }

  /**
   * Retourne la configuration d'une porte par ID
   */
  getDoorConfig(id: string): DoorConfig | undefined {
    return this.doors.get(id)?.config;
  }

  /**
   * Retourne la configuration d'une fenetre par ID
   */
  getWindowConfig(id: string): WindowConfig | undefined {
    return this.windows.get(id)?.config;
  }

  // ---- VALIDATION ----

  /**
   * Verifie si un placement d'objet chevauche la zone de degagement d'une porte
   */
  checkDoorClearance(
    position: THREE.Vector3,
    radius: number = 0.5
  ): { blocked: boolean; doorId?: string } {
    for (const [id, door] of this.doors) {
      const doorPos = door.config.position;
      const clearanceRadius = door.config.width + 0.3;
      const distance = new THREE.Vector2(
        position.x - doorPos.x,
        position.z - doorPos.z
      ).length();
      if (distance < clearanceRadius + radius) {
        return { blocked: true, doorId: id };
      }
    }
    return { blocked: false };
  }

  // ---- SERIALISATION ----

  /**
   * Serialise toutes les portes et fenetres en JSON
   */
  toJSON(): { doors: DoorConfigJSON[]; windows: WindowConfigJSON[] } {
    return {
      doors: this.getDoors().map(d => ({
        ...d,
        position: { x: d.position.x, y: d.position.y, z: d.position.z },
      })),
      windows: this.getWindows().map(w => ({
        ...w,
        position: { x: w.position.x, y: w.position.y, z: w.position.z },
      })),
    };
  }

  /**
   * Restaure les portes et fenetres depuis des donnees JSON
   */
  fromJSON(data: { doors?: DoorConfigJSON[]; windows?: WindowConfigJSON[] }): void {
    this.clear();
    data.doors?.forEach(d => {
      const config: DoorConfig = {
        ...d,
        position: new THREE.Vector3(d.position.x, d.position.y, d.position.z),
      };
      this.addDoor(config);
    });
    data.windows?.forEach(w => {
      const config: WindowConfig = {
        ...w,
        position: new THREE.Vector3(w.position.x, w.position.y, w.position.z),
      };
      this.addWindow(config);
    });
  }

  // ---- NETTOYAGE ----

  /**
   * Supprime toutes les portes et fenetres
   */
  clear(): void {
    // Copier les IDs car removeDoor/removeWindow modifient la Map
    const doorIds = Array.from(this.doors.keys());
    const windowIds = Array.from(this.windows.keys());
    doorIds.forEach(id => this.removeDoor(id));
    windowIds.forEach(id => this.removeWindow(id));
  }

  /**
   * Nettoie toutes les ressources
   */
  dispose(): void {
    this.clear();
  }
}
