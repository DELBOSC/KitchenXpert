import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { API_BASE_URL, API_ENDPOINTS } from '../../services/api/endpoints';

// ---------- Types ----------

interface BreakdownItem {
  name: string;
  count: number;
  enriched: number;
  pending: number;
  failed: number;
}

interface RecentEnrichment {
  id: string;
  productName: string;
  productType: string;
  brand: string;
  status: 'enriched' | 'failed' | 'pending' | 'skipped';
  confidence: number;
  enrichedAt: string;
}

interface EnrichmentStats {
  pending: number;
  enriched: number;
  failed: number;
  skipped: number;
  averageConfidence: number;
  byType: BreakdownItem[];
  byBrand: BreakdownItem[];
  recentEnrichments: RecentEnrichment[];
}

// ---------- Component ----------

const EnrichmentDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Cross-match brand inputs
  const [brandA, setBrandA] = useState('');
  const [brandB, setBrandB] = useState('');

  // ---------- Fetch stats ----------

  useEffect(() => {
    const controller = new AbortController();
    void fetchStats(controller.signal);
    return () => controller.abort();
  }, [retryCount]);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (!message) {return;}
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const fetchStats = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ENRICHMENT.STATUS}`, {
        credentials: 'include',
        signal,
      });
      if (!res.ok) {throw new Error(t('admin.enrichment.errors.fetchStats', 'Failed to fetch stats'));}
      const data = await res.json();
      setStats(data.data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {return;}
      setMessage({ type: 'error', text: t('admin.enrichment.errors.loadStats', 'Erreur de chargement des statistiques') });
    } finally {
      setLoading(false);
    }
  };

  // ---------- Action helpers ----------

  const runAction = async (
    key: string,
    url: string,
    successText: string,
  ) => {
    setActionLoading(key);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || t('admin.enrichment.errors.actionFailed', 'Action failed'));
      }
      setMessage({ type: 'success', text: successText });
      // Refresh stats after action
      setRetryCount((c) => c + 1);
    } catch (err) {
      const text = err instanceof Error ? err.message : t('admin.enrichment.errors.unknown', 'Erreur inconnue');
      setMessage({ type: 'error', text });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnrichAll = () =>
    runAction('enrich-all', API_ENDPOINTS.ENRICHMENT.ENRICH_ALL, t('admin.enrichment.success.enrichAll', 'Enrichissement lance avec succes'));

  const handleGenerateCompatibility = () =>
    runAction(
      'compatibility',
      API_ENDPOINTS.ENRICHMENT.COMPATIBILITY_GENERATE,
      t('admin.enrichment.success.compatibility', 'Generation de la matrice de compatibilite lancee'),
    );

  const handleCrossMatch = () => {
    if (!brandA.trim() || !brandB.trim()) {
      setMessage({ type: 'error', text: t('admin.enrichment.errors.brandRequired', 'Veuillez renseigner les deux identifiants de marque') });
      return;
    }
    void runAction(
      'cross-match',
      API_ENDPOINTS.ENRICHMENT.MATCH_BRANDS(brandA.trim(), brandB.trim()),
      t('admin.enrichment.success.crossMatch', { brandA: brandA.trim(), brandB: brandB.trim(), defaultValue: 'Cross-match entre {{brandA}} et {{brandB}} lance' }),
    );
  };

  // ---------- Helpers ----------

  const statusBadge = (status: RecentEnrichment['status']) => {
    const map: Record<string, string> = {
      enriched: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      skipped: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    };
    return map[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // ---------- Render: loading ----------

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ---------- Render ----------

  const total = stats
    ? stats.pending + stats.enriched + stats.failed + stats.skipped
    : 0;

  const cards: { label: string; value: number; color: string; bgColor: string; darkBgColor: string }[] = [
    { label: t('enrichment.status.pending', 'En attente'), value: stats?.pending ?? 0, color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 border-yellow-200', darkBgColor: 'dark:bg-yellow-900/20 dark:border-yellow-800' },
    { label: t('enrichment.status.enriched', 'Enrichis'), value: stats?.enriched ?? 0, color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-50 border-green-200', darkBgColor: 'dark:bg-green-900/20 dark:border-green-800' },
    { label: t('enrichment.status.failed', 'Echoues'), value: stats?.failed ?? 0, color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 border-red-200', darkBgColor: 'dark:bg-red-900/20 dark:border-red-800' },
    { label: t('enrichment.status.skipped', 'Ignores'), value: stats?.skipped ?? 0, color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-50 border-gray-200', darkBgColor: 'dark:bg-gray-800 dark:border-gray-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ---------- Header ---------- */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('admin.enrichment.title', 'Enrichissement IA du Catalogue')}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {t('admin.enrichment.description', "Tableau de bord de l'enrichissement automatique des produits, de la matrice de compatibilite et du cross-matching entre marques.")}
          </p>
        </div>

        {/* ---------- Message banner ---------- */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border flex justify-between items-center ${message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}
          >
            <p>{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              aria-label={t('common.dismissMessage', 'Dismiss message')}
              className="ml-4 hover:opacity-70"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ---------- Stat cards ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {cards.map((card, index) => (
            <div
              key={index}
              className={`rounded-lg border p-5 ${card.bgColor} ${card.darkBgColor}`}
            >
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={`mt-1 text-3xl font-bold ${card.color}`}>
                {card.value.toLocaleString(i18n.language)}
              </p>
              {total > 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {((card.value / total) * 100).toFixed(1)} % {t('admin.enrichment.ofTotal', 'du total')}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ---------- Confidence bar ---------- */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 mb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.enrichment.averageConfidence', 'Confiance moyenne')}
              </p>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                {(stats.averageConfidence * 100).toFixed(1)} %
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.averageConfidence * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ---------- Action buttons ---------- */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('admin.enrichment.actions', 'Actions')}</h2>

          <div className="flex flex-wrap gap-3 mb-6">
            {/* Enrich all */}
            <button
              onClick={handleEnrichAll}
              disabled={actionLoading !== null}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading === 'enrich-all' && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t('admin.enrichment.enrichAll', 'Enrichir tout')}
            </button>

            {/* Compatibility matrix */}
            <button
              onClick={handleGenerateCompatibility}
              disabled={actionLoading !== null}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {actionLoading === 'compatibility' && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t('admin.enrichment.generateCompatibility', 'Generer matrice compatibilite')}
            </button>

            {/* Retry (refresh) */}
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              disabled={loading}
              className="px-5 py-2.5 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t('admin.enrichment.refresh', 'Rafraichir')}
            </button>
          </div>

          {/* Cross-match section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('admin.enrichment.crossMatch', 'Cross-match marques')}
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="brandA" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('admin.enrichment.brandA', 'Marque A (ID)')}
                </label>
                <input
                  id="brandA"
                  type="text"
                  value={brandA}
                  onChange={(e) => setBrandA(e.target.value)}
                  placeholder={t('admin.enrichment.brandAPlaceholder', 'ex: brand-ikea')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-sm w-48"
                />
              </div>
              <div>
                <label htmlFor="brandB" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('admin.enrichment.brandB', 'Marque B (ID)')}
                </label>
                <input
                  id="brandB"
                  type="text"
                  value={brandB}
                  onChange={(e) => setBrandB(e.target.value)}
                  placeholder={t('admin.enrichment.brandBPlaceholder', 'ex: brand-leroy')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-sm w-48"
                />
              </div>
              <button
                onClick={handleCrossMatch}
                disabled={actionLoading !== null}
                className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading === 'cross-match' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                {t('admin.enrichment.crossMatchAction', 'Cross-match marques')}
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Breakdown by product type ---------- */}
        {stats && stats.byType.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.enrichment.byProductType', 'Repartition par type de produit')}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label={t('admin.enrichment.byProductTypeTable', 'Breakdown by product type')}>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.type', 'Type')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.total', 'Total')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.enriched', 'Enrichis')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.pending', 'En attente')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.failed', 'Echoues')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.byType.map((row) => (
                    <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{row.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 dark:text-green-400 text-right">{row.enriched}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-700 dark:text-yellow-400 text-right">{row.pending}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 dark:text-red-400 text-right">{row.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- Breakdown by brand ---------- */}
        {stats && stats.byBrand.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.enrichment.byBrand', 'Repartition par marque')}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label={t('admin.enrichment.byBrandTable', 'Breakdown by brand')}>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.brand', 'Marque')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.total', 'Total')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.enriched', 'Enrichis')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.pending', 'En attente')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.failed', 'Echoues')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.byBrand.map((row) => (
                    <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{row.count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 dark:text-green-400 text-right">{row.enriched}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-700 dark:text-yellow-400 text-right">{row.pending}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-700 dark:text-red-400 text-right">{row.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- Recent enrichments ---------- */}
        {stats && stats.recentEnrichments.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.enrichment.recentTitle', 'Enrichissements recents')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('admin.enrichment.recentSubtitle', 'Les 20 derniers enrichissements')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label={t('admin.enrichment.recentTable', 'Recent enrichments')}>
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.product', 'Produit')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.type', 'Type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.brand', 'Marque')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.status', 'Statut')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.confidence', 'Confiance')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('admin.enrichment.table.date', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.recentEnrichments.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {item.productType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {item.brand}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${statusBadge(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                        {(item.confidence * 100).toFixed(0)} %
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                        {formatDate(item.enrichedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {stats.recentEnrichments.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">{t('admin.enrichment.noRecent', 'Aucun enrichissement recent')}</p>
              </div>
            )}
          </div>
        )}

        {/* ---------- Empty state ---------- */}
        {stats &&
          stats.pending === 0 &&
          stats.enriched === 0 &&
          stats.failed === 0 &&
          stats.skipped === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                {t('admin.enrichment.emptyState', "Aucune donnee d'enrichissement disponible. Lancez un enrichissement pour commencer.")}
              </p>
            </div>
          )}
      </div>
    </div>
  );
};

export default EnrichmentDashboard;
