import * as THREE from 'three';
import type { BrandProfile } from '../config/brand-profiles';
import { mmToM } from '../config/brand-profiles';
import { AIAssistant } from './ai-assistant';
import type { PlacedItem3D, RoomConfig, ConfigurationScore } from './ai-assistant';
import { WallAnalyzer } from './wall-analysis';
import type { WallSide } from './wall-analysis';
import { CabinetSolver } from './cabinet-solver';

export type LayoutStrategyType = 'linear' | 'l_shape' | 'u_shape' | 'galley' | 'island';

export interface LayoutStrategy {
  type: LayoutStrategyType;
  name: string;
  walls: WallSide[];
  description: string;
}

export interface GenerationConstraints {
  room: RoomConfig;
  budget: { min: number; max: number };
  mustHave: string[];
  priority: 'ergonomics' | 'storage' | 'budget' | 'aesthetics';
}

export interface LayoutProposal {
  id: string;
  name: string;
  description: string;
  strategy: LayoutStrategy;
  items: PlacedItem3D[];
  score: ConfigurationScore;
  budget: number;
}

const ALL_STRATEGIES: LayoutStrategy[] = [
  {
    type: 'linear',
    name: 'Lineaire',
    walls: ['back'],
    description: 'Tous les elements sur un seul mur — ideal pour les petites cuisines.',
  },
  {
    type: 'l_shape',
    name: 'En L',
    walls: ['back', 'left'],
    description: 'Configuration en L sur deux murs adjacents — bon compromis espace/rangement.',
  },
  {
    type: 'u_shape',
    name: 'En U',
    walls: ['back', 'left', 'right'],
    description: "Trois murs utilises — maximum de rangement et d'espace de travail.",
  },
  {
    type: 'galley',
    name: 'Couloir',
    walls: ['back', 'front'],
    description: 'Deux murs face a face — efficace pour les cuisines etroites.',
  },
  {
    type: 'island',
    name: 'Ilot',
    walls: ['back', 'left'],
    description: 'Configuration en L avec ilot central — cuisine ouverte premium.',
  },
];

/**
 * Generateur de propositions de layouts
 */
export class LayoutGenerator {
  private brandProfile: BrandProfile;
  private wallAnalyzer: WallAnalyzer;
  private cabinetSolver: CabinetSolver;
  private aiAssistant: AIAssistant;

  constructor(brandProfile: BrandProfile) {
    this.brandProfile = brandProfile;
    this.wallAnalyzer = new WallAnalyzer();
    this.cabinetSolver = new CabinetSolver(brandProfile);
    this.aiAssistant = new AIAssistant(brandProfile);
  }

  /**
   * Genere 3-5 propositions de layout
   */
  generateProposals(constraints: GenerationConstraints): LayoutProposal[] {
    const { room } = constraints;

    // Filtrer les strategies par dimensions de la piece
    const viableStrategies = this.filterViableStrategies(room);

    // Generer une proposition par strategie
    const proposals: LayoutProposal[] = [];

    for (const strategy of viableStrategies) {
      const proposal = this.generateProposal(strategy, constraints);
      if (proposal) proposals.push(proposal);
    }

    // Trier par score global
    proposals.sort((a, b) => b.score.overall - a.score.overall);

    return proposals.slice(0, 5);
  }

  private filterViableStrategies(room: RoomConfig): LayoutStrategy[] {
    const width = room.width;
    const depth = room.depth;
    const minDim = Math.min(width, depth);

    return ALL_STRATEGIES.filter((strategy) => {
      switch (strategy.type) {
        case 'linear':
          return true; // Always viable
        case 'l_shape':
          return width >= 2.0 && depth >= 2.0;
        case 'u_shape':
          return width >= 2.5 && depth >= 2.5;
        case 'galley':
          return minDim >= 1.8 && Math.max(width, depth) >= 3.0;
        case 'island':
          return width >= 3.5 && depth >= 3.0;
        default:
          return false;
      }
    });
  }

