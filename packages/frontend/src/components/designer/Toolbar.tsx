import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseKitchenEngineReturn } from '../../hooks/useKitchenEngine';
import type { TransformMode } from '@kitchenxpert/3d-engine';

type ViewPreset = 'perspective' | 'top' | 'front' | 'isometric';
type ElevationWall = 'back' | 'left' | 'right' | 'front';
type LightingPresetName = 'day' | 'evening' | 'showroom' | 'natural';

interface ToolbarProps extends UseKitchenEngineReturn {
  onTogglePlanView?: () => void;
  onToggleElevation?: (wall: ElevationWall) => void;
  onToggleWalkthrough?: () => void;
  onToggleMeasure?: () => void;
  onClearMeasurements?: () => void;
  onSetLightingPreset?: (preset: LightingPresetName) => void;
  onToggleTechnicalPanel?: () => void;
  showTechnicalPanel?: boolean;
  onToggleLightingPanel?: () => void;
  showLightingPanel?: boolean;
  onToggleChatPanel?: () => void;
  showChatPanel?: boolean;
  onShowShortcuts?: () => void;
  onShowShoppingList?: () => void;
}

interface ToolButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
}

function ToolButton({ active, disabled, onClick, tooltip, children }: ToolButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={active}
      className={`
        relative p-2 rounded-lg transition-all duration-150 text-sm
        ${active
          ? 'bg-blue-600 text-white shadow-md'
          : disabled
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
            : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
        }
        border border-gray-200 dark:border-gray-600
      `}
    >
      {children}
    </button>
  );
}

function Divider(): React.ReactElement {
  return <div className="w-px h-8 bg-gray-200 dark:bg-gray-600 mx-1" role="separator" aria-orientation="vertical" />;
}

