/**
 * CastoramaStrategy (CLAUDE.md §15.8 roadmap — Tier N3, scraping HTML+JSON-LD).
 *
 * Castorama : PDP accessibles (200, pas d'anti-bot). Chaque PDP porte un JSON-LD
 * `Product` propre (nom, prix via offers[], gtin13/EAN, catégorie) + les cotes
 * LABELLISÉES dans le NOM ("… L. 200 cm", "L59xP52cm").
 *
 * MODE PRIMAIRE = ingestion PAR CATÉGORIE (cat_id officiel). On pagine la page
 * catégorie (?page=N via rel=next), on collecte les URLs PDP, on parse chacune.
 * Avantage décisif : la catégorie est CONNUE par construction -> catégorisation
 * propre (plus de "ventilateur colonne" dans les colonnes cuisine) et complète
 * (~2100 produits cuisine vs un échantillon mot-clé bruité). La catégorie est
 * passée explicitement (specifications.categorySlug -> override du mapper).
 *
 * MODE LEGACY = filtre du sitemap par mot-clé (gardé en repli, déconseillé).
 */
import type { HtmlFetcher } from './html-fetcher';
import type { IngestionStrategy } from './ingestion-strategy';
import type { CategorySlug } from './category-slug-mapper';
import { extractJsonLdProducts, priceCentsFromOffers, currencyFromOffers } from './jsonld';
import {
  validateUnifiedProduct,
  type ParseResult,
  type ProductType,
} from './unified-product.schema';

const CASTORAMA_BASE = 'https://www.castorama.fr';
const CASTORAMA_SITEMAP = `${CASTORAMA_BASE}/fstrz/sm/sitemap-prd.xml`;
// L'edge Castorama (CloudFront/Fastly) 503 les UA non-navigateur. UA
// Mozilla-COMPATIBLE qui nous IDENTIFIE quand même (§15.8 P5 légal défensif).
const UA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; KitchenXpert-research/0.2; +catalog ingestion)',
};

/** Catégorie cuisine officielle Castorama : chemin cat_id + catégorie/type cibles. */
interface KitchenCategory {
  path: string; // chemin de la page catégorie (cat_id officiel)
  slug: CategorySlug; // catégorie du référentiel (autoritaire, override mapper)
  type: ProductType; // famille UnifiedProduct
}

/**
 * Catégories cuisine DESIGN-pertinentes (cartographiées 16/06 depuis cat_id_826).
 * Clés = identifiants passés à fetchProductsByCategory.
 */
export const CASTORAMA_KITCHEN_CATEGORIES: Record<string, KitchenCategory> = {
  plaque: { path: '/cuisine/electromenager/plaque-de-cuisson/cat_id_832.cat', slug: 'electromenager-cuisson', type: 'appliance' },
  four: { path: '/cuisine/electromenager/four/cat_id_829.cat', slug: 'electromenager-cuisson', type: 'appliance' },
  hotte: { path: '/cuisine/electromenager/hotte/cat_id_830.cat', slug: 'electromenager-cuisson', type: 'appliance' },
  'lave-vaisselle': { path: '/cuisine/electromenager/lave-vaisselle/cat_id_831.cat', slug: 'electromenager-lavage', type: 'appliance' },
  evier: { path: '/cuisine/evier-et-robinet-de-cuisine/evier-de-cuisine/cat_id_838.cat', slug: 'eviers-robinetterie', type: 'sink' },
  robinet: { path: '/cuisine/evier-et-robinet-de-cuisine/robinet-de-cuisine/cat_id_865.cat', slug: 'eviers-robinetterie', type: 'tap' },
  'meuble-bas': { path: '/cuisine/meuble-de-cuisine/meuble-bas-de-cuisine/cat_id_5087.cat', slug: 'meubles-bas', type: 'cabinet' },
  'meuble-haut': { path: '/cuisine/meuble-de-cuisine/meuble-haut-de-cuisine/cat_id_5086.cat', slug: 'meubles-hauts', type: 'cabinet' },
  colonne: { path: '/colonne-de-cuisine/cat_id_0002254.cat', slug: 'colonnes', type: 'cabinet' },
  facade: { path: '/cuisine/meuble-de-cuisine/facade-de-cuisine/cat_id_5088.cat', slug: 'facades', type: 'facade' },
  'plan-travail': { path: '/cuisine/plan-de-travail-credence-et-fond-de-hotte/plan-de-travail/cat_id_857.cat', slug: 'plans-de-travail', type: 'worktop' },
};

