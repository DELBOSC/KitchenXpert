import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

interface InstallerReview {
  id: string;
  userId: string;
  projectId?: string;
  rating: number;
  title?: string;
  comment?: string;
  photos: string[];
  isVerified: boolean;
  createdAt: string;
}

interface InstallerProfile {
  id: string;
  userId?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  specialties: string[];
  certifications: string[];
  yearsExperience: number;
  hourlyRate?: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  bio?: string;
  portfolioUrls: string[];
  reviews: InstallerReview[];
  projects: {
    id: string;
    status: string;
    startDate?: string;
    endDate?: string;
    createdAt: string;
  }[];
}

interface Kitchen {
  id: string;
  name: string;
  projectId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InstallerProfilePage(): React.ReactElement {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Data state
  const [installer, setInstaller] = useState<InstallerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Request installation modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [selectedKitchenId, setSelectedKitchenId] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // ─── Fetch Installer ───────────────────────────────────────────────────────

  const fetchInstaller = useCallback(
    async (controller: AbortController) => {
      if (!id) {return;}
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/installers/${id}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError(t('marketplace.installerNotFound', 'Installateur introuvable'));
          } else {
            throw new Error(t('marketplace.loadError', 'Erreur lors du chargement'));
          }
          return;
        }

        const result = (await response.json()) as { data: InstallerProfile };
        setInstaller(result.data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {return;}
        const message =
          err instanceof Error ? err.message : t('marketplace.loadError', 'Erreur lors du chargement');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [id, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchInstaller(controller);
    return () => controller.abort();
  }, [fetchInstaller, retryCount]);

  // ─── Fetch Kitchens (for request modal) ────────────────────────────────────

  const fetchKitchens = useCallback(async (controller: AbortController) => {
    try {
      const response = await fetch('/api/v1/kitchens?limit=100', {
        credentials: 'include',
        signal: controller.signal,
      });
      if (response.ok) {
        const result = (await response.json()) as { data?: Kitchen[] };
        setKitchens(result.data ?? []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {return;}
      // Non-critical failure: user just won't see kitchen dropdown
    }
  }, []);

  useEffect(() => {
    if (showRequestModal) {
      const controller = new AbortController();
      void fetchKitchens(controller);
      return () => controller.abort();
    }
    return undefined;
  }, [showRequestModal, fetchKitchens]);

  // ─── Submit Installation Request ───────────────────────────────────────────

  const handleRequestSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!id) {return;}

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const body: Record<string, string> = {
        installerId: id,
      };
      if (selectedKitchenId) {body.kitchenId = selectedKitchenId;}
      if (requestNotes.trim()) {body.notes = requestNotes.trim();}

      const response = await fetch('/api/v1/installers/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(
          result.error ?? t('marketplace.requestError', 'Erreur lors de la demande'),
        );
      }

      setRequestSuccess(true);
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess(false);
        setRequestNotes('');
        setSelectedKitchenId('');
      }, 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('marketplace.requestError', 'Erreur lors de la demande');
      setRequestError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Submit Review ─────────────────────────────────────────────────────────

