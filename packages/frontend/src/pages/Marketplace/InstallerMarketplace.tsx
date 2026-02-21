import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Installer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  city: string;
  postalCode: string;
  specialties: string[];
  certifications: string[];
  yearsExperience: number;
  hourlyRate?: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  bio?: string;
  distance?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SPECIALTY_OPTIONS = [
  { value: 'ikea', label: 'IKEA' },
  { value: 'schmidt', label: 'Schmidt' },
  { value: 'custom', label: 'Sur mesure' },
  { value: 'plumbing', label: 'Plomberie' },
  { value: 'electrical', label: 'Electricite' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function InstallerMarketplace(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search state
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [radiusKm, setRadiusKm] = useState(50);

  // Data state
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // ─── Fetch Installers ──────────────────────────────────────────────────────

  const fetchInstallers = useCallback(
    async (controller: AbortController, pageNum: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pageNum));
        params.set('limit', '20');
        params.set('radiusKm', String(radiusKm));

        if (searchLocation.trim()) {
          // Determine if input looks like a postal code (digits only)
          if (/^\d+$/.test(searchLocation.trim())) {
            params.set('postalCode', searchLocation.trim());
          } else {
            params.set('city', searchLocation.trim());
          }
        }

        if (selectedSpecialties.length > 0) {
          params.set('specialties', selectedSpecialties.join(','));
        }

        if (minRating > 0) {
          params.set('minRating', String(minRating));
        }

        const response = await fetch(
          `/api/v1/installers/search?${params.toString()}`,
          {
            credentials: 'include',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            t(
              'marketplace.searchError',
              'Erreur lors de la recherche des installateurs',
            ),
          );
        }

        const result = await response.json();
        setInstallers(result.data || []);
        setTotal(result.meta?.total || 0);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof Error
            ? err.message
            : t('marketplace.searchError', 'Erreur lors de la recherche');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [searchLocation, selectedSpecialties, minRating, radiusKm, t],
  );

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const controller = new AbortController();
    fetchInstallers(controller, page);
    return () => controller.abort();
  }, [fetchInstallers, page, retryCount]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = (): void => {
    setPage(1);
    setRetryCount((c) => c + 1);
  };

  const handleSpecialtyToggle = (specialty: string): void => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty],
    );
  };

  const handleViewProfile = (installerId: string): void => {
    navigate(`/marketplace/installer/${installerId}`);
  };

  // ─── Star Rendering ────────────────────────────────────────────────────────

  const renderStars = (rating: number): React.ReactElement => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <span className="inline-flex items-center gap-0.5" aria-label={`${rating} sur 5`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg key={`full-${i}`} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
        {hasHalf && (
          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
            <defs>
              <linearGradient id="halfGrad">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill="url(#halfGrad)"
              d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
            />
          </svg>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300 dark:text-gray-600 fill-current" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </span>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('marketplace.title', 'Marketplace Installateurs Certifies')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t(
              'marketplace.subtitle',
              'Trouvez un installateur certifie pres de chez vous pour votre projet cuisine',
            )}
          </p>
        </header>

        {/* Search Bar */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t(
                'marketplace.searchPlaceholder',
                'Code postal ou ville...',
              )}
              aria-label={t(
                'marketplace.searchLabel',
                'Rechercher par code postal ou ville',
              )}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading
                ? t('common.searching', 'Recherche...')
                : t('common.search', 'Rechercher')}
            </button>
          </div>

          {/* Specialty Filters */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('marketplace.specialties', 'Specialites')}
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((spec) => (
                <button
                  key={spec.value}
                  onClick={() => handleSpecialtyToggle(spec.value)}
                  aria-pressed={selectedSpecialties.includes(spec.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedSpecialties.includes(spec.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {spec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating & Radius Filters */}
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Min Rating */}
            <div className="flex-1">
              <label
                htmlFor="minRating"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('marketplace.minRating', 'Note minimale')}:{' '}
                <span className="font-bold">{minRating > 0 ? `${minRating}/5` : t('marketplace.allRatings', 'Toutes')}</span>
              </label>
              <input
                id="minRating"
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{t('marketplace.allRatings', 'Toutes')}</span>
                <span>5</span>
              </div>
            </div>

            {/* Radius */}
            <div className="flex-1">
              <label
                htmlFor="radiusKm"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('marketplace.radius', 'Rayon')}:{' '}
                <span className="font-bold">{radiusKm} km</span>
              </label>
              <input
                id="radiusKm"
                type="range"
                min={10}
                max={100}
                step={5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>10 km</span>
                <span>100 km</span>
              </div>
            </div>
          </div>
        </section>

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center mb-6">
            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              {t('common.retry', 'Reessayer')}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 animate-pulse"
                aria-hidden="true"
              >
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {!isLoading && !error && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {total > 0
              ? t('marketplace.resultsCount', '{{count}} installateur(s) trouve(s)', {
                  count: total,
                })
              : ''}
          </p>
        )}

        {/* Results Grid */}
        {!isLoading && !error && installers.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {installers.map((installer) => (
              <div
                key={installer.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {installer.companyName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {installer.contactName}
                    </p>
                  </div>
                  {installer.isVerified && (
                    <span
                      className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      title={t('marketplace.verified', 'Verifie')}
                    >
                      {t('marketplace.verified', 'Verifie')}
                    </span>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  {renderStars(installer.rating)}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {installer.rating.toFixed(1)} ({installer.reviewCount}{' '}
                    {t('marketplace.reviews', 'avis')})
                  </span>
                </div>

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {installer.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Certifications */}
                {installer.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {installer.certifications.map((cert) => (
                      <span
                        key={cert}
                        className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                )}

                {/* Info Row */}
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span>
                    {installer.city} ({installer.postalCode})
                  </span>
                  {installer.distance !== undefined && installer.distance !== null && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                      {installer.distance} km
                    </span>
                  )}
                </div>

                {/* Hourly Rate */}
                {installer.hourlyRate != null && installer.hourlyRate > 0 && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {t('marketplace.hourlyRate', 'Tarif horaire')}:{' '}
                    <span className="font-semibold">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(installer.hourlyRate)}
                      /h
                    </span>
                  </p>
                )}

                {/* CTA */}
                <button
                  onClick={() => handleViewProfile(installer.id)}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  {t('marketplace.viewProfile', 'Voir profil')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && installers.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t(
                'marketplace.noResults',
                'Aucun installateur dans cette zone',
              )}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t(
                'marketplace.noResultsHint',
                'Essayez d\'elargir votre rayon de recherche ou de modifier vos filtres',
              )}
            </p>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label={t('common.previousPage', 'Page precedente')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {t('common.previous', 'Precedent')}
            </button>
            <span className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm">
              {t('common.pageOf', 'Page {{current}} sur {{total}}', {
                current: page,
                total: Math.ceil(total / 20),
              })}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              aria-label={t('common.nextPage', 'Page suivante')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {t('common.next', 'Suivant')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
