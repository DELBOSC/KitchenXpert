/**
 * Price Tracker Page (F9)
 *
 * Allows users to:
 * - Search products and view their price history
 * - View price trends (avg, min, max, trend arrow)
 * - See "best time to buy" recommendation badges
 * - Create / manage price alerts
 *
 * Features: i18n, dark mode, responsive, AbortController cleanup.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../../services/api/api';
import { API_ENDPOINTS } from '../../services/api/endpoints';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PriceHistoryEntry {
  id: string;
  productId: string;
  providerId: string;
  price: number;
  previousPrice: number | null;
  changePercent: number | null;
  currency: string;
  recordedAt: string;
}

interface PriceTrends {
  productId: string;
  currentPrice: number | null;
  avg30d: number | null;
  avg90d: number | null;
  min90d: number | null;
  max90d: number | null;
  trendDirection: 'up' | 'down' | 'stable';
  changePercent30d: number | null;
}

interface BestTimeSuggestion {
  productId: string;
  currentPrice: number | null;
  avgPrice: number | null;
  percentVsAvg: number | null;
  recommendation: 'buy_now' | 'wait' | 'prices_rising';
  message: string;
}

interface PriceAlert {
  id: string;
  userId: string;
  productId: string;
  targetPrice: number;
  currentPrice: number | null;
  direction: 'below' | 'above';
  isTriggered: boolean;
  triggeredAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  sku: string;
}

// ─── SVG Mini Chart ─────────────────────────────────────────────────────────

function MiniPriceChart({ history }: { history: PriceHistoryEntry[] }): React.ReactElement {
  if (history.length < 2) {
    return (
      <div className="w-full h-20 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        Not enough data
      </div>
    );
  }

  const prices = history.map((h) => h.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const width = 300;
  const height = 80;
  const padding = 4;

  const points = prices
    .map((p, i) => {
      const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((p - minP) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  // Determine color based on trend (first vs last)
  const trendUp = prices[prices.length - 1]! > prices[0]!;
  const strokeColor = trendUp ? '#ef4444' : '#22c55e'; // red if up, green if down
  const fillColor = trendUp ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';

  // Build area polygon (close to bottom)
  const firstX = padding;
  const lastX = padding + ((prices.length - 1) / (prices.length - 1)) * (width - 2 * padding);
  const areaPoints = `${firstX},${height - padding} ${points} ${lastX},${height - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="none">
      <polygon points={areaPoints} fill={fillColor} />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Trend Arrow ────────────────────────────────────────────────────────────

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'stable' }): React.ReactElement {
  if (direction === 'up') {
    return (
      <span className="text-red-500 text-lg" title="Trending up">
        &#9650;
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="text-green-500 text-lg" title="Trending down">
        &#9660;
      </span>
    );
  }
  return (
    <span className="text-gray-400 text-lg" title="Stable">
      &#9654;
    </span>
  );
}

// ─── Best-Time Badge ────────────────────────────────────────────────────────

function BestTimeBadge({
  recommendation,
  t,
}: {
  recommendation: BestTimeSuggestion['recommendation'];
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const colors: Record<string, string> = {
    buy_now: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    wait: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    prices_rising: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const labels: Record<string, string> = {
    buy_now: t('priceTracker.buyNow', 'Good time to buy'),
    wait: t('priceTracker.wait', 'Wait'),
    prices_rising: t('priceTracker.pricesRising', 'Prices rising'),
  };

  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium ${colors[recommendation] || ''}`}
    >
      {labels[recommendation] || recommendation}
    </span>
  );
}

// ─── Alert Modal ────────────────────────────────────────────────────────────

function AlertModal({
  productId,
  onClose,
  onCreated,
  t,
}: {
  productId: string;
  onClose: () => void;
  onCreated: () => void;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'below' | 'above'>('below');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError(t('priceTracker.invalidPrice', 'Please enter a valid positive price'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(API_ENDPOINTS.PRICE_TRACKER.CREATE_ALERT, {
        productId,
        targetPrice: price,
        direction,
      });

      if (response.success) {
        onCreated();
        onClose();
      } else {
        setError(response.error?.message || 'Failed to create alert');
      }
    } catch {
      setError(t('priceTracker.alertError', 'Failed to create alert'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('priceTracker.createAlert', 'Create Price Alert')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('priceTracker.targetPrice', 'Target Price (EUR)')}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('priceTracker.direction', 'Alert when price goes')}
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'below' | 'above')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="below">{t('priceTracker.below', 'Below target')}</option>
              <option value="above">{t('priceTracker.above', 'Above target')}</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? t('common.creating', 'Creating...')
                : t('priceTracker.setAlert', 'Set Alert')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function PriceTrackerPage(): React.ReactElement {
  const { t } = useTranslation();

  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Tracked product state
  const [trackedProductIds, setTrackedProductIds] = useState<string[]>([]);
  const [histories, setHistories] = useState<Record<string, PriceHistoryEntry[]>>({});
  const [trends, setTrends] = useState<Record<string, PriceTrends>>({});
  const [bestTimes, setBestTimes] = useState<Record<string, BestTimeSuggestion>>({});
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  // Alerts
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [alertModalProductId, setAlertModalProductId] = useState<string | null>(null);

  // Loading states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Search products ────────────────────────────────────────────────────

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        try {
          const response = await api.get<Product[]>(API_ENDPOINTS.PRODUCTS.SEARCH, {
            params: { q: query, limit: 10 },
          });
          if (response.success && response.data) {
            setSearchResults(response.data);
          }
        } catch {
          // Silently fail search
        } finally {
          setIsSearching(false);
        }
      })();
    }, 300);
  }, []);

  // Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ─── Track a product ──────────────────────────────────────────────────

  const trackProduct = useCallback(
    (product: Product) => {
      if (trackedProductIds.includes(product.id)) {
        return;
      }

      setTrackedProductIds((prev) => [...prev, product.id]);
      setProductNames((prev) => ({ ...prev, [product.id]: product.name }));
      setSearchQuery('');
      setSearchResults([]);
    },
    [trackedProductIds]
  );

  const untrackProduct = useCallback((productId: string) => {
    setTrackedProductIds((prev) => prev.filter((id) => id !== productId));
    setHistories((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    setTrends((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    setBestTimes((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  }, []);

  // ─── Load price data for tracked products ──────────────────────────────

  useEffect(() => {
    if (trackedProductIds.length === 0) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadData = async (): Promise<void> => {
      setIsLoadingData(true);
      try {
        // Load histories, trends, and best-time data in parallel
        const historyPromises = trackedProductIds.map(async (id) => {
          const response = await api.get<PriceHistoryEntry[]>(
            API_ENDPOINTS.PRICE_TRACKER.HISTORY(id),
            { signal: controller.signal }
          );
          return { id, data: response.success && response.data ? response.data : [] };
        });

        const trendsResponse = await api.get<PriceTrends[]>(API_ENDPOINTS.PRICE_TRACKER.TRENDS, {
          params: { productIds: trackedProductIds.join(',') },
          signal: controller.signal,
        });

        const bestTimePromises = trackedProductIds.map(async (id) => {
          const response = await api.get<BestTimeSuggestion>(
            API_ENDPOINTS.PRICE_TRACKER.BEST_TIME(id),
            { signal: controller.signal }
          );
          return { id, data: response.success && response.data ? response.data : null };
        });

        const [historyResults, bestTimeResults] = await Promise.all([
          Promise.all(historyPromises),
          Promise.all(bestTimePromises),
        ]);

        if (cancelled) {
          return;
        }

        // Update histories
        const newHistories: Record<string, PriceHistoryEntry[]> = {};
        for (const result of historyResults) {
          newHistories[result.id] = result.data;
        }
        setHistories(newHistories);

        // Update trends
        if (trendsResponse.success && trendsResponse.data) {
          const newTrends: Record<string, PriceTrends> = {};
          for (const trend of trendsResponse.data) {
            newTrends[trend.productId] = trend;
          }
          setTrends(newTrends);
        }

        // Update best-time suggestions
        const newBestTimes: Record<string, BestTimeSuggestion> = {};
        for (const result of bestTimeResults) {
          if (result.data) {
            newBestTimes[result.id] = result.data;
          }
        }
        setBestTimes(newBestTimes);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Silently fail, data will be empty
      } finally {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [trackedProductIds, retryCount]);

  // ─── Load alerts ────────────────────────────────────────────────────────

  const loadAlerts = useCallback(async (): Promise<void> => {
    setIsLoadingAlerts(true);
    try {
      const response = await api.get<PriceAlert[]>(API_ENDPOINTS.PRICE_TRACKER.ALERTS);
      if (response.success && response.data) {
        setAlerts(response.data);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAlerts();
    return () => controller.abort();
  }, [loadAlerts, retryCount]);

  // ─── Delete alert ────────────────────────────────────────────────────────

  const handleDeleteAlert = useCallback(async (alertId: string): Promise<void> => {
    try {
      const response = await api.delete(API_ENDPOINTS.PRICE_TRACKER.ALERT_BY_ID(alertId));
      if (response.success) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch {
      // Silently fail
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('priceTracker.title', 'Price Tracker')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('priceTracker.subtitle', 'Track product prices, view trends, and set alerts.')}
        </p>
      </div>

      {/* Product Search */}
      <div className="mb-8 relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('priceTracker.searchProducts', 'Search products to track')}
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('priceTracker.searchPlaceholder', 'Type a product name...')}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isSearching && (
          <div className="absolute right-3 top-9 text-gray-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}

        {/* Search dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => trackProduct(product)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                {product.brand && (
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    {product.brand}
                  </span>
                )}
                <span className="float-right text-sm text-gray-600 dark:text-gray-300">
                  {product.price} EUR
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tracked Products */}
      {trackedProductIds.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('priceTracker.trackedProducts', 'Tracked Products')}
          </h2>

          {isLoadingData && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              {t('common.loading', 'Loading...')}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {trackedProductIds.map((productId) => {
              const trend = trends[productId];
              const history = histories[productId] || [];
              const bestTime = bestTimes[productId];
              const name = productNames[productId] || productId;

              return (
                <div
                  key={productId}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4"
                >
                  {/* Header with name and remove button */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{name}</h3>
                    <button
                      onClick={() => untrackProduct(productId)}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-2 flex-shrink-0"
                      title={t('priceTracker.untrack', 'Remove from tracking')}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Current price + change badge */}
                  {trend && trend.currentPrice !== null && (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {trend.currentPrice.toFixed(2)} EUR
                      </span>
                      {trend.changePercent30d !== null && (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            trend.changePercent30d > 0
                              ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                              : trend.changePercent30d < 0
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {trend.changePercent30d > 0 ? '+' : ''}
                          {trend.changePercent30d.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}

                  {/* Mini line chart */}
                  <div className="mb-3">
                    <MiniPriceChart history={history} />
                  </div>

                  {/* Stats row */}
                  {trend && (
                    <div className="grid grid-cols-4 gap-2 text-center mb-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('priceTracker.avg30d', 'Avg 30d')}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {trend.avg30d !== null ? trend.avg30d.toFixed(2) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('priceTracker.min', 'Min')}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {trend.min90d !== null ? trend.min90d.toFixed(2) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('priceTracker.max', 'Max')}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {trend.max90d !== null ? trend.max90d.toFixed(2) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('priceTracker.trend', 'Trend')}
                        </div>
                        <TrendArrow direction={trend.trendDirection} />
                      </div>
                    </div>
                  )}

                  {/* Best time badge + alert button */}
                  <div className="flex items-center justify-between">
                    {bestTime && <BestTimeBadge recommendation={bestTime.recommendation} t={t} />}
                    <button
                      onClick={() => setAlertModalProductId(productId)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {t('priceTracker.setAlert', 'Set Alert')}
                    </button>
                  </div>

                  {/* Best time message */}
                  {bestTime?.message && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {bestTime.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {trackedProductIds.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('priceTracker.noProducts', 'No products tracked')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('priceTracker.searchToAdd', 'Search for products above to start tracking prices.')}
          </p>
        </div>
      )}

      {/* My Alerts Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('priceTracker.myAlerts', 'My Alerts')}
        </h2>

        {isLoadingAlerts && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            {t('common.loading', 'Loading...')}
          </div>
        )}

        {!isLoadingAlerts && alerts.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(
                'priceTracker.noAlerts',
                'No price alerts set. Track a product and click "Set Alert" to get notified.'
              )}
            </p>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('priceTracker.product', 'Product')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('priceTracker.targetPrice', 'Target')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('priceTracker.currentPrice', 'Current')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('priceTracker.direction', 'Direction')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('priceTracker.status', 'Status')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {t('common.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className={alert.isTriggered ? 'bg-green-50 dark:bg-green-900/20' : ''}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        {productNames[alert.productId] || `${alert.productId.substring(0, 8)}...`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {alert.targetPrice.toFixed(2)} EUR
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {alert.currentPrice !== null ? `${alert.currentPrice.toFixed(2)} EUR` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            alert.direction === 'below'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {alert.direction === 'below'
                            ? t('priceTracker.below', 'Below')
                            : t('priceTracker.above', 'Above')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {alert.isTriggered ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {t('priceTracker.triggered', 'Triggered')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {t('priceTracker.active', 'Active')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          {t('common.delete', 'Delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Retry Button */}
      {(trackedProductIds.length > 0 || alerts.length > 0) && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('priceTracker.refresh', 'Refresh data')}
          </button>
        </div>
      )}

      {/* Alert Modal */}
      {alertModalProductId && (
        <AlertModal
          productId={alertModalProductId}
          onClose={() => setAlertModalProductId(null)}
          onCreated={loadAlerts}
          t={t}
        />
      )}
    </div>
  );
}
