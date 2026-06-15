/**
 * CastoramaStrategy (CLAUDE.md §15.8 roadmap — Tier N3, scraping HTML+JSON-LD).
 *
 * Castorama : PDP accessibles (200, pas d'anti-bot), inventaire via
 * sitemap-prd.xml (~50k). Chaque PDP porte un JSON-LD `Product` propre
 * (nom, prix via offers[], gtin13/EAN, catégorie) — prouvé live 15/06.
 *
 * ⚠️ COTES SPÉCIFIQUES À LA MARQUE : Castorama ne met PAS les cotes dans le
 * JSON-LD ; elles sont LABELLISÉES dans le NOM ("… L. 200 cm", "H.201 L.60").
 * On les parse ici (parseCastoramaDims). Pour TOUTE autre marque N3, auditer
 * d'abord où vivent les cotes (nom / DOM / JSON-LD / API) — NE PAS réutiliser
 * ce parseur en aveugle (formats hétérogènes). Couverture cuisine mesurée ~60%
 * (les structurants — caissons/colonnes/plans — ont leurs cotes dans le nom ;
 * les accessoires souvent non -> dimensionConfidence 0, honnête).
 */
import type { HtmlFetcher } from './html-fetcher';
import type { IngestionStrategy } from './ingestion-strategy';
import { extractJsonLdProducts, priceCentsFromOffers, currencyFromOffers } from './jsonld';
import {
  validateUnifiedProduct,
  type ParseResult,
  type ProductType,
} from './unified-product.schema';

const CASTORAMA_SITEMAP = 'https://www.castorama.fr/fstrz/sm/sitemap-prd.xml';
// L'edge Castorama (CloudFront/Fastly) 503 les UA non-navigateur. UA
// Mozilla-COMPATIBLE qui nous IDENTIFIE quand même (§15.8 P5 légal défensif) —
// pas un bypass anti-bot (aucun stealth), juste la string attendue par l'edge.
const UA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; KitchenXpert-research/0.2; +catalog ingestion)',
};

/** Options par run Castorama. */
export interface CastoramaStrategyOptions {
  /** Plafond de PDP fetchées par fetchProductsByCategory (défaut 24). */
  maxProducts?: number;
}

export class CastoramaStrategy implements IngestionStrategy {
  readonly brandId = 'castorama';
  readonly sourceLevel = 3 as const; // scraping HTML (§15.8 N3)

  private readonly maxProducts: number;

  constructor(
    private readonly html: HtmlFetcher,
    options: CastoramaStrategyOptions = {},
  ) {
    this.maxProducts = Math.max(1, options.maxProducts ?? 24);
  }

  async fetchProductByUrl(url: string): Promise<ParseResult> {
    const page = await this.html.fetchText(url, { headers: UA_HEADERS });
    return this.mapPdp(page, url);
  }

