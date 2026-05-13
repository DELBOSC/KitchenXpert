/**
 * Compliance Dashboard — Building Code Compliance Checker (NF C 15-100)
 *
 * Displays compliance check results for a selected kitchen, including:
 *  - Summary bar (passed / failed / warnings)
 *  - Card list with color-coded results
 *  - Run Compliance Check button
 *  - Kitchen selector if no kitchenId in URL
 *  - Check history
 *
 * Follows project patterns: useTranslation, dark mode, AbortController,
 * credentials: 'include', retryCount pattern.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { api } from '../../services/api/api';
import { API_ENDPOINTS } from '../../services/api/endpoints';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface ComplianceResultItem {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  severity: string;
  position?: { x: number; y: number; z: number } | null;
  fixSuggestion?: string;
}

interface ComplianceCheckResult {
  id: string;
  kitchenId: string;
  userId: string;
  status: 'passed' | 'failed';
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  results: ComplianceResultItem[];
  checkedAt: string;
}

interface KitchenSummary {
  id: string;
  name: string;
  style?: string;
  layout?: string;
  width?: number;
  length?: number;
}

interface ComplianceHistoryItem {
  id: string;
  status: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  checkedAt: string;
}

// ----------------------------------------------------------------
// Severity badge helpers
// ----------------------------------------------------------------

function severityBadge(severity: string, t: Function): { label: string; className: string } {
  switch (severity) {
    case 'error':
      return {
        label: t('compliance.severity.error', 'Error'),
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      };
    case 'warning':
      return {
        label: t('compliance.severity.warning', 'Warning'),
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      };
    case 'info':
      return {
        label: t('compliance.severity.info', 'Info'),
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      };
    default:
      return {
        label: severity,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      };
  }
}

function statusColor(status: 'passed' | 'failed' | 'warning'): string {
  switch (status) {
    case 'passed':
      return 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/10';
    case 'failed':
      return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10';
    case 'warning':
      return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
  }
}

function statusIcon(status: 'passed' | 'failed' | 'warning'): React.ReactElement {
  switch (status) {
    case 'passed':
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
  }
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function ComplianceDashboard(): React.ReactElement {
  const { kitchenId: urlKitchenId } = useParams<{ kitchenId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [selectedKitchenId, setSelectedKitchenId] = useState<string | null>(urlKitchenId ?? null);
  const [kitchens, setKitchens] = useState<KitchenSummary[]>([]);
  const [checkResult, setCheckResult] = useState<ComplianceCheckResult | null>(null);
  const [history, setHistory] = useState<ComplianceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingKitchens, setLoadingKitchens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'warning'>('all');
  const [showHistory, setShowHistory] = useState(false);

  // ---- Load kitchens if no kitchenId ----
  useEffect(() => {
    if (selectedKitchenId) {return;}

    const controller = new AbortController();
    setLoadingKitchens(true);

    (async () => {
      try {
        const response = await api.get<KitchenSummary[]>(API_ENDPOINTS.KITCHENS.BASE, {
          signal: controller.signal,
        });

        if (response.success && response.data) {
          setKitchens(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        setError(t('compliance.errorLoadingKitchens', 'Failed to load kitchens'));
      } finally {
        if (!controller.signal.aborted) {
          setLoadingKitchens(false);
        }
      }
    })();

    return () => controller.abort();
  }, [selectedKitchenId, retryCount, t]);

  // ---- Load history when a kitchen is selected ----
  useEffect(() => {
    if (!selectedKitchenId) {return;}

    const controller = new AbortController();

    (async () => {
      try {
        const response = await api.get<ComplianceHistoryItem[]>(
          API_ENDPOINTS.COMPLIANCE.HISTORY(selectedKitchenId),
          { signal: controller.signal },
        );

        if (response.success && response.data) {
          setHistory(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        // Non-critical: history load failure should not block the UI
      }
    })();

    return () => controller.abort();
  }, [selectedKitchenId, checkResult, retryCount]);

  // ---- Run compliance check ----
  const runCheck = useCallback(async () => {
    if (!selectedKitchenId) {return;}

    setLoading(true);
    setError(null);
    setCheckResult(null);

    try {
      const response = await api.post<ComplianceCheckResult>(
        API_ENDPOINTS.COMPLIANCE.CHECK(selectedKitchenId),
      );

      if (response.success && response.data) {
        setCheckResult(response.data);
      } else {
        setError(response.error?.message || t('compliance.errorRunningCheck', 'Failed to run compliance check'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('compliance.errorRunningCheck', 'Failed to run compliance check'));
    } finally {
      setLoading(false);
    }
  }, [selectedKitchenId, t]);

  // ---- Select kitchen ----
  const selectKitchen = useCallback((id: string) => {
    setSelectedKitchenId(id);
    setCheckResult(null);
    setError(null);
    navigate(`/compliance/${id}`, { replace: true });
  }, [navigate]);

  // ---- Filter results ----
  const filteredResults = checkResult?.results.filter(r => {
    if (filter === 'all') {return true;}
    return r.status === filter;
  }) ?? [];

  // ── Kitchen Selector ──────────────────────────────────────────
  if (!selectedKitchenId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('compliance.title', 'Building Code Compliance')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {t('compliance.selectKitchenDescription', 'Select a kitchen to run compliance checks against French building codes (NF C 15-100, NF DTU 24.1, PMR).')}
        </p>

        {loadingKitchens ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : kitchens.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t('compliance.noKitchens', 'No kitchens found. Create a kitchen project first.')}
            </p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('compliance.retry', 'Retry')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kitchens.map((kitchen) => (
              <button
                key={kitchen.id}
                onClick={() => selectKitchen(kitchen.id)}
                className="text-left bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {kitchen.name}
                </h3>
                {kitchen.style && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    {kitchen.style}
                  </p>
                )}
                {kitchen.width && kitchen.length && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {kitchen.width} x {kitchen.length} cm
                  </p>
                )}
                <span className="inline-block mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                  {t('compliance.selectKitchen', 'Select')} &rarr;
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Main Dashboard ────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => { setSelectedKitchenId(null); setCheckResult(null); navigate('/compliance', { replace: true }); }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              &larr; {t('compliance.backToKitchens', 'Kitchens')}
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('compliance.title', 'Building Code Compliance')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            NF C 15-100 &middot; NF DTU 24.1 &middot; NF EN 1116 &middot; PMR NF P 99-611
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('compliance.history', 'History')}
          </button>
          <button
            onClick={runCheck}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow transition-colors flex items-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {t('compliance.runCheck', 'Run Compliance Check')}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            {t('compliance.retry', 'Retry')}
          </button>
        </div>
      )}

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            {t('compliance.previousChecks', 'Previous Checks')}
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${h.status === 'passed' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(h.checkedAt).toLocaleDateString()} {new Date(h.checkedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-600 dark:text-green-400">{h.passedRules} {t('compliance.passed', 'passed')}</span>
                  <span className="text-red-600 dark:text-red-400">{h.failedRules} {t('compliance.failed', 'failed')}</span>
                  <span className="text-yellow-600 dark:text-yellow-400">{h.warningRules} {t('compliance.warnings', 'warnings')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Bar */}
      {checkResult && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('compliance.totalRules', 'Total Rules')}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{checkResult.totalRules}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide">
              {t('compliance.passed', 'Passed')}
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{checkResult.passedRules}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide">
              {t('compliance.failed', 'Failed')}
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{checkResult.failedRules}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">
              {t('compliance.warnings', 'Warnings')}
            </p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{checkResult.warningRules}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {checkResult && (
        <div className="mb-4 flex items-center gap-2">
          {(['all', 'failed', 'warning', 'passed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all'
                ? t('compliance.filterAll', 'All')
                : f === 'failed'
                  ? t('compliance.filterFailed', 'Failed')
                  : f === 'warning'
                    ? t('compliance.filterWarnings', 'Warnings')
                    : t('compliance.filterPassed', 'Passed')
              }
              {f !== 'all' && checkResult && (
                <span className="ml-1">
                  ({f === 'failed' ? checkResult.failedRules : f === 'warning' ? checkResult.warningRules : checkResult.passedRules})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Results list */}
      {checkResult && filteredResults.length > 0 && (
        <div className="space-y-3">
          {filteredResults.map((result, index) => {
            const badge = severityBadge(result.severity, t);
            return (
              <div
                key={`${result.ruleId}-${index}`}
                className={`rounded-lg shadow-sm p-4 ${statusColor(result.status)} dark:border-opacity-50`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {statusIcon(result.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {result.ruleName}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                        {result.ruleCode}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {result.message}
                    </p>
                    {result.fixSuggestion && result.status !== 'passed' && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          {result.fixSuggestion}
                        </p>
                      </div>
                    )}
                    {result.position && result.status !== 'passed' && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                        Position: ({result.position.x}, {result.position.y}, {result.position.z})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state for filtered results */}
      {checkResult && filteredResults.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400">
            {t('compliance.noResultsForFilter', 'No results matching the selected filter.')}
          </p>
        </div>
      )}

      {/* Initial empty state */}
      {!checkResult && !loading && !error && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg
            className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('compliance.readyToCheck', 'Ready to check compliance')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            {t(
              'compliance.readyDescription',
              'Run a compliance check to verify your kitchen design against French building codes including electrical standards, safety distances, ventilation, and accessibility requirements.',
            )}
          </p>
          <button
            onClick={runCheck}
            disabled={loading}
            className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
          >
            {t('compliance.runCheck', 'Run Compliance Check')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('compliance.checking', 'Running compliance checks...')}
          </p>
        </div>
      )}
    </div>
  );
}
