import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) {return '';}
  return input
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 500);
}

/**
 * Bill of Materials item
 */
export interface BOMItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  catalogRef: string | null;
}

/**
 * Full Bill of Materials structure
 */
export interface BillOfMaterials {
  kitchenId: string;
  items: BOMItem[];
  subtotal: number;
  tax: number;
  total: number;
  generatedAt: string;
}

const BOMItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  catalogRef: z.string().optional().nullable().transform(v => v ?? null),
});

const RawBOMSchema = z.object({
  items: z.array(BOMItemSchema),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
});

/**
 * Raw shape expected from Claude's JSON output
 */
interface RawBOM {
  items: Array<{
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    catalogRef: string | null;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * BOMGeneratorService
 *
 * Generates a structured Bill of Materials (BOM) for a kitchen using Claude AI.
 * Loads kitchen items and configuration from the database, then asks Claude
 * to produce a comprehensive, priced BOM in JSON format.
 */
export class BOMGeneratorService {
  private anthropic: AnthropicService;
  private static instance: BOMGeneratorService;

  private constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  static getInstance(): BOMGeneratorService {
    if (!BOMGeneratorService.instance) {
      BOMGeneratorService.instance = new BOMGeneratorService();
    }
    return BOMGeneratorService.instance;
  }

  /**
   * Generate a Bill of Materials for a kitchen.
   *
   * @param kitchenId - The kitchen ID to generate a BOM for
   * @returns Structured BOM object
   */
  async generateBOM(kitchenId: string): Promise<BillOfMaterials> {
    // Load kitchen items with associated products and appliances
    const kitchenItems = await prisma.kitchenItem.findMany({
      where: { kitchenId },
      include: {
        product: true,
        appliance: true,
      },
    });

    // Load kitchen configuration
    const kitchenConfig = await prisma.kitchenConfiguration.findUnique({
      where: { kitchenId },
    });

    // Load the kitchen itself for context
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
    });

    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    // Build the prompt
    const prompt = this.buildPrompt(kitchen, kitchenItems, kitchenConfig);

    logger.info('[BOMGenerator] Generating BOM for kitchen', {
      kitchenId,
      itemCount: kitchenItems.length,
      hasConfig: !!kitchenConfig,
    });

    try {
      const result = await this.anthropic.generateJSON<RawBOM>({
        system: SYSTEM_PROMPTS.BOM_GENERATOR,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4096,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          const bom: RawBOM = parsed.items ? parsed : { items: [], subtotal: 0, tax: 0, total: 0 };

          // Validate with Zod
          const validated = RawBOMSchema.parse(bom);
          return validated;
        },
      });

      logger.info('[BOMGenerator] BOM generated successfully', {
        kitchenId,
        itemCount: result.data.items.length,
        total: result.data.total,
      });

      return {
        kitchenId,
        items: result.data.items,
        subtotal: result.data.subtotal,
        tax: result.data.tax,
        total: result.data.total,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[BOMGenerator] BOM generation failed', {
        error: error instanceof Error ? error.message : String(error),
        kitchenId,
      });
      return {
        kitchenId,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Build the prompt for Claude with kitchen data context.
   */
  private buildPrompt(
    kitchen: any,
    kitchenItems: any[],
    kitchenConfig: any | null,
  ): string {
    const sections: string[] = [];

    sections.push('Genere un devis detaille (Bill of Materials) pour cette cuisine.');
    sections.push('');

    // Kitchen info
    sections.push('=== INFORMATIONS CUISINE ===');
    sections.push(`- Nom: ${sanitizeInput(kitchen.name)}`);
    sections.push(`- Style: ${sanitizeInput(kitchen.style)}`);
    sections.push(`- Disposition: ${sanitizeInput(kitchen.layout)}`);
    sections.push(`- Dimensions: ${kitchen.width}cm x ${kitchen.length}cm x ${kitchen.height}cm`);

    // Configuration
    if (kitchenConfig) {
      sections.push('');
      sections.push('=== CONFIGURATION ===');
      if (kitchenConfig.cabinetStyle) {sections.push(`- Style caissons: ${sanitizeInput(kitchenConfig.cabinetStyle)}`);}
      if (kitchenConfig.cabinetFinish) {sections.push(`- Finition caissons: ${sanitizeInput(kitchenConfig.cabinetFinish)}`);}
      if (kitchenConfig.countertopMaterial) {sections.push(`- Plan de travail: ${sanitizeInput(kitchenConfig.countertopMaterial)}`);}
      if (kitchenConfig.countertopColor) {sections.push(`- Couleur plan: ${sanitizeInput(kitchenConfig.countertopColor)}`);}
      if (kitchenConfig.backsplashType) {sections.push(`- Credence: ${sanitizeInput(kitchenConfig.backsplashType)}`);}
      if (kitchenConfig.backsplashMaterial) {sections.push(`- Materiau credence: ${sanitizeInput(kitchenConfig.backsplashMaterial)}`);}
      if (kitchenConfig.flooringType) {sections.push(`- Sol: ${sanitizeInput(kitchenConfig.flooringType)}`);}
      if (kitchenConfig.hardwareStyle) {sections.push(`- Quincaillerie: ${sanitizeInput(kitchenConfig.hardwareStyle)}`);}
    }

    // Items
    if (kitchenItems.length > 0) {
      sections.push('');
      sections.push('=== ELEMENTS DANS LA CUISINE ===');
      for (const item of kitchenItems) {
        let itemDesc = `- ${sanitizeInput(item.name)} (${sanitizeInput(item.type)})`;
        if (item.brand) {itemDesc += ` - Marque: ${sanitizeInput(item.brand)}`;}
        if (item.model) {itemDesc += ` - Modele: ${sanitizeInput(item.model)}`;}
        if (item.price) {itemDesc += ` - Prix unitaire: ${item.price}EUR`;}
        if (item.product) {
          itemDesc += ` [Produit catalogue: ${sanitizeInput(item.product.name)}]`;
        }
        if (item.appliance) {
          itemDesc += ` [Electromenager: ${sanitizeInput(item.appliance.name)}]`;
        }
        sections.push(itemDesc);
      }
    }

    // Metadata (may contain cost estimates from AI generation)
    if (kitchen.metadata) {
      const meta = typeof kitchen.metadata === 'string'
        ? JSON.parse(kitchen.metadata)
        : kitchen.metadata;
      if (meta.estimatedCost) {
        sections.push('');
        sections.push('=== ESTIMATION PRECEDENTE ===');
        sections.push(`- Cout estime: ${meta.estimatedCost.min}EUR - ${meta.estimatedCost.max}EUR`);
      }
      if (meta.costBreakdown) {
        sections.push(`- Ventilation: ${JSON.stringify(meta.costBreakdown)}`);
      }
    }

    // Output format
    sections.push('');
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push(`Genere un JSON avec cette structure exacte:
{
  "items": [
    {
      "name": "Nom de l'element",
      "category": "caissons|plan_de_travail|credence|sol|electromenager|quincaillerie|eclairage|plomberie|installation|divers",
      "quantity": 1,
      "unitPrice": 100.00,
      "totalPrice": 100.00,
      "catalogRef": "REF-001 ou null"
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00
}`);
    sections.push('');
    sections.push('La taxe (TVA) est de 20% sur le sous-total.');
    sections.push('Inclure les couts d\'installation et de main d\'oeuvre.');
    sections.push('Si des elements n\'ont pas de prix specifique, estime un prix realiste.');
    sections.push('Reponds UNIQUEMENT avec le JSON, sans texte avant ou apres.');

    return sections.join('\n');
  }
}

export default BOMGeneratorService;
