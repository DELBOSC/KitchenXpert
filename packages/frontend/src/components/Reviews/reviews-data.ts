/**
 * Reviews data layer.
 *
 * Two read paths :
 *   - `getStaticReviews()` returns the curated wall used on the home
 *     page + /avis. The reviews are ones we've collected (with author
 *     consent) from G2/Capterra/Trustpilot. **No fake reviews here.**
 *     If you don't have any yet, the array stays empty and the
 *     component renders a graceful placeholder ("First reviews
 *     coming — be the first to write one").
 *   - `fetchExternalReviews()` is the live ingester stub. Each
 *     platform (G2, Capterra, Trustpilot) has a public API; this
 *     stub returns the static data for now + a TODO comment with
 *     the exact endpoint + auth pattern.
 *
 * Aggregation is computed client-side from whichever source is
 * available. AggregateRating JSON-LD (see `<ReviewsSection>`) is
 * generated from the same array.
 */

export type ReviewPlatform =
  | 'g2'
  | 'capterra'
  | 'trustpilot'
  | 'avis_verifies'
  | 'google_business';

export interface Review {
  id: string;
  platform: ReviewPlatform;
  author: string;
  role?: string;
  rating: number;        // 1–5
  date: string;          // ISO date
  body: string;          // 50–300 chars
  /** Public profile URL on the source platform, when available. */
  sourceUrl?: string;
  /** Set if the user is a paying customer — surfaced as a small badge. */
  verifiedCustomer?: boolean;
}

export const PLATFORM_LABEL: Record<ReviewPlatform, string> = {
  g2: 'G2',
  capterra: 'Capterra',
  trustpilot: 'Trustpilot',
  avis_verifies: 'Avis Vérifiés',
  google_business: 'Google',
};

/**
 * Curated review wall — **NO FAKE REVIEWS**. Each entry must be a real
 * customer who explicitly consented to having their words on the
 * marketing site. Until at least 5 reviews land, leave this array
 * empty and let the component render the "early adopter" message.
 *
 * Convention: keep one entry per platform when possible, to signal the
 * brand is visible across the ecosystem.
 */
export const STATIC_REVIEWS: Review[] = [
  // Example real-shape entries — DELETE before launch if you don't
  // have explicit author consent yet.
  /*
  {
    id: 'g2-001',
    platform: 'g2',
    author: 'Sophie M.',
    role: 'Cuisiniste indépendante',
    rating: 5,
    date: '2026-04-12',
    body: "Outil clair, rapide, et qui parle vraiment au métier. La comparaison multi-fournisseurs économise 2h par devis.",
    verifiedCustomer: true,
  },
  */
];

/**
 * Live fetcher — to be implemented when each platform is set up. Each
 * has a public read-only API (or RSS in Trustpilot's case). The
 * pattern is identical: fetch → normalize → cache 1h.
 *
 * Suggested implementation order :
 *   1. Trustpilot (RSS, no key, easiest)
 *   2. Capterra (Gartner API — needs partner key)
 *   3. G2 (private API — needs partner agreement)
 *
 * For now this stub returns the static array.
 */
export async function fetchExternalReviews(): Promise<Review[]> {
  return STATIC_REVIEWS;
}

/** Average rating across the provided pool — null if pool is empty. */
export function aggregateRating(reviews: Review[]): { average: number; count: number } | null {
  if (reviews.length === 0) {return null;}
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return {
    average: Math.round((sum / reviews.length) * 10) / 10, // 1 decimal
    count: reviews.length,
  };
}
