import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api/api';
import { API_ENDPOINTS } from '../../services/api/endpoints';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface DesignVersionSummary {
  id: string;
  version: number;
  label: string | null;
  thumbnail: string | null;
  createdAt: string;
}

interface DesignItem {
  id: string;
  type: string;
  name: string;
  position?: { x: number; y: number; z: number };
  material?: string;
  size?: { width: number; height: number; depth: number };
  [key: string]: unknown;
}

interface DesignVersionDetail {
  id: string;
  version: number;
  label: string | null;
  items: DesignItem[];
}

type DiffType = 'added' | 'removed' | 'modified';

interface DiffEntry {
  type: DiffType;
  itemType: string;
  itemName: string;
  changes?: string[]; // human-readable change descriptions for modified items
}

interface DiffResult {
  entries: DiffEntry[];
  added: number;
  removed: number;
  modified: number;
}

interface VersionHistoryPanelProps {
  kitchenId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

// ----------------------------------------------------------------
// Diff computation
// ----------------------------------------------------------------
function computeDiff(oldItems: DesignItem[], currentItems: DesignItem[]): DiffResult {
  const entries: DiffEntry[] = [];
  const oldMap = new Map(oldItems.map((item) => [item.id, item]));
  const currentMap = new Map(currentItems.map((item) => [item.id, item]));

  // Added items: in current but not in old
  for (const [id, item] of currentMap) {
    if (!oldMap.has(id)) {
      entries.push({ type: 'added', itemType: item.type, itemName: item.name });
    }
  }

  // Removed items: in old but not in current
  for (const [id, item] of oldMap) {
    if (!currentMap.has(id)) {
      entries.push({ type: 'removed', itemType: item.type, itemName: item.name });
    }
  }

  // Modified items: in both but with differences
  for (const [id, oldItem] of oldMap) {
    const currentItem = currentMap.get(id);
    if (!currentItem) continue;

    const changes: string[] = [];

    // Check position change
    if (oldItem.position && currentItem.position) {
      const op = oldItem.position;
      const cp = currentItem.position;
      if (op.x !== cp.x || op.y !== cp.y || op.z !== cp.z) {
        changes.push(`position: (${op.x.toFixed(2)}, ${op.y.toFixed(2)}, ${op.z.toFixed(2)}) -> (${cp.x.toFixed(2)}, ${cp.y.toFixed(2)}, ${cp.z.toFixed(2)})`);
      }
    }

    // Check material change
    if (oldItem.material !== currentItem.material) {
      changes.push(`material: ${oldItem.material || '?'} -> ${currentItem.material || '?'}`);
    }

    // Check size change
    if (oldItem.size && currentItem.size) {
      const os = oldItem.size;
      const cs = currentItem.size;
      if (os.width !== cs.width || os.height !== cs.height || os.depth !== cs.depth) {
        changes.push(`size: ${os.width}x${os.height}x${os.depth} -> ${cs.width}x${cs.height}x${cs.depth}`);
      }
    }

    if (changes.length > 0) {
      entries.push({ type: 'modified', itemType: currentItem.type, itemName: currentItem.name, changes });
    }
  }

  return {
    entries,
    added: entries.filter((e) => e.type === 'added').length,
    removed: entries.filter((e) => e.type === 'removed').length,
    modified: entries.filter((e) => e.type === 'modified').length,
  };
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
export default function VersionHistoryPanel({
  kitchenId,
  isOpen,
  onClose,
  onRestore,
}: VersionHistoryPanelProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [versions, setVersions] = useState<DesignVersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Save current version state
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // Restore confirmation modal
  const [restoreTarget, setRestoreTarget] = useState<DesignVersionSummary | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Compare / diff state
  const [compareTarget, setCompareTarget] = useState<DesignVersionSummary | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [diffExpanded, setDiffExpanded] = useState(true);

  const panelRef = useRef<HTMLDivElement>(null);

  // ---- Fetch versions ----
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    const fetchVersions = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get<DesignVersionSummary[]>(
          API_ENDPOINTS.DESIGN_VERSIONS.BASE(kitchenId),
          { signal: controller.signal },
        );

        if (res.success && res.data) {
          setVersions(Array.isArray(res.data) ? res.data : []);
        } else {
          setError(res.error?.message || t('designer.versions.loadError', 'Impossible de charger les versions'));
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(t('designer.versions.loadError', 'Impossible de charger les versions'));
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
    return () => controller.abort();
  }, [isOpen, kitchenId, retryCount, t]);

  // ---- Close on Escape ----
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (restoreTarget) {
          setRestoreTarget(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, restoreTarget]);

  // ---- Focus trap for restore modal ----
  useEffect(() => {
    if (!restoreTarget) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('[data-restore-modal]');
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Focus the cancel button when modal opens
    requestAnimationFrame(() => {
      const modal = document.querySelector('[data-restore-modal]');
      if (modal) {
        const cancelBtn = modal.querySelector<HTMLElement>('button:not([disabled])');
        cancelBtn?.focus();
      }
    });

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [restoreTarget]);

  // ---- Save current version ----
  const handleSaveVersion = useCallback(async () => {
    setSaving(true);
    try {
      const res = await api.post('/design-versions', {
        kitchenId,
        label: saveLabel.trim() || undefined,
      });
      if (res.success) {
        setSaveLabel('');
        setShowSaveInput(false);
        setRetryCount((c) => c + 1); // refresh list
      }
    } finally {
      setSaving(false);
    }
  }, [kitchenId, saveLabel]);

  // ---- Restore version ----
  const handleConfirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const res = await api.post(
        API_ENDPOINTS.DESIGN_VERSIONS.RESTORE(kitchenId, restoreTarget.version),
      );
      if (res.success) {
        setRestoreTarget(null);
        onRestore();
      }
    } finally {
      setRestoring(false);
    }
  }, [kitchenId, restoreTarget, onRestore]);

  // ---- Compare with current ----
  const handleCompare = useCallback(async (version: DesignVersionSummary) => {
    setCompareTarget(version);
    setComparing(true);
    setDiffResult(null);
    setDiffExpanded(true);

    const controller = new AbortController();

    try {
      // Fetch the old version data and current version data in parallel
      const [oldRes, currentRes] = await Promise.all([
        api.get<DesignVersionDetail>(
          API_ENDPOINTS.DESIGN_VERSIONS.VERSION(kitchenId, version.version),
          { signal: controller.signal },
        ),
        api.get<DesignVersionDetail>(
          API_ENDPOINTS.DESIGN_VERSIONS.VERSION(kitchenId, versions[0]?.version ?? 0),
          { signal: controller.signal },
        ),
      ]);

      if (oldRes.success && oldRes.data && currentRes.success && currentRes.data) {
        const oldItems = Array.isArray(oldRes.data.items) ? oldRes.data.items : [];
        const currentItems = Array.isArray(currentRes.data.items) ? currentRes.data.items : [];
        setDiffResult(computeDiff(oldItems, currentItems));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Silently fail — user can dismiss
    } finally {
      setComparing(false);
    }
  }, [kitchenId, versions]);

  // ---- Close compare panel ----
  const handleCloseCompare = useCallback(() => {
    setCompareTarget(null);
    setDiffResult(null);
    setComparing(false);
  }, []);

  // ---- Format date ----
  const formatDate = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
        role="presentation"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('designer.versions.title', 'Historique des versions')}
        className="fixed right-0 top-0 bottom-0 w-80 z-40 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('designer.versions.title', 'Historique des versions')}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label={t('common.close', 'Fermer')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Save current version */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {showSaveInput ? (
            <div className="space-y-2">
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder={t('designer.versions.labelPlaceholder', 'Nom de version (optionnel)')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveVersion();
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveVersion}
                  disabled={saving}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? t('designer.versions.saving', 'Sauvegarde...') : t('designer.versions.save', 'Sauvegarder')}
                </button>
                <button
                  onClick={() => {
                    setShowSaveInput(false);
                    setSaveLabel('');
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('common.cancel', 'Annuler')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('designer.versions.saveCurrent', 'Sauvegarder la version actuelle')}
            </button>
          )}
        </div>

        {/* Version list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label={t('designer.versions.loading', 'Chargement...')} />
            </div>
          )}

          {error && !loading && (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('common.retry', 'Reessayer')}
              </button>
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('designer.versions.empty', 'Aucune version enregistree. Sauvegardez l\'etat actuel pour creer votre premiere version.')}
              </p>
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
            <div className="p-4">
              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                {versions.map((version, idx) => (
                  <div key={version.id} className="relative pl-10 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                        idx === 0
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    />

                    {/* Version card */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            v{version.version}
                          </span>
                          {version.label && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {version.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {formatDate(version.createdAt)}
                      </div>

                      {/* Thumbnail placeholder */}
                      {version.thumbnail ? (
                        <div className="w-full h-20 rounded overflow-hidden mb-2">
                          <img
                            src={version.thumbnail}
                            alt={`Version ${version.version}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center mb-2">
                          <svg
                            className="w-6 h-6 text-gray-400 dark:text-gray-500"
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
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setRestoreTarget(version)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          {t('designer.versions.restore', 'Restaurer cette version')}
                        </button>
                        {idx > 0 && (
                          <button
                            onClick={() => handleCompare(version)}
                            disabled={comparing && compareTarget?.id === version.id}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-600 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                          >
                            {comparing && compareTarget?.id === version.id
                              ? t('versions.comparing', 'Comparing...')
                              : t('versions.compare', 'Compare')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Compare / Diff Panel ── */}
        {compareTarget && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            {/* Diff header — collapsible */}
            <button
              onClick={() => setDiffExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-left"
              aria-expanded={diffExpanded}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                  {t('versions.diffTitle', { version: compareTarget.version, defaultValue: 'Diff vs v{{version}}' })}
                </span>
                {diffResult && (
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    {t('versions.diffSummary', {
                      added: diffResult.added,
                      removed: diffResult.removed,
                      modified: diffResult.modified,
                      defaultValue: '{{added}} added, {{removed}} removed, {{modified}} modified',
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseCompare();
                  }}
                  className="p-0.5 text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
                  aria-label={t('common.close', 'Fermer')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <svg
                  className={`w-4 h-4 text-purple-500 transition-transform ${diffExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {diffExpanded && (
              <div className="max-h-64 overflow-y-auto px-4 py-3">
                {comparing && (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" role="status" aria-label={t('versions.comparing', 'Comparing...')} />
                  </div>
                )}

                {!comparing && diffResult && diffResult.entries.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    {t('versions.noChanges', 'No changes')}
                  </p>
                )}

                {!comparing && diffResult && diffResult.entries.length > 0 && (
                  <div className="space-y-2">
                    {diffResult.entries.map((entry, i) => {
                      let bgColor: string;
                      let borderColor: string;
                      let textColor: string;
                      let labelKey: string;
                      let labelDefault: string;

                      switch (entry.type) {
                        case 'added':
                          bgColor = 'bg-green-50 dark:bg-green-900/20';
                          borderColor = 'border-green-200 dark:border-green-800';
                          textColor = 'text-green-700 dark:text-green-300';
                          labelKey = 'versions.added';
                          labelDefault = 'Added';
                          break;
                        case 'removed':
                          bgColor = 'bg-red-50 dark:bg-red-900/20';
                          borderColor = 'border-red-200 dark:border-red-800';
                          textColor = 'text-red-700 dark:text-red-300';
                          labelKey = 'versions.removed';
                          labelDefault = 'Removed';
                          break;
                        case 'modified':
                          bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
                          borderColor = 'border-yellow-200 dark:border-yellow-800';
                          textColor = 'text-yellow-700 dark:text-yellow-300';
                          labelKey = 'versions.modified';
                          labelDefault = 'Modified';
                          break;
                      }

                      return (
                        <div
                          key={`${entry.type}-${entry.itemName}-${i}`}
                          className={`${bgColor} ${borderColor} border rounded-md px-3 py-2`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase ${textColor}`}>
                              {t(labelKey, labelDefault)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.itemType}
                            </span>
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {entry.itemName}
                            </span>
                          </div>
                          {entry.changes && entry.changes.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {entry.changes.map((change, j) => (
                                <p key={j} className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
                                  {change}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Restore Confirmation Modal ── */}
      {restoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setRestoreTarget(null)}
            role="presentation"
          />

          {/* Modal content */}
          <div data-restore-modal className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('designer.versions.restoreConfirmTitle', { version: restoreTarget.version, defaultValue: 'Restaurer la version {{version}} ?' })}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('designer.versions.restoreConfirmMessage', {
                version: restoreTarget.version,
                label: restoreTarget.label || '',
                defaultValue: 'Cela remplacera tous les elements et la configuration actuels par les donnees de la version {{version}}{{label}}.',
              })}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-6">
              {t('designer.versions.restoreWarning', 'Cette action est irreversible. Pensez a sauvegarder l\'etat actuel.')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setRestoreTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {restoring ? t('designer.versions.restoring', 'Restauration...') : t('designer.versions.restoreAction', 'Restaurer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
