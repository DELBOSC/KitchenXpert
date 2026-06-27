import * as THREE from 'three';
import type { PlacedItem3D, RoomConfig } from './ai-assistant';

/**
 * Supported international accessibility standards
 */
export enum AccessibilityStandard {
  /** French standard (default) — NF P 99-611 / NF EN 17210 */
  NF_P_99_611 = 'nf_p_99_611',
  /** American standard — ADA / ANSI A117.1 */
  ADA_ANSI_A117 = 'ada_ansi_a117',
  /** German standard — DIN 18040 */
  DIN_18040 = 'din_18040',
  /** British standard — BS 8300 */
  BS_8300 = 'bs_8300',
}

/**
 * Configuration des seuils d'accessibilite PMR
 * Basee sur NF P 99-611 et NF EN 17210
 */
export interface AccessibilityConfig {
  wheelchairWidth: number; // mm — largeur fauteuil roulant
  turningCircleDiameter: number; // mm — diametre cercle de rotation
  minPassageWidth: number; // mm — largeur passage minimum
  maxReachHeight: number; // mm — hauteur max atteignable
  minReachHeight: number; // mm — hauteur min atteignable
  worktopHeightMin: number; // mm — PDT min PMR
  worktopHeightMax: number; // mm — PDT max PMR
  maxWallCabinetTop: number; // mm — haut max meubles hauts
  minSocketHeight: number; // mm — prise min
  maxSocketHeight: number; // mm — prise max
  kneeSpaceDepth?: number; // mm — depth of knee space under worktop
  kneeSpaceWidth?: number; // mm — width of knee space under worktop
  kneeSpaceHeight?: number; // mm — height of knee space under worktop
  doorClearance?: number; // mm — clear opening width for doors
  sinkClearFloor?: boolean; // whether sink must have clear floor space
}

// --- Standard-specific rule configurations ---

/** French NF P 99-611 (default) */
const NF_P_99_611_CONFIG: AccessibilityConfig = {
  wheelchairWidth: 700,
  turningCircleDiameter: 1500,
  minPassageWidth: 900,
  maxReachHeight: 1300,
  minReachHeight: 400,
  worktopHeightMin: 750,
  worktopHeightMax: 850,
  maxWallCabinetTop: 1200,
  minSocketHeight: 400,
  maxSocketHeight: 1300,
  doorClearance: 775,
};

/** American ADA / ANSI A117.1 */
const ADA_ANSI_A117_CONFIG: AccessibilityConfig = {
  wheelchairWidth: 915, // 36 inches = 915mm
  turningCircleDiameter: 1524, // 60 inches = 1524mm
  minPassageWidth: 915, // 36 inches
  minReachHeight: 380, // 15 inches = 380mm
  maxReachHeight: 1220, // 48 inches = 1220mm
  worktopHeightMin: 710, // 28 inches
  worktopHeightMax: 865, // 34 inches
  maxWallCabinetTop: 1220, // 48 inches max reach
  minSocketHeight: 380, // 15 inches
  maxSocketHeight: 1220, // 48 inches
  kneeSpaceDepth: 430, // 17 inches
  kneeSpaceWidth: 760, // 30 inches
  kneeSpaceHeight: 685, // 27 inches
  sinkClearFloor: true, // must have clear floor space
  doorClearance: 815, // 32 inches
};

/** German DIN 18040 */
const DIN_18040_CONFIG: AccessibilityConfig = {
  wheelchairWidth: 900,
  turningCircleDiameter: 1500,
  minPassageWidth: 900,
  minReachHeight: 400,
  maxReachHeight: 1400,
  worktopHeightMin: 820,
  worktopHeightMax: 870,
  maxWallCabinetTop: 1400,
  minSocketHeight: 400,
  maxSocketHeight: 1400,
  doorClearance: 800,
};

/** British BS 8300 */
const BS_8300_CONFIG: AccessibilityConfig = {
  wheelchairWidth: 900,
  turningCircleDiameter: 1500,
  minPassageWidth: 900,
  minReachHeight: 400,
  maxReachHeight: 1200,
  worktopHeightMin: 750,
  worktopHeightMax: 850,
  maxWallCabinetTop: 1200,
  minSocketHeight: 400,
  maxSocketHeight: 1200,
  doorClearance: 800,
};

