import { prisma } from '../../database/client';
import logger from '../../utils/logger';

/**
 * Bill of Materials item.
 * `source` distinguishes a real catalog line (`catalogRef` = a real SKU / appliance
 * reference, price from the DB) from an `estimated` line (config-derived, priced
 * from the indicative barème below — to be replaced by real products in BOM-b).
 */
export interface BOMItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  catalogRef: string | null;
  source: 'catalog' | 'estimated';
}

/**
 * Full Bill of Materials structure. `subtotalCatalog` / `subtotalEstimated`
 * split the subtotal by line source so the UI can show what is real vs estimated.
 */
export interface BillOfMaterials {
  kitchenId: string;
  items: BOMItem[];
  subtotal: number;
  subtotalCatalog: number;
  subtotalEstimated: number;
  tax: number;
  total: number;
  generatedAt: string;
}

const TVA_RATE = 0.2;

/**
 * Indicative flat estimates (EUR) for config-derived lines that have no placed
 * product yet. **Placeholder** — BOM-b will resolve these to real SKUs via the
 * catalogue matcher. Kept explicit (no scattered magic numbers) and auditable.
 */
const BAREME_ESTIMATION = {
  countertop: {
    quartz: 2500,
    granit: 3000,
    marbre: 4000,
    ceramique: 3500,
    dekton: 3500,
    inox: 2800,
    bois: 1500,
    stratifie: 800,
    _default: 1200,
  },
  flooring: {
    carrelage: 1500,
    parquet: 2000,
    stratifie: 1000,
    vinyle: 900,
    beton: 1800,
    _default: 1200,
  },
  backsplash: { verre: 800, inox: 900, carrelage: 600, faience: 500, credence: 600, _default: 600 },
  hardware: { _default: 300 },
  installation: 1500,
} as const;

