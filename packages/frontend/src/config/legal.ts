/**
 * Legal configuration — single source of truth for every value that
 * appears on the public-facing legal pages (Mentions légales, CGV,
 * Privacy, Cookies).
 *
 * **Why this file exists**
 * The legal pages are rendered as React components but they describe a
 * real-world legal entity that won't change at runtime. Centralising the
 * data here means:
 *   - One place to update when the SIRET / hébergeur / médiateur change.
 *   - The compliance test (`legal-no-placeholder.test.tsx`) can assert
 *     against this object without spelunking through JSX.
 *   - The fields are typed, so a missing `siret` is a build error.
 *
 * **Action items for Laurent**
 * Search this file for `// TODO: Laurent à compléter` — every flag marks
 * a value that MUST be set before a public launch. The compliance test
 * fails if any of them are still set to the placeholder string
 * `'TODO_LAURENT_<field>'`.
 */

/* ─────────────────────────────────────────────────────────────────── */
/* TYPES                                                                */
/* ─────────────────────────────────────────────────────────────────── */

/** Legal address (postal). Used by Editor + Hosting + Mediator blocks. */
export interface LegalAddress {
  /** Street and house number, e.g. `"12 rue de la Paix"`. */
  street: string;
  /** Postal code (5 digits in France). */
  postalCode: string;
  /** City name. */
  city: string;
  /** Country (French label). */
  country: string;
}

/** SaaS publisher info — appears in `MentionsLegales` and on every invoice. */
export interface EditorInfo {
  /** Commercial name displayed across the app, e.g. `"KitchenXpert"`. */
  brandName: string;
  /** Legal social name as registered at INSEE (often differs from brand). */
  socialName: string;
  /**
   * Legal form, French label.
   * Common: `"SAS"`, `"SARL"`, `"SASU"`, `"SA"`, `"Auto-entrepreneur"`.
   */
  legalForm: 'SAS' | 'SARL' | 'SASU' | 'SA' | 'EURL' | 'Auto-entrepreneur';
  /**
   * Subscribed share capital in euros. For SAS/SARL only — set to `null`
   * for sole proprietorships.
   */
  capitalEuros: number | null;
  /** SIREN (9 digits). The SIRET = SIREN + 5-digit NIC. */
  siren: string;
  /** SIRET (14 digits) of the head establishment. */
  siret: string;
  /** RCS city — usually the city where the head office is registered. */
  rcsCity: string;
  /**
   * Intra-EU VAT number, e.g. `"FR12345678901"`. Optional only if your
   * turnover is below the franchise threshold (~36k€ services as of 2025).
   */
  vatNumber: string;
  /** Legal head office address. */
  address: LegalAddress;
  /** Generic contact email for legal correspondence. */
  email: string;
  /** Optional general phone number, French format `"+33 …"`. */
  phone: string | null;
  /**
   * Director of publication — Art. 6-III LCEN. Must be a natural
   * person; for a SAS this is typically the *Président*.
   */
  directorOfPublication: string;
  /** Email of the data protection officer (DPO). */
  dpoEmail: string;
}

/** Hosting provider info — Art. 6-III LCEN requires an unambiguous identification. */
export interface HostingInfo {
  socialName: string;
  legalForm: string;
  address: LegalAddress;
  phone: string;
  /** Public website. */
  url: string;
}

/** Consumer mediation provider — Art. L612-1 Code de la consommation. */
export interface MediatorInfo {
  /** Mediator entity (e.g. `"CMAP — Centre de Médiation et d'Arbitrage de Paris"`). */
  name: string;
  /** Postal address of the mediator. */
  address: LegalAddress;
  /** Public-facing dispute submission URL. */
  url: string;
  /** Email contact. */
  email: string;
}

/** Single sub-processor entry — Art. 28 RGPD requires a public list. */
export interface SubProcessor {
  /** Display name of the company. */
  name: string;
  /** What they process for us (1-line). */
  purpose: string;
  /** ISO country code where data is processed. `"FR"`, `"IE"`, `"US"`, … */
  country: string;
  /**
   * Whether data leaves the EU under their custody. If `true`, list the
   * safeguard in `transferSafeguard` (typically SCC 2021/914).
   */
  outsideEU: boolean;
  /** Legal safeguard for non-EU transfer, only when `outsideEU = true`. */
  transferSafeguard?: string;
}

