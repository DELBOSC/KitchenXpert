/**
 * Renovation Service (F7)
 *
 * AI-powered analysis of existing kitchens for renovation planning.
 * Uses Claude Vision to analyze existing kitchen photos, identify elements,
 * estimate demolition costs, and generate before/after comparison data.
 * Uses the AnthropicService singleton for API access and Prisma singleton for DB.
 */

import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface ExistingKitchenAnalysis {
  cabinets: Array<{
    type: string;
    brand?: string;
    style: string;
    condition: 'good' | 'fair' | 'poor' | 'replace';
    estimatedCount: number;
  }>;
  appliances: Array<{
    type: string;
    brand?: string;
    builtin: boolean;
    condition: 'good' | 'fair' | 'poor' | 'replace';
  }>;
  countertop: {
    material: string;
    condition: 'good' | 'fair' | 'poor' | 'replace';
    estimatedLengthM: number;
  };
  flooring: {
    material: string;
    condition: 'good' | 'fair' | 'poor' | 'replace';
  };
  wallCovering: {
    type: string;
    condition: 'good' | 'fair' | 'poor' | 'replace';
  };
  plumbing: {
    visible: boolean;
    condition: 'good' | 'fair' | 'poor' | 'unknown';
    notes: string;
  };
  overallCondition: 'full_renovation' | 'partial_renovation' | 'refresh' | 'cosmetic_only';
  elementsToKeep: string[];
  elementsToReplace: string[];
  estimatedDemolitionCostEur: number;
  notes: string[];
  confidence: number;
}

export interface ComparisonData {
  storageSpaceChange: number; // percentage change, e.g. +25
  counterSpaceChange: number; // percentage change
  estimatedDemolitionCostEur: number;
  estimatedRenovationCostEur: number;
  totalCostEur: number;
  improvements: string[];
  summary: string;
}

export interface CreateRenovationDto {
  kitchenId?: string;
  beforePhotos?: string[];
}

// ----------------------------------------------------------------
// Zod Validation Schemas
// ----------------------------------------------------------------

const ExistingKitchenAnalysisSchema = z.object({
  cabinets: z
    .array(
      z.object({
        type: z.string().max(100),
        brand: z.string().max(100).optional(),
        style: z.string().max(100),
        condition: z.enum(['good', 'fair', 'poor', 'replace']),
        estimatedCount: z.number().min(0).max(50),
      })
    )
    .max(20),
  appliances: z
    .array(
      z.object({
        type: z.string().max(100),
        brand: z.string().max(100).optional(),
        builtin: z.boolean(),
        condition: z.enum(['good', 'fair', 'poor', 'replace']),
      })
    )
    .max(15),
  countertop: z.object({
    material: z.string().max(100),
    condition: z.enum(['good', 'fair', 'poor', 'replace']),
    estimatedLengthM: z.number().min(0).max(20),
  }),
  flooring: z.object({
    material: z.string().max(100),
    condition: z.enum(['good', 'fair', 'poor', 'replace']),
  }),
  wallCovering: z.object({
    type: z.string().max(100),
    condition: z.enum(['good', 'fair', 'poor', 'replace']),
  }),
  plumbing: z.object({
    visible: z.boolean(),
    condition: z.enum(['good', 'fair', 'poor', 'unknown']),
    notes: z.string().max(500),
  }),
  overallCondition: z.enum(['full_renovation', 'partial_renovation', 'refresh', 'cosmetic_only']),
  elementsToKeep: z.array(z.string().max(100)).max(20),
  elementsToReplace: z.array(z.string().max(100)).max(30),
  estimatedDemolitionCostEur: z.number().min(0).max(50000),
  notes: z.array(z.string().max(500)).max(10),
  confidence: z.number().min(0).max(1),
});

