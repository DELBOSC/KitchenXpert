/**
 * GuidedTourPanel (F15: Guided VR Walkthrough Tour)
 *
 * Panel for the 3D designer that provides guided tour controls:
 * - "Visite guidee" button in toolbar
 * - Tour type selector: "Triangle de travail" / "Tour complet"
 * - Play/Pause/Stop controls (transport bar)
 * - Progress bar with waypoint dots
 * - Current annotation display (text + icon)
 * - Next/Previous buttons
 * - Speed control (0.5x, 1x, 2x)
 * - "Activer VR" toggle to switch to VR mode during tour
 * - i18n, dark mode, responsive
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { GuidedWalkthrough, WalkthroughState, Waypoint } from '@kitchenxpert/3d-engine';

// ────────────────────────────── Types ──────────────────────────────

interface GuidedTourPanelProps {
  /** The GuidedWalkthrough instance from the 3D engine */
  walkthrough: GuidedWalkthrough | null;
  /** Whether VR mode is currently active */
  vrActive?: boolean;
  /** Callback to toggle VR mode */
  onToggleVR?: () => void;
  /** Whether VR is available on this device */
  vrAvailable?: boolean;
  /** Callback when the panel is closed */
  onClose?: () => void;
  /** Kitchen items for generating tours */
  kitchenItems?: Array<{
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number; z: number };
  }>;
  /** Room dimensions for generating tours */
  roomDimensions?: { width: number; depth: number; height: number };
}

type TourType = 'work-triangle' | 'full-tour';

interface AnnotationDisplay {
  text: string;
  type: 'info' | 'warning' | 'tip';
}

// ────────────────────────────── Speed Options ──────────────────────────────

const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5x' },
  { value: 1.0, label: '1x' },
  { value: 2.0, label: '2x' },
];

// ────────────────────────────── Annotation Icons ──────────────────────────────

const ANNOTATION_ICONS: Record<string, React.ReactNode> = {
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  tip: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

const ANNOTATION_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  tip: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
};

// ────────────────────────────── Component ──────────────────────────────

