import { ArrowLeft } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import { SeoHead } from '../../components/seo/SeoHead';

const NAV = [
  { to: '/legal/mentions', label: 'Mentions légales' },
  { to: '/legal/cgv', label: 'CGV' },
  { to: '/legal/privacy', label: 'Confidentialité' },
  { to: '/legal/cookies', label: 'Cookies' },
  { to: '/legal/accessibilite', label: 'Accessibilité' },
  { to: '/legal/privacy-settings', label: 'Mes données' },
];

// Per-route SEO metadata. Indexed by pathname so SeoHead picks the
// right copy automatically.
const SEO_BY_PATH: Record<string, { title: string; description: string }> = {
  '/legal/mentions':         { title: 'Mentions légales', description: 'Éditeur, hébergeur, médiateur de la consommation, propriété intellectuelle — KitchenXpert.' },
  '/legal/cgv':              { title: 'Conditions générales de vente', description: 'CGV de KitchenXpert : abonnements, paiements, droit de rétractation, médiation.' },
  '/legal/privacy':          { title: 'Politique de confidentialité', description: 'Données collectées, base légale RGPD, sous-traitants, durée de conservation, vos droits.' },
  '/legal/cookies':          { title: 'Politique cookies', description: 'Liste exhaustive des cookies, durée, finalité. Conforme directive ePrivacy + lignes directrices CNIL 2020.' },
  '/legal/accessibilite':    { title: "Déclaration d'accessibilité", description: "Conformité RGAA 4.1.2, taux de conformité, contacts et voies de recours." },
  '/legal/privacy-settings': { title: 'Mes données personnelles',    description: "Exportez ou supprimez vos données conformément aux articles 15 et 17 du RGPD." },
};

export default function LegalLayout({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  const { pathname } = useLocation();
  const seo = SEO_BY_PATH[pathname] ?? { title, description: 'Page légale de KitchenXpert.' };
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SeoHead
        title={seo.title}
        description={seo.description}
        canonical={`https://kitchenxpert.com${pathname}`}
        // /legal/privacy-settings is auth-only — keep crawlers out
        noindex={pathname.includes('privacy-settings')}
      />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Retour à l&apos;accueil
        </Link>

        <div className="grid gap-12 md:grid-cols-[240px_1fr]">
          <aside>
            <div className="text-xs uppercase tracking-widest text-white/55 mb-4">Espace légal</div>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main>
            <h1 className="mb-8 text-4xl font-semibold tracking-tight">{title}</h1>
            <div className="prose prose-invert max-w-none prose-headings:tracking-tight prose-p:text-white/80 prose-li:text-white/80">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
