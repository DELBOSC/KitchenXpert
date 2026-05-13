/**
 * Content collections — Zod schemas for the 5 article templates.
 *
 * Astro validates every MDX frontmatter against these at build time,
 * so a typo in `slug` or a missing `description` fails the build
 * instead of shipping bad SEO.
 *
 * One collection per template = one Zod schema per template. They
 * share a `base` schema so the SEO essentials (title, description,
 * canonical, image) are guaranteed everywhere.
 */
import { defineCollection, z } from 'astro:content';

// ---------------------------------------------------------------------------
// Shared base schema
// ---------------------------------------------------------------------------

const base = z.object({
  /** <h1> + <title> + og:title. 50–60 chars target. */
  title: z.string().min(20).max(70),
  /** Meta description + og:description. 150–160 chars target. */
  description: z.string().min(110).max(180),
  /** Slug — must match the file name. Astro deduces it but we keep
   *  it in frontmatter so it's grep-able. */
  slug: z.string().regex(/^[a-z0-9-/]+$/),
  /** Author key — references the team file at `src/data/authors.ts`. */
  author: z.enum(['laurent', 'redaction', 'invited']).default('redaction'),
  /** Publication date (ISO `YYYY-MM-DD`). */
  publishedAt: z.coerce.date(),
  /** Last edit (auto-bumped by the CI pre-commit hook). */
  updatedAt: z.coerce.date().optional(),
  /** Cover image — relative to `src/assets/`. Optional; OG fallback used otherwise. */
  cover: z.string().optional(),
  /** Reading time in minutes — auto-computed by `<ArticleHeader>` if absent. */
  readingMinutes: z.number().int().positive().optional(),
  /** SEO keywords (not a meta tag — used for the related-articles graph). */
  keywords: z.array(z.string()).min(2).max(10),
  /** Hide from listing + sitemap when `true`. */
  draft: z.boolean().default(false),
  /** Slug fragments of related articles (for the bottom "À lire ensuite"). */
  related: z.array(z.string()).max(5).default([]),
});

// ---------------------------------------------------------------------------
// Per-template extensions
// ---------------------------------------------------------------------------

const layout = base.extend({
  /** L_SHAPED, U_SHAPED… — same enum as the sandbox store. */
  layoutType: z.enum([
    'L_SHAPED', 'U_SHAPED', 'GALLEY', 'ISLAND', 'PENINSULA', 'ONE_WALL', 'OPEN_PLAN',
    'CLOSED', 'SMALL', 'LARGE',
  ]),
  /** Average budget in € for this layout (median of items priced in the article). */
  budgetMin: z.number().int().positive(),
  budgetMax: z.number().int().positive(),
});

const cuisiniste = base.extend({
  /** Brand name (display). */
  brandName: z.string(),
  /** Brand parent group, e.g. "Salm Group" for Schmidt. */
  parentGroup: z.string().optional(),
  /** Country of origin. */
  country: z.string().default('France'),
  /** Average price-per-linear-meter range in € (kitchen total = ~3 m). */
  pricePerLinearMeterMin: z.number().int().positive(),
  pricePerLinearMeterMax: z.number().int().positive(),
  /** Sub-brands or product lines covered. */
  productLines: z.array(z.string()).default([]),
  /** Slugs of competitor articles (for cross-linking). */
  competitors: z.array(z.string()).default([]),
});

const budget = base.extend({
  /** Target budget in €. */
  budgetEuros: z.number().int().positive(),
  /** Recommended layout categories at this budget. */
  recommendedLayouts: z.array(z.string()).default([]),
  /** Trade-offs the user must accept at this budget tier. */
  tradeoffs: z.array(z.string()).min(2).max(8),
});

const style = base.extend({
  /** Style name slug — matches /styles/cuisine-<slug>. */
  styleSlug: z.string(),
  /** Dominant material palette. */
  materials: z.array(z.string()).min(1),
  /** Dominant colour palette (hex). */
  colorPalette: z.array(z.string()).min(2),
  /** Era / origin (e.g. "Bauhaus, années 1920"). */
  origin: z.string(),
});