/** Map from standard enum to config */
const STANDARD_CONFIGS: Record<AccessibilityStandard, AccessibilityConfig> = {
  [AccessibilityStandard.NF_P_99_611]: NF_P_99_611_CONFIG,
  [AccessibilityStandard.ADA_ANSI_A117]: ADA_ANSI_A117_CONFIG,
  [AccessibilityStandard.DIN_18040]: DIN_18040_CONFIG,
  [AccessibilityStandard.BS_8300]: BS_8300_CONFIG,
};

/** Default config (French standard for backward compatibility) */
const DEFAULT_CONFIG: AccessibilityConfig = NF_P_99_611_CONFIG;

export type ViolationSeverity = 'critical' | 'major' | 'minor';

export interface AccessibilityViolation {
  id: string;
  ruleId: string;
  severity: ViolationSeverity;
  message: string;
  detail: string;
  affectedObjectIds?: string[];
  fix?: string;
}

export interface AccessibilityScore {
  overall: number;
  clearances: number;
  heights: number;
  reachability: number;
  safety: number;
  violations: AccessibilityViolation[];
  compliant: boolean;
}

export interface AccessibilityZone {
  type: 'accessible' | 'problem' | 'turning_circle' | 'reach_zone';
  position: THREE.Vector3;
  size: THREE.Vector3;
  rotation?: number;
}

export interface AccessibilityOverlayData {
  accessibleZones: AccessibilityZone[];
  problemAreas: AccessibilityZone[];
  turningCircles: AccessibilityZone[];
  reachZones: AccessibilityZone[];
}

/**
 * Verificateur d'accessibilite PMR pour cuisines
 * 10 regles basees sur NF P 99-611 / NF EN 17210
 */
export class AccessibilityChecker {
  private config: AccessibilityConfig;

  constructor(config?: Partial<AccessibilityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Returns the configuration for a given accessibility standard.
   * Useful for inspecting which thresholds are used.
   */
  static getConfigForStandard(standard: AccessibilityStandard): AccessibilityConfig {
    return { ...STANDARD_CONFIGS[standard] };
  }

  /**
   * Returns all available standards.
   */
  static getAvailableStandards(): AccessibilityStandard[] {
    return Object.values(AccessibilityStandard);
  }

  /**
   * Switches the checker to use a different standard.
   * This updates the internal config.
   */
  setStandard(standard: AccessibilityStandard): void {
    this.config = { ...STANDARD_CONFIGS[standard] };
  }

  /**
   * Verifie l'accessibilite complete de la configuration.
   * @param items   Placed kitchen items
   * @param room    Room configuration
   * @param standard  Optional accessibility standard to use (defaults to NF_P_99_611 for backward compatibility)
   */
  checkAccessibility(
    items: PlacedItem3D[],
    room: RoomConfig,
    standard?: AccessibilityStandard
  ): AccessibilityScore {
    // If a standard is specified, temporarily switch config for this check
    const previousConfig = this.config;
    if (standard) {
      this.config = { ...STANDARD_CONFIGS[standard] };
    }

    const violations = this.getViolations(items, room);

    const clearances = this.scoreClearances(items, room);
    const heights = this.scoreHeights(items);
    const reachability = this.scoreReachability(items);
    const safety = this.scoreSafety(items);

    const overall = Math.round(
      clearances * 0.3 + heights * 0.25 + reachability * 0.25 + safety * 0.2
    );

    const hasCritical = violations.some((v) => v.severity === 'critical');

    const result: AccessibilityScore = {
      overall: Math.max(0, Math.min(100, overall)),
      clearances: Math.round(clearances),
      heights: Math.round(heights),
      reachability: Math.round(reachability),
      safety: Math.round(safety),
      violations,
      compliant: !hasCritical && overall >= 70,
    };

    // Restore previous config if we temporarily switched
    if (standard) {
      this.config = previousConfig;
    }

    return result;
  }

  /**
   * Liste toutes les violations d'accessibilite
   */
  getViolations(items: PlacedItem3D[], room: RoomConfig): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    let vId = 0;

    // Regle 1: Largeur passage min 900mm
    this.checkPassageWidths(items, room, violations, vId);
    vId = violations.length;

    // Regle 2: Cercle rotation 1500mm
    this.checkTurningCircle(items, room, violations, vId);
    vId = violations.length;

    // Regle 3: Hauteur PDT 750-850mm
    this.checkWorktopHeight(items, violations, vId);
    vId = violations.length;

    // Regle 4: Meubles bas = tiroirs (pas portes)
    this.checkBaseDrawers(items, violations, vId);
    vId = violations.length;

    // Regle 5: Poignees accessibles (D ou barre)
    this.checkHandleType(items, violations, vId);
    vId = violations.length;

    // Regle 6: Evier peu profond + mitigeur levier
    this.checkSinkAccessibility(items, violations, vId);
    vId = violations.length;

    // Regle 7: Plaque induction (securite)
    this.checkCooktopSafety(items, violations, vId);
    vId = violations.length;

    // Regle 8: Commandes zone 400-1300mm
    this.checkControlsHeight(items, violations, vId);
    vId = violations.length;

    // Regle 9: Meubles hauts max 1200mm haut
    this.checkWallCabinetHeight(items, violations, vId);
    vId = violations.length;

    // Regle 10: Espace libre sous PDT pour fauteuil
    this.checkKneeSpace(items, violations, vId);

    return violations;
  }

