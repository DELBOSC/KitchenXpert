/**
 * parseSpecTable (CLAUDE.md §15.8.3 — enrichissement cotes Castorama via PDP).
 *
 * Les PDP Castorama portent une table `<table aria-labelledby="specifications">`
 * (`<tr><th>Label (cm)</th><td>valeur+unité</td></tr>`) BIEN plus riche que le
 * name-parse (POC 20/06 : 10/10 meubles ont la table ; name-parse ne couvrait
 * ~14% des plaques a conf>=0.5). On l'extrait en REGEX PUR (dep-free, comme
 * jsonld.ts) — `packages/common` n'a volontairement pas cheerio.
 *
 * Mapping cotes PAR ProductType (les libellés Castorama ne sont pas fiables
 * sémantiquement : un profil de plan-de-travail range sa LONGUEUR 300cm sous
 * "Profondeur"). Sanity bounds par type pour rejeter l'aberrant.
 *
 * ATTENTION worktop : UnifiedProduct n'a pas de `lengthMm`. Convention §15.8.3 :
 * la LONGUEUR du plan (course 1.5-4 m) est stockée dans `widthMm`. Donc sur un
 * worktop, `widthMm` represente la LONGUEUR, pas une largeur frontale.
 */
import { capHtml } from './html-fetcher';

import type { ProductType } from './unified-product.schema';

export interface SpecTableResult {
  /** Cotes mappées par type, en mm entiers (>0), seulement si dans les bounds. */
  widthMm: number | null;
  heightMm: number | null;
  depthMm: number | null;
  /** Nombre de cotes mappées valides (0-3). */
  dimCount: number;
  /** 1.0 / 0.7 / 0.4 / 0 selon dimCount (fusion §15.8.3 décision 4). */
  confidence: number;
  /** Vraie marque fabricant (ligne "Marque"), si non vide ET != Castorama. */
  brand?: string;
  material?: string;
  color?: string;
  finish?: string;
  /** Paires dim th/td sérialisées (rawMeasureText obligatoire, §15.8.3 A5). */
  rawMeasureText: string | null;
  /** out_of_bounds_<dim>, ambiguous_profondeur, conflict_<dim>. */
  qualityFlags: string[];
}

type DimTarget = 'width' | 'height' | 'depth';
type LabelKey = 'hauteur' | 'largeur' | 'profondeur' | 'longueur';

/** Bornes plausibles EN CM par type, appliquées sur la cote mappée. */
const BOUNDS: Record<string, Partial<Record<DimTarget, [number, number]>>> = {
  cabinet: { width: [15, 120], height: [30, 220], depth: [30, 65] },
  // appliance : bornes larges (POC 20/06 four 59.5 / plaque hauteur 6.2cm). Le
  // plancher height=5 accepte l'épaisseur plaque (induction 5-8cm) sans rejeter
  // la diversité — seul l'aberrant (300) est filtré (décision A 20/06).
  appliance: { width: [30, 120], height: [5, 200], depth: [30, 70] },
  worktop: { width: [50, 400], depth: [40, 80] }, // width = LONGUEUR (cf JSDoc)
  facade: { width: [10, 100], height: [30, 220] },
  sink: { width: [25, 120], depth: [25, 65] },
  tap: { height: [5, 80] },
};

const EMPTY: SpecTableResult = {
  widthMm: null,
  heightMm: null,
  depthMm: null,
  dimCount: 0,
  confidence: 0,
  rawMeasureText: null,
  qualityFlags: [],
};

/** Décode les entités HTML usuelles + supprime les balises. */
function clean(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&eacute;/gi, 'é')
    .replace(/&egrave;/gi, 'è')
    .replace(/&agrave;/gi, 'à')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Valeur "90cm" | "3,8 cm" | "24 mm" | "1.2m" -> cm (float) ; null si illisible. */