const comparatif = base.extend({
  /** Two things being compared, e.g. ["IKEA", "Leroy Merlin"]. */
  contenders: z.tuple([z.string(), z.string()]),
  /** Criteria axes. */
  criteria: z.array(z.string()).min(3).max(10),
  /** Verdict per user profile. */
  verdicts: z.array(z.object({
    profile: z.string(),
    winner: z.string(),
    reason: z.string(),
  })).min(1),
});

const pratique = base.extend({
  /** Topic — used for sidebar grouping on the hub. */
  topic: z.enum(['mesure', 'normes', 'fiscalite', 'garanties', 'process']),
  /** Estimated time the reader needs to ACT on the advice (not just read). */
  actionMinutes: z.number().int().positive().optional(),
});

// ---------------------------------------------------------------------------
// COMPETITORS — KitchenXpert vs <SaaS concurrent>
// Distinct du `comparatifs` (qui compare des PRODUITS — IKEA vs Leroy Merlin).
// URL : /comparatifs/vs-<slug>. Mots-clés cibles : "<concurrent> alternative",
// "<concurrent> français", etc.
//
// **Conformité publicité comparative (Code conso L122-1+) :**
//   - Tous les `criteria` doivent citer une `source` URL + `verifiedAt`.
//   - Le `verdictDate` doit être ≤ 90 jours pour rester "récent".
//   - `denigratesCompetitor` est un boolean qui DOIT rester false ;
//     la CI fait échouer le build si true (voir scripts/check-competitor-facts.mjs).
// ---------------------------------------------------------------------------

const competitor = base.extend({
  /** Display name (« Coohom », « Planner 5D »…). */
  competitorName: z.string().min(2).max(60),
  /** Slug du concurrent — apparaît dans l'URL `/comparatifs/vs-<slug>`. */
  competitorSlug: z.string().regex(/^[a-z0-9-]+$/),
  /** Site officiel du concurrent (cité dans les sources). */
  competitorUrl: z.string().url(),
  /** Pays / siège juridique du concurrent — utile pour la section RGPD. */
  competitorHq: z.string(),
  /** Date de la dernière vérification factuelle complète. */
  verdictDate: z.coerce.date(),
  /** Garde-fou éditorial — DOIT rester false. */
  denigratesCompetitor: z.literal(false).default(false),
  /**
   * 3 raisons légitimes de choisir le concurrent — obligatoire pour
   * la crédibilité de l'article (et pour rester "objectif" au sens L122-1).
   */
  reasonsToChooseCompetitor: z.array(z.string()).min(3).max(5),
  /** 5 raisons de choisir KitchenXpert. */
  reasonsToChooseUs: z.array(z.string()).min(5).max(8),
});

// ---------------------------------------------------------------------------
// Collections export — Astro reads this at build time
// ---------------------------------------------------------------------------

export const collections = {
  layouts:     defineCollection({ type: 'content', schema: layout }),
  cuisinistes: defineCollection({ type: 'content', schema: cuisiniste }),
  budgets:     defineCollection({ type: 'content', schema: budget }),
  styles:      defineCollection({ type: 'content', schema: style }),
  comparatifs: defineCollection({ type: 'content', schema: comparatif }),
  pratiques:   defineCollection({ type: 'content', schema: pratique }),
  competitors: defineCollection({ type: 'content', schema: competitor }),
};

export type LayoutFrontmatter     = z.infer<typeof layout>;
export type CuisinisteFrontmatter = z.infer<typeof cuisiniste>;
export type BudgetFrontmatter     = z.infer<typeof budget>;
export type StyleFrontmatter      = z.infer<typeof style>;
export type ComparatifFrontmatter = z.infer<typeof comparatif>;
export type PratiqueFrontmatter   = z.infer<typeof pratique>;
export type CompetitorFrontmatter = z.infer<typeof competitor>;