  /**
   * `categoryOrKeyword` filtre les URLs du sitemap produit (ex. `plan-de-travail`,
   * `caisson`, `colonne`). Fetch jusqu'à maxProducts PDP, skip-not-crash par PDP.
   */
  async fetchProductsByCategory(categoryOrKeyword: string): Promise<ParseResult[]> {
    const sitemap = await this.html.fetchText(CASTORAMA_SITEMAP, { headers: UA_HEADERS });
    const kw = categoryOrKeyword.toLowerCase();
    const urls: string[] = [];
    const re = /<loc>([^<]+)<\/loc>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sitemap)) !== null && urls.length < this.maxProducts) {
      const loc = m[1] ?? '';
      if (loc.toLowerCase().includes(kw)) urls.push(loc);
    }
    const out: ParseResult[] = [];
    for (const url of urls) {
      try {
        out.push(await this.fetchProductByUrl(url));
      } catch (e) {
        out.push({ success: false, errors: [e instanceof Error ? e.message : String(e)], warnings: [] });
      }
    }
    return out;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private mapPdp(html: string, url: string): ParseResult {
    const product = extractJsonLdProducts(html)[0];
    if (!product) {
      return { success: false, errors: [`No Product JSON-LD at ${url}`], warnings: [] };
    }
    const name = typeof product.name === 'string' ? product.name.trim() : '';
    const ean = product.gtin13 != null ? String(product.gtin13) : undefined;
    const category = typeof product.category === 'string' ? product.category : null;
    const dims = parseCastoramaDims(name);

    const candidate = {
      // SKU = EAN (gtin13), unique et clé de matching cross-source. Fallback: id
      // du slug (..._CAFR.prd) si l'EAN manque.
      sku: ean ?? this.idFromUrl(url) ?? '',
      ean,
      name,
      brand: 'Castorama',
      type: this.detectType(name, category),
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
      depthMm: dims.depthMm,
      dimensionConfidence: dims.confidence,
      priceEurCents: priceCentsFromOffers(product.offers),
      currency: currencyFromOffers(product.offers),
      sourceLevel: this.sourceLevel,
      sourceUrl: typeof product.url === 'string' ? product.url : url,
      lastVerifiedAt: new Date(),
      specifications: {
        rawMeasureText: dims.rawMeasureText, // = le nom (convention §15.8)
        category,
        gtin13: ean ?? null,
      },
      imageUrls: this.imageUrls(product.image),
    };
    return validateUnifiedProduct(candidate);
  }

  private idFromUrl(url: string): string | undefined {
    return url.match(/\/(\d{6,})_[A-Z]+\.prd/)?.[1];
  }

  private imageUrls(image: unknown): string[] | undefined {
    if (typeof image === 'string') return [image];
    if (Array.isArray(image)) {
      const urls = image.filter((x): x is string => typeof x === 'string');
      return urls.length ? urls : undefined;
    }
    return undefined;
  }

  private detectType(name: string, category: string | null): ProductType {
    const hay = `${name} ${category ?? ''}`.toLowerCase();
    if (/plan de travail|plan-de-travail|crédence|credence|worktop/.test(hay)) return 'worktop';
    if (/mitigeur|robinet/.test(hay)) return 'tap';
    if (/évier|evier|lavabo|vasque/.test(hay)) return 'sink';
    if (/spot|luminaire|éclairage|eclairage|applique|suspension/.test(hay)) return 'lighting';
    if (/four|hotte|plaque|réfrigérateur|refrigerateur|lave-vaisselle|micro-ondes/.test(hay)) return 'appliance';
    if (/poignée|poignee|bouton/.test(hay)) return 'handle';
    if (/façade|facade|porte|tiroir|front/.test(hay)) return 'facade';
    if (/caisson|colonne|meuble|élément|element|armoire|structure/.test(hay)) return 'cabinet';
    return 'unknown';
  }
}

/**
 * Cotes Castorama depuis le NOM (labels L/H/P, valeurs en cm -> mm entiers).
 * "Structure … L. 200 cm" -> width 2000. "… H.201 L.60" -> h 2010 / w 600.
 * SPÉCIFIQUE Castorama (cf en-tête). confidence = nb de cotes / 3 ; le nom
 * complet est conservé en rawMeasureText.
 */
export function parseCastoramaDims(name: string): {
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  confidence: number;
  rawMeasureText: string | null;
} {
  const grab = (label: string): number | null => {
    // label précédé d'un non-lettre (évite de matcher un L/H/P dans un mot),
    // séparateur souple (. - espace), nombre, puis unité optionnelle mm|cm.
    // Castorama mélange les deux (ex. "Hauteur 100 mm" vs "L. 200 cm") -> on
    // détecte l'unité par cote ; défaut cm (×10) si absente.
    const re = new RegExp(`(?:^|[^A-Za-zÀ-ÿ])${label}\\.?\\s*-?\\s*(\\d{1,4}(?:[.,]\\d+)?)\\s*(mm|cm)?`, 'i');
    const mm = name.match(re);
    if (!mm) return null;
    const val = parseFloat((mm[1] ?? '').replace(',', '.'));
    if (!Number.isFinite(val)) return null;
    return (mm[2] ?? '').toLowerCase() === 'mm' ? Math.round(val) : Math.round(val * 10);
  };
  const widthMm = grab('l(?:arg(?:eur)?)?');
  const heightMm = grab('h(?:aut(?:eur)?)?');
  const depthMm = grab('p(?:rof(?:ondeur)?)?');
  const present = [widthMm, heightMm, depthMm].filter((v) => v != null).length;
  const confidence = present === 3 ? 1 : present === 2 ? 0.5 : present === 1 ? 0.3 : 0;
  return { widthMm, heightMm, depthMm, confidence, rawMeasureText: name || null };
}
