import { z } from 'zod';
import { prisma } from '../../database/client';
import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 500);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface SimulationStep {
  stepNumber: number;
  action: string;
  fromZone: string;
  toZone: string;
  distanceM: number;
  timeSeconds: number;
  position3D: { from: Position3D; to: Position3D };
}

export interface Bottleneck {
  description: string;
  position: Position3D;
  suggestion: string;
}

export interface SimulationResult {
  id: string;
  scenario: string;
  steps: SimulationStep[];
  totalDistanceM: number;
  totalTimeMinutes: number;
  efficiencyScore: number;
  bottlenecks: Bottleneck[];
  zoneUsage: Record<string, number>;
}

export interface OptimizationSuggestion {
  item: string;
  currentZone: string;
  suggestedZone: string;
  currentPosition: Position3D;
  suggestedPosition: Position3D;
  distanceSaved: number;
  percentImprovement: number;
  description: string;
}

export interface OptimizationResult {
  simulationId: string;
  suggestions: OptimizationSuggestion[];
  currentTotalDistance: number;
  optimizedTotalDistance: number;
  percentImprovement: number;
}

export interface ScenarioDefinition {
  key: string;
  name: string;
  description: string;
  stepsRange: { min: number; max: number };
}

// ─── Zod schemas for AI response validation ─────────────────────────────────

export const Position3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const AIStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  action: z.string(),
  fromZone: z.string(),
  toZone: z.string(),
  timeSeconds: z.number().min(0),
});

const AISimulationResponseSchema = z.object({
  steps: z.array(AIStepSchema),
  bottlenecks: z.array(
    z.object({
      description: z.string(),
      zone: z.string(),
      suggestion: z.string(),
    })
  ),
});

const AIOptimizationResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      item: z.string(),
      currentZone: z.string(),
      suggestedZone: z.string(),
      distanceSaved: z.number().min(0),
      percentImprovement: z.number().min(0).max(100),
      description: z.string(),
    })
  ),
});

type AISimulationResponse = z.infer<typeof AISimulationResponseSchema>;
type AIOptimizationResponse = z.infer<typeof AIOptimizationResponseSchema>;

// ─── Zone mapping ───────────────────────────────────────────────────────────

const ZONE_ITEM_TYPES: Record<string, string[]> = {
  fridge: ['refrigerator', 'fridge', 'fridge_freezer'],
  sink: ['sink', 'sink_base'],
  countertop: ['base_cabinet', 'base', 'countertop'],
  hob: ['cooktop', 'stove', 'hob'],
  oven: ['oven', 'microwave'],
  storage: ['tall_cabinet', 'tall', 'pantry', 'wall_cabinet', 'wall'],
  island: ['island', 'peninsula'],
  dishwasher: ['dishwasher'],
};

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * WorkflowSimulationService
 *
 * Simulates cooking workflows in a kitchen layout to measure efficiency,
 * detect bottlenecks, and suggest layout optimizations using Claude AI.
 */
export class WorkflowSimulationService {
  private anthropic: AnthropicService;
  private static instance: WorkflowSimulationService;

  private readonly scenarios: Record<string, ScenarioDefinition> = {
    dinner_for_6: {
      key: 'dinner_for_6',
      name: 'Diner pour 6 personnes',
      description:
        'Preparation complete d\'un repas a 3 plats pour 6 convives: entree, plat principal, dessert.',
      stepsRange: { min: 15, max: 20 },
    },
    quick_breakfast: {
      key: 'quick_breakfast',
      name: 'Petit-dejeuner rapide',
      description:
        'Preparation d\'un petit-dejeuner pour la famille: cafe, tartines, oeufs, jus de fruits.',
      stepsRange: { min: 8, max: 10 },
    },
    meal_prep: {
      key: 'meal_prep',
      name: 'Preparation de repas (batch cooking)',
      description:
        'Session de batch cooking: preparation de 5 repas pour la semaine en une seule session.',
      stepsRange: { min: 20, max: 25 },
    },
    baking: {
      key: 'baking',
      name: 'Patisserie (gateau)',
      description:
        'Realisation d\'un gateau: preparation de la pate, cuisson, decoration.',
      stepsRange: { min: 12, max: 15 },
    },
  };

