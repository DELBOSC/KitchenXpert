import { ArrowRight, Check, MapPin } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';


import { HeroA, HeroB, HeroC } from '../components/Hero/HeroVariants';
import { HowItWorks } from '../components/Hero/HowItWorks';
import { LogoStrip as BrandLogoStrip } from '../components/Hero/LogoStrip';
import { TrustBar } from '../components/Hero/TrustBar';
import { ReviewsSection } from '../components/Reviews/ReviewsSection';
import {
  SeoHead,
  ORGANIZATION_JSONLD,
  WEBSITE_JSONLD,
  SOFTWARE_JSONLD,
} from '../components/seo/SeoHead';
import { LiveCounter } from '../components/Trust/LiveCounter';
import { useABVariant } from '../hooks/useABVariant';
import { LocalizedLink } from '../i18n/LocalizedLink';

export default function HomePage(): React.ReactElement {
  const { t } = useTranslation();
  // Sticky 14-day A/B test on the hero layout. The variant is persisted
  // in localStorage by the hook + tagged into Plausible as
  // `ab_assignment` once per session.
  const variant = useABVariant('hero', ['A', 'B', 'C'] as const);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      <SeoHead
        title="KitchenXpert — Concevez votre cuisine en 3D avec l'IA"
        description="Plateforme française de conception de cuisines en 3D temps réel : IA, catalogue IKEA + 4 fournisseurs, devis instantané, installateurs certifiés. Essai sans compte."
        canonical="https://kitchenxpert.com/"
        jsonLd={[ORGANIZATION_JSONLD, WEBSITE_JSONLD, SOFTWARE_JSONLD]}
      />
      <AuroraBackground />

      <main className="relative z-10">
        {variant === 'A' && <HeroA />}
        {variant === 'B' && <HeroB />}
        {variant === 'C' && <HeroC />}

        <BrandLogoStrip />
        <TrustBar />

        {/* LiveCounter — discreet trust signal between the brands and the explainer */}
        <div className="mx-auto max-w-3xl px-6 py-10">
          <LiveCounter />
        </div>

        <HowItWorks />
        <ReviewsSection />

        <Features t={t} />
        <ShowcaseSplit />
        <Testimonial />
        <CTA t={t} />
      </main>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aurora / gradient background (Linear / Vercel inspired)
// ---------------------------------------------------------------------------
function AuroraBackground(): React.ReactElement {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-transparent blur-3xl" />
      <div className="absolute top-[20%] -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-cyan-400/20 to-transparent blur-3xl" />
      <div className="absolute top-[60%] -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-violet-500/20 to-transparent blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------
function Features({ t }: { t: (k: string) => string }): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-16 text-center">
        <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Tout pour passer du croquis au devis signé.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/60">
          Un moteur 3D temps réel, une IA entraînée sur 50 000 cuisines,
          et les catalogues fabricants connectés en direct.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          title={t('home.feature3dTitle')}
          description={t('home.feature3dDesc')}
          icon={<IconCube />}
          accent="from-indigo-500/20 to-transparent"
        />
        <FeatureCard
          title={t('home.featureAiTitle')}
          description={t('home.featureAiDesc')}
          icon={<IconSpark />}
          accent="from-fuchsia-500/20 to-transparent"
        />
        <FeatureCard
          title={t('home.featureCatalogTitle')}
          description={t('home.featureCatalogDesc')}
          icon={<IconBook />}
          accent="from-cyan-500/20 to-transparent"
        />
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  accent,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}): React.ReactElement {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-8 transition hover:border-white/20">
      <div className={`absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${accent} blur-2xl transition group-hover:scale-110`} aria-hidden />
      <div className="relative">
        <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">
          {icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-white/60">{description}</p>
      </div>
    </div>
  );
}

