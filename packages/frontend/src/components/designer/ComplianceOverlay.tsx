/**
 * ComplianceOverlay — 3D Designer Compliance Violation Markers
 *
 * Renders violation markers in the 3D designer scene. Each marker is
 * positioned at the violation coordinates and shows a tooltip on hover
 * with rule details and fix suggestions.
 *
 * Props:
 *  - results: compliance check results array
 *  - visible: toggle visibility on/off
 *  - onToggle: callback when the user clicks the toggle button
 *
 * Follows project patterns: useTranslation, dark mode, Tailwind classes.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface ComplianceViolation {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  severity: string;
  position?: { x: number; y: number; z: number } | null;
  fixSuggestion?: string;
}

export interface ComplianceOverlayProps {
  results: ComplianceViolation[];
  visible: boolean;
  onToggle: () => void;
  /** Scale factor to convert compliance cm coords to canvas pixels. Default: 1 */
  scale?: number;
  /** Offset to align markers with the 3D scene origin */
  offset?: { x: number; y: number };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function markerColor(status: 'failed' | 'warning'): {
  bg: string;
  border: string;
  pulse: string;
  icon: string;
} {
  if (status === 'failed') {
    return {
      bg: 'bg-red-500',
      border: 'border-red-600',
      pulse: 'bg-red-400',
      icon: 'text-white',
    };
  }
  return {
    bg: 'bg-yellow-500',
    border: 'border-yellow-600',
    pulse: 'bg-yellow-400',
    icon: 'text-white',
  };
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function ComplianceOverlay({
  results,
  visible,
  onToggle,
  scale = 1,
  offset = { x: 0, y: 0 },
}: ComplianceOverlayProps): React.ReactElement {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedTooltip, setExpandedTooltip] = useState<string | null>(null);

  // Only show violations (failed/warning) that have a position
  const violations = useMemo(
    () =>
      results.filter(
        (
          r
        ): r is ComplianceViolation & {
          status: 'failed' | 'warning';
          position: { x: number; y: number; z: number };
        } => (r.status === 'failed' || r.status === 'warning') && r.position != null
      ),
    [results]
  );

  const failedCount = useMemo(() => results.filter((r) => r.status === 'failed').length, [results]);
  const warningCount = useMemo(
    () => results.filter((r) => r.status === 'warning').length,
    [results]
  );

  const handleMarkerClick = useCallback((id: string) => {
    setExpandedTooltip((prev) => (prev === id ? null : id));
  }, []);

  return (
    <>
      {/* Toggle Button — always visible */}
      <div className="absolute top-4 right-4 z-30">
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg shadow-lg transition-all ${
            visible
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          title={t('compliance.overlay.toggle', 'Toggle compliance markers')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          {t('compliance.overlay.label', 'Compliance')}
          {visible && (failedCount > 0 || warningCount > 0) && (
            <span className="flex items-center gap-1">
              {failedCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {failedCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {warningCount}
                </span>
              )}
            </span>
          )}
        </button>
      </div>

      {/* Violation Markers */}
      {visible && violations.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {violations.map((violation) => {
            const colors = markerColor(violation.status);
            const left = violation.position.x * scale + offset.x;
            const top = violation.position.y * scale + offset.y;
            const isHovered = hoveredId === violation.ruleId;
            const isExpanded = expandedTooltip === violation.ruleId;

            return (
              <div
                key={violation.ruleId}
                className="absolute pointer-events-auto"
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Pulsing marker */}
                <div className="relative">
                  {/* Pulse ring */}
                  <div
                    className={`absolute inset-0 rounded-full ${colors.pulse} opacity-40 animate-ping`}
                    style={{ width: '24px', height: '24px', marginLeft: '-4px', marginTop: '-4px' }}
                  />

                  {/* Marker dot */}
                  <button
                    className={`relative w-6 h-6 rounded-full ${colors.bg} border-2 ${colors.border} shadow-lg flex items-center justify-center cursor-pointer hover:scale-125 transition-transform`}
                    onMouseEnter={() => setHoveredId(violation.ruleId)}
                    onMouseLeave={() => {
                      if (!isExpanded) {
                        setHoveredId(null);
                      }
                    }}
                    onClick={() => handleMarkerClick(violation.ruleId)}
                    title={violation.ruleName}
                  >
                    {violation.status === 'failed' ? (
                      <svg
                        className={`w-3.5 h-3.5 ${colors.icon}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    ) : (
                      <svg
                        className={`w-3.5 h-3.5 ${colors.icon}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M12 9v2m0 4h.01"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Tooltip */}
                {(isHovered || isExpanded) && (
                  <div
                    className="absolute z-40 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3"
                    style={{
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: '32px',
                    }}
                    onMouseEnter={() => setHoveredId(violation.ruleId)}
                    onMouseLeave={() => {
                      setHoveredId(null);
                      setExpandedTooltip(null);
                    }}
                  >
                    {/* Arrow */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45" />

                    <div className="relative">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
                          {violation.ruleName}
                        </h4>
                        <span
                          className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                            violation.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}
                        >
                          {violation.status === 'failed'
                            ? t('compliance.overlay.failed', 'FAILED')
                            : t('compliance.overlay.warning', 'WARNING')}
                        </span>
                      </div>

                      {/* Code */}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mb-1.5">
                        {violation.ruleCode}
                      </p>

                      {/* Message */}
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {violation.message}
                      </p>

                      {/* Fix suggestion */}
                      {violation.fixSuggestion && (
                        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-start gap-1.5">
                            <svg
                              className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                              {violation.fixSuggestion}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Position */}
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 font-mono mt-2">
                        x:{violation.position.x} y:{violation.position.y} z:{violation.position.z}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary bar at bottom when overlay is visible */}
      {visible && results.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-4 py-2">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-green-600 dark:text-green-400">
                {results.filter((r) => r.status === 'passed').length}{' '}
                {t('compliance.overlay.passed', 'passed')}
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-red-600 dark:text-red-400">
                {failedCount} {t('compliance.overlay.failed', 'failed')}
              </span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-yellow-600 dark:text-yellow-400">
                {warningCount} {t('compliance.overlay.warnings', 'warnings')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state when overlay is visible but no results */}
      {visible && results.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full shadow-lg px-4 py-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('compliance.overlay.noResults', 'Run a compliance check to see results')}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
