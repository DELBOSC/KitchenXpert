import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import { AIAssistant, SmartPlacement, type KitchenEngine, ModelLoader, AddObjectCommand, BatchCommand, AccessibilityChecker , type ConfigurationScore, type Suggestion, type PlacedItem3D, type RoomConfig, type AutoCompleteResult, type AccessibilityScore, type AccessibilityViolation } from '@kitchenxpert/3d-engine';



interface AIAssistantPanelProps {
  engine: KitchenEngine | null;
  onOpenProposals?: () => void;
}

interface ScoreDisplayProps {
  label: string;
  value: number;
  color: string;
  size?: 'lg' | 'sm';
}

function CircularProgress({ label, value, color, size = 'sm' }: ScoreDisplayProps): React.ReactElement {
  const radius = size === 'lg' ? 36 : 24;
  const strokeWidth = size === 'lg' ? 5 : 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize}
          height={svgSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-bold text-gray-800 dark:text-gray-200 ${size === 'lg' ? 'text-lg' : 'text-xs'}`}
          >
            {value}
          </span>
        </div>
      </div>
      <span
        className={`text-center leading-tight ${
          size === 'lg' ? 'text-xs font-medium text-gray-700 dark:text-gray-300' : 'text-[10px] text-gray-500 dark:text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function SuggestionIcon({ type }: { type: Suggestion['type'] }): React.ReactElement {
  switch (type) {
    case 'warning':
      return (
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      );
    case 'info':
      return (
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      );
    case 'improvement':
      return (
        <svg className="w-4 h-4 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      );
  }
}

function getScoreColor(value: number): string {
  if (value >= 80) {return '#22c55e';} // green-500
  if (value >= 60) {return '#eab308';} // yellow-500
  if (value >= 40) {return '#f97316';} // orange-500
  return '#ef4444'; // red-500
}

function getPriorityBadge(priority: number, t: (key: string, defaultValue: string) => string): React.ReactElement | null {
  if (priority <= 1) {
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded">
        {t('designer.ai.urgent', 'URGENT')}
      </span>
    );
  }
  if (priority <= 2) {
    return (
      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded">
        {t('designer.ai.important', 'IMPORTANT')}
      </span>
    );
  }
  return null;
}

/**
 * Extract PlacedItem3D data from the engine scene for AI analysis
 */
function extractPlacedItems(engine: KitchenEngine): PlacedItem3D[] {
  const items: PlacedItem3D[] = [];
  const scene = engine.scene.getThreeScene();

  scene.traverse((child) => {
    if (!child.userData.id || child.userData.type === 'wall' || child.userData.type === 'floor') {
      return;
    }

    const box = new THREE.Box3().setFromObject(child);
    const size = box.getSize(new THREE.Vector3());

    items.push({
      id: child.userData.id,
      type: child.userData.type || 'unknown',
      position: child.position.clone(),
      rotation: child.rotation.y,
      dimensions: {
        width: child.userData.dimensions?.width || size.x,
        height: child.userData.dimensions?.height || size.y,
        depth: child.userData.dimensions?.depth || size.z,
      },
      productId: child.userData.catalogId,
      price: child.userData.price,
    });
  });

  return items;
}

/**
 * Extract room configuration from the engine
 */
function extractRoomConfig(engine: KitchenEngine): RoomConfig {
  const walls: THREE.Object3D[] = [];
  engine.scene.getThreeScene().traverse((child) => {
    if (child.userData.type === 'wall') {
      walls.push(child);
    }
  });

  return {
    width: engine.roomWidth,
    depth: engine.roomDepth,
    height: engine.roomHeight,
    walls,
  };
}

export default function AIAssistantPanel({ engine, onOpenProposals }: AIAssistantPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [score, setScore] = useState<ConfigurationScore | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const aiAssistantRef = useRef<AIAssistant | null>(null);
  const smartPlacementRef = useRef<SmartPlacement | null>(null);
  const modelLoaderRef = useRef<ModelLoader>(new ModelLoader());

  // Initialize/update AI refs when engine (and its brandProfile) becomes available
  useEffect(() => {
    if (engine) {
      aiAssistantRef.current = new AIAssistant(engine.brandProfile);
      smartPlacementRef.current = new SmartPlacement(engine.brandProfile);
    }
  }, [engine]);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [autoCompleteResult, setAutoCompleteResult] = useState<AutoCompleteResult | null>(null);
  const [pmrMode, setPmrMode] = useState(false);
  const [pmrScore, setPmrScore] = useState<AccessibilityScore | null>(null);

  const runAnalysis = useCallback(() => {
    if (!engine || !aiAssistantRef.current) {return;}

    setIsAnalyzing(true);

    // Use requestAnimationFrame to avoid blocking the UI
    requestAnimationFrame(() => {
      const ai = aiAssistantRef.current!;
      const items = extractPlacedItems(engine);
      const room = extractRoomConfig(engine);

      const newScore = ai.scoreConfiguration(items, room);
      const newSuggestions = ai.getSuggestions(items, room);

      setScore(newScore);
      setSuggestions(newSuggestions);
      setIsAnalyzing(false);
      setHasAnalyzed(true);
    });
  }, [engine]);

  const runAutoComplete = useCallback(() => {
    if (!engine || !aiAssistantRef.current || !smartPlacementRef.current) {return;}

    setIsAutoCompleting(true);

    requestAnimationFrame(() => {
      const ai = aiAssistantRef.current!;
      const sp = smartPlacementRef.current!;
      const loader = modelLoaderRef.current;
      const items = extractPlacedItems(engine);
      const room = extractRoomConfig(engine);

      const result = ai.autoComplete(items, room, sp);
      setAutoCompleteResult(result);

      if (result.addedItems.length > 0) {
        // Create meshes and execute as a BatchCommand
        const commands: import('@kitchenxpert/3d-engine').Command[] = [];

        for (const item of result.addedItems) {
          const mesh = loader.createProceduralFallback(item.type, item.dimensions, 0xD4A574);
          mesh.position.copy(item.position);
          mesh.rotation.y = item.rotation;
          mesh.userData = {
            id: item.id,
            type: item.type,
            name: item.type,
            dimensions: item.dimensions,
          };

          commands.push(new AddObjectCommand(
            engine.scene.getThreeScene(),
            mesh,
            engine.scene.getAllObjects(),
            (o: THREE.Object3D) => engine.collisionSystem.addCollisionObject(o),
            (o: THREE.Object3D) => engine.collisionSystem.removeCollisionObject(o)
          ));
        }

        engine.history.execute(new BatchCommand(commands, 'Auto-complete IA'));
      }

      // Re-run analysis
      const newItems = extractPlacedItems(engine);
      const newScore = ai.scoreConfiguration(newItems, room);
      const newSuggestions = ai.getSuggestions(newItems, room);
      setScore(newScore);
      setSuggestions(newSuggestions);

      setIsAutoCompleting(false);
      setHasAnalyzed(true);
    });
  }, [engine]);

  const togglePmrMode = useCallback(() => {
    if (!engine) {return;}

    const newMode = !pmrMode;
    setPmrMode(newMode);

    if (newMode) {
      const items = extractPlacedItems(engine);
      const room = extractRoomConfig(engine);
      const accScore = engine.accessibilityChecker.checkAccessibility(items, room);
      setPmrScore(accScore);
      engine.enableAccessibilityMode(items, room);
    } else {
      engine.disableAccessibilityMode();
      setPmrScore(null);
    }
  }, [engine, pmrMode]);

  const scoreItems: { key: keyof Omit<ConfigurationScore, 'overall'>; label: string }[] = [
    { key: 'ergonomics', label: t('designer.ai.ergonomics', 'Ergonomie') },
    { key: 'storage', label: t('designer.ai.storage', 'Rangement') },
    { key: 'aesthetics', label: t('designer.ai.aesthetics', 'Esthetique') },
    { key: 'budgetEfficiency', label: t('designer.ai.budget', 'Budget') },
    { key: 'spaceUtilization', label: t('designer.ai.space', 'Espace') },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t('designer.ai.title', 'Assistant IA')}
          </h2>
        </div>

        <button
          onClick={runAnalysis}
          disabled={!engine || isAnalyzing}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
            isAnalyzing
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-400 cursor-wait'
              : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('designer.ai.analyzing', 'Analyse...')}
            </span>
          ) : (
            t('designer.ai.analyze', 'Analyser')
          )}
        </button>

        <button
          onClick={runAutoComplete}
          disabled={!engine || isAutoCompleting}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
            isAutoCompleting
              ? 'bg-green-100 dark:bg-green-900/40 text-green-400 cursor-wait'
              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isAutoCompleting ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('designer.ai.completing', 'Completion...')}
            </span>
          ) : (
            t('designer.ai.autoComplete', 'Completer IA')
          )}
        </button>

        <button
          onClick={togglePmrMode}
          disabled={!engine}
          className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
            pmrMode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={t('designer.ai.pmrTooltip', 'Verifier la conformite accessibilite PMR')}
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="4" r="2" />
              <path d="M12 6v6" />
              <path d="M9 12h6" />
              <circle cx="9" cy="19" r="3" />
              <path d="M12 12l3 7" />
              <path d="M12 12l-3 7" />
            </svg>
            {t('designer.ai.pmr', 'PMR')}
          </span>
        </button>

        {onOpenProposals && (
          <button
            onClick={onOpenProposals}
            disabled={!engine}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              {t('designer.ai.generateProposals', 'Propositions')}
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      {!hasAnalyzed ? (
        <div className="flex items-center justify-center py-8 px-4">
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
            {t(
              'designer.ai.prompt',
              'Cliquez sur "Analyser" pour evaluer votre configuration de cuisine.'
            )}
          </p>
        </div>
      ) : (
        <>
        <div className="flex gap-6 px-4 py-4">
          {/* Scores */}
          <div className="flex-shrink-0">
            <div className="flex items-start gap-6">
              {/* Overall score */}
              {score && (
                <CircularProgress
                  label={t('designer.ai.overall', 'Global')}
                  value={score.overall}
                  color={getScoreColor(score.overall)}
                  size="lg"
                />
              )}

              {/* Individual scores */}
              <div className="grid grid-cols-5 gap-3">
                {score &&
                  scoreItems.map((item) => (
                    <CircularProgress
                      key={item.key as string}
                      label={item.label}
                      value={score[item.key]}
                      color={getScoreColor(score[item.key])}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('designer.ai.suggestions', 'Suggestions')} ({suggestions.length})
            </h3>

            {suggestions.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('designer.ai.noSuggestions', 'Aucune suggestion. Votre configuration est optimale !')}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <SuggestionIcon type={suggestion.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                          {suggestion.message}
                        </span>
                        {getPriorityBadge(suggestion.priority, t)}
                      </div>
                      {suggestion.detail && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                          {suggestion.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

          {/* Auto-complete result */}
          {autoCompleteResult && autoCompleteResult.addedItems.length > 0 && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span className="text-xs text-green-700 dark:text-green-400">
                  {autoCompleteResult.message}
                </span>
              </div>
            </div>
          )}

          {/* PMR Accessibility Score */}
          {pmrMode && pmrScore && (
            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="4" r="2" />
                  <path d="M12 6v6" />
                  <path d="M9 12h6" />
                  <circle cx="9" cy="19" r="3" />
                  <path d="M12 12l3 7" />
                  <path d="M12 12l-3 7" />
                </svg>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t('designer.ai.pmrTitle', 'Accessibilite PMR')}
                </h3>
                <span className={`ml-auto px-2 py-0.5 text-[10px] font-bold rounded ${
                  pmrScore.compliant
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                }`}>
                  {pmrScore.compliant
                    ? t('designer.ai.pmrCompliant', 'CONFORME')
                    : t('designer.ai.pmrNonCompliant', 'NON CONFORME')}
                </span>
              </div>

              {/* PMR sub-scores */}
              <div className="flex items-start gap-4 mb-3">
                <CircularProgress
                  label={t('designer.ai.pmrOverall', 'PMR')}
                  value={pmrScore.overall}
                  color={getScoreColor(pmrScore.overall)}
                  size="lg"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <CircularProgress
                    label={t('designer.ai.pmrClearances', 'Passages')}
                    value={pmrScore.clearances}
                    color={getScoreColor(pmrScore.clearances)}
                  />
                  <CircularProgress
                    label={t('designer.ai.pmrHeights', 'Hauteurs')}
                    value={pmrScore.heights}
                    color={getScoreColor(pmrScore.heights)}
                  />
                  <CircularProgress
                    label={t('designer.ai.pmrReach', 'Accessib.')}
                    value={pmrScore.reachability}
                    color={getScoreColor(pmrScore.reachability)}
                  />
                  <CircularProgress
                    label={t('designer.ai.pmrSafety', 'Securite')}
                    value={pmrScore.safety}
                    color={getScoreColor(pmrScore.safety)}
                  />
                </div>
              </div>

              {/* PMR violations */}
              {pmrScore.violations.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {pmrScore.violations.map((violation: AccessibilityViolation) => (
                    <div
                      key={violation.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-750"
                    >
                      <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                        violation.severity === 'critical' ? 'bg-red-500' :
                        violation.severity === 'major' ? 'bg-amber-500' : 'bg-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-gray-400">{violation.ruleId}</span>
                          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                            {violation.message}
                          </span>
                          <span className={`px-1 py-0.5 text-[9px] font-bold rounded uppercase ${
                            violation.severity === 'critical'
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                              : violation.severity === 'major'
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                          }`}>
                            {violation.severity}
                          </span>
                        </div>
                        {violation.fix && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {violation.fix}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
