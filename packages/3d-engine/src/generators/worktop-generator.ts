import * as THREE from 'three';
import type { BrandProfile } from '../config/brand-profiles';
import { mmToM } from '../config/brand-profiles';

/**
 * Configuration du plan de travail
 */
export interface WorktopConfig {
  /** Epaisseur du plan de travail (default 0.038m = 38mm) */
  thickness: number;
  /** Debord avant (default 0.03m = 30mm) */
  overhangFront: number;
  /** Debord arriere (default 0.0m) */
  overhangBack: number;
  /** Debord lateral (default 0.025m = 25mm) */
  overhangSide: number;
  /** Couleur du materiau (default 0xE8E8E8 quartz blanc) */
  materialColor: number;
  /** Rugosite du materiau (default 0.2) */
  roughness: number;
  /** Metalness du materiau (default 0.05) */
  metalness: number;
}

/**
 * Segment de plan de travail representant une portion continue
 */
export interface WorktopSegment {
  /** Position X du debut du segment (bord gauche incluant overhang) */
  startX: number;
  /** Position X de fin du segment (bord droit incluant overhang) */
  endX: number;
  /** Profondeur maximale des meubles dans ce segment */
  maxDepth: number;
  /** Position Z d'alignement au mur */
  wallZ: number;
  /** Liste des IDs d'objets couverts par ce segment */
  cabinetIds: string[];
}

/** Types de meubles bas qui recoivent un plan de travail */
const BASE_CABINET_TYPES = new Set<string>([
  'base_cabinet',
  'base',
  'sink',
  'sink_base',
  'dishwasher',
  'cooktop',
  'stove',
]);

/** Tolerance de gap entre deux meubles pour les considerer adjacents (2cm) */
const ADJACENCY_GAP = 0.02;

/** Tolerance d'alignement mural (10cm) */
const WALL_ALIGNMENT_TOLERANCE = 0.1;

/**
 * Information extraite d'un meuble bas pour le calcul du plan de travail
 */
interface CabinetInfo {
  id: string;
  centerX: number;
  centerZ: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  depth: number;
}

/**
 * Generateur de plans de travail continus
 *
 * Scanne les meubles bas de la scene, les regroupe par alignement mural,
 * puis genere un plan de travail continu par groupe avec debords configurables.
 */
export class WorktopGenerator {
  private scene: THREE.Scene;
  private config: WorktopConfig;
  private worktopGroup: THREE.Group;
  private material: THREE.MeshStandardMaterial;
  private materialId: string;
  private brandProfile: BrandProfile;

  constructor(scene: THREE.Scene, brandProfile: BrandProfile, config?: Partial<WorktopConfig>) {
    this.scene = scene;
    this.brandProfile = brandProfile;
    this.materialId = 'stone-quartz-white';

    this.config = {
      thickness: mmToM(brandProfile.worktop.defaultThickness),
      overhangFront: mmToM(brandProfile.worktop.overhangFront),
      overhangBack: mmToM(brandProfile.worktop.overhangBack),
      overhangSide: mmToM(brandProfile.worktop.overhangSide),
      materialColor: 0xe8e8e8,
      roughness: 0.2,
      metalness: 0.05,
      ...config,
    };

    this.material = new THREE.MeshStandardMaterial({
      color: this.config.materialColor,
      roughness: this.config.roughness,
      metalness: this.config.metalness,
    });

    this.worktopGroup = new THREE.Group();
    this.worktopGroup.name = '__worktops__';
    this.scene.add(this.worktopGroup);
  }

  /**
   * Genere les plans de travail a partir des objets de la scene
   */
  generateWorktops(objects: Map<string, THREE.Object3D>): void {
    const cabinets = this.extractBaseCabinets(objects);

    if (cabinets.length === 0) {
      return;
    }

    // Grouper les meubles par mur (alignement Z pour murs du fond, X pour murs lateraux)
    const wallGroups = this.groupByWall(cabinets);

    // Pour chaque groupe mural, trouver les runs adjacents et creer un segment
    for (const group of wallGroups) {
      const runs = this.findAdjacentRuns(group);

      for (const run of runs) {
        const segment = this.buildSegment(run);
        this.createWorktopMesh(segment);
      }
    }
  }

  /**
   * Met a jour les plans de travail (supprime les anciens et regenere)
   */
  updateWorktops(objects: Map<string, THREE.Object3D>): void {
    this.clearWorktops();
    this.generateWorktops(objects);
  }

  /**
   * Change la couleur du materiau des plans de travail
   */
  setMaterialColor(color: number): void {
    this.config.materialColor = color;
    this.material.color.setHex(color);
    this.material.needsUpdate = true;
  }

