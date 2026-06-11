import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { API_BASE_URL } from '../../services/api/endpoints';
import { getErrorMessage } from '../../utils/error-handling';

// ---------- Types ----------

interface StockStats {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  lastCheckAt: string | null;
}

interface StockResult {
  id: string;
  productName: string;
  brand: string;
  category: string;
  quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastCheckedAt: string;
}

// ---------- Component ----------

const StockAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();

  const [stockStats, setStockStats] = useState<StockStats | null>(null);
  const [stockResults, setStockResults] = useState<StockResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [brands, setBrands] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ---------- Fetch data ----------

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const statusParam = filterStatus !== 'all' ? `&status=${filterStatus}` : '';
        const brandParam = filterBrand !== 'all' ? `&brand=${encodeURIComponent(filterBrand)}` : '';

        const [statsRes, resultsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/stock/status`, {
            credentials: 'include',
            signal: controller.signal,
          }),
          fetch(`${API_BASE_URL}/stock/results?page=${currentPage}&limit=20${statusParam}${brandParam}`, {
            credentials: 'include',
            signal: controller.signal,
          }),
        ]);

        if (!statsRes.ok) {throw new Error(t('admin.stock.errors.fetchStats', 'Failed to load stock stats'));}
        if (!resultsRes.ok) {throw new Error(t('admin.stock.errors.fetchResults', 'Failed to load stock results'));}

        const statsData = await statsRes.json();
        const resultsData = await resultsRes.json();

        const stats: StockStats = statsData.data ?? statsData;
        const results: StockResult[] = resultsData.data ?? resultsData;

        setStockStats(stats);
        setStockResults(results);

        // Extract unique brands from results for filter
        const uniqueBrands = Array.from(new Set(results.map((r) => r.brand).filter(Boolean)));
        setBrands((prev) => {
          const merged = Array.from(new Set([...prev, ...uniqueBrands]));
          return merged.sort();
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        setError(getErrorMessage(err, t('admin.stock.errors.load', 'Failed to load stock data')));
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
    return () => controller.abort();
  }, [retryCount, currentPage, filterStatus, filterBrand, t]);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (!message) {return;}
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterBrand]);

  // ---------- Actions ----------

  const handleCheckAll = useCallback(async () => {
    setIsChecking(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/stock/check-all`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? t('admin.stock.errors.checkFailed', 'Stock check failed'));
      }
      setMessage({ type: 'success', text: t('admin.stock.success.checkAll', 'Stock check launched successfully') });
      setRetryCount((c) => c + 1);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, t('admin.stock.errors.checkUnknown', 'Unknown error during stock check')) });
    } finally {
      setIsChecking(false);
    }
  }, [t]);

  // ---------- Helpers ----------

  const statusBadge = (status: StockResult['status']) => {
    const map: Record<string, string> = {
      in_stock: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      low_stock: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      out_of_stock: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return map[status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
  };

  const statusLabel = (status: StockResult['status']) => {
    const map: Record<string, string> = {
      in_stock: t('admin.stock.status.inStock', 'In Stock'),
      low_stock: t('admin.stock.status.lowStock', 'Low Stock'),
      out_of_stock: t('admin.stock.status.outOfStock', 'Out of Stock'),
    };
    return map[status] ?? status;
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

  if (isLoading && !stockStats) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // ---------- Render ----------

  const statCards = [
    {
      label: t('admin.stock.stats.inStock', 'In Stock'),
      value: stockStats?.inStock ?? 0,
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    },
    {
      label: t('admin.stock.stats.lowStock', 'Low Stock'),
      value: stockStats?.lowStock ?? 0,
      color: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    },
    {
      label: t('admin.stock.stats.outOfStock', 'Out of Stock'),
      value: stockStats?.outOfStock ?? 0,
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    },
    {
      label: t('admin.stock.stats.total', 'Total Products'),
      value: stockStats?.total ?? 0,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ---------- Header ---------- */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('admin.stock.title', 'Stock Management')}
            </h1>
            {stockStats?.lastCheckAt && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('admin.stock.lastCheck', 'Last check')}: {formatDate(stockStats.lastCheckAt)}
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
              {t('admin.stock.refresh', 'Refresh')}
            </button>
            <button
              onClick={handleCheckAll}
              disabled={isChecking}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChecking && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {t('admin.stock.checkAll', 'Check All Stock')}
              {(stockStats?.outOfStock ?? 0) > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                  {stockStats?.outOfStock}
                </span>
              )}
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

        {/* ---------- Filter bar ---------- */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label
              htmlFor="filterBrand"
              className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider"
            >
              {t('admin.stock.filter.brand', 'Brand')}
            </label>
            <select
              id="filterBrand"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="all">{t('admin.stock.filter.allBrands', 'All Brands')}</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filterStatus"
              className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider"
            >
              {t('admin.stock.filter.status', 'Status')}
            </label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="all">{t('admin.stock.filter.all', 'All')}</option>
              <option value="in_stock">{t('admin.stock.status.inStock', 'In Stock')}</option>
              <option value="low_stock">{t('admin.stock.status.lowStock', 'Low Stock')}</option>
              <option value="out_of_stock">{t('admin.stock.status.outOfStock', 'Out of Stock')}</option>
            </select>
          </div>

          {(filterStatus !== 'all' || filterBrand !== 'all') && (
            <button
              onClick={() => { setFilterStatus('all'); setFilterBrand('all'); }}
              className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-medium"
            >
              {t('admin.stock.filter.clear', 'Clear filters')}
            </button>
          )}
        </div>

        {/* ---------- Results table ---------- */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.stock.table.title', 'Product Stock')}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
              aria-label={t('admin.stock.table.ariaLabel', 'Product stock list')}
              aria-busy={isLoading}
            >
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.stock.table.productName', 'Product Name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.stock.table.brand', 'Brand')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.stock.table.category', 'Category')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.stock.table.quantity', 'Quantity')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.stock.table.status', 'Status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.stock.table.lastChecked', 'Last Checked')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {stockResults.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      {t('admin.stock.table.empty', 'No stock results found.')}
                    </td>
                  </tr>
                ) : (
                  stockResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {result.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {result.brand}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {result.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                        {result.quantity.toLocaleString(i18n.language)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${statusBadge(result.status)}`}>
                          {statusLabel(result.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                        {formatDate(result.lastCheckedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ---------- Pagination ---------- */}
          {stockResults.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.stock.pagination.page', 'Page')} {currentPage}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('admin.stock.pagination.previous', 'Previous')}
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={stockResults.length < 20}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t('admin.stock.pagination.next', 'Next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAdmin;