  const handleReviewSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!id) {return;}

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const body: Record<string, unknown> = {
        rating: reviewRating,
      };
      if (reviewTitle.trim()) {body.title = reviewTitle.trim();}
      if (reviewComment.trim()) {body.comment = reviewComment.trim();}

      const response = await fetch(`/api/v1/installers/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(
          result.error ?? t('marketplace.reviewError', 'Erreur lors de l\'envoi de l\'avis'),
        );
      }

      setReviewSuccess(true);
      setShowReviewForm(false);
      // Refresh installer data to show new review
      setRetryCount((c) => c + 1);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('marketplace.reviewError', 'Erreur lors de l\'envoi de l\'avis');
      setReviewError(message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ─── Star Rendering ────────────────────────────────────────────────────────

  const renderStars = (rating: number, size = 'w-5 h-5'): React.ReactElement => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <span className="inline-flex items-center gap-0.5" aria-label={`${rating} sur 5`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg key={`full-${i}`} className={`${size} text-yellow-400 fill-current`} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
        {hasHalf && (
          <svg className={`${size} text-yellow-400`} viewBox="0 0 20 20">
            <defs>
              <linearGradient id={`halfGradProfile-${rating}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#halfGradProfile-${rating})`}
              d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
            />
          </svg>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg key={`empty-${i}`} className={`${size} text-gray-300 dark:text-gray-600 fill-current`} viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </span>
    );
  };

  // ─── Interactive Star Picker ───────────────────────────────────────────────

  const renderStarPicker = (): React.ReactElement => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setReviewRating(star)}
          aria-label={`${star} etoile${star > 1 ? 's' : ''}`}
          className="focus:outline-none"
        >
          <svg
            className={`w-8 h-8 ${
              star <= reviewRating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            } fill-current transition-colors hover:text-yellow-400`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        </button>
      ))}
    </div>
  );

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (error != null || !installer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">
              {error ?? t('marketplace.installerNotFound', 'Installateur introuvable')}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/marketplace')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.back', 'Retour')}
              </button>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('common.retry', 'Reessayer')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/marketplace')}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back', 'Retour a la marketplace')}
        </button>

        {/* Profile Header */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Photo Placeholder */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {installer.companyName}
                </h1>
                {installer.isVerified && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    {t('marketplace.verified', 'Verifie')}
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {installer.contactName} &middot; {installer.city} ({installer.postalCode})
              </p>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-3">
                {renderStars(installer.rating, 'w-5 h-5')}
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {installer.rating.toFixed(1)}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  ({installer.reviewCount} {t('marketplace.reviews', 'avis')})
                </span>
              </div>

              {/* Experience & Rate */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {installer.yearsExperience > 0 && (
                  <span>
                    {installer.yearsExperience} {t('marketplace.yearsExp', 'ans d\'experience')}
                  </span>
                )}
                {installer.hourlyRate != null && installer.hourlyRate > 0 && (
                  <span>
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(installer.hourlyRate)}
                    /h
                  </span>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={() => setShowRequestModal(true)}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {t('marketplace.requestInstallation', 'Demander une installation')}
              </button>
            </div>
          </div>
        </section>

        {/* Bio */}
        {installer.bio && (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              {t('marketplace.about', 'A propos')}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {installer.bio}
            </p>
          </section>
        )}

        {/* Certifications & Specialties */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Certifications */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('marketplace.certifications', 'Certifications')}
              </h2>
              {installer.certifications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {installer.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('marketplace.noCertifications', 'Aucune certification')}
                </p>
              )}
            </div>

            {/* Specialties */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {t('marketplace.specialties', 'Specialites')}
              </h2>
              {installer.specialties.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {installer.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('marketplace.noSpecialties', 'Aucune specialite')}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Portfolio Gallery */}
        {installer.portfolioUrls.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('marketplace.portfolio', 'Portfolio')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {installer.portfolioUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={url}
                    alt={`${t('marketplace.portfolioImage', 'Photo du portfolio')} ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('marketplace.reviews', 'Avis')}{' '}
              <span className="text-gray-500 dark:text-gray-400 font-normal">
                ({installer.reviewCount})
              </span>
            </h2>
            {!reviewSuccess && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="text-sm px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {showReviewForm
                  ? t('common.cancel', 'Annuler')
                  : t('marketplace.leaveReview', 'Laisser un avis')}
              </button>
            )}
          </div>

          {/* Review Success */}
          {reviewSuccess && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {t('marketplace.reviewSubmitted', 'Votre avis a ete envoye avec succes.')}
            </div>
          )}

          {/* Review Form */}
          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('marketplace.yourRating', 'Votre note')}
                </label>
                {renderStarPicker()}
              </div>
              <div className="mb-4">
                <label htmlFor="reviewTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('marketplace.reviewTitle', 'Titre (optionnel)')}
                </label>
                <input
                  id="reviewTitle"
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="reviewComment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('marketplace.reviewComment', 'Commentaire (optionnel)')}
                </label>
                <textarea
                  id="reviewComment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white resize-y"
                />
              </div>
              {reviewError && (
                <p className="text-red-600 dark:text-red-400 text-sm mb-3">{reviewError}</p>
              )}
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {isSubmittingReview
                  ? t('common.submitting', 'Envoi en cours...')
                  : t('marketplace.submitReview', 'Envoyer l\'avis')}
              </button>
            </form>
          )}

          {/* Reviews List */}
          {installer.reviews.length > 0 ? (
            <div className="space-y-4">
              {installer.reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating, 'w-4 h-4')}
                    {review.title && (
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {review.title}
                      </span>
                    )}
                    {review.isVerified && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {t('marketplace.verifiedPurchase', 'Projet verifie')}
                      </span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                      {review.comment}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('marketplace.noReviews', 'Aucun avis pour le moment.')}
            </p>
          )}
        </section>

        {/* Request Installation Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-modal-title"
            >
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="request-modal-title"
                  className="text-xl font-semibold text-gray-900 dark:text-white"
                >
                  {t('marketplace.requestInstallation', 'Demander une installation')}
                </h2>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestError(null);
                    setRequestSuccess(false);
                  }}
                  aria-label={t('common.close', 'Fermer')}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {requestSuccess ? (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-green-700 dark:text-green-400 font-medium">
                    {t('marketplace.requestSent', 'Demande envoyee avec succes !')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit}>
                  {/* Kitchen Select */}
                  <div className="mb-4">
                    <label htmlFor="kitchenSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('marketplace.selectKitchen', 'Selectionner une cuisine (optionnel)')}
                    </label>
                    <select
                      id="kitchenSelect"
                      value={selectedKitchenId}
                      onChange={(e) => setSelectedKitchenId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">
                        {t('marketplace.noKitchenSelected', '-- Aucune cuisine --')}
                      </option>
                      {kitchens.map((kitchen) => (
                        <option key={kitchen.id} value={kitchen.id}>
                          {kitchen.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label htmlFor="requestNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('marketplace.notes', 'Notes et details supplementaires')}
                    </label>
                    <textarea
                      id="requestNotes"
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      maxLength={2000}
                      rows={4}
                      placeholder={t(
                        'marketplace.notesPlaceholder',
                        'Decrivez votre projet, vos besoins specifiques...',
                      )}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white resize-y"
                    />
                  </div>

                  {requestError && (
                    <p className="text-red-600 dark:text-red-400 text-sm mb-3">
                      {requestError}
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRequestModal(false);
                        setRequestError(null);
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t('common.cancel', 'Annuler')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {isSubmitting
                        ? t('common.submitting', 'Envoi...')
                        : t('marketplace.sendRequest', 'Envoyer la demande')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
