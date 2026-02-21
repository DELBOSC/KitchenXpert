import * as THREE from 'three';
import type { BrandProfile } from '../config/brand-profiles';
import { mmToM } from '../config/brand-profiles';

/**
 * Configuration des plinthes (kickboards)
 */
export interface PlinthConfig {
  /** Hauteur de la plinthe (default 0.10m = 100mm) */
  height: number;
  /** Retrait de la plinthe par rapport a la face avant du meuble (default 0.03m = 30mm) */
  inset: number;
  /** Couleur de la plinthe (default 0x3D3D3D gris fonce) */
  color: number;
}

/**
 * Configuration de la credence (backsplash)
 */
export interface BacksplashConfig {
  /** Epaisseur de la credence (default 0.01m = 10mm) */
  thickness: number;
  /** Couleur de la credence (default 0xFAFAFA blanc ceramique) */
  color: number;
  /** Rugosite du materiau (default 0.3) */
  roughness: number;
}

/** Types de meubles bas qui recoivent plinthe et credence */
const BASE_CABINET_TYPES = new Set<string>([
  'base_cabinet',
  'base',
  'sink',
  'sink_base',
  'dishwasher',
  'cooktop',
  'stove',
]);

/** Types de meubles hauts */
const WALL_CABINET_TYPES = new Set<string>([
  'wall_cabinet',
  'wall',
  'upper',
  'upper_cabinet',
]);

/** Tolerance de gap entre deux meubles pour les considerer adjacents (2cm) */
const ADJACENCY_GAP = 0.02;

/** Tolerance d'alignement mural (10cm) */
const WALL_ALIGNMENT_TOLERANCE = 0.1;

/**
 * Information extraite d'un meuble pour les calculs de positionnement
 */
interface CabinetInfo {
  id: string;
  type: string;
  centerX: number;
  centerZ: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  depth: number;
  width: number;
}

/**
 * Run de meubles adjacents le long d'un mur
 */
interface CabinetRun {
  cabinets: CabinetInfo[];
  startX: number;
  endX: number;
  maxDepth: number;
  wallZ: number;
}

/**
 * Generateur d'accessoires de cuisine : plinthes et credences
 *
 * Les plinthes sont generees sous les meubles bas, en retrait de la face avant.
 * Les credences sont generees entre le plan de travail et les meubles hauts,
 * uniquement lorsque des meubles hauts existent au-dessus des meubles bas.
 */
export class AccessoriesGenerator {
  private scene: THREE.Scene;
  private plinthConfig: PlinthConfig;
  private backsplashConfig: BacksplashConfig;
  private brandProfile: BrandProfile;

  private plinthGroup: THREE.Group;
  private backsplashGroup: THREE.Group;

  private plinthMaterial: THREE.MeshStandardMaterial;
  private backsplashMaterial: THREE.MeshStandardMaterial;

  constructor(
    scene: THREE.Scene,
    brandProfile: BrandProfile,
    plinthConfig?: Partial<PlinthConfig>,
    backsplashConfig?: Partial<BacksplashConfig>
  ) {
    this.scene = scene;
    this.brandProfile = brandProfile;

    this.plinthConfig = {
      height: mmToM(brandProfile.base.defaultPlinthHeight),
      inset: mmToM(brandProfile.plinth.inset),
      color: 0x3d3d3d,
      ...plinthConfig,
    };

    this.backsplashConfig = {
      thickness: mmToM(brandProfile.backsplash.thickness),
      color: 0xfafafa,
      roughness: 0.3,
      ...backsplashConfig,
    };

    // Materiaux
    this.plinthMaterial = new THREE.MeshStandardMaterial({
      color: this.plinthConfig.color,
      roughness: 0.6,
      metalness: 0.05,
    });

    this.backsplashMaterial = new THREE.MeshStandardMaterial({
      color: this.backsplashConfig.color,
      roughness: this.backsplashConfig.roughness,
      metalness: 0.02,
    });

    // Groupes scene
    this.plinthGroup = new THREE.Group();
    this.plinthGroup.name = '__plinths__';
    this.scene.add(this.plinthGroup);

    this.backsplashGroup = new THREE.Group();
    this.backsplashGroup.name = '__backsplashes__';
    this.scene.add(this.backsplashGroup);
  }

  /**
   * Met a jour plinthes et credences (supprime les anciens et regenere)
   */
  update(objects: Map<string, THREE.Object3D>): void {
    this.clearAll();

    const baseCabinets = this.extractCabinets(objects, BASE_CABINET_TYPES);
    const wallCabinets = this.extractCabinets(objects, WALL_CABINET_TYPES);

    if (baseCabinets.length === 0) {
      return;
    }

    // Grouper les meubles bas par mur et trouver les runs adjacents
    const wallGroups = this.groupByWall(baseCabinets);

    for (const group of wallGroups) {
      const runs = this.findAdjacentRuns(group);

      for (const run of runs) {
        // Generer la plinthe pour ce run
        this.createPlinthMesh(run);

        // Generer la credence si des meubles hauts existent au-dessus
        if (this.hasWallCabinetsAbove(run, wallCabinets)) {
          this.createBacksplashMesh(run);
        }
      }
    }
  }