  private generateProposal(
    strategy: LayoutStrategy,
    constraints: GenerationConstraints
  ): LayoutProposal | null {
    const { room } = constraints;
    const items: PlacedItem3D[] = [];

    // Analyze walls for this strategy
    const analysis = this.wallAnalyzer.analyzeRoom(room, []);

    // Get usable segments for the strategy's walls
    const strategySegments = analysis.segments.filter(
      (s) => strategy.walls.includes(s.wallSide) && s.usable
    );

    if (strategySegments.length === 0) return null;

    // Place essential appliances first
    const essentials = this.cabinetSolver.placeEssentialAppliances(
      strategySegments,
      {
        mustHave:
          constraints.mustHave.length > 0
            ? constraints.mustHave
            : ['sink', 'cooktop', 'refrigerator'],
        budget: constraints.budget,
      },
      []
    );
    items.push(...essentials);

    // Recalculate available segments after placing essentials
    const updatedAnalysis = this.wallAnalyzer.analyzeRoom(room, items);
    const remainingSegments = updatedAnalysis.segments.filter(
      (s) => strategy.walls.includes(s.wallSide) && s.usable && s.length >= 0.3
    );

    // Fill remaining space with cabinets
    for (const seg of remainingSegments) {
      const filledItems = this.cabinetSolver.fillWallSegment(
        seg,
        { mustHave: [], budget: constraints.budget },
        constraints.budget.max
      );
      items.push(...filledItems);
    }

    // Add wall cabinets above base cabinets
    this.addWallCabinets(items, strategy);

    // Add island if strategy requires it
    if (strategy.type === 'island') {
      this.addIsland(items, room);
    }

    // Enforce budget constraint: trim non-essential items if over budget
    const budgetMax = constraints.budget.max;
    if (budgetMax > 0) {
      let totalCost = items.reduce((sum, i) => sum + (i.price || 0), 0);
      // Remove items from the end (least important, added last) until within budget
      // Never remove essential appliances
      const essentialTypes = new Set([
        'sink',
        'cooktop',
        'refrigerator',
        'dishwasher',
        'stove',
        'hob',
        'fridge',
      ]);
      while (totalCost > budgetMax && items.length > 0) {
        // Find last non-essential item to remove
        let removedIdx = -1;
        for (let i = items.length - 1; i >= 0; i--) {
          if (!essentialTypes.has(items[i]!.type)) {
            removedIdx = i;
            break;
          }
        }
        if (removedIdx === -1) break; // Only essentials left, cannot trim further
        const removed = items.splice(removedIdx, 1)[0]!;
        totalCost -= removed.price || 0;
      }
    }

    // Score the result
    const score = this.aiAssistant.scoreConfiguration(items, room);
    const totalBudget = items.reduce((sum, i) => sum + (i.price || 0), 0);

    return {
      id: `proposal-${strategy.type}-${Date.now()}`,
      name: strategy.name,
      description: strategy.description,
      strategy,
      items,
      score,
      budget: totalBudget,
    };
  }

  private addWallCabinets(items: PlacedItem3D[], strategy: LayoutStrategy): void {
    // Only add wall cabinets above base cabinets that are on the strategy's walls
    const strategyWallRotations = new Set(
      strategy.walls.map((wall) => {
        switch (wall) {
          case 'back':
            return 0;
          case 'front':
            return Math.PI;
          case 'left':
            return Math.PI / 2;
          case 'right':
            return -Math.PI / 2;
        }
      })
    );

    const baseCabinets = items.filter(
      (i) =>
        ['base_cabinet', 'base'].includes(i.type) &&
        strategyWallRotations.has(i.rotation) &&
        !items.some(
          (other) =>
            other.type === 'wall_cabinet' && Math.abs(other.position.x - i.position.x) < 0.3
        )
    );

    const wallHeight = mmToM(this.brandProfile.wall.defaultHeight);
    const wallDepth = mmToM(this.brandProfile.wall.defaultDepth);
    const wallY = mmToM(this.brandProfile.wall.bottomY);

    for (const base of baseCabinets.slice(0, 6)) {
      items.push({
        id: `gen-wall-${base.id}`,
        type: 'wall_cabinet',
        position: new THREE.Vector3(base.position.x, wallY, base.position.z - 0.1),
        rotation: base.rotation,
        dimensions: { width: base.dimensions.width, height: wallHeight, depth: wallDepth },
        price: Math.round(120 + base.dimensions.width * 1000 * 0.2),
      });
    }
  }

  private addIsland(items: PlacedItem3D[], room: RoomConfig): void {
    const islandWidth = Math.min(1.2, room.width * 0.3);
    const islandDepth = 0.6;
    const islandHeight = mmToM(this.brandProfile.base.totalHeight);

    items.push({
      id: 'gen-island',
      type: 'base_cabinet',
      position: new THREE.Vector3(room.width / 2, 0, room.depth / 2),
      rotation: 0,
      dimensions: { width: islandWidth, height: islandHeight, depth: islandDepth },
      price: 800,
    });
  }
}
