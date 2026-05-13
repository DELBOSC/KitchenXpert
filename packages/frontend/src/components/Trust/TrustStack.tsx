import React from 'react';

/**
 * TrustStack — 8 micro-claims en grille 4×2 (desktop) ou liste mobile.
 *
 * Utilisé sur la page Tarifs et dans le footer. Liste enrichie (vs
 * TrustBar 4 items) pour les pages où le visiteur s'attarde et veut
 * du détail avant de signer.
 *
 * **Légalité** — comme TrustBar : chaque item doit être vrai et
 * vérifiable. La régression d'un item = retirer le claim.
 */

interface StackItem {
  icon: React.ReactNode;
  label: string;
  detail: string;
}

const ITEMS: StackItem[] = [
  {
    icon: <IconCatalog />,
    label: '5 fournisseurs catalogués',
    detail: "IKEA METOD, Schmidt, Bosch, Leroy Merlin Delinia, Castorama — sync quotidienne des prix.",
  },
  {
    icon: <IconRuler />,
    label: '12 marques calibrées dimensionnellement',
    detail: 'Dimensions standard (60 cm IKEA, 63 cm Schmidt…) vérifiées catalogue par catalogue.',
  },
  {
    icon: <IconShield />,
    label: '96 % de tests automatisés',
    detail: 'Backend 96 % de couverture, frontend 92 %. CI bloque tout déploiement régressif.',
  },
  {
    icon: <IconLock />,
    label: 'Conformité RGPD by design',
    detail: 'Export Art. 15 + Effacement Art. 17 disponibles côté utilisateur sans intervention support.',
  },
  {
    icon: <IconCookie />,
    label: '0 cookie tiers sans consentement',
    detail: "Plausible Analytics (cookieless, CNIL-exempt) chargé uniquement après consentement explicite. Aucun tracker publicitaire.",
  },
  {
    icon: <IconSparkle />,
    label: 'Path-tracing photoréaliste maison',
    detail: 'Moteur de rendu propriétaire, exécuté côté navigateur (WebGPU). Pas de cloud rendering — vos données restent locales.',
  },
  {
    icon: <IconHandshake />,
    label: "Marketplace d'installateurs vérifiés",
    detail: 'Artisans Qualibat / RGE pré-vérifiés. Devis pose comparé sur la même base technique.',
  },
  {
    icon: <IconHeadset />,
    label: 'Support français · réponse < 24 h',
    detail: "support@kitchenxpert.com — équipe à Toulouse, réponse ouvrée sous 24 h, escalade équipe technique sous 48 h.",
  },
];

export interface TrustStackProps {
  /** `grid` (4×2 desktop) or `list` (vertical, compact for footer). */
  layout?: 'grid' | 'list';
  className?: string;
}

export function TrustStack({
  layout = 'grid', className = '',
}: TrustStackProps): React.ReactElement {
  const isGrid = layout === 'grid';

  return (
    <section
      aria-label="Garanties et engagements"
      className={`${className}`}
    >
      <ul
        className={
          isGrid
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
            : 'flex flex-col gap-3'
        }
      >
        {ITEMS.map((item) => (
          <li
            key={item.label}
            className={
              isGrid
                ? 'flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.04]'
                : 'flex items-start gap-3'
            }
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-indigo-300">
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-white/55">{item.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Inline icons (no lucide dep for the trust surface — saves bytes)
// ---------------------------------------------------------------------------
function IconCatalog(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 4h14M3 8h14M3 12h10M3 16h6" strokeLinecap="round"/></svg>;
}
function IconRuler(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 13l10 -10 4 4l-10 10zM6 10l2 2M9 7l2 2M12 4l2 2" strokeLinecap="round"/></svg>;
}
function IconShield(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M10 2l7 3v5c0 4-3 7-7 8c-4-1-7-4-7-8V5l7-3z" strokeLinejoin="round"/><path d="M7 10l2 2l4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconLock(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><rect x="4" y="9" width="12" height="8" rx="1.5"/><path d="M7 9V6a3 3 0 1 1 6 0v3"/></svg>;
}
function IconCookie(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M10 17a7 7 0 1 1 7-7c0 0.5 -1 1 -2 0.5s-2-0.5-2 0.5s-1 2 -2 1s-2 -1 -2 1s-1 2 -3 1"/><circle cx="8" cy="7" r="0.5"/><circle cx="13" cy="11" r="0.5"/><circle cx="8" cy="13" r="0.5"/></svg>;
}
function IconSparkle(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M10 3l1.5 4.5L16 9l-4.5 1.5L10 15l-1.5-4.5L4 9l4.5-1.5z" strokeLinejoin="round"/></svg>;
}
function IconHandshake(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M2 10l3-3l5 5l-3 3a2 2 0 1 1 -3 -3l3 -3M18 10l-3-3l-5 5l3 3a2 2 0 1 0 3 -3l-3 -3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconHeadset(): React.ReactElement {
  return <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 12V9a7 7 0 0 1 14 0v3"/><rect x="2" y="12" width="3" height="5" rx="1"/><rect x="15" y="12" width="3" height="5" rx="1"/></svg>;
}

export default TrustStack;
