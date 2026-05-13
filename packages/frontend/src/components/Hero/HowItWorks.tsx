import React from 'react';
import { Link } from 'react-router-dom';

/**
 * "Du croquis au devis signé en 3 étapes" — sits between the hero and
 * the logo strip. Three card grid (responsive: stacks on mobile).
 *
 * Visuals: SVG-based step illustrations (zero-byte vs raster, scales
 * without artefacts, matches the dark aurora palette). Replace the
 * <Step*Illustration /> blocks with real PNG screenshots once the
 * designer is feature-complete.
 */

interface StepProps {
  index: number;
  title: string;
  description: string;
  illustration: React.ReactNode;
}

function Step({ index, title, description, illustration }: StepProps): React.ReactElement {
  return (
    <article className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:from-white/[0.07]">
      <div className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-sm font-semibold text-white/80">
        {index}
      </div>

      <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-black/80">
        {illustration}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
      </div>
    </article>
  );
}

export function HowItWorks(): React.ReactElement {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="relative mx-auto max-w-7xl px-6 py-20"
    >
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <h2
          id="how-it-works-heading"
          className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
        >
          Du croquis au devis signé en 3 étapes
        </h2>
        <p className="mt-4 text-base text-white/55">
          Pas de RDV magasin. Pas d'appel commercial. Vous concevez, vous comparez, vous décidez.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Step
          index={1}
          title="Importez votre plan"
          description="Cotes saisies à la main ou photo annotée — le tout en moins de 5 minutes."
          illustration={<ImportIllustration />}
        />
        <Step
          index={2}
          title="Concevez en 3D"
          description="Drag-drop des meubles depuis le catalogue IKEA, Schmidt, Bosch — visuel temps réel."
          illustration={<DesignerIllustration />}
        />
        <Step
          index={3}
          title="Recevez vos devis"
          description="5 fournisseurs comparés en parallèle, devis PDF prêt à signer en un clic."
          illustration={<QuoteIllustration />}
        />
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          to="/designer/sandbox"
          className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 backdrop-blur transition hover:border-white/30 hover:bg-white/10"
        >
          Essayer maintenant
          <span className="transition group-hover:translate-x-0.5" aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG illustrations — replace with real screenshots later.
// ---------------------------------------------------------------------------
const ImportIllustration = (): React.ReactElement => (
  <svg viewBox="0 0 200 120" className="h-32 w-auto" aria-hidden>
    <defs>
      <linearGradient id="imp-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    <rect x="20" y="20" width="160" height="80" rx="8" stroke="url(#imp-grad)" strokeWidth="1.5" fill="rgba(255,255,255,0.02)" strokeDasharray="6 4" />
    <path d="M100 45 L100 75 M85 60 L100 75 L115 60" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <text x="100" y="105" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="system-ui">plan-cuisine.pdf</text>
  </svg>
);

const DesignerIllustration = (): React.ReactElement => (
  <svg viewBox="0 0 200 120" className="h-32 w-auto" aria-hidden>
    {/* Floor grid */}
    <g stroke="rgba(255,255,255,0.08)" strokeWidth="0.5">
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={`h${i}`} x1="20" y1={20 + i * 14} x2="180" y2={20 + i * 14} />
      ))}
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`v${i}`} x1={20 + i * 14} y1="20" x2={20 + i * 14} y2="104" />
      ))}
    </g>
    {/* Cabinets */}
    <rect x="30" y="30" width="40" height="20" fill="#a78bfa" opacity="0.7" rx="2" />
    <rect x="74" y="30" width="40" height="20" fill="#c4b5fd" opacity="0.6" rx="2" />
    <rect x="118" y="30" width="40" height="20" fill="#a78bfa" opacity="0.7" rx="2" />
    <rect x="30" y="55" width="20" height="40" fill="#ec4899" opacity="0.5" rx="2" />
    {/* Snap line */}
    <line x1="74" y1="20" x2="74" y2="100" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
  </svg>
);

const QuoteIllustration = (): React.ReactElement => (
  <svg viewBox="0 0 200 120" className="h-32 w-auto" aria-hidden>
    <rect x="20" y="20" width="160" height="80" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    {[
      { y: 35, label: 'IKEA',          price: '4 280 €', color: '#facc15' },
      { y: 52, label: 'Leroy Merlin',  price: '4 950 €', color: '#fb7185' },
      { y: 69, label: 'Schmidt',       price: '8 200 €', color: '#a78bfa' },
      { y: 86, label: 'Mobalpa',       price: '7 850 €', color: '#60a5fa' },
    ].map((row) => (
      <g key={row.label}>
        <circle cx="32" cy={row.y + 4} r="3" fill={row.color} />
        <text x="42" y={row.y + 7} fill="rgba(255,255,255,0.85)" fontSize="9" fontFamily="system-ui">{row.label}</text>
        <text x="170" y={row.y + 7} textAnchor="end" fill="#fff" fontSize="9" fontFamily="system-ui" fontWeight="600">{row.price}</text>
      </g>
    ))}
  </svg>
);

export default HowItWorks;
