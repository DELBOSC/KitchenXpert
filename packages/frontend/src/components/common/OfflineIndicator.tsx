/**
 * OfflineIndicator (Enhanced for F14: Full Offline Mode)
 *
 * Fixed banner showing offline/reconnected status with:
 * - Current online/offline status
 * - Yellow banner when offline with pending changes count
 * - "Synchroniser maintenant" button when back online
 * - Auto-sync when connection restored
 * - Toast notifications for sync success/failure
 * - i18n support, dark mode
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getOfflineStorage } from '../../utils/offline-storage';

import type { SyncResult } from '../../utils/offline-storage';

export default function OfflineIndicator(): React.ReactElement | null {
  const { isOnline, wasOffline, resetWasOffline } = useOnlineStatus();
  const { t } = useTranslation();
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [showSyncResult, setShowSyncResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Poll pending changes count ───
  const refreshPendingCount = useCallback(async () => {
    try {
      const storage = getOfflineStorage();
      await storage.init();
      const count = await storage.getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available, silently ignore
    }
  }, []);

  useEffect(() => {
    void refreshPendingCount();

    // Poll every 5 seconds for pending changes
    pendingPollRef.current = setInterval(() => {
      void refreshPendingCount();
    }, 5000);

    return () => {
      if (pendingPollRef.current) {
        clearInterval(pendingPollRef.current);
        pendingPollRef.current = null;
      }
    };
  }, [refreshPendingCount]);

  // ─── Auto-sync when coming back online ───
  const performSync = useCallback(async () => {
    if (syncing) {
      return;
    }
    setSyncing(true);
    setSyncResult(null);

    try {
      const storage = getOfflineStorage();
      await storage.init();
      const result = await storage.syncChanges();
      setSyncResult(result);

      // Clear synced changes
      if (result.synced > 0) {
        await storage.clearSynced();
      }

      // Refresh count
      await refreshPendingCount();

      // Show result briefly
      setShowSyncResult(true);
      syncResultTimerRef.current = setTimeout(() => {
        setShowSyncResult(false);
        setSyncResult(null);
      }, 5000);
    } catch (err) {
      setSyncResult({
        synced: 0,
        failed: 1,
        errors: [err instanceof Error ? err.message : 'Sync failed'],
      });
      setShowSyncResult(true);
      syncResultTimerRef.current = setTimeout(() => {
        setShowSyncResult(false);
        setSyncResult(null);
      }, 5000);
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshPendingCount]);

  // ─── Reconnection handling ───
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);

      // Auto-sync when reconnected
      if (pendingCount > 0) {
        void performSync();
      }

      timerRef.current = setTimeout(() => {
        setShowReconnected(false);
        resetWasOffline();
      }, 5000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOnline, wasOffline, resetWasOffline, pendingCount, performSync]);

  // Cleanup sync result timer
  useEffect(() => {
    return () => {
      if (syncResultTimerRef.current) {
        clearTimeout(syncResultTimerRef.current);
        syncResultTimerRef.current = null;
      }
    };
  }, []);

  const showOffline = !isOnline;
  const showRestored = isOnline && showReconnected;
  const isVisible = showOffline || showRestored || showSyncResult;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {/* Offline banner */}
      {showOffline && (
        <div className="bg-amber-500 dark:bg-amber-600 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01"
                />
              </svg>
              {t(
                'common.offlineMessage',
                'Mode hors-ligne -- Les modifications seront synchronisees'
              )}
            </span>

            {/* Pending changes badge */}
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-700/50 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {pendingCount} {t('common.pendingChanges', 'en attente')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reconnected banner with sync option */}
      {showRestored && !showOffline && (
        <div className="bg-green-500 dark:bg-green-600 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {t('common.connectionRestored', 'Connexion retablie')}
            </span>

            {/* Sync now button */}
            {pendingCount > 0 && (
              <button
                onClick={performSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {t('common.syncing', 'Synchronisation...')}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    {t('common.syncNow', 'Synchroniser maintenant')} ({pendingCount})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sync result notification */}
      {showSyncResult && syncResult && !showOffline && !showRestored && (
        <div
          className={`px-4 py-2.5 shadow-md ${
            syncResult.failed > 0
              ? 'bg-red-500 dark:bg-red-600 text-white'
              : 'bg-green-500 dark:bg-green-600 text-white'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              {syncResult.failed > 0 ? (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  {t('common.syncPartial', 'Synchronisation partielle')}: {syncResult.synced}{' '}
                  {t('common.synced', 'synchronise(s)')}, {syncResult.failed}{' '}
                  {t('common.failed', 'echoue(s)')}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('common.syncSuccess', 'Synchronisation reussie')}: {syncResult.synced}{' '}
                  {t('common.changesSynced', 'modification(s) synchronisee(s)')}
                </>
              )}
            </span>
            <button
              onClick={() => setShowSyncResult(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label={t('common.dismiss', 'Dismiss')}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
