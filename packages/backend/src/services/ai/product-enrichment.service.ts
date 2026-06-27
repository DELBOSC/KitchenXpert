import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) {
    return '';
  }
  return input
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 500);
}

// TypeScript interfaces for enrichment results
interface EnrichedSpecs {
  installationDepth?: number | null;
  ventilationGapBack?: number | null;
  ventilationGapSide?: number | null;
  electricalRequirement?: string | null;
  waterConnection?: boolean | null;
  gasConnection?: boolean | null;
  assemblyComplexity?: 'easy' | 'medium' | 'hard' | null;
  weightCapacity?: number | null;
  hingeType?: string | null;
  drawerSlideType?: string | null;
  mountingType?: string | null;
  loadCapacityShelf?: number | null;
}

interface WarrantyInfo {
  duration?: string | null;
  coverage?: string | null;
  conditions?: string | null;
}

interface EnergyDetails {
  annualConsumption?: number | null;
  waterPerCycle?: number | null;
  noiseLevel?: number | null;
  noiseMethod?: string | null;
  energyLabel?: string | null;
  standbyPower?: number | null;
}

interface EnrichmentResult {
  productId: string;
  specifications: EnrichedSpecs;
  warranty: WarrantyInfo;
  certifications: string[];
  energyDetails: EnergyDetails | null;
  confidence: number;
}

interface ProductToEnrich {
  id: string;
  type: string;
  name: string;
  brand?: string;
  description?: string;
  rawHtml?: string;
  currentSpecs?: Record<string, unknown>;
}

const EnrichedSpecsSchema = z.object({
  installationDepth: z
    .number()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  ventilationGapBack: z
    .number()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  ventilationGapSide: z
    .number()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  electricalRequirement: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  waterConnection: z
    .boolean()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  gasConnection: z
    .boolean()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  assemblyComplexity: z
    .enum(['easy', 'medium', 'hard'])
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  weightCapacity: z
    .number()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  hingeType: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  drawerSlideType: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  mountingType: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  loadCapacityShelf: z
    .number()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
});

const WarrantySchema = z.object({
  duration: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  coverage: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
  conditions: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v ?? undefined),
});

const EnergyDetailsSchema = z
  .object({
    annualConsumption: z
      .number()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
    waterPerCycle: z
      .number()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
    noiseLevel: z
      .number()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
    noiseMethod: z
      .string()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
    energyLabel: z
      .string()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
    standbyPower: z
      .number()
      .optional()
      .nullable()
      .transform((v) => v ?? undefined),
  })
  .optional()
  .nullable();

const EnrichmentResultSchema = z.object({
  productId: z.string(),
  specifications: EnrichedSpecsSchema,
  warranty: WarrantySchema,
  certifications: z.array(z.string()),
  energyDetails: EnergyDetailsSchema.transform((v) => v ?? null),
  confidence: z.number().min(0).max(1),
});

const EnrichmentBatchSchema = z.array(EnrichmentResultSchema);

export class ProductEnrichmentService {
  private anthropic: AnthropicService;
  private static instance: ProductEnrichmentService;

  private constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  static getInstance(): ProductEnrichmentService {
    if (!ProductEnrichmentService.instance) {
      ProductEnrichmentService.instance = new ProductEnrichmentService();
    }
    return ProductEnrichmentService.instance;
  }

