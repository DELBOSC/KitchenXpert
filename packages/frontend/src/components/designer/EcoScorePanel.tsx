import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface EcoSuggestion {
  id: string;
  text: string;
  savingsKwh?: number;
  ecoPointsGain: number;
}

export interface EcoScoreItem {
  name: string;
  type: string;
  energyRating?: string; // A+++ to G
  waterConsumption?: number; // liters/cycle
  material?: string;
  brand?: string;
  warranty?: number; // years
}

export interface EcoScoreProps {
  items: EcoScoreItem[];
  onSuggestionClick?: (suggestion: EcoSuggestion) => void;
}

// ----------------------------------------------------------------
// Scoring helpers
// ----------------------------------------------------------------

/** Energy rating score: A+++ = 100, down to E-G = 10 */
function energyRatingScore(rating?: string): number {
  if (!rating) return 0;
  const normalized = rating.toUpperCase().replace(/\s/g, '');
  const map: Record<string, number> = {
    'A+++': 100,
    'A++': 100,
    'A+': 85,
    'A': 70,
    'B': 55,
    'C': 40,
    'D': 25,
    'E': 10,
    'F': 10,
    'G': 10,
  };
  return map[normalized] ?? 0;
}

/** Water consumption score: < 6L = 100, 6-9 = 80, 9-12 = 60, > 12 = 40 */
function waterScore(liters?: number): number {
  if (liters == null || liters <= 0) return 0;
  if (liters < 6) return 100;
  if (liters < 9) return 80;
  if (liters <= 12) return 60;
  return 40;
}

/** Material sustainability score */
function materialScore(material?: string): number {
  if (!material) return 30;
  const lower = material.toLowerCase();
  if (lower.includes('fsc') || lower.includes('recycled') || lower.includes('recycle')) return 100;
  if (lower.includes('sustainable') || lower.includes('bamboo') || lower.includes('bio')) return 75;
  if (lower.includes('standard') || lower.includes('melamine') || lower.includes('mdf')) return 50;
  return 30;
}

/** Lifespan score based on warranty years */
function lifespanScore(warranty?: number): number {
  if (warranty == null || warranty <= 0) return 30;
  if (warranty >= 10) return 100;
  if (warranty >= 5) return 75;
  if (warranty >= 3) return 50;
  return 30;
}

/** Letter grade from numeric score */
function letterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 35) return 'E';
  return 'F';
}

/** Color for a letter grade */
function gradeColor(grade: string): { bg: string; text: string; ring: string; darkBg: string; darkText: string } {
  switch (grade) {
    case 'A+':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-300' };
    case 'A':
      return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-400', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-300' };
    case 'B':
      return { bg: 'bg-lime-100', text: 'text-lime-700', ring: 'ring-lime-400', darkBg: 'dark:bg-lime-900/30', darkText: 'dark:text-lime-300' };
    case 'C':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-400', darkBg: 'dark:bg-yellow-900/30', darkText: 'dark:text-yellow-300' };
    case 'D':
      return { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-400', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-300' };
    case 'E':
      return { bg: 'bg-red-100', text: 'text-red-600', ring: 'ring-red-400', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-300' };
    default:
      return { bg: 'bg-red-200', text: 'text-red-800', ring: 'ring-red-500', darkBg: 'dark:bg-red-900/40', darkText: 'dark:text-red-200' };
  }
}