  /**
   * Genere les suggestions de correction pour les violations
   */
  getSuggestions(
    violations: AccessibilityViolation[]
  ): Array<{ violationId: string; suggestion: string }> {
    return violations.map((v) => ({
      violationId: v.id,
      suggestion: v.fix || `Corrigez la violation: ${v.message}`,
    }));
  }

  /**
   * Genere les zones de superposition visuelle d'accessibilite
   */
  generateAccessibilityOverlay(items: PlacedItem3D[], room: RoomConfig): AccessibilityOverlayData {
    const accessibleZones: AccessibilityZone[] = [];
    const problemAreas: AccessibilityZone[] = [];
    const turningCircles: AccessibilityZone[] = [];
    const reachZones: AccessibilityZone[] = [];

    const roomWidthM = room.width;
    const roomDepthM = room.depth;

    // Calculer les zones accessibles au sol (grille 0.3m)
    const gridStep = 0.3;
    const passageMinM = this.config.minPassageWidth / 1000;

    for (let x = gridStep / 2; x < roomWidthM; x += gridStep) {
      for (let z = gridStep / 2; z < roomDepthM; z += gridStep) {
        const testPos = new THREE.Vector3(x, 0, z);
        const minDist = this.getMinDistanceToFurniture(testPos, items);

        if (minDist >= passageMinM) {
          accessibleZones.push({
            type: 'accessible',
            position: new THREE.Vector3(x, 0.005, z),
            size: new THREE.Vector3(gridStep * 0.9, 0.01, gridStep * 0.9),
          });
        } else if (minDist < passageMinM && minDist > 0.1) {
          problemAreas.push({
            type: 'problem',
            position: new THREE.Vector3(x, 0.005, z),
            size: new THREE.Vector3(gridStep * 0.9, 0.01, gridStep * 0.9),
          });
        }
      }
    }

    // Chercher le meilleur emplacement pour le cercle de rotation
    const turningRadiusM = this.config.turningCircleDiameter / 2000;
    let bestTurningPos: THREE.Vector3 | null = null;
    let bestTurningClearance = 0;

    for (let x = turningRadiusM + 0.1; x < roomWidthM - turningRadiusM - 0.1; x += 0.3) {
      for (let z = turningRadiusM + 0.1; z < roomDepthM - turningRadiusM - 0.1; z += 0.3) {
        const testPos = new THREE.Vector3(x, 0, z);
        const minDist = this.getMinDistanceToFurniture(testPos, items);
        if (minDist > bestTurningClearance) {
          bestTurningClearance = minDist;
          bestTurningPos = testPos.clone();
        }
      }
    }

    if (bestTurningPos) {
      const canFit = bestTurningClearance >= turningRadiusM;
      turningCircles.push({
        type: 'turning_circle',
        position: new THREE.Vector3(bestTurningPos.x, 0.003, bestTurningPos.z),
        size: new THREE.Vector3(
          this.config.turningCircleDiameter / 1000,
          0.01,
          this.config.turningCircleDiameter / 1000
        ),
      });

      if (!canFit) {
        problemAreas.push({
          type: 'problem',
          position: new THREE.Vector3(bestTurningPos.x, 0.006, bestTurningPos.z),
          size: new THREE.Vector3(
            this.config.turningCircleDiameter / 1000,
            0.01,
            this.config.turningCircleDiameter / 1000
          ),
        });
      }
    }

    // Zones de hauteur accessible sur les murs (400-1300mm)
    const wallPositions = [
      {
        pos: new THREE.Vector3(roomWidthM / 2, 0, 0),
        size: new THREE.Vector3(roomWidthM, 1, 0.02),
        rot: 0,
      },
      {
        pos: new THREE.Vector3(roomWidthM / 2, 0, roomDepthM),
        size: new THREE.Vector3(roomWidthM, 1, 0.02),
        rot: 0,
      },
      {
        pos: new THREE.Vector3(0, 0, roomDepthM / 2),
        size: new THREE.Vector3(0.02, 1, roomDepthM),
        rot: 0,
      },
      {
        pos: new THREE.Vector3(roomWidthM, 0, roomDepthM / 2),
        size: new THREE.Vector3(0.02, 1, roomDepthM),
        rot: 0,
      },
    ];

    for (const wall of wallPositions) {
      const zoneHeight = (this.config.maxReachHeight - this.config.minReachHeight) / 1000;
      const zoneCenter = (this.config.minReachHeight + this.config.maxReachHeight) / 2 / 1000;
      reachZones.push({
        type: 'reach_zone',
        position: new THREE.Vector3(wall.pos.x, zoneCenter, wall.pos.z),
        size: new THREE.Vector3(wall.size.x, zoneHeight, wall.size.z),
        rotation: wall.rot,
      });
    }

    return { accessibleZones, problemAreas, turningCircles, reachZones };
  }

