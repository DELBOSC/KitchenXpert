/**
 * IkeaStrategy (CLAUDE.md §15.8 roadmap step a) — API-first.
 *
 * Uses IKEA's internal search API, proven live (cf §15.7):
 * sik.search.blue.cdtapps.com/fr/fr/search-result-page. No Cloudflare on that
 * host, structured JSON. Cascade level N2 (§15.8 P1).
 *
 * SINGLE SOURCE OF TRUTH (§15.8 Q3.b) : lives in @kitchenxpert/common so the
 * backend can route it without depending on the heavy scraper package. Depends
 * only on the JsonFetcher port (the scraper's ApiAdapter satisfies it). The
 * scraper's strategies/ikea-strategy.ts is now a re-export shim.
 */
import type { IngestionStrategy, JsonFetcher } from './ingestion-strategy';
import {
  validateUnifiedProduct,
  type ParseResult,
  type ProductType,
} from './unified-product.schema';

/** IKEA internal search API (proven open, no Cloudflare). */
const IKEA_SEARCH_API = 'https://sik.search.blue.cdtapps.com/fr/fr/search-result-page';

/** Raw shape of an IKEA search-API product (subset we consume). */
interface IkeaApiProduct {
  name?: string;
  typeName?: string;
  itemNo?: string;
  itemNoGlobal?: string;
  itemType?: string;
  pipUrl?: string;
  mainImageUrl?: string;
  itemMeasureReferenceText?: string;
  salesPrice?: { numeral?: number; currencyCode?: string };
  colors?: Array<{ name?: string }>;
  categoryPath?: Array<{ name?: string }>;
}

interface IkeaApiResponse {
  searchResultPage?: { products?: { main?: { items?: Array<{ product?: IkeaApiProduct }> } } };
}

export class IkeaStrategy implements IngestionStrategy {
  readonly brandId = 'ikea';
  readonly sourceLevel = 2 as const; // API interne (§15.8 N2)

  constructor(private readonly api: JsonFetcher) {}

  async fetchProductsByCategory(categoryOrKeyword: string): Promise<ParseResult[]> {
    const products = await this.search(categoryOrKeyword, 24);
    return products.map((p) => this.mapProduct(p));
  }

  async fetchProductByUrl(url: string): Promise<ParseResult> {
    const itemNo = this.extractItemNo(url);
    if (!itemNo) {
      return { success: false, errors: [`Could not extract IKEA item number from URL: ${url}`], warnings: [] };
    }
    const products = await this.search(itemNo, 24);
    const match = products.find((p) => (p.itemNoGlobal ?? p.itemNo) === itemNo) ?? products[0];
    if (!match) {
      return { success: false, errors: [`No IKEA product found for item ${itemNo}`], warnings: [] };
    }
    return this.mapProduct(match);
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async search(query: string, size: number): Promise<IkeaApiProduct[]> {
    const url = `${IKEA_SEARCH_API}?q=${encodeURIComponent(query)}&size=${size}&types=PRODUCT`;
    const json = await this.api.fetchJson<IkeaApiResponse>(url);
    const items = json.searchResultPage?.products?.main?.items ?? [];
    return items.map((i) => i.product).filter((p): p is IkeaApiProduct => !!p);
  }

  /** Map a raw IKEA product to a validated unified ParseResult. */
  private mapProduct(p: IkeaApiProduct): ParseResult {
    const sku = p.itemNoGlobal ?? p.itemNo;
    const dims = parseIkeaDims(p.itemMeasureReferenceText);
    const candidate = {
      sku,
      name: `${p.name ?? ''} ${p.typeName ?? ''}`.trim(),
      brand: 'IKEA',
      type: this.detectType(p),
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
      depthMm: dims.depthMm,
      dimensionConfidence: dims.confidence,
      priceEurCents: p.salesPrice?.numeral != null ? Math.round(p.salesPrice.numeral * 100) : null,
      currency: p.salesPrice?.currencyCode ?? 'EUR',
      sourceLevel: this.sourceLevel,
      sourceUrl: p.pipUrl,
      lastVerifiedAt: new Date(),
      specifications: {
        // Convention §15.8 : rawMeasureText OBLIGATOIRE si cotes extraites.
        rawMeasureText: p.itemMeasureReferenceText ?? null,
        ikeaItemType: p.itemType ?? null,
        colors: (p.colors ?? []).map((c) => c.name).filter(Boolean),
        categoryPath: (p.categoryPath ?? []).map((c) => c.name).filter(Boolean),
      },
      imageUrls: p.mainImageUrl ? [p.mainImageUrl] : undefined,
    };
    return validateUnifiedProduct(candidate);
  }

  /** Port of legacy ikea.ts determineProductType, extended to the unified enum. */
  private detectType(p: IkeaApiProduct): ProductType {
    const hay = [
      p.name,
      p.typeName,
      ...(p.categoryPath ?? []).map((c) => c.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (/plan de travail|worktop|crédence|credence/.test(hay)) return 'worktop';
    if (/évier|evier|sink/.test(hay)) return 'sink';
    if (/robinet|mitigeur|tap|faucet/.test(hay)) return 'tap';
    if (/spot|luminaire|éclairage|eclairage|lighting|lampe/.test(hay)) return 'lighting';
    if (/four|réfrigérateur|refrigerateur|hotte|plaque|lave-vaisselle|congélateur|congelateur|micro-ondes|oven|fridge/.test(hay)) {
      return 'appliance';
    }
    if (/porte|façade|facade|tiroir|front/.test(hay)) return 'facade';
    if (/poignée|poignee|handle|bouton/.test(hay)) return 'handle';
    if (/meuble|armoire|élément|element|colonne|metod|cabinet/.test(hay)) return 'cabinet';
    if (/rangement|étagère|etagere|storage|caisson/.test(hay)) return 'storage';
    return 'unknown';
  }

  private extractItemNo(url: string): string | null {
    // IKEA pip URLs end with an 8-digit item number, optionally prefixed by 's'.
    const m = url.match(/s?(\d{8})\/?(?:[?#].*)?$/);
    return m?.[1] ?? null;
  }
}

/**
 * Parse an IKEA measure string to integer millimetres + a confidence flag.
 * "60x60x80 cm" -> {w:600,d:600,h:800, conf:1.0} (explicit 3-dim W×D×H)
 * "60x37 cm"    -> {w:600,h:370, conf:0.5} (2-dim, ambiguous mapping)
 * "8 cm"        -> {w:80, conf:0.3} (single dim)
 * ""            -> all null, conf 0.0
 * Always pair with specifications.rawMeasureText (truth preserved).
 */
export function parseIkeaDims(text: string | undefined | null): {
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  confidence: number;
} {
  if (!text) return { widthMm: null, heightMm: null, depthMm: null, confidence: 0 };
  const unit = /\bmm\b/i.test(text) ? 1 : 10; // default cm -> ×10
  const nums = (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) =>
    Math.round(parseFloat(n.replace(',', '.')) * unit),
  );
  if (nums.length >= 3) return { widthMm: nums[0] ?? null, depthMm: nums[1] ?? null, heightMm: nums[2] ?? null, confidence: 1 };
  if (nums.length === 2) return { widthMm: nums[0] ?? null, heightMm: nums[1] ?? null, depthMm: null, confidence: 0.5 };
  if (nums.length === 1) return { widthMm: nums[0] ?? null, heightMm: null, depthMm: null, confidence: 0.3 };
  return { widthMm: null, heightMm: null, depthMm: null, confidence: 0 };
}