/** Progress bar color */
function barColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function EcoScorePanel({ items, onSuggestionClick }: EcoScoreProps): React.ReactElement {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>('categories');

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // ---- Category scores ----
  const categories = useMemo(() => {
    const energyItems = items.filter((i) => i.energyRating);
    const waterItems = items.filter((i) => i.waterConsumption != null && i.waterConsumption > 0);
    const materialItems = items.filter((i) => i.material);
    const warrantyItems = items.filter((i) => i.warranty != null && i.warranty > 0);

    const avgEnergy = energyItems.length > 0
      ? Math.round(energyItems.reduce((sum, i) => sum + energyRatingScore(i.energyRating), 0) / energyItems.length)
      : 0;
    const avgWater = waterItems.length > 0
      ? Math.round(waterItems.reduce((sum, i) => sum + waterScore(i.waterConsumption), 0) / waterItems.length)
      : 0;
    const avgMaterial = materialItems.length > 0
      ? Math.round(materialItems.reduce((sum, i) => sum + materialScore(i.material), 0) / materialItems.length)
      : 0;
    const avgLifespan = warrantyItems.length > 0
      ? Math.round(warrantyItems.reduce((sum, i) => sum + lifespanScore(i.warranty), 0) / warrantyItems.length)
      : 0;

    return [
      { key: 'energy', label: t('ecoScore.energy', 'Energy efficiency'), score: avgEnergy, weight: 0.35, count: energyItems.length },
      { key: 'water', label: t('ecoScore.water', 'Water efficiency'), score: avgWater, weight: 0.20, count: waterItems.length },
      { key: 'material', label: t('ecoScore.material', 'Material sustainability'), score: avgMaterial, weight: 0.30, count: materialItems.length },
      { key: 'lifespan', label: t('ecoScore.lifespan', 'Product lifespan'), score: avgLifespan, weight: 0.15, count: warrantyItems.length },
    ];
  }, [items, t]);

  // ---- Overall score ----
  const overallScore = useMemo(() => {
    const hasData = categories.some((c) => c.count > 0);
    if (!hasData) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const cat of categories) {
      if (cat.count > 0) {
        weightedSum += cat.score * cat.weight;
        totalWeight += cat.weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }, [categories]);

  const grade = letterGrade(overallScore);
  const gradeColors = gradeColor(grade);

  // ---- CO2 estimation (rough approximation) ----
  const co2Estimate = useMemo(() => {
    // Simple heuristic: base 500 kg CO2e minus savings from eco score
    const baseKg = 500;
    const savings = Math.round((overallScore / 100) * 250);
    return Math.max(100, baseKg - savings);
  }, [overallScore]);

  // ---- Savings estimation ----
  const savings = useMemo(() => {
    // Simple estimation based on eco score
    const energySavings = Math.round((overallScore / 100) * 180);
    const waterSavings = Math.round((overallScore / 100) * 65);
    return { energy: energySavings, water: waterSavings };
  }, [overallScore]);

  // ---- Suggestions ----
  const suggestions = useMemo((): EcoSuggestion[] => {
    const result: EcoSuggestion[] = [];

    // Suggest energy improvements
    for (const item of items) {
      if (item.energyRating) {
        const score = energyRatingScore(item.energyRating);
        if (score < 70) {
          result.push({
            id: `energy-${item.name}`,
            text: t('ecoScore.suggestion.upgradeEnergy', {
              name: item.name,
              defaultValue: 'Upgrade {{name}} to Energy Star: -15 kWh/year',
            }),
            savingsKwh: 15,
            ecoPointsGain: 5,
          });
        }
      }
    }

    // Suggest water improvements
    for (const item of items) {
      if (item.waterConsumption != null && item.waterConsumption > 9) {
        result.push({
          id: `water-${item.name}`,
          text: t('ecoScore.suggestion.reduceWater', {
            name: item.name,
            defaultValue: 'Switch {{name}} to low-flow model: -3 L/cycle',
          }),
          ecoPointsGain: 3,
        });
      }
    }

    // Suggest material improvements
    for (const item of items) {
      const mScore = materialScore(item.material);
      if (mScore < 75) {
        result.push({
          id: `material-${item.name}`,
          text: t('ecoScore.suggestion.sustainableMaterial', {
            name: item.name,
            defaultValue: 'Use FSC-certified wood for {{name}}: +8 eco-points',
          }),
          ecoPointsGain: 8,
        });
      }
    }

    // Cap at 5 suggestions
    return result.slice(0, 5);
  }, [items, t]);

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('ecoScore.title', 'Eco-Score')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* ── Overall Score Display ── */}
        <div
          className="flex flex-col items-center py-4"
          role="meter"
          aria-valuenow={overallScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('ecoScore.overallScore', 'Overall eco-score')}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ring-4 ${gradeColors.ring} ${gradeColors.bg} ${gradeColors.darkBg}`}
          >
            <span className={`text-2xl font-bold ${gradeColors.text} ${gradeColors.darkText}`}>
              {grade}
            </span>
          </div>
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{overallScore}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">/100</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('ecoScore.overallScore', 'Overall eco-score')}
          </p>
        </div>

        {/* ── CO2 Equivalence ── */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('ecoScore.co2Label', 'Estimated CO2 footprint')}
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
            {t('ecoScore.co2Value', {
              kg: co2Estimate,
              defaultValue: '~{{kg}} kg CO2e',
            })}
          </p>
        </div>

        {/* ── Savings Estimation ── */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
            {t('ecoScore.annualSavings', 'Estimated annual savings')}
          </p>
          <div className="flex justify-between text-xs">
            <span className="text-green-600 dark:text-green-400">
              {t('ecoScore.energySavings', {
                amount: savings.energy,
                defaultValue: 'EUR {{amount}} energy',
              })}
            </span>
            <span className="text-green-600 dark:text-green-400">
              {t('ecoScore.waterSavings', {
                amount: savings.water,
                defaultValue: 'EUR {{amount}} water',
              })}
            </span>
          </div>
        </div>

        {/* ── Category Breakdown ── */}
        <div>
          <button
            onClick={() => toggleSection('categories')}
            className="w-full flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-2"
            aria-expanded={expandedSection === 'categories'}
          >
            <span>{t('ecoScore.categoryBreakdown', 'Category breakdown')}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expandedSection === 'categories' ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSection === 'categories' && (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 dark:text-gray-300">{cat.label}</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {cat.count > 0 ? cat.score : '--'}
                    </span>
                  </div>
                  <div
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={cat.count > 0 ? cat.score : 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={cat.label}
                  >
                    {cat.count > 0 && (
                      <div
                        className={`h-full rounded-full transition-all ${barColor(cat.score)}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      {t('ecoScore.weight', { pct: Math.round(cat.weight * 100), defaultValue: '{{pct}}% weight' })}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {t('ecoScore.itemCount', { count: cat.count, defaultValue: '{{count}} items' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Suggestions ── */}
        {suggestions.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('suggestions')}
              className="w-full flex items-center justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-2"
              aria-expanded={expandedSection === 'suggestions'}
            >
              <span>{t('ecoScore.suggestions', 'Suggestions')}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform ${expandedSection === 'suggestions' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSection === 'suggestions' && (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => onSuggestionClick?.(suggestion)}
                    className="w-full text-left px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <p className="text-blue-800 dark:text-blue-200">{suggestion.text}</p>
                    <p className="text-blue-500 dark:text-blue-400 mt-0.5 font-medium">
                      +{suggestion.ecoPointsGain} {t('ecoScore.ecoPoints', 'eco-points')}
                      {suggestion.savingsKwh != null && (
                        <span className="ml-1">
                          | -{suggestion.savingsKwh} kWh/{t('ecoScore.year', 'year')}
                        </span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <div className="text-center py-6">
            <svg
              className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('ecoScore.empty', 'Add items to your design to see the eco-score.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