  /**
   * Enrich a batch of 5-10 products in a single Claude call.
   * Products should be of the same type for better prompt efficiency.
   */
  async enrichBatch(products: ProductToEnrich[]): Promise<EnrichmentResult[]> {
    if (products.length === 0) {
      return [];
    }

    const batchSize = Math.min(products.length, 10);
    const batch = products.slice(0, batchSize);

    // Build the product descriptions for the prompt with sanitized inputs
    const productDescriptions = batch
      .map((p, i) => {
        const desc = sanitizeInput(p.description);
        const html = p.rawHtml
          ? `\nExtrait HTML: ${sanitizeInput(p.rawHtml.substring(0, 2000))}`
          : '';
        const specs = p.currentSpecs
          ? `\nSpecs existantes: ${sanitizeInput(JSON.stringify(p.currentSpecs))}`
          : '';
        return `--- Produit ${i + 1} (ID: ${p.id}, Type: ${sanitizeInput(p.type)}) ---
Nom: ${sanitizeInput(p.name)}
Marque: ${sanitizeInput(p.brand) || 'inconnue'}
Description: ${desc}${html}${specs}`;
      })
      .join('\n\n');

    const userPrompt = `Analyse ces ${batch.length} produits de cuisine et extrais les specifications techniques detaillees pour chacun.

${productDescriptions}

Reponds avec un tableau JSON de ${batch.length} objets, un par produit, dans l'ordre. Chaque objet doit avoir:
{
  "productId": "l'ID du produit",
  "specifications": {
    "installationDepth": number|null (mm),
    "ventilationGapBack": number|null (mm),
    "ventilationGapSide": number|null (mm),
    "electricalRequirement": string|null ("16A","20A","32A","gas"),
    "waterConnection": boolean|null,
    "gasConnection": boolean|null,
    "assemblyComplexity": "easy"|"medium"|"hard"|null,
    "weightCapacity": number|null (kg),
    "hingeType": string|null,
    "drawerSlideType": string|null,
    "mountingType": string|null,
    "loadCapacityShelf": number|null (kg)
  },
  "warranty": { "duration": string|null, "coverage": string|null, "conditions": string|null },
  "certifications": string[] (ex: ["CE", "NF EN 1116"]),
  "energyDetails": { "annualConsumption": number|null (kWh), "waterPerCycle": number|null (L), "noiseLevel": number|null (dB), "noiseMethod": string|null, "energyLabel": string|null, "standbyPower": number|null (W) } | null,
  "confidence": number (0-1, ta confiance globale dans l'enrichissement)
}`;

    const startTime = Date.now();

    try {
      const { data, inputTokens, outputTokens } = await this.anthropic.generateJSON<
        EnrichmentResult[]
      >({
        system: SYSTEM_PROMPTS.PRODUCT_ENRICHMENT,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: Math.min(4096, 4096),
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          const results = Array.isArray(parsed) ? parsed : [parsed];
          // Validate with Zod schema
          const validated = EnrichmentBatchSchema.parse(results);
          return validated;
        },
      });

      const durationMs = Date.now() - startTime;

      // Log usage (use 'system' as userId for automated enrichment)
      await this.anthropic.logUsage(
        'system',
        'product-enrichment',
        'claude-sonnet-4-5-20250929',
        inputTokens,
        outputTokens,
        durationMs
      );

      logger.info('[ProductEnrichment] Batch enriched', {
        count: data.length,
        durationMs,
        avgConfidence: data.reduce((sum, r) => sum + r.confidence, 0) / data.length,
      });

      return data;
    } catch (error) {
      logger.error('[ProductEnrichment] Batch enrichment failed', {
        error: error instanceof Error ? error.message : String(error),
        productCount: batch.length,
      });
      // Return empty results with failed status - caller should handle
      return batch.map((p) => ({
        productId: p.id,
        specifications: {},
        warranty: {},
        certifications: [],
        energyDetails: null,
        confidence: 0,
      }));
    }
  }

  /**
   * Enrich a single product
   */
  async enrichSingle(product: ProductToEnrich): Promise<EnrichmentResult> {
    const results = await this.enrichBatch([product]);
    return (
      results[0] || {
        productId: product.id,
        specifications: {},
        warranty: {},
        certifications: [],
        energyDetails: null,
        confidence: 0,
      }
    );
  }

  /**
   * Process pending enrichments from the database.
   * Called by the enrichment queue worker.
   */
  async processPendingBatch(batchSize: number = 5): Promise<number> {
    // Fetch pending enrichment records
    const pending = await prisma.productEnrichment.findMany({
      where: { status: 'pending' },
      take: batchSize,
      orderBy: { createdAt: 'asc' },
    });

    if (pending.length === 0) {
      return 0;
    }

    // Convert to ProductToEnrich format
    const products: ProductToEnrich[] = pending.map((p) => ({
      id: p.productId,
      type: p.productType,
      name: p.productId, // Will be overridden if we can load from product tables
      brand: p.brandId,
      description: p.rawDescription || undefined,
      rawHtml: p.rawHtml || undefined,
    }));

    // Enrich via Claude
    const results = await this.enrichBatch(products);

    // Update database records
    let enrichedCount = 0;
    for (let i = 0; i < pending.length; i++) {
      const record = pending[i];
      if (!record) {
        continue;
      }
      const result = results.find((r) => r.productId === record.productId) || results[i];

      if (!result) {
        continue;
      }

      try {
        if (result.confidence > 0) {
          await prisma.productEnrichment.update({
            where: { id: record.id },
            data: {
              status: 'enriched',
              enrichedSpecs: result.specifications as any,
              installationReqs: result.specifications as any,
              warranty: result.warranty as any,
              certifications: result.certifications,
              energyDetails: result.energyDetails as any,
              confidence: result.confidence,
              enrichedAt: new Date(),
            },
          });
          enrichedCount++;
        } else {
          await prisma.productEnrichment.update({
            where: { id: record.id },
            data: {
              status: 'failed',
              errorMessage: 'Claude returned zero confidence',
            },
          });
        }
      } catch (dbError) {
        logger.warn('[ProductEnrichment] Failed to update record', {
          recordId: record.id,
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
      }
    }

    logger.info('[ProductEnrichment] Processed batch', {
      total: pending.length,
      enriched: enrichedCount,
    });

    return enrichedCount;
  }

  /**
   * Create a pending enrichment record for a product (called after scraping)
   */
  async queueForEnrichment(params: {
    productType: string;
    productId: string;
    brandId: string;
    name: string;
    description?: string;
    rawHtml?: string;
  }): Promise<void> {
    try {
      await prisma.productEnrichment.upsert({
        where: {
          productType_productId: {
            productType: params.productType,
            productId: params.productId,
          },
        },
        create: {
          productType: params.productType,
          productId: params.productId,
          brandId: params.brandId,
          status: 'pending',
          rawDescription: params.description || null,
          rawHtml: params.rawHtml || null,
        },
        update: {
          // Only re-queue if not already enriched with high confidence
          status: 'pending',
          rawDescription: params.description || undefined,
          rawHtml: params.rawHtml || undefined,
        },
      });
    } catch (error) {
      logger.warn('[ProductEnrichment] Failed to queue product', {
        productId: params.productId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get enrichment statistics
   */
  async getStats(): Promise<{
    pending: number;
    enriched: number;
    failed: number;
    skipped: number;
    avgConfidence: number;
    byType: Record<string, number>;
    byBrand: Record<string, number>;
  }> {
    const [pending, enriched, failed, skipped] = await Promise.all([
      prisma.productEnrichment.count({ where: { status: 'pending' } }),
      prisma.productEnrichment.count({ where: { status: 'enriched' } }),
      prisma.productEnrichment.count({ where: { status: 'failed' } }),
      prisma.productEnrichment.count({ where: { status: 'skipped' } }),
    ]);

    const avgResult = await prisma.productEnrichment.aggregate({
      where: { status: 'enriched' },
      _avg: { confidence: true },
    });

    const byTypeRaw = await prisma.productEnrichment.groupBy({
      by: ['productType'],
      _count: true,
      where: { status: 'enriched' },
    });

    const byBrandRaw = await prisma.productEnrichment.groupBy({
      by: ['brandId'],
      _count: true,
      where: { status: 'enriched' },
    });

    const byType: Record<string, number> = {};
    for (const row of byTypeRaw) {
      byType[row.productType] = row._count;
    }

    const byBrand: Record<string, number> = {};
    for (const row of byBrandRaw) {
      byBrand[row.brandId] = row._count;
    }

    return {
      pending,
      enriched,
      failed,
      skipped,
      avgConfidence: avgResult._avg.confidence || 0,
      byType,
      byBrand,
    };
  }
}

export default ProductEnrichmentService;
