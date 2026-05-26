import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { SeoHead } from '../../components/seo/SeoHead';
import { TrustStack } from '../../components/Trust/TrustStack';

// ── Types ──────────────────────────────────────────────────────────────────

interface PricingTier {
  nameKey: string;
  nameDefault: string;
  price: string;
  periodKey: string;
  periodDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  featureKeys: { key: string; defaultValue: string }[];
  ctaKey: string;
  ctaDefault: string;
  ctaLink: string;
  popular?: boolean;
}

// ── Data ───────────────────────────────────────────────────────────────────

const tiers: PricingTier[] = [
  {
    nameKey: 'pricing.plans.free.name',
    nameDefault: 'Gratuit',
    price: '0',
    periodKey: 'pricing.plans.free.period',
    periodDefault: '/mois',
    descriptionKey: 'pricing.plans.free.description',
    descriptionDefault: 'Parfait pour decouvrir KitchenXpert et commencer votre premier projet de cuisine.',
    featureKeys: [
      { key: 'pricing.plans.free.features.projects', defaultValue: '2 projets maximum' },
      { key: 'pricing.plans.free.features.aiGenerations', defaultValue: '5 generations IA / mois' },
      { key: 'pricing.plans.free.features.export', defaultValue: 'Export basique' },
      { key: 'pricing.plans.free.features.chatMessages', defaultValue: '20 messages chat IA' },
    ],
    ctaKey: 'pricing.plans.free.cta',
    ctaDefault: 'Commencer gratuitement',
    ctaLink: '/register',
  },
  {
    nameKey: 'pricing.plans.pro.name',
    nameDefault: 'Pro',
    price: '29',
    periodKey: 'pricing.plans.pro.period',
    periodDefault: '/mois',
    descriptionKey: 'pricing.plans.pro.description',
    descriptionDefault: 'Pour les particuliers exigeants et les professionnels qui veulent des outils avances.',
    featureKeys: [
      { key: 'pricing.plans.pro.features.projects', defaultValue: 'Projets illimites' },
      { key: 'pricing.plans.pro.features.aiGenerations', defaultValue: '50 generations IA / mois' },
      { key: 'pricing.plans.pro.features.export', defaultValue: 'Export PDF complet' },
      { key: 'pricing.plans.pro.features.chatMessages', defaultValue: '200 messages chat IA' },
      { key: 'pricing.plans.pro.features.collaborators', defaultValue: '3 collaborateurs' },
      { key: 'pricing.plans.pro.features.vr', defaultValue: 'Preview VR / 3D' },
    ],
    ctaKey: 'pricing.plans.pro.cta',
    ctaDefault: 'Essai Pro gratuit 14j',
    ctaLink: '/register?plan=pro',
    popular: true,
  },
  {
    nameKey: 'pricing.plans.enterprise.name',
    nameDefault: 'Entreprise',
    price: '99',
    periodKey: 'pricing.plans.enterprise.period',
    periodDefault: '/mois',
    descriptionKey: 'pricing.plans.enterprise.description',
    descriptionDefault: 'Solution complete pour les agences, architectes et cuisinistes professionnels.',
    featureKeys: [
      { key: 'pricing.plans.enterprise.features.unlimited', defaultValue: 'Tout illimite' },
      { key: 'pricing.plans.enterprise.features.aiGenerations', defaultValue: 'Generations IA illimitees' },
      { key: 'pricing.plans.enterprise.features.branding', defaultValue: 'Branding personnalise' },
      { key: 'pricing.plans.enterprise.features.chatMessages', defaultValue: 'Messages chat illimites' },
      { key: 'pricing.plans.enterprise.features.collaborators', defaultValue: 'Collaborateurs illimites' },
      { key: 'pricing.plans.enterprise.features.support', defaultValue: 'Support prioritaire' },
      { key: 'pricing.plans.enterprise.features.api', defaultValue: 'Acces API' },
    ],
    ctaKey: 'pricing.plans.enterprise.cta',
    ctaDefault: 'Contacter les ventes',
    ctaLink: 'mailto:contact@kitchenxpert.com',
  },
];

type CellValue =
  | { type: 'boolean'; value: boolean }
  | { type: 'none' }
  | { type: 'text'; key: string; defaultValue: string };

interface FeatureRow {
  nameKey: string;
  nameDefault: string;
  free: CellValue;
  pro: CellValue;
  enterprise: CellValue;
}

