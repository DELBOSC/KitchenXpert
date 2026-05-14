import { Globe2, MapPin, ShieldCheck, Zap } from 'lucide-react';
import React from 'react';

/**
 * TrustBar — 4 micro-claims sous le hero.
 *
 * **Légalité** : chaque claim est vérifiable et stable. Si la
 * condition cesse d'être vraie (ex. migration AWS US), retire le
 * claim — c'est de la pratique commerciale trompeuse sinon
 * (Art. L121-1 C. consommation).
 *
 *   - "Made in France"     ✓ : société domiciliée FR (cf legal.ts)
 *   - "Hébergé en UE"      ✓ : Postgres OVH, Redis Upstash EU, S3 Scaleway
 *   - "Conforme RGPD"      ✓ : pack legal (Mentions + CGV + Privacy + Cookies + Accessibilité)
 *   - "Sans inscription"   ✓ : /designer/sandbox accessible sans compte
 *
 * Le détail au hover est rendu via CSS-only tooltip (group-hover +
 * group-focus-within) pour survivre au prerendering et rester
 * accessible au clavier.
 */

interface ClaimProps {
  emoji: React.ReactNode;
  label: string;
  /** Détail apparaissant en tooltip au hover/focus. */
  detail: string;
  /** Lien optionnel vers la page qui prouve le claim. */
  href?: string;
}

function Claim({ emoji, label, detail, href }: ClaimProps): React.ReactElement {
  const content = (
    <>
      <span aria-hidden className="text-base">{emoji}</span>
      <span>{label}</span>
    </>
  );

  const trigger = href ? (
    <a
      href={href}
      aria-describedby={`tip-${label.replace(/\s+/g, '-')}`}
      className="inline-flex items-center gap-2 rounded-full px-1 text-sm text-white/75 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {content}
    </a>
  ) : (
    <span
      tabIndex={0}
      aria-describedby={`tip-${label.replace(/\s+/g, '-')}`}
      className="inline-flex items-center gap-2 rounded-full px-1 text-sm text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {content}
    </span>
  );

  return (
    <span className="group relative inline-block">
      {trigger}
      <span
        id={`tip-${label.replace(/\s+/g, '-')}`}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 hidden w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-[#0f0f15] px-3 py-2 text-xs leading-relaxed text-white/80 shadow-2xl backdrop-blur group-hover:block group-focus-within:block"
      >
        {detail}
      </span>
    </span>
  );
}

export function TrustBar(): React.ReactElement {
  return (
    <section
      aria-label="Garanties KitchenXpert"
      className="border-y border-white/5 bg-white/[0.015] py-6 backdrop-blur-sm"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-4 px-6 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:gap-y-3">
        <Claim
          emoji={<MapPin className="w-4 h-4" aria-hidden="true" />}
          label="Made in France"
          detail="Équipe basée à Toulouse. Conception, code et support en France."
        />
        <span aria-hidden className="hidden h-1 w-1 self-center rounded-full bg-white/15 sm:inline-block" />
        <Claim
          emoji={<Globe2 className="w-4 h-4" aria-hidden="true" />}
          label="Hébergé en Union Européenne"
          detail="Toutes vos données restent en UE : Postgres OVH (Gravelines), Redis Scaleway (Paris), Object Storage Scaleway. Les APIs IA tierces (Anthropic, Gemini) ne sont sollicitées qu'avec votre consentement explicite."
        />
        <span aria-hidden className="hidden h-1 w-1 self-center rounded-full bg-white/15 sm:inline-block" />
        <Claim
          emoji={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
          label="Conforme RGPD · DSP2 · LCEN"
          detail="Mentions légales, politique cookies CNIL, droits d'accès (Art. 15) et d'effacement (Art. 17) accessibles en 2 clics. Paiements DSP2/SCA via Stripe Irlande."
          href="/legal/privacy"
        />
        <span aria-hidden className="hidden h-1 w-1 self-center rounded-full bg-white/15 sm:inline-block" />
        <Claim
          emoji={<Zap className="w-4 h-4" aria-hidden="true" />}
          label="Sans inscription · Essai illimité"
          detail="Le designer 3D est utilisable immédiatement sans compte ni carte bancaire. Votre projet reste en local jusqu'à ce que vous décidiez de l'enregistrer."
          href="/designer/sandbox"
        />
      </div>
    </section>
  );
}

export default TrustBar;
