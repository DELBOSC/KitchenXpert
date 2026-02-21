import * as THREE from 'three';
import type { PlacedItem3D, RoomConfig } from './ai-assistant';
import type { BrandProfile } from '../config/brand-profiles';
import { mmToM } from '../config/brand-profiles';

/**
 * Resultat de suggestion de position
 */
export interface SuggestedPosition {
  position: THREE.Vector3;
  rotation: number;
  wallId?: string;
  confidence: number; // 0-1
  reason: string;
}

/**
 * Resultat de validation de placement
 */
export interface PlacementValidation {
  valid: boolean;
  issues: string[];
}

/** Shape of a single placement rule entry */
interface PlacementRule {
  nearWall: boolean;
  preferredWalls: string[];
  minDistances: Record<string, number>;
  aboveFloor: number;
  requiresAbove?: string;
  requiresNear?: string;
}

/**
 * User biometric data for personalized ergonomic optimization
 */
export interface UserBiometrics {
  height: number; // cm, user's height
  dominantHand: 'left' | 'right';
  hasBackProblems: boolean;
  hasMobilityIssues: boolean;
  isWheelchairUser: boolean;
  householdHasChildren: boolean;
  householdHasElderly: boolean;
  primaryCookHeight?: number; // cm, height of primary cook if different
}

/**
 * Personalized recommendations based on user biometrics
 */
