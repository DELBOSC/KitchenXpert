import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────
interface BudgetBreakdownItem {
  category: string;
  amount: number;
}

interface BudgetBarProps {
  budget: number;
  spent: number;
  breakdown: BudgetBreakdownItem[];
}

// ─── Color helpers ────────────────────────────────────────────
function getBarColor(percentage: number): string {
  if (percentage > 100) {
    return '#ef4444';
  } // red
  if (percentage >= 90) {
    return '#f97316';
  } // orange
  if (percentage >= 70) {
    return '#eab308';
  } // yellow
  return '#22c55e'; // green
}

function getBarColorClass(percentage: number): string {
  if (percentage > 100) {
    return 'text-red-500 dark:text-red-400';
  }
  if (percentage >= 90) {
    return 'text-orange-500 dark:text-orange-400';
  }
  if (percentage >= 70) {
    return 'text-yellow-500 dark:text-yellow-400';
  }
  return 'text-green-500 dark:text-green-400';
}

// ─── Format currency ──────────────────────────────────────────
function formatEUR(value: number): string {
  return `EUR ${value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Component ────────────────────────────────────────────────
export default function BudgetBar({
  budget,
  spent,
  breakdown,
}: BudgetBarProps): React.ReactElement {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [deltaVisible, setDeltaVisible] = useState(false);
  const prevSpentRef = useRef<number>(spent);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute percentage
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const clampedPercentage = Math.min(percentage, 100);
  const isOverBudget = spent > budget;
  const remaining = budget - spent;

  // Detect spend changes for delta animation
  useEffect(() => {
    const prevSpent = prevSpentRef.current;
    if (prevSpent !== spent && prevSpent !== 0) {
      const diff = spent - prevSpent;
      setDelta(diff);
      setDeltaVisible(true);

      // Clear any existing timeout
      if (deltaTimeoutRef.current) {
        clearTimeout(deltaTimeoutRef.current);
      }

      // Fade out after 2 seconds
      deltaTimeoutRef.current = setTimeout(() => {
        setDeltaVisible(false);
        deltaTimeoutRef.current = setTimeout(() => {
          setDelta(null);
        }, 300);
      }, 2000);
    }
    prevSpentRef.current = spent;

    return () => {
      if (deltaTimeoutRef.current) {
        clearTimeout(deltaTimeoutRef.current);
      }
    };
  }, [spent]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const barColor = getBarColor(percentage);
  const colorClass = getBarColorClass(percentage);

  // Compute total for breakdown proportions
  const breakdownTotal = breakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 select-none"
      style={{ maxWidth: '480px', width: 'calc(100% - 2rem)' }}
    >
      <div
        className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300"
        role="region"
        aria-label={t('budget.label', 'Budget tracker')}
      >
        {/* Main bar area - clickable */}
        <button
          type="button"
          onClick={handleToggle}
          className="w-full px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset rounded-xl"
          aria-expanded={expanded}
          aria-controls="budget-breakdown"
        >
          {/* Top row: label + amount */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {isOverBudget
                  ? t('budget.over', 'Over budget')
                  : t('budget.remaining', 'Remaining')}
                : {formatEUR(Math.abs(remaining))}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Delta indicator */}
              {delta !== null && (
                <span
                  className={`text-xs font-bold transition-all duration-300 ${
                    deltaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                  } ${delta > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}
                  aria-live="polite"
                >
                  {delta > 0 ? '+' : ''}
                  {formatEUR(delta)}
                </span>
              )}

              <span className={`text-sm font-bold ${colorClass}`}>
                {formatEUR(spent)} / {formatEUR(budget)}
              </span>
              <span className={`text-xs font-semibold ${colorClass}`}>
                ({percentage.toFixed(1)}%)
              </span>

              {/* Expand chevron */}
              <svg
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(percentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('budget.progress', 'Budget usage: {{percent}}%', {
              percent: percentage.toFixed(1),
            })}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${clampedPercentage}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
        </button>

        {/* Expanded breakdown */}
        <div
          id="budget-breakdown"
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
          }`}
          aria-hidden={!expanded}
        >
          <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-3 mb-2">
              {t('budget.breakdown', 'Breakdown')}
            </h3>

            {breakdown.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-2">
                {t('budget.noItems', 'No items added yet.')}
              </p>
            ) : (
              <div className="space-y-1.5">
                {/* Stacked bar visualization */}
                {breakdownTotal > 0 && (
                  <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 mb-3">
                    {breakdown
                      .filter((item) => item.amount > 0)
                      .map((item, index) => {
                        const widthPercent = (item.amount / breakdownTotal) * 100;
                        const segmentColors = [
                          '#3b82f6',
                          '#8b5cf6',
                          '#ec4899',
                          '#f97316',
                          '#14b8a6',
                          '#6366f1',
                          '#a855f7',
                          '#f43f5e',
                        ];
                        return (
                          <div
                            key={item.category}
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: segmentColors[index % segmentColors.length],
                            }}
                            title={`${item.category}: ${formatEUR(item.amount)}`}
                          />
                        );
                      })}
                  </div>
                )}

                {/* Category list */}
                {breakdown.map((item, index) => {
                  const segmentColors = [
                    '#3b82f6',
                    '#8b5cf6',
                    '#ec4899',
                    '#f97316',
                    '#14b8a6',
                    '#6366f1',
                    '#a855f7',
                    '#f43f5e',
                  ];
                  const catPercentage =
                    budget > 0 ? ((item.amount / budget) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={item.category}
                      className="flex items-center justify-between py-1 px-2 rounded bg-gray-50 dark:bg-gray-750"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: segmentColors[index % segmentColors.length] }}
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[10px] text-gray-400">{catPercentage}%</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {formatEUR(item.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
