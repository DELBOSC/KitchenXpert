import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface PairingRecommendation {
  name: string;
  material: string;
  color: string; // hex color
  matchScore: number; // 0-1
  matchReason: string;
  priceRange: { min: number; max: number };
  brand?: string;
}

export interface CategoryRecommendations {
  category: string;
  recommendations: PairingRecommendation[];
}

export interface ProductPairingsPanelProps {
  cabinetStyle: string;
  recommendations: CategoryRecommendations[];
  isLoading?: boolean;
  onApplyRecommendation?: (category: string, recommendation: PairingRecommendation) => void;
  onPreviewRecommendation?: (category: string, recommendation: PairingRecommendation) => void;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  countertop: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="10" width="20" height="4" rx="1" />
    </svg>
  ),
  backsplash: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="8" rx="1" />
      <line x1="9" y1="3" x2="9" y2="11" />
      <line x1="15" y1="3" x2="15" y2="11" />
    </svg>
  ),
  handle: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 12h12" strokeLinecap="round" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </svg>
  ),
  flooring: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="16" width="20" height="4" rx="1" />
      <line x1="8" y1="16" x2="8" y2="20" />
      <line x1="16" y1="16" x2="16" y2="20" />
    </svg>
  ),
  sink: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 14h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" />
      <path d="M12 4v6" />
    </svg>
  ),
  faucet: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 4v4c0 2-3 4-3 4h6s-3-2-3-4z" />
      <path d="M9 12v6" />
    </svg>
  ),
};

function getMatchScoreColor(score: number): { bg: string; text: string; darkBg: string; darkText: string } {
  if (score >= 0.9) return { bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-300' };
  if (score >= 0.7) return { bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300' };
  if (score >= 0.5) return { bg: 'bg-yellow-100', text: 'text-yellow-700', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-300' };
  return { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300' };
}

function getCategoryLabel(category: string, t: Function): string {
  const labels: Record<string, string> = {
    countertop: t('pairings.categories.countertop', 'Countertops'),
    backsplash: t('pairings.categories.backsplash', 'Backsplash'),
    handle: t('pairings.categories.handle', 'Handles'),
    flooring: t('pairings.categories.flooring', 'Flooring'),
    sink: t('pairings.categories.sink', 'Sinks'),
    faucet: t('pairings.categories.faucet', 'Faucets'),
  };
  return labels[category] || category;
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function ProductPairingsPanel({
  cabinetStyle,
  recommendations,
  isLoading = false,
  onApplyRecommendation,
  onPreviewRecommendation,
}: ProductPairingsPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    recommendations[0]?.category || null,
  );

  const toggleCategory = (category: string) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const totalRecommendations = useMemo(
    () => recommendations.reduce((sum, cat) => sum + cat.recommendations.length, 0),
    [recommendations],
  );

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('pairings.title', 'Customers Also Chose')}
        </h2>
        {cabinetStyle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('pairings.detectedStyle', 'Detected style:')}
            <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
              {cabinetStyle}
            </span>
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('pairings.loading', 'Finding matching products...')}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && totalRecommendations === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <svg
              className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('pairings.empty', 'Select a cabinet style to see complementary product recommendations.')}
            </p>
          </div>
        )}

        {/* Category Recommendations */}
        {!isLoading && recommendations.map((catRec) => {
          const isExpanded = expandedCategory === catRec.category;
          const icon = CATEGORY_ICONS[catRec.category] || CATEGORY_ICONS.countertop;

          return (
            <div key={catRec.category} className="border-b border-gray-100 dark:border-gray-700">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(catRec.category)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                aria-expanded={isExpanded}
              >
                <span className="text-gray-500 dark:text-gray-400">{icon}</span>
                <span className="flex-1 text-left">
                  {getCategoryLabel(catRec.category, t)}
                </span>
                <span className="text-xs text-gray-400">{catRec.recommendations.length}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Recommendations */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {catRec.recommendations.map((rec, index) => {
                    const scoreColors = getMatchScoreColor(rec.matchScore);
                    return (
                      <div
                        key={`${catRec.category}-${index}`}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-100 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                      >
                        {/* Product header with color swatch */}
                        <div className="flex items-start gap-2">
                          {/* Color swatch / thumbnail placeholder */}
                          <div
                            className="w-10 h-10 rounded-md flex-shrink-0 border border-gray-200 dark:border-gray-500"
                            style={{ backgroundColor: rec.color }}
                            title={rec.material}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                              {rec.name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {rec.material}
                              {rec.brand && (
                                <span className="ml-1">
                                  &middot; {rec.brand}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Match score badge */}
                          <span
                            className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${scoreColors.bg} ${scoreColors.text} ${scoreColors.darkBg} ${scoreColors.darkText}`}
                            title={t('pairings.matchScore', 'Match score')}
                          >
                            {Math.round(rec.matchScore * 100)}%
                          </span>
                        </div>

                        {/* Match reason */}
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                          {rec.matchReason}
                        </p>

                        {/* Price + Actions */}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                            {rec.priceRange.min}-{rec.priceRange.max} EUR
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onPreviewRecommendation && (
                              <button
                                onClick={() => onPreviewRecommendation(catRec.category, rec)}
                                className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                title={t('pairings.preview', 'Preview')}
                              >
                                {t('pairings.preview', 'Preview')}
                              </button>
                            )}
                            {onApplyRecommendation && (
                              <button
                                onClick={() => onApplyRecommendation(catRec.category, rec)}
                                className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                title={t('pairings.apply', 'Apply')}
                              >
                                {t('pairings.apply', 'Apply')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