export interface PersonalizedRecommendations {
  heightAdjustments: Array<{
    element: string;
    currentHeight: number;
    recommendedHeight: number;
    reason: string;
  }>;
  layoutSuggestions: Array<{
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>;
  productRecommendations: Array<{
    category: string;
    feature: string;
    reason: string;
  }>;
  safetyWarnings: Array<{
    warning: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

/**
 * Placement intelligent avec regles ergonomiques
 */
export class SmartPlacement {
  private brandProfile: BrandProfile;

  constructor(brandProfile: BrandProfile) {
    this.brandProfile = brandProfile;
  }

  /**
   * Update the brand profile used for placement rules
   */
  updateBrandProfile(profile: BrandProfile): void {
    this.brandProfile = profile;
  }

  /**
   * Build placement rules dynamically from the current brand profile
   */
  private getPlacementRules(): Record<string, PlacementRule> {
    return {
      sink: {
        nearWall: true,
        preferredWalls: ['back', 'left'],
        minDistances: { cooktop: 0.4 },
        aboveFloor: 0,
        requiresNear: 'water',
      },
      sink_base: {
        nearWall: true,
        preferredWalls: ['back', 'left'],
        minDistances: { cooktop: 0.4 },
        aboveFloor: 0,
        requiresNear: 'water',
      },
      cooktop: {
        nearWall: true,
        preferredWalls: ['back'],
        minDistances: { sink: 0.4, window: 0.3 },
        aboveFloor: mmToM(this.brandProfile.base.totalHeight),
      },
      stove: {
        nearWall: true,
        preferredWalls: ['back'],
        minDistances: { sink: 0.4, window: 0.3 },
        aboveFloor: 0,
      },
      hood: {
        nearWall: true,
        preferredWalls: ['back'],
        minDistances: {},
        aboveFloor: mmToM(this.brandProfile.hood.aboveFloorY),
        requiresAbove: 'cooktop',
      },
      range_hood: {
        nearWall: true,
        preferredWalls: ['back'],
        minDistances: {},
        aboveFloor: mmToM(this.brandProfile.hood.aboveFloorY),
        requiresAbove: 'cooktop',
      },
      refrigerator: {
        nearWall: true,
        preferredWalls: ['left', 'right'],
        minDistances: { cooktop: 0.3 },
        aboveFloor: 0,
      },
      fridge: {
        nearWall: true,
        preferredWalls: ['left', 'right'],
        minDistances: { cooktop: 0.3 },
        aboveFloor: 0,
      },
      dishwasher: {
        nearWall: true,
        preferredWalls: ['back', 'left'],
        minDistances: {},
        aboveFloor: 0,
        requiresNear: 'sink',
      },
      base_cabinet: {
        nearWall: true,
        preferredWalls: ['back', 'left', 'right'],
        minDistances: {},
        aboveFloor: 0,
      },
      base: {
        nearWall: true,
        preferredWalls: ['back', 'left', 'right'],
        minDistances: {},
        aboveFloor: 0,
      },
      wall_cabinet: {
        nearWall: true,
        preferredWalls: ['back', 'left', 'right'],
        minDistances: {},
        aboveFloor: mmToM(this.brandProfile.wall.bottomY),
      },
      tall_cabinet: {
        nearWall: true,
        preferredWalls: ['left', 'right'],
        minDistances: {},
        aboveFloor: 0,
      },
    };
  }
  /**
   * Suggere une position optimale pour un type d'element
   */
  suggestPosition(
    type: string,
    dimensions: { width: number; height: number; depth: number },
    existingItems: PlacedItem3D[],
    room: RoomConfig
  ): SuggestedPosition {
    const allRules = this.getPlacementRules();
    const rules = allRules[type] || allRules['base_cabinet']!;

    // Si l'element doit etre au-dessus d'un autre
    if (rules.requiresAbove) {
      const belowItem = existingItems.find((i) =>
        i.type === rules.requiresAbove ||
        i.type.includes(rules.requiresAbove!)
      );
      if (belowItem) {
        return {
          position: new THREE.Vector3(
            belowItem.position.x,
            rules.aboveFloor,
            belowItem.position.z
          ),
          rotation: 0,
          confidence: 0.95,
          reason: `Placé au-dessus de ${belowItem.type}`,
        };
      }
    }

    // Si l'element doit etre pres d'un autre
    if (rules.requiresNear === 'sink') {
      const sink = existingItems.find((i) =>
        i.type === 'sink' || i.type === 'sink_base'
      );
      if (sink) {
        const offset = sink.dimensions.width / 2 + dimensions.width / 2 + 0.02;
        return {
          position: new THREE.Vector3(
            sink.position.x + offset,
            rules.aboveFloor,
            sink.position.z
          ),
          rotation: 0,
          confidence: 0.85,
          reason: 'Placé à côté de l\'évier',
        };
      }
    }

    // Trouver un emplacement libre le long d'un mur
    const wallPositions = this.findWallPositions(room, rules.preferredWalls);

    for (const wallPos of wallPositions) {
      const candidatePos = new THREE.Vector3(
        wallPos.x,
        rules.aboveFloor,
        wallPos.z
      );

      // Verifier qu'il n'y a pas de collision
      const hasCollision = existingItems.some((existing) => {
        const dist = Math.abs(candidatePos.x - existing.position.x);
        const minDist = (existing.dimensions.width + dimensions.width) / 2;
        const sameZ = Math.abs(candidatePos.z - existing.position.z) < 0.3;
        return sameZ && dist < minDist;
      });

      if (!hasCollision) {
        // Verifier les distances minimales
        let valid = true;
        for (const [nearType, minDist] of Object.entries(rules.minDistances)) {
          const nearItem = existingItems.find((i) => i.type.includes(nearType));
          if (nearItem) {
            const dist = candidatePos.distanceTo(nearItem.position);
            if (dist < minDist) {
              valid = false;
              break;
            }
          }
        }

        if (valid) {
          return {
            position: candidatePos,
            rotation: wallPos.rotation,
            wallId: wallPos.wallId,
            confidence: 0.75,
            reason: `Placé le long du mur ${wallPos.wallId}`,
          };
        }
      }
    }

    // Fallback : centre de la piece
    return {
      position: new THREE.Vector3(room.width / 2, rules.aboveFloor, room.depth / 2),
      rotation: 0,
      confidence: 0.3,
      reason: 'Position par défaut (aucun emplacement optimal trouvé)',
    };
  }

  /**
   * Valide un placement
   */
  validatePlacement(
    type: string,
    position: THREE.Vector3,
    dimensions: { width: number; height: number; depth: number },
    existingItems: PlacedItem3D[],
    room: RoomConfig
  ): PlacementValidation {
    const issues: string[] = [];
    const rules = this.getPlacementRules()[type];

    // Bounds check
    if (position.x < 0 || position.x > room.width ||
        position.z < 0 || position.z > room.depth) {
      issues.push('Élément en dehors de la pièce');
    }

    // Collision check
    for (const existing of existingItems) {
      const dx = Math.abs(position.x - existing.position.x);
      const dz = Math.abs(position.z - existing.position.z);
      const minDx = (existing.dimensions.width + dimensions.width) / 2;
      const minDz = (existing.dimensions.depth + dimensions.depth) / 2;

      if (dx < minDx && dz < minDz && Math.abs(position.y - existing.position.y) < 0.1) {
        issues.push(`Chevauchement avec ${existing.type}`);
      }
    }

    // Min distance checks
    if (rules) {
      for (const [nearType, minDist] of Object.entries(rules.minDistances)) {
        const nearItem = existingItems.find((i) => i.type.includes(nearType));
        if (nearItem) {
          const dist = position.distanceTo(nearItem.position);
          if (dist < minDist) {
            issues.push(`Trop proche de ${nearType} (${Math.round(dist * 1000)} mm, min ${Math.round(minDist * 1000)} mm)`);
          }
        }
      }
    }

    // Passage check (90cm minimum)
    const passage = Math.min(
      position.z - dimensions.depth / 2,
      room.depth - position.z - dimensions.depth / 2
    );
    if (passage < 0.9 && passage > 0) {
      issues.push(`Passage insuffisant (${Math.round(passage * 1000)} mm, min 900 mm)`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Apply personalized ergonomic rules based on user biometrics.
   * Returns height adjustments, layout suggestions, product recommendations,
   * and safety warnings tailored to the user's physical characteristics
   * and household composition.
   */
  applyPersonalizedRules(biometrics: UserBiometrics): PersonalizedRecommendations {
    const heightAdjustments: PersonalizedRecommendations['heightAdjustments'] = [];
    const layoutSuggestions: PersonalizedRecommendations['layoutSuggestions'] = [];
    const productRecommendations: PersonalizedRecommendations['productRecommendations'] = [];
    const safetyWarnings: PersonalizedRecommendations['safetyWarnings'] = [];

    const effectiveHeight = biometrics.primaryCookHeight ?? biometrics.height;

    // Standard reference heights (mm)
    const standardBaseCabinetHeight = this.brandProfile.base.totalHeight;
    const standardWallCabinetBottomY = this.brandProfile.wall.bottomY;
    const standardHoodAboveCooktop = this.brandProfile.hood.heightAboveCooktop;

    // --- Height < 160cm: lower wall cabinets, pull-down shelves, lower hood ---
    if (effectiveHeight < 160) {
      const wallCabinetAdjustment = -50; // lower by 5cm (50mm)
      heightAdjustments.push({
        element: 'wall_cabinet',
        currentHeight: standardWallCabinetBottomY,
        recommendedHeight: standardWallCabinetBottomY + wallCabinetAdjustment,
        reason: `User height (${effectiveHeight} cm) is below 160 cm — lowering wall cabinets by 5 cm for easier reach`,
      });

      productRecommendations.push({
        category: 'wall_cabinet',
        feature: 'pull-down shelves',
        reason: `Pull-down shelf mechanisms recommended for user height of ${effectiveHeight} cm to access upper storage safely`,
      });

      const hoodRecommendedAboveCooktop = 550; // 55cm above cooktop
      heightAdjustments.push({
        element: 'hood',
        currentHeight: standardHoodAboveCooktop,
        recommendedHeight: hoodRecommendedAboveCooktop,
        reason: `Lowering cooktop hood to 55 cm above cooktop for better extraction efficiency at user height of ${effectiveHeight} cm`,
      });
    }

    // --- Height > 185cm: raise base cabinets and wall cabinets ---
    if (effectiveHeight > 185) {
      const plinthIncrease = 50; // raise by 5cm (50mm)
      heightAdjustments.push({
        element: 'base_cabinet',
        currentHeight: standardBaseCabinetHeight,
        recommendedHeight: standardBaseCabinetHeight + plinthIncrease,
        reason: `User height (${effectiveHeight} cm) is above 185 cm — raising base cabinets by 5 cm (higher plinth) to reduce back strain`,
      });

      heightAdjustments.push({
        element: 'wall_cabinet',
        currentHeight: standardWallCabinetBottomY,
        recommendedHeight: standardWallCabinetBottomY + plinthIncrease,
        reason: `User height (${effectiveHeight} cm) is above 185 cm — raising wall cabinets by 5 cm for proportional layout`,
      });
    }

    // --- Left-handed: mirror work triangle ---
    if (biometrics.dominantHand === 'left') {
      layoutSuggestions.push({
        suggestion: 'Mirror the work triangle: place fridge on the right side, sink in the center, and cooktop on the left for a right-to-left workflow',
        priority: 'high',
        reason: 'Left-handed users work more efficiently with a right-to-left flow (fridge → sink → cooktop)',
      });

      layoutSuggestions.push({
        suggestion: 'Position primary prep area to the left of the sink for dominant-hand cutting and preparation',
        priority: 'medium',
        reason: 'Left-handed users benefit from prep space on their dominant side',
      });
    }

    // --- Back problems: raise base cabinets, avoid low drawers ---
    if (biometrics.hasBackProblems) {
      const backRaise = biometrics.hasBackProblems && effectiveHeight > 175 ? 100 : 50; // 5-10cm
      heightAdjustments.push({
        element: 'base_cabinet',
        currentHeight: standardBaseCabinetHeight,
        recommendedHeight: standardBaseCabinetHeight + backRaise,
        reason: `User has back problems — raising base cabinet height by ${backRaise / 10} cm to reduce bending`,
      });

      layoutSuggestions.push({
        suggestion: 'Avoid low drawers in base cabinets; prefer pull-out shelves at waist height (700-900 mm)',
        priority: 'high',
        reason: 'Reducing bending motions for users with back problems',
      });

      productRecommendations.push({
        category: 'base_cabinet',
        feature: 'pull-out shelves at waist height',
        reason: 'Pull-out mechanisms at waist height eliminate deep bending and reduce back strain',
      });

      productRecommendations.push({
        category: 'dishwasher',
        feature: 'raised dishwasher installation (400-500 mm above floor)',
        reason: 'A raised dishwasher reduces bending when loading and unloading',
      });
    }

    // --- Wheelchair user: apply PMR rules ---
    if (biometrics.isWheelchairUser) {
      heightAdjustments.push({
        element: 'base_cabinet',
        currentHeight: standardBaseCabinetHeight,
        recommendedHeight: 750,
        reason: 'Wheelchair user — lowering all worktops to 750 mm (PMR standard: 750-800 mm)',
      });

      layoutSuggestions.push({
        suggestion: 'Ensure knee space (min 700 mm wide, 700 mm high, 600 mm deep) under the sink for wheelchair approach',
        priority: 'high',
        reason: 'PMR accessibility requires clear knee space under at least one worktop section and the sink',
      });

      layoutSuggestions.push({
        suggestion: 'Ensure minimum 900 mm passage width between all elements and a 1500 mm turning circle',
        priority: 'high',
        reason: 'Wheelchair maneuvering requires wider passages and a rotation area',
      });

      productRecommendations.push({
        category: 'cooktop',
        feature: 'induction cooktop with front-mounted controls',
        reason: 'Induction is safer for wheelchair users (no flame, surface stays cool) and front controls avoid reaching over hot surfaces',
      });

      productRecommendations.push({
        category: 'sink',
        feature: 'shallow sink (max 150 mm depth) with lever faucet',
        reason: 'Shallow sink with lever faucet for wheelchair-accessible use',
      });

      safetyWarnings.push({
        warning: 'Wheelchair user detected — all placements should be verified against PMR accessibility standards (NF P 99-611)',
        severity: 'critical',
      });
    }

    // --- Children in household ---
    if (biometrics.householdHasChildren) {
      productRecommendations.push({
        category: 'base_cabinet',
        feature: 'child-lock mechanisms on drawers near cooktop',
        reason: 'Prevent children from accessing dangerous items (knives, cleaning products) near cooking area',
      });

      layoutSuggestions.push({
        suggestion: 'Store knives and chemical/cleaning products in high wall cabinets out of children\'s reach',
        priority: 'high',
        reason: 'Child safety requires hazardous items to be stored above 1200 mm',
      });

      layoutSuggestions.push({
        suggestion: 'Avoid placing the oven at low level (floor-mounted); prefer a raised column oven installation',
        priority: 'high',
        reason: 'A low oven door is a burn hazard for children — raised installation keeps hot surfaces out of reach',
      });

      safetyWarnings.push({
        warning: 'Household includes children — ensure cooktop has child-lock feature and oven is not installed at child-accessible height',
        severity: 'critical',
      });

      safetyWarnings.push({
        warning: 'Keep all cleaning products and sharp utensils in locked or high cabinets',
        severity: 'warning',
      });
    }

    // --- Elderly in household ---
    if (biometrics.householdHasElderly) {
      productRecommendations.push({
        category: 'flooring',
        feature: 'non-slip flooring surface (R10 or higher rating)',
        reason: 'Slip prevention is critical for elderly household members',
      });

      productRecommendations.push({
        category: 'cabinet_hardware',
        feature: 'D-handle pulls (easier grip than knobs)',
        reason: 'D-handles are easier to grip for users with reduced hand strength or arthritis',
      });

      productRecommendations.push({
        category: 'faucet',
        feature: 'lever-style faucet (single lever operation)',
        reason: 'Lever faucets require less grip strength and fine motor control than twist-type faucets',
      });

      productRecommendations.push({
        category: 'lighting',
        feature: 'task lighting at all work areas (under-cabinet LED strips)',
        reason: 'Elderly users benefit from increased task lighting to compensate for reduced vision',
      });

      layoutSuggestions.push({
        suggestion: 'Install adequate task lighting under all wall cabinets and above the cooktop',
        priority: 'high',
        reason: 'Elderly household members need well-lit work surfaces to reduce accident risk',
      });

      safetyWarnings.push({
        warning: 'Elderly household member — ensure good lighting at all work zones and non-slip flooring',
        severity: 'warning',
      });
    }

    // --- Mobility issues (not wheelchair but limited mobility) ---
    if (biometrics.hasMobilityIssues && !biometrics.isWheelchairUser) {
      layoutSuggestions.push({
        suggestion: 'Minimize the work triangle perimeter to reduce walking distance between fridge, sink, and cooktop',
        priority: 'high',
        reason: 'Reduced mobility requires shorter walking distances during cooking workflows',
      });

      productRecommendations.push({
        category: 'base_cabinet',
        feature: 'soft-close full-extension drawers',
        reason: 'Full-extension drawers with soft-close reduce effort and allow full access without deep reaching',
      });

      productRecommendations.push({
        category: 'oven',
        feature: 'side-opening oven door',
        reason: 'Side-opening oven doors are easier to use for people with limited mobility than traditional drop-down doors',
      });
    }

    return {
      heightAdjustments,
      layoutSuggestions,
      productRecommendations,
      safetyWarnings,
    };
  }

  /**
   * Trouve les positions disponibles le long des murs
   */
  private findWallPositions(
    room: RoomConfig,
    preferredWalls: string[]
  ): Array<{ x: number; z: number; rotation: number; wallId: string }> {
    const positions: Array<{ x: number; z: number; rotation: number; wallId: string }> = [];
    const step = 0.6; // 60cm spacing

    // Back wall (z = 0)
    if (preferredWalls.includes('back')) {
      for (let x = 0.3; x < room.width - 0.3; x += step) {
        positions.push({ x, z: 0.3, rotation: 0, wallId: 'back' });
      }
    }

    // Left wall (x = 0)
    if (preferredWalls.includes('left')) {
      for (let z = 0.3; z < room.depth - 0.3; z += step) {
        positions.push({ x: 0.3, z, rotation: Math.PI / 2, wallId: 'left' });
      }
    }

    // Right wall (x = width)
    if (preferredWalls.includes('right')) {
      for (let z = 0.3; z < room.depth - 0.3; z += step) {
        positions.push({ x: room.width - 0.3, z, rotation: -Math.PI / 2, wallId: 'right' });
      }
    }

    return positions;
  }
}
