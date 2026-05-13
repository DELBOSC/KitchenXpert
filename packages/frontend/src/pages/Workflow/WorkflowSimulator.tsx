import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Position3D {
  x: number;
  y: number;
  z: number;
}

interface SimulationStep {
  stepNumber: number;
  action: string;
  fromZone: string;
  toZone: string;
  distanceM: number;
  timeSeconds: number;
  position3D: { from: Position3D; to: Position3D };
}

interface Bottleneck {
  description: string;
  position: Position3D;
  suggestion: string;
}

interface SimulationResult {
  id: string;
  scenario: string;
  steps: SimulationStep[];
  totalDistanceM: number;
  totalTimeMinutes: number;
  efficiencyScore: number;
  bottlenecks: Bottleneck[];
  zoneUsage: Record<string, number>;
}

interface OptimizationSuggestion {
  item: string;
  currentZone: string;
  suggestedZone: string;
  currentPosition: Position3D;
  suggestedPosition: Position3D;
  distanceSaved: number;
  percentImprovement: number;
  description: string;
}

interface OptimizationResult {
  simulationId: string;
  suggestions: OptimizationSuggestion[];
  currentTotalDistance: number;
  optimizedTotalDistance: number;
  percentImprovement: number;
}

interface ScenarioDefinition {
  key: string;
  name: string;
  description: string;
  stepsRange: { min: number; max: number };
}

