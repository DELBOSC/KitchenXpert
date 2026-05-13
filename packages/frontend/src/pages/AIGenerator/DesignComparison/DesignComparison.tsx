import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { api } from '../../../services/api/api';
import { API_ENDPOINTS } from '../../../services/api/endpoints';

import type {
  GeneratedDesign,
  AIGenerationResult,
} from '../../../features/ai-generator/ai-generator-slice';

// ----------------------------------------------------------------
// Score badge color helper
// ----------------------------------------------------------------
function scoreBadgeClasses(score: number): string {
  if (score > 80) {return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';}
  if (score >= 60) {return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';}
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value);
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------
const DesignComparison: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const generationId = searchParams.get('generationId');

  const [result, setResult] = useState<AIGenerationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingDesignId, setSavingDesignId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Fetch generation results ----
  useEffect(() => {
    if (!generationId) {
      setError(t('designComparison.missingId', 'Missing generationId parameter'));
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/v1${API_ENDPOINTS.AI_GENERATOR.RESULTS(generationId)}`,
          {
            signal: controller.signal,
            credentials: 'include',
          },
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? t('designComparison.notFound', 'Generation result not found')
              : t('designComparison.fetchError', 'Failed to fetch generation results'),
          );
        }

        const json = await response.json();
        const data: AIGenerationResult = json.data || json;

        if (mountedRef.current) {
          setResult(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : t('common.unknownError', 'Unknown error'));
          setLoading(false);
        }
      }
    };

    fetchResults();
    return () => controller.abort();
  }, [generationId, retryCount]);

  // ---- Save design ----
  const handleSaveDesign = useCallback(
    async (design: GeneratedDesign) => {
      setSavingDesignId(design.id);
      try {
        const res = await api.post(API_ENDPOINTS.AI_GENERATOR.SAVE_DESIGN, {
          designId: design.id,
          generationId,
        });
        if (!res.success) {
          // silently handle – could add toast here
        }
      } finally {
        if (mountedRef.current) {
          setSavingDesignId(null);
        }
      }
    },
    [generationId],
  );

  // ---- Retry ----
  const handleRetry = useCallback(() => {
    setError(null);
    setResult(null);
    setRetryCount((c) => c + 1);
  }, []);

  // ---- Designs to compare (max 3) ----
  const designs = result?.designs?.slice(0, 3) ?? [];

  // ----------------------------------------------------------------
  // Render: Loading
  // ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('designComparison.loading', 'Loading designs for comparison...')}</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render: Error
  // ----------------------------------------------------------------
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('common.error', 'Error')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.goBack', 'Go Back')}
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render: No designs
  // ----------------------------------------------------------------
  if (designs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('designComparison.noDesigns', 'No designs found')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('designComparison.noDesignsDesc', 'This generation has no designs to compare.')}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.goBack', 'Go Back')}
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render: Comparison
  // ----------------------------------------------------------------
  const gridCols =
    designs.length === 1
      ? 'grid-cols-1 max-w-xl'
      : designs.length === 2
        ? 'grid-cols-1 md:grid-cols-2 max-w-4xl'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <span className="text-xl">&larr;</span>
          <span>{t('designComparison.backToResults', 'Back to results')}</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('designComparison.title', 'Design Comparison')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t('designComparison.comparingCount', { count: designs.length, defaultValue: `Comparing ${designs.length} generated design${designs.length !== 1 ? 's' : ''} side by side` })}
        </p>
      </div>

      {/* ── Design Cards Grid ── */}
      <div className={`mx-auto grid gap-6 ${gridCols}`}>
        {designs.map((design) => (
          <div
            key={design.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
          >
            {/* Image / placeholder */}
            <div className="relative h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
              {design.thumbnailUrl ? (
                <img
                  src={design.thumbnailUrl}
                  alt={design.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 dark:text-gray-500 text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs">{t('designComparison.noPreview', 'No preview')}</span>
                </div>
              )}
              {/* Score badge */}
              <span
                className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${scoreBadgeClasses(design.score)}`}
              >
                {design.score}/100
              </span>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {design.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
                {design.description}
              </p>

              {/* Layout type */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">{t('designComparison.layout', 'Layout')}:</span>{' '}
                {design.layout}
              </div>

              {/* Cost range */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  {t('designComparison.estimatedCost', 'Estimated Cost')}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(design.estimatedCost.min, design.estimatedCost.currency)} &ndash;{' '}
                  {formatCurrency(design.estimatedCost.max, design.estimatedCost.currency)}
                </div>
              </div>

              {/* Features */}
              {design.features.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {t('designComparison.features', 'Features')}
                  </div>
                  <ul className="space-y-1">
                    {design.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400"
                      >
                        <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Save button (pushed to bottom) */}
              <div className="mt-auto pt-3">
                <button
                  onClick={() => handleSaveDesign(design)}
                  disabled={savingDesignId === design.id}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {savingDesignId === design.id && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {savingDesignId === design.id ? t('common.saving', 'Saving...') : t('designComparison.saveDesign', 'Save Design')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Comparison Table ── */}
      <div className="max-w-6xl mx-auto mt-10">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('designComparison.detailedComparison', 'Detailed Comparison')}
        </h2>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 text-gray-500 dark:text-gray-400 font-medium w-48">
                  {t('designComparison.attribute', 'Attribute')}
                </th>
                {designs.map((d) => (
                  <th
                    key={d.id}
                    className="text-left p-4 text-gray-900 dark:text-white font-semibold"
                  >
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {/* Score */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{t('designComparison.score', 'Score')}</td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${scoreBadgeClasses(d.score)}`}
                    >
                      {d.score}/100
                    </span>
                  </td>
                ))}
              </tr>

              {/* Layout Type */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{t('designComparison.layout', 'Layout')}</td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4 text-gray-600 dark:text-gray-400">
                    {d.layout}
                  </td>
                ))}
              </tr>

              {/* Materials: Cabinets */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{t('designComparison.cabinets', 'Cabinets')}</td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4 text-gray-600 dark:text-gray-400">
                    {d.materials?.cabinets || '-'}
                  </td>
                ))}
              </tr>

              {/* Materials: Countertops */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{t('designComparison.countertops', 'Countertops')}</td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4 text-gray-600 dark:text-gray-400">
                    {d.materials?.countertops || '-'}
                  </td>
                ))}
              </tr>

              {/* Materials: Backsplash */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{t('designComparison.backsplash', 'Backsplash')}</td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4 text-gray-600 dark:text-gray-400">
                    {d.materials?.backsplash || '-'}
                  </td>
                ))}
              </tr>

              {/* Materials: Flooring */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{t('designComparison.flooring', 'Flooring')}</td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4 text-gray-600 dark:text-gray-400">
                    {d.materials?.flooring || '-'}
                  </td>
                ))}
              </tr>

              {/* Estimated Cost */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">
                  {t('designComparison.estimatedCost', 'Estimated Cost')}
                </td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4 text-gray-600 dark:text-gray-400">
                    {formatCurrency(d.estimatedCost.min, d.estimatedCost.currency)} &ndash;{' '}
                    {formatCurrency(d.estimatedCost.max, d.estimatedCost.currency)}
                  </td>
                ))}
              </tr>

              {/* Features */}
              <tr>
                <td className="p-4 font-medium text-gray-700 dark:text-gray-300">{t('designComparison.features', 'Features')}</td>
                {designs.map((d) => (
                  <td key={d.id} className="p-4">
                    <ul className="space-y-1">
                      {d.features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1 text-gray-600 dark:text-gray-400"
                        >
                          <span className="text-green-500 flex-shrink-0">&#10003;</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Score Comparison Bar ── */}
      <div className="max-w-6xl mx-auto mt-10 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('designComparison.scoreComparison', 'Score Comparison')}</h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-4">
            {designs.map((d) => (
              <div key={d.id} className="flex items-center gap-4">
                <span className="w-40 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {d.name}
                </span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      d.score > 80
                        ? 'bg-green-500'
                        : d.score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(d.score, 100)}%` }}
                  />
                </div>
                <span
                  className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${scoreBadgeClasses(d.score)}`}
                >
                  {d.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignComparison;