function IconCube(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconSpark(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v6m0 8v6M2 12h6m8 0h6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24" />
    </svg>
  );
}
function IconBook(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Showcase split
// ---------------------------------------------------------------------------
function ShowcaseSplit(): React.ReactElement {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            Workflow pro
          </div>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Du plan au chantier.
            <br />
            <span className="text-white/50">Sans friction.</span>
          </h2>
          <p className="mt-4 text-white/60">
            Générez un plan 3D, récupérez un devis fournisseur réel en un clic,
            exportez en PDF ou envoyez directement à votre installateur.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Import des plans existants (PDF, DWG, photo)',
              'Détection automatique des contraintes techniques',
              'Devis fournisseurs en temps réel',
              'Export BIM + liste de commande',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/80">
                <span className="mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 text-white"><Check className="w-3 h-3" aria-hidden="true" /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 blur-3xl" aria-hidden />
          <div className="relative grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            {[
              { label: 'Cabinets scandinaves', price: '3 240 €', stock: 'En stock' },
              { label: 'Plan de travail chêne massif', price: '890 €', stock: '48h' },
              { label: 'Îlot central 2m', price: '2 100 €', stock: 'En stock' },
              { label: 'Électroménager Bosch', price: '4 980 €', stock: '72h' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div>
                  <div className="text-sm font-medium">{row.label}</div>
                  <div className="mt-0.5 text-xs text-white/50">{row.stock}</div>
                </div>
                <div className="text-sm font-semibold text-white/90">{row.price}</div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="text-sm text-white/60">Total estimé</div>
              <div className="text-xl font-semibold text-white">11 210 €</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonial
// ---------------------------------------------------------------------------
function Testimonial(): React.ReactElement {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto mb-8 text-white/20">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h3M16 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-2xl font-medium leading-relaxed tracking-tight text-white/90 sm:text-3xl">
        « On a remplacé trois logiciels par KitchenXpert. Le rendu 3D est bluffant
        et le devis fournisseur intégré nous fait gagner deux jours par projet. »
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500" />
        <div className="text-left">
          <div className="text-sm font-semibold">Camille Laroche</div>
          <div className="text-xs text-white/50">Architecte d&apos;intérieur · Studio Maison</div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------
function CTA({ t }: { t: (k: string) => string }): React.ReactElement {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/20 to-cyan-500/10 p-12 text-center sm:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_60%)]" aria-hidden />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Prêt à dessiner votre prochaine cuisine ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Démarrez gratuitement. Mettez à niveau quand vous êtes prêt.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LocalizedLink
              to="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
            >
              {t('home.startDesign')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </LocalizedLink>
            <LocalizedLink
              to="/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/10"
            >
              Voir les tarifs
            </LocalizedLink>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer(): React.ReactElement {
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 py-12">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-500" />
            <span className="font-semibold tracking-tight">KitchenXpert</span>
          </div>
          <p className="mt-3 text-sm text-white/50">
            La plateforme tout-en-un pour concevoir et commander votre cuisine.
          </p>
        </div>
        <FooterCol title="Produit" links={[
          { label: 'Designer 3D', href: '/designer/sandbox' },
          { label: 'Catalogue', href: '/catalog' },
          { label: 'Tarifs', href: '/pricing' },
        ]} />
        <FooterCol title="Légal" links={[
          { label: 'Mentions légales', href: '/legal/mentions' },
          { label: 'CGV', href: '/legal/cgv' },
          { label: 'Politique de confidentialité', href: '/legal/privacy' },
          { label: 'Cookies', href: '/legal/cookies' },
        ]} />
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
        <p>© {new Date().getFullYear()} KitchenXpert SAS — Tous droits réservés.</p>
        <p>Made in France <MapPin className="inline-block w-4 h-4 align-text-bottom" aria-hidden="true" /> · Hébergé dans l&apos;UE</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }): React.ReactElement {
  return (
    <div>
      <div className="mb-3 text-xs uppercase tracking-widest text-white/50">{title}</div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <LocalizedLink to={l.href} className="text-sm text-white/70 transition hover:text-white">
              {l.label}
            </LocalizedLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