const featureComparison: FeatureRow[] = [
  {
    nameKey: 'pricing.comparison.projects', nameDefault: 'Projects',
    free: { type: 'text', key: 'pricing.comparison.values.two', defaultValue: '2' },
    pro: { type: 'text', key: 'pricing.comparison.values.unlimited', defaultValue: 'Unlimited' },
    enterprise: { type: 'text', key: 'pricing.comparison.values.unlimited', defaultValue: 'Unlimited' },
  },
  {
    nameKey: 'pricing.comparison.aiGenerations', nameDefault: 'AI Generations',
    free: { type: 'text', key: 'pricing.comparison.values.fivePerMonth', defaultValue: '5 / month' },
    pro: { type: 'text', key: 'pricing.comparison.values.fiftyPerMonth', defaultValue: '50 / month' },
    enterprise: { type: 'text', key: 'pricing.comparison.values.unlimited', defaultValue: 'Unlimited' },
  },
  {
    nameKey: 'pricing.comparison.chatMessages', nameDefault: 'AI Chat Messages',
    free: { type: 'text', key: 'pricing.comparison.values.twenty', defaultValue: '20' },
    pro: { type: 'text', key: 'pricing.comparison.values.twoHundred', defaultValue: '200' },
    enterprise: { type: 'text', key: 'pricing.comparison.values.unlimited', defaultValue: 'Unlimited' },
  },
  {
    nameKey: 'pricing.comparison.exportPdf', nameDefault: 'PDF Export',
    free: { type: 'text', key: 'pricing.comparison.values.basic', defaultValue: 'Basic' },
    pro: { type: 'text', key: 'pricing.comparison.values.full', defaultValue: 'Full' },
    enterprise: { type: 'text', key: 'pricing.comparison.values.full', defaultValue: 'Full' },
  },
  {
    nameKey: 'pricing.comparison.collaborators', nameDefault: 'Collaborators',
    free: { type: 'none' },
    pro: { type: 'text', key: 'pricing.comparison.values.three', defaultValue: '3' },
    enterprise: { type: 'text', key: 'pricing.comparison.values.unlimited', defaultValue: 'Unlimited' },
  },
  {
    nameKey: 'pricing.comparison.vr', nameDefault: 'VR / 3D Preview',
    free: { type: 'none' },
    pro: { type: 'boolean', value: true },
    enterprise: { type: 'boolean', value: true },
  },
  {
    nameKey: 'pricing.comparison.branding', nameDefault: 'Custom Branding',
    free: { type: 'none' },
    pro: { type: 'none' },
    enterprise: { type: 'boolean', value: true },
  },
  {
    nameKey: 'pricing.comparison.support', nameDefault: 'Priority Support',
    free: { type: 'none' },
    pro: { type: 'none' },
    enterprise: { type: 'boolean', value: true },
  },
  {
    nameKey: 'pricing.comparison.api', nameDefault: 'API Access',
    free: { type: 'none' },
    pro: { type: 'none' },
    enterprise: { type: 'boolean', value: true },
  },
];

// ── Check / Dash Icons ─────────────────────────────────────────────────────

