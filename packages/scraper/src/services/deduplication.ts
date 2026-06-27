/**
 * Product Deduplication Service
 *
 * Identifies and handles duplicate products using multiple strategies:
 * - Exact matching (reference, EAN, SKU)
 * - Fuzzy name matching
 * - Dimension similarity
 * - Image fingerprinting
 * - Price clustering
 *
 * Supports optional Prisma integration for persistence.
 * Falls back to in-memory storage when database is unavailable.
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { getPrismaClient, isPrismaConnected } from '../database/client.js';
import type { PrismaClient } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface ProductFingerprint {
  id: string;
  brandId: string;
  reference?: string;
  ean?: string;
  sku?: string;
  name: string;
  normalizedName: string;
  nameTokens: string[];
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  price?: number;
  imageHashes: string[];
  contentHash: string;
  createdAt: Date;
}

export interface DuplicateMatch {
  sourceId: string;
  targetId: string;
  confidence: number; // 0-1
  matchType: MatchType;
  details: MatchDetails;
}

export type MatchType =
  | 'exact_reference'
  | 'exact_ean'
  | 'exact_sku'
  | 'fuzzy_name'
  | 'dimension_match'
  | 'image_match'
  | 'content_hash'
  | 'composite';

export interface MatchDetails {
  matchedFields: string[];
  scores: Record<string, number>;
  reasoning: string;
}

export interface DeduplicationResult {
  totalProducts: number;
  uniqueProducts: number;
  duplicatesFound: number;
  groups: DuplicateGroup[];
  processingTime: number;
}

export interface DuplicateGroup {
  primaryId: string;
  duplicateIds: string[];
  matches: DuplicateMatch[];
  confidence: number;
}

export interface DeduplicationConfig {
  // Thresholds
  nameSimilarityThreshold: number; // 0-1, default 0.85
  dimensionTolerancePercent: number; // default 5%
  priceTolerancePercent: number; // default 10%
  minImageMatchScore: number; // 0-1, default 0.9

  // Weights for composite scoring
  weights: {
    reference: number;
    ean: number;
    sku: number;
    name: number;
    dimensions: number;
    price: number;
    images: number;
  };

  // Options
  caseSensitive: boolean;
  ignoreMinorDimensionDiffs: boolean;
  crossBrandDedup: boolean;
  persistToDatabase: boolean; // Enable Prisma persistence for fingerprints
}

const DEFAULT_CONFIG: DeduplicationConfig = {
  nameSimilarityThreshold: 0.85,
  dimensionTolerancePercent: 5,
  priceTolerancePercent: 10,
  minImageMatchScore: 0.9,
  weights: {
    reference: 1.0,
    ean: 1.0,
    sku: 0.95,
    name: 0.7,
    dimensions: 0.6,
    price: 0.4,
    images: 0.8,
  },
  caseSensitive: false,
  ignoreMinorDimensionDiffs: true,
  crossBrandDedup: false,
  persistToDatabase: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// Deduplication Service Class
// ═══════════════════════════════════════════════════════════════════════════

export class DeduplicationService {
  private config: DeduplicationConfig;
  private fingerprintIndex: Map<string, ProductFingerprint> = new Map();
  private referenceIndex: Map<string, string[]> = new Map();
  private eanIndex: Map<string, string[]> = new Map();
  private skuIndex: Map<string, string[]> = new Map();
  private nameIndex: Map<string, string[]> = new Map();
  private prisma: PrismaClient | null = null;

  constructor(config?: Partial<DeduplicationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initPrisma();
  }

  /**
   * Initialize Prisma client for persistence
   */
  private initPrisma(): void {
    if (!this.config.persistToDatabase) {
      logger.info('Deduplication: Database persistence disabled');
      return;
    }

    try {
      this.prisma = getPrismaClient();
      if (this.prisma) {
        logger.info('Deduplication: Prisma client initialized');
      } else {
        logger.info('Deduplication: Prisma not available, using memory storage');
      }
    } catch (error) {
      logger.warn('Deduplication: Failed to initialize Prisma', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.prisma = null;
    }
  }

  /**
   * Check if Prisma is available for persistence
   */
  private isPrismaAvailable(): boolean {
    return this.prisma !== null && isPrismaConnected();
  }

  /**
   * Create a fingerprint for a product
   */
  createFingerprint(product: {
    id: string;
    brandId: string;
    reference?: string;
    ean?: string;
    sku?: string;
    name: string;
    description?: string;
    width?: number;
    height?: number;
    depth?: number;
    price?: number;
    imageUrls?: string[];
  }): ProductFingerprint {
    const normalizedName = this.normalizeName(product.name);
    const nameTokens = this.tokenizeName(normalizedName);

    // Create content hash from stable properties
    const contentHashInput = [
      product.brandId,
      normalizedName,
      product.width,
      product.height,
      product.depth,
    ]
      .filter(Boolean)
      .join('|');

    const contentHash = crypto
      .createHash('sha256')
      .update(contentHashInput)
      .digest('hex')
      .substring(0, 16);

    // Create image hashes (simplified - in production, use perceptual hashing)
    const imageHashes = (product.imageUrls || []).map((url) =>
      crypto.createHash('md5').update(url).digest('hex').substring(0, 8)
    );

    return {
      id: product.id,
      brandId: product.brandId,
      reference: product.reference?.trim(),
      ean: product.ean?.replace(/\D/g, ''),
      sku: product.sku?.trim().toUpperCase(),
      name: product.name,
      normalizedName,
      nameTokens,
      dimensions: {
        width: product.width,
        height: product.height,
        depth: product.depth,
      },
      price: product.price,
      imageHashes,
      contentHash,
      createdAt: new Date(),
    };
  }

  /**
   * Add a product to the index
   */
  addProduct(fingerprint: ProductFingerprint): void {
    this.fingerprintIndex.set(fingerprint.id, fingerprint);

    // Index by reference
    if (fingerprint.reference) {
      const key = this.normalizeReference(fingerprint.reference);
      const existing = this.referenceIndex.get(key) || [];
      existing.push(fingerprint.id);
      this.referenceIndex.set(key, existing);
    }

    // Index by EAN
    if (fingerprint.ean) {
      const existing = this.eanIndex.get(fingerprint.ean) || [];
      existing.push(fingerprint.id);
      this.eanIndex.set(fingerprint.ean, existing);
    }

    // Index by SKU
    if (fingerprint.sku) {
      const existing = this.skuIndex.get(fingerprint.sku) || [];
      existing.push(fingerprint.id);
      this.skuIndex.set(fingerprint.sku, existing);
    }

    // Index by normalized name first word for quick lookup
    const firstToken = fingerprint.nameTokens[0];
    if (firstToken) {
      const existing = this.nameIndex.get(firstToken) || [];
      existing.push(fingerprint.id);
      this.nameIndex.set(firstToken, existing);
    }
  }

  /**
   * Find duplicates for a product
   */
  findDuplicates(fingerprint: ProductFingerprint): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];
    const checkedIds = new Set<string>([fingerprint.id]);

    // Check exact reference match
    if (fingerprint.reference) {
      const key = this.normalizeReference(fingerprint.reference);
      const candidates = this.referenceIndex.get(key) || [];
      for (const candidateId of candidates) {
        if (checkedIds.has(candidateId)) continue;
        checkedIds.add(candidateId);

        const candidate = this.fingerprintIndex.get(candidateId);
        if (candidate && this.shouldCompare(fingerprint, candidate)) {
          matches.push({
            sourceId: fingerprint.id,
            targetId: candidateId,
            confidence: 1.0,
            matchType: 'exact_reference',
            details: {
              matchedFields: ['reference'],
              scores: { reference: 1.0 },
              reasoning: `Exact reference match: ${fingerprint.reference}`,
            },
          });
        }
      }
    }

    // Check exact EAN match
    if (fingerprint.ean) {
      const candidates = this.eanIndex.get(fingerprint.ean) || [];
      for (const candidateId of candidates) {
        if (checkedIds.has(candidateId)) continue;
        checkedIds.add(candidateId);

        const candidate = this.fingerprintIndex.get(candidateId);
        if (candidate && this.shouldCompare(fingerprint, candidate)) {
          matches.push({
            sourceId: fingerprint.id,
            targetId: candidateId,
            confidence: 1.0,
            matchType: 'exact_ean',
            details: {
              matchedFields: ['ean'],
              scores: { ean: 1.0 },
              reasoning: `Exact EAN match: ${fingerprint.ean}`,
            },
          });
        }
      }
    }

    // Check exact SKU match
    if (fingerprint.sku) {
      const candidates = this.skuIndex.get(fingerprint.sku) || [];
      for (const candidateId of candidates) {
        if (checkedIds.has(candidateId)) continue;
        checkedIds.add(candidateId);

        const candidate = this.fingerprintIndex.get(candidateId);
        if (candidate && this.shouldCompare(fingerprint, candidate)) {
          matches.push({
            sourceId: fingerprint.id,
            targetId: candidateId,
            confidence: 0.95,
            matchType: 'exact_sku',
            details: {
              matchedFields: ['sku'],
              scores: { sku: 1.0 },
              reasoning: `Exact SKU match: ${fingerprint.sku}`,
            },
          });
        }
      }
    }

    // Check fuzzy name match for candidates with same first token
    const firstToken = fingerprint.nameTokens[0];
    if (firstToken) {
      const candidates = this.nameIndex.get(firstToken) || [];
      for (const candidateId of candidates) {
        if (checkedIds.has(candidateId)) continue;

        const candidate = this.fingerprintIndex.get(candidateId);
        if (!candidate || !this.shouldCompare(fingerprint, candidate)) continue;

        const compositeMatch = this.computeCompositeMatch(fingerprint, candidate);
        if (compositeMatch.confidence >= this.config.nameSimilarityThreshold) {
          checkedIds.add(candidateId);
          matches.push(compositeMatch);
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Run deduplication on all indexed products
   */
  deduplicate(): DeduplicationResult {
    const startTime = Date.now();
    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    for (const [id, fingerprint] of this.fingerprintIndex) {
      if (processedIds.has(id)) continue;

      const duplicates = this.findDuplicates(fingerprint);

      if (duplicates.length > 0) {
        const duplicateIds = duplicates.map((d) => d.targetId);
        const avgConfidence =
          duplicates.reduce((sum, d) => sum + d.confidence, 0) / duplicates.length;

        groups.push({
          primaryId: id,
          duplicateIds,
          matches: duplicates,
          confidence: avgConfidence,
        });

        processedIds.add(id);
        duplicateIds.forEach((did) => processedIds.add(did));
      }
    }

    const totalDuplicates = groups.reduce((sum, g) => sum + g.duplicateIds.length, 0);

    return {
      totalProducts: this.fingerprintIndex.size,
      uniqueProducts: this.fingerprintIndex.size - totalDuplicates,
      duplicatesFound: totalDuplicates,
      groups,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Clear all indices
   */
  clear(): void {
    this.fingerprintIndex.clear();
    this.referenceIndex.clear();
    this.eanIndex.clear();
    this.skuIndex.clear();
    this.nameIndex.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Matching Algorithms
  // ═══════════════════════════════════════════════════════════════════════════

  private computeCompositeMatch(
    source: ProductFingerprint,
    target: ProductFingerprint
  ): DuplicateMatch {
    const scores: Record<string, number> = {};
    const matchedFields: string[] = [];
    let weightedSum = 0;
    let totalWeight = 0;

    // Name similarity
    const nameSimilarity = this.computeNameSimilarity(source.normalizedName, target.normalizedName);
    scores.name = nameSimilarity;
    if (nameSimilarity >= this.config.nameSimilarityThreshold) {
      matchedFields.push('name');
    }
    weightedSum += nameSimilarity * this.config.weights.name;
    totalWeight += this.config.weights.name;

    // Dimension similarity
    if (source.dimensions && target.dimensions) {
      const dimSimilarity = this.computeDimensionSimilarity(source.dimensions, target.dimensions);
      scores.dimensions = dimSimilarity;
      if (dimSimilarity > 0.9) {
        matchedFields.push('dimensions');
      }
      weightedSum += dimSimilarity * this.config.weights.dimensions;
      totalWeight += this.config.weights.dimensions;
    }

    // Price similarity
    if (source.price && target.price) {
      const priceSimilarity = this.computePriceSimilarity(source.price, target.price);
      scores.price = priceSimilarity;
      if (priceSimilarity > 0.9) {
        matchedFields.push('price');
      }
      weightedSum += priceSimilarity * this.config.weights.price;
      totalWeight += this.config.weights.price;
    }

    // Image similarity
    if (source.imageHashes.length > 0 && target.imageHashes.length > 0) {
      const imageSimilarity = this.computeImageSimilarity(source.imageHashes, target.imageHashes);
      scores.images = imageSimilarity;
      if (imageSimilarity >= this.config.minImageMatchScore) {
        matchedFields.push('images');
      }
      weightedSum += imageSimilarity * this.config.weights.images;
      totalWeight += this.config.weights.images;
    }

    // Content hash match
    if (source.contentHash === target.contentHash) {
      scores.contentHash = 1.0;
      matchedFields.push('contentHash');
      weightedSum += 1.0 * 0.5; // Additional bonus
      totalWeight += 0.5;
    }

    const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      sourceId: source.id,
      targetId: target.id,
      confidence,
      matchType: 'composite',
      details: {
        matchedFields,
        scores,
        reasoning: this.generateReasoning(matchedFields, scores),
      },
    };
  }

  private computeNameSimilarity(name1: string, name2: string): number {
    if (name1 === name2) return 1.0;

    // Jaccard similarity on tokens
    const tokens1 = new Set(this.tokenizeName(name1));
    const tokens2 = new Set(this.tokenizeName(name2));

    const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Levenshtein-based similarity for short names
    if (name1.length < 50 && name2.length < 50) {
      const levenshteinSimilarity =
        1 - this.levenshteinDistance(name1, name2) / Math.max(name1.length, name2.length);
      return Math.max(jaccardSimilarity, levenshteinSimilarity);
    }

    return jaccardSimilarity;
  }

  private computeDimensionSimilarity(
    dim1: { width?: number; height?: number; depth?: number },
    dim2: { width?: number; height?: number; depth?: number }
  ): number {
    const comparisons: number[] = [];
    const tolerance = this.config.dimensionTolerancePercent / 100;

    if (dim1.width && dim2.width) {
      const diff = Math.abs(dim1.width - dim2.width) / Math.max(dim1.width, dim2.width);
      comparisons.push(diff <= tolerance ? 1 - diff : 0);
    }

    if (dim1.height && dim2.height) {
      const diff = Math.abs(dim1.height - dim2.height) / Math.max(dim1.height, dim2.height);
      comparisons.push(diff <= tolerance ? 1 - diff : 0);
    }

    if (dim1.depth && dim2.depth) {
      const diff = Math.abs(dim1.depth - dim2.depth) / Math.max(dim1.depth, dim2.depth);
      comparisons.push(diff <= tolerance ? 1 - diff : 0);
    }

    if (comparisons.length === 0) return 0;

    return comparisons.reduce((sum, v) => sum + v, 0) / comparisons.length;
  }

  private computePriceSimilarity(price1: number, price2: number): number {
    const diff = Math.abs(price1 - price2) / Math.max(price1, price2);
    const tolerance = this.config.priceTolerancePercent / 100;

    if (diff <= tolerance) {
      return 1 - diff / tolerance;
    }

    return 0;
  }

  private computeImageSimilarity(hashes1: string[], hashes2: string[]): number {
    if (hashes1.length === 0 || hashes2.length === 0) return 0;

    const set1 = new Set(hashes1);
    const set2 = new Set(hashes2);

    const intersection = [...set1].filter((h) => set2.has(h)).length;
    const union = new Set([...hashes1, ...hashes2]).size;

    return intersection / union;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0) as number[]);

    for (let i = 0; i <= m; i++) dp[i]![0] = i;
    for (let j = 0; j <= n; j++) dp[0]![j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i]![j] = dp[i - 1]![j - 1]!;
        } else {
          dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
        }
      }
    }

    return dp[m]![n]!;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private shouldCompare(source: ProductFingerprint, target: ProductFingerprint): boolean {
    // Don't compare with self
    if (source.id === target.id) return false;

    // Cross-brand comparison check
    if (!this.config.crossBrandDedup && source.brandId !== target.brandId) {
      return false;
    }

    return true;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  private tokenizeName(name: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
      'de',
      'la',
      'le',
      'les',
      'du',
      'des',
      'un',
      'une',
      'et',
      'en',
      'avec',
      'pour',
      'sur',
      'dans',
      'par',
      'au',
      'aux',
      'ce',
      'cette',
      'ces',
      'the',
      'a',
      'an',
      'and',
      'or',
      'for',
      'with',
      'in',
      'on',
      'at',
    ]);

    return name.split(/\s+/).filter((token) => token.length > 1 && !stopWords.has(token));
  }

  private normalizeReference(ref: string): string {
    return ref
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  }

  private generateReasoning(
    matchedFields: string[],
    scores: Record<string, number | undefined>
  ): string {
    const parts: string[] = [];

    if (matchedFields.includes('name') && scores.name !== undefined) {
      parts.push(`Name similarity: ${(scores.name * 100).toFixed(0)}%`);
    }
    if (matchedFields.includes('dimensions') && scores.dimensions !== undefined) {
      parts.push(`Dimensions match: ${(scores.dimensions * 100).toFixed(0)}%`);
    }
    if (matchedFields.includes('price') && scores.price !== undefined) {
      parts.push(`Price similar: ${(scores.price * 100).toFixed(0)}%`);
    }
    if (matchedFields.includes('images') && scores.images !== undefined) {
      parts.push(`${(scores.images * 100).toFixed(0)}% image overlap`);
    }
    if (matchedFields.includes('contentHash')) {
      parts.push('Content hash match');
    }

    return parts.join(', ') || 'Low confidence match';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Statistics
  // ═══════════════════════════════════════════════════════════════════════════

  getStats(): {
    totalProducts: number;
    indexedReferences: number;
    indexedEans: number;
    indexedSkus: number;
    indexedNames: number;
  } {
    return {
      totalProducts: this.fingerprintIndex.size,
      indexedReferences: this.referenceIndex.size,
      indexedEans: this.eanIndex.size,
      indexedSkus: this.skuIndex.size,
      indexedNames: this.nameIndex.size,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Database Persistence Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save a fingerprint to the database (using ScrapeCache as URL cache)
   * The contentHash is stored for change detection
   */
  async saveFingerprintToDatabase(fingerprint: ProductFingerprint, url?: string): Promise<void> {
    if (!this.isPrismaAvailable() || !url) {
      return;
    }

    try {
      await this.prisma!.scrapeCache.upsert({
        where: { url },
        update: {
          contentHash: fingerprint.contentHash,
          lastChecked: new Date(),
          isValid: true,
        },
        create: {
          url,
          contentHash: fingerprint.contentHash,
          lastChecked: new Date(),
          isValid: true,
        },
      });

      logger.debug('Fingerprint saved to database', {
        productId: fingerprint.id,
        contentHash: fingerprint.contentHash,
      });
    } catch (error) {
      logger.warn('Failed to save fingerprint to database', {
        productId: fingerprint.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load fingerprint from database by URL
   */
  async loadFingerprintFromDatabase(url: string): Promise<{
    contentHash: string;
    lastChecked: Date;
  } | null> {
    if (!this.isPrismaAvailable()) {
      return null;
    }

    try {
      const cached = await this.prisma!.scrapeCache.findUnique({
        where: { url },
        select: {
          contentHash: true,
          lastChecked: true,
        },
      });

      if (cached?.contentHash) {
        return {
          contentHash: cached.contentHash,
          lastChecked: cached.lastChecked,
        };
      }

      return null;
    } catch (error) {
      logger.warn('Failed to load fingerprint from database', {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Check if content has changed based on stored hash
   */
  async hasContentChanged(url: string, newContentHash: string): Promise<boolean> {
    const stored = await this.loadFingerprintFromDatabase(url);

    if (!stored) {
      // No previous record, consider as changed
      return true;
    }

    return stored.contentHash !== newContentHash;
  }

  /**
   * Batch save fingerprints to database
   */
  async saveFingerprintsToDatabase(
    fingerprints: Array<{ fingerprint: ProductFingerprint; url: string }>
  ): Promise<{ saved: number; failed: number }> {
    if (!this.isPrismaAvailable()) {
      return { saved: 0, failed: 0 };
    }

    let saved = 0;
    let failed = 0;

    for (const { fingerprint, url } of fingerprints) {
      try {
        await this.saveFingerprintToDatabase(fingerprint, url);
        saved++;
      } catch {
        failed++;
      }
    }

    logger.info('Fingerprints saved to database', { saved, failed });
    return { saved, failed };
  }

  /**
   * Clean up old cache entries from database
   */
  async cleanupOldCacheEntries(olderThanDays: number = 30): Promise<number> {
    if (!this.isPrismaAvailable()) {
      return 0;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma!.scrapeCache.deleteMany({
        where: {
          lastChecked: {
            lt: cutoffDate,
          },
        },
      });

      logger.info('Cleaned up old cache entries', { count: result.count });
      return result.count;
    } catch (error) {
      logger.warn('Failed to clean up old cache entries', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Check if database persistence is available
   */
  hasDatabaseConnection(): boolean {
    return this.isPrismaAvailable();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createDeduplicationService(
  config?: Partial<DeduplicationConfig>
): DeduplicationService {
  return new DeduplicationService(config);
}

export default DeduplicationService;