export default function GuidedTourPanel({
  walkthrough,
  vrActive = false,
  onToggleVR,
  vrAvailable = false,
  onClose,
  kitchenItems = [],
  roomDimensions = { width: 4, depth: 3, height: 2.5 },
}: GuidedTourPanelProps): React.ReactElement {
  const { t } = useTranslation();

  // State
  const [tourType, setTourType] = useState<TourType>('work-triangle');
  const [state, setState] = useState<WalkthroughState>('idle');
  const [progress, setProgress] = useState(0);
  const [currentWaypoint, setCurrentWaypoint] = useState(0);
  const [totalWaypoints, setTotalWaypoints] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [annotation, setAnnotation] = useState<AnnotationDisplay | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Ref for animation frame
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // ─── Event listeners ───
  useEffect(() => {
    if (!walkthrough) {return;}

    const handleStateChange = ({ state: newState }: { state: WalkthroughState }) => {
      setState(newState);
    };

    const handleProgress = ({
      progress: p,
      currentWaypoint: cw,
      totalWaypoints: tw,
    }: {
      progress: number;
      currentWaypoint: number;
      totalWaypoints: number;
    }) => {
      setProgress(p);
      setCurrentWaypoint(cw);
      setTotalWaypoints(tw);
    };

    const handleAnnotationShow = ({
      text,
      type,
    }: {
      text: string;
      type: string;
      index: number;
    }) => {
      setAnnotation({ text, type: type as 'info' | 'warning' | 'tip' });
    };

    const handleAnnotationHide = () => {
      setAnnotation(null);
    };

    const handleComplete = () => {
      setAnnotation(null);
    };

    walkthrough.on('stateChange', handleStateChange);
    walkthrough.on('progress', handleProgress);
    walkthrough.on('annotationShow', handleAnnotationShow);
    walkthrough.on('annotationHide', handleAnnotationHide);
    walkthrough.on('complete', handleComplete);

    return () => {
      walkthrough.off('stateChange', handleStateChange);
      walkthrough.off('progress', handleProgress);
      walkthrough.off('annotationShow', handleAnnotationShow);
      walkthrough.off('annotationHide', handleAnnotationHide);
      walkthrough.off('complete', handleComplete);
    };
  }, [walkthrough]);

  // ─── Animation loop for update calls ───
  useEffect(() => {
    if (!walkthrough) {return;}

    const animate = (time: number) => {
      const delta = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 1 / 60;
      lastTimeRef.current = time;

      walkthrough.update(delta);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    if (state === 'playing' || state === 'at_annotation') {
      lastTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [walkthrough, state]);

  // ─── Generate and start tour ───
  const handleStartTour = useCallback(() => {
    if (!walkthrough) {return;}

    // Convert kitchen items to the format expected by GuidedWalkthrough
    const items = kitchenItems.map((item) => ({
      ...item,
      position: { x: item.position.x, y: item.position.y, z: item.position.z },
    }));

    // We need THREE.Vector3 instances, but since we're calling the walkthrough
    // from the frontend, we create simple waypoints here. The actual THREE.Vector3
    // conversion happens in the engine.
    let waypoints: Waypoint[];

    if (tourType === 'work-triangle') {
      waypoints = walkthrough.generateWorkTriangleTour(
        items.map((i) => ({
          ...i,
          position: new (window as any).THREE.Vector3(i.position.x, i.position.y, i.position.z),
        }))
      );
    } else {
      waypoints = walkthrough.generateFullTour(
        items.map((i) => ({
          ...i,
          position: new (window as any).THREE.Vector3(i.position.x, i.position.y, i.position.z),
        })),
        roomDimensions
      );
    }

    setTotalWaypoints(waypoints.length);
    setCurrentWaypoint(0);
    setProgress(0);
    setAnnotation(null);

    walkthrough.play(waypoints);
  }, [walkthrough, tourType, kitchenItems, roomDimensions]);

  // ─── Controls ───
  const handlePlayPause = useCallback(() => {
    if (!walkthrough) {return;}

    if (state === 'playing' || state === 'at_annotation') {
      walkthrough.pause();
    } else if (state === 'paused') {
      walkthrough.play();
    } else {
      handleStartTour();
    }
  }, [walkthrough, state, handleStartTour]);

  const handleStop = useCallback(() => {
    if (!walkthrough) {return;}
    walkthrough.stop();
    setAnnotation(null);
    setProgress(0);
    setCurrentWaypoint(0);
  }, [walkthrough]);

  const handleNext = useCallback(() => {
    walkthrough?.next();
  }, [walkthrough]);

  const handlePrevious = useCallback(() => {
    walkthrough?.previous();
  }, [walkthrough]);

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      walkthrough?.setSpeed(newSpeed);
    },
    [walkthrough]
  );

  const isActive = state !== 'idle';

  // ────────────────────────────── RENDER ──────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
        >
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {t('tour.title', 'Visite guidee')}
          <svg
            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Tour type selector */}
          {!isActive && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {t('tour.type', 'Type de visite')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTourType('work-triangle')}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    tourType === 'work-triangle'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-medium'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('tour.workTriangle', 'Triangle de travail')}
                </button>
                <button
                  onClick={() => setTourType('full-tour')}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    tourType === 'full-tour'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-medium'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('tour.fullTour', 'Tour complet')}
                </button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {isActive && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>
                  {t('tour.waypoint', 'Point')} {currentWaypoint + 1}/{totalWaypoints}
                </span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {/* Waypoint dots */}
              {totalWaypoints > 0 && (
                <div className="flex items-center justify-between mt-1 px-0.5">
                  {Array.from({ length: totalWaypoints }, (_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i < currentWaypoint
                          ? 'bg-blue-500 dark:bg-blue-400'
                          : i === currentWaypoint
                          ? 'bg-blue-600 dark:bg-blue-300 ring-2 ring-blue-200 dark:ring-blue-700'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Annotation display */}
          {annotation && (
            <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${ANNOTATION_COLORS[annotation.type] || ANNOTATION_COLORS.info}`}>
              <span className="flex-shrink-0 mt-0.5">
                {ANNOTATION_ICONS[annotation.type]}
              </span>
              <p className="text-sm leading-snug">{annotation.text}</p>
            </div>
          )}

          {/* Transport controls */}
          <div className="flex items-center justify-center gap-2">
            {/* Previous */}
            <button
              onClick={handlePrevious}
              disabled={!isActive || currentWaypoint === 0}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t('tour.previous', 'Previous')}
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Stop */}
            <button
              onClick={handleStop}
              disabled={!isActive}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t('tour.stop', 'Stop')}
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              disabled={!walkthrough}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={
                state === 'playing' || state === 'at_annotation'
                  ? t('tour.pause', 'Pause')
                  : t('tour.play', 'Play')
              }
            >
              {state === 'playing' || state === 'at_annotation' ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleNext}
              disabled={!isActive || currentWaypoint >= totalWaypoints - 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label={t('tour.next', 'Next')}
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Speed control */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('tour.speed', 'Vitesse')}
            </label>
            <div className="flex items-center gap-1">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSpeedChange(option.value)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                    speed === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* VR Toggle */}
          {vrAvailable && onToggleVR && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                onClick={onToggleVR}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  vrActive
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {vrActive
                  ? t('tour.disableVR', 'Desactiver VR')
                  : t('tour.enableVR', 'Activer VR')}
              </button>
            </div>
          )}

          {/* Status indicator */}
          {isActive && (
            <div className="text-center">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                state === 'playing'
                  ? 'text-green-600 dark:text-green-400'
                  : state === 'paused'
                  ? 'text-amber-600 dark:text-amber-400'
                  : state === 'at_annotation'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  state === 'playing'
                    ? 'bg-green-500 animate-pulse'
                    : state === 'paused'
                    ? 'bg-amber-500'
                    : state === 'at_annotation'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-400'
                }`} />
                {state === 'playing' && t('tour.playing', 'En cours')}
                {state === 'paused' && t('tour.paused', 'En pause')}
                {state === 'at_annotation' && t('tour.annotation', 'Point d\'interet')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