const ComparisonDataSchema = z.object({
  storageSpaceChange: z.number().min(-100).max(500),
  counterSpaceChange: z.number().min(-100).max(500),
  estimatedDemolitionCostEur: z.number().min(0).max(50000),
  estimatedRenovationCostEur: z.number().min(0).max(200000),
  totalCostEur: z.number().min(0).max(250000),
  improvements: z.array(z.string().max(200)).max(15),
  summary: z.string().max(1000),
});

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class RenovationService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  /**
   * Analyze an existing kitchen from a photo using Claude Vision.
   * Identifies cabinets, appliances, countertops, flooring, condition, etc.
   *
   * @param photo - Image buffer to analyze
   * @param userId - The user requesting the analysis (for usage logging)
   * @param mediaType - MIME type of the image
   */
  async analyzeExistingKitchen(
    photo: Buffer,
    userId: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): Promise<ExistingKitchenAnalysis> {
    const startTime = Date.now();

    if (!photo || photo.length < 100) {
      throw new Error('Invalid image data: image is too small or empty');
    }

    const base64 = photo.toString('base64');

    logger.info('[Renovation] Analyzing existing kitchen photo', {
      imageSize: base64.length,
      mediaType,
      userId,
    });

    try {
      const prompt = this.buildAnalysisPrompt();

      const result = await this.anthropic.generateJSON<ExistingKitchenAnalysis>({
        system: SYSTEM_PROMPTS.RENOVATION_ANALYZER,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        maxTokens: 4096,
        parse: (text: string) => {
          const raw = JSON.parse(text);
          return ExistingKitchenAnalysisSchema.parse(raw);
        },
      });

      const durationMs = Date.now() - startTime;

      // Log usage
      await this.anthropic.logUsage(
        userId,
        'anthropic',
        'claude-sonnet-4-5-20250929',
        result.inputTokens,
        result.outputTokens,
        durationMs,
        { feature: 'renovation-analyzer', promptVersion: '1.0.0' }
      );

      logger.info('[Renovation] Analysis complete', {
        overallCondition: result.data.overallCondition,
        confidence: result.data.confidence,
        cabinetCount: result.data.cabinets.length,
        applianceCount: result.data.appliances.length,
        durationMs,
      });

      return result.data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logger.error('[Renovation] Analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate comparison data between existing kitchen analysis and a new design.
   *
   * @param existingAnalysis - The AI analysis of the existing kitchen
   * @param newDesignId - The kitchen design ID to compare against
   */
  async generateComparison(
    existingAnalysis: ExistingKitchenAnalysis,
    newDesignId: string
  ): Promise<ComparisonData> {
    const startTime = Date.now();

    // Fetch the new design data from the database
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: newDesignId },
      select: {
        id: true,
        name: true,
        metadata: true,
      },
    });

    if (!kitchen) {
      throw new Error(`Kitchen design ${newDesignId} not found`);
    }

    try {
      const prompt = this.buildComparisonPrompt(existingAnalysis, kitchen);

      const result = await this.anthropic.generateJSON<ComparisonData>({
        system: SYSTEM_PROMPTS.RENOVATION_ANALYZER,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        maxTokens: 3000,
        parse: (text: string) => {
          const raw = JSON.parse(text);
          return ComparisonDataSchema.parse(raw);
        },
      });

      const durationMs = Date.now() - startTime;

      logger.info('[Renovation] Comparison generated', {
        designId: newDesignId,
        storageChange: result.data.storageSpaceChange,
        totalCost: result.data.totalCostEur,
        durationMs,
      });

      return result.data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logger.error('[Renovation] Comparison generation failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs,
        newDesignId,
      });
      throw error;
    }
  }

  /**
   * Create a new renovation project in the database.
   */
  async createProject(userId: string, data: CreateRenovationDto): Promise<Record<string, unknown>> {
    const project = await prisma.renovationProject.create({
      data: {
        userId,
        kitchenId: data.kitchenId || null,
        beforePhotos: data.beforePhotos || [],
        status: 'draft',
      },
    });

    logger.info('[Renovation] Project created', {
      projectId: project.id,
      userId,
    });

    return project;
  }

  /**
   * Get a renovation project by ID (with ownership check).
   */
  async getProject(
    projectId: string,
    userId: string,
    isAdmin: boolean
  ): Promise<Record<string, unknown> | null> {
    const project = await prisma.renovationProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return null;
    }

    // Ownership verification
    if (project.userId !== userId && !isAdmin) {
      return null;
    }

    return project;
  }

  /**
   * List all renovation projects for a user.
   */
  async listUserProjects(userId: string): Promise<Record<string, unknown>[]> {
    const projects = await prisma.renovationProject.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  }

  /**
   * Update a renovation project with analysis results or comparison data.
   */
  async updateProject(
    projectId: string,
    data: {
      detectedLayout?: unknown;
      afterDesignId?: string;
      estimatedDemoCost?: number;
      estimatedRenoCost?: number;
      comparisonData?: unknown;
      status?: string;
      beforePhotos?: string[];
    }
  ): Promise<Record<string, unknown>> {
    const project = await prisma.renovationProject.update({
      where: { id: projectId },
      data: {
        ...(data.detectedLayout !== undefined && { detectedLayout: data.detectedLayout as any }),
        ...(data.afterDesignId !== undefined && { afterDesignId: data.afterDesignId }),
        ...(data.estimatedDemoCost !== undefined && { estimatedDemoCost: data.estimatedDemoCost }),
        ...(data.estimatedRenoCost !== undefined && { estimatedRenoCost: data.estimatedRenoCost }),
        ...(data.comparisonData !== undefined && { comparisonData: data.comparisonData as any }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.beforePhotos !== undefined && { beforePhotos: data.beforePhotos }),
      },
    });

    return project;
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private buildAnalysisPrompt(): string {
    return `Analyse cette photo de cuisine existante et identifie tous les elements.

Reponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de backticks), avec cette structure exacte:

{
  "cabinets": [
    {
      "type": "haut|bas|colonne|angle",
      "brand": "marque si identifiable ou null",
      "style": "description du style (ex: moderne laque blanc, rustique bois massif)",
      "condition": "good|fair|poor|replace",
      "estimatedCount": <nombre>
    }
  ],
  "appliances": [
    {
      "type": "four|plaque|hotte|lave-vaisselle|frigo|micro-ondes|congelateur",
      "brand": "marque si identifiable ou null",
      "builtin": true/false,
      "condition": "good|fair|poor|replace"
    }
  ],
  "countertop": {
    "material": "stratifie|granit|quartz|bois|marbre|inox|ceramique",
    "condition": "good|fair|poor|replace",
    "estimatedLengthM": <longueur en metres>
  },
  "flooring": {
    "material": "carrelage|parquet|vinyle|beton_cire|lino|tomettes",
    "condition": "good|fair|poor|replace"
  },
  "wallCovering": {
    "type": "peinture|carrelage|credence_inox|papier_peint|lambris",
    "condition": "good|fair|poor|replace"
  },
  "plumbing": {
    "visible": true/false,
    "condition": "good|fair|poor|unknown",
    "notes": "description de l'etat de la plomberie visible"
  },
  "overallCondition": "full_renovation|partial_renovation|refresh|cosmetic_only",
  "elementsToKeep": ["element1", "element2"],
  "elementsToReplace": ["element1", "element2"],
  "estimatedDemolitionCostEur": <cout en euros>,
  "notes": ["note1", "note2"],
  "confidence": <0.0 a 1.0>
}

Estimations de couts de demolition/depose pour le marche francais:
- Depose cuisine complete: 800-2000 EUR
- Depose meubles seuls: 400-800 EUR
- Depose plan de travail: 200-400 EUR
- Depose carrelage mural: 15-25 EUR/m2
- Depose carrelage sol: 15-30 EUR/m2
- Evacuation gravats: 200-500 EUR

Indique dans "elementsToKeep" ce qui est en bon etat et peut etre conserve.
Indique dans "elementsToReplace" ce qui doit etre change.`;
  }

  private buildComparisonPrompt(
    existing: ExistingKitchenAnalysis,
    kitchen: { id: string; name: string | null; metadata: unknown }
  ): string {
    return `Compare cette cuisine existante avec le nouveau design et genere des metriques.

CUISINE EXISTANTE (analyse IA):
${JSON.stringify(existing, null, 2)}

NOUVEAU DESIGN:
Nom: ${kitchen.name || 'Sans nom'}
Donnees: ${JSON.stringify(kitchen.metadata || {}).slice(0, 2000)}

Reponds UNIQUEMENT avec un objet JSON valide:
{
  "storageSpaceChange": <pourcentage de changement, ex: +25 pour +25%>,
  "counterSpaceChange": <pourcentage de changement>,
  "estimatedDemolitionCostEur": <cout demolition en euros>,
  "estimatedRenovationCostEur": <cout renovation totale hors demolition en euros>,
  "totalCostEur": <cout total (demolition + renovation)>,
  "improvements": ["amelioration 1", "amelioration 2", ...],
  "summary": "Resume de la comparaison en 2-3 phrases"
}

Base les estimations de cout sur le marche francais 2024-2026.
Les ameliorations doivent etre concretes et quantifiees quand possible.`;
  }
}

export default RenovationService;
