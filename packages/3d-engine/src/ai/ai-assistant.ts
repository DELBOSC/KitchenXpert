import * as THREE from 'three';
import type { BrandProfile } from '../config/brand-profiles';
import { mmToM } from '../config/brand-profiles';
import { generateId } from '../utils/generate-id';

/**
 * Resultat du triangle de travail
 */
export interface WorkTriangleResult {
  sink: THREE.Vector3 | null;
  cooktop: THREE.Vector3 | null;
  fridge: THREE.Vector3 | null;
  perimeter: number;
  legs: {
    sinkToCooktop: number;
    cooktopToFridge: number;
    fridgeToSink: number;
  };
  isOptimal: boolean;
  score: number;
}

/**
 * Score de configuration
 */
export interface ConfigurationScore {
  overall: number;
  ergonomics: number;
  storage: number;
  aesthetics: number;
  budgetEfficiency: number;
  spaceUtilization: number;
}

/**
 * Suggestion IA
 */
export interface Suggestion {
  id: string;
  type: 'warning' | 'info' | 'improvement';
  category: 'ergonomics' | 'storage' | 'space' | 'budget' | 'safety';
  message: string;
  detail?: string;
  priority: number; // 1 = haute, 5 = basse
  affectedObjectIds?: string[];
}

/**
 * Item place dans la scene (simplifie pour calculs IA)
 */
export interface PlacedItem3D {
  id: string;
  type: string;
  position: THREE.Vector3;
  rotation: number;
  dimensions: { width: number; height: number; depth: number };
  productId?: string;
  price?: number;
}

/**
 * Configuration de la piece
 */
export interface RoomConfig {
  width: number;  // metres
  depth: number;  // metres
  height: number; // metres
  walls: THREE.Object3D[];
}

/**
 * Resultat de l'auto-completion IA
 */
export interface AutoCompleteResult {
  addedItems: PlacedItem3D[];
  score: ConfigurationScore;
  message: string;
}

// Standards ergonomiques (provenant du generator-service)
const ERGONOMIC = {
  workTriangle: {
    minPerimeter: 3.6,  // 360cm en metres
    maxPerimeter: 6.6,
    idealPerimeter: 5.1,
    minLeg: 1.2,
    maxLeg: 2.7,
  },
  clearances: {
    minPassage: 0.9,
    comfortablePassage: 1.2,
    applianceFront: 0.9,
  },
  distances: {
    cooktopToSinkMin: 0.4,
    cooktopToSinkMax: 1.2,
    cooktopToWall: 0.3,
    hoodHeight: 0.65,
  },
};

/**
 * Assistant IA pour le designer 3D
 * Calcul du score, suggestions, validation ergonomique
 */
export class AIAssistant {
  private brandProfile: BrandProfile;

  constructor(brandProfile: BrandProfile) {
    this.brandProfile = brandProfile;
  }

  updateBrandProfile(profile: BrandProfile): void {
    this.brandProfile = profile;
  }