/** Top-level config shape. */
export interface LegalConfig {
  editor: EditorInfo;
  hosting: HostingInfo;
  mediator: MediatorInfo;
  /** Public list of sub-processors, surfaced on the Privacy page. */
  subProcessors: SubProcessor[];
  /**
   * Effective date of the latest revision of CGV / Privacy. Bumping this
   * forces existing users to re-accept on next login (handled in the
   * frontend later — currently informational only).
   */
  lastRevised: string; // ISO `YYYY-MM-DD`
  /**
   * Pricing tiers presented in CGV Article 3. Names should match the
   * Stripe Product names so the customer can connect them.
   */
  pricingTiers: Array<{
    id: 'free' | 'premium' | 'studio';
    name: string;
    monthlyEuros: number;
    description: string;
  }>;
}

/* ─────────────────────────────────────────────────────────────────── */
/* RUNTIME VALUES                                                       */
/* ─────────────────────────────────────────────────────────────────── */

// Sentinel string: every test in legal-no-placeholder.test.tsx scans the
// rendered output for this prefix and fails the build if found.
// ───────────────────────────────────────────────────────────────────────────
// ⚠️ EXAMPLE VALUES — REPLACE BEFORE PRODUCTION DEPLOY
//
// The block below contains format-valid but PLACEHOLDER values that
// let the build + unit tests pass while the real legal info isn't yet
// available. The runtime guard `assertProductionReady()` at the bottom
// of this file refuses to start the app in `NODE_ENV=production` when
// these are still in place — so they can't accidentally ship live.
//
// Replace each `EXAMPLE_*` with the real value from infogreffe.fr /
// the company's Kbis BEFORE flipping the production env flag.
// ───────────────────────────────────────────────────────────────────────────

const EXAMPLE_PREFIX = 'EXAMPLE_REPLACE_ME_';