  // --- Regles individuelles ---

  private checkPassageWidths(
    items: PlacedItem3D[],
    room: RoomConfig,
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const furniture = items.filter(
      (i) => !['wall', 'floor', 'ceiling', 'cooktop', 'hood'].includes(i.type)
    );

    const minPassageM = this.config.minPassageWidth / 1000;

    // Verifier entre meubles en face-a-face
    for (let i = 0; i < furniture.length; i++) {
      for (let j = i + 1; j < furniture.length; j++) {
        const a = furniture[i]!;
        const b = furniture[j]!;

        const dist = a.position.distanceTo(b.position);
        const gapEstimate = dist - (a.dimensions.depth / 2 + b.dimensions.depth / 2);

        if (gapEstimate > 0 && gapEstimate < minPassageM) {
          violations.push({
            id: `acc-${startId + violations.length}`,
            ruleId: 'R1',
            severity: gapEstimate < 0.7 ? 'critical' : 'major',
            message: `Passage trop etroit entre elements (${Math.round(gapEstimate * 1000)} mm)`,
            detail: `La norme PMR exige un passage minimum de ${this.config.minPassageWidth} mm pour un fauteuil roulant.`,
            affectedObjectIds: [a.id, b.id],
            fix: `Eloignez ces deux elements pour obtenir au moins ${this.config.minPassageWidth} mm de passage libre.`,
          });
        }
      }
    }

    // Verifier distance meubles-murs
    for (const item of furniture) {
      const distToWalls = [
        item.position.x - item.dimensions.width / 2,
        room.width - (item.position.x + item.dimensions.width / 2),
        item.position.z - item.dimensions.depth / 2,
        room.depth - (item.position.z + item.dimensions.depth / 2),
      ];

      for (const d of distToWalls) {
        if (d > 0.1 && d < minPassageM) {
          violations.push({
            id: `acc-${startId + violations.length}`,
            ruleId: 'R1',
            severity: 'major',
            message: `Passage trop etroit entre meuble et mur (${Math.round(d * 1000)} mm)`,
            detail: `Minimum ${this.config.minPassageWidth} mm requis pour l'accessibilite PMR.`,
            affectedObjectIds: [item.id],
            fix: `Deplacez le meuble pour liberer au moins ${this.config.minPassageWidth} mm.`,
          });
          break;
        }
      }
    }
  }

