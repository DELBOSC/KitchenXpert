/**
 * EprelApplianceStrategy (CLAUDE.md §15.8 roadmap step b-ter) — source N1.
 *
 * EPREL = European Product Registry for Energy Labelling (Règlement UE
 * 2017/1369). Registre OFFICIEL, public, gratuit, légalement propre : couvre
 * TOUTES les marques d'électroménager vendues en UE (Bosch, Siemens, Miele,
 * Samsung, LG, Whirlpool, Electrolux, Beko, AEG…). Une seule source -> toute
 * la catégorie appliance. Prouvé live 15/06 (cf §15.8.1).
 *
 * API publique : GET https://eprel.ec.europa.eu/api/products/{group} avec le
 * header `Origin` (c'est l'API que le SPA public appelle ; pas de clé, pas de
 * bypass anti-bot). Réponse { size, hits: [...] }.
 *
 * ⚠️ Unité des cotes VARIABLE par groupe (cf §15.8.1) : lave-vaisselle en cm,
 * frigos en mm. On porte une table d'unité par groupe + heuristique de repli
 * (valeur < 300 => cm) + flag `dimensionUnitAssumed` quand l'unité est
 * inférée. rawMeasureText préserve toujours la valeur d'origine (§15.0).
 *
 * Limite : EPREL ne porte PAS de prix (registre énergie ≠ catalogue
 * commercial) -> priceEurCents=null ; le prix se source ailleurs (retailer).
 */
import type { IngestionStrategy } from './ingestion-strategy';
import {
  validateUnifiedProduct,
  type ParseResult,
  type ProductType,
} from './unified-product.schema';

const EPREL_API = 'https://eprel.ec.europa.eu/api/products';
const EPREL_ORIGIN = 'https://eprel.ec.europa.eu';

/**
 * Port minimal d'un client JSON (l'ApiAdapter du scraper le satisfait
 * structurellement). Garde la Strategy découplée du package scraper lourd.
 */
export interface JsonFetcher {
  fetchJson<T = unknown>(
    url: string,
    options?: { headers?: Record<string, string> },
  ): Promise<T>;
}

/**
 * Groupes EPREL pertinents cuisine (codes `implementingAct`). Les 4 premiers
 * sont prouvés live (15/06) ; hobs/caves = candidats à vérifier.
 */
export const EPREL_KITCHEN_GROUPS = [
  'dishwashers2019',
  'refrigeratingappliances2019',
  'ovens',
  'rangehoods',
] as const;

/** Unité de cote connue par groupe (prouvée live). Sinon -> heuristique. */
const GROUP_UNIT: Record<string, 'cm' | 'mm'> = {
  dishwashers2019: 'cm',
  refrigeratingappliances2019: 'mm',
};

/** Un hit EPREL (sous-ensemble consommé). */
interface EprelHit {
  eprelRegistrationNumber?: number | string;
  modelIdentifier?: string;
  supplierOrTrademark?: string;
  organisation?: { organisationName?: string };
  energyClass?: string;
  dimensionWidth?: number;
  dimensionHeight?: number;
  dimensionDepth?: number;
  noise?: number;
  noiseClass?: string;
  ratedCapacity?: number;
  onMarketEndDate?: string | null;
}
interface EprelResponse {
  size?: number;
  hits?: EprelHit[];
}

interface NormalizedDims {
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  confidence: number;
  unitAssumed: boolean;
  rawMeasureText: string | null;
}

export class EprelApplianceStrategy implements IngestionStrategy {
  readonly brandId = 'eprel';
  readonly sourceLevel = 1 as const; // registre officiel (§15.8 N1)

  /** @param pageSize nb de produits par requête de groupe (défaut 50). */
  constructor(
    private readonly api: JsonFetcher,
    private readonly pageSize = 50,
  ) {}

  /**
   * `categoryOrKeyword` = un code de groupe EPREL (ex. `dishwashers2019`).
   * Récupère une page du groupe (pagination = enrichissement futur).
   */
  async fetchProductsByCategory(categoryOrKeyword: string): Promise<ParseResult[]> {
    const group = categoryOrKeyword;
    const url = `${EPREL_API}/${encodeURIComponent(group)}?_page=1&_limit=${this.pageSize}`;
    const json = await this.api.fetchJson<EprelResponse>(url, {
      headers: { Origin: EPREL_ORIGIN, Referer: `${EPREL_ORIGIN}/` },
    });
    return (json.hits ?? []).map((h) => this.mapHit(h, group));
  }

