/**
 * LapeyreStrategy (CLAUDE.md §15.8 roadmap step b) — API-first, IBM WebSphere
 * Commerce (WCS). API search interne ouverte (prouvé 14/06). Cascade N2.
 *
 * SINGLE SOURCE OF TRUTH (§15.8 Q3.b) : lives in @kitchenxpert/common, dépend du
 * port JsonFetcher (le scraper en garde un shim re-export).
 *
 * Cotes : enrichies via l'API v2 détail (DIM-LARGEUR/HAUTEUR/PROFONDEUR, cm->mm).
 * Absentes -> dims=null + dimensionConfidence=0 (§15.0 : jamais inventer).
 */
import type { IngestionStrategy, JsonFetcher } from './ingestion-strategy';
import {
  validateUnifiedProduct,
  type ParseResult,
  type ProductType,
} from './unified-product.schema';

const LAPEYRE_STORE_ID = '715842484';
const LAPEYRE_SEARCH_API = `https://www.lapeyre.fr/search/resources/store/${LAPEYRE_STORE_ID}/productview`;
const LAPEYRE_BASE = 'https://www.lapeyre.fr';
const LAPEYRE_V2_PRODUCTS = `${LAPEYRE_BASE}/search/resources/api/v2/products`;
const LAPEYRE_CONTRACT_ID = '4000000000000000003';

interface Dims {
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  confidence: number;
  rawMeasureText: string | null;
}

interface WcsPrice {
  usage?: string; // 'Display' | 'Offer'
  currency?: string;
  value?: string;
}
interface WcsAttribute {
  identifier?: string;
  values?: Array<{ value?: string; identifier?: string }>;
}
interface WcsCatalogEntry {
  partNumber?: string;
  uniqueID?: string;
  name?: string;
  shortDescription?: string;
  catalogEntryTypeCode?: string;
  buyable?: string;
  price?: WcsPrice[];
  seo?: { href?: string } | string;
  attributes?: WcsAttribute[];
  thumbnail?: string;
}
interface WcsResponse {
  catalogEntryView?: WcsCatalogEntry[];
}
interface V2Response {
  contents?: Array<{
    attributes?: WcsAttribute[];
    items?: Array<{ attributes?: WcsAttribute[] }>;
  }>;
}

export class LapeyreStrategy implements IngestionStrategy {
  readonly brandId = 'lapeyre';
  readonly sourceLevel = 2 as const; // API interne WCS (§15.8 N2)

  constructor(private readonly api: JsonFetcher) {}

  async fetchProductsByCategory(categoryOrKeyword: string): Promise<ParseResult[]> {
    const url = `${LAPEYRE_SEARCH_API}/bySearchTerm/${encodeURIComponent(categoryOrKeyword)}?pageSize=24`;
    const json = await this.api.fetchJson<WcsResponse>(url);
    const entries = json.catalogEntryView ?? [];
    const out: ParseResult[] = [];
    for (const e of entries) {
      const dims = await this.enrichDims(e.partNumber);
      out.push(this.mapEntry(e, dims));
    }
    return out;
  }

