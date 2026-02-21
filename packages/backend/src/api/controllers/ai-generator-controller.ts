import crypto from 'crypto';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-middleware.js';
import { prisma } from '../../database/client.js';
import logger from '../../utils/logger.js';
import { DesignGeneratorService } from '../../services/ai/design-generator.service.js';
import { ImageGeneratorService } from '../../services/ai/image-generator.service.js';
import type { AIGeneratedDesign, CostBreakdown } from '../../services/ai/design-generator.service.js';

interface GeneratedDesign {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  style: string;
  estimatedCost: { min: number; max: number; currency: string };
  features: string[];
  materials: { cabinets: string; countertops: string; backsplash: string; flooring: string };
  layout: string;
  score: number;
  createdAt: string;
  isAIGenerated: boolean;
  materialRationale?: string;
  layoutExplanation?: string;
  tradeoffs?: string;
  costBreakdown?: CostBreakdown;
}

/**
 * Style descriptions for generated design names/descriptions (fallback algorithm)
 */
const styleDescriptions: Record<string, { name: string; features: string[] }> = {
  modern: { name: 'Moderne', features: ['Lignes epurees', 'Finitions laquees', 'Eclairage LED integre'] },
  traditional: { name: 'Traditionnelle', features: ['Moulures classiques', 'Bois massif', 'Poignees ornees'] },
  transitional: { name: 'Transitionnelle', features: ['Mix moderne/classique', 'Materiaux nobles', 'Silhouettes simples'] },
  farmhouse: { name: 'Campagne', features: ['Bois naturel', 'Evier a tablier', 'Etageres ouvertes'] },
  industrial: { name: 'Industrielle', features: ['Metal brut', 'Beton cire', 'Eclairage suspendu'] },
  scandinavian: { name: 'Scandinave', features: ['Bois clair', 'Blanc dominant', 'Rangements fonctionnels'] },
  contemporary: { name: 'Contemporaine', features: ['Tendances actuelles', 'Accents audacieux', 'Technologie integree'] },
  mediterranean: { name: 'Mediterraneenne', features: ['Couleurs chaudes', 'Carrelage artisanal', 'Voutes decoratives'] },
};

const layoutDescriptions: Record<string, string> = {
  galley: 'en couloir',
  'l-shaped': 'en L',
  'u-shaped': 'en U',
  open: 'ouverte',
  island: 'avec ilot',
  peninsula: 'avec presqu\'ile',
};

/**
 * AI Generator Controller
 * Bridge between frontend AI Generator UI and existing kitchen generator logic.
 * Now uses Prisma AIGeneration model for persistence and Gemini for image generation.
 */
export class AIGeneratorController {
  private designGeneratorService: DesignGeneratorService;
  private imageGeneratorService: ImageGeneratorService;

  constructor() {
    this.designGeneratorService = new DesignGeneratorService();
    this.imageGeneratorService = ImageGeneratorService.getInstance();
  }

