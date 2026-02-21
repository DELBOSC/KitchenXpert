import { AnthropicService } from './anthropic.service.js';
import { SYSTEM_PROMPTS } from './prompt-templates.js';
import { prisma } from '../../database/client.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductMatch {
  id: string;
  productTypeA: string;
  productIdA: string;
  brandIdA: string;
  productTypeB: string;
  productIdB: string;
  brandIdB: string;
  matchScore: number;
  matchReason: string | null;
  isVerified: boolean;
  createdAt: Date;
}

/** Shape of a product passed into matching functions */
export interface ProductData {
  id: string;
  brandId: string;
  productType: string;
  name: string;
  brand?: string;
  reference?: string;
  ean?: string;
  width?: number;
  height?: number;
  depth?: number;
  price?: number;
  material?: string;
  color?: string;
  description?: string;
}

/** Claude response for a single pair comparison */
interface RawMatchResult {
  score: number;
  reason: string;
}

/** Claude response for a batch comparison */
interface RawBatchMatchResult {
  matches: Array<{
    candidateId: string;
    score: number;
    reason: string;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Dimensional tolerance for pre-filtering: +/- 10% */
const DIMENSION_TOLERANCE = 0.10;

/** Price tolerance for pre-filtering: +/- 20% */
const PRICE_TOLERANCE = 0.20;

/** Maximum number of candidates to send in a single Claude batch call */
const MAX_BATCH_SIZE = 15;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * ProductMatcherService
 *
 * Cross-matches products across different suppliers to find duplicates or
 * equivalents using Claude AI for semantic comparison, with pre-filtering
 * by dimensions and price to reduce API calls.
 */
export class ProductMatcherService {
  private anthropic: AnthropicService;
  private static instance: ProductMatcherService;

  private constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  static getInstance(): ProductMatcherService {
    if (!ProductMatcherService.instance) {
      ProductMatcherService.instance = new ProductMatcherService();
    }
    return ProductMatcherService.instance;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Compare two products via Claude to determine if they are the same,
   * equivalent, or different.
   *
   * @returns A score (0-1) and reason string.
   */
  async matchPair(
    productA: ProductData,
    productB: ProductData,
  ): Promise<{ score: number; reason: string }> {
    const prompt = this.buildPairPrompt(productA, productB);

    try {
      const result = await this.anthropic.generateJSON<RawMatchResult>({
        system: SYSTEM_PROMPTS.PRODUCT_MATCHER,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          if (typeof parsed.score !== 'number' || typeof parsed.reason !== 'string') {
            throw new Error('Invalid match result: missing score or reason');
          }
          return { score: parsed.score, reason: parsed.reason };
        },
      });

      return result.data;
    } catch (error) {
      logger.error('[ProductMatcher] matchPair failed', {
        error: error instanceof Error ? error.message : String(error),
        productIdA: productA.id,
        productIdB: productB.id,
      });
      return { score: 0, reason: 'Erreur lors de la comparaison' };
    }
  }

  /**
   * Find matching products from a list of candidates for a given product.
   * Pre-filters candidates by dimensions (+/-10%) and price (+/-20%) before
   * sending to Claude in batches.
   *
   * @returns Array of candidate matches with scores and reasons.
   */
  async findMatches(
    product: ProductData,
    candidates: ProductData[],
  ): Promise<Array<{ candidateId: string; score: number; reason: string }>> {
    // Pre-filter candidates by dimensional and price proximity
    const filtered = candidates.filter((c) =>
      this.isWithinTolerance(product, c),
    );

    logger.info('[ProductMatcher] Pre-filter results', {
      productId: product.id,
      totalCandidates: candidates.length,
      filteredCandidates: filtered.length,
    });

    if (filtered.length === 0) {
      return [];
    }

    // Process in batches to avoid excessively long prompts
    const allMatches: Array<{ candidateId: string; score: number; reason: string }> = [];

    for (let i = 0; i < filtered.length; i += MAX_BATCH_SIZE) {
      const batch = filtered.slice(i, i + MAX_BATCH_SIZE);
      const batchResults = await this.matchBatch(product, batch);
      allMatches.push(...batchResults);
    }

    // Sort by score descending
    allMatches.sort((a, b) => b.score - a.score);

    return allMatches;
  }

  /**
   * Cross-match all products of a given type between two brands.
   * Loads products from the database, pre-filters, batches through Claude,
   * and persists matches to the ProductMatch table.
   *
   * @returns Number of matches found and persisted.
   */
  async crossMatchBrands(
    brandIdA: string,
    brandIdB: string,
    productType: string,
  ): Promise<number> {
    logger.info('[ProductMatcher] Starting cross-brand matching', {
      brandIdA,
      brandIdB,
      productType,
    });

    // Load products for both brands
    const [productsA, productsB] = await Promise.all([
      prisma.product.findMany({
        where: {
          brand: brandIdA,
          category: { name: { contains: productType, mode: 'insensitive' } },
          isActive: true,
          deletedAt: null,
        },
        include: { category: true },
      }),
      prisma.product.findMany({
        where: {
          brand: brandIdB,
          category: { name: { contains: productType, mode: 'insensitive' } },
          isActive: true,
          deletedAt: null,
        },
        include: { category: true },
      }),
    ]);

    logger.info('[ProductMatcher] Products loaded', {
      brandACount: productsA.length,
      brandBCount: productsB.length,
    });

    if (productsA.length === 0 || productsB.length === 0) {
      return 0;
    }

    // Transform DB products to ProductData shape
    const dataA: ProductData[] = productsA.map((p) => this.toProductData(p, brandIdA));
    const dataB: ProductData[] = productsB.map((p) => this.toProductData(p, brandIdB));

    let matchCount = 0;

    // For each product in brand A, find matches in brand B
    for (const productA of dataA) {
      try {
        const matches = await this.findMatches(productA, dataB);

        // Persist matches with score >= 0.5
        for (const match of matches) {
          if (match.score < 0.5) continue;

          const candidateProduct = dataB.find((p) => p.id === match.candidateId);
          if (!candidateProduct) continue;

          try {
            await prisma.productMatch.upsert({
              where: {
                productIdA_productIdB: {
                  productIdA: productA.id,
                  productIdB: match.candidateId,
                },
              },
              update: {
                matchScore: match.score,
                matchReason: match.reason,
              },
              create: {
                productTypeA: productA.productType,
                productIdA: productA.id,
                brandIdA,
                productTypeB: candidateProduct.productType,
                productIdB: match.candidateId,
                brandIdB,
                matchScore: match.score,
                matchReason: match.reason,
                isVerified: false,
              },
            });
            matchCount++;
          } catch (err) {
            logger.warn('[ProductMatcher] Failed to upsert match', {
              productIdA: productA.id,
              productIdB: match.candidateId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } catch (err) {
        logger.error('[ProductMatcher] Failed to find matches for product', {
          productId: productA.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('[ProductMatcher] Cross-brand matching complete', {
      brandIdA,
      brandIdB,
      productType,
      matchCount,
    });

    return matchCount;
  }

  /**
   * Get all matches for a given product (as either side of the match).
   */
  async getMatchesForProduct(productId: string): Promise<ProductMatch[]> {
    return prisma.productMatch.findMany({
      where: {
        OR: [{ productIdA: productId }, { productIdB: productId }],
      },
      orderBy: { matchScore: 'desc' },
    });
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Pre-filter check: returns true if the candidate is within dimensional
   * and price tolerance of the reference product.
   */
  private isWithinTolerance(
    reference: ProductData,
    candidate: ProductData,
  ): boolean {
    // Skip self-comparison
    if (reference.id === candidate.id) return false;

    // Check width tolerance (+/- 10%)
    if (
      reference.width != null &&
      candidate.width != null &&
      !this.withinRange(reference.width, candidate.width, DIMENSION_TOLERANCE)
    ) {
      return false;
    }

    // Check height tolerance (+/- 10%)
    if (
      reference.height != null &&
      candidate.height != null &&
      !this.withinRange(reference.height, candidate.height, DIMENSION_TOLERANCE)
    ) {
      return false;
    }

    // Check depth tolerance (+/- 10%)
    if (
      reference.depth != null &&
      candidate.depth != null &&
      !this.withinRange(reference.depth, candidate.depth, DIMENSION_TOLERANCE)
    ) {
      return false;
    }

    // Check price tolerance (+/- 20%)
    if (
      reference.price != null &&
      candidate.price != null &&
      !this.withinRange(reference.price, candidate.price, PRICE_TOLERANCE)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if value is within tolerance of reference.
   */
  private withinRange(
    reference: number,
    value: number,
    tolerance: number,
  ): boolean {
    if (reference === 0) return value === 0;
    const lower = reference * (1 - tolerance);
    const upper = reference * (1 + tolerance);
    return value >= lower && value <= upper;
  }

  /**
   * Send a batch of candidates to Claude for comparison against one product.
   */
  private async matchBatch(
    product: ProductData,
    candidates: ProductData[],
  ): Promise<Array<{ candidateId: string; score: number; reason: string }>> {
    const prompt = this.buildBatchPrompt(product, candidates);

    try {
      const result = await this.anthropic.generateJSON<RawBatchMatchResult>({
        system: SYSTEM_PROMPTS.PRODUCT_MATCHER,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2048,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          if (!Array.isArray(parsed.matches)) {
            throw new Error('Invalid batch result: missing matches array');
          }
          for (const m of parsed.matches) {
            if (
              typeof m.candidateId !== 'string' ||
              typeof m.score !== 'number' ||
              typeof m.reason !== 'string'
            ) {
              throw new Error('Invalid match entry: missing candidateId, score, or reason');
            }
          }
          return parsed as RawBatchMatchResult;
        },
      });

      return result.data.matches;
    } catch (error) {
      logger.error('[ProductMatcher] matchBatch failed', {
        error: error instanceof Error ? error.message : String(error),
        productId: product.id,
        candidateCount: candidates.length,
      });
      return [];
    }
  }

  /**
   * Build prompt for comparing two specific products.
   */
  private buildPairPrompt(
    productA: ProductData,
    productB: ProductData,
  ): string {
    const sections: string[] = [];

    sections.push('Compare ces deux produits de cuisine et determine leur degre de correspondance.');
    sections.push('');
    sections.push('=== PRODUIT A ===');
    sections.push(this.formatProductForPrompt(productA));
    sections.push('');
    sections.push('=== PRODUIT B ===');
    sections.push(this.formatProductForPrompt(productB));
    sections.push('');
    sections.push('=== CRITERES DE CORRESPONDANCE ===');
    sections.push('- 1.0 = produit identique (meme reference fabricant/EAN)');
    sections.push('- 0.8-0.99 = equivalent proche (memes specs, marque/fournisseur different)');
    sections.push('- 0.5-0.79 = similaire (meme categorie, specs proches)');
    sections.push('- < 0.5 = produits differents');
    sections.push('');
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push('Reponds UNIQUEMENT avec un JSON valide:');
    sections.push('{');
    sections.push('  "score": 0.85,');
    sections.push('  "reason": "Explication courte en francais"');
    sections.push('}');

    return sections.join('\n');
  }

  /**
   * Build prompt for comparing one product against a batch of candidates.
   */
  private buildBatchPrompt(
    product: ProductData,
    candidates: ProductData[],
  ): string {
    const sections: string[] = [];

    sections.push(
      'Compare le produit de reference avec chacun des candidats ci-dessous.',
    );
    sections.push('');
    sections.push('=== PRODUIT DE REFERENCE ===');
    sections.push(this.formatProductForPrompt(product));
    sections.push('');
    sections.push('=== CANDIDATS ===');

    for (let i = 0; i < candidates.length; i++) {
      sections.push('--- Candidat ' + (i + 1) + ' (id: ' + candidates[i]!.id + ') ---');
      sections.push(this.formatProductForPrompt(candidates[i]!));
      sections.push('');
    }

    sections.push('=== CRITERES DE CORRESPONDANCE ===');
    sections.push('- 1.0 = produit identique (meme reference fabricant/EAN)');
    sections.push('- 0.8-0.99 = equivalent proche (memes specs, marque/fournisseur different)');
    sections.push('- 0.5-0.79 = similaire (meme categorie, specs proches)');
    sections.push('- < 0.5 = produits differents');
    sections.push('');
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push('Reponds UNIQUEMENT avec un JSON valide:');
    sections.push('{');
    sections.push('  "matches": [');
    sections.push('    {');
    sections.push('      "candidateId": "id-du-candidat",');
    sections.push('      "score": 0.85,');
    sections.push('      "reason": "Explication courte en francais"');
    sections.push('    }');
    sections.push('  ]');
    sections.push('}');
    sections.push('');
    sections.push('Inclus TOUS les candidats dans ta reponse, meme ceux avec un score faible.');

    return sections.join('\n');
  }

  /**
   * Format a product into a human-readable prompt section.
   */
  private formatProductForPrompt(product: ProductData): string {
    const lines: string[] = [];
    lines.push('- Nom: ' + product.name);
    lines.push('- Type: ' + product.productType);
    if (product.brand) lines.push('- Marque: ' + product.brand);
    if (product.reference) lines.push('- Reference: ' + product.reference);
    if (product.ean) lines.push('- EAN: ' + product.ean);
    if (product.width != null) lines.push('- Largeur: ' + product.width + 'mm');
    if (product.height != null) lines.push('- Hauteur: ' + product.height + 'mm');
    if (product.depth != null) lines.push('- Profondeur: ' + product.depth + 'mm');
    if (product.price != null) lines.push('- Prix: ' + product.price + 'EUR');
    if (product.material) lines.push('- Materiau: ' + product.material);
    if (product.color) lines.push('- Couleur: ' + product.color);
    if (product.description) {
      // Truncate long descriptions
      const desc =
        product.description.length > 200
          ? product.description.substring(0, 200) + '...'
          : product.description;
      lines.push('- Description: ' + desc);
    }
    return lines.join('\n');
  }

  /**
   * Convert a Prisma product record into a ProductData shape.
   */
  private toProductData(product: any, brandId: string): ProductData {
    return {
      id: product.id,
      brandId,
      productType: product.category?.name || product.type || 'unknown',
      name: product.name || '',
      brand: product.brand || undefined,
      reference: product.reference || product.sku || undefined,
      ean: product.ean || undefined,
      width: product.width != null ? Number(product.width) : undefined,
      height: product.height != null ? Number(product.height) : undefined,
      depth: product.depth != null ? Number(product.depth) : undefined,
      price: product.price != null ? Number(product.price) : undefined,
      material: product.material || undefined,
      color: product.color || undefined,
      description: product.description || undefined,
    };
  }
}

export default ProductMatcherService;
