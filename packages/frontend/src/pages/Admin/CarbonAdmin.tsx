import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { API_BASE_URL } from '../../services/api/endpoints';
import { getErrorMessage } from '../../utils/error-handling';

// ---------- Types ----------

interface CarbonStats {
  totalReports: number;
  averageCo2: number;
  totalCo2Saved: number;
}

interface CarbonReport {
  id: string;
  kitchenName: string;
  ownerEmail: string;
  totalCo2: number;
  furnitureCo2: number;
  appliancesCo2: number;
  deliveryCo2: number;
  createdAt: string;
}

// ---------- Component ----------

const CarbonAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [carbonStats, setCarbonStats] = useState<CarbonStats | null>(null);
  const [reports, setReports] = useState<CarbonReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ---------- Fetch data ----------

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [statsRes, reportsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/carbon/stats`, {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch(`${API_BASE_URL}/carbon/reports?page=${currentPage}&limit=20`, {
            credentials: 'include',
            signal: controller.signal,
          }),
        ]);

        if (!statsRes.ok) {throw new Error(t('admin.carbon.errors.fetchStats', 'Failed to load carbon stats'));}
        if (!reportsRes.ok) {throw new Error(t('admin.carbon.errors.fetchReports', 'Failed to load carbon reports'));}

        const statsData = (await statsRes.json()) as CarbonStats | { data: CarbonStats };
        const reportsData = (await reportsRes.json()) as CarbonReport[] | { data: CarbonReport[] };

        setCarbonStats('data' in statsData ? statsData.data : statsData);
        setReports('data' in reportsData ? reportsData.data : reportsData);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        setError(getErrorMessage(err, t('admin.carbon.errors.load', 'Failed to load carbon data')));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [retryCount, currentPage, t]);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (!message) {return;}
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // ---------- Actions ----------

  const handleRecalculateAll = useCallback(async () => {
    setIsRecalculating(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/carbon/recalculate-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? t('admin.carbon.errors.recalcFailed', 'Recalculation failed'));
      }
      setMessage({ type: 'success', text: t('admin.carbon.success.recalcAll', 'Recalculation launched successfully') });
      setRetryCount((c) => c + 1);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, t('admin.carbon.errors.recalcUnknown', 'Unknown error during recalculation')) });
    } finally {
      setIsRecalculating(false);
    }
  }, [t]);

  // ---------- Helpers ----------

  const getCarbonLevel = (co2: number) => {
    if (co2 < 200) {return { label: t('admin.carbon.level.low', 'Low'), color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' };}
    if (co2 < 500) {return { label: t('admin.carbon.level.medium', 'Medium'), color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' };}
    return { label: t('admin.carbon.level.high', 'High'), color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' };
  };

  const formatDate = (iso: string | null) => {
    if (!iso) {return t('common.never', 'Never');}
    return new Date(iso).toLocaleString(i18n.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCo2 = (kg: number) =>
    `${kg.toLocaleString(i18n.language, { maximumFractionDigits: 1 })} kg`;

  // ---------- Render: loading ----------

  if (isLoading && !carbonStats) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ---------- Render ----------

  const kpiCards = [
    {
      label: t('admin.carbon.kpi.totalReports', 'Total Reports'),
      value: (carbonStats?.totalReports ?? 0).toLocaleString(i18n.language),
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    },
    {
      label: t('admin.carbon.kpi.averageCo2', 'Average CO\u2082 / kitchen'),
      value: formatCo2(carbonStats?.averageCo2 ?? 0),
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    },
    {
      label: t('admin.carbon.kpi.co2Saved', 'CO\u2082 Saved'),
      value: formatCo2(carbonStats?.totalCo2Saved ?? 0),
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ---------- Header ---------- */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('admin.carbon.title', 'Carbon Reports')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('admin.carbon.description', 'Monitor and recalculate carbon footprint data for all kitchen designs.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-800 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t('admin.carbon.refresh', 'Refresh')}
            </button>
            <button
              onClick={handleRecalculateAll}
              disabled={isRecalculating}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRecalculating && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t('admin.carbon.recalculateAll', 'Recalculate All')}
            </button>
          </div>
        </div>

        {/* ---------- Message banner ---------- */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border flex justify-between items-center ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            }`}
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

        {/* ---------- Error alert ---------- */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex justify-between items-center">
            <p>{error}</p>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="ml-4 px-3 py-1 text-sm bg-red-100 dark:bg-red-800 hover:bg-red-200 dark:hover:bg-red-700 rounded-md transition-colors"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        )}

        {/* ---------- KPI cards ---------- */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {kpiCards.map((card) => (
            <div key={card.label} className={`rounded-lg border p-5 ${card.bgColor}`}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* ---------- Reports table ---------- */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.carbon.table.title', 'Carbon Reports')}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
              aria-label={t('admin.carbon.table.ariaLabel', 'Carbon footprint reports')}
              aria-busy={isLoading}
            >
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.carbon.table.kitchenName', 'Kitchen Name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.carbon.table.owner', 'Owner')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.carbon.table.totalCo2', 'Total CO\u2082')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.carbon.table.furnitureCo2', 'Furniture CO\u2082')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.carbon.table.appliancesCo2', 'Appliances CO\u2082')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.carbon.table.deliveryCo2', 'Delivery CO\u2082')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.carbon.table.date', 'Date')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reports.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {t('admin.carbon.table.empty', 'No carbon reports found.')}
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const level = getCarbonLevel(report.totalCo2);
                    return (
                      <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {report.kitchenName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {report.ownerEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full ${level.color}`}>
                            {formatCo2(report.totalCo2)}
                            <span className="font-normal opacity-80">({level.label})</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCo2(report.furnitureCo2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCo2(report.appliancesCo2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatCo2(report.deliveryCo2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                          {formatDate(report.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ---------- Pagination ---------- */}
          {reports.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.carbon.pagination.page', 'Page')} {currentPage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('admin.carbon.pagination.previous', 'Previous')}
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={reports.length < 20}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('admin.carbon.pagination.next', 'Next')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------- Empty state ---------- */}
        {!isLoading && reports.length === 0 && !error && (
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
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {t('admin.carbon.emptyState', 'No carbon reports available. Reports are generated automatically when kitchens are completed.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonAdmin;
