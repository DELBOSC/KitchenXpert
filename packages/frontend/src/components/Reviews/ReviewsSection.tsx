import { ArrowRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import {
  STATIC_REVIEWS,
  PLATFORM_LABEL,
  aggregateRating,
  type Review,
} from './reviews-data';

/**
 * ReviewsSection — wall of reviews shown on home + pricing.
 *
 * Two modes:
 *   - At least 1 review available → render the wall + AggregateRating
 *     JSON-LD (rich snippet eligible).
 *   - 0 reviews → render a graceful "be the first to review" block
 *     instead of fake testimonials. **Never fake.** See
 *     docs/REVIEWS-PLAYBOOK.md § Anti-faux-signaux.
 *
 * Schema.org : `AggregateRating` + `Review` ItemList. Both are injected
 * inline so the parent SeoHead doesn't need to know about them.
 */

export interface ReviewsSectionProps {
  /** Max reviews to display. Defaults to 6. */
  max?: number;
  /** Include the "Voir tous les avis" link at the bottom. */
  showAllLink?: boolean;
  className?: string;
}

export function ReviewsSection({
  max = 6, showAllLink = true, className = '',
}: ReviewsSectionProps): React.ReactElement {
  const reviews = STATIC_REVIEWS.slice(0, max);
  const agg = aggregateRating(reviews);

  if (agg === null) {
    return <ReviewsPlaceholder className={className} />;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'KitchenXpert',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: agg.average.toFixed(1),
      bestRating: '5',
      reviewCount: agg.count,
    },
    review: reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      datePublished: r.date,
      reviewBody: r.body,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: '5',
      },
    })),
  };

  return (
    <section
      aria-labelledby="reviews-heading"
      className={`mx-auto max-w-6xl px-6 py-20 ${className}`}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-10 text-center">
        <h2
          id="reviews-heading"
          className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl"
        >
          Ce qu'en pensent les utilisateurs
        </h2>

        <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
          <StarRow value={agg.average} />
          <span className="text-sm font-medium text-white">{agg.average.toFixed(1)}/5</span>
          <span className="text-xs text-white/50">· {agg.count} avis vérifiés</span>
        </div>
      </header>

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => <li key={r.id}><ReviewCard review={r} /></li>)}
      </ul>

      {showAllLink && (
        <div className="mt-10 text-center">
          <Link
            to="/avis"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/30 hover:bg-white/10"
          >
            Voir tous les avis
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}

function ReviewsPlaceholder({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <section className={`mx-auto max-w-3xl px-6 py-20 text-center ${className}`}>
      <h2 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
        Lancement 2026 — les premiers avis arrivent
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base text-white/65">
        KitchenXpert vient d'ouvrir. Si vous testez le designer, votre retour est précieux —
        et il vous donne accès au badge <strong className="text-white">Founding Reviewer</strong> sur votre profil.
      </p>
      <Link
        to="/designer/sandbox"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-white/90"
      >
        Essayer le designer
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function ReviewCard({ review }: { review: Review }): React.ReactElement {
  const initials = review.author
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <StarRow value={review.rating} />
        <span className="text-[11px] text-white/40">{PLATFORM_LABEL[review.platform]}</span>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-white/80">«&nbsp;{review.body}&nbsp;»</p>
      <footer className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-semibold text-white">
          {initials}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{review.author}</div>
          {review.role && <div className="text-xs text-white/45">{review.role}</div>}
        </div>
      </footer>
    </article>
  );
}

/** Compact star row used in cards + the aggregate badge. */
export function StarRow({ value }: { value: number }): React.ReactElement {
  const rounded = Math.round(value);
  return (
    <div aria-label={`${value.toFixed(1)} sur 5 étoiles`} className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${n <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-white/25'}`}
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path
            strokeLinecap="round" strokeLinejoin="round"
            d="M11.49 3.5l2.36 4.79 5.28.77-3.82 3.73.9 5.26-4.72-2.48-4.72 2.48.9-5.26L3.85 9.06l5.28-.77 2.36-4.79z"
          />
        </svg>
      ))}
    </div>
  );
}

export default ReviewsSection;