function valueToCm(raw: string): number | null {
  const m = raw.match(/(-?\d+(?:[.,]\d+)?)\s*(cm|mm|m)?/i);
  if (!m) {
    return null;
  }
  const n = parseFloat((m[1] ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) {
    return null;
  }
  const unit = (m[2] ?? 'cm').toLowerCase();
  if (unit === 'mm') {
    return n / 10;
  }
  if (unit === 'm') {
    return n * 100;
  }
  return n; // cm par défaut
}

/** Libellé brut -> clé dimension normalisée (ou null). */
function labelKey(label: string): LabelKey | null {
  const l = label.toLowerCase();
  if (/profondeur/.test(l)) {
    return 'profondeur';
  }
  if (/longueur/.test(l)) {
    return 'longueur';
  }
  if (/hauteur/.test(l)) {
    return 'hauteur';
  }
  if (/largeur/.test(l)) {
    return 'largeur';
  }
  return null;
}

/**
 * Cible (width/height/depth) d'une cote pour un type donné. Retourne null si la
 * cote n'est pas pertinente pour ce type. 'ambiguous' = profondeur worktop en
 * zone grise (80-150 cm) -> non assignée + flag.
 */
function mapTarget(type: ProductType, key: LabelKey, cm: number): DimTarget | 'ambiguous' | null {
  switch (type) {
    case 'appliance': // four/plaque/hotte/LV : sémantique H/L/P identique au caisson
    case 'cabinet':
      return key === 'hauteur'
        ? 'height'
        : key === 'largeur'
          ? 'width'
          : key === 'profondeur'
            ? 'depth'
            : null;
    case 'facade':
      return key === 'hauteur' ? 'height' : key === 'largeur' ? 'width' : null;
    case 'sink':
      return key === 'longueur' ? 'width' : key === 'largeur' ? 'depth' : null;
    case 'tap':
      return key === 'hauteur' ? 'height' : null;
    case 'worktop':
      if (key === 'longueur') {
        return 'width';
      }
      if (key === 'profondeur') {
        return cm < 80 ? 'depth' : cm > 150 ? 'width' : 'ambiguous';
      }
      return null; // largeur/hauteur worktop : ignorés (épaisseur non modélisée)
    default:
      return null; // appliance & autres : pas de mapping table (name-parse garde la main)
  }
}

/** Extrait toutes les lignes th/td de la table specifications. */
function specRows(html: string): Array<{ label: string; value: string }> {
  const table = html.match(
    /<table[^>]*aria-labelledby=["']specifications["'][^>]*>([\s\S]*?)<\/table>/i
  );
  if (!table) {
    return [];
  }
  const rows: Array<{ label: string; value: string }> = [];
  const re = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(table[1] ?? '')) !== null) {
    const label = clean(m[1] ?? '');
    const value = clean(m[2] ?? '');
    if (label) {
      rows.push({ label, value });
    }
  }
  return rows;
}

/**
 * Parse la table specifications d'une PDP Castorama. `type` pilote le mapping
 * des cotes. Tout est best-effort + skip-not-crash : une cote hors-bornes ou
 * ambigue est ignoree (avec un qualityFlag), jamais une exception.
 */
export function parseSpecTable(html: string, type: ProductType): SpecTableResult {
  const rows = specRows(capHtml(html)); // bound the regex input (js/redos, cf capHtml)
  if (rows.length === 0) {
    return { ...EMPTY };
  }

  const dims: Record<DimTarget, number | null> = { width: null, height: null, depth: null };
  const flags: string[] = [];
  const dimPairs: string[] = [];
  const bounds = BOUNDS[type] ?? {};

  // Bonus enrichissement.
  let brand: string | undefined;
  let material: string | undefined;
  let color: string | undefined;
  let finish: string | undefined;

  for (const { label, value } of rows) {
    const ll = label.toLowerCase();
    if (/marque/.test(ll)) {
      if (value && value.toLowerCase() !== 'castorama') {
        brand = value;
      }
      continue;
    }
    if (/mati[eè]re/.test(ll)) {
      if (value) {
        material = value;
      }
      continue;
    }
    if (/couleur/.test(ll)) {
      if (value) {
        color = value;
      }
      continue;
    }
    if (/finition/.test(ll)) {
      if (value) {
        finish = value;
      }
      continue;
    }

    const key = labelKey(label);
    if (!key) {
      continue;
    }
    const cm = valueToCm(value);
    if (cm == null) {
      continue;
    }
    dimPairs.push(`${label}:${value}`);

    const target = mapTarget(type, key, cm);
    if (target == null) {
      continue;
    }
    if (target === 'ambiguous') {
      flags.push('ambiguous_profondeur');
      continue;
    }

    const range = bounds[target];
    if (!range) {
      continue;
    }
    if (cm < range[0] || cm > range[1]) {
      flags.push(`out_of_bounds_${target}`);
      continue;
    }
    if (dims[target] != null) {
      flags.push(`conflict_${target}`);
      continue;
    }
    dims[target] = Math.round(cm * 10); // cm -> mm entier
  }

  const dimCount = (['width', 'height', 'depth'] as DimTarget[]).filter(
    (t) => dims[t] != null
  ).length;
  const confidence = dimCount === 3 ? 1.0 : dimCount === 2 ? 0.7 : dimCount === 1 ? 0.4 : 0;

  return {
    widthMm: dims.width,
    heightMm: dims.height,
    depthMm: dims.depth,
    dimCount,
    confidence,
    ...(brand && { brand }),
    ...(material && { material }),
    ...(color && { color }),
    ...(finish && { finish }),
    rawMeasureText: dimPairs.length ? dimPairs.join('; ') : null,
    qualityFlags: flags,
  };
}