  async fetchProductByUrl(url: string): Promise<ParseResult> {
    const id = this.extractId(url);
    if (!id) {
      return { success: false, errors: [`Could not extract Lapeyre id from URL: ${url}`], warnings: [] };
    }
    const json = await this.api.fetchJson<WcsResponse>(`${LAPEYRE_SEARCH_API}/byId/${id}`);
    const entry = (json.catalogEntryView ?? [])[0];
    if (!entry) {
      return { success: false, errors: [`No Lapeyre product for id ${id}`], warnings: [] };
    }
    const dims = await this.enrichDims(entry.partNumber);
    return this.mapEntry(entry, dims);
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private mapEntry(e: WcsCatalogEntry, dims: Dims | null): ParseResult {
    const href = typeof e.seo === 'object' ? e.seo?.href : e.seo;
    const candidate = {
      sku: e.partNumber,
      name: (e.name ?? e.shortDescription ?? '').trim(),
      brand: 'Lapeyre',
      type: this.detectType(e),
      widthMm: dims?.widthMm ?? null,
      heightMm: dims?.heightMm ?? null,
      depthMm: dims?.depthMm ?? null,
      dimensionConfidence: dims?.confidence ?? 0,
      priceEurCents: this.pickPriceCents(e.price),
      currency: this.pickCurrency(e.price),
      sourceLevel: this.sourceLevel,
      sourceUrl: href ? `${LAPEYRE_BASE}${href}` : undefined,
      lastVerifiedAt: new Date(),
      specifications: {
        rawMeasureText: dims?.rawMeasureText ?? null, // convention §15.8
        wcsUniqueID: e.uniqueID ?? null,
        catalogEntryTypeCode: e.catalogEntryTypeCode ?? null,
        buyable: e.buyable ?? null,
        categorieGoogle: this.attrValue(e, 'categorieGoogle'),
      },
      imageUrls: this.imageUrls(e.thumbnail),
    };
    return validateUnifiedProduct(candidate);
  }

  /** WCS thumbnails are relative (/dx/api/dam/…) -> absolutise; drop if unknown form. */
  private imageUrls(thumb: string | undefined): string[] | undefined {
    if (!thumb) return undefined;
    if (/^https?:\/\//i.test(thumb)) return [thumb];
    if (thumb.startsWith('/')) return [`${LAPEYRE_BASE}${thumb}`];
    return undefined;
  }

  /** Prefer the 'Offer' (selling) price, fall back to 'Display'. -> int cents. */
  private pickPriceCents(prices: WcsPrice[] | undefined): number | null {
    if (!prices?.length) return null;
    const offer = prices.find((p) => p.usage === 'Offer' && p.value);
    const display = prices.find((p) => p.usage === 'Display' && p.value);
    const chosen = offer ?? display ?? prices.find((p) => p.value);
    if (!chosen?.value) return null;
    const n = parseFloat(chosen.value);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  }

  private pickCurrency(prices: WcsPrice[] | undefined): string {
    return prices?.find((p) => p.currency)?.currency ?? 'EUR';
  }

  private attrValue(e: WcsCatalogEntry, identifier: string): string | null {
    const a = (e.attributes ?? []).find((x) => x.identifier === identifier);
    return a?.values?.[0]?.value ?? a?.values?.[0]?.identifier ?? null;
  }

  private detectType(e: WcsCatalogEntry): ProductType {
    const hay = `${e.name ?? ''} ${e.shortDescription ?? ''}`.toLowerCase();
    if (/plan de travail|crédence|credence|worktop/.test(hay)) return 'worktop';
    if (/mitigeur|robinet|robinetterie/.test(hay)) return 'tap';
    if (/évier|evier|lavabo|vasque/.test(hay)) return 'sink';
    if (/spot|luminaire|éclairage|eclairage|applique|suspension/.test(hay)) return 'lighting';
    if (/four|hotte|plaque|réfrigérateur|refrigerateur|lave-vaisselle|micro-ondes/.test(hay)) return 'appliance';
    if (/poignée|poignee|bouton/.test(hay)) return 'handle';
    if (/façade|facade|porte|tiroir|front/.test(hay)) return 'facade';
    if (/cuisine|meuble|caisson|élément|element|colonne|armoire/.test(hay)) return 'cabinet';
    return 'unknown';
  }

  private extractId(url: string): string | null {
    const m = url.match(/-(\d{5,})\/?(?:[?#].*)?$/);
    return m?.[1] ?? null;
  }

  /**
   * Enrich a SKU's cotes via the v2 detail API (cm). Skip-not-crash: any
   * failure -> null, so the product still maps with dimensionConfidence 0.
   */
  private async enrichDims(sku: string | undefined): Promise<Dims | null> {
    if (!sku) return null;
    const url = `${LAPEYRE_V2_PRODUCTS}?storeId=${LAPEYRE_STORE_ID}&partNumber=${encodeURIComponent(sku)}&contractId=${LAPEYRE_CONTRACT_ID}&langId=-2`;
    try {
      const json = await this.api.fetchJson<V2Response>(url);
      const content = json.contents?.[0];
      const attrs = content?.items?.[0]?.attributes ?? content?.attributes ?? [];
      return this.parseV2Dims(attrs);
    } catch {
      return null;
    }
  }

  /** LARGEUR->width, HAUTEUR->height, PROFONDEUR->depth (cm -> mm int). */
  private parseV2Dims(attrs: WcsAttribute[]): Dims | null {
    const num = (id: string): number | null => {
      const a = attrs.find((x) => x.identifier === id);
      const raw = a?.values?.[0]?.value;
      if (!raw) return null;
      const cm = parseFloat(raw.replace(',', '.'));
      return Number.isFinite(cm) ? Math.round(cm * 10) : null;
    };
    const widthMm = num('DIMENSIONS-COMMUNES-DIM-LARGEUR');
    const heightMm = num('DIMENSIONS-COMMUNES-DIM-HAUTEUR');
    const depthMm = num('DIMENSIONS-COMMUNES-DIM-PROFONDEUR');
    const present = [widthMm, heightMm, depthMm].filter((v) => v != null).length;
    if (present === 0) return null;
    const confidence = present === 3 ? 1 : present === 2 ? 0.5 : 0.3;
    const raw = [
      widthMm != null ? `L${widthMm / 10}` : null,
      heightMm != null ? `H${heightMm / 10}` : null,
      depthMm != null ? `P${depthMm / 10}` : null,
    ].filter(Boolean).join('×') + ' cm';
    return { widthMm, heightMm, depthMm, confidence, rawMeasureText: raw };
  }
}