  /**
   * Met a jour le profil marque et recalcule les defaults
   */
  updateBrandProfile(profile: BrandProfile): void {
    this.brandProfile = profile;
    this.plinthConfig.height = mmToM(profile.base.defaultPlinthHeight);
    this.plinthConfig.inset = mmToM(profile.plinth.inset);
    this.backsplashConfig.thickness = mmToM(profile.backsplash.thickness);
  }

  /**
   * Met a jour la hauteur de surface du plan de travail (pour changement d'epaisseur)
   * Appeler cette methode puis update() pour regenerer les credences a la bonne hauteur.
   */
  updateWorktopSurface(surfaceYMm: number): void {
    this.brandProfile = {
      ...this.brandProfile,
      worktop: {
        ...this.brandProfile.worktop,
        surfaceY: surfaceYMm,
      },
    };
  }

  /**
   * Nettoie et libere toutes les ressources
   */
  dispose(): void {
    this.clearAll();
    this.scene.remove(this.plinthGroup);
    this.scene.remove(this.backsplashGroup);
    this.plinthMaterial.dispose();
    this.backsplashMaterial.dispose();
  }

  // ---------------------------------------------------------------------------
  // Extraction et groupement
  // ---------------------------------------------------------------------------

  /**
   * Extrait les meubles d'un type donne
   */
  private extractCabinets(
    objects: Map<string, THREE.Object3D>,
    types: Set<string>
  ): CabinetInfo[] {
    const cabinets: CabinetInfo[] = [];

    for (const [id, obj] of objects) {
      const objType = obj.userData.type as string | undefined;
      if (!objType || !types.has(objType)) {
        continue;
      }

      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());

      cabinets.push({
        id,
        type: objType,
        centerX: (box.min.x + box.max.x) / 2,
        centerZ: (box.min.z + box.max.z) / 2,
        minX: box.min.x,
        maxX: box.max.x,
        minZ: box.min.z,
        maxZ: box.max.z,
        depth: size.z,
        width: size.x,
      });
    }

