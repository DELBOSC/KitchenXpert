/**
 * Product Classifier Service
 *
 * Intelligent product classification using pattern matching,
 * keyword analysis, and ML-like scoring algorithms.
 */

import { logger } from '../utils/logger.js';
import type { CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { WorktopMaterial, WorktopFinish } from '../models/worktop.js';
import type { FacadeStyle, FacadeMaterial } from '../models/facade.js';
import type { ApplianceType } from '../models/appliance.js';
import type { AccessoryType } from '../models/accessory.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export type ProductType =
  | 'cabinet'
  | 'worktop'
  | 'facade'
  | 'handle'
  | 'appliance'
  | 'accessory'
  | 'collection'
  | 'unknown';

export interface ClassificationResult {
  type: ProductType;
  confidence: number; // 0-1
  subType?: string;
  category?: string;
  scores: Record<ProductType, number>;
  features: ExtractedFeatures;
  reasoning: string[];
}

export interface ExtractedFeatures {
  // Dimensions
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    thickness?: number;
  };
  // Materials
  material?: string;
  finish?: string;
  color?: string;
  // Counts
  doorCount?: number;
  drawerCount?: number;
  shelfCount?: number;
  // Technical
  energyClass?: string;
  powerWatts?: number;
  volumeLiters?: number;
  noiseLevel?: number;
  // Price
  price?: number;
  priceUnit?: string;
  // Identifiers
  reference?: string;
  ean?: string;
  brand?: string;
  collection?: string;
}

interface KeywordScore {
  keyword: string;
  weight: number;
  type: ProductType;
  subType?: string;
}

