import React from 'react';
import { Link } from 'react-router-dom';

import {
  STATIC_REVIEWS,
  PLATFORM_LABEL,
  aggregateRating,
  type ReviewPlatform,
} from '../components/Reviews/reviews-data';
import { ReviewsSection, StarRow } from '../components/Reviews/ReviewsSection';
import { SeoHead } from '../components/seo/SeoHead';

/**
 * /avis — page dédiée aux avis utilisateurs.
 *
 * Affiche la note moyenne agrégée, des filtres par plateforme, et la
 * grille complète. Sert aussi de cible pour le footer + les CTA hub.
 *
 * Source : `STATIC_REVIEWS` (curated wall) pour l'instant ; à brancher
 * sur les APIs G2 / Capterra / Trustpilot via `fetchExternalReviews()`
 * une fois les comptes business créés.
 */

type Filter = 'all' | ReviewPlatform;

export default function AvisPage(): React.ReactElement {
  const [filter, setFilter] = React.useState<Filter>('all');

  const reviews = filter === 'all'
    ? STATIC_REVIEWS
    : STATIC_REVIEWS.filter((r) => r.platform === filter);

  const agg = aggregateRating(reviews);

  const platforms: Filter[] = ['all', 'g2', 'capterra', 'trustpilot', 'avis_verifies', 'google_business'];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SeoHead
        title="Avis clients"
        description="Tous les avis vérifiés sur KitchenXpert : G2, Capterra, Trustpilot, Avis Vérifiés. Note moyenne agrégée, par plateforme, par profil utilisateur."
        canonical="https://kitchenxpert.com/avis"
      />

      <header className="mx-auto max-w-5xl px-6 pt-24 pb-12 text-center">
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
          Avis clients vérifiés
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
          Chaque avis est publié sur une plateforme tierce indépendante. Aucun avis n'est édité ou supprimé par KitchenXpert.
        </p>

        {agg && (
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3">
            <StarRow value={agg.average} />
            <span className="text-2xl font-semibold text-white">{agg.average.toFixed(1)}</span>
            <span className="text-sm text-white/50">/ 5 · {agg.count} avis</span>
          </div>
        )}
      </header>

      {STATIC_REVIEWS.length > 0 ? (
        <>
          {/* Platform filter */}
          <nav aria-label="Filtrer par plateforme" className="mx-auto max-w-5xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-2 border-y border-white/5 py-4">
              {platforms.map((p) => {
                const active = filter === p;
                const count = p === 'all'
                  ? STATIC_REVIEWS.length
                  : STATIC_REVIEWS.filter((r) => r.platform === p).length;
                if (p !== 'all' && count === 0) {return null;}
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilter(p)}
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-white/30 bg-white/15 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/65 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {p === 'all' ? 'Tous' : PLATFORM_LABEL[p]}
                    <span className="ml-1.5 text-[10px] text-white/55">{count}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="mx-auto max-w-6xl px-6 py-12">
            <ReviewsSection max={reviews.length} showAllLink={false} />
          </main>
        </>
      ) : (
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold text-white">Les premiers avis arrivent.</h2>
          <p className="mt-4 text-white/65">
            KitchenXpert est en phase de lancement. Nous attendons que nos premiers utilisateurs
            partagent leur expérience sur G2, Capterra ou Trustpilot — ils seront listés ici dès publication.
          </p>
          <p className="mt-2 text-sm text-white/55">
            Vous voulez tester&nbsp;? <Link to="/designer/sandbox" className="text-white underline">Ouvrir le designer démo</Link>.
          </p>
        </main>
      )}

      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-xl font-semibold text-white">Vous utilisez KitchenXpert&nbsp;?</h2>
          <p className="mt-2 text-sm text-white/65">
            Votre retour aide les futurs utilisateurs à choisir leur outil. Choisissez la plateforme qui vous parle :
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(['g2', 'capterra', 'trustpilot'] as const).map((p) => (
              <a
                key={p}
                href={`https://www.${p}.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/30 hover:bg-white/10"
              >
                Donner mon avis sur {PLATFORM_LABEL[p]}
              </a>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-white/55">
            Aucune incitation matérielle. Ces plateformes interdisent le paiement de reviews.
          </p>
        </div>
      </section>
    </div>
  );
}
