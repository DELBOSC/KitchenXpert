import React from 'react';
import { useTranslation } from 'react-i18next';

interface PlanView2DOverlayProps {
  onExit: () => void;
  snapEnabled?: boolean;
  onToggleSnap?: () => void;
  zoomLevel?: number;
}

export default function PlanView2DOverlay({
  onExit,
  snapEnabled,
  onToggleSnap,
  zoomLevel,
}: PlanView2DOverlayProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
        <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('designer.planView.title', 'Vue 2D - Plan architectural')}
        </span>

        {/* Grid toggle */}
        {onToggleSnap && (
          <button
            onClick={onToggleSnap}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              snapEnabled
                ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
                : 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
            }`}
            title={t('designer.planView.toggleGrid', 'Afficher / masquer la grille')}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4v4H4zM16 4h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4zM10 10h4v4h-4z" />
              </svg>
              {t('designer.planView.grid', 'Grille')}
            </span>
          </button>
        )}

        {/* Zoom level indicator */}
        {zoomLevel != null && (
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
            {Math.round(zoomLevel * 100)}%
          </span>
        )}

        {/* Close / Exit button */}
        <button
          onClick={onExit}
          className="ml-2 px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          {t('designer.planView.exit', 'Retour 3D')}
          <kbd className="px-1 py-0.5 bg-blue-500/50 rounded text-[10px] font-mono">ESC</kbd>
        </button>
      </div>

      {/* Bottom control hints */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white rounded-lg px-5 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">Scroll</kbd>
            {t('designer.planView.hintZoom', 'Zoom')}
          </span>
          <span className="w-px h-4 bg-white/30" />
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">{t('designer.planView.hintClickKey', 'Clic')}</kbd>
            {t('designer.planView.hintSelection', 'Selection')}
          </span>
          <span className="w-px h-4 bg-white/30" />
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">Echap</kbd>
            {t('designer.planView.hintExit', 'Quitter')}
          </span>
        </div>
      </div>
    </>
  );
}