interface PatternRule {
  pattern: RegExp;
  type: ProductType;
  subType?: string;
  weight: number;
  extract?: (match: RegExpMatchArray) => Partial<ExtractedFeatures>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Keyword Database
// ═══════════════════════════════════════════════════════════════════════════

const KEYWORDS: KeywordScore[] = [
  // Cabinets - Base
  { keyword: 'meuble bas', weight: 0.95, type: 'cabinet', subType: 'base' },
  { keyword: 'élément bas', weight: 0.95, type: 'cabinet', subType: 'base' },
  { keyword: 'caisson bas', weight: 0.9, type: 'cabinet', subType: 'base' },
  { keyword: 'base cabinet', weight: 0.95, type: 'cabinet', subType: 'base' },
  { keyword: 'meuble sous-évier', weight: 0.95, type: 'cabinet', subType: 'sink' },
  { keyword: 'sous évier', weight: 0.9, type: 'cabinet', subType: 'sink' },

  // Cabinets - Wall
  { keyword: 'meuble haut', weight: 0.95, type: 'cabinet', subType: 'wall' },
  { keyword: 'élément haut', weight: 0.95, type: 'cabinet', subType: 'wall' },
  { keyword: 'caisson haut', weight: 0.9, type: 'cabinet', subType: 'wall' },
  { keyword: 'wall cabinet', weight: 0.95, type: 'cabinet', subType: 'wall' },
  { keyword: 'élément mural', weight: 0.85, type: 'cabinet', subType: 'wall' },

  // Cabinets - Tall
  { keyword: 'colonne', weight: 0.9, type: 'cabinet', subType: 'tall' },
  { keyword: 'armoire', weight: 0.85, type: 'cabinet', subType: 'tall' },
  { keyword: 'tall cabinet', weight: 0.95, type: 'cabinet', subType: 'tall' },
  { keyword: 'meuble colonne', weight: 0.95, type: 'cabinet', subType: 'tall' },
  { keyword: 'colonne four', weight: 0.95, type: 'cabinet', subType: 'oven' },

  // Cabinets - Corner
  { keyword: 'angle', weight: 0.8, type: 'cabinet', subType: 'corner' },
  { keyword: "meuble d'angle", weight: 0.95, type: 'cabinet', subType: 'corner' },
  { keyword: "élément d'angle", weight: 0.95, type: 'cabinet', subType: 'corner' },
  { keyword: 'corner cabinet', weight: 0.95, type: 'cabinet', subType: 'corner' },

  // Cabinets - Categories
  { keyword: 'tiroir', weight: 0.7, type: 'cabinet', subType: 'drawer' },
  { keyword: 'tiroirs', weight: 0.7, type: 'cabinet', subType: 'drawer' },
  { keyword: 'casserolier', weight: 0.85, type: 'cabinet', subType: 'drawer' },

  // Worktops
  { keyword: 'plan de travail', weight: 0.98, type: 'worktop' },
  { keyword: 'plan-de-travail', weight: 0.98, type: 'worktop' },
  { keyword: 'worktop', weight: 0.98, type: 'worktop' },
  { keyword: 'countertop', weight: 0.98, type: 'worktop' },
  { keyword: 'comptoir', weight: 0.85, type: 'worktop' },
  { keyword: 'stratifié', weight: 0.6, type: 'worktop' },
  { keyword: 'quartz', weight: 0.7, type: 'worktop' },
  { keyword: 'granit', weight: 0.7, type: 'worktop' },
  { keyword: 'dekton', weight: 0.8, type: 'worktop' },
  { keyword: 'corian', weight: 0.8, type: 'worktop' },
  { keyword: 'céramique plan', weight: 0.8, type: 'worktop' },

  // Facades
  { keyword: 'façade', weight: 0.95, type: 'facade' },
  { keyword: 'facade', weight: 0.95, type: 'facade' },
  { keyword: 'porte de cuisine', weight: 0.9, type: 'facade' },
  { keyword: 'porte meuble', weight: 0.85, type: 'facade' },
  { keyword: 'façade de tiroir', weight: 0.95, type: 'facade' },
  { keyword: 'front', weight: 0.6, type: 'facade' },
  { keyword: 'door front', weight: 0.9, type: 'facade' },
  { keyword: 'laqué', weight: 0.5, type: 'facade' },
  { keyword: 'mélaminé', weight: 0.5, type: 'facade' },

  // Handles
  { keyword: 'poignée', weight: 0.95, type: 'handle' },
  { keyword: 'poignee', weight: 0.95, type: 'handle' },
  { keyword: 'bouton', weight: 0.7, type: 'handle' },
  { keyword: 'bouton de meuble', weight: 0.9, type: 'handle' },
  { keyword: 'handle', weight: 0.95, type: 'handle' },
  { keyword: 'knob', weight: 0.9, type: 'handle' },
  { keyword: 'tirette', weight: 0.85, type: 'handle' },

  // Appliances
  { keyword: 'four', weight: 0.9, type: 'appliance', subType: 'oven' },
  { keyword: 'four encastrable', weight: 0.98, type: 'appliance', subType: 'oven' },
  { keyword: 'oven', weight: 0.95, type: 'appliance', subType: 'oven' },
  { keyword: 'micro-ondes', weight: 0.98, type: 'appliance', subType: 'microwave' },
  { keyword: 'microwave', weight: 0.98, type: 'appliance', subType: 'microwave' },
  { keyword: 'réfrigérateur', weight: 0.98, type: 'appliance', subType: 'refrigerator' },
  { keyword: 'frigo', weight: 0.9, type: 'appliance', subType: 'refrigerator' },
  { keyword: 'refrigerator', weight: 0.98, type: 'appliance', subType: 'refrigerator' },
  { keyword: 'congélateur', weight: 0.98, type: 'appliance', subType: 'freezer' },
  { keyword: 'freezer', weight: 0.98, type: 'appliance', subType: 'freezer' },
  { keyword: 'lave-vaisselle', weight: 0.98, type: 'appliance', subType: 'dishwasher' },
  { keyword: 'lave vaisselle', weight: 0.98, type: 'appliance', subType: 'dishwasher' },
  { keyword: 'dishwasher', weight: 0.98, type: 'appliance', subType: 'dishwasher' },
  { keyword: 'plaque', weight: 0.7, type: 'appliance', subType: 'cooktop' },
  { keyword: 'plaque de cuisson', weight: 0.98, type: 'appliance', subType: 'cooktop' },
  { keyword: 'table de cuisson', weight: 0.98, type: 'appliance', subType: 'cooktop' },
  { keyword: 'induction', weight: 0.8, type: 'appliance', subType: 'cooktop' },
  { keyword: 'cooktop', weight: 0.98, type: 'appliance', subType: 'cooktop' },
  { keyword: 'hotte', weight: 0.95, type: 'appliance', subType: 'hood' },
  { keyword: 'hotte aspirante', weight: 0.98, type: 'appliance', subType: 'hood' },
  { keyword: 'hood', weight: 0.95, type: 'appliance', subType: 'hood' },
  { keyword: 'évier', weight: 0.95, type: 'appliance', subType: 'sink' },
  { keyword: 'sink', weight: 0.95, type: 'appliance', subType: 'sink' },
  { keyword: 'robinet', weight: 0.95, type: 'appliance', subType: 'faucet' },
  { keyword: 'mitigeur', weight: 0.95, type: 'appliance', subType: 'faucet' },
  { keyword: 'faucet', weight: 0.95, type: 'appliance', subType: 'faucet' },
  { keyword: 'cave à vin', weight: 0.98, type: 'appliance', subType: 'wine_cooler' },
  { keyword: 'wine cooler', weight: 0.98, type: 'appliance', subType: 'wine_cooler' },
  { keyword: 'machine à café', weight: 0.98, type: 'appliance', subType: 'coffee_machine' },
  { keyword: 'cafetière', weight: 0.85, type: 'appliance', subType: 'coffee_machine' },

  // Accessories
  { keyword: 'accessoire', weight: 0.7, type: 'accessory' },
  { keyword: 'accessory', weight: 0.7, type: 'accessory' },
  { keyword: 'rangement', weight: 0.6, type: 'accessory' },
  { keyword: 'organisateur', weight: 0.8, type: 'accessory' },
  { keyword: 'éclairage', weight: 0.7, type: 'accessory', subType: 'lighting' },
  { keyword: 'led', weight: 0.5, type: 'accessory', subType: 'lighting' },
  { keyword: 'panier', weight: 0.7, type: 'accessory', subType: 'basket' },
  { keyword: 'étagère', weight: 0.6, type: 'accessory', subType: 'shelf' },
  { keyword: 'poubelle', weight: 0.85, type: 'accessory', subType: 'waste_bin' },
  { keyword: 'crédence', weight: 0.9, type: 'accessory', subType: 'backsplash' },
  { keyword: 'plinthe', weight: 0.85, type: 'accessory', subType: 'plinth' },
  { keyword: 'corniche', weight: 0.85, type: 'accessory', subType: 'cornice' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Pattern Rules
// ═══════════════════════════════════════════════════════════════════════════

const PATTERN_RULES: PatternRule[] = [
  // Dimension patterns for cabinets
  {
    pattern: /(\d{2,4})\s*[xX×]\s*(\d{2,4})\s*[xX×]\s*(\d{2,4})\s*(?:mm|cm)?/,
    type: 'cabinet',
    weight: 0.3,
    extract: (match) => ({
      dimensions: {
        width: parseInt(match[1] ?? '0', 10),
        height: parseInt(match[2] ?? '0', 10),
        depth: parseInt(match[3] ?? '0', 10),
      },
    }),
  },

  // Width patterns common for cabinets
  {
    pattern: /(?:largeur|l\.?)\s*[:=]?\s*(\d{2,4})\s*(?:mm|cm)?/i,
    type: 'cabinet',
    weight: 0.2,
    extract: (match) => ({
      dimensions: { width: parseInt(match[1] ?? '0', 10) },
    }),
  },

  // Thickness pattern for worktops
  {
    pattern: /(?:épaisseur|ep\.?)\s*[:=]?\s*(\d{1,3})\s*(?:mm|cm)?/i,
    type: 'worktop',
    weight: 0.4,
    extract: (match) => ({
      dimensions: { thickness: parseInt(match[1] ?? '0', 10) },
    }),
  },

  // Price per m² or linear meter patterns
  {
    pattern: /(\d+[.,]?\d*)\s*€?\s*(?:\/|par)\s*m[²2]/i,
    type: 'worktop',
    weight: 0.5,
    extract: (match) => ({
      price: parseFloat((match[1] ?? '0').replace(',', '.')),
      priceUnit: 'm2',
    }),
  },

  // Door count patterns
  {
    pattern: /(\d+)\s*(?:porte|door)s?/i,
    type: 'cabinet',
    weight: 0.3,
    extract: (match) => ({
      doorCount: parseInt(match[1] ?? '0', 10),
    }),
  },

  // Drawer count patterns
  {
    pattern: /(\d+)\s*(?:tiroir|drawer)s?/i,
    type: 'cabinet',
    weight: 0.3,
    extract: (match) => ({
      drawerCount: parseInt(match[1] ?? '0', 10),
    }),
  },

  // Energy class patterns
  {
    pattern: /classe\s*(?:énergétique|energie)?\s*[:=]?\s*([A-G](?:\+{1,3})?)/i,
    type: 'appliance',
    weight: 0.6,
    extract: (match) => ({
      energyClass: (match[1] ?? '').toUpperCase(),
    }),
  },

  // Power patterns
  {
    pattern: /(\d+)\s*(?:W|watts?)/i,
    type: 'appliance',
    weight: 0.4,
    extract: (match) => ({
      powerWatts: parseInt(match[1] ?? '0', 10),
    }),
  },

  // Volume patterns
  {
    pattern: /(\d+)\s*(?:L|litres?|liters?)/i,
    type: 'appliance',
    weight: 0.4,
    extract: (match) => ({
      volumeLiters: parseInt(match[1] ?? '0', 10),
    }),
  },

  // Noise level patterns
  {
    pattern: /(\d+)\s*(?:dB|décibels?)/i,
    type: 'appliance',
    weight: 0.3,
    extract: (match) => ({
      noiseLevel: parseInt(match[1] ?? '0', 10),
    }),
  },

  // EAN/Barcode patterns
  {
    pattern: /(?:EAN|barcode|code-barre)\s*[:=]?\s*(\d{13})/i,
    type: 'unknown',
    weight: 0,
    extract: (match) => ({
      ean: match[1] ?? '',
    }),
  },

  // Reference patterns
  {
    pattern: /(?:réf(?:érence)?|ref|SKU|art\.?)\s*[:=.]?\s*([A-Z0-9-]{4,20})/i,
    type: 'unknown',
    weight: 0,
    extract: (match) => ({
      reference: match[1] ?? '',
    }),
  },

  // Hole centers for handles
  {
    pattern: /(?:entraxe|cc|c\.c\.?)\s*[:=]?\s*(\d{2,4})\s*(?:mm)?/i,
    type: 'handle',
    weight: 0.7,
    extract: (match) => ({
      dimensions: { width: parseInt(match[1] ?? '0', 10) }, // Using width for hole centers
    }),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Dimension Heuristics
// ═══════════════════════════════════════════════════════════════════════════

interface DimensionHeuristic {
  type: ProductType;
  subType?: string;
  check: (dims: NonNullable<ExtractedFeatures['dimensions']>) => boolean;
  weight: number;
}

const DIMENSION_HEURISTICS: DimensionHeuristic[] = [
  // Standard cabinet widths
  {
    type: 'cabinet',
    check: (d) =>
      !!d.width && [150, 200, 300, 400, 450, 500, 600, 800, 900, 1000, 1200].includes(d.width),
    weight: 0.3,
  },
  // Base cabinet heights
  {
    type: 'cabinet',
    subType: 'base',
    check: (d) => !!d.height && d.height >= 700 && d.height <= 900,
    weight: 0.3,
  },
  // Wall cabinet heights
  {
    type: 'cabinet',
    subType: 'wall',
    check: (d) => !!d.height && d.height >= 300 && d.height <= 720,
    weight: 0.3,
  },
  // Tall cabinet heights
  {
    type: 'cabinet',
    subType: 'tall',
    check: (d) => !!d.height && d.height >= 1800 && d.height <= 2400,
    weight: 0.4,
  },
  // Worktop thickness
  {
    type: 'worktop',
    check: (d) => !!d.thickness && [12, 20, 28, 30, 38, 40, 60].includes(d.thickness),
    weight: 0.5,
  },
  // Handle dimensions (small)
  {
    type: 'handle',
    check: (d) => !!d.width && d.width <= 400 && (!d.height || d.height <= 50),
    weight: 0.4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Product Classifier Class
// ═══════════════════════════════════════════════════════════════════════════

export class ProductClassifier {
  private keywordIndex: Map<string, KeywordScore[]>;
  private minConfidence: number;

  constructor(options?: { minConfidence?: number }) {
    this.minConfidence = options?.minConfidence ?? 0.5;
    this.keywordIndex = this.buildKeywordIndex();
  }

  private buildKeywordIndex(): Map<string, KeywordScore[]> {
    const index = new Map<string, KeywordScore[]>();

    for (const kw of KEYWORDS) {
      // Index by first word for faster lookup
      const firstWord = (kw.keyword.split(' ')[0] ?? '').toLowerCase();
      const existing = index.get(firstWord) || [];
      existing.push(kw);
      index.set(firstWord, existing);
    }

    return index;
  }

  /**
   * Classify a product based on name, description, and other text
   */
  classify(
    name: string,
    description?: string,
    url?: string,
    attributes?: Record<string, string>
  ): ClassificationResult {
    const reasoning: string[] = [];
    const scores: Record<ProductType, number> = {
      cabinet: 0,
      worktop: 0,
      facade: 0,
      handle: 0,
      appliance: 0,
      accessory: 0,
      collection: 0,
      unknown: 0,
    };

    // Combine all text for analysis
    const allText = [name, description || '', url || '', ...Object.values(attributes || {})]
      .join(' ')
      .toLowerCase();

    // Extract features from patterns
    const features = this.extractFeatures(allText);

    // Score from keywords
    const keywordScores = this.scoreFromKeywords(allText);
    for (const [type, score] of Object.entries(keywordScores)) {
      scores[type as ProductType] += score;
      if (score > 0.3) {
        reasoning.push(`Keyword match for ${type}: +${score.toFixed(2)}`);
      }
    }

    // Score from patterns
    const patternScores = this.scoreFromPatterns(allText, features);
    for (const [type, score] of Object.entries(patternScores)) {
      scores[type as ProductType] += score;
      if (score > 0.2) {
        reasoning.push(`Pattern match for ${type}: +${score.toFixed(2)}`);
      }
    }

    // Score from dimensions
    if (features.dimensions) {
      const dimScores = this.scoreFromDimensions(features.dimensions);
      for (const [type, score] of Object.entries(dimScores)) {
        scores[type as ProductType] += score;
        if (score > 0.2) {
          reasoning.push(`Dimension heuristic for ${type}: +${score.toFixed(2)}`);
        }
      }
    }

    // Score from URL patterns
    if (url) {
      const urlScores = this.scoreFromUrl(url);
      for (const [type, score] of Object.entries(urlScores)) {
        scores[type as ProductType] += score;
        if (score > 0.2) {
          reasoning.push(`URL pattern for ${type}: +${score.toFixed(2)}`);
        }
      }
    }

    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      for (const type of Object.keys(scores) as ProductType[]) {
        scores[type] /= maxScore;
      }
    }

    // Find best match
    let bestType: ProductType = 'unknown';
    let bestScore = 0;
    let bestSubType: string | undefined;

    for (const [type, score] of Object.entries(scores) as [ProductType, number][]) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    // Get subtype from keywords with highest score
    if (bestType !== 'unknown') {
      bestSubType = this.findBestSubType(allText, bestType);
    }

    // Confidence adjustment
    const confidence = bestScore >= this.minConfidence ? bestScore : 0;

    if (confidence < this.minConfidence) {
      reasoning.push(`Confidence ${bestScore.toFixed(2)} below threshold ${this.minConfidence}`);
      bestType = 'unknown';
    }

    return {
      type: bestType,
      confidence,
      subType: bestSubType,
      category: bestSubType, // Alias for compatibility
      scores,
      features,
      reasoning,
    };
  }

  /**
   * Extract features from text using patterns
   */
  private extractFeatures(text: string): ExtractedFeatures {
    const features: ExtractedFeatures = {};

    for (const rule of PATTERN_RULES) {
      const match = text.match(rule.pattern);
      if (match && rule.extract) {
        const extracted = rule.extract(match);
        Object.assign(features, this.mergeFeatures(features, extracted));
      }
    }

    // Extract color from common color words
    const colors = this.extractColors(text);
    if (colors.length > 0) {
      features.color = colors[0];
    }

    // Extract material
    const material = this.extractMaterial(text);
    if (material) {
      features.material = material;
    }

    // Extract finish
    const finish = this.extractFinish(text);
    if (finish) {
      features.finish = finish;
    }

    return features;
  }

  private mergeFeatures(a: ExtractedFeatures, b: Partial<ExtractedFeatures>): ExtractedFeatures {
    const result = { ...a };

    if (b.dimensions) {
      result.dimensions = { ...result.dimensions, ...b.dimensions };
    }

    for (const key of Object.keys(b) as (keyof ExtractedFeatures)[]) {
      if (key !== 'dimensions' && b[key] !== undefined) {
        (result as any)[key] = b[key];
      }
    }

    return result;
  }

  /**
   * Score from keyword matching
   */
  private scoreFromKeywords(text: string): Record<ProductType, number> {
    const scores: Record<ProductType, number> = {
      cabinet: 0,
      worktop: 0,
      facade: 0,
      handle: 0,
      appliance: 0,
      accessory: 0,
      collection: 0,
      unknown: 0,
    };

    // Check all keywords
    for (const kw of KEYWORDS) {
      if (text.includes(kw.keyword.toLowerCase())) {
        scores[kw.type] += kw.weight;
      }
    }

    return scores;
  }

  /**
   * Score from pattern matching
   */
  private scoreFromPatterns(
    text: string,
    features: ExtractedFeatures
  ): Record<ProductType, number> {
    const scores: Record<ProductType, number> = {
      cabinet: 0,
      worktop: 0,
      facade: 0,
      handle: 0,
      appliance: 0,
      accessory: 0,
      collection: 0,
      unknown: 0,
    };

    for (const rule of PATTERN_RULES) {
      if (text.match(rule.pattern)) {
        scores[rule.type] += rule.weight;
      }
    }

    return scores;
  }

  /**
   * Score from dimension heuristics
   */
  private scoreFromDimensions(
    dims: NonNullable<ExtractedFeatures['dimensions']>
  ): Record<ProductType, number> {
    const scores: Record<ProductType, number> = {
      cabinet: 0,
      worktop: 0,
      facade: 0,
      handle: 0,
      appliance: 0,
      accessory: 0,
      collection: 0,
      unknown: 0,
    };

    for (const heuristic of DIMENSION_HEURISTICS) {
      if (heuristic.check(dims)) {
        scores[heuristic.type] += heuristic.weight;
      }
    }

    return scores;
  }

  /**
   * Score from URL patterns
   */
  private scoreFromUrl(url: string): Record<ProductType, number> {
    const scores: Record<ProductType, number> = {
      cabinet: 0,
      worktop: 0,
      facade: 0,
      handle: 0,
      appliance: 0,
      accessory: 0,
      collection: 0,
      unknown: 0,
    };

    const lower = url.toLowerCase();

    // URL path patterns
    const urlPatterns: [RegExp, ProductType, number][] = [
      [/meuble|cabinet|caisson/i, 'cabinet', 0.5],
      [/plan-de-travail|worktop|comptoir/i, 'worktop', 0.6],
      [/facade|porte-cuisine|door-front/i, 'facade', 0.5],
      [/poignee|handle|bouton/i, 'handle', 0.5],
      [/electromenager|appliance|four|hotte|frigo|lave-vaisselle/i, 'appliance', 0.5],
      [/accessoire|rangement|eclairage/i, 'accessory', 0.4],
      [/collection|gamme|serie/i, 'collection', 0.4],
    ];

    for (const [pattern, type, weight] of urlPatterns) {
      if (pattern.test(lower)) {
        scores[type] += weight;
      }
    }

    return scores;
  }

  /**
   * Find best subtype for a product type
   */
  private findBestSubType(text: string, type: ProductType): string | undefined {
    let bestSubType: string | undefined;
    let bestWeight = 0;

    for (const kw of KEYWORDS) {
      if (kw.type === type && kw.subType && text.includes(kw.keyword.toLowerCase())) {
        if (kw.weight > bestWeight) {
          bestWeight = kw.weight;
          bestSubType = kw.subType;
        }
      }
    }

    return bestSubType;
  }

  /**
   * Extract colors from text
   */
  private extractColors(text: string): string[] {
    const colorPatterns: [RegExp, string][] = [
      [/\bblanc\b/i, 'white'],
      [/\bnoir\b/i, 'black'],
      [/\bgris\b/i, 'grey'],
      [/\banthracite\b/i, 'anthracite'],
      [/\bbeige\b/i, 'beige'],
      [/\bcrème\b/i, 'cream'],
      [/\bmarron\b/i, 'brown'],
      [/\bchêne\b/i, 'oak'],
      [/\bnoyer\b/i, 'walnut'],
      [/\binox\b/i, 'stainless'],
      [/\bbleu\b/i, 'blue'],
      [/\bvert\b/i, 'green'],
      [/\brouge\b/i, 'red'],
    ];

    const found: string[] = [];
    for (const [pattern, color] of colorPatterns) {
      if (pattern.test(text)) {
        found.push(color);
      }
    }

    return found;
  }

  /**
   * Extract material from text
   */
  private extractMaterial(text: string): string | undefined {
    const materialPatterns: [RegExp, string][] = [
      [/\bstratifié\b/i, 'laminate'],
      [/\bmélaminé\b/i, 'melamine'],
      [/\bbois\s+massif\b/i, 'solid_wood'],
      [/\bchêne\b/i, 'oak'],
      [/\bnoyer\b/i, 'walnut'],
      [/\bquartz\b/i, 'quartz'],
      [/\bgranit\b/i, 'granite'],
      [/\bmarbre\b/i, 'marble'],
      [/\bcéramique\b/i, 'ceramic'],
      [/\binox\b/i, 'stainless_steel'],
      [/\bacier\b/i, 'steel'],
      [/\bverre\b/i, 'glass'],
      [/\blaqué\b/i, 'lacquered'],
      [/\bacrylique\b/i, 'acrylic'],
      [/\bfenix\b/i, 'fenix'],
    ];

    for (const [pattern, material] of materialPatterns) {
      if (pattern.test(text)) {
        return material;
      }
    }

    return undefined;
  }

  /**
   * Extract finish from text
   */
  private extractFinish(text: string): string | undefined {
    const finishPatterns: [RegExp, string][] = [
      [/\bmat\b/i, 'matte'],
      [/\bbrillant\b/i, 'glossy'],
      [/\bsatiné\b/i, 'satin'],
      [/\bbrossé\b/i, 'brushed'],
      [/\btexturé\b/i, 'textured'],
      [/\bpoli\b/i, 'polished'],
    ];

    for (const [pattern, finish] of finishPatterns) {
      if (pattern.test(text)) {
        return finish;
      }
    }

    return undefined;
  }

  /**
   * Batch classify multiple products
   */
  classifyBatch(
    products: Array<{
      name: string;
      description?: string;
      url?: string;
      attributes?: Record<string, string>;
    }>
  ): ClassificationResult[] {
    return products.map((p) => this.classify(p.name, p.description, p.url, p.attributes));
  }

  /**
   * Enhanced classification: uses keyword/pattern-based classify() first,
   * then falls back to LLM if confidence is below 0.5.
   */
  async classifyEnhanced(
    name: string,
    description?: string,
    url?: string,
    attributes?: Record<string, string>
  ): Promise<ClassificationResult> {
    const result = this.classify(name, description, url, attributes);

    if (result.confidence >= 0.5) {
      return result;
    }

    // Fallback to LLM classification
    logger.info('[ProductClassifier] Low confidence, attempting LLM fallback', {
      name,
      confidence: result.confidence,
      type: result.type,
    });

    try {
      const llmResult = await this.classifyWithLLM(name, description, attributes);
      if (llmResult) {
        // Merge LLM result with extracted features from pattern-based classification
        return {
          ...result,
          type: llmResult.type as ProductType,
          subType: llmResult.subType || result.subType,
          category: llmResult.subType || result.category,
          confidence: llmResult.confidence,
          reasoning: [...result.reasoning, `LLM fallback: ${llmResult.reasoning}`],
        };
      }
    } catch (error) {
      logger.warn('[ProductClassifier] LLM fallback failed, using pattern result', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  /**
   * Classify a product using an LLM (Anthropic Claude) as a fallback.
   * Uses dynamic import to check if @anthropic-ai/sdk is available.
   * Returns null if the SDK is not installed or the call fails.
   */
  private async classifyWithLLM(
    name: string,
    description?: string,
    attributes?: Record<string, string>
  ): Promise<{ type: string; subType: string; confidence: number; reasoning: string } | null> {
    try {
      // Dynamic import to check if @anthropic-ai/sdk is available
      const { default: Anthropic } = await import('@anthropic-ai/sdk');

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        logger.warn('[ProductClassifier] ANTHROPIC_API_KEY not set, skipping LLM classification');
        return null;
      }

      const client = new Anthropic({ apiKey });

      const validTypes = [
        'cabinet',
        'worktop',
        'facade',
        'handle',
        'appliance',
        'accessory',
        'collection',
        'unknown',
      ];

      const prompt = `Classifie ce produit de cuisine.

Nom: "${name}"
${description ? `Description: "${description}"` : ''}
${attributes ? `Attributs: ${JSON.stringify(attributes)}` : ''}

Types valides: ${validTypes.join(', ')}
Sous-types exemples: base, wall, tall, corner, drawer, sink, oven, cooktop, hood, refrigerator, dishwasher, faucet, lighting, backsplash, plinth, cornice

Reponds UNIQUEMENT avec un JSON valide:
{
  "type": "un des types valides",
  "subType": "sous-type ou empty string",
  "confidence": 0.0-1.0,
  "reasoning": "explication courte en 1 phrase"
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
        .map((b) => b.text)
        .join('');

      // Try to extract JSON from possible markdown code blocks
      let jsonStr = text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1]!.trim();
      }

      const parsed = JSON.parse(jsonStr) as {
        type: string;
        subType: string;
        confidence: number;
        reasoning: string;
      };

      // Validate the returned type
      if (!validTypes.includes(parsed.type)) {
        parsed.type = 'unknown';
        parsed.confidence = 0;
      }

      // Clamp confidence
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));

      logger.info('[ProductClassifier] LLM classification result', {
        name,
        type: parsed.type,
        subType: parsed.subType,
        confidence: parsed.confidence,
      });

      return parsed;
    } catch (error) {
      // If module not found, log gracefully
      if (
        error instanceof Error &&
        (error.message.includes('Cannot find module') || error.message.includes('MODULE_NOT_FOUND'))
      ) {
        logger.info('[ProductClassifier] @anthropic-ai/sdk not available, LLM fallback disabled');
      } else {
        logger.warn('[ProductClassifier] LLM classification error', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createProductClassifier(options?: { minConfidence?: number }): ProductClassifier {
  return new ProductClassifier(options);
}

export default ProductClassifier;
