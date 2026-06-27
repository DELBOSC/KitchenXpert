import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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

interface WorkflowOverlayProps {
  /** The simulation result to render */
  simulation: SimulationResult | null;
  /** Whether the overlay is visible */
  visible: boolean;
  /** Toggle visibility callback */
  onToggle: () => void;
  /** Canvas/container width in pixels */
  containerWidth: number;
  /** Canvas/container height in pixels */
  containerHeight: number;
  /** Kitchen width in meters (for coordinate mapping) */
  kitchenWidth: number;
  /** Kitchen depth in meters (for coordinate mapping) */
  kitchenDepth: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

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

const ZONE_LABELS: Record<string, string> = {
  fridge: 'Frigo',
  sink: 'Evier',
  countertop: 'PDT',
  hob: 'Plaque',
  oven: 'Four',
  storage: 'Rang.',
  island: 'Ilot',
  dishwasher: 'L-V',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDistanceStrokeColor(distanceM: number): string {
  if (distanceM <= 1.5) {
    return '#22c55e';
  } // green
  if (distanceM <= 3.0) {
    return '#eab308';
  } // yellow
  return '#ef4444'; // red
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * WorkflowOverlay
 *
 * Renders animated workflow paths and bottleneck markers over the 3D kitchen scene.
 * Designed to be used as an overlay within the kitchen designer.
 *
 * Usage:
 * ```tsx
 * <WorkflowOverlay
 *   simulation={simulationResult}
 *   visible={showWorkflow}
 *   onToggle={() => setShowWorkflow(v => !v)}
 *   containerWidth={canvasWidth}
 *   containerHeight={canvasHeight}
 *   kitchenWidth={roomConfig.width}
 *   kitchenDepth={roomConfig.depth}
 * />
 * ```
 */
export default function WorkflowOverlay({
  simulation,
  visible,
  onToggle,
  containerWidth,
  containerHeight,
  kitchenWidth,
  kitchenDepth,
}: WorkflowOverlayProps): React.ReactElement | null {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hoveredStep] = useState<number | null>(null);

  // ─── Coordinate mapping ─────────────────────────────────────────────────

  const PADDING = 30;

  const toScreenX = useCallback(
    (worldX: number): number => {
      if (kitchenWidth <= 0) {
        return PADDING;
      }
      return PADDING + (worldX / kitchenWidth) * (containerWidth - 2 * PADDING);
    },
    [kitchenWidth, containerWidth]
  );

  const toScreenZ = useCallback(
    (worldZ: number): number => {
      if (kitchenDepth <= 0) {
        return PADDING;
      }
      return PADDING + (worldZ / kitchenDepth) * (containerHeight - 2 * PADDING);
    },
    [kitchenDepth, containerHeight]
  );

  // ─── Animation loop ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible || !simulation) {
      setAnimationProgress(0);
      return;
    }

    let startTime: number | null = null;
    const ANIM_DURATION = 5000; // 5 seconds for full animation

    const animate = (timestamp: number): void => {
      if (!startTime) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / ANIM_DURATION, 1);

      setAnimationProgress(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visible, simulation]);

  // ─── Canvas rendering ─────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulation || !visible) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    const visibleStepCount = Math.floor(animationProgress * simulation.steps.length);