  /**
   * Calcule le triangle de travail
   */
  calculateWorkTriangle(items: PlacedItem3D[]): WorkTriangleResult {
    const sink = items.find((i) => i.type === 'sink' || i.type === 'sink_base');
    const cooktop = items.find((i) => ['cooktop', 'stove', 'hob'].includes(i.type));
    const fridge = items.find((i) => ['refrigerator', 'fridge', 'fridge_freezer'].includes(i.type));

    const nullResult: WorkTriangleResult = {
      sink: null, cooktop: null, fridge: null,
      perimeter: 0,
      legs: { sinkToCooktop: 0, cooktopToFridge: 0, fridgeToSink: 0 },
      isOptimal: false,
      score: 0,
    };

    if (!sink || !cooktop || !fridge) return nullResult;

    const sinkPos = sink.position;
    const cooktopPos = cooktop.position;
    const fridgePos = fridge.position;

    const sinkToCooktop = sinkPos.distanceTo(cooktopPos);
    const cooktopToFridge = cooktopPos.distanceTo(fridgePos);
    const fridgeToSink = fridgePos.distanceTo(sinkPos);
    const perimeter = sinkToCooktop + cooktopToFridge + fridgeToSink;

    const { minPerimeter, maxPerimeter, idealPerimeter, minLeg, maxLeg } = ERGONOMIC.workTriangle;

    let score = 100;

    // Perimeter score
    if (perimeter < minPerimeter) {
      score -= (minPerimeter - perimeter) / minPerimeter * 40;
    } else if (perimeter > maxPerimeter) {
      score -= (perimeter - maxPerimeter) / maxPerimeter * 40;
    } else {
      // Bonus for being close to ideal
      const deviation = Math.abs(perimeter - idealPerimeter) / idealPerimeter;
      score -= deviation * 20;
    }

    // Leg balance
    const legs = [sinkToCooktop, cooktopToFridge, fridgeToSink];
    for (const leg of legs) {
      if (leg < minLeg) score -= 10;
      if (leg > maxLeg) score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    return {
      sink: sinkPos.clone(),
      cooktop: cooktopPos.clone(),
      fridge: fridgePos.clone(),
      perimeter,
      legs: { sinkToCooktop, cooktopToFridge, fridgeToSink },
      isOptimal: perimeter >= minPerimeter && perimeter <= maxPerimeter,
      score,
    };
  }

  /**
   * Score la configuration courante
   */
  scoreConfiguration(items: PlacedItem3D[], room: RoomConfig): ConfigurationScore {
    const ergonomics = this.scoreErgonomics(items, room);
    const storage = this.scoreStorage(items, room);
    const aesthetics = this.scoreAesthetics(items);
    const budgetEfficiency = this.scoreBudget(items);
    const spaceUtilization = this.scoreSpace(items, room);

    // Poids : ergonomie 25%, rangement 20%, esthetique 15%, budget 25%, espace 15%
    const overall =
      ergonomics * 0.25 +
      storage * 0.20 +
      aesthetics * 0.15 +
      budgetEfficiency * 0.25 +
      spaceUtilization * 0.15;

    return {
      overall: Math.round(Math.max(0, Math.min(100, overall))),
      ergonomics: Math.round(ergonomics),
      storage: Math.round(storage),
      aesthetics: Math.round(aesthetics),
      budgetEfficiency: Math.round(budgetEfficiency),
      spaceUtilization: Math.round(spaceUtilization),
    };
  }

  /**
   * Genere les suggestions basees sur l'etat courant
   */
  getSuggestions(items: PlacedItem3D[], room: RoomConfig): Suggestion[] {
    const suggestions: Suggestion[] = [];
    let sugId = 0;

    // Triangle de travail
    const triangle = this.calculateWorkTriangle(items);
    if (triangle.perimeter > 0) {
      if (triangle.perimeter > ERGONOMIC.workTriangle.maxPerimeter) {
        suggestions.push({
          id: `sug-${sugId++}`,
          type: 'warning',
          category: 'ergonomics',
          message: `Triangle de travail trop grand (${Math.round(triangle.perimeter * 1000)} mm)`,
          detail: `Rapprochez l'évier, la plaque et le réfrigérateur. Maximum recommandé : ${Math.round(ERGONOMIC.workTriangle.maxPerimeter * 1000)} mm`,
          priority: 1,
        });
      }
      if (triangle.perimeter < ERGONOMIC.workTriangle.minPerimeter && triangle.perimeter > 0) {
        suggestions.push({
          id: `sug-${sugId++}`,
          type: 'warning',
          category: 'ergonomics',
          message: `Triangle de travail trop petit (${Math.round(triangle.perimeter * 1000)} mm)`,
          detail: `Éloignez les zones de travail. Minimum recommandé : ${Math.round(ERGONOMIC.workTriangle.minPerimeter * 1000)} mm`,
          priority: 1,
        });
      }
    }

    // Missing essential elements
    const hasSink = items.some((i) => i.type === 'sink' || i.type === 'sink_base');
    const hasCooktop = items.some((i) => ['cooktop', 'stove', 'hob'].includes(i.type));
    const hasFridge = items.some((i) => ['refrigerator', 'fridge', 'fridge_freezer'].includes(i.type));
    const hasHood = items.some((i) => ['hood', 'range_hood', 'extractor'].includes(i.type));

    if (!hasSink) {
      suggestions.push({
        id: `sug-${sugId++}`, type: 'warning', category: 'ergonomics',
        message: 'Évier manquant', detail: 'Un évier est essentiel pour une cuisine fonctionnelle.',
        priority: 1,
      });
    }

    if (!hasCooktop) {
      suggestions.push({
        id: `sug-${sugId++}`, type: 'warning', category: 'ergonomics',
        message: 'Plaque de cuisson manquante', priority: 1,
      });
    }

    if (!hasFridge) {
      suggestions.push({
        id: `sug-${sugId++}`, type: 'info', category: 'ergonomics',
        message: 'Réfrigérateur manquant', priority: 2,
      });
    }

    if (hasCooktop && !hasHood) {
      suggestions.push({
        id: `sug-${sugId++}`, type: 'warning', category: 'safety',
        message: 'Hotte aspirante manquante au-dessus de la plaque',
        detail: 'Une ventilation est recommandée pour la sécurité et le confort.',
        priority: 2,
      });
    }

    // Distance cooktop-sink
    if (hasSink && hasCooktop) {
      const sink = items.find((i) => i.type === 'sink' || i.type === 'sink_base')!;
      const cooktop = items.find((i) => ['cooktop', 'stove', 'hob'].includes(i.type))!;
      const dist = sink.position.distanceTo(cooktop.position);

      if (dist < ERGONOMIC.distances.cooktopToSinkMin) {
        suggestions.push({
          id: `sug-${sugId++}`, type: 'warning', category: 'safety',
          message: `Évier trop proche de la plaque (${Math.round(dist * 1000)} mm)`,
          detail: `Distance minimum : ${Math.round(ERGONOMIC.distances.cooktopToSinkMin * 1000)} mm`,
          priority: 1,
          affectedObjectIds: [sink.id, cooktop.id],
        });
      }
    }

    // Space utilization
    const totalItemWidth = items
      .filter((i) => !['wall', 'floor', 'ceiling'].includes(i.type))
      .reduce((sum, i) => sum + i.dimensions.width, 0);
    const wallPerimeter = (room.width + room.depth) * 2;
    const utilization = totalItemWidth / wallPerimeter;

    if (utilization < 0.3) {
      suggestions.push({
        id: `sug-${sugId++}`, type: 'info', category: 'space',
        message: 'Espace sous-utilisé',
        detail: 'Vous pouvez ajouter plus de rangements pour optimiser votre cuisine.',
        priority: 3,
      });
    }

    // Passage clearance
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;
        if (a.type === 'wall' || b.type === 'wall') continue;
        if (a.type === 'floor' || b.type === 'floor') continue;

        const dist = a.position.distanceTo(b.position);
        const minDist = (a.dimensions.depth + b.dimensions.depth) / 2 + ERGONOMIC.clearances.minPassage;

        if (dist < minDist && dist > 0) {
          suggestions.push({
            id: `sug-${sugId++}`, type: 'warning', category: 'ergonomics',
            message: `Passage insuffisant entre les éléments`,
            detail: `${Math.round(dist * 1000)} mm disponible, minimum ${Math.round(ERGONOMIC.clearances.minPassage * 1000)} mm`,
            priority: 2,
            affectedObjectIds: [a.id, b.id],
          });
        }
      }
    }

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Score ergonomique
   */
  private scoreErgonomics(items: PlacedItem3D[], _room: RoomConfig): number {
    let score = 50;
    const triangle = this.calculateWorkTriangle(items);
    score += triangle.score * 0.5;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score rangement
   */
  private scoreStorage(items: PlacedItem3D[], room: RoomConfig): number {
    const storageItems = items.filter((i) =>
      ['base_cabinet', 'base', 'wall_cabinet', 'wall', 'tall_cabinet', 'tall', 'drawer'].includes(i.type)
    );

    const totalStorageVolume = storageItems.reduce(
      (sum, i) => sum + i.dimensions.width * i.dimensions.height * i.dimensions.depth,
      0
    );

    const roomArea = room.width * room.depth;
    const idealStoragePerSqm = 0.3; // m3 de rangement par m2 de cuisine
    const storageRatio = totalStorageVolume / (roomArea * idealStoragePerSqm);

    return Math.min(100, storageRatio * 100);
  }

  /**
   * Score esthetique (coherence des dimensions)
   */
  private scoreAesthetics(items: PlacedItem3D[]): number {
    const furniture = items.filter((i) =>
      !['wall', 'floor', 'ceiling'].includes(i.type)
    );

    if (furniture.length < 2) return 50;

    // Alignement — les objets sont-ils bien alignes ?
    let score = 70;

    // Check si les hauteurs de plan de travail sont coherentes
    const baseHeights = furniture
      .filter((i) => ['base_cabinet', 'base', 'sink', 'sink_base'].includes(i.type))
      .map((i) => i.dimensions.height);

    if (baseHeights.length > 1) {
      const avgHeight = baseHeights.reduce((s, h) => s + h, 0) / baseHeights.length;
      const heightVariance = baseHeights.reduce((s, h) => s + Math.pow(h - avgHeight, 2), 0) / baseHeights.length;
      if (heightVariance < 0.001) score += 15; // Hauteur uniforme
      else if (heightVariance < 0.01) score += 5;
    }

    // Check symmetrie
    const centers = furniture.map((i) => i.position.x);
    if (centers.length > 2) {
      const mean = centers.reduce((s, c) => s + c, 0) / centers.length;
      const deviation = centers.reduce((s, c) => s + Math.abs(c - mean), 0) / centers.length;
      if (deviation < 0.5) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score budget
   */
  private scoreBudget(items: PlacedItem3D[]): number {
    const totalPrice = items.reduce((sum, i) => sum + (i.price || 0), 0);
    if (totalPrice === 0) return 50; // No price info
    return 70; // Base score when we have items
  }

  /**
   * Score utilisation de l'espace
   */
  private scoreSpace(items: PlacedItem3D[], room: RoomConfig): number {
    const furniture = items.filter((i) =>
      !['wall', 'floor', 'ceiling'].includes(i.type)
    );

    if (furniture.length === 0) return 0;

    const roomArea = room.width * room.depth;
    const totalFootprint = furniture.reduce(
      (sum, i) => sum + i.dimensions.width * i.dimensions.depth,
      0
    );

    // Idealement, 40-60% de l'espace utilise
    const ratio = totalFootprint / roomArea;
    if (ratio >= 0.4 && ratio <= 0.6) return 90;
    if (ratio >= 0.3 && ratio <= 0.7) return 70;
    if (ratio < 0.2) return 30;
    return 50;
  }

  /**
   * Auto-complete la cuisine en ajoutant les elements manquants
   */
  autoComplete(
    existingItems: PlacedItem3D[],
    room: RoomConfig,
    smartPlacement: { suggestPosition: (type: string, dimensions: { width: number; height: number; depth: number }, existingItems: PlacedItem3D[], room: RoomConfig) => { position: THREE.Vector3; rotation: number; confidence: number } }
  ): AutoCompleteResult {
    const addedItems: PlacedItem3D[] = [];
    const allItems = [...existingItems];

    // Essential items that should be present
    const essentials: Array<{ type: string; dimensions: { width: number; height: number; depth: number } }> = [];

    const hasSink = allItems.some((i) => i.type === 'sink' || i.type === 'sink_base');
    const hasCooktop = allItems.some((i) => ['cooktop', 'stove', 'hob'].includes(i.type));
    const hasFridge = allItems.some((i) => ['refrigerator', 'fridge', 'fridge_freezer'].includes(i.type));
    const hasHood = allItems.some((i) => ['hood', 'range_hood', 'extractor'].includes(i.type));

    if (!hasSink) {
      essentials.push({ type: 'sink_base', dimensions: { width: 0.6, height: mmToM(this.brandProfile.base.totalHeight), depth: mmToM(this.brandProfile.base.defaultDepth) } });
    }
    if (!hasCooktop) {
      essentials.push({ type: 'cooktop', dimensions: { width: 0.6, height: 0.05, depth: 0.52 } });
    }
    if (!hasFridge) {
      essentials.push({ type: 'refrigerator', dimensions: { width: 0.6, height: 1.8, depth: 0.65 } });
    }
    if (!hasHood && (hasCooktop || essentials.some((e) => e.type === 'cooktop'))) {
      essentials.push({ type: 'hood', dimensions: { width: 0.6, height: 0.15, depth: 0.5 } });
    }

    // Place essentials
    for (const essential of essentials) {
      const suggestion = smartPlacement.suggestPosition(
        essential.type,
        essential.dimensions,
        allItems,
        room
      );

      const newItem: PlacedItem3D = {
        id: generateId(`auto-${essential.type}`),
        type: essential.type,
        position: suggestion.position,
        rotation: suggestion.rotation,
        dimensions: essential.dimensions,
      };

      addedItems.push(newItem);
      allItems.push(newItem);
    }

    // Fill remaining wall space with base cabinets
    const baseCabinets = allItems.filter((i) =>
      ['base_cabinet', 'base', 'sink', 'sink_base', 'cooktop', 'stove', 'dishwasher'].includes(i.type)
    );

    // Calculate occupied wall space along back wall (z ~ 0.3)
    const backWallItems = baseCabinets
      .filter((i) => i.position.z < 0.5)
      .sort((a, b) => a.position.x - b.position.x);

    // Find gaps along back wall
    const cabinetWidth = 0.6;
    const cabinetDims = { width: cabinetWidth, height: mmToM(this.brandProfile.base.totalHeight), depth: mmToM(this.brandProfile.base.defaultDepth) };
    let maxBaseToAdd = 4;

    for (let x = 0.3; x < room.width - 0.3 && maxBaseToAdd > 0; x += cabinetWidth) {
      const occupied = backWallItems.some((item) => {
        const halfWidth = item.dimensions.width / 2;
        return x >= item.position.x - halfWidth - 0.02 && x <= item.position.x + halfWidth + 0.02;
      });

      if (!occupied) {
        const newBase: PlacedItem3D = {
          id: generateId('auto-base'),
          type: 'base_cabinet',
          position: new THREE.Vector3(x + cabinetWidth / 2, 0, 0.3),
          rotation: 0,
          dimensions: cabinetDims,
        };
        addedItems.push(newBase);
        allItems.push(newBase);
        backWallItems.push(newBase);
        maxBaseToAdd--;
      }
    }

    // Add wall cabinets above base cabinets (if few wall cabinets exist)
    const existingWallCabinets = allItems.filter((i) =>
      ['wall_cabinet', 'wall', 'upper', 'upper_cabinet'].includes(i.type)
    );

    if (existingWallCabinets.length < 2) {
      const wallCabinetDims = { width: 0.6, height: mmToM(this.brandProfile.wall.defaultHeight), depth: mmToM(this.brandProfile.wall.defaultDepth) };
      let maxWallToAdd = 3;

      const baseForWall = baseCabinets.filter((i) =>
        !['sink', 'sink_base'].includes(i.type) && i.position.z < 0.5
      );

      for (const base of baseForWall) {
        if (maxWallToAdd <= 0) break;

        const alreadyHasAbove = existingWallCabinets.some(
          (wc) => Math.abs(wc.position.x - base.position.x) < 0.3
        );

        if (!alreadyHasAbove) {
          const newWallCab: PlacedItem3D = {
            id: generateId('auto-wall'),
            type: 'wall_cabinet',
            position: new THREE.Vector3(base.position.x, mmToM(this.brandProfile.wall.bottomY), base.position.z - 0.12),
            rotation: base.rotation,
            dimensions: wallCabinetDims,
          };
          addedItems.push(newWallCab);
          allItems.push(newWallCab);
          existingWallCabinets.push(newWallCab);
          maxWallToAdd--;
        }
      }
    }

    // Score the result
    const score = this.scoreConfiguration(allItems, room);

    const message = addedItems.length === 0
      ? 'Votre cuisine est déjà complète !'
      : `${addedItems.length} élément(s) ajouté(s) pour optimiser votre cuisine.`;

    return { addedItems, score, message };
  }
}