/** Strip accents + lowercase for keyword matching. */
function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Round to 2 decimals (avoid dirty floats). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Coerce a Prisma Decimal/unknown to a non-negative finite number, else 0. */
function toPrice(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

/** Pick a barème price by keyword match on the (deaccented) value, else `_default`. */
function lookupBareme(table: Record<string, number>, value: string): number {
  const v = norm(value);
  for (const key of Object.keys(table)) {
    if (key !== '_default' && v.includes(key)) {
      return table[key]!;
    }
  }
  return table._default!;
}

/** Map a kitchen item `type` to a French BOM category label. */
function categoryFromType(type: string | null | undefined): string {
  const t = norm(type ?? '');
  if (/cabinet|caisson|meuble|colonne|facade|tiroir/.test(t)) {
    return 'Meubles';
  }
  if (/worktop|counter|plan/.test(t)) {
    return 'Plan de travail';
  }
  if (/sink|evier|tap|robinet/.test(t)) {
    return 'Plomberie';
  }
  if (/fridge|oven|hob|cooktop|dishwasher|hood|electro|appliance/.test(t)) {
    return 'Electromenager';
  }
  if (/light|eclairage/.test(t)) {
    return 'Eclairage';
  }
  return 'Mobilier';
}

/** Build an `estimated` BOM line (config-derived, no real SKU yet). */
function estimatedLine(name: string, category: string, price: number): BOMItem {
  const p = round2(price);
  return {
    name,
    category,
    quantity: 1,
    unitPrice: p,
    totalPrice: p,
    catalogRef: null,
    source: 'estimated',
  };
}

/** Kitchen config row shape the BOM reads (subset of Prisma KitchenConfiguration). */
interface ConfigRow {
  countertopMaterial?: string | null;
  flooringType?: string | null;
  backsplashType?: string | null;
  backsplashMaterial?: string | null;
  hardwareStyle?: string | null;
}

/**
 * BOMGeneratorService
 *
 * Generates a structured Bill of Materials (BOM) for a kitchen — **deterministic,
 * no LLM**. Placed items that carry a real catalog product/appliance become
 * `catalog` lines (real SKU + real DB price); the remaining config posts become
 * `estimated` lines priced from an explicit barème. Totals are computed in code.
 */
export class BOMGeneratorService {
  private static instance: BOMGeneratorService;

  private constructor() {}

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
      include: { product: true, appliance: true },
    });

    // Load kitchen configuration
    const kitchenConfig = await prisma.kitchenConfiguration.findUnique({
      where: { kitchenId },
    });

    // Load the kitchen itself (existence check)
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    try {
      const items: BOMItem[] = [
        ...this.catalogLines(kitchenItems),
        ...this.estimatedLines(kitchenConfig),
      ];

      const subtotalCatalog = round2(
        items.filter((i) => i.source === 'catalog').reduce((s, i) => s + i.totalPrice, 0)
      );
      const subtotalEstimated = round2(
        items.filter((i) => i.source === 'estimated').reduce((s, i) => s + i.totalPrice, 0)
      );
      const subtotal = round2(subtotalCatalog + subtotalEstimated);
      const tax = round2(subtotal * TVA_RATE);
      const total = round2(subtotal + tax);

      logger.info('[BOMGenerator] BOM generated', {
        kitchenId,
        itemCount: items.length,
        subtotalCatalog,
        subtotalEstimated,
        total,
      });

      return {
        kitchenId,
        items,
        subtotal,
        subtotalCatalog,
        subtotalEstimated,
        tax,
        total,
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
        subtotalCatalog: 0,
        subtotalEstimated: 0,
        tax: 0,
        total: 0,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /** One `catalog` line per placed item (real SKU/price when available). */
  private catalogLines(
    kitchenItems: Array<{
      type: string;
      name: string;
      price?: unknown;
      product?: { name: string; sku: string; price: unknown } | null;
      appliance?: { name: string; brand: string; model: string; price: unknown } | null;
    }>
  ): BOMItem[] {
    return kitchenItems.map((item) => {
      if (item.product) {
        const price = toPrice(item.product.price);
        return {
          name: item.product.name,
          category: categoryFromType(item.type),
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          catalogRef: item.product.sku, // real SKU
          source: 'catalog',
        };
      }
      if (item.appliance) {
        const price = toPrice(item.appliance.price);
        return {
          name: item.appliance.name,
          category: 'Electromenager',
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          catalogRef: `${item.appliance.brand} ${item.appliance.model}`, // Appliance has no SKU
          source: 'catalog',
        };
      }
      // Item without a linked product/appliance: use its own price if any.
      const price = toPrice(item.price);
      return {
        name: item.name,
        category: categoryFromType(item.type),
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        catalogRef: null,
        source: price > 0 ? 'catalog' : 'estimated',
      };
    });
  }

  /** `estimated` lines derived from the kitchen configuration (barème-priced). */
  private estimatedLines(config: ConfigRow | null): BOMItem[] {
    if (!config) {
      return [];
    }
    const lines: BOMItem[] = [];

    if (config.countertopMaterial) {
      lines.push(
        estimatedLine(
          'Plan de travail',
          'Plan de travail',
          lookupBareme(BAREME_ESTIMATION.countertop, config.countertopMaterial)
        )
      );
    }
    if (config.flooringType) {
      lines.push(
        estimatedLine('Sol', 'Sol', lookupBareme(BAREME_ESTIMATION.flooring, config.flooringType))
      );
    }
    if (config.backsplashType ?? config.backsplashMaterial) {
      lines.push(
        estimatedLine(
          'Credence',
          'Credence',
          lookupBareme(
            BAREME_ESTIMATION.backsplash,
            config.backsplashMaterial ?? config.backsplashType ?? ''
          )
        )
      );
    }
    if (config.hardwareStyle) {
      lines.push(
        estimatedLine('Quincaillerie', 'Quincaillerie', BAREME_ESTIMATION.hardware._default)
      );
    }
    // Labour/installation: a single estimated line whenever a config exists.
    lines.push(
      estimatedLine('Pose et installation', 'Installation', BAREME_ESTIMATION.installation)
    );

    return lines;
  }
}

export default BOMGeneratorService;
