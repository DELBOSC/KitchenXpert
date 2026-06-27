import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────
interface DisplacementDetail {
  type: string;
  subtype: string;
  distance: number;
  cost: number;
}

interface DisplacementCostOverlayProps {
  /** Total displacement cost in EUR */
  totalCost: number;
  /** Detailed breakdown per technical connection */
  details: DisplacementDetail[];
  /** Screen X position to anchor the overlay */
  x: number;
  /** Screen Y position to anchor the overlay */
  y: number;
  /** Whether the overlay is visible (animates in/out) */
  visible: boolean;
}

// ─── Subtype label mapping ────────────────────────────────────
const SUBTYPE_LABELS: Record<string, string> = {
  water_cold: 'displacement.coldWater',
  water_hot: 'displacement.hotWater',
  water_drain: 'displacement.drain',
  electric_16a: 'displacement.outlet16A',
  electric_20a: 'displacement.outlet20A',
  electric_32a: 'displacement.outlet32A',
  gas_inlet: 'displacement.gasInlet',
  vmc_duct: 'displacement.vmcDuct',
  extraction_duct: 'displacement.extraction',
};

const SUBTYPE_FALLBACK_LABELS: Record<string, string> = {
  water_cold: 'Eau froide',
  water_hot: 'Eau chaude',
  water_drain: 'Evacuation',
  electric_16a: 'Prise 16A',
  electric_20a: 'Prise 20A',
  electric_32a: 'Prise 32A',
  gas_inlet: 'Arrivee gaz',
  vmc_duct: 'Gaine VMC',
  extraction_duct: 'Extraction',
};

// ─── Color helpers ────────────────────────────────────────────
function getCostColorClasses(cost: number): string {
  if (cost === 0) {
    return 'text-green-600 dark:text-green-400';
  }
  if (cost < 500) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  if (cost <= 1000) {
    return 'text-orange-500 dark:text-orange-400';
  }
  return 'text-red-500 dark:text-red-400';
}

function getBorderColorClass(cost: number): string {
  if (cost === 0) {
    return 'border-green-400 dark:border-green-600';
  }
  if (cost < 500) {
    return 'border-yellow-400 dark:border-yellow-600';
  }
  if (cost <= 1000) {
    return 'border-orange-400 dark:border-orange-600';
  }
  return 'border-red-400 dark:border-red-600';
}

function getDotColor(cost: number): string {
  if (cost === 0) {
    return '#22c55e';
  }
  if (cost < 500) {
    return '#eab308';
  }
  if (cost <= 1000) {
    return '#f97316';
  }
  return '#ef4444';
}

// ─── Format helpers ───────────────────────────────────────────
function formatEUR(value: number): string {
  return `EUR ${value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Component ────────────────────────────────────────────────
export default function DisplacementCostOverlay({
  totalCost,
  details,
  x,
  y,
  visible,
}: DisplacementCostOverlayProps): React.ReactElement {
  const { t } = useTranslation();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setShowBreakdown(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowBreakdown(false);
  }, []);

  const costColorClasses = getCostColorClasses(totalCost);
  const borderColorClass = getBorderColorClass(totalCost);

  return (
    <div
      className={`fixed z-40 pointer-events-auto transition-all duration-200 ease-out ${
        visible
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-95 translate-y-1 pointer-events-none'
      }`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -100%) translateY(-12px) ${visible ? 'scale(1)' : 'scale(0.95)'}`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="tooltip"
      aria-label={t('displacement.label', 'Displacement cost: {{cost}}', {
        cost: formatEUR(totalCost),
      })}
    >
      {/* Main badge */}
      <div
        className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border-l-4 ${borderColorClass} px-3 py-2 whitespace-nowrap`}
      >
        <div className="flex items-center gap-2">
          {/* Colored dot indicator */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: getDotColor(totalCost) }}
          />

          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('displacement.title', 'Deplacement')}:
          </span>
          <span className={`text-sm font-bold ${costColorClasses}`}>
            {totalCost === 0 ? t('displacement.free', 'Gratuit') : `+${formatEUR(totalCost)}`}
          </span>
        </div>
      </div>

      {/* Breakdown tooltip on hover */}
      {showBreakdown && details.length > 0 && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2 min-w-[200px] transition-all duration-200 ease-out ${
            showBreakdown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          <h4 className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
            {t('displacement.breakdown', 'Detail des couts')}
          </h4>
          <div className="space-y-1">
            {details.map((detail) => {
              const labelKey = SUBTYPE_LABELS[detail.subtype] || 'displacement.unknown';
              const fallback = SUBTYPE_FALLBACK_LABELS[detail.subtype] || detail.subtype;
              const detailColorClass = getCostColorClasses(detail.cost);

              return (
                <div key={detail.subtype} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {t(labelKey, fallback)}
                  </span>
                  <span className={`text-xs font-semibold ${detailColorClass}`}>
                    {detail.cost === 0
                      ? t('displacement.included', 'Inclus')
                      : `+${formatEUR(detail.cost)}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Distance info */}
          {details.some((d) => d.distance > 0) && (
            <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
              {details
                .filter((d) => d.distance > 0)
                .map((d) => {
                  const labelKey = SUBTYPE_LABELS[d.subtype] || 'displacement.unknown';
                  const fallback = SUBTYPE_FALLBACK_LABELS[d.subtype] || d.subtype;
                  return (
                    <p
                      key={`dist-${d.subtype}`}
                      className="text-[10px] text-gray-400 dark:text-gray-500"
                    >
                      {t(labelKey, fallback)}: {Math.round(d.distance * 1000)} mm
                    </p>
                  );
                })}
            </div>
          )}

          {/* Arrow pointing down */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700" />
        </div>
      )}

      {/* Arrow pointing down from main badge */}
      <div className="flex justify-center">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-gray-700" />
      </div>
    </div>
  );
}