  /**
   * GET /ai-generator/preferences/:projectId
   * Fetch saved design preferences for a project
   */
  getPreferences = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { projectId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (project.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Find design preferences via kitchen
    const kitchen = await prisma.kitchen.findFirst({
      where: { projectId, deletedAt: null },
      include: { designs: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!kitchen?.designs) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    // Transform DesignPreference to frontend format
    const prefs = kitchen.designs;
    res.status(200).json({
      success: true,
      data: {
        projectId,
        kitchenStyle: prefs.personaMatch || 'modern',
        colorPalette: (prefs.colorScheme as string)?.split(',') || [],
        layoutPreference: kitchen.layout?.replace('_', '-') || 'l-shaped',
        applianceGrade: 'standard',
        storageEmphasis: 'moderate',
        lightingMood: 'bright',
        ...(prefs.materialPreferences as Record<string, unknown> || {}),
      },
    });
  });

  /**
   * POST /ai-generator/generate
   * Start a design generation from AI preferences.
   * Attempts Claude AI generation first, falls back to algorithmic generation.
   * Now persists to AIGeneration table and generates thumbnails via Gemini.
   */
  generate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const preferences = req.body;
    const numberOfDesigns = Math.min(preferences.numberOfDesigns || 3, 5);

    // Create AIGeneration record in DB (status: processing)
    const aiGeneration = await prisma.aIGeneration.create({
      data: {
        userId,
        projectId: preferences.projectId || null,
        status: 'processing',
        preferences: {
          kitchenStyle: preferences.kitchenStyle,
          colorPalette: preferences.colorPalette,
          layoutPreference: preferences.layoutPreference,
        },
        designs: [],
        isAIGenerated: false,
      },
    });

    const generationId = aiGeneration.id;
    let designs: GeneratedDesign[] = [];
    let isAIGenerated = false;

    // Try AI generation first, fall back to algorithmic
    try {
      // Load questionnaire data for richer context
      let questionnaireData = null;
      if (preferences.projectId) {
        const questionnaire = await prisma.questionnaireResponse.findFirst({
          where: { projectId: preferences.projectId },
        });
        if (questionnaire) {
          questionnaireData = {
            userProfile: questionnaire.userProfile as Record<string, unknown> | undefined,
            spatialData: questionnaire.spatialData as Record<string, unknown> | undefined,
            cookingHabits: questionnaire.cookingHabits as Record<string, unknown> | undefined,
            budgetData: questionnaire.budgetData as Record<string, unknown> | undefined,
            aestheticPrefs: questionnaire.aestheticPrefs as Record<string, unknown> | undefined,
            socialUsage: questionnaire.socialUsage as Record<string, unknown> | undefined,
            futureNeeds: questionnaire.futureNeeds as Record<string, unknown> | undefined,
            technologyPrefs: questionnaire.technologyPrefs as Record<string, unknown> | undefined,
            environmentalPrefs: questionnaire.environmentalPrefs as Record<string, unknown> | undefined,
            maintenancePrefs: questionnaire.maintenancePrefs as Record<string, unknown> | undefined,
          };
        }
      }

      // Check if ANTHROPIC_API_KEY is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        logger.warn('[AIGenerator] ANTHROPIC_API_KEY not set, using fallback algorithm');
        throw new Error('ANTHROPIC_API_KEY not configured');
      }

      const aiDesigns = await this.designGeneratorService.generateDesigns(
        preferences,
        numberOfDesigns,
        questionnaireData,
      );

      // Map AIGeneratedDesign to GeneratedDesign
      designs = aiDesigns.map((d: AIGeneratedDesign): GeneratedDesign => ({
        id: d.id,
        name: d.name,
        description: d.description,
        thumbnailUrl: d.thumbnailUrl,
        fullImageUrl: d.fullImageUrl,
        style: d.style,
        estimatedCost: d.estimatedCost,
        features: d.features,
        materials: d.materials,
        layout: d.layout,
        score: d.score,
        createdAt: d.createdAt,
        isAIGenerated: true,
        materialRationale: d.materialRationale,
        layoutExplanation: d.layoutExplanation,
        tradeoffs: d.tradeoffs,
        costBreakdown: d.costBreakdown,
      }));
      isAIGenerated = true;

      logger.info('[AIGenerator] AI generation completed successfully', {
        generationId,
        designCount: designs.length,
      });
    } catch (aiError) {
      // Fall back to algorithmic generation
      logger.warn('[AIGenerator] AI generation failed, using fallback algorithm', {
        error: aiError instanceof Error ? aiError.message : String(aiError),
        generationId,
      });

      try {
        designs = this.generateDesignsFallback(preferences, numberOfDesigns);
        isAIGenerated = false;
      } catch (fallbackError) {
        logger.error('[AIGenerator] Fallback generation also failed', {
          error: fallbackError,
          generationId,
        });

        // Update DB record as failed
        await prisma.aIGeneration.update({
          where: { id: generationId },
          data: {
            status: 'failed',
            errorMessage: fallbackError instanceof Error ? fallbackError.message : 'Generation failed',
          },
        });

        res.status(200).json({
          success: true,
          data: { generationId },
        });
        return;
      }
    }

    // Generate thumbnails for each design via Gemini (non-blocking, best-effort)
    try {
      const thumbnailPromises = designs.map(async (design) => {
        const description = `${design.name}: ${design.description} Style: ${design.style}, Layout: ${design.layout}, Materials: ${design.materials.cabinets}, ${design.materials.countertops}`;
        const thumbnailUrl = await this.imageGeneratorService.generateThumbnail(description);
        if (thumbnailUrl) {
          design.thumbnailUrl = thumbnailUrl;
          design.fullImageUrl = thumbnailUrl;
        }
      });

      await Promise.allSettled(thumbnailPromises);
    } catch (imgError) {
      logger.warn('[AIGenerator] Thumbnail generation had errors', {
        error: imgError instanceof Error ? imgError.message : String(imgError),
        generationId,
      });
    }

    // Update DB record with completed designs
    await prisma.aIGeneration.update({
      where: { id: generationId },
      data: {
        status: 'completed',
        designs: JSON.parse(JSON.stringify(designs)),
        isAIGenerated,
        completedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: { generationId },
    });
  });