    return cabinets;
  }

  /**
   * Groupe les meubles par alignement mural (meme logique que WorktopGenerator)
   */
  private groupByWall(cabinets: CabinetInfo[]): CabinetInfo[][] {
    if (cabinets.length === 0) {
      return [];
    }

    const groups: CabinetInfo[][] = [];
    const assigned = new Set<string>();

    const sortedByZ = [...cabinets].sort((a, b) => a.centerZ - b.centerZ);

    for (let i = 0; i < sortedByZ.length; i++) {
      const cabinet = sortedByZ[i]!;
      if (assigned.has(cabinet.id)) {
        continue;
      }

      const group: CabinetInfo[] = [cabinet];
      assigned.add(cabinet.id);

      for (let j = i + 1; j < sortedByZ.length; j++) {
        const other = sortedByZ[j]!;
        if (assigned.has(other.id)) {
          continue;
        }

        if (Math.abs(cabinet.centerZ - other.centerZ) < WALL_ALIGNMENT_TOLERANCE) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Trouve les runs de meubles adjacents dans un groupe mural
   */
  private findAdjacentRuns(cabinets: CabinetInfo[]): CabinetRun[] {
    if (cabinets.length === 0) {
      return [];
    }

    const sorted = [...cabinets].sort((a, b) => a.minX - b.minX);

    const runs: CabinetRun[] = [];
    let currentCabinets: CabinetInfo[] = [sorted[0]!];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i]!;
      const prev = sorted[i - 1]!;

      const gap = current.minX - prev.maxX;

      if (gap < ADJACENCY_GAP) {
        currentCabinets.push(current);
      } else {
        runs.push(this.buildRun(currentCabinets));
        currentCabinets = [current];
      }
    }

    runs.push(this.buildRun(currentCabinets));
    return runs;
  }

  /**
   * Construit un CabinetRun a partir d'une liste de meubles adjacents
   */
  private buildRun(cabinets: CabinetInfo[]): CabinetRun {
    let startX = Infinity;
    let endX = -Infinity;
    let maxDepth = 0;

    for (const cabinet of cabinets) {
      if (cabinet.minX < startX) startX = cabinet.minX;
      if (cabinet.maxX > endX) endX = cabinet.maxX;
      if (cabinet.depth > maxDepth) maxDepth = cabinet.depth;
    }

    const sumZ = cabinets.reduce((acc, c) => acc + c.centerZ, 0);
    const wallZ = sumZ / cabinets.length;

    return {
      cabinets,
      startX,
      endX,
      maxDepth,
      wallZ,
    };
  }

  // ---------------------------------------------------------------------------
  // Plinthes
  // ---------------------------------------------------------------------------

  /**
   * Cree le mesh de plinthe pour un run de meubles
   *
   * La plinthe est un bandeau horizontal au sol, en retrait de la face avant
   * du meuble, s'etendant sur toute la largeur du run.
   */
  private createPlinthMesh(run: CabinetRun): void {
    const width = run.endX - run.startX;
    const height = this.plinthConfig.height;

    // La profondeur de la plinthe = profondeur du meuble moins le retrait avant
    const depth = run.maxDepth - this.plinthConfig.inset;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, this.plinthMaterial);

    // Centrer en X sur le run
    const centerX = (run.startX + run.endX) / 2;

    // Au sol, centre vertical = moitie de la hauteur
    const centerY = height / 2;

    // Aligne avec le mur, mais decale vers l'arriere du retrait / 2
    // Le meuble a son centre en wallZ, la plinthe est en retrait de inset depuis la face avant
    const centerZ = run.wallZ - this.plinthConfig.inset / 2;

    mesh.position.set(centerX, centerY, centerZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      type: 'plinth',
      isGenerated: true,
      cabinetIds: run.cabinets.map((c) => c.id),
    };

    mesh.name = `plinth_${run.cabinets.map((c) => c.id).join('_')}`;

    this.plinthGroup.add(mesh);
  }

  // ---------------------------------------------------------------------------
  // Credences (backsplash)
  // ---------------------------------------------------------------------------

  /**
   * Verifie si des meubles hauts existent au-dessus d'un run de meubles bas.
   *
   * Un meuble haut est considere "au-dessus" s'il partage un alignement Z
   * similaire et que son etendue X chevauche le run.
   */
  private hasWallCabinetsAbove(run: CabinetRun, wallCabinets: CabinetInfo[]): boolean {
    for (const wallCab of wallCabinets) {
      // Verifier alignement Z (meme mur)
      if (Math.abs(wallCab.centerZ - run.wallZ) > WALL_ALIGNMENT_TOLERANCE) {
        continue;
      }

      // Verifier chevauchement X
      if (wallCab.maxX > run.startX && wallCab.minX < run.endX) {
        return true;
      }
    }

    return false;
  }

  /**
   * Cree le mesh de credence pour un run de meubles bas.
   *
   * La credence est un panneau vertical mince, positionne contre le mur,
   * allant du dessus du plan de travail (0.918m) au bas des meubles hauts (1.40m).
   */
  private createBacksplashMesh(run: CabinetRun): void {
    const width = run.endX - run.startX;
    const worktopTopY = mmToM(this.brandProfile.worktop.surfaceY);
    const wallCabinetBottomY = mmToM(this.brandProfile.wall.bottomY);
    const height = wallCabinetBottomY - worktopTopY;
    const thickness = this.backsplashConfig.thickness;

    const geometry = new THREE.BoxGeometry(width, height, thickness);
    const mesh = new THREE.Mesh(geometry, this.backsplashMaterial);

    // Centrer en X sur le run
    const centerX = (run.startX + run.endX) / 2;

    // Centrer en Y entre le haut du plan de travail et le bas des meubles hauts
    const centerY = worktopTopY + height / 2;

    // Positionner contre le mur : le fond du meuble (centerZ - depth/2) + moitie epaisseur
    // On approxime la position du mur par le bord arriere des meubles
    const backZ = run.wallZ - run.maxDepth / 2;
    const centerZ = backZ + thickness / 2;

    mesh.position.set(centerX, centerY, centerZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      type: 'backsplash',
      isGenerated: true,
      cabinetIds: run.cabinets.map((c) => c.id),
    };

    mesh.name = `backsplash_${run.cabinets.map((c) => c.id).join('_')}`;

    this.backsplashGroup.add(mesh);
  }

  // ---------------------------------------------------------------------------
  // Nettoyage
  // ---------------------------------------------------------------------------

  /**
   * Supprime tous les accessoires generes et libere la memoire geometrique
   */
  private clearAll(): void {
    this.clearGroup(this.plinthGroup);
    this.clearGroup(this.backsplashGroup);
  }

  /**
   * Vide un groupe et dispose les geometries (les materiaux partages ne sont pas disposes)
   */
  private clearGroup(group: THREE.Group): void {
    const children = [...group.children];

    for (const child of children) {
      group.remove(child);

      child.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
        }
      });
    }
  }
}