  private constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  static getInstance(): WorkflowSimulationService {
    if (!WorkflowSimulationService.instance) {
      WorkflowSimulationService.instance = new WorkflowSimulationService();
    }
    return WorkflowSimulationService.instance;
  }

  /**
   * Get all available cooking scenarios.
   */
  getScenarios(): ScenarioDefinition[] {
    return Object.values(this.scenarios);
  }

  /**
   * Simulate a cooking workflow for a kitchen layout.
   *
   * 1. Load kitchen items with positions from DB
   * 2. Identify zone positions from item types
   * 3. Send to Claude with WORKFLOW_SIMULATOR prompt + kitchen layout
   * 4. Get back steps with from/to zones, times
   * 5. Calculate distances using zone positions
   * 6. Detect bottlenecks
   * 7. Generate efficiency score
   * 8. Store in WorkflowSimulation table
   * 9. Return simulation result
   */
  async simulate(
    kitchenId: string,
    userId: string,
    scenario: string,
  ): Promise<SimulationResult> {
    const scenarioDef = this.scenarios[scenario];
    if (!scenarioDef) {
      throw new Error(`Unknown scenario: ${scenario}`);
    }

    // 1. Load kitchen and items from DB
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    const kitchenItems = await prisma.kitchenItem.findMany({
      where: { kitchenId },
    });

    // 2. Identify zone positions from placed items
    const zonePositions = this.identifyZonePositions(kitchenItems, kitchen);

    // 3. Build the prompt and ask Claude for simulation steps
    const prompt = this.buildSimulationPrompt(
      kitchen,
      kitchenItems,
      scenarioDef,
      zonePositions,
    );

    logger.info('[WorkflowSimulation] Starting simulation', {
      kitchenId,
      scenario,
      itemCount: kitchenItems.length,
    });

    const startTime = Date.now();

    const result = await this.anthropic.generateJSON<AISimulationResponse>({
      system: SYSTEM_PROMPTS.WORKFLOW_SIMULATOR,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8192,
      parse: (text: string) => {
        const parsed = JSON.parse(text);
        return AISimulationResponseSchema.parse(parsed);
      },
    });

    const durationMs = Date.now() - startTime;

    // Log AI usage
    await this.anthropic.logUsage(
      userId,
      'anthropic',
      'claude-sonnet-4-5-20250929',
      result.inputTokens,
      result.outputTokens,
      durationMs,
      { feature: 'workflow_simulation', scenario },
    );

    // 4 & 5. Enrich steps with 3D positions and distances
    const enrichedSteps = this.enrichStepsWithPositions(
      result.data.steps,
      zonePositions,
    );

    // 6. Calculate totals
    const totalDistanceM = enrichedSteps.reduce((sum, s) => sum + s.distanceM, 0);
    const totalTimeSeconds = enrichedSteps.reduce((sum, s) => sum + s.timeSeconds, 0);
    const totalTimeMinutes = Math.round((totalTimeSeconds / 60) * 10) / 10;

    // 7. Zone usage
    const zoneUsage = this.calculateZoneUsage(enrichedSteps);

    // 8. Bottlenecks from AI + calculated
    const bottlenecks = this.enrichBottlenecks(result.data.bottlenecks, zonePositions);

    // 9. Efficiency score
    const efficiencyScore = this.calculateEfficiencyScore(
      enrichedSteps,
      bottlenecks,
      totalDistanceM,
      zoneUsage,
    );

    // 10. Store in DB
    const simulation = await prisma.workflowSimulation.create({
      data: {
        kitchenId,
        userId,
        scenario,
        steps: enrichedSteps as any,
        totalDistanceM,
        totalTimeS: totalTimeSeconds,
        bottlenecks: bottlenecks as any,
        efficiencyScore,
      },
    });

    logger.info('[WorkflowSimulation] Simulation completed', {
      simulationId: simulation.id,
      kitchenId,
      scenario,
      totalDistanceM: Math.round(totalDistanceM * 100) / 100,
      totalTimeMinutes,
      efficiencyScore,
      stepCount: enrichedSteps.length,
    });

    return {
      id: simulation.id,
      scenario,
      steps: enrichedSteps,
      totalDistanceM: Math.round(totalDistanceM * 100) / 100,
      totalTimeMinutes,
      efficiencyScore,
      bottlenecks,
      zoneUsage,
    };
  }