  private checkTurningCircle(
    items: PlacedItem3D[],
    room: RoomConfig,
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const turningRadiusM = this.config.turningCircleDiameter / 2000;
    const furniture = items.filter(
      (i) => !['wall', 'floor', 'ceiling', 'cooktop', 'hood'].includes(i.type)
    );

    // Tester sur une grille si un cercle 1500mm rentre quelque part
    let canFit = false;
    const step = 0.2;

    for (let x = turningRadiusM; x <= room.width - turningRadiusM && !canFit; x += step) {
      for (let z = turningRadiusM; z <= room.depth - turningRadiusM && !canFit; z += step) {
        const center = new THREE.Vector3(x, 0, z);
        const minDist = this.getMinDistanceToFurniture(center, furniture);
        if (minDist >= turningRadiusM) {
          canFit = true;
        }
      }
    }

    if (!canFit) {
      violations.push({
        id: `acc-${startId + violations.length}`,
        ruleId: 'R2',
        severity: 'critical',
        message: `Aucun espace pour un cercle de rotation de ${this.config.turningCircleDiameter} mm`,
        detail: `La norme PMR exige un espace libre circulaire de ${this.config.turningCircleDiameter} mm de diametre pour la manoeuvre d'un fauteuil roulant.`,
        fix: `Reorganisez les meubles pour liberer un espace circulaire de ${this.config.turningCircleDiameter} mm de diametre.`,
      });
    }
  }

  private checkWorktopHeight(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const baseItems = items.filter((i) =>
      ['base_cabinet', 'base', 'sink', 'sink_base'].includes(i.type)
    );

    for (const item of baseItems) {
      const heightMm = Math.round(item.dimensions.height * 1000);

      if (heightMm < this.config.worktopHeightMin || heightMm > this.config.worktopHeightMax) {
        violations.push({
          id: `acc-${startId + violations.length}`,
          ruleId: 'R3',
          severity: 'major',
          message: `Hauteur PDT non conforme PMR (${heightMm} mm)`,
          detail: `La norme PMR recommande une hauteur de plan de travail entre ${this.config.worktopHeightMin} et ${this.config.worktopHeightMax} mm.`,
          affectedObjectIds: [item.id],
          fix: `Ajustez la hauteur du plan de travail entre ${this.config.worktopHeightMin} et ${this.config.worktopHeightMax} mm.`,
        });
      }
    }
  }

  private checkBaseDrawers(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const baseCabinets = items.filter((i) => ['base_cabinet', 'base'].includes(i.type));

    // En mode PMR, tous les meubles bas doivent etre a tiroirs
    for (const item of baseCabinets) {
      const hasDrawers =
        item.type.includes('drawer') || (item as { hasDrawers?: boolean }).hasDrawers;
      if (!hasDrawers) {
        violations.push({
          id: `acc-${startId + violations.length}`,
          ruleId: 'R4',
          severity: 'minor',
          message: `Meuble bas sans tiroirs`,
          detail: `Pour l'accessibilite PMR, privilegiez les tiroirs aux portes battantes pour un acces facilite en fauteuil roulant.`,
          affectedObjectIds: [item.id],
          fix: `Remplacez les portes de ce meuble par des tiroirs coulissants.`,
        });
      }
    }
  }

  private checkHandleType(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const furniture = items.filter((i) =>
      ['base_cabinet', 'base', 'wall_cabinet', 'wall', 'tall_cabinet', 'tall'].includes(i.type)
    );

    // Info generale — les boutons ronds sont deconseilles
    if (furniture.length > 0) {
      violations.push({
        id: `acc-${startId + violations.length}`,
        ruleId: 'R5',
        severity: 'minor',
        message: `Verifiez le type de poignees`,
        detail: `La norme PMR recommande des poignees en D ou en barre. Les boutons ronds sont deconseilles car difficiles a saisir.`,
        fix: `Choisissez des poignees en D ou en barre pour tous les meubles.`,
      });
    }
  }

  private checkSinkAccessibility(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const sinks = items.filter((i) => ['sink', 'sink_base'].includes(i.type));

    for (const sink of sinks) {
      // Profondeur evier — max 150mm recommande
      violations.push({
        id: `acc-${startId + violations.length}`,
        ruleId: 'R6',
        severity: 'minor',
        message: `Verifiez la profondeur de l'evier`,
        detail: `Pour l'accessibilite PMR, l'evier ne doit pas depasser 150 mm de profondeur, avec un mitigeur a levier unique.`,
        affectedObjectIds: [sink.id],
        fix: `Choisissez un evier peu profond (max 150 mm) avec mitigeur a levier.`,
      });
    }
  }