  /**
   * Change l'identifiant du materiau
   */
  setMaterialId(id: string): void {
    this.materialId = id;
  }

  /**
   * Retourne l'identifiant du materiau actuel
   */
  getMaterialId(): string {
    return this.materialId;
  }

  /**
   * Change l'epaisseur du plan de travail (en metres)
   */
  setThickness(thicknessMeters: number): void {
    this.config.thickness = thicknessMeters;
  }

  /**
   * Met a jour le profil marque et recalcule les defaults
   */
  updateBrandProfile(profile: BrandProfile): void {
    this.brandProfile = profile;
    this.config.thickness = mmToM(profile.worktop.defaultThickness);
    this.config.overhangFront = mmToM(profile.worktop.overhangFront);
    this.config.overhangBack = mmToM(profile.worktop.overhangBack);
    this.config.overhangSide = mmToM(profile.worktop.overhangSide);
  }

  /**
   * Retourne le profil marque actuel
   */
  getBrandProfile(): BrandProfile {
    return this.brandProfile;
  }

  /**
   * Nettoie et libere toutes les ressources
   */
  dispose(): void {
    this.clearWorktops();
    this.scene.remove(this.worktopGroup);
    this.material.dispose();
  }

  // ---------------------------------------------------------------------------
  // Methodes privees
  // ---------------------------------------------------------------------------

  /**
   * Extrait les meubles bas de la collection d'objets
   */
  private extractBaseCabinets(objects: Map<string, THREE.Object3D>): CabinetInfo[] {
    const cabinets: CabinetInfo[] = [];

    for (const [id, obj] of objects) {
      const objType = obj.userData.type as string | undefined;
      if (!objType || !BASE_CABINET_TYPES.has(objType)) {
        continue;
      }

      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());

      cabinets.push({
        id,
        centerX: (box.min.x + box.max.x) / 2,
        centerZ: (box.min.z + box.max.z) / 2,
        minX: box.min.x,
        maxX: box.max.x,
        minZ: box.min.z,
        maxZ: box.max.z,
        depth: size.z,
      });
    }