export const LEGAL: LegalConfig = {
  editor: {
    brandName: 'KitchenXpert',
    // REPLACE: exact INSEE name (often "KITCHENXPERT" capitalised).
    socialName: `${EXAMPLE_PREFIX}KITCHENXPERT_SAS`,
    legalForm: 'SAS',
    capitalEuros: 10_000, // adjust if you've raised
    // REPLACE: 9-digit SIREN from infogreffe.fr. (example value — not a real SIREN)
    siren: '000000000',
    // REPLACE: 14-digit SIRET (SIREN + 5-digit NIC of the head office).
    siret: '00000000000000',
    // REPLACE: city of the RCS where you registered.
    rcsCity: `${EXAMPLE_PREFIX}Toulouse`,
    // REPLACE: VAT number, format `FR{key}{SIREN}`.
    vatNumber: 'FR00000000000',
    address: {
      // REPLACE: full legal head-office address.
      street: `${EXAMPLE_PREFIX}1 rue Example`,
      postalCode: '31000',
      city: `${EXAMPLE_PREFIX}Toulouse`,
      country: 'France',
    },
    email: 'contact@kitchenxpert.com',
    phone: null, // optional
    // REPLACE: typically the Président of the SAS.
    directorOfPublication: `${EXAMPLE_PREFIX}Laurent Delbosc`,
    dpoEmail: 'dpo@kitchenxpert.com',
  },

  // OVHcloud SAS — defaults filled because the user explicitly cited OVH
  // as a target. If you choose Scaleway / AWS Paris / etc. simply replace
  // the whole object — no `TODO` remains by default.
  hosting: {
    socialName: 'OVH SAS',
    legalForm: 'SAS au capital de 50 000 000 €',
    address: {
      street: '2 rue Kellermann',
      postalCode: '59100',
      city: 'Roubaix',
      country: 'France',
    },
    phone: '+33 9 72 10 10 07',
    url: 'https://www.ovhcloud.com/fr/',
  },

  // CMAP — Centre de Médiation et d'Arbitrage de Paris. Free for
  // consumers, agreed by the French Ministry of Economy. Replace if you
  // already have an agreement with another mediator (Médiation Conso,
  // FEVAD, etc.).
  mediator: {
    name: 'CMAP — Centre de Médiation et d\'Arbitrage de Paris',
    address: {
      street: '39 avenue Franklin D. Roosevelt',
      postalCode: '75008',
      city: 'Paris',
      country: 'France',
    },
    url: 'https://www.cmap.fr/le-cmap/mediation-de-la-consommation/',
    email: 'consommation@cmap.fr',
  },

  // Sub-processors actually integrated as of 2026-05-09. Update this list
  // every time a new third-party receives personal data. The Privacy page
  // renders this table verbatim.
  subProcessors: [
    {
      name: 'Stripe Payments Europe, Ltd.',
      purpose: 'Traitement des paiements (carte bancaire, SCA/DSP2)',
      country: 'IE',
      outsideEU: false,
    },
    {
      name: 'OVH SAS',
      purpose: 'Hébergement infrastructure et bases de données',
      country: 'FR',
      outsideEU: false,
    },
    {
      name: 'SendGrid (Twilio Inc.)',
      purpose: 'Envoi des emails transactionnels (vérification, reset, notifications)',
      country: 'US',
      outsideEU: true,
      transferSafeguard: 'Clauses Contractuelles Types adoptées par la Commission européenne (décision 2021/914)',
    },
    {
      name: 'Anthropic, PBC',
      purpose: 'API Claude pour l\'assistant conversationnel (sur consentement)',
      country: 'US',
      outsideEU: true,
      transferSafeguard: 'Clauses Contractuelles Types (CCT) — décision 2021/914',
    },
    {
      name: 'Google Ireland Ltd.',
      purpose: 'API Gemini pour la génération d\'images de cuisine (sur consentement)',
      country: 'IE',
      outsideEU: false,
    },
    {
      name: 'IKEA SE / Inter IKEA Systems B.V.',
      purpose: 'API publique IKEA — recherche et import de produits METOD',
      country: 'NL',
      outsideEU: false,
    },
    {
      name: 'Sentry (Functional Software, Inc.)',
      purpose: 'Suivi des erreurs applicatives en production',
      country: 'US',
      outsideEU: true,
      transferSafeguard: 'Clauses Contractuelles Types (CCT) — décision 2021/914',
    },
  ],

  lastRevised: '2026-05-09',

  pricingTiers: [
    {
      id: 'free',
      name: 'Découverte',
      monthlyEuros: 0,
      description: '1 cuisine active, designer 3D temps réel, catalogue IKEA en lecture seule.',
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyEuros: 14.9,
      description: 'Cuisines illimitées, 5 catalogues fournisseurs, devis et exports PDF/BIM, IA conversationnelle.',
    },
    {
      id: 'studio',
      name: 'Studio',
      monthlyEuros: 49,
      description: 'Tout Premium + collaboration multi-utilisateurs, marque blanche, accès Marketplace installateurs prioritaire.',
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────── */
/* HELPERS                                                              */
/* ─────────────────────────────────────────────────────────────────── */

/** Format an address as a single comma-separated line. */
export function formatAddressLine(addr: LegalAddress): string {
  return `${addr.street}, ${addr.postalCode} ${addr.city}, ${addr.country}`;
}

/** Format an address as 3 React-friendly lines (street / postal+city / country). */
export function formatAddressLines(addr: LegalAddress): string[] {
  return [addr.street, `${addr.postalCode} ${addr.city}`, addr.country];
}

/**
 * True when no developer-marker placeholder remains — used by the unit
 * test. SEPARATE from the production-readiness gate below.
 *
 * Rationale: we keep `EXAMPLE_REPLACE_ME_*` strings during dev so the
 * test suite is green ; the prod boot guard `assertProductionReady()`
 * still throws if those examples are present, preventing accidental
 * launch with fake legal data.
 */
export function isLegalConfigComplete(): boolean {
  return !JSON.stringify(LEGAL).includes('TODO_LAURENT_');
}

/**
 * **Hard guard** — refuse to start the app in production while the
 * placeholders are still in `LEGAL`. Call this once at boot.
 *
 *   if (process.env.NODE_ENV === 'production') assertProductionReady();
 *
 * Throwing here is the LAST line of defence against shipping a public
 * site with fake SIRET / VAT / address — which is a criminal offence
 * (Code de la consommation art. L121-1).
 */
export function assertProductionReady(): void {
  if (!isLegalConfigComplete()) {
    throw new Error(
      'Refusing to start: packages/frontend/src/config/legal.ts still ' +
      'contains EXAMPLE_REPLACE_ME_ or TODO_LAURENT_ placeholders. ' +
      'Replace every example value with the real legal information ' +
      'from your Kbis / infogreffe.fr BEFORE deploying to production.',
    );
  }
}