  private checkCooktopSafety(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const cooktops = items.filter((i) => ['cooktop', 'stove', 'hob'].includes(i.type));

    for (const cooktop of cooktops) {
      // Recommandation plaque induction pour securite PMR
      const isInduction =
        cooktop.type === 'induction' || (cooktop as { subtype?: string }).subtype === 'induction';

      if (!isInduction) {
        violations.push({
          id: `acc-${startId + violations.length}`,
          ruleId: 'R7',
          severity: 'major',
          message: `Plaque non-induction detectee`,
          detail: `Pour la securite PMR, une plaque a induction est fortement recommandee : pas de flamme, surface froide, arret automatique.`,
          affectedObjectIds: [cooktop.id],
          fix: `Remplacez la plaque par une plaque a induction pour la securite.`,
        });
      }
    }
  }

  private checkControlsHeight(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    // Verifier que les appareils avec commandes sont dans la zone 400-1300mm
    const appliances = items.filter((i) =>
      ['dishwasher', 'oven', 'refrigerator', 'fridge', 'fridge_freezer', 'microwave'].includes(
        i.type
      )
    );

    for (const item of appliances) {
      const topMm = Math.round((item.position.y + item.dimensions.height) * 1000);
      const bottomMm = Math.round(item.position.y * 1000);

      // Les commandes sont generalement en haut de l'appareil
      if (topMm > this.config.maxReachHeight) {
        violations.push({
          id: `acc-${startId + violations.length}`,
          ruleId: 'R8',
          severity: 'major',
          message: `Commandes hors zone accessible (${topMm} mm)`,
          detail: `Les commandes doivent etre entre ${this.config.minReachHeight} et ${this.config.maxReachHeight} mm de hauteur.`,
          affectedObjectIds: [item.id],
          fix: `Repositionnez l'appareil pour que ses commandes soient entre ${this.config.minReachHeight} et ${this.config.maxReachHeight} mm.`,
        });
      }

      if (bottomMm < this.config.minReachHeight && item.type === 'oven') {
        violations.push({
          id: `acc-${startId + violations.length}`,
          ruleId: 'R8',
          severity: 'major',
          message: `Four trop bas (${bottomMm} mm)`,
          detail: `Un four en hauteur (colonne) est recommande pour l'accessibilite PMR, entre ${this.config.minReachHeight} et ${this.config.maxReachHeight} mm.`,
          affectedObjectIds: [item.id],
          fix: `Installez le four dans une colonne a hauteur accessible (${this.config.minReachHeight}-${this.config.maxReachHeight} mm).`,
        });
      }
    }
  }

  private checkWallCabinetHeight(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    const wallCabinets = items.filter((i) =>
      ['wall_cabinet', 'wall', 'upper', 'upper_cabinet'].includes(i.type)
    );

    for (const item of wallCabinets) {
      const topMm = Math.round((item.position.y + item.dimensions.height) * 1000);

      if (topMm > this.config.maxWallCabinetTop) {
        violations.push({
          id: `acc-${startId + violations.length}`,
          ruleId: 'R9',
          severity: 'major',
          message: `Meuble haut trop eleve (haut a ${topMm} mm)`,
          detail: `Pour l'accessibilite PMR, le haut des meubles hauts ne doit pas depasser ${this.config.maxWallCabinetTop} mm.`,
          affectedObjectIds: [item.id],
          fix: `Abaissez le meuble haut pour que le dessus ne depasse pas ${this.config.maxWallCabinetTop} mm, ou remplacez par des rangements bas.`,
        });
      }
    }
  }

  private checkKneeSpace(
    items: PlacedItem3D[],
    violations: AccessibilityViolation[],
    startId: number
  ): void {
    // Verifier qu'au moins un segment de PDT offre un espace libre pour les genoux
    const baseItems = items.filter((i) =>
      ['base_cabinet', 'base', 'sink', 'sink_base'].includes(i.type)
    );

    if (baseItems.length === 0) return;

    // Calcul simplifie: verifier s'il y a un espace de 700mm libre sous au moins un PDT
    const hasKneeSpace = baseItems.some((item) => {
      // Un meuble bas avec userData indiquant espace libre sous PDT
      return (item as { kneeSpace?: boolean }).kneeSpace === true;
    });

    if (!hasKneeSpace && baseItems.length > 0) {
      violations.push({
        id: `acc-${startId + violations.length}`,
        ruleId: 'R10',
        severity: 'major',
        message: `Pas d'espace libre sous le plan de travail`,
        detail: `La norme PMR exige au moins un segment de plan de travail avec un espace libre en dessous (min 700 mm de large, 700 mm de haut) pour permettre l'approche en fauteuil roulant.`,
        fix: `Prevoyez au moins un segment de plan de travail sans meuble en dessous (min 700x700 mm d'espace libre).`,
      });
    }
  }

