import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'auth' | 'user' | 'project' | 'kitchen' | 'admin' | 'system' | 'api';
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  userName?: string;
  userEmail?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  success: boolean;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: PaginationInfo;
}

const AuditLogs: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') ?? '');
  const [severityFilter, setSeverityFilter] = useState<string>(searchParams.get('severity') ?? '');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: searchParams.get('startDate') ?? '',
    end: searchParams.get('endDate') ?? '',
  });
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') ?? '');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const categoryLabels: Record<string, string> = {
    auth: t('admin.audit.cat.auth', 'Authentification'),
    user: t('admin.audit.cat.user', 'Gestion des utilisateurs'),
    project: t('admin.audit.cat.project', 'Projets'),
    kitchen: t('admin.audit.cat.kitchen', 'Configurations cuisine'),
    admin: t('admin.audit.cat.admin', 'Administration'),
    system: t('admin.audit.cat.system', 'Systeme'),
    api: t('admin.audit.cat.api', 'Acces API'),
  };

  const severityLabels: Record<string, string> = {
    info: t('admin.audit.sev.info', 'Info'),
    warning: t('admin.audit.sev.warning', 'Avertissement'),
    error: t('admin.audit.sev.error', 'Erreur'),
    critical: t('admin.audit.sev.critical', 'Critique'),
  };

  const categories = [
    { value: 'auth', label: categoryLabels.auth, icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
    { value: 'user', label: categoryLabels.user, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { value: 'project', label: categoryLabels.project, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { value: 'kitchen', label: categoryLabels.kitchen, icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { value: 'admin', label: categoryLabels.admin, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { value: 'system', label: categoryLabels.system, icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
    { value: 'api', label: categoryLabels.api, icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  const severities = [
    { value: 'info', label: severityLabels.info, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    { value: 'warning', label: severityLabels.warning, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    { value: 'error', label: severityLabels.error, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    { value: 'critical', label: severityLabels.critical, color: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200' },
  ];

  useEffect(() => {
    const controller = new AbortController();

    const fetchLogs = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pagination.itemsPerPage.toString(),
        });

        if (categoryFilter) {params.append('category', categoryFilter);}
        if (severityFilter) {params.append('severity', severityFilter);}
        if (dateRange.start) {params.append('startDate', dateRange.start);}
        if (dateRange.end) {params.append('endDate', dateRange.end);}
        if (searchQuery) {params.append('search', searchQuery);}

        const response = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`, { credentials: 'include', signal: controller.signal });

        if (!response.ok) {
          throw new Error(t('admin.audit.errors.fetchLogs', 'Failed to fetch audit logs'));
        }

        const data = (await response.json()) as AuditLogsResponse;
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {return;}
        const errorMessage = err instanceof Error ? err.message : t('admin.audit.errors.unexpected', 'An unexpected error occurred');
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchLogs();
    return () => controller.abort();
  }, [currentPage, categoryFilter, severityFilter, dateRange.start, dateRange.end, searchQuery, pagination.itemsPerPage]);

  const validateDateRange = (start: string, end: string): void => {
    if (start && end && start > end) {
      setDateRangeError(t('admin.audit.dateRangeError', 'La date de debut doit etre anterieure a la date de fin'));
    } else {
      setDateRangeError(null);
    }
  };

  const handleFilterChange = (): void => {
    const params: Record<string, string> = { page: '1' };
    if (categoryFilter) {params.category = categoryFilter;}
    if (severityFilter) {params.severity = severityFilter;}
    if (dateRange.start) {params.startDate = dateRange.start;}
    if (dateRange.end) {params.endDate = dateRange.end;}
    if (searchQuery) {params.search = searchQuery;}
    setSearchParams(params);
  };

  const handlePageChange = (page: number): void => {
    const params: Record<string, string> = { page: page.toString() };
    if (categoryFilter) {params.category = categoryFilter;}
    if (severityFilter) {params.severity = severityFilter;}
    if (dateRange.start) {params.startDate = dateRange.start;}
    if (dateRange.end) {params.endDate = dateRange.end;}
    if (searchQuery) {params.search = searchQuery;}
    setSearchParams(params);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportLogs = async (): Promise<void> => {
    if (isExporting) {return;}
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      if (categoryFilter) {params.append('category', categoryFilter);}
      if (severityFilter) {params.append('severity', severityFilter);}
      if (dateRange.start) {params.append('startDate', dateRange.start);}
      if (dateRange.end) {params.append('endDate', dateRange.end);}
      if (searchQuery) {params.append('search', searchQuery);}

      const response = await fetch(`/api/v1/admin/audit-logs/export?${params.toString()}`, { credentials: 'include' });

      if (!mountedRef.current) {return;}

      if (!response.ok) {
        throw new Error(t('admin.audit.errors.exportLogs', 'Failed to export logs'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      // Delay revocation to ensure download starts
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.audit.errors.exportFailed', 'Export failed');
      setError(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSeverityColor = (severity: AuditLog['severity']): string => {
    const severityObj = severities.find((s) => s.value === severity);
    return severityObj?.color ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getCategoryIcon = (category: AuditLog['category']): string => {
    const categoryObj = categories.find((c) => c.value === category);
    return categoryObj?.icon ?? 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.auditLogs', 'Audit Logs')}</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">{t('admin.auditLogsDesc', 'View and analyze system activity logs')}</p>
          </div>
          <button
            onClick={handleExportLogs}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {t('common.export', 'Export')}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex justify-between items-center">
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} aria-label={t('common.dismissError', 'Dismiss error')} className="text-red-800 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 p-4 mb-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder={t('admin.audit.searchPlaceholder', 'Rechercher dans les logs...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('admin.audit.searchLabel', 'Search audit logs')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('admin.audit.allCategories', 'Toutes les categories')}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('admin.audit.allSeverities', 'Toutes les severites')}</option>
              {severities.map((sev) => (
                <option key={sev.value} value={sev.value}>{sev.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => {
                const newStart = e.target.value;
                setDateRange((prev) => ({ ...prev, start: newStart }));
                validateDateRange(newStart, dateRange.end);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('admin.audit.startDate', 'Start Date')}
              aria-label={t('admin.audit.startDate', 'Start Date')}
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => {
                const newEnd = e.target.value;
                setDateRange((prev) => ({ ...prev, end: newEnd }));
                validateDateRange(dateRange.start, newEnd);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('admin.audit.endDate', 'End Date')}
              aria-label={t('admin.audit.endDate', 'End Date')}
            />
          </div>
          {dateRangeError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{dateRangeError}</p>
          )}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleFilterChange}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('admin.audit.applyFilters', 'Appliquer les filtres')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {severities.map((severity) => {
            const count = logs.filter((l) => l.severity === severity.value).length;
            return (
              <div key={severity.value} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{severity.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.audit.timestamp', 'Date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.audit.category', 'Categorie')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.audit.action', 'Action')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.audit.user', 'Utilisateur')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.audit.severity', 'Severite')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.audit.status', 'Statut')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.audit.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getCategoryIcon(log.category)} />
                        </svg>
                        <span className="text-sm text-gray-900 dark:text-gray-200">{categoryLabels[log.category] ?? log.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.userName ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{log.userName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">{t('admin.audit.cat.system', 'Systeme')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                        {severityLabels[log.severity] ?? log.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.success ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {t('admin.audit.success', 'Succes')}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {t('admin.audit.failed', 'Echoue')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        {t('admin.audit.viewDetails', 'Voir le detail')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-400">{t('admin.audit.noResults', 'Aucun log ne correspond a vos criteres')}</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.audit.showingRange', {
                    start: (currentPage - 1) * pagination.itemsPerPage + 1,
                    end: Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems),
                    total: pagination.totalItems,
                    defaultValue: 'Affichage de {{start}} a {{end}} sur {{total}} logs',
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label={t('common.previous', 'Precedent')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.previous', 'Precedent')}
                  </button>
                  <span className="px-4 py-2 text-gray-700 dark:text-gray-300" aria-current="page">
                    {t('common.pageOf', { current: currentPage, total: pagination.totalPages, defaultValue: 'Page {{current}} sur {{total}}' })}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    aria-label={t('common.next', 'Suivant')}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.next', 'Suivant')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onKeyDown={(e) => { if (e.key === 'Escape') {setSelectedLog(null);} }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="auditDetailTitle" ref={(el) => { if (el) { const btn = el.querySelector<HTMLElement>('button'); btn?.focus(); } }}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
              <div>
                <h2 id="auditDetailTitle" className="text-xl font-semibold text-gray-900 dark:text-white">{t('admin.audit.detailTitle', 'Detail du log')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin.audit.timestamp', 'Date')}</label>
                  <p className="text-gray-900 dark:text-gray-200">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin.audit.category', 'Categorie')}</label>
                  <p className="text-gray-900 dark:text-gray-200">{categoryLabels[selectedLog.category] ?? selectedLog.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin.audit.action', 'Action')}</label>
                  <p className="text-gray-900 dark:text-gray-200">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin.audit.severity', 'Severite')}</label>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedLog.severity)}`}>
                    {severityLabels[selectedLog.severity] ?? selectedLog.severity}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{t('admin.audit.status', 'Statut')}</label>
                  <p className={selectedLog.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {selectedLog.success ? t('admin.audit.success', 'Succes') : t('admin.audit.failed', 'Echoue')}
                  </p>
                </div>
              </div>

              {/* User Info */}
              {selectedLog.userId && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('admin.audit.userInfo', 'Informations utilisateur')}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">{t('admin.audit.name', 'Nom')}</label>
                      <p className="text-gray-900 dark:text-gray-200">{selectedLog.userName || t('common.na', 'N/D')}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">{t('admin.audit.email', 'Email')}</label>
                      <p className="text-gray-900 dark:text-gray-200">{selectedLog.userEmail || t('common.na', 'N/D')}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">{t('admin.audit.userId', 'ID utilisateur')}</label>
                      <p className="text-gray-900 dark:text-gray-200 font-mono text-sm">{selectedLog.userId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource Info */}
              {selectedLog.resourceType && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('admin.audit.resourceInfo', 'Informations ressource')}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">{t('admin.audit.resourceType', 'Type de ressource')}</label>
                      <p className="text-gray-900 dark:text-gray-200">{selectedLog.resourceType}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400">{t('admin.audit.resourceId', 'ID de ressource')}</label>
                      <p className="text-gray-900 dark:text-gray-200 font-mono text-sm">{selectedLog.resourceId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Info */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('admin.audit.requestInfo', 'Informations requete')}</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400">{t('admin.audit.ipAddress', 'Adresse IP')}</label>
                    <p className="text-gray-900 dark:text-gray-200 font-mono text-sm">{selectedLog.ipAddress || t('common.na', 'N/D')}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400">{t('admin.audit.userAgent', 'Agent utilisateur')}</label>
                    <p className="text-gray-900 dark:text-gray-200 text-sm break-all">{selectedLog.userAgent || t('common.na', 'N/D')}</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t('admin.audit.additionalDetails', 'Details supplementaires')}</h3>
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.close', 'Fermer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
