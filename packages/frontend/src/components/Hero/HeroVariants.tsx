import { ArrowRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { HeroVideo } from './HeroVideo';
import { tagConversion } from '../../hooks/useABVariant';

/**
 * 3 hero variants, A/B/C-tested via `useABVariant('hero', ['A','B','C'])`.
 *
 *   A — Video only, headline ABOVE. Closest to today's hero.
 *   B — Video full-bleed, headline OVERLAY at the top of the video.
 *   C — Two-column split: video right, headline + CTAs left (desktop)
 *       or stacked (mobile).
 *
 * All three share the same eyebrow chip + tagline + CTA copy so the
 * only confounding variable is the layout.
 *
 * Conversion tracking (sliced by variant via `tagConversion`):
 *   - CTA clicks here → `hero_cta_primary_click` / `hero_cta_secondary_click`
 *   - Signup intent in SignupPromptModal → `sandbox_signup_intent_ab`
 *   - Signup completion in SandboxMigrationBanner → `sandbox_signup_completed_ab`
 */

const Eyebrow = (): React.ReactElement => (
  <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/80 backdrop-blur">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
    Nouveau — Configurateur IA v2 disponible
  </div>
);

const Headline = ({ size = 'xl' }: { size?: 'xl' | 'lg' }): React.ReactElement => (
  <h1
    className={`mx-auto max-w-4xl bg-gradient-to-b from-white to-white/60 bg-clip-text font-semibold leading-[1.05] tracking-tight text-transparent ${
      size === 'xl' ? 'text-5xl sm:text-6xl md:text-7xl' : 'text-4xl sm:text-5xl md:text-6xl'
    }`}
  >
    La cuisine que vous imaginez,
    <br />
    <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-rose-300 bg-clip-text text-transparent">
      conçue en quelques minutes.
    </span>
  </h1>
);

const Tagline = (): React.ReactElement => (
  <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60 sm:text-xl">
    Designer 3D temps réel · Catalogue IKEA + 4 fournisseurs · Devis instantané
  </p>
);

const CTAs = ({ align = 'center' }: { align?: 'center' | 'start' }): React.ReactElement => (
  <div
    className={`mt-10 flex flex-col gap-3 sm:flex-row ${align === 'center' ? 'justify-center' : 'justify-start'}`}
  >
    <Link
      to="/designer/sandbox"
      onClick={() => tagConversion('hero', 'hero_cta_primary_click')}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_40px_rgba(255,255,255,0.12)] transition hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_60px_rgba(255,255,255,0.25)]"
    >
      Essayer le designer
      <ArrowRight className="w-4 h-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
    <Link
      to="/register"
      onClick={() => tagConversion('hero', 'hero_cta_secondary_click')}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:border-white/25 hover:bg-white/10"
    >
      Créer un compte
    </Link>
  </div>
);

const Footnote = (): React.ReactElement => (
  <p className="mt-6 text-xs text-white/40">
    Aucun compte requis pour essayer · Sauvegarde locale automatique · RGPD conforme
  </p>
);

// ---------------------------------------------------------------------------
// Variant A — Video below the fold of headline. Closest to today's hero.
// ---------------------------------------------------------------------------
export function HeroA(): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-20 pb-24 text-center sm:pt-28">
      <Eyebrow />
      <Headline />
      <Tagline />
      <CTAs />
      <Footnote />

      <div className="mx-auto mt-16 max-w-5xl">
        <HeroVideo aspectRatio="16 / 10" />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Variant B — Video full-bleed with headline overlay at the top.
// ---------------------------------------------------------------------------
export function HeroB(): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-12 pb-24 text-center sm:pt-16">
      <Eyebrow />

      <div className="relative mx-auto mt-8 max-w-6xl">
        {/* The video is the visual centerpiece. Headline floats above it
            with a translucent dark scrim so contrast stays AA. */}
        <HeroVideo aspectRatio="16 / 9" className="!shadow-[0_30px_80px_rgba(99,102,241,0.25)]" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-10 sm:pt-16">
          <Headline size="lg" />
          <div className="pointer-events-auto">
            <CTAs />
          </div>
        </div>

        {/* Top-down dark scrim for contrast on the overlay text */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-black/65 via-black/30 to-transparent"
        />
      </div>

      <Footnote />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Variant C — Two-column split: headline + CTAs left, video right.
// ---------------------------------------------------------------------------
export function HeroC(): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <Eyebrow />
          <Headline size="lg" />
          <p className="mt-6 max-w-xl text-lg text-white/60 mx-auto lg:mx-0">
            Designer 3D temps réel · Catalogue IKEA + 4 fournisseurs · Devis instantané
          </p>
          <CTAs align="start" />
          <Footnote />
        </div>

        <div className="relative">
          <HeroVideo aspectRatio="4 / 3" className="!shadow-[0_30px_80px_rgba(167,139,250,0.22)]" />
        </div>
      </div>
    </section>
  );
}
