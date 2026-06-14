/**
 * LapeyreStrategy (CLAUDE.md §15.8 roadmap step b) — API-first, 2e marque.
 *
 * Valide que le pattern IngestionStrategy + ApiAdapter générique + UnifiedProduct
 * généralise au-delà d'IKEA. Lapeyre tourne sur IBM WebSphere Commerce (WCS) ;
 * son API search interne est ouverte (pas d'anti-bot, prouvé 14/06) :
 *   https://www.lapeyre.fr/search/resources/store/715842484/productview/bySearchTerm/{terme}
 * Cascade N2 (§15.8 P1), MÊME ApiAdapter que IkeaStrategy (#163) — preuve de
 * généricité brand-agnostic.
 *
 * NB cotes : l'API expose SKU/nom/prix/URL de façon fiable mais PAS les cotes
 * numériques (search = unités seules ; byId = 500/configurable ; PDP = shell SPA).
 * On mappe donc dims=null + dimensionConfidence=0 (§15.0 : jamais inventer une
 * cote). Les cotes Lapeyre = chantier d'enrichissement séparé.
 */
import type { ApiAdapter } from '../adapters/api-adapter.js';
import type { IngestionStrategy } from './ingestion-strategy.js';
import {
  validateUnifiedProduct,
  type ParseResult,
  type ProductType,
} from '../schemas/unified-product.schema.js';

const LAPEYRE_STORE_ID = '715842484';
const LAPEYRE_SEARCH_API = `https://www.lapeyre.fr/search/resources/store/${LAPEYRE_STORE_ID}/productview`;
const LAPEYRE_BASE = 'https://www.lapeyre.fr';

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

export class LapeyreStrategy implements IngestionStrategy {
  readonly brandId = 'lapeyre';
  readonly sourceLevel = 2 as const; // API interne WCS (§15.8 N2)

  constructor(private readonly api: ApiAdapter) {}

  async fetchProductsByCategory(categoryOrKeyword: string): Promise<ParseResult[]> {
    const url = `${LAPEYRE_SEARCH_API}/bySearchTerm/${encodeURIComponent(categoryOrKeyword)}?pageSize=24`;
    const json = await this.api.fetchJson<WcsResponse>(url);
    return (json.catalogEntryView ?? []).map((e) => this.mapEntry(e));
  }

  async fetchProductByUrl(url: string): Promise<ParseResult> {
    // Lapeyre PDP URLs end with a numeric id (…-1249857). WCS byId resolves it.
    const id = this.extractId(url);
    if (!id) {
      return { success: false, errors: [`Could not extract Lapeyre id from URL: ${url}`], warnings: [] };
    }
    const json = await this.api.fetchJson<WcsResponse>(`${LAPEYRE_SEARCH_API}/byId/${id}`);
    const entry = (json.catalogEntryView ?? [])[0];
    if (!entry) {
      return { success: false, errors: [`No Lapeyre product for id ${id}`], warnings: [] };
    }
    return this.mapEntry(entry);
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private mapEntry(e: WcsCatalogEntry): ParseResult {
    const href = typeof e.seo === 'object' ? e.seo?.href : e.seo;
    const candidate = {
      sku: e.partNumber,
      name: (e.name ?? e.shortDescription ?? '').trim(),
      brand: 'Lapeyre',
      type: this.detectType(e),
      // Cotes non exposées par l'API Lapeyre (cf en-tête) -> null + confidence 0.
      widthMm: null,
      heightMm: null,
      depthMm: null,
      dimensionConfidence: 0,
      priceEurCents: this.pickPriceCents(e.price),
      currency: this.pickCurrency(e.price),
      sourceLevel: this.sourceLevel,
      sourceUrl: href ? `${LAPEYRE_BASE}${href}` : undefined,
      lastVerifiedAt: new Date(),
      specifications: {
        rawMeasureText: null, // aucune cote source (convention §15.8)
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
}