    // Draw paths for visible steps
    for (let i = 0; i < visibleStepCount && i < simulation.steps.length; i++) {
      const step = simulation.steps[i]!;
      const fromX = toScreenX(step.position3D.from.x);
      const fromZ = toScreenZ(step.position3D.from.z);
      const toX = toScreenX(step.position3D.to.x);
      const toZ = toScreenZ(step.position3D.to.z);

      const strokeColor = getDistanceStrokeColor(step.distanceM);
      const isHovered = hoveredStep === step.stepNumber;

      // Line
      ctx.beginPath();
      ctx.moveTo(fromX, fromZ);
      ctx.lineTo(toX, toZ);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isHovered ? 4 : 2;
      ctx.globalAlpha = isHovered ? 1.0 : 0.6;
      ctx.setLineDash(isHovered ? [] : [6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;

      // Arrowhead
      const angle = Math.atan2(toZ - fromZ, toX - fromX);
      const arrowLen = 10;
      ctx.beginPath();
      ctx.moveTo(toX, toZ);
      ctx.lineTo(
        toX - arrowLen * Math.cos(angle - Math.PI / 6),
        toZ - arrowLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(toX, toZ);
      ctx.lineTo(
        toX - arrowLen * Math.cos(angle + Math.PI / 6),
        toZ - arrowLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Step number at midpoint
      const midX = (fromX + toX) / 2;
      const midZ = (fromZ + toZ) / 2;

      ctx.beginPath();
      ctx.arc(midX, midZ, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(step.stepNumber), midX, midZ);
    }

    // Draw zone markers
    const drawnZones = new Map<string, { x: number; z: number }>();
    for (let i = 0; i < visibleStepCount && i < simulation.steps.length; i++) {
      const step = simulation.steps[i]!;
      if (!drawnZones.has(step.fromZone)) {
        drawnZones.set(step.fromZone, {
          x: toScreenX(step.position3D.from.x),
          z: toScreenZ(step.position3D.from.z),
        });
      }
      if (!drawnZones.has(step.toZone)) {
        drawnZones.set(step.toZone, {
          x: toScreenX(step.position3D.to.x),
          z: toScreenZ(step.position3D.to.z),
        });
      }
    }

    for (const [zone, pos] of drawnZones.entries()) {
      const zoneColor = ZONE_COLORS[zone] || '#6b7280';

      // Outer glow
      ctx.beginPath();
      ctx.arc(pos.x, pos.z, 20, 0, Math.PI * 2);
      ctx.fillStyle = zoneColor;
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Zone circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.z, 14, 0, Math.PI * 2);
      ctx.fillStyle = zoneColor;
      ctx.fill();

      // Zone label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ZONE_LABELS[zone] || zone.substring(0, 4), pos.x, pos.z);
    }

    // Draw bottleneck markers (pulsing red circles)
    const pulsePhase = (Date.now() % 2000) / 2000; // 0-1 over 2 seconds
    const pulseRadius = 20 + Math.sin(pulsePhase * Math.PI * 2) * 6;

    for (const bottleneck of simulation.bottlenecks) {
      const bx = toScreenX(bottleneck.position.x);
      const bz = toScreenZ(bottleneck.position.z);

      // Pulsing outer ring
      ctx.beginPath();
      ctx.arc(bx, bz, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Inner solid ring
      ctx.beginPath();
      ctx.arc(bx, bz, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fill();

      // Exclamation mark
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', bx, bz);
    }

    // If animating bottlenecks, request another frame for the pulse effect
    if (simulation.bottlenecks.length > 0 && visible) {
      animationRef.current = requestAnimationFrame(() => {
        // Re-trigger render by updating a ref-based counter
        // The useEffect will re-run on the next state change
      });
    }
  }, [
    simulation,
    visible,
    animationProgress,
    containerWidth,
    containerHeight,
    toScreenX,
    toScreenZ,
    hoveredStep,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!simulation) {
    return null;
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`absolute top-4 right-4 z-50 px-3 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all ${
          visible
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
        title={
          visible
            ? t('workflow.hideOverlay', 'Masquer le workflow')
            : t('workflow.showOverlay', 'Afficher le workflow')
        }
      >
        {visible
          ? t('workflow.hideWorkflow', 'Masquer workflow')
          : t('workflow.showWorkflow', 'Afficher workflow')}
      </button>

      {/* Canvas overlay */}
      {visible && (
        <canvas
          ref={canvasRef}
          width={containerWidth}
          height={containerHeight}
          className="absolute inset-0 pointer-events-none z-40"
          style={{ imageRendering: 'auto' }}
        />
      )}

      {/* Legend panel (bottom-left) */}
      {visible && (
        <div className="absolute bottom-4 left-4 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-lg max-w-xs">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('workflow.legend', 'Legende')}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-0.5 bg-green-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">
                {'< 1.5m'} ({t('workflow.short', 'court')})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-0.5 bg-yellow-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">
                1.5-3m ({t('workflow.medium', 'moyen')})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-0.5 bg-red-500 rounded" />
              <span className="text-gray-600 dark:text-gray-400">
                {'> 3m'} ({t('workflow.long', 'long detour')})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <div className="w-4 h-4 rounded-full border-2 border-red-500 flex items-center justify-center">
                <span className="text-red-500 text-[8px] font-bold">!</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                {t('workflow.bottleneck', "Goulot d'etranglement")}
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{t('workflow.distance', 'Distance')}:</span>
              <span className="font-medium">{simulation.totalDistanceM.toFixed(1)}m</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{t('workflow.score', 'Score')}:</span>
              <span className="font-medium">{simulation.efficiencyScore}/100</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