function CheckIcon(): React.ReactElement {
  return (
    <svg className="w-5 h-5 text-kx-brand-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ── Pricing Card ───────────────────────────────────────────────────────────

function PricingCard({ tier, annual }: { tier: PricingTier; annual: boolean }): React.ReactElement {
  const { t } = useTranslation();
  const isExternal = tier.ctaLink.startsWith('mailto:');
  const basePrice = parseFloat(tier.price);
  const displayPrice = annual && basePrice > 0
    ? Math.round(basePrice * 0.8 * 100) / 100
    : basePrice;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-8 transition-shadow ${
        tier.popular
          ? 'border-kx-brand-from shadow-xl shadow-kx-brand-from/20'
          : 'border-kx-fg/10 hover:shadow-lg'
      } bg-kx-elevated`}
    >
      {/* Popular badge */}
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-gradient-to-br from-kx-brand-from to-kx-brand-to px-4 py-1 text-sm font-semibold text-white shadow-sm">
            {t('pricing.popular', 'Populaire')}
          </span>
        </div>
      )}

      {/* Tier name */}
      <h3 className="text-lg font-semibold text-kx-fg">{t(tier.nameKey, tier.nameDefault)}</h3>

      {/* Price */}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-kx-fg">{displayPrice}&euro;</span>
        <span className="text-sm text-kx-fg/60">
          {annual ? t('pricing.billing.perMonth', '/month') : t(tier.periodKey, tier.periodDefault)}
        </span>
      </div>
      {annual && basePrice > 0 && (
        <p className="mt-1 text-xs text-kx-fg/60">
          {t('pricing.billing.billedAnnually', 'Billed annually')} ({Math.round(displayPrice * 12)}&euro;{t('pricing.billing.perYear', '/year')})
        </p>
      )}

      {/* Description */}
      <p className="mt-4 text-sm text-kx-fg/75 leading-relaxed">
        {t(tier.descriptionKey, tier.descriptionDefault)}
      </p>

      {/* Features */}
      <ul className="mt-8 flex-1 space-y-3">
        {tier.featureKeys.map((feature) => (
          <li key={feature.key} className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-sm text-kx-fg/80">{t(feature.key, feature.defaultValue)}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-8">
        {isExternal ? (
          <a
            href={tier.ctaLink}
            className={`block w-full text-center px-6 py-3 rounded-lg text-sm font-semibold transition ${
              tier.popular
                ? 'bg-gradient-to-br from-kx-brand-from to-kx-brand-to text-white hover:opacity-90'
                : 'bg-kx-fg/10 text-kx-fg hover:bg-kx-fg/20'
            }`}
          >
            {t(tier.ctaKey, tier.ctaDefault)}
          </a>
        ) : (
          <Link
            to={tier.ctaLink}
            className={`block w-full text-center px-6 py-3 rounded-lg text-sm font-semibold transition ${
              tier.popular
                ? 'bg-gradient-to-br from-kx-brand-from to-kx-brand-to text-white hover:opacity-90'
                : 'bg-kx-fg/10 text-kx-fg hover:bg-kx-fg/20'
            }`}
          >
            {t(tier.ctaKey, tier.ctaDefault)}
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Feature Comparison Table ───────────────────────────────────────────────

function renderCellValue(cell: CellValue, t: (key: string, defaultValue: string) => string): React.ReactNode {
  switch (cell.type) {
    case 'boolean':
      return cell.value ? (
        <span className="inline-flex justify-center"><CheckIcon /></span>
      ) : (
        <span className="text-kx-fg/30">--</span>
      );
    case 'none':
      return <span className="text-kx-fg/30">--</span>;
    case 'text':
      return t(cell.key, cell.defaultValue);
  }
}

function FeatureComparisonTable(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" aria-label={t('pricing.comparison.tableLabel', 'Feature comparison across plans')}>
        <thead>
          <tr className="border-b border-kx-fg/20">
            <th className="py-4 pr-4 text-left font-semibold text-kx-fg">
              {t('pricing.comparison.feature', 'Feature')}
            </th>
            <th className="py-4 px-4 text-center font-semibold text-kx-fg">
              {t('pricing.plans.free.name', 'Free')}
            </th>
            <th className="py-4 px-4 text-center font-semibold text-kx-brand-from">
              {t('pricing.plans.pro.name', 'Pro')}
            </th>
            <th className="py-4 pl-4 text-center font-semibold text-kx-fg">
              {t('pricing.plans.enterprise.name', 'Enterprise')}
            </th>
          </tr>
        </thead>
        <tbody>
          {featureComparison.map((row, idx) => (
            <tr
              key={row.nameKey}
              className={`border-b border-kx-fg/10 ${
                idx % 2 === 0 ? 'bg-kx-fg/5' : ''
              }`}
            >
              <td className="py-3 pr-4 text-kx-fg/80 font-medium">
                {t(row.nameKey, row.nameDefault)}
              </td>
              <td className="py-3 px-4 text-center text-kx-fg/60">
                {renderCellValue(row.free, t)}
              </td>
              <td className="py-3 px-4 text-center text-kx-fg/60">
                {renderCellValue(row.pro, t)}
              </td>
              <td className="py-3 pl-4 text-center text-kx-fg/60">
                {renderCellValue(row.enterprise, t)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────────

const PricingPage: React.FC = () => {
  const { t } = useTranslation();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-kx-base py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead
        title="Tarifs"
        description="3 plans : Découverte gratuit · Premium 14,90 €/mois · Studio 49 €/mois. Sans engagement, sans CB pour démarrer."
        canonical="https://kitchenxpert.com/pricing"
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-kx-fg sm:text-5xl">
            {t('pricing.title', 'Tarifs simples, sans surprise')}
          </h1>
          <p className="mt-4 text-lg text-kx-fg/70 max-w-2xl mx-auto">
            {t('pricing.subtitle', 'Choisissez le plan qui correspond a vos besoins. Commencez gratuitement et evoluez quand vous le souhaitez.')}
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!annual ? 'text-kx-fg' : 'text-kx-fg/50'}`}>
              {t('pricing.billing.monthly', 'Mensuel')}
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                annual ? 'bg-kx-brand-from' : 'bg-kx-fg/20'
              }`}
              role="switch"
              aria-checked={annual}
              aria-label={t('pricing.billing.toggleLabel', 'Toggle annual billing')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  annual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-kx-fg' : 'text-kx-fg/50'}`}>
              {t('pricing.billing.annual', 'Annuel')}
              <span className="ml-1 inline-flex items-center rounded-full bg-kx-accent-warm/20 px-2 py-0.5 text-xs font-medium text-kx-accent-warm">
                {t('pricing.billing.discount', '-20%')}
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <PricingCard key={tier.nameKey} tier={tier} annual={annual} />
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-kx-fg text-center mb-8">
            {t('pricing.comparison.title', 'Comparaison detaillee')}
          </h2>
          <div className="bg-kx-elevated rounded-xl shadow-sm border border-kx-fg/10 p-6">
            <FeatureComparisonTable />
          </div>
        </div>

        {/* Trust signals — 8 garanties juste avant le bottom CTA */}
        <div className="mt-16">
          <h2 className="mb-6 text-center text-2xl font-bold text-kx-fg">
            {t('pricing.trust.title', 'Nos engagements, sans conditions')}
          </h2>
          <TrustStack layout="grid" />
        </div>

        {/* FAQ / Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-kx-fg/60">
            {t('pricing.cta.questions', 'Des questions ? Contactez-nous a')}{' '}
            <a href="mailto:contact@kitchenxpert.com" className="text-kx-brand-from hover:text-kx-brand-to hover:underline transition-colors">
              contact@kitchenxpert.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
