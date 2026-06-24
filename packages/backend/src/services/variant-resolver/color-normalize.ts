/**
 * Color normalizer (CLAUDE.md §15.8.4 P7 — chatbot couleur, Phase 1).
 *
 * Pure module (no DB, no Prisma). Maps a raw Castorama color string
 * ("Blanc Haute brillance", "Effet chêne", "Béton noir", "GrisBeige"…) to a
 * stable color/material FAMILY so a gamme's variants can be grouped into a
 * small set of offerable choices.
 *
 * Built from the REAL vocabulary (185 distinct values / 6350 SKU, see
 * .scrape-output/colors185.json): family table + aliases + stopwords derived
 * from observed data, targeting >=95% SKU coverage (~99% achievable; the rest
 * is data-quality noise — kWh/cm/"Non applicable" — bucketed as `unknown`).
 *
 * It MAY read `baseNorm`/`extractColor` from canonical-signature (for the trend
 * score of dict-known colors) but NEVER modifies them — zero P5 risk.
 */
import { baseNorm, extractColor } from '../canonical/canonical-signature';

export type ColorKind = 'color' | 'material' | 'unknown';

export interface NormalizedColor {
  /** Stable family key for grouping/dedup (e.g. 'blanc', 'chene'). */
  key: string;
  /** Human label for display (e.g. 'Blanc', 'Chêne'). */
  label: string;
  kind: ColorKind;
  /** Trend score: dict color -> extractColor score ; material/other color -> 50 (neutral) ; unknown -> -1. */
  score: number;
}

/**
 * Qualifiers/finishes/noise tokens to drop BEFORE matching. Derived from the
 * real values: finishes ("haute brillance", "mat", "sombre"…), descriptors
 * ("effet", "aspect", "panneau", "en"…), and a few leaked non-color words.
 */
const STOPWORDS = new Set<string>([
  'effet', 'aspect', 'panneau', 'en', 'de', 'des', 'du', 'la', 'le', 'et',
  'mat', 'brillant', 'brillante', 'brillance', 'haute', 'sombre', 'clair',
  'claire', 'fonce', 'raye', 'rayee', 'grain', 'bandeau', 'ultra', 'noble',
  'nuage', 'etain', 'tourterelle', 'pierre', 'grise', 'campagne', 'force',
  'tout', 'non', 'applicable', 'integrable', 'livre', 'oxyde', 'oxydee',
]);

interface Family {
  key: string;
  label: string;
  kind: ColorKind;
  aliases: string[];
}

/**
 * Family table (~40), kind:'color' vs 'material'. Each alias is a deaccented,
 * lowercase token observed in the data. The matcher takes the FIRST non-stop
 * token that hits a family, so "Béton noir" -> beton, "Marbre blanc" -> marbre.
 */