    return cabinets;
  }

  /**
   * Groupe les meubles par alignement mural.
   *
   * Deux meubles sont sur le meme mur s'ils partagent un alignement Z similaire
   * (mur du fond) ou X similaire (murs lateraux).
   * On utilise une approche union-find simplifiee : on trie par Z/X et on fusionne
   * les meubles dont la distance d'alignement est inferieure a WALL_ALIGNMENT_TOLERANCE.
   */
  private groupByWall(cabinets: CabinetInfo[]): CabinetInfo[][] {
    if (cabinets.length === 0) {
      return [];
    }

    // Tenter le groupement par Z (mur du fond / murs paralleles a X)
    const groups: CabinetInfo[][] = [];
    const assigned = new Set<string>();

    // Tri par position Z pour regroupement
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

        // Verifier si alignement Z est similaire (meme mur)
        if (Math.abs(cabinet.centerZ - other.centerZ) < WALL_ALIGNMENT_TOLERANCE) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      groups.push(group);
    }

    // Aussi grouper par X pour murs lateraux (gauche/droite)
    // Les meubles non encore assignes par Z pourraient etre sur des murs lateraux
    // Mais comme on a deja assigne tous les meubles, on verifie si un groupe
    // devrait etre re-split par alignement X
    const finalGroups: CabinetInfo[][] = [];

    for (const group of groups) {
      if (group.length <= 1) {
        finalGroups.push(group);
        continue;
      }

      // Verifier si ce groupe est en fait aligne selon X (mur lateral)
      const xSpread = Math.max(...group.map((c) => c.centerX)) - Math.min(...group.map((c) => c.centerX));
      const zSpread = Math.max(...group.map((c) => c.centerZ)) - Math.min(...group.map((c) => c.centerZ));

      if (zSpread > WALL_ALIGNMENT_TOLERANCE && xSpread < WALL_ALIGNMENT_TOLERANCE) {
        // Meubles alignes en X (mur lateral), pas en Z
        // Re-grouper par X
        const subGroups = this.subGroupByAxis(group, 'x');
        finalGroups.push(...subGroups);
      } else {
        finalGroups.push(group);
      }
    }

    return finalGroups;
  }

  /**
   * Sous-groupement par axe pour murs lateraux
   */
  private subGroupByAxis(cabinets: CabinetInfo[], axis: 'x' | 'z'): CabinetInfo[][] {
    const sorted = [...cabinets].sort((a, b) => {
      const aVal = axis === 'x' ? a.centerX : a.centerZ;
      const bVal = axis === 'x' ? b.centerX : b.centerZ;
      return aVal - bVal;
    });

    const groups: CabinetInfo[][] = [];
    let currentGroup: CabinetInfo[] = [sorted[0]!];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i]!;
      const prev = sorted[i - 1]!;

      const currentVal = axis === 'x' ? current.centerX : current.centerZ;
      const prevVal = axis === 'x' ? prev.centerX : prev.centerZ;

      if (Math.abs(currentVal - prevVal) < WALL_ALIGNMENT_TOLERANCE) {
        currentGroup.push(current);
      } else {
        groups.push(currentGroup);
        currentGroup = [current];
      }
    }

    groups.push(currentGroup);
    return groups;
  }

  /**
   * Trouve les runs de meubles adjacents dans un groupe mural.
   *
   * Les meubles sont tries par position X et regroupes si l'ecart entre
   * le bord droit d'un meuble et le bord gauche du suivant est < ADJACENCY_GAP (2cm).
   */
  private findAdjacentRuns(cabinets: CabinetInfo[]): CabinetInfo[][] {
    if (cabinets.length === 0) {
      return [];
    }

    // Trier par position X (gauche a droite)
    const sorted = [...cabinets].sort((a, b) => a.minX - b.minX);

    const runs: CabinetInfo[][] = [];
    let currentRun: CabinetInfo[] = [sorted[0]!];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i]!;
      const prev = sorted[i - 1]!;

      // Gap = bord gauche du suivant - bord droit du precedent
      const gap = current.minX - prev.maxX;

      if (gap < ADJACENCY_GAP) {
        // Adjacents : meme run
        currentRun.push(current);
      } else {
        // Trop d'ecart : nouveau run
        runs.push(currentRun);
        currentRun = [current];
      }
    }

    runs.push(currentRun);
    return runs;
  }

  /**
   * Construit un WorktopSegment a partir d'un run de meubles adjacents
   */
  private buildSegment(run: CabinetInfo[]): WorktopSegment {
    let minX = Infinity;
    let maxX = -Infinity;
    let maxDepth = 0;
    let wallZ = 0;
    const cabinetIds: string[] = [];

    for (const cabinet of run) {
      if (cabinet.minX < minX) minX = cabinet.minX;
      if (cabinet.maxX > maxX) maxX = cabinet.maxX;
      if (cabinet.depth > maxDepth) maxDepth = cabinet.depth;
      cabinetIds.push(cabinet.id);
    }

    // Le Z du mur est approxime par le Z moyen des centres des meubles
    const sumZ = run.reduce((acc, c) => acc + c.centerZ, 0);
    wallZ = sumZ / run.length;

    return {
      startX: minX - this.config.overhangSide,
      endX: maxX + this.config.overhangSide,
      maxDepth,
      wallZ,
      cabinetIds,
    };
  }

  /**
   * Cree le mesh THREE.js pour un segment de plan de travail
   */
  private createWorktopMesh(segment: WorktopSegment): void {
    const width = segment.endX - segment.startX;
    const depth = segment.maxDepth + this.config.overhangFront + this.config.overhangBack;
    const thickness = this.config.thickness;

    const geometry = new THREE.BoxGeometry(width, thickness, depth);
    const mesh = new THREE.Mesh(geometry, this.material);

    // Centrer le mesh horizontalement sur le segment
    const centerX = (segment.startX + segment.endX) / 2;

    // Le plan de travail depasse vers l'avant (overhangFront) et eventuellement l'arriere
    // wallZ est le centre Z des meubles. Le plan de travail est centre en Z sur les meubles
    // decale vers l'avant de overhangFront/2 - overhangBack/2
    const centerZ = segment.wallZ + (this.config.overhangFront - this.config.overhangBack) / 2;

    // Positionner au sommet des meubles bas (hauteur totale du profil marque)
    const worktopY = mmToM(this.brandProfile.base.totalHeight);
    const centerY = worktopY + thickness / 2;

    mesh.position.set(centerX, centerY, centerZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      type: 'worktop',
      isGenerated: true,
      materialId: this.materialId,
      cabinetIds: segment.cabinetIds,
    };

    mesh.name = `worktop_${segment.cabinetIds.join('_')}`;

    this.worktopGroup.add(mesh);
  }

  /**
   * Supprime tous les plans de travail generes et libere la memoire
   */
  private clearWorktops(): void {
    const children = [...this.worktopGroup.children];

    for (const child of children) {
      this.worktopGroup.remove(child);

      child.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          // Ne pas disposer le material partage ici, il est gere par la classe
        }
      });
    }
  }
}
