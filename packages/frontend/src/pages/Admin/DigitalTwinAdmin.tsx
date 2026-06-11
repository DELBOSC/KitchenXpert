import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { API_BASE_URL } from '../../services/api/endpoints';
import { getErrorMessage } from '../../utils/error-handling';

// ---------- Types ----------

interface DigitalTwin {
  id: string;
  kitchenId: string;
  kitchenName: string;
  ownerEmail: string;
  status: 'active' | 'syncing' | 'error' | 'inactive';
  lastSync: string | null;
  data?: Record<string, unknown>;
}

interface DigitalTwinStats {
  total: number;
  active: number;
  syncing: number;
  error: number;
  lastGlobalSync: string | null;
}

// ---------- Component ----------

const DigitalTwinAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [stats, setStats] = useState<DigitalTwinStats | null>(null);
  const [twins, setTwins] = useState<DigitalTwin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedTwin, setSelectedTwin] = useState<DigitalTwin | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ---------- Fetch twins list ----------

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [statsRes, twinsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/digital-twin/stats`, {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch(`${API_BASE_URL}/digital-twin/list?page=${currentPage}&limit=20`, {
            credentials: 'include',
            signal: controller.signal,
          }),
        ]);

        if (!statsRes.ok) {throw new Error(t('admin.digitalTwin.errors.fetchStats', 'Failed to load stats'));}
        if (!twinsRes.ok) {throw new Error(t('admin.digitalTwin.errors.fetchList', 'Failed to load twins'));}

        const statsData = await statsRes.json();
        const twinsData = await twinsRes.json();

        setStats(statsData.data ?? statsData);
        setTwins(twinsData.data ?? twinsData);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        setError(getErrorMessage(err, t('admin.digitalTwin.errors.load', 'Failed to load digital twins')));
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

  const handleSyncAll = useCallback(async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/digital-twin/sync-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? t('admin.digitalTwin.errors.syncFailed', 'Sync failed'));
      }
      setMessage({ type: 'success', text: t('admin.digitalTwin.success.syncAll', 'Global sync launched successfully') });
      setRetryCount((c) => c + 1);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, t('admin.digitalTwin.errors.syncUnknown', 'Unknown sync error')) });
    } finally {
      setIsSyncing(false);
    }
  }, [t]);

  const handleViewDetail = useCallback(async (twin: DigitalTwin) => {
    try {
      const res = await fetch(`${API_BASE_URL}/digital-twin/${twin.kitchenId}`, {
        credentials: 'include',
      });
      if (!res.ok) {throw new Error(t('admin.digitalTwin.errors.fetchDetail', 'Failed to load twin details'));}
      const data = await res.json();
      setSelectedTwin(data.data ?? data);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, t('admin.digitalTwin.errors.detailUnknown', 'Failed to load details')) });
    }
  }, [t]);

  // ---------- Helpers ----------

  const statusBadge = (status: DigitalTwin['status']) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      syncing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    };
    return map[status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
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

  // ---------- Render: loading ----------

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ---------- Render ----------

  const statCards = [
    {
      label: t('admin.digitalTwin.stats.total', 'Total'),
      value: stats?.total ?? 0,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    },
    {
      label: t('admin.digitalTwin.stats.active', 'Active'),
      value: stats?.active ?? 0,
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    },
    {
      label: t('admin.digitalTwin.stats.syncing', 'Syncing'),
      value: stats?.syncing ?? 0,
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    },
    {
      label: t('admin.digitalTwin.stats.error', 'Error'),
      value: stats?.error ?? 0,
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ---------- Header ---------- */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('admin.digitalTwin.title', 'Digital Twin Admin')}
            </h1>
            {stats?.lastGlobalSync && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('admin.digitalTwin.lastGlobalSync', 'Last global sync')}: {formatDate(stats.lastGlobalSync)}
              </p>
            )}
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
              {t('admin.digitalTwin.refresh', 'Refresh')}
            </button>
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSyncing && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t('admin.digitalTwin.syncAll', 'Sync All')}
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

        {/* ---------- Stat cards ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className={`rounded-lg border p-5 ${card.bgColor}`}>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className={`mt-1 text-3xl font-bold ${card.color}`}>
                {card.value.toLocaleString(i18n.language)}
              </p>
            </div>
          ))}
        </div>

        {/* ---------- Twins table ---------- */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.digitalTwin.table.title', 'Kitchen Digital Twins')}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
              aria-label={t('admin.digitalTwin.table.ariaLabel', 'Digital twins list')}
              aria-busy={isLoading}
            >
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.table.kitchenName', 'Kitchen Name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.table.owner', 'Owner')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.table.status', 'Status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.table.lastSync', 'Last Sync')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.table.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {twins.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {t('admin.digitalTwin.table.empty', 'No digital twins found.')}
                    </td>
                  </tr>
                ) : (
                  twins.map((twin) => (
                    <tr key={twin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {twin.kitchenName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {twin.ownerEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${statusBadge(twin.status)}`}>
                          {twin.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                        {formatDate(twin.lastSync)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleViewDetail(twin)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                        >
                          {t('admin.digitalTwin.table.view', 'View')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ---------- Pagination ---------- */}
          {twins.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.digitalTwin.pagination.page', 'Page')} {currentPage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('admin.digitalTwin.pagination.previous', 'Previous')}
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={twins.length < 20}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('admin.digitalTwin.pagination.next', 'Next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Detail modal ---------- */}
      {selectedTwin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.digitalTwin.modal.ariaLabel', 'Digital twin details')}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.digitalTwin.modal.title', 'Twin Details')} — {selectedTwin.kitchenName}
              </h2>
              <button
                onClick={() => setSelectedTwin(null)}
                aria-label={t('common.close', 'Close')}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.modal.id', 'ID')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">{selectedTwin.id}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.modal.kitchenId', 'Kitchen ID')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">{selectedTwin.kitchenId}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.modal.owner', 'Owner')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{selectedTwin.ownerEmail}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.modal.status', 'Status')}
                  </dt>
                  <dd className="mt-1">
                    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${statusBadge(selectedTwin.status)}`}>
                      {selectedTwin.status}
                    </span>
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.digitalTwin.modal.lastSync', 'Last Sync')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(selectedTwin.lastSync)}</dd>
                </div>
                {selectedTwin.data && (
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                      {t('admin.digitalTwin.modal.data', 'Twin Data')}
                    </dt>
                    <dd>
                      <pre className="text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-gray-800 dark:text-gray-200">
                        {JSON.stringify(selectedTwin.data, null, 2)}
                      </pre>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedTwin(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitalTwinAdmin;