export default function Toolbar({
  setTransformMode,
  transformMode,
  undo,
  redo,
  canUndo,
  canRedo,
  setViewPreset,
  toggleSnap,
  snapEnabled,
  toggleDimensions,
  dimensionsVisible,
  removeSelected,
  selectedObject,
  onTogglePlanView,
  isPlanView,
  onToggleElevation,
  isElevation,
  onToggleWalkthrough,
  isWalkthrough,
  onToggleMeasure,
  isMeasuring,
  onClearMeasurements,
  onSetLightingPreset,
  currentLightingPreset,
  onToggleTechnicalPanel,
  showTechnicalPanel,
  onToggleLightingPanel,
  showLightingPanel,
  onToggleChatPanel,
  showChatPanel,
  onShowShortcuts,
  onShowShoppingList,
}: ToolbarProps): React.ReactElement {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close delete confirmation on Escape key
  useEffect(() => {
    if (!showDeleteConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm]);

  const transformTools: { mode: TransformMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
    {
      mode: 'translate',
      label: t('designer.toolbar.move', 'Move'),
      shortcut: 'W',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
        </svg>
      ),
    },
    {
      mode: 'rotate',
      label: t('designer.toolbar.rotate', 'Rotate'),
      shortcut: 'E',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      mode: 'scale',
      label: t('designer.toolbar.scale', 'Scale'),
      shortcut: 'R',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      ),
    },
  ];

  const viewPresets: { preset: ViewPreset; label: string; icon: React.ReactNode }[] = [
    {
      preset: 'perspective',
      label: t('designer.toolbar.perspective', 'Perspective'),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        </svg>
      ),
    },
    {
      preset: 'top',
      label: t('designer.toolbar.topView', 'Top'),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      preset: 'front',
      label: t('designer.toolbar.frontView', 'Front'),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      ),
    },
    {
      preset: 'isometric',
      label: t('designer.toolbar.isometric', 'Isometric'),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 5v10l-9 5-9-5V7l9-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V12M12 12L3 7M12 12l9-5" />
        </svg>
      ),
    },
  ];

  return (
    <div role="toolbar" aria-label={t('designer.toolbar.ariaLabel', 'Designer tools')} className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Transform tools */}
      <div className="flex items-center gap-1">
        {transformTools.map((tool) => (
          <ToolButton
            key={tool.mode}
            active={transformMode === tool.mode}
            onClick={() => setTransformMode(tool.mode)}
            tooltip={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </ToolButton>
        ))}
      </div>

      <Divider />

      {/* Delete */}
      <ToolButton
        disabled={!selectedObject}
        onClick={() => setShowDeleteConfirm(true)}
        tooltip={t('designer.toolbar.delete', 'Delete (Del)')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </ToolButton>

      <Divider />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <ToolButton
          disabled={!canUndo}
          onClick={undo}
          tooltip={canUndo
            ? `${t('designer.toolbar.undo', 'Annuler')} (Ctrl+Z)`
            : t('designer.toolbar.nothingToUndo', 'Rien a annuler')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 14l-4-4 4-4" />
          </svg>
        </ToolButton>
        <ToolButton
          disabled={!canRedo}
          onClick={redo}
          tooltip={canRedo
            ? `${t('designer.toolbar.redo', 'Retablir')} (Ctrl+Y)`
            : t('designer.toolbar.nothingToRedo', 'Rien a retablir')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l4-4-4-4" />
          </svg>
        </ToolButton>
      </div>

      <Divider />

      {/* View presets */}
      <div className="flex items-center gap-1">
        {viewPresets.map((view) => (
          <ToolButton
            key={view.preset}
            onClick={() => setViewPreset(view.preset)}
            tooltip={view.label}
          >
            {view.icon}
          </ToolButton>
        ))}
      </div>

      <Divider />

      {/* Snap toggle */}
      <ToolButton
        active={snapEnabled}
        onClick={() => toggleSnap(!snapEnabled)}
        tooltip={t('designer.toolbar.snap', 'Snap to grid')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4v4H4zM16 4h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4zM10 10h4v4h-4z" />
        </svg>
      </ToolButton>

      {/* Dimensions toggle */}
      <ToolButton
        active={dimensionsVisible}
        onClick={() => toggleDimensions(!dimensionsVisible)}
        tooltip={t('designer.toolbar.dimensions', 'Show dimensions')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 6H3M21 6v2M3 6v2M21 18H3M21 18v-2M3 18v-2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12" />
          <text x="12" y="14" textAnchor="middle" fill="currentColor" fontSize="6" fontWeight="bold" stroke="none">cm</text>
        </svg>
      </ToolButton>

      <Divider />

      {/* 2D Plan View */}
      <ToolButton
        active={isPlanView}
        onClick={() => onTogglePlanView?.()}
        tooltip={t('designer.toolbar.planView', 'Vue 2D (Plan)')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
      </ToolButton>

      {/* Elevation View */}
      <ToolButton
        active={isElevation}
        onClick={() => onToggleElevation?.('back')}
        tooltip={t('designer.toolbar.elevation', 'Vue elevation')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <rect x="6" y="11" width="4" height="8" />
          <rect x="14" y="8" width="4" height="11" />
        </svg>
      </ToolButton>

      {/* Walkthrough */}
      <ToolButton
        active={isWalkthrough}
        onClick={() => onToggleWalkthrough?.()}
        tooltip={t('designer.toolbar.walkthrough', 'Mode visite')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </ToolButton>

      <Divider />

      {/* Measurement */}
      <ToolButton
        active={isMeasuring}
        onClick={() => onToggleMeasure?.()}
        tooltip={t('designer.toolbar.measure', 'Outil de mesure')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l18-18M9 3v4M3 9h4M15 21v-4M21 15h-4" />
        </svg>
      </ToolButton>

      {isMeasuring && (
        <ToolButton
          onClick={() => onClearMeasurements?.()}
          tooltip={t('designer.toolbar.clearMeasures', 'Effacer mesures')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </ToolButton>
      )}

      <Divider />

      {/* Lighting presets */}
      <div className="flex items-center gap-1">
        {(['day', 'evening', 'showroom', 'natural'] as LightingPresetName[]).map((preset) => {
          const labels: Record<LightingPresetName, string> = {
            day: t('designer.toolbar.lighting.day', 'Lumiere du jour'),
            evening: t('designer.toolbar.lighting.evening', 'Ambiance soir'),
            showroom: t('designer.toolbar.lighting.showroom', 'Eclairage showroom'),
            natural: t('designer.toolbar.lighting.natural', 'Lumiere naturelle'),
          };
          const icons: Record<LightingPresetName, React.ReactNode> = {
            day: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>,
            evening: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>,
            showroom: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
            natural: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 15h18M12 3a9 9 0 019 9" /><circle cx="12" cy="12" r="5" /></svg>,
          };

          return (
            <ToolButton
              key={preset}
              active={currentLightingPreset === preset}
              onClick={() => onSetLightingPreset?.(preset)}
              tooltip={t(`designer.toolbar.lighting.${preset}`, labels[preset])}
            >
              {icons[preset]}
            </ToolButton>
          );
        })}
      </div>

      <Divider />

      {/* Technical constraints toggle */}
      <ToolButton
        active={showTechnicalPanel}
        onClick={() => onToggleTechnicalPanel?.()}
        tooltip={t('designer.toolbar.technical', 'Points techniques')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </ToolButton>

      {/* Realistic lighting toggle */}
      <ToolButton
        active={showLightingPanel}
        onClick={() => onToggleLightingPanel?.()}
        tooltip={t('designer.toolbar.realisticLighting', 'Eclairage realiste')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </ToolButton>

      <Divider />

      {/* AI Chat toggle */}
      <ToolButton
        active={showChatPanel}
        onClick={() => onToggleChatPanel?.()}
        tooltip={t('designer.toolbar.aiChat', 'Chat IA')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </ToolButton>

      <Divider />

      {/* Tools section */}
      <div className="flex items-center gap-1">
        {/* Shopping list */}
        <ToolButton
          onClick={() => onShowShoppingList?.()}
          tooltip={t('designer.toolbar.shoppingList', 'Liste d\'achats')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </ToolButton>

        {/* Keyboard shortcuts help */}
        <ToolButton
          onClick={() => onShowShortcuts?.()}
          tooltip={t('designer.toolbar.shortcuts', 'Raccourcis clavier (?)')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="17" r="0.5" fill="currentColor" />
          </svg>
        </ToolButton>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
            role="presentation"
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('designer.properties.deleteConfirmTitle', 'Supprimer cet element ?')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t('designer.properties.deleteConfirmMessage', 'Cet element sera supprime de la scene. Vous pouvez annuler avec Ctrl+Z.')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={() => {
                  removeSelected();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t('designer.properties.delete', 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