  /**
   * EPREL est un registre orienté groupe ; le fetch d'un produit isolé par URL
   * n'est pas le chemin canonique. On extrait {group, regNo} d'une URL
   * `/screen/product/{group}/{regNo}` et on filtre la page du groupe.
   */
  async fetchProductByUrl(url: string): Promise<ParseResult> {
    const m = url.match(/\/product\/([^/]+)\/(\d+)/);
    const group = m?.[1];
    const regNo = m?.[2];
    if (!group || !regNo) {
      return { success: false, errors: [`URL EPREL non reconnue: ${url}`], warnings: [] };
    }
    const results = await this.fetchProductsByCategory(group);
    const match = results.find(
      (r) => r.success && String(r.product?.specifications?.eprelRegistrationNumber) === regNo,
    );
    return (
      match ?? {
        success: false,
        errors: [`Produit EPREL ${regNo} introuvable sur la 1re page de ${group}`],
        warnings: [],
      }
    );
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private mapHit(h: EprelHit, group: string): ParseResult {
    const sku = (h.modelIdentifier ?? '').trim().split(/\s+/)[0]; // model code
    const brand = h.supplierOrTrademark ?? h.organisation?.organisationName ?? '';
    const dims = this.normalizeDims(group, h.dimensionWidth, h.dimensionHeight, h.dimensionDepth);

    const candidate = {
      sku,
      name: `${brand} ${h.modelIdentifier ?? ''}`.trim(),
      brand,
      type: 'appliance' as ProductType,
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
      depthMm: dims.depthMm,
      dimensionConfidence: dims.confidence,
      priceEurCents: null, // §15.8.1 : EPREL = pas de prix
      currency: 'EUR',
      sourceLevel: this.sourceLevel,
      sourceUrl: `${EPREL_ORIGIN}/screen/product/${group}/${h.eprelRegistrationNumber ?? ''}`,
      lastVerifiedAt: new Date(),
      specifications: {
        rawMeasureText: dims.rawMeasureText, // convention §15.8 (cote d'origine)
        dimensionUnitAssumed: dims.unitAssumed,
        applianceGroup: group,
        eprelRegistrationNumber: h.eprelRegistrationNumber ?? null,
        modelIdentifier: h.modelIdentifier ?? null,
        energyClass: h.energyClass ?? null,
        noise: h.noise ?? null,
        noiseClass: h.noiseClass ?? null,
        ratedCapacity: h.ratedCapacity ?? null,
        onMarketEndDate: h.onMarketEndDate ?? null,
      },
    };
    return validateUnifiedProduct(candidate);
  }

  /**
   * Cotes EPREL -> mm entiers. Unité connue par groupe, sinon heuristique
   * (< 300 => cm). confidence = nb de cotes / 3, réduite (×0.7) si l'unité est
   * inférée. rawMeasureText garde la valeur d'origine.
   */
  private normalizeDims(
    group: string,
    w?: number,
    h?: number,
    d?: number,
  ): NormalizedDims {
    const known = GROUP_UNIT[group];
    const unitAssumed = known === undefined;
    const toMm = (v: number | undefined): number | null => {
      if (v == null || !Number.isFinite(v) || v <= 0) return null;
      if (known === 'mm') return Math.round(v);
      if (known === 'cm') return Math.round(v * 10);
      return v < 300 ? Math.round(v * 10) : Math.round(v); // heuristique appliance
    };
    const widthMm = toMm(w);
    const heightMm = toMm(h);
    const depthMm = toMm(d);
    const present = [widthMm, heightMm, depthMm].filter((x) => x != null).length;
    if (present === 0) {
      return { widthMm, heightMm, depthMm, confidence: 0, unitAssumed, rawMeasureText: null };
    }
    const base = present === 3 ? 1 : present === 2 ? 0.5 : 0.3;
    const confidence = unitAssumed ? Math.round(base * 0.7 * 100) / 100 : base;
    const unit = known ?? '?';
    const raw =
      [w, h, d].some((v) => v != null)
        ? `${w ?? '?'}×${h ?? '?'}×${d ?? '?'} ${unit}`
        : null;
    return { widthMm, heightMm, depthMm, confidence, unitAssumed, rawMeasureText: raw };
  }
}