const FAMILIES: Family[] = [
  // --- colors ---
  { key: 'blanc', label: 'Blanc', kind: 'color', aliases: ['blanc', 'blanche'] },
  { key: 'noir', label: 'Noir', kind: 'color', aliases: ['noir', 'noire', 'black'] },
  { key: 'gris', label: 'Gris', kind: 'color', aliases: ['gris'] },
  { key: 'bleu', label: 'Bleu', kind: 'color', aliases: ['bleu'] },
  { key: 'vert', label: 'Vert', kind: 'color', aliases: ['vert', 'menthe'] },
  { key: 'rouge', label: 'Rouge', kind: 'color', aliases: ['rouge'] },
  { key: 'beige', label: 'Beige', kind: 'color', aliases: ['beige', 'grege', 'cachemire'] },
  { key: 'marron', label: 'Marron', kind: 'color', aliases: ['marron', 'chocolat'] },
  { key: 'anthracite', label: 'Anthracite', kind: 'color', aliases: ['anthracite', 'anthrazit'] },
  { key: 'creme', label: 'Crème', kind: 'color', aliases: ['creme', 'caramel'] },
  { key: 'rose', label: 'Rose', kind: 'color', aliases: ['rose'] },
  { key: 'terracotta', label: 'Terracotta', kind: 'color', aliases: ['terracotta', 'brique'] },
  { key: 'taupe', label: 'Taupe', kind: 'color', aliases: ['taupe'] },
  { key: 'dore', label: 'Doré', kind: 'color', aliases: ['dore', 'or', 'gold'] },
  { key: 'argent', label: 'Argent', kind: 'color', aliases: ['argent', 'silver', 'aluminium'] },
  { key: 'camel', label: 'Camel', kind: 'color', aliases: ['camel'] },
  { key: 'champagne', label: 'Champagne', kind: 'color', aliases: ['champagne'] },
  { key: 'graphite', label: 'Graphite', kind: 'color', aliases: ['graphite'] },
  { key: 'bordeaux', label: 'Bordeaux', kind: 'color', aliases: ['bordeaux'] },
  { key: 'ivoire', label: 'Ivoire', kind: 'color', aliases: ['ivoire'] },
  { key: 'jaune', label: 'Jaune', kind: 'color', aliases: ['jaune'] },
  { key: 'orange', label: 'Orange', kind: 'color', aliases: ['orange'] },
  // --- materials (a finish/grain a chatbot can still offer as a "look") ---
  { key: 'chene', label: 'Chêne', kind: 'material', aliases: ['chene'] },
  { key: 'bois', label: 'Bois', kind: 'material', aliases: ['bois'] },
  { key: 'noyer', label: 'Noyer', kind: 'material', aliases: ['noyer'] },
  { key: 'sonoma', label: 'Sonoma', kind: 'material', aliases: ['sonoma'] },
  { key: 'hetre', label: 'Hêtre', kind: 'material', aliases: ['hetre'] },
  { key: 'beton', label: 'Béton', kind: 'material', aliases: ['beton'] },
  { key: 'ciment', label: 'Ciment', kind: 'material', aliases: ['ciment'] },
  { key: 'marbre', label: 'Marbre', kind: 'material', aliases: ['marbre', 'quartzite', 'granit'] },
  { key: 'inox', label: 'Inox', kind: 'material', aliases: ['inox', 'acier'] },
  { key: 'naturel', label: 'Naturel', kind: 'material', aliases: ['naturel', 'naturelle'] },
  { key: 'metal', label: 'Métal', kind: 'material', aliases: ['metal', 'zinc', 'cuivre'] },
];

/** Flat token -> Family map (aliases are unique across families). */
const ALIAS_MAP: Map<string, Family> = new Map(
  FAMILIES.flatMap((f) => f.aliases.map((a) => [a, f] as const)),
);

/**
 * Insert a space at camelCase boundaries ("GrisBeige" -> "Gris Beige").
 * The 2nd group is ASCII uppercase ONLY: a wider range like `À-Ÿ` (Ÿ = U+0178)
 * would span U+00C0–U+0178 and wrongly treat lowercase accented letters
 * (é/è/ê = U+00E8–EA) as "uppercase", splitting "Chêne" into "Ch êne".
 */
function splitCamel(s: string): string {
  return s.replace(/([a-zà-ÿ0-9])([A-Z])/g, '$1 $2');
}

const UNKNOWN: NormalizedColor = { key: 'unknown', label: '', kind: 'unknown', score: -1 };

/**
 * Normalize a raw color string to a family. Returns `unknown` (score -1) for
 * null/empty or values with no recognizable color/material token.
 */
export function normalizeColor(raw: string | null | undefined): NormalizedColor {
  if (raw == null || !String(raw).trim()) {return UNKNOWN;}
  const norm = baseNorm(splitCamel(String(raw)));
  const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length > 0 && !STOPWORDS.has(t));

  for (const t of tokens) {
    const fam = ALIAS_MAP.get(t);
    if (fam) {
      // Trend score: dict colors keep their tier score; materials are neutral.
      const score = fam.kind === 'material' ? 50 : (extractColor(norm)?.score ?? 50);
      return { key: fam.key, label: fam.label, kind: fam.kind, score };
    }
  }
  return UNKNOWN;
}