  // --- Scoring ---

  private scoreClearances(items: PlacedItem3D[], room: RoomConfig): number {
    let score = 100;
    const furniture = items.filter(
      (i) => !['wall', 'floor', 'ceiling', 'cooktop', 'hood'].includes(i.type)
    );

    const minPassageM = this.config.minPassageWidth / 1000;
    const turningRadiusM = this.config.turningCircleDiameter / 2000;
    let narrowPassages = 0;

    // Passages entre meubles
    for (let i = 0; i < furniture.length; i++) {
      for (let j = i + 1; j < furniture.length; j++) {
        const a = furniture[i]!;
        const b = furniture[j]!;
        const dist = a.position.distanceTo(b.position);
        const gap = dist - (a.dimensions.depth / 2 + b.dimensions.depth / 2);
        if (gap > 0 && gap < minPassageM) {
          narrowPassages++;
          score -= gap < 0.7 ? 15 : 8;
        }
      }
    }

    // Cercle de rotation
    let canFitTurning = false;
    for (let x = turningRadiusM; x <= room.width - turningRadiusM; x += 0.3) {
      for (let z = turningRadiusM; z <= room.depth - turningRadiusM; z += 0.3) {
        const center = new THREE.Vector3(x, 0, z);
        if (this.getMinDistanceToFurniture(center, furniture) >= turningRadiusM) {
          canFitTurning = true;
          break;
        }
      }
      if (canFitTurning) break;
    }

    if (!canFitTurning) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  private scoreHeights(items: PlacedItem3D[]): number {
    let score = 100;

    // PDT height
    const baseItems = items.filter((i) =>
      ['base_cabinet', 'base', 'sink', 'sink_base'].includes(i.type)
    );

    for (const item of baseItems) {
      const hMm = item.dimensions.height * 1000;
      if (hMm < this.config.worktopHeightMin || hMm > this.config.worktopHeightMax) {
        score -= 10;
      }
    }

    // Wall cabinet top height
    const wallCabinets = items.filter((i) =>
      ['wall_cabinet', 'wall', 'upper', 'upper_cabinet'].includes(i.type)
    );

    for (const item of wallCabinets) {
      const topMm = (item.position.y + item.dimensions.height) * 1000;
      if (topMm > this.config.maxWallCabinetTop) {
        score -= 12;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private scoreReachability(items: PlacedItem3D[]): number {
    let score = 80; // Base score

    // Appliances controls in reach zone
    const appliances = items.filter((i) =>
      ['dishwasher', 'oven', 'refrigerator', 'fridge', 'fridge_freezer', 'microwave'].includes(
        i.type
      )
    );

    for (const item of appliances) {
      const topMm = (item.position.y + item.dimensions.height) * 1000;
      if (topMm > this.config.maxReachHeight) score -= 10;
    }

    // Knee space bonus
    const baseItems = items.filter((i) =>
      ['base_cabinet', 'base', 'sink', 'sink_base'].includes(i.type)
    );

    const hasKneeSpace = baseItems.some(
      (item) => (item as { kneeSpace?: boolean }).kneeSpace === true
    );

    if (!hasKneeSpace && baseItems.length > 0) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private scoreSafety(items: PlacedItem3D[]): number {
    let score = 100;

    // Induction cooktop
    const cooktops = items.filter((i) => ['cooktop', 'stove', 'hob'].includes(i.type));

    for (const cooktop of cooktops) {
      const isInduction =
        cooktop.type === 'induction' || (cooktop as { subtype?: string }).subtype === 'induction';
      if (!isInduction) score -= 20;
    }

    // If no cooktop at all, neutral
    if (cooktops.length === 0) score = 80;

    return Math.max(0, Math.min(100, score));
  }

  // --- Utilitaires ---

  private getMinDistanceToFurniture(point: THREE.Vector3, items: PlacedItem3D[]): number {
    let minDist = Infinity;

    for (const item of items) {
      // Simplified AABB distance
      const halfW = item.dimensions.width / 2;
      const halfD = item.dimensions.depth / 2;

      const dx = Math.max(0, Math.abs(point.x - item.position.x) - halfW);
      const dz = Math.max(0, Math.abs(point.z - item.position.z) - halfD);
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist) minDist = dist;
    }

    return minDist;
  }
}