  /**
   * GET /ai-generator/results/:generationId
   * Get generation results (polling endpoint).
   * Now reads from Prisma AIGeneration table instead of in-memory Map.
   */
  getResults = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const generationId = req.params['generationId'] || '';

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const generation = await prisma.aIGeneration.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      res.status(404).json({ success: false, error: 'Generation not found' });
      return;
    }

    // Verify ownership
    if (generation.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: generation.id,
        status: generation.status,
        projectId: generation.projectId,
        userId: generation.userId,
        designs: generation.designs as unknown as GeneratedDesign[],
        preferences: generation.preferences as Record<string, unknown>,
        createdAt: generation.createdAt.toISOString(),
        completedAt: generation.completedAt?.toISOString() || undefined,
        errorMessage: generation.errorMessage || undefined,
        isAIGenerated: generation.isAIGenerated,
      },
    });
  });

  /**
   * POST /ai-generator/save-design
   * Save a generated design as a Kitchen in the database
   */
  saveDesign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { generationId, designId, projectId } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (!generationId || !designId || !projectId) {
      res.status(400).json({
        success: false,
        error: 'generationId, designId, and projectId are required',
      });
      return;
    }

    // Verify generation exists and belongs to user (from DB)
    const generation = await prisma.aIGeneration.findUnique({
      where: { id: generationId },
    });
    if (!generation || generation.userId !== userId) {
      res.status(404).json({ success: false, error: 'Generation not found' });
      return;
    }

    // Find the design in the stored designs JSON
    const designs = generation.designs as unknown as GeneratedDesign[];
    const design = designs.find(d => d.id === designId);
    if (!design) {
      res.status(404).json({ success: false, error: 'Design not found' });
      return;
    }

    // Verify project ownership
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || (project.userId !== userId && req.user?.role !== 'admin')) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Map layout string to Prisma LayoutType enum
    const layoutMap: Record<string, string> = {
      'galley': 'galley',
      'l-shaped': 'l_shaped',
      'u-shaped': 'u_shaped',
      'open': 'open_plan',
      'island': 'island',
      'peninsula': 'peninsula',
    };

    // Map style string to Prisma KitchenStyle enum
    const styleMap: Record<string, string> = {
      'modern': 'modern',
      'traditional': 'traditional',
      'transitional': 'transitional',
      'farmhouse': 'farmhouse',
      'industrial': 'industrial',
      'scandinavian': 'scandinavian',
      'contemporary': 'contemporary',
      'mediterranean': 'mediterranean',
    };

    // Create Kitchen record
    const kitchen = await prisma.kitchen.create({
      data: {
        projectId,
        userId,
        name: design.name,
        style: (styleMap[design.style] || 'modern') as any,
        layout: (layoutMap[design.layout] || 'l_shaped') as any,
        width: 400,
        length: 300,
        height: 250,
        isGenerated: true,
        score: design.score,
        metadata: JSON.parse(JSON.stringify({
          generationId,
          designId,
          estimatedCost: design.estimatedCost,
          features: design.features,
          isAIGenerated: design.isAIGenerated,
          costBreakdown: design.costBreakdown,
          materialRationale: design.materialRationale,
          layoutExplanation: design.layoutExplanation,
          tradeoffs: design.tradeoffs,
        })),
        thumbnail: design.thumbnailUrl || undefined,
      },
    });

    // Create KitchenConfiguration
    const prefs = generation.preferences as Record<string, unknown>;
    await prisma.kitchenConfiguration.create({
      data: {
        kitchenId: kitchen.id,
        cabinetStyle: design.materials.cabinets,
        countertopMaterial: design.materials.countertops,
        backsplashType: design.materials.backsplash,
        flooringType: design.materials.flooring,
        colorPalette: prefs.colorPalette || [],
      },
    });

    res.status(201).json({
      success: true,
      data: {
        projectId,
        kitchenId: kitchen.id,
      },
      message: 'Design saved successfully',
    });
  });

  /**
   * Fallback: Generate design results from AI preferences using a deterministic algorithm.
   * Used when Claude API is unavailable or fails.
   */
  private generateDesignsFallback(
    preferences: Record<string, unknown>,
    count: number,
  ): GeneratedDesign[] {
    const style = (preferences.kitchenStyle as string) || 'modern';
    const layout = (preferences.layoutPreference as string) || 'l-shaped';
    const grade = (preferences.applianceGrade as string) || 'standard';
    const includeIsland = preferences.includeIsland as boolean || false;
    const storage = (preferences.storageEmphasis as string) || 'moderate';

    const basePrice = grade === 'professional' ? 25000 : grade === 'premium' ? 15000 : 8000;
    const styleInfo = styleDescriptions[style] || styleDescriptions['modern'];
    const layoutLabel = layoutDescriptions[layout] || layout;

    const designs: GeneratedDesign[] = [];

    const variations = [
      { suffix: 'Essentiel', priceMultiplier: 0.8, scoreBonus: 0 },
      { suffix: 'Confort', priceMultiplier: 1.0, scoreBonus: 5 },
      { suffix: 'Premium', priceMultiplier: 1.3, scoreBonus: 10 },
      { suffix: 'Excellence', priceMultiplier: 1.6, scoreBonus: 12 },
      { suffix: 'Sur Mesure', priceMultiplier: 2.0, scoreBonus: 15 },
    ];

    const defaultMaterials = { cabinets: 'Melamine', countertops: 'Stratifie', backsplash: 'Faience', flooring: 'Vinyle' };
    const materialsByGrade: Record<string, typeof defaultMaterials> = {
      standard: defaultMaterials,
      premium: { cabinets: 'Laque mate', countertops: 'Quartz', backsplash: 'Carrelage metro', flooring: 'Parquet stratifie' },
      professional: { cabinets: 'Bois massif', countertops: 'Granit', backsplash: 'Pierre naturelle', flooring: 'Parquet massif' },
    };

    for (let i = 0; i < count; i++) {
      const variation = variations[i % variations.length]!;
      const minCost = Math.round(basePrice * variation.priceMultiplier);
      const maxCost = Math.round(minCost * 1.25);
      const baseScore = 65 + Math.floor(Math.random() * 15);

      const features = [...(styleInfo?.features || [])];
      if (includeIsland) features.push('Ilot central');
      if (storage === 'maximum') features.push('Rangements optimises');
      if (preferences.sustainableOptions) features.push('Materiaux eco-responsables');
      if (preferences.smartHomeIntegration) features.push('Domotique integree');
      if (preferences.includePantry) features.push('Cellier integre');
      if (preferences.includeBreakfastNook) features.push('Coin petit-dejeuner');

      designs.push({
        id: crypto.randomUUID(),
        name: `Cuisine ${styleInfo?.name || style} ${variation.suffix}`,
        description: `Configuration ${layoutLabel} de style ${(styleInfo?.name || style).toLowerCase()}, niveau ${variation.suffix.toLowerCase()}.`,
        thumbnailUrl: '',
        fullImageUrl: '',
        style,
        estimatedCost: { min: minCost, max: maxCost, currency: 'EUR' },
        features,
        materials: materialsByGrade[grade] || defaultMaterials,
        layout,
        score: Math.min(100, baseScore + variation.scoreBonus),
        createdAt: new Date().toISOString(),
        isAIGenerated: false,
      });
    }

    // Sort by score descending
    designs.sort((a, b) => b.score - a.score);
    return designs;
  }
}

export const aiGeneratorController = new AIGeneratorController();
export default aiGeneratorController;