  /**
   * Get AI suggestions to optimize the workflow by rearranging the kitchen layout.
   */
  async optimize(
    simulationId: string,
    userId: string,
  ): Promise<OptimizationResult> {
    const simulation = await prisma.workflowSimulation.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) {
      throw new Error('Simulation not found');
    }

    const kitchen = await prisma.kitchen.findUnique({
      where: { id: simulation.kitchenId },
    });

    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    const kitchenItems = await prisma.kitchenItem.findMany({
      where: { kitchenId: simulation.kitchenId },
    });

    const zonePositions = this.identifyZonePositions(kitchenItems, kitchen);
    const steps = simulation.steps as unknown as SimulationStep[];

    const prompt = this.buildOptimizationPrompt(
      kitchen,
      kitchenItems,
      steps,
      simulation.totalDistanceM,
      simulation.efficiencyScore,
      zonePositions,
    );

    logger.info('[WorkflowSimulation] Generating optimization suggestions', {
      simulationId,
      kitchenId: simulation.kitchenId,
    });

    const startTime = Date.now();

    const result = await this.anthropic.generateJSON<AIOptimizationResponse>({
      system: SYSTEM_PROMPTS.WORKFLOW_SIMULATOR,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4096,
      parse: (text: string) => {
        const parsed = JSON.parse(text);
        return AIOptimizationResponseSchema.parse(parsed);
      },
    });

    const durationMs = Date.now() - startTime;

    await this.anthropic.logUsage(
      userId,
      'anthropic',
      'claude-sonnet-4-5-20250929',
      result.inputTokens,
      result.outputTokens,
      durationMs,
      { feature: 'workflow_optimization', simulationId },
    );

    // Enrich suggestions with 3D positions
    const suggestions: OptimizationSuggestion[] = result.data.suggestions.map((s) => ({
      item: s.item,
      currentZone: s.currentZone,
      suggestedZone: s.suggestedZone,
      currentPosition: zonePositions[s.currentZone] || { x: 0, y: 0, z: 0 },
      suggestedPosition: zonePositions[s.suggestedZone] || { x: 0, y: 0, z: 0 },
      distanceSaved: s.distanceSaved,
      percentImprovement: s.percentImprovement,
      description: s.description,
    }));

    const totalSaved = suggestions.reduce((sum, s) => sum + s.distanceSaved, 0);
    const optimizedTotalDistance = Math.max(0, simulation.totalDistanceM - totalSaved);
    const percentImprovement =
      simulation.totalDistanceM > 0
        ? Math.round((totalSaved / simulation.totalDistanceM) * 100 * 10) / 10
        : 0;

    // Store optimized steps reference in DB
    await prisma.workflowSimulation.update({
      where: { id: simulationId },
      data: {
        optimizedSteps: suggestions as any,
      },
    });

    logger.info('[WorkflowSimulation] Optimization completed', {
      simulationId,
      suggestionCount: suggestions.length,
      percentImprovement,
    });

