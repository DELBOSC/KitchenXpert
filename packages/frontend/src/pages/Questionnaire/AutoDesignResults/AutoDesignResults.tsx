import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

import { logger } from '../../../services/logger';

// ============================================================================
// TYPES
// ============================================================================

interface KitchenLayoutItem {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  wallSide: string;
}

interface DesignProduct {
  name: string;
  category: string;
  brand: string;
  reference: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

interface DesignScores {
  ergonomics: number;
  storage: number;
  aesthetics: number;
  budget: number;
  overall: number;
}

interface DesignExplanation {
  materials: string;
  layout: string;
  tradeoffs: string;
}

interface CostBreakdownFlat {
  cabinets: number;
  countertops: number;
  appliances: number;
  installation: number;
}

interface SingleDesignResult {
  id: string;
  tier: 'economique' | 'confort' | 'premium';
  name: string;
  description: string;
  layout: {
    type: string;
    items: KitchenLayoutItem[];
  };
  products: DesignProduct[];
  totalCost: number;
  scores: DesignScores;
  explanation: DesignExplanation;
  costBreakdown: CostBreakdownFlat;
  materials: {
    cabinets: string;
    countertops: string;
    backsplash: string;
    flooring: string;
  };
  features: string[];
  style: string;
  createdAt: string;
}

interface LocationState {
  designs?: SingleDesignResult[];
  generationId?: string;
}

// ============================================================================
// TIER STYLES CONFIG
// ============================================================================

const TIER_STYLES: Record<string, {
  badge: string;
  badgeBg: string;
  border: string;
  accent: string;
  icon: string;
}> = {
  economique: {
    badge: 'text-green-800 dark:text-green-200',
    badgeBg: 'bg-green-100 dark:bg-green-900/50',
    border: 'border-green-300 dark:border-green-700',
    accent: 'text-green-600 dark:text-green-400',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  confort: {
    badge: 'text-blue-800 dark:text-blue-200',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/50',
    border: 'border-blue-300 dark:border-blue-700',
    accent: 'text-blue-600 dark:text-blue-400',
    icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  },
  premium: {
    badge: 'text-amber-800 dark:text-amber-200',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    border: 'border-amber-300 dark:border-amber-700',
    accent: 'text-amber-600 dark:text-amber-400',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  },
};

const TIER_LABELS: Record<string, string> = {
  economique: 'Economique',
  confort: 'Confort',
  premium: 'Premium',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Score bar component */
function ScoreBar({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 dark:text-gray-400 w-24 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
        {value}
      </span>
    </div>
  );
}

/** Simple 2D layout grid visualization */
function LayoutGrid({
  items,
  roomWidth,
  roomDepth,
}: {
  items: KitchenLayoutItem[];
  roomWidth: number;
  roomDepth: number;
}): React.ReactElement {
  // Scale to fit within a 280x200 SVG viewBox
  const svgW = 280;
  const svgH = 200;
  const scaleX = svgW / (roomWidth || 400);
  const scaleY = svgH / (roomDepth || 350);
  const scale = Math.min(scaleX, scaleY) * 0.85;
  const offsetX = (svgW - roomWidth * scale) / 2;
  const offsetY = (svgH - roomDepth * scale) / 2;

  const typeColors: Record<string, string> = {
    base_cabinet: '#3B82F6',
    wall_cabinet: '#60A5FA',
    tall_cabinet: '#2563EB',
    countertop: '#6B7280',
    appliance: '#EF4444',
    sink: '#06B6D4',
    island: '#8B5CF6',
  };

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full h-40 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50"
      role="img"
      aria-label="Kitchen layout diagram"
    >
      {/* Room outline */}
      <rect
        x={offsetX}
        y={offsetY}
        width={roomWidth * scale}
        height={roomDepth * scale}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        className="text-gray-400 dark:text-gray-500"
      />

      {/* Layout items */}
      {items.map((item, i) => {
        const color = typeColors[item.type] || '#9CA3AF';
        return (
          <g key={item.id || i}>
            <rect
              x={offsetX + item.x * scale}
              y={offsetY + item.y * scale}
              width={item.width * scale}
              height={item.depth * scale}
              fill={color}
              fillOpacity={0.3}
              stroke={color}
              strokeWidth="1"
              rx="2"
            />
            {item.width * scale > 20 && (
              <text
                x={offsetX + item.x * scale + (item.width * scale) / 2}
                y={offsetY + item.y * scale + (item.depth * scale) / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="6"
                fill={color}
                className="select-none"
              >
                {item.name.slice(0, 12)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Cost breakdown pie chart (simple SVG donut) */
function CostPieChart({
  breakdown,
  t,
}: {
  breakdown: CostBreakdownFlat;
  t: (key: string, defaultValue: string) => string;
}): React.ReactElement {
  const total = breakdown.cabinets + breakdown.countertops + breakdown.appliances + breakdown.installation;
  if (total === 0) {return <div className="text-sm text-gray-400">--</div>;}

  const segments = [
    { label: t('autoDesign.categories.cabinets', 'Caissons'), value: breakdown.cabinets, color: '#3B82F6' },
    { label: t('autoDesign.categories.countertops', 'Plans de travail'), value: breakdown.countertops, color: '#06B6D4' },
    { label: t('autoDesign.categories.appliances', 'Electromenager'), value: breakdown.appliances, color: '#EF4444' },
    { label: t('autoDesign.categories.installation', 'Installation'), value: breakdown.installation, color: '#8B5CF6' },
  ];

  // Build conic gradient segments
  let cumAngle = 0;
  const arcs = segments.map((seg) => {
    const pct = (seg.value / total) * 100;
    const start = cumAngle;
    cumAngle += pct;
    return { ...seg, start, end: cumAngle, pct };
  });

  // SVG donut chart
  const cx = 50, cy = 50, r = 40, rInner = 25;

  function arcPath(startPct: number, endPct: number): string {
    const startAngle = (startPct / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (endPct / 100) * 2 * Math.PI - Math.PI / 2;
    const largeArc = endPct - startPct > 50 ? 1 : 0;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(startAngle);
    const y4 = cy + rInner * Math.sin(startAngle);

    return `M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} L${x3},${y3} A${rInner},${rInner} 0 ${largeArc},0 ${x4},${y4} Z`;
  }

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-20 h-20 flex-shrink-0">
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arcPath(arc.start, arc.end)}
            fill={arc.color}
            fillOpacity={0.8}
          />
        ))}
      </svg>
      <div className="flex-1 space-y-1">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: arc.color }} />
            <span className="text-gray-600 dark:text-gray-400 truncate">{arc.label}</span>
            <span className="ml-auto font-medium text-gray-700 dark:text-gray-300">{Math.round(arc.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AutoDesignResults: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const locationState = location.state as LocationState | undefined;

  const [designs, setDesigns] = useState<SingleDesignResult[]>(locationState?.designs ?? []);
  const [generationId, setGenerationId] = useState<string>(locationState?.generationId ?? '');
  const [isLoading, setIsLoading] = useState<boolean>(!locationState?.designs);
  const [error, setError] = useState<string | null>(null);
  const [expandedExplanation, setExpandedExplanation] = useState<Record<string, boolean>>({});
  const [retryCount, setRetryCount] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  // If designs were not passed via location state, generate them
  useEffect(() => {
    if (locationState?.designs && locationState.designs.length > 0) {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    const generateDesigns = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/questionnaire/auto-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
            t('autoDesign.errors.generationFailed', 'Failed to generate designs'),
          );
        }

        const result = await response.json();
        if (result.success && result.data) {
          setDesigns(result.data.designs);
          setGenerationId(result.data.generationId);
        } else {
          throw new Error(result.error || t('autoDesign.errors.invalidResponse', 'Invalid response'));
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        logger.error('Auto-generate designs failed', { error: message });
      } finally {
        setIsLoading(false);
      }
    };

    generateDesigns();
    return () => controller.abort();
  }, [retryCount, locationState, t]);

  const handleRetry = (): void => {
    setRetryCount((c) => c + 1);
  };

  const toggleExplanation = (designId: string): void => {
    setExpandedExplanation((prev) => ({
      ...prev,
      [designId]: !prev[designId],
    }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenDesigner = (design: SingleDesignResult): void => {
    navigate('/designer', {
      state: {
        fromAutoDesign: true,
        designId: design.id,
        tier: design.tier,
        layout: design.layout,
        products: design.products,
        style: design.style,
        generationId,
      },
    });
  };

  const handleExportPDF = (design: SingleDesignResult): void => {
    // Build a simple text export since PDF generation would need a full library
    const content = [
      design.name,
      '='.repeat(40),
      '',
      design.description,
      '',
      `Total: ${formatCurrency(design.totalCost)}`,
      '',
      'Products:',
      ...design.products.map(
        (p) => `  - ${p.name} (${p.brand}) x${p.qty}: ${formatCurrency(p.totalPrice)}`,
      ),
      '',
      `Ergonomics: ${design.scores.ergonomics}/100`,
      `Storage: ${design.scores.storage}/100`,
      `Aesthetics: ${design.scores.aesthetics}/100`,
      `Budget: ${design.scores.budget}/100`,
      '',
      'Materials:',
      `  Cabinets: ${design.materials.cabinets}`,
      `  Countertops: ${design.materials.countertops}`,
      `  Backsplash: ${design.materials.backsplash}`,
      `  Flooring: ${design.materials.flooring}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.name.replace(/\s+/g, '_')}_devis.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Delayed revocation per project pattern
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Generate comparison highlights between tiers */
  const getComparisonHighlights = (): string[] => {
    if (designs.length < 2) {return [];}
    const highlights: string[] = [];

    const sorted = [...designs].sort((a, b) => a.totalCost - b.totalCost);
    if (sorted.length >= 2) {
      const low = sorted[0]!;
      const mid = sorted[1]!;
      const costDiff = mid.totalCost - low.totalCost;
      const storageDiff = mid.scores.storage - low.scores.storage;
      if (storageDiff > 0) {
        highlights.push(
          t('autoDesign.comparison.storageUpgrade', 'Le {{tier}} offre {{storagePct}}% de rangement en plus pour seulement {{cost}} de plus', {
            tier: TIER_LABELS[mid.tier] || mid.tier,
            storagePct: storageDiff,
            cost: formatCurrency(costDiff),
          }),
        );
      }
    }
    if (sorted.length >= 3) {
      const mid = sorted[1]!;
      const high = sorted[2]!;
      const aestheticDiff = high.scores.aesthetics - mid.scores.aesthetics;
      if (aestheticDiff > 0) {
        highlights.push(
          t('autoDesign.comparison.aestheticsUpgrade', 'Le {{tier}} gagne {{points}} points en esthetique avec des materiaux haut de gamme', {
            tier: TIER_LABELS[high.tier] || high.tier,
            points: aestheticDiff,
          }),
        );
      }
    }
    return highlights;
  };

  // ---------- LOADING STATE ----------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-600 mx-auto" role="status" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('autoDesign.loading.title', 'Generation de vos 3 cuisines...')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t('autoDesign.loading.subtitle', 'Notre IA analyse vos preferences et genere 3 concepts a differents budgets. Cela peut prendre 15-30 secondes.')}
          </p>
          <div className="mt-6 space-y-2">
            {['Analyse du questionnaire', 'Generation Economique', 'Generation Confort', 'Generation Premium'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-pulse w-2 h-2 rounded-full bg-blue-500" style={{ animationDelay: `${i * 0.5}s` }} />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- ERROR STATE ----------
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('autoDesign.errors.title', 'Erreur de generation')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('common.retry', 'Reessayer')}
            </button>
            <button
              onClick={() => navigate('/questionnaire/budget')}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.back', 'Retour')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- RESULTS ----------
  const comparisonHighlights = getComparisonHighlights();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('autoDesign.title', 'Vos 3 Concepts de Cuisine')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            {t('autoDesign.subtitle', 'Bases sur votre questionnaire, voici 3 concepts a differents niveaux de budget. Comparez et choisissez celui qui vous convient.')}
          </p>
        </div>

        {/* Comparison Highlights */}
        {comparisonHighlights.length > 0 && (
          <div className="mb-8 space-y-2">
            {comparisonHighlights.map((highlight, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-indigo-800 dark:text-indigo-300"
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Design Cards Grid */}
        <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
          {designs.map((design) => {
            const tierStyle = TIER_STYLES[design.tier] || TIER_STYLES.confort!;
            const isExpanded = expandedExplanation[design.id] ?? false;

            return (
              <div
                key={design.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/30 border-2 ${tierStyle.border} flex flex-col overflow-hidden transition-shadow hover:shadow-md dark:hover:shadow-gray-700/50`}
              >
                {/* Tier Badge + Price */}
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${tierStyle.badge} ${tierStyle.badgeBg}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tierStyle.icon} />
                      </svg>
                      {t(`autoDesign.tiers.${design.tier}`, TIER_LABELS[design.tier] || design.tier)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {design.scores.overall}/100
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{design.name}</h3>
                  <p className={`text-2xl font-extrabold ${tierStyle.accent}`}>
                    {formatCurrency(design.totalCost)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{design.description}</p>
                </div>

                {/* Layout Diagram */}
                <div className="px-5 pb-3">
                  <LayoutGrid
                    items={design.layout.items}
                    roomWidth={400}
                    roomDepth={350}
                  />
                </div>

                {/* Score Bars */}
                <div className="px-5 pb-4 space-y-1.5">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {t('autoDesign.scores', 'Scores')}
                  </h4>
                  <ScoreBar
                    label={t('autoDesign.scoreLabels.ergonomics', 'Ergonomie')}
                    value={design.scores.ergonomics}
                    colorClass="bg-emerald-500"
                  />
                  <ScoreBar
                    label={t('autoDesign.scoreLabels.storage', 'Rangement')}
                    value={design.scores.storage}
                    colorClass="bg-blue-500"
                  />
                  <ScoreBar
                    label={t('autoDesign.scoreLabels.aesthetics', 'Esthetique')}
                    value={design.scores.aesthetics}
                    colorClass="bg-purple-500"
                  />
                  <ScoreBar
                    label={t('autoDesign.scoreLabels.budget', 'Rapport Q/P')}
                    value={design.scores.budget}
                    colorClass="bg-amber-500"
                  />
                </div>

                {/* Cost Breakdown */}
                <div className="px-5 pb-4">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {t('autoDesign.costBreakdown', 'Repartition des couts')}
                  </h4>
                  <CostPieChart breakdown={design.costBreakdown} t={t} />
                </div>

                {/* Materials */}
                <div className="px-5 pb-4">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {t('autoDesign.materials', 'Materiaux')}
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="text-gray-500 dark:text-gray-400">{t('autoDesign.materialLabels.cabinets', 'Caissons')}</div>
                    <div className="text-gray-700 dark:text-gray-300 font-medium">{design.materials.cabinets}</div>
                    <div className="text-gray-500 dark:text-gray-400">{t('autoDesign.materialLabels.countertops', 'Plans')}</div>
                    <div className="text-gray-700 dark:text-gray-300 font-medium">{design.materials.countertops}</div>
                    <div className="text-gray-500 dark:text-gray-400">{t('autoDesign.materialLabels.backsplash', 'Credence')}</div>
                    <div className="text-gray-700 dark:text-gray-300 font-medium">{design.materials.backsplash}</div>
                    <div className="text-gray-500 dark:text-gray-400">{t('autoDesign.materialLabels.flooring', 'Sol')}</div>
                    <div className="text-gray-700 dark:text-gray-300 font-medium">{design.materials.flooring}</div>
                  </div>
                </div>

                {/* Features */}
                {design.features.length > 0 && (
                  <div className="px-5 pb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {design.features.slice(0, 5).map((feature, i) => (
                        <span
                          key={i}
                          className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                      {design.features.length > 5 && (
                        <span className="inline-block px-2 py-0.5 text-gray-400 dark:text-gray-500 text-xs">
                          +{design.features.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Expandable explanation */}
                <div className="px-5 pb-4">
                  <button
                    onClick={() => toggleExplanation(design.id)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                    aria-expanded={isExpanded}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('autoDesign.whyThisDesign', 'Pourquoi ce design ?')}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 text-xs text-gray-600 dark:text-gray-400 pl-5 border-l-2 border-gray-200 dark:border-gray-700">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t('autoDesign.explanationLabels.materials', 'Materiaux')}:
                        </span>{' '}
                        {design.explanation.materials}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t('autoDesign.explanationLabels.layout', 'Disposition')}:
                        </span>{' '}
                        {design.explanation.layout}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {t('autoDesign.explanationLabels.tradeoffs', 'Compromis')}:
                        </span>{' '}
                        {design.explanation.tradeoffs}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto px-5 pb-5 space-y-2">
                  <button
                    onClick={() => handleOpenDesigner(design)}
                    className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm text-white transition-colors ${
                      design.tier === 'premium'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : design.tier === 'confort'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {t('autoDesign.openDesigner', 'Ouvrir dans le Designer 3D')}
                  </button>
                  <button
                    onClick={() => handleExportPDF(design)}
                    className="w-full px-4 py-2 rounded-lg font-medium text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('autoDesign.exportPDF', 'Exporter en PDF')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/questionnaire/budget')}
            className="px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            {t('autoDesign.backToQuestionnaire', 'Retour au questionnaire')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoDesignResults;