interface Kitchen {
  id: string;
  name: string;
  style: string;
  layout: string;
  width: number;
  length: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SCENARIO_ICONS: Record<string, string> = {
  dinner_for_6: '\uD83C\uDF7D\uFE0F',
  quick_breakfast: '\u2615',
  meal_prep: '\uD83E\uDD58',
  baking: '\uD83C\uDF82',
};

const ZONE_LABELS: Record<string, string> = {
  fridge: 'Frigo',
  sink: 'Evier',
  countertop: 'Plan de travail',
  hob: 'Plaque',
  oven: 'Four',
  storage: 'Rangement',
  island: 'Ilot',
  dishwasher: 'Lave-vaisselle',
};

const ZONE_COLORS: Record<string, string> = {
  fridge: '#3b82f6',
  sink: '#06b6d4',
  countertop: '#8b5cf6',
  hob: '#ef4444',
  oven: '#f97316',
  storage: '#84cc16',
  island: '#ec4899',
  dishwasher: '#14b8a6',
};

// ─── Distance color helpers ─────────────────────────────────────────────────

function getDistanceColor(distanceM: number): string {
  if (distanceM <= 1.5) {return 'text-green-600 dark:text-green-400';}
  if (distanceM <= 3.0) {return 'text-yellow-600 dark:text-yellow-400';}
  return 'text-red-500 dark:text-red-400';
}

function getDistanceBgColor(distanceM: number): string {
  if (distanceM <= 1.5) {return 'bg-green-100 dark:bg-green-900/30';}
  if (distanceM <= 3.0) {return 'bg-yellow-100 dark:bg-yellow-900/30';}
  return 'bg-red-100 dark:bg-red-900/30';
}

function getScoreColor(score: number): string {
  if (score >= 80) {return 'text-green-600 dark:text-green-400';}
  if (score >= 60) {return 'text-yellow-600 dark:text-yellow-400';}
  if (score >= 40) {return 'text-orange-500 dark:text-orange-400';}
  return 'text-red-500 dark:text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) {return 'bg-green-500';}
  if (score >= 60) {return 'bg-yellow-500';}
  if (score >= 40) {return 'bg-orange-500';}
  return 'bg-red-500';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WorkflowSimulator(): React.ReactElement {
  const { kitchenId: urlKitchenId } = useParams<{ kitchenId?: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();

  // State
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [selectedKitchenId, setSelectedKitchenId] = useState<string>(urlKitchenId || '');
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [isLoadingKitchens, setIsLoadingKitchens] = useState(true);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const mountedRef = useRef(true);

  // ─── Load user's kitchens ───────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    const loadKitchens = async (): Promise<void> => {
      try {
        setIsLoadingKitchens(true);
        const response = await fetch('/api/v1/kitchens', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load kitchens');
        }

        const data = await response.json();
        if (mountedRef.current && data.success) {
          const kitchenList = data.data?.kitchens || data.data || [];
          setKitchens(kitchenList);

          // Pre-select kitchen from URL if not already set
          if (urlKitchenId && kitchenList.some((k: Kitchen) => k.id === urlKitchenId)) {
            setSelectedKitchenId(urlKitchenId);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        if (mountedRef.current) {
          setError(t('workflow.errorLoadingKitchens', 'Erreur lors du chargement des cuisines'));
        }
      } finally {
        if (mountedRef.current) {setIsLoadingKitchens(false);}
      }
    };

    loadKitchens();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [urlKitchenId, retryCount, t]);

  // ─── Load scenarios ───────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    const loadScenarios = async (): Promise<void> => {
      try {
        setIsLoadingScenarios(true);
        const response = await fetch('/api/v1/workflow-simulation/scenarios', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load scenarios');
        }

        const data = await response.json();
        if (mountedRef.current && data.success) {
          setScenarios(data.data || []);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        if (mountedRef.current) {
          setError(t('workflow.errorLoadingScenarios', 'Erreur lors du chargement des scenarios'));
        }
      } finally {
        if (mountedRef.current) {setIsLoadingScenarios(false);}
      }
    };

    loadScenarios();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [retryCount, t]);

  // ─── Load history when kitchen changes ────────────────────────────────────

  useEffect(() => {
    if (!selectedKitchenId) {return;}

    mountedRef.current = true;
    const controller = new AbortController();

    const loadHistory = async (): Promise<void> => {
      try {
        setIsLoadingHistory(true);
        const response = await fetch(
          `/api/v1/workflow-simulation/history/${selectedKitchenId}`,
          {
            credentials: 'include',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error('Failed to load history');
        }

        const data = await response.json();
        if (mountedRef.current && data.success) {
          setHistory(data.data || []);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        // Non-critical: silently ignore
      } finally {
        if (mountedRef.current) {setIsLoadingHistory(false);}
      }
    };

    loadHistory();

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, [selectedKitchenId, simulation]);

  // ─── Simulate ────────────────────────────────────────────────────────────

  const handleSimulate = useCallback(async (): Promise<void> => {
    if (!selectedKitchenId || !selectedScenario) {return;}

    setError(null);
    setSimulation(null);
    setOptimization(null);
    setIsSimulating(true);

    try {
      const response = await fetch('/api/v1/workflow-simulation/simulate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kitchenId: selectedKitchenId,
          scenario: selectedScenario,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Simulation failed');
      }

      const data = await response.json();
      if (data.success) {
        setSimulation(data.data);
      } else {
        throw new Error(data.error || 'Simulation failed');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('workflow.simulationError', 'Erreur lors de la simulation'),
      );
    } finally {
      setIsSimulating(false);
    }
  }, [selectedKitchenId, selectedScenario, t]);

  // ─── Optimize ────────────────────────────────────────────────────────────

  const handleOptimize = useCallback(async (): Promise<void> => {
    if (!simulation) {return;}

    setOptimization(null);
    setIsOptimizing(true);

    try {
      const response = await fetch('/api/v1/workflow-simulation/optimize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulationId: simulation.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Optimization failed');
      }

      const data = await response.json();
      if (data.success) {
        setOptimization(data.data);
      } else {
        throw new Error(data.error || 'Optimization failed');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('workflow.optimizationError', 'Erreur lors de l\'optimisation'),
      );
    } finally {
      setIsOptimizing(false);
    }
  }, [simulation, t]);

  // ─── Retry handler ───────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount((c) => c + 1);
  }, []);

  // ─── Render helpers ──────────────────────────────────────────────────────

  const isLoading = isLoadingKitchens || isLoadingScenarios;
  const canSimulate = selectedKitchenId && selectedScenario && !isSimulating;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('workflow.title', 'Simulation de workflow')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t(
              'workflow.subtitle',
              'Simulez un parcours de cuisine et optimisez votre agencement pour plus d\'efficacite.',
            )}
          </p>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-start justify-between">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              <button
                onClick={handleRetry}
                className="ml-4 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                {t('common.retry', 'Reessayer')}
              </button>
            </div>
          </div>
        )}

        {/* Kitchen selector */}
        <section className="mb-8">
          <label
            htmlFor="kitchen-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t('workflow.selectKitchen', 'Selectionner une cuisine')}
          </label>
          <select
            id="kitchen-select"
            value={selectedKitchenId}
            onChange={(e) => {
              setSelectedKitchenId(e.target.value);
              setSimulation(null);
              setOptimization(null);
            }}
            className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">
              {t('workflow.chooseKitchen', '-- Choisir une cuisine --')}
            </option>
            {kitchens.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.style} - {k.layout})
              </option>
            ))}
          </select>
          {kitchens.length === 0 && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t(
                'workflow.noKitchens',
                'Aucune cuisine trouvee. Creez d\'abord un projet avec une cuisine.',
              )}
            </p>
          )}
        </section>

        {/* Scenario cards */}
        {selectedKitchenId && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('workflow.chooseScenario', 'Choisir un scenario')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.key}
                  onClick={() => setSelectedScenario(scenario.key)}
                  className={`text-left rounded-xl border-2 p-5 transition-all ${
                    selectedScenario === scenario.key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                  }`}
                >
                  <div className="text-3xl mb-3">
                    {SCENARIO_ICONS[scenario.key] || '\uD83C\uDF73'}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                    {scenario.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {scenario.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {scenario.stepsRange.min}-{scenario.stepsRange.max}{' '}
                    {t('workflow.steps', 'etapes')}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Simulate button */}
        {selectedKitchenId && selectedScenario && (
          <section className="mb-8">
            <button
              onClick={handleSimulate}
              disabled={!canSimulate}
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSimulating ? (
                <>
                  <LoadingSpinner />
                  {t('workflow.simulating', 'Simulation en cours...')}
                </>
              ) : (
                t('workflow.simulate', 'Simuler')
              )}
            </button>
          </section>
        )}

        {/* Results */}
        {simulation && (
          <div className="space-y-8">
            {/* Summary stats */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('workflow.results', 'Resultats')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total distance */}
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('workflow.totalDistance', 'Distance totale')}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {simulation.totalDistanceM.toFixed(1)}
                    <span className="text-base font-normal ml-1">m</span>
                  </p>
                </div>

                {/* Total time */}
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('workflow.totalTime', 'Temps total')}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {simulation.totalTimeMinutes.toFixed(1)}
                    <span className="text-base font-normal ml-1">min</span>
                  </p>
                </div>

                {/* Efficiency score */}
                <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('workflow.efficiencyScore', 'Score d\'efficacite')}
                  </p>
                  <div className="flex items-end gap-2 mt-1">
                    <p
                      className={`text-3xl font-bold ${getScoreColor(simulation.efficiencyScore)}`}
                    >
                      {simulation.efficiencyScore}
                      <span className="text-base font-normal">/100</span>
                    </p>
                  </div>
                  {/* Score bar */}
                  <div className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getScoreBgColor(simulation.efficiencyScore)}`}
                      style={{ width: `${simulation.efficiencyScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2D Path visualization */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('workflow.pathVisualization', 'Parcours (vue de dessus)')}
              </h2>
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 overflow-hidden">
                <KitchenPathView simulation={simulation} />
              </div>
            </section>

            {/* Step-by-step timeline */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('workflow.timeline', 'Etapes du parcours')} ({simulation.steps.length})
              </h2>
              <div className="space-y-2">
                {simulation.steps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="flex items-start gap-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4"
                  >
                    {/* Step number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                      {step.stepNumber}
                    </div>

                    {/* Action description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {step.action}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium"
                          style={{ backgroundColor: ZONE_COLORS[step.fromZone] || '#6b7280' }}
                        >
                          {ZONE_LABELS[step.fromZone] || step.fromZone}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium"
                          style={{ backgroundColor: ZONE_COLORS[step.toZone] || '#6b7280' }}
                        >
                          {ZONE_LABELS[step.toZone] || step.toZone}
                        </span>
                      </div>
                    </div>

                    {/* Distance badge */}
                    <div className="flex-shrink-0 text-right">
                      <span
                        className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${getDistanceColor(step.distanceM)} ${getDistanceBgColor(step.distanceM)}`}
                      >
                        {step.distanceM.toFixed(1)}m
                      </span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {step.timeSeconds}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Zone usage heatmap */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t('workflow.zoneUsage', 'Utilisation des zones')}
              </h2>
              <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
                <ZoneUsageChart zoneUsage={simulation.zoneUsage} />
              </div>
            </section>

            {/* Bottleneck alerts */}
            {simulation.bottlenecks.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('workflow.bottlenecks', 'Points de congestion')} (
                  {simulation.bottlenecks.length})
                </h2>
                <div className="space-y-3">
                  {simulation.bottlenecks.map((bottleneck, i) => (
                    <div
                      key={i}
                      className="rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10 p-4"
                    >
                      <p className="font-medium text-red-800 dark:text-red-300 text-sm">
                        {bottleneck.description}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {bottleneck.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Optimize button */}
            <section>
              <button
                onClick={handleOptimize}
                disabled={isOptimizing}
                className="px-8 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isOptimizing ? (
                  <>
                    <LoadingSpinner />
                    {t('workflow.optimizing', 'Optimisation en cours...')}
                  </>
                ) : (
                  t('workflow.optimize', 'Optimiser')
                )}
              </button>
            </section>

            {/* Optimization suggestions */}
            {optimization && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('workflow.optimizationSuggestions', 'Suggestions d\'optimisation')}
                </h2>

                {/* Summary */}
                <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4">
                  <p className="text-emerald-800 dark:text-emerald-300 font-medium">
                    {t('workflow.optimizationSummary', 'Distance optimisee')}: {optimization.optimizedTotalDistance.toFixed(1)}m
                    ({optimization.percentImprovement > 0 ? '-' : ''}{optimization.percentImprovement}%)
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <span>
                      {t('workflow.before', 'Avant')}: {optimization.currentTotalDistance.toFixed(1)}m
                    </span>
                    <span>&rarr;</span>
                    <span>
                      {t('workflow.after', 'Apres')}: {optimization.optimizedTotalDistance.toFixed(1)}m
                    </span>
                  </div>
                </div>

                {/* Suggestion cards */}
                <div className="space-y-3">
                  {optimization.suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {suggestion.description}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {ZONE_LABELS[suggestion.currentZone] || suggestion.currentZone}
                            {' '}&rarr;{' '}
                            {ZONE_LABELS[suggestion.suggestedZone] || suggestion.suggestedZone}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                            -{suggestion.distanceSaved.toFixed(1)}m
                          </span>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            -{suggestion.percentImprovement}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* History toggle */}
        {selectedKitchenId && history.length > 0 && (
          <section className="mt-8">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showHistory
                ? t('workflow.hideHistory', 'Masquer l\'historique')
                : t('workflow.showHistory', `Voir l'historique (${history.length})`)}
            </button>

            {showHistory && (
              <div className="mt-4 space-y-3">
                {history.map((sim) => (
                  <div
                    key={sim.id}
                    className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {scenarios.find((s) => s.key === sim.scenario)?.name || sim.scenario}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {sim.steps.length} {t('workflow.steps', 'etapes')} &middot;{' '}
                        {sim.totalDistanceM.toFixed(1)}m &middot;{' '}
                        {sim.totalTimeMinutes.toFixed(1)} min
                      </p>
                    </div>
                    <span
                      className={`text-lg font-bold ${getScoreColor(sim.efficiencyScore)}`}
                    >
                      {sim.efficiencyScore}/100
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Kitchen 2D Path Visualization ──────────────────────────────────────────

interface KitchenPathViewProps {
  simulation: SimulationResult;
}

function KitchenPathView({ simulation }: KitchenPathViewProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const PADDING = 40;

    // Clear
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Find bounds of all positions
    const allPositions = simulation.steps.flatMap((s) => [s.position3D.from, s.position3D.to]);

    if (allPositions.length === 0) {return;}

    const minX = Math.min(...allPositions.map((p) => p.x));
    const maxX = Math.max(...allPositions.map((p) => p.x));
    const minZ = Math.min(...allPositions.map((p) => p.z));
    const maxZ = Math.max(...allPositions.map((p) => p.z));

    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;

    const scaleX = (WIDTH - 2 * PADDING) / rangeX;
    const scaleZ = (HEIGHT - 2 * PADDING) / rangeZ;
    const scale = Math.min(scaleX, scaleZ);

    const offsetX = (WIDTH - rangeX * scale) / 2;
    const offsetZ = (HEIGHT - rangeZ * scale) / 2;

    const toCanvasX = (x: number) => offsetX + (x - minX) * scale;
    const toCanvasZ = (z: number) => offsetZ + (z - minZ) * scale;

    // Draw kitchen outline
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(PADDING / 2, PADDING / 2, WIDTH - PADDING, HEIGHT - PADDING);

    // Draw paths
    for (let i = 0; i < simulation.steps.length; i++) {
      const step = simulation.steps[i]!;
      const fromX = toCanvasX(step.position3D.from.x);
      const fromZ = toCanvasZ(step.position3D.from.z);
      const toX = toCanvasX(step.position3D.to.x);
      const toZ = toCanvasZ(step.position3D.to.z);

      // Color based on distance
      let color: string;
      if (step.distanceM <= 1.5) {color = '#22c55e';}
      else if (step.distanceM <= 3.0) {color = '#eab308';}
      else {color = '#ef4444';}

      // Draw line
      ctx.beginPath();
      ctx.moveTo(fromX, fromZ);
      ctx.lineTo(toX, toZ);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Draw arrow head
      const angle = Math.atan2(toZ - fromZ, toX - fromX);
      const arrowLen = 8;
      ctx.beginPath();
      ctx.moveTo(toX, toZ);
      ctx.lineTo(
        toX - arrowLen * Math.cos(angle - Math.PI / 6),
        toZ - arrowLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(toX, toZ);
      ctx.lineTo(
        toX - arrowLen * Math.cos(angle + Math.PI / 6),
        toZ - arrowLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw zone markers
    const drawnZones = new Map<string, { x: number; z: number }>();
    for (const step of simulation.steps) {
      if (!drawnZones.has(step.fromZone)) {
        drawnZones.set(step.fromZone, {
          x: toCanvasX(step.position3D.from.x),
          z: toCanvasZ(step.position3D.from.z),
        });
      }
      if (!drawnZones.has(step.toZone)) {
        drawnZones.set(step.toZone, {
          x: toCanvasX(step.position3D.to.x),
          z: toCanvasZ(step.position3D.to.z),
        });
      }
    }

    for (const [zone, pos] of drawnZones.entries()) {
      const zoneColor = ZONE_COLORS[zone] || '#6b7280';

      // Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.z, 14, 0, Math.PI * 2);
      ctx.fillStyle = zoneColor;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = (ZONE_LABELS[zone] || zone).substring(0, 5);
      ctx.fillText(label, pos.x, pos.z);
    }

    // Draw step numbers at midpoints
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const step of simulation.steps) {
      const midX =
        (toCanvasX(step.position3D.from.x) + toCanvasX(step.position3D.to.x)) / 2;
      const midZ =
        (toCanvasZ(step.position3D.from.z) + toCanvasZ(step.position3D.to.z)) / 2;
      ctx.fillText(String(step.stepNumber), midX, midZ - 4);
    }

    // Draw bottleneck markers
    for (const bottleneck of simulation.bottlenecks) {
      const bx = toCanvasX(bottleneck.position.x);
      const bz = toCanvasZ(bottleneck.position.z);

      ctx.beginPath();
      ctx.arc(bx, bz, 18, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Exclamation mark
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', bx, bz);
    }
  }, [simulation]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="w-full h-auto max-h-[400px] mx-auto"
      style={{ imageRendering: 'auto' }}
    />
  );
}

// ─── Zone Usage Bar Chart ───────────────────────────────────────────────────

interface ZoneUsageChartProps {
  zoneUsage: Record<string, number>;
}

function ZoneUsageChart({ zoneUsage }: ZoneUsageChartProps): React.ReactElement {
  const sortedZones = Object.entries(zoneUsage).sort(([, a], [, b]) => b - a);
  const maxCount = sortedZones.length > 0 ? sortedZones[0]![1] : 1;

  return (
    <div className="space-y-3">
      {sortedZones.map(([zone, count]) => {
        const percentage = (count / maxCount) * 100;
        const color = ZONE_COLORS[zone] || '#6b7280';

        return (
          <div key={zone} className="flex items-center gap-3">
            <span className="w-28 text-sm text-gray-700 dark:text-gray-300 text-right truncate">
              {ZONE_LABELS[zone] || zone}
            </span>
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                  minWidth: '2rem',
                }}
              />
            </div>
            <span className="w-10 text-sm text-gray-600 dark:text-gray-400 text-right font-medium">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