export const CASTORAMA_KITCHEN_CATEGORY_KEYS = Object.keys(CASTORAMA_KITCHEN_CATEGORIES);

export interface CastoramaStrategyOptions {
  /** Plafond de PDP fetchées par run (défaut 24). Monter pour une catégorie entière. */
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
   * `key` = une clé de CASTORAMA_KITCHEN_CATEGORIES (ex. `plaque`, `meuble-bas`)
   * -> ingestion par catégorie officielle (pagination + contexte catégorie).
   * Sinon -> repli legacy : filtre du sitemap par mot-clé.
   */
  async fetchProductsByCategory(key: string): Promise<ParseResult[]> {
    const cat = CASTORAMA_KITCHEN_CATEGORIES[key];
    if (!cat) return this.fetchBySitemapKeyword(key);

    const urls = await this.collectCategoryPdpUrls(cat.path);
    const out: ParseResult[] = [];
    for (const url of urls) {
      try {
        const page = await this.html.fetchText(url, { headers: UA_HEADERS });
        out.push(this.mapPdp(page, url, cat));
      } catch (e) {
        out.push({ success: false, errors: [e instanceof Error ? e.message : String(e)], warnings: [] });
      }
    }
    return out;
  }

  // ── catégorie (mode primaire) ───────────────────────────────────────────────

  /** Pagine la page catégorie (?page=N, suit rel=next) -> URLs PDP (jusqu'à max). */
  private async collectCategoryPdpUrls(catPath: string): Promise<string[]> {
    const seen = new Set<string>();
    let page = 1;
    while (seen.size < this.maxProducts) {
      const pageUrl = `${CASTORAMA_BASE}${catPath}?page=${page}`;
      const html = await this.html.fetchText(pageUrl, { headers: UA_HEADERS });
      const pdps = this.extractPdpUrls(html);
      const before = seen.size;
      for (const u of pdps) {
        if (seen.size >= this.maxProducts) break;
        seen.add(u);
      }
      // arrêt : aucune nouvelle PDP, ou plus de page suivante déclarée.
      if (seen.size === before || !/rel="next"/i.test(html)) break;
      page += 1;
    }
    return [...seen];
  }

  /** Extrait les URLs PDP (`/slug/{id}_CAFR.prd`) d'une page catégorie, absolutisées. */
  private extractPdpUrls(html: string): string[] {
    const re = /href="(\/[^"]*?\d{6,}_CAFR\.prd)"/gi;
    const set = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) set.add(`${CASTORAMA_BASE}${m[1]}`);
    return [...set];
  }

  // ── legacy (repli mot-clé sitemap) ──────────────────────────────────────────

  private async fetchBySitemapKeyword(keyword: string): Promise<ParseResult[]> {
    const sitemap = await this.html.fetchText(CASTORAMA_SITEMAP, { headers: UA_HEADERS });
    const kw = keyword.toLowerCase();
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

  // ── parsing PDP ─────────────────────────────────────────────────────────────

  /** `ctx` (mode catégorie) impose le type + la categorySlug (autoritaire). */
  private mapPdp(html: string, url: string, ctx?: KitchenCategory): ParseResult {
    const product = extractJsonLdProducts(html)[0];
    if (!product) {
      return { success: false, errors: [`No Product JSON-LD at ${url}`], warnings: [] };
    }
    const name = typeof product.name === 'string' ? product.name.trim() : '';
    const ean = product.gtin13 != null ? String(product.gtin13) : undefined;
    const category = typeof product.category === 'string' ? product.category : null;
    const dims = parseCastoramaDims(name);

    const candidate = {
      sku: ean ?? this.idFromUrl(url) ?? '',
      ean,
      name,
      brand: 'Castorama',
      type: ctx?.type ?? this.detectType(name, category),
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
        // Override autoritaire de la catégorie quand l'ingestion est par cat_id.
        ...(ctx && { categorySlug: ctx.slug }),
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
 * Cotes Castorama depuis le NOM (labels L/H/P, valeurs cm|mm -> mm entiers).
 * "Structure … L. 200 cm" -> width 2000 ; "L59xP52cm" -> w 590 / d 520.
 * SPÉCIFIQUE Castorama. confidence = nb de cotes / 3 ; nom conservé en rawMeasureText.
 */
export function parseCastoramaDims(name: string): {
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  confidence: number;
  rawMeasureText: string | null;
} {
  const grab = (label: string): number | null => {
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