    return {
      simulationId,
      suggestions,
      currentTotalDistance: Math.round(simulation.totalDistanceM * 100) / 100,
      optimizedTotalDistance: Math.round(optimizedTotalDistance * 100) / 100,
      percentImprovement,
    };
  }

  /**
   * Get simulation history for a kitchen.
   */
  async getHistory(kitchenId: string): Promise<SimulationResult[]> {
    const simulations = await prisma.workflowSimulation.findMany({
      where: { kitchenId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return simulations.map((sim) => {
      const steps = (sim.steps as unknown as SimulationStep[]) || [];
      const bottlenecks = (sim.bottlenecks as unknown as Bottleneck[]) || [];
      const totalTimeSeconds = steps.reduce((sum, s) => sum + s.timeSeconds, 0);

      return {
        id: sim.id,
        scenario: sim.scenario,
        steps,
        totalDistanceM: Math.round(sim.totalDistanceM * 100) / 100,
        totalTimeMinutes: Math.round((totalTimeSeconds / 60) * 10) / 10,
        efficiencyScore: sim.efficiencyScore,
        bottlenecks,
        zoneUsage: this.calculateZoneUsage(steps),
      };
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Identify the 3D position of each kitchen zone based on placed items.
   * Falls back to reasonable defaults based on kitchen dimensions.
   */
  private identifyZonePositions(
    items: Array<{
      type: string;
      positionX: any;
      positionY: any;
      positionZ: any;
    }>,
    kitchen: { width: any; length: any; height: any },
  ): Record<string, Position3D> {
    const width = Number(kitchen.width);
    const depth = Number(kitchen.length);

    const zonePositions: Record<string, Position3D> = {};

    for (const [zoneName, itemTypes] of Object.entries(ZONE_ITEM_TYPES)) {
      const matchingItems = items.filter((item) =>
        itemTypes.some((t) => item.type.includes(t)),
      );

      if (matchingItems.length > 0) {
        // Compute centroid of matching items
        const avgX =
          matchingItems.reduce((sum, i) => sum + Number(i.positionX), 0) /
          matchingItems.length;
        const avgY =
          matchingItems.reduce((sum, i) => sum + Number(i.positionY), 0) /
          matchingItems.length;
        const avgZ =
          matchingItems.reduce((sum, i) => sum + Number(i.positionZ), 0) /
          matchingItems.length;

        zonePositions[zoneName] = {
          x: Math.round(avgX * 100) / 100,
          y: Math.round(avgY * 100) / 100,
          z: Math.round(avgZ * 100) / 100,
        };
      }
    }

    // Provide fallback positions for zones without items
    if (!zonePositions.fridge) {
      zonePositions.fridge = { x: 0.3, y: 0, z: depth / 2 };
    }
    if (!zonePositions.sink) {
      zonePositions.sink = { x: width / 3, y: 0, z: 0.3 };
    }
    if (!zonePositions.countertop) {
      zonePositions.countertop = { x: width / 2, y: 0, z: 0.3 };
    }
    if (!zonePositions.hob) {
      zonePositions.hob = { x: (width * 2) / 3, y: 0, z: 0.3 };
    }
    if (!zonePositions.oven) {
      zonePositions.oven = { x: width * 0.8, y: 0, z: 0.3 };
    }
    if (!zonePositions.storage) {
      zonePositions.storage = { x: 0.3, y: 0, z: 0.3 };
    }

    return zonePositions;
  }

  /**
   * Calculate Manhattan distance between two 3D positions.
   * In a kitchen, you walk along walls, not diagonally.
   */
  private calculateDistance(from: Position3D, to: Position3D): number {
    return (
      Math.round(
        (Math.abs(from.x - to.x) + Math.abs(from.z - to.z)) * 100,
      ) / 100
    );
  }

  /**
   * Enrich AI-generated steps with 3D positions and computed distances.
   */
  private enrichStepsWithPositions(
    aiSteps: AISimulationResponse['steps'],
    zonePositions: Record<string, Position3D>,
  ): SimulationStep[] {
    const defaultPos: Position3D = { x: 0, y: 0, z: 0 };

    return aiSteps.map((step) => {
      const fromPos = zonePositions[step.fromZone] || defaultPos;
      const toPos = zonePositions[step.toZone] || defaultPos;
      const distanceM = this.calculateDistance(fromPos, toPos);

      return {
        stepNumber: step.stepNumber,
        action: step.action,
        fromZone: step.fromZone,
        toZone: step.toZone,
        distanceM,
        timeSeconds: step.timeSeconds,
        position3D: { from: fromPos, to: toPos },
      };
    });
  }

  /**
   * Calculate how many times each zone is visited across all steps.
   */
  private calculateZoneUsage(steps: SimulationStep[]): Record<string, number> {
    const usage: Record<string, number> = {};

    for (const step of steps) {
      usage[step.fromZone] = (usage[step.fromZone] || 0) + 1;
      usage[step.toZone] = (usage[step.toZone] || 0) + 1;
    }

    return usage;
  }

  /**
   * Enrich AI-generated bottleneck descriptions with zone 3D positions.
   */
  private enrichBottlenecks(
    aiBottlenecks: AISimulationResponse['bottlenecks'],
    zonePositions: Record<string, Position3D>,
  ): Bottleneck[] {
    const defaultPos: Position3D = { x: 0, y: 0, z: 0 };

    return aiBottlenecks.map((b) => ({
      description: b.description,
      position: zonePositions[b.zone] || defaultPos,
      suggestion: b.suggestion,
    }));
  }

  /**
   * Calculate an efficiency score (0-100) based on simulation metrics.
   */
  private calculateEfficiencyScore(
    steps: SimulationStep[],
    bottlenecks: Bottleneck[],
    totalDistanceM: number,
    zoneUsage: Record<string, number>,
  ): number {
    let score = 100;

    // Penalize for excessive total distance
    // Optimal single cycle: 5-12m. Penalty for going over
    if (totalDistanceM > 50) score -= 20;
    else if (totalDistanceM > 35) score -= 15;
    else if (totalDistanceM > 20) score -= 10;
    else if (totalDistanceM > 15) score -= 5;

    // Penalize for bottlenecks
    score -= bottlenecks.length * 5;

    // Penalize for long individual steps (detours > 5m)
    const longSteps = steps.filter((s) => s.distanceM > 5);
    score -= longSteps.length * 3;

    // Penalize for uneven zone usage (one zone visited excessively)
    const usageCounts = Object.values(zoneUsage);
    if (usageCounts.length > 0) {
      const avgUsage =
        usageCounts.reduce((s, c) => s + c, 0) / usageCounts.length;
      const maxUsage = Math.max(...usageCounts);
      if (maxUsage > avgUsage * 3) score -= 5;
    }

    // Bonus for good zone distribution
    const distinctZones = new Set(steps.flatMap((s) => [s.fromZone, s.toZone]));
    if (distinctZones.size >= 4) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Build the prompt for Claude to generate simulation steps.
   */
  private buildSimulationPrompt(
    kitchen: any,
    kitchenItems: any[],
    scenario: ScenarioDefinition,
    zonePositions: Record<string, Position3D>,
  ): string {
    const sections: string[] = [];

    sections.push(`Simule un workflow de cuisine pour le scenario: "${scenario.name}"`);
    sections.push(`Description: ${scenario.description}`);
    sections.push(
      `Nombre d'etapes attendu: entre ${scenario.stepsRange.min} et ${scenario.stepsRange.max}`,
    );
    sections.push('');

    // Kitchen info
    sections.push('=== CUISINE ===');
    sections.push(`- Nom: ${sanitizeInput(kitchen.name)}`);
    sections.push(`- Style: ${sanitizeInput(kitchen.style)}`);
    sections.push(`- Disposition: ${sanitizeInput(kitchen.layout)}`);
    sections.push(`- Dimensions: ${kitchen.width}m x ${kitchen.length}m x ${kitchen.height}m`);
    sections.push('');

    // Zone positions
    sections.push('=== ZONES IDENTIFIEES ===');
    for (const [zone, pos] of Object.entries(zonePositions)) {
      sections.push(`- ${zone}: x=${pos.x}, y=${pos.y}, z=${pos.z}`);
    }
    sections.push('');

    // Items
    if (kitchenItems.length > 0) {
      sections.push('=== ELEMENTS PLACES ===');
      for (const item of kitchenItems) {
        sections.push(
          `- ${sanitizeInput(item.name)} (${sanitizeInput(item.type)}) a position (${item.positionX}, ${item.positionY}, ${item.positionZ})`,
        );
      }
      sections.push('');
    }

    // Expected output format
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push(`Genere un JSON avec cette structure exacte:
{
  "steps": [
    {
      "stepNumber": 1,
      "action": "Sortir les legumes du frigo",
      "fromZone": "fridge",
      "toZone": "countertop",
      "timeSeconds": 15
    }
  ],
  "bottlenecks": [
    {
      "description": "Le frigo est trop loin du plan de travail",
      "zone": "fridge",
      "suggestion": "Rapprocher le frigo du plan de travail principal"
    }
  ]
}`);
    sections.push('');
    sections.push(
      'Les zones possibles sont: fridge, sink, countertop, hob, oven, storage, island, dishwasher',
    );
    sections.push(
      'Chaque etape doit avoir une action descriptive en francais.',
    );
    sections.push(
      'Identifie les goulots d\'etranglement: zones croisees trop souvent, longs detours, passages encombres.',
    );
    sections.push('Reponds UNIQUEMENT avec le JSON, sans texte avant ou apres.');

    return sections.join('\n');
  }

  /**
   * Build the prompt for Claude to suggest layout optimizations.
   */
  private buildOptimizationPrompt(
    kitchen: any,
    kitchenItems: any[],
    steps: SimulationStep[],
    totalDistanceM: number,
    efficiencyScore: number,
    zonePositions: Record<string, Position3D>,
  ): string {
    const sections: string[] = [];

    sections.push(
      'Analyse ce workflow de cuisine et propose des optimisations de layout.',
    );
    sections.push('');

    // Current metrics
    sections.push('=== METRIQUES ACTUELLES ===');
    sections.push(`- Distance totale parcourue: ${totalDistanceM}m`);
    sections.push(`- Score d'efficacite: ${efficiencyScore}/100`);
    sections.push(`- Nombre d'etapes: ${steps.length}`);
    sections.push('');

    // Kitchen dimensions
    sections.push('=== CUISINE ===');
    sections.push(`- Dimensions: ${kitchen.width}m x ${kitchen.length}m`);
    sections.push(`- Disposition: ${sanitizeInput(kitchen.layout)}`);
    sections.push('');

    // Current zone positions
    sections.push('=== ZONES ACTUELLES ===');
    for (const [zone, pos] of Object.entries(zonePositions)) {
      sections.push(`- ${zone}: x=${pos.x}, z=${pos.z}`);
    }
    sections.push('');

    // Current items
    if (kitchenItems.length > 0) {
      sections.push('=== ELEMENTS PLACES ===');
      for (const item of kitchenItems) {
        sections.push(
          `- ${sanitizeInput(item.name)} (${sanitizeInput(item.type)}) a (${item.positionX}, ${item.positionZ})`,
        );
      }
      sections.push('');
    }

    // Most visited zones (top bottlenecks)
    const zoneUsage = this.calculateZoneUsage(steps);
    const topZones = Object.entries(zoneUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    sections.push('=== ZONES LES PLUS VISITEES ===');
    for (const [zone, count] of topZones) {
      sections.push(`- ${zone}: ${count} visites`);
    }
    sections.push('');

    // Longest steps
    const longestSteps = [...steps].sort((a, b) => b.distanceM - a.distanceM).slice(0, 5);
    sections.push('=== ETAPES LES PLUS LONGUES ===');
    for (const step of longestSteps) {
      sections.push(
        `- Etape ${step.stepNumber}: ${step.action} (${step.fromZone} -> ${step.toZone}, ${step.distanceM}m)`,
      );
    }
    sections.push('');

    // Expected output
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push(`Genere un JSON avec cette structure exacte:
{
  "suggestions": [
    {
      "item": "Evier",
      "currentZone": "sink",
      "suggestedZone": "countertop",
      "distanceSaved": 2.5,
      "percentImprovement": 15,
      "description": "Deplacer l'evier plus pres du plan de travail pour reduire les allers-retours"
    }
  ]
}`);
    sections.push('');
    sections.push(
      'Propose 3 a 5 suggestions concretes et actionables.',
    );
    sections.push(
      'Chaque suggestion doit indiquer quel element deplacer et pourquoi.',
    );
    sections.push('Reponds UNIQUEMENT avec le JSON, sans texte avant ou apres.');

    return sections.join('\n');
  }
}

export default WorkflowSimulationService;
