import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomDimensions {
  shape: 'rectangular' | 'l_shaped' | 'u_shaped' | 'irregular';
  walls: Array<{
    id: string;
    length: number;
    hasWindow: boolean;
    hasDoor: boolean;
    windowWidth?: number;
    doorWidth?: number;
  }>;
  height: number;
  obstacles: Array<{
    type: string;
    position: { x: number; z: number };
    width: number;
    depth: number;
  }>;
}

interface DimensionWizardProps {
  onComplete: (dimensions: RoomDimensions) => void;
  onCancel: () => void;
  initialDimensions?: Partial<RoomDimensions>;
}

type RoomShape = RoomDimensions['shape'];

interface WallDef {
  id: string;
  length: number;
  hasWindow: boolean;
  hasDoor: boolean;
  windowWidth?: number;
  doorWidth?: number;
}

interface ObstacleDef {
  type: string;
  position: { x: number; z: number };
  width: number;
  depth: number;
}

interface ValidationIssue {
  field: string;
  message: string;
  suggestion?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const WALL_COUNTS: Record<RoomShape, number> = {
  rectangular: 4,
  l_shaped: 6,
  u_shaped: 8,
  irregular: 4,
};

const OBSTACLE_TYPES = ['pillar', 'pipe', 'beam', 'vent', 'radiator', 'other'] as const;

// ─── Shape SVG Diagrams ───────────────────────────────────────────────────────

function ShapeDiagram({ shape, selected }: { shape: RoomShape; selected: boolean }): React.ReactElement {
  const strokeColor = selected ? '#3b82f6' : '#9ca3af';
  const fillColor = selected ? 'rgba(59,130,246,0.1)' : 'transparent';
  const strokeWidth = selected ? 2.5 : 1.5;

  switch (shape) {
    case 'rectangular':
      return (
        <svg viewBox="0 0 80 60" className="w-full h-full">
          <rect x="10" y="10" width="60" height="40" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'l_shaped':
      return (
        <svg viewBox="0 0 80 60" className="w-full h-full">
          <path d="M10 10 H50 V35 H30 V50 H10 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'u_shaped':
      return (
        <svg viewBox="0 0 80 60" className="w-full h-full">
          <path d="M10 10 H30 V30 H50 V10 H70 V50 H10 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'irregular':
      return (
        <svg viewBox="0 0 80 60" className="w-full h-full">
          <path d="M15 15 H55 L65 30 L55 50 H20 L10 35 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        </svg>
      );
  }
}

function WallHighlightDiagram({
  shape,
  wallIndex,
  totalWalls: _totalWalls,
}: {
  shape: RoomShape;
  wallIndex: number;
  totalWalls: number;
}): React.ReactElement {
  // Generate wall segments for each shape
  const getWallSegments = (): Array<{ x1: number; y1: number; x2: number; y2: number }> => {
    switch (shape) {
      case 'rectangular':
        return [
          { x1: 10, y1: 10, x2: 70, y2: 10 }, // top
          { x1: 70, y1: 10, x2: 70, y2: 50 }, // right
          { x1: 70, y1: 50, x2: 10, y2: 50 }, // bottom
          { x1: 10, y1: 50, x2: 10, y2: 10 }, // left
        ];
      case 'l_shaped':
        return [
          { x1: 10, y1: 10, x2: 50, y2: 10 },
          { x1: 50, y1: 10, x2: 50, y2: 35 },
          { x1: 50, y1: 35, x2: 30, y2: 35 },
          { x1: 30, y1: 35, x2: 30, y2: 50 },
          { x1: 30, y1: 50, x2: 10, y2: 50 },
          { x1: 10, y1: 50, x2: 10, y2: 10 },
        ];
      case 'u_shaped':
        return [
          { x1: 10, y1: 10, x2: 30, y2: 10 },
          { x1: 30, y1: 10, x2: 30, y2: 30 },
          { x1: 30, y1: 30, x2: 50, y2: 30 },
          { x1: 50, y1: 30, x2: 50, y2: 10 },
          { x1: 50, y1: 10, x2: 70, y2: 10 },
          { x1: 70, y1: 10, x2: 70, y2: 50 },
          { x1: 70, y1: 50, x2: 10, y2: 50 },
          { x1: 10, y1: 50, x2: 10, y2: 10 },
        ];
      case 'irregular':
      default:
        return [
          { x1: 15, y1: 15, x2: 55, y2: 15 },
          { x1: 55, y1: 15, x2: 65, y2: 30 },
          { x1: 65, y1: 30, x2: 55, y2: 50 },
          { x1: 55, y1: 50, x2: 15, y2: 50 },
        ];
    }
  };

  const segments = getWallSegments();

  return (
    <svg viewBox="0 0 80 60" className="w-full h-full max-w-[200px] mx-auto">
      {segments.map((seg, idx) => (
        <line
          key={idx}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={idx === wallIndex ? '#3b82f6' : '#d1d5db'}
          strokeWidth={idx === wallIndex ? 3 : 1.5}
          strokeLinecap="round"
        />
      ))}
      {/* Wall number label */}
      {segments[wallIndex] && (
        <text
          x={(segments[wallIndex].x1 + segments[wallIndex].x2) / 2}
          y={(segments[wallIndex].y1 + segments[wallIndex].y2) / 2 - 4}
          textAnchor="middle"
          fontSize="8"
          fill="#3b82f6"
          fontWeight="bold"
        >
          {wallIndex + 1}
        </text>
      )}
    </svg>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepRoomShape({
  shape,
  onShapeChange,
  t,
}: {
  shape: RoomShape;
  onShapeChange: (s: RoomShape) => void;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const shapes: Array<{ value: RoomShape; labelKey: string; labelFallback: string }> = [
    { value: 'rectangular', labelKey: 'wizard.shapeRectangular', labelFallback: 'Rectangular' },
    { value: 'l_shaped', labelKey: 'wizard.shapeLShaped', labelFallback: 'L-Shaped' },
    { value: 'u_shaped', labelKey: 'wizard.shapeUShaped', labelFallback: 'U-Shaped' },
    { value: 'irregular', labelKey: 'wizard.shapeIrregular', labelFallback: 'Irregular' },
  ];

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {t('wizard.step1Title', 'Room Shape')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('wizard.step1Description', 'Select the shape that best matches your kitchen room.')}
      </p>
      <div className="grid grid-cols-2 gap-4">
        {shapes.map((s) => (
          <button
            key={s.value}
            onClick={() => onShapeChange(s.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
              shape === s.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
            }`}
          >
            <div className="w-20 h-16">
              <ShapeDiagram shape={s.value} selected={shape === s.value} />
            </div>
            <span className={`text-sm font-medium ${
              shape === s.value
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {t(s.labelKey, s.labelFallback)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepWallMeasurements({
  shape,
  walls,
  onWallChange,
  t,
}: {
  shape: RoomShape;
  walls: WallDef[];
  onWallChange: (index: number, field: keyof WallDef, value: number | boolean) => void;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {t('wizard.step2Title', 'Wall Measurements')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        {t('wizard.step2Description', 'Enter the length of each wall in centimeters.')}
      </p>
      <p className="text-xs text-blue-500 dark:text-blue-400 mb-6 flex items-center gap-1">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {t('wizard.measureTip', 'Measure from corner to corner at floor level')}
      </p>

      <div className="space-y-4">
        {walls.map((wall, idx) => (
          <div key={wall.id} className="flex items-center gap-4">
            <div className="w-24 h-16 flex-shrink-0">
              <WallHighlightDiagram shape={shape} wallIndex={idx} totalWalls={walls.length} />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('wizard.wallLabel', 'Wall')} {idx + 1}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={wall.length || ''}
                  onChange={(e) => onWallChange(idx, 'length', parseFloat(e.target.value) || 0)}
                  placeholder="300"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">cm</span>
              </div>
              {/* Detect likely unit error */}
              {wall.length > 0 && wall.length < 10 && (
                <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">
                  {t('wizard.unitWarning', `Did you mean ${wall.length * 100}cm?`).replace('${value}', String(wall.length * 100))}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepHeight({
  height,
  onHeightChange,
  t,
}: {
  height: number;
  onHeightChange: (h: number) => void;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const isValid = height >= 200 && height <= 400;
  const hasUnitError = height > 0 && height < 10;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {t('wizard.step3Title', 'Ceiling Height')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('wizard.step3Description', 'Enter the floor-to-ceiling height in centimeters.')}
      </p>

      <div className="max-w-xs mx-auto">
        {/* Visual height diagram */}
        <div className="flex items-end justify-center gap-4 mb-6">
          <svg viewBox="0 0 60 100" className="w-16 h-32">
            {/* Floor */}
            <line x1="5" y1="95" x2="55" y2="95" stroke="#9ca3af" strokeWidth="2" />
            {/* Ceiling */}
            <line x1="5" y1="5" x2="55" y2="5" stroke="#9ca3af" strokeWidth="2" />
            {/* Left wall */}
            <line x1="10" y1="5" x2="10" y2="95" stroke="#d1d5db" strokeWidth="1" />
            {/* Height arrow */}
            <line x1="40" y1="10" x2="40" y2="90" stroke="#3b82f6" strokeWidth="2" markerStart="url(#arrowUp)" markerEnd="url(#arrowDown)" />
            <defs>
              <marker id="arrowUp" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
                <path d="M0,6 L3,0 L6,6" fill="none" stroke="#3b82f6" strokeWidth="1" />
              </marker>
              <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
                <path d="M0,0 L3,6 L6,0" fill="none" stroke="#3b82f6" strokeWidth="1" />
              </marker>
            </defs>
            {/* Label */}
            <text x="48" y="55" fontSize="8" fill="#3b82f6" fontWeight="bold">{height || '?'}</text>
          </svg>
        </div>

        <div className="relative">
          <input
            type="number"
            min={200}
            max={400}
            value={height || ''}
            onChange={(e) => onHeightChange(parseFloat(e.target.value) || 0)}
            placeholder="250"
            className={`w-full px-4 py-3 pr-12 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none ${
              height > 0 && !isValid && !hasUnitError
                ? 'border-red-300 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">cm</span>
        </div>

        {hasUnitError && (
          <p className="text-xs text-amber-500 dark:text-amber-400 mt-2 text-center">
            {t('wizard.heightUnitWarning', `Did you mean ${height * 100}cm?`).replace('${value}', String(height * 100))}
          </p>
        )}
        {height > 0 && !isValid && !hasUnitError && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2 text-center">
            {t('wizard.heightRange', 'Height must be between 200cm and 400cm')}
          </p>
        )}
      </div>
    </div>
  );
}

function StepWindowsDoors({
  walls,
  onWallChange,
  t,
}: {
  walls: WallDef[];
  onWallChange: (index: number, field: keyof WallDef, value: number | boolean) => void;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {t('wizard.step4Title', 'Windows & Doors')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('wizard.step4Description', 'Mark which walls have windows or doors and enter their width.')}
      </p>

      <div className="space-y-4">
        {walls.map((wall, idx) => (
          <div key={wall.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('wizard.wallLabel', 'Wall')} {idx + 1}
                <span className="text-xs text-gray-400 ml-2">({wall.length}cm)</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Window toggle + width */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wall.hasWindow}
                    onChange={(e) => onWallChange(idx, 'hasWindow', e.target.checked)}
                    className="w-4 h-4 text-blue-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('wizard.hasWindow', 'Window')}
                  </span>
                </label>
                {wall.hasWindow && (
                  <div className="relative">
                    <input
                      type="number"
                      min={30}
                      value={wall.windowWidth || ''}
                      onChange={(e) => onWallChange(idx, 'windowWidth', parseFloat(e.target.value) || 0)}
                      placeholder="120"
                      className="w-24 px-2 py-1 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">cm</span>
                  </div>
                )}
              </div>

              {/* Door toggle + width */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wall.hasDoor}
                    onChange={(e) => onWallChange(idx, 'hasDoor', e.target.checked)}
                    className="w-4 h-4 text-blue-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('wizard.hasDoor', 'Door')}
                  </span>
                </label>
                {wall.hasDoor && (
                  <div className="relative">
                    <input
                      type="number"
                      min={60}
                      value={wall.doorWidth || ''}
                      onChange={(e) => onWallChange(idx, 'doorWidth', parseFloat(e.target.value) || 0)}
                      placeholder="80"
                      className="w-24 px-2 py-1 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">cm</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepObstacles({
  obstacles,
  onAddObstacle,
  onRemoveObstacle,
  onObstacleChange,
  t,
}: {
  obstacles: ObstacleDef[];
  onAddObstacle: () => void;
  onRemoveObstacle: (index: number) => void;
  onObstacleChange: (index: number, field: string, value: string | number) => void;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {t('wizard.step5Title', 'Obstacles')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('wizard.step5Description', 'Mark any pillars, pipes, or other obstacles in the room.')}
      </p>

      <div className="space-y-4">
        {obstacles.map((obs, idx) => (
          <div key={idx} className="p-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 relative">
            <button
              onClick={() => onRemoveObstacle(idx)}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
              aria-label={t('wizard.removeObstacle', 'Remove obstacle')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {/* Type */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard.obstacleType', 'Type')}
                </label>
                <select
                  value={obs.type}
                  onChange={(e) => onObstacleChange(idx, 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                >
                  {OBSTACLE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`wizard.obstacle.${type}`, type.charAt(0).toUpperCase() + type.slice(1))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Position X */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard.positionX', 'Position X (cm)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={obs.position.x || ''}
                  onChange={(e) => onObstacleChange(idx, 'positionX', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                />
              </div>

              {/* Position Z */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard.positionZ', 'Position Z (cm)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={obs.position.z || ''}
                  onChange={(e) => onObstacleChange(idx, 'positionZ', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                />
              </div>

              {/* Width */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard.obstacleWidth', 'Width (cm)')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={obs.width || ''}
                  onChange={(e) => onObstacleChange(idx, 'width', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                />
              </div>

              {/* Depth */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {t('wizard.obstacleDepth', 'Depth (cm)')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={obs.depth || ''}
                  onChange={(e) => onObstacleChange(idx, 'depth', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAddObstacle}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {t('wizard.addObstacle', 'Add Obstacle')}
      </button>

      {obstacles.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          {t('wizard.noObstacles', 'No obstacles? You can skip this step.')}
        </p>
      )}
    </div>
  );
}

function StepValidationSummary({
  dimensions,
  issues,
  t,
}: {
  dimensions: RoomDimensions;
  issues: ValidationIssue[];
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const shapeLabels: Record<RoomShape, string> = {
    rectangular: t('wizard.shapeRectangular', 'Rectangular'),
    l_shaped: t('wizard.shapeLShaped', 'L-Shaped'),
    u_shaped: t('wizard.shapeUShaped', 'U-Shaped'),
    irregular: t('wizard.shapeIrregular', 'Irregular'),
  };

  const windowCount = dimensions.walls.filter((w) => w.hasWindow).length;
  const doorCount = dimensions.walls.filter((w) => w.hasDoor).length;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {t('wizard.step6Title', 'Validation & Summary')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t('wizard.step6Description', 'Review your room measurements before confirming.')}
      </p>

      {/* Validation issues */}
      {issues.length > 0 && (
        <div className="mb-6 p-4 border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            {t('wizard.validationIssues', 'Issues Found')}
          </h4>
          <ul className="space-y-1">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-xs text-amber-600 dark:text-amber-300 flex items-start gap-1">
                <span className="mt-0.5">-</span>
                <span>
                  {issue.message}
                  {issue.suggestion && (
                    <span className="ml-1 text-blue-500 dark:text-blue-400">({issue.suggestion})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary overview with SVG */}
      <div className="mb-4">
        <div className="w-48 h-36 mx-auto mb-4">
          <ShapeDiagram shape={dimensions.shape} selected={true} />
        </div>
      </div>

      {/* Summary details */}
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.summaryShape', 'Shape')}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{shapeLabels[dimensions.shape]}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.summaryWalls', 'Walls')}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{dimensions.walls.length}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.summaryHeight', 'Height')}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{dimensions.height}cm</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.summaryWindows', 'Windows')}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{windowCount}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.summaryDoors', 'Doors')}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{doorCount}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t('wizard.summaryObstacles', 'Obstacles')}</span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{dimensions.obstacles.length}</span>
        </div>

        {/* Wall details */}
        <div className="mt-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {t('wizard.wallDetails', 'Wall Details')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dimensions.walls.map((wall, idx) => (
              <div key={wall.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {t('wizard.wallLabel', 'Wall')} {idx + 1}:
                </span>
                <span className="text-gray-600 dark:text-gray-400">{wall.length}cm</span>
                {wall.hasWindow && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                    {t('wizard.windowShort', 'Win')} {wall.windowWidth ? `${wall.windowWidth}cm` : ''}
                  </span>
                )}
                {wall.hasDoor && (
                  <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                    {t('wizard.doorShort', 'Door')} {wall.doorWidth ? `${wall.doorWidth}cm` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Progress Indicator ───────────────────────────────────────────────────────

function ProgressIndicator({
  currentStep,
  totalSteps,
  t,
}: {
  currentStep: number;
  totalSteps: number;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const stepLabels = [
    t('wizard.progressShape', 'Shape'),
    t('wizard.progressWalls', 'Walls'),
    t('wizard.progressHeight', 'Height'),
    t('wizard.progressOpenings', 'Openings'),
    t('wizard.progressObstacles', 'Obstacles'),
    t('wizard.progressSummary', 'Summary'),
  ];

  return (
    <div className="mb-6">
      {/* Step counter */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('wizard.stepOf', `Step ${currentStep} of ${totalSteps}`)
            .replace('${current}', String(currentStep))
            .replace('${total}', String(totalSteps))}
        </span>
        <span className="text-xs font-medium text-blue-500 dark:text-blue-400">
          {stepLabels[currentStep - 1] || ''}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              i + 1 <= currentStep
                ? 'bg-blue-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

export default function DimensionWizard({
  onComplete,
  onCancel,
  initialDimensions,
}: DimensionWizardProps): React.ReactElement {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  // Form state
  const [shape, setShape] = useState<RoomShape>(initialDimensions?.shape || 'rectangular');
  const [walls, setWalls] = useState<WallDef[]>(() => {
    if (initialDimensions?.walls && initialDimensions.walls.length > 0) {
      return initialDimensions.walls;
    }
    return createDefaultWalls(initialDimensions?.shape || 'rectangular');
  });
  const [height, setHeight] = useState<number>(initialDimensions?.height || 250);
  const [obstacles, setObstacles] = useState<ObstacleDef[]>(initialDimensions?.obstacles || []);

  // Build dimensions object
  const dimensions: RoomDimensions = useMemo(() => ({
    shape,
    walls,
    height,
    obstacles,
  }), [shape, walls, height, obstacles]);

  // Validation
  const validationIssues = useMemo(() => validateDimensions(dimensions, t), [dimensions, t]);

  // Animated step change
  const goToStep = useCallback((newStep: number) => {
    if (animating) {return;}
    setSlideDirection(newStep > step ? 'left' : 'right');
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
    }, 200);
  }, [step, animating]);

  // Shape change handler -- reset walls when shape changes
  const handleShapeChange = useCallback((newShape: RoomShape) => {
    setShape(newShape);
    setWalls(createDefaultWalls(newShape));
  }, []);

  // Wall change handler
  const handleWallChange = useCallback((index: number, field: keyof WallDef, value: number | boolean) => {
    setWalls((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index]!, [field]: value };
      return updated;
    });
  }, []);

  // Obstacle handlers
  const handleAddObstacle = useCallback(() => {
    setObstacles((prev) => [
      ...prev,
      { type: 'pillar', position: { x: 0, z: 0 }, width: 20, depth: 20 },
    ]);
  }, []);

  const handleRemoveObstacle = useCallback((index: number) => {
    setObstacles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleObstacleChange = useCallback((index: number, field: string, value: string | number) => {
    setObstacles((prev) => {
      const updated = [...prev];
      const obs = { ...updated[index]! };
      if (field === 'type') {
        obs.type = value as string;
      } else if (field === 'positionX') {
        obs.position = { ...obs.position, x: value as number };
      } else if (field === 'positionZ') {
        obs.position = { ...obs.position, z: value as number };
      } else if (field === 'width') {
        obs.width = value as number;
      } else if (field === 'depth') {
        obs.depth = value as number;
      }
      updated[index] = obs;
      return updated;
    });
  }, []);

  // Navigation
  const canGoNext = useMemo(() => {
    switch (step) {
      case 1: return true; // shape always selected
      case 2: return walls.every((w) => w.length > 0);
      case 3: return height >= 200 && height <= 400;
      case 4: return true; // optional
      case 5: return true; // optional
      case 6: return validationIssues.filter((i) => i.field !== 'warning').length === 0;
      default: return false;
    }
  }, [step, walls, height, validationIssues]);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      goToStep(step + 1);
    } else {
      onComplete(dimensions);
    }
  }, [step, goToStep, onComplete, dimensions]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      goToStep(step - 1);
    }
  }, [step, goToStep]);

  // Render current step
  const renderStep = (): React.ReactElement => {
    switch (step) {
      case 1:
        return <StepRoomShape shape={shape} onShapeChange={handleShapeChange} t={t} />;
      case 2:
        return <StepWallMeasurements shape={shape} walls={walls} onWallChange={handleWallChange} t={t} />;
      case 3:
        return <StepHeight height={height} onHeightChange={setHeight} t={t} />;
      case 4:
        return <StepWindowsDoors walls={walls} onWallChange={handleWallChange} t={t} />;
      case 5:
        return (
          <StepObstacles
            obstacles={obstacles}
            onAddObstacle={handleAddObstacle}
            onRemoveObstacle={handleRemoveObstacle}
            onObstacleChange={handleObstacleChange}
            t={t}
          />
        );
      case 6:
        return <StepValidationSummary dimensions={dimensions} issues={validationIssues} t={t} />;
      default:
        return <></>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('wizard.title', 'Room Measurement Wizard')}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 flex-shrink-0">
          <ProgressIndicator currentStep={step} totalSteps={TOTAL_STEPS} t={t} />
        </div>

        {/* Step content with animation */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div
            className={`transition-all duration-200 ${
              animating
                ? slideDirection === 'left'
                  ? 'opacity-0 -translate-x-4'
                  : 'opacity-0 translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}
          >
            {renderStep()}
          </div>
        </div>

        {/* Footer: Back / Next */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={step === 1 ? onCancel : handleBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {step === 1 ? t('common.cancel', 'Cancel') : t('wizard.back', 'Back')}
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {step === TOTAL_STEPS
              ? t('wizard.finish', 'Finish')
              : t('wizard.next', 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultWalls(shape: RoomShape): WallDef[] {
  const count = WALL_COUNTS[shape];
  return Array.from({ length: count }, (_, i) => ({
    id: `wall-${i + 1}`,
    length: 0,
    hasWindow: false,
    hasDoor: false,
  }));
}

function validateDimensions(
  dims: RoomDimensions,
  t: (key: string, fallback: string) => string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Wall length validation
  dims.walls.forEach((wall, idx) => {
    if (wall.length > 0 && wall.length < 100) {
      // Possible unit error
      if (wall.length < 10) {
        issues.push({
          field: `wall-${idx}`,
          message: t('wizard.validateWallTooShort', `Wall ${idx + 1} is ${wall.length}cm, which seems very short.`),
          suggestion: t('wizard.validateDidYouMean', `Did you mean ${wall.length * 100}cm?`),
        });
      } else {
        issues.push({
          field: `wall-${idx}`,
          message: t('wizard.validateWallMin', `Wall ${idx + 1} must be at least 100cm.`),
        });
      }
    }

    if (wall.length > 2000) {
      issues.push({
        field: `wall-${idx}`,
        message: t('wizard.validateWallMax', `Wall ${idx + 1} exceeds 2000cm. Please verify.`),
      });
    }
  });

  // Height validation
  if (dims.height > 0 && dims.height < 10) {
    issues.push({
      field: 'height',
      message: t('wizard.validateHeightUnit', `Height ${dims.height}cm seems too low.`),
      suggestion: t('wizard.validateDidYouMean', `Did you mean ${dims.height * 100}cm?`),
    });
  } else if (dims.height < 200) {
    issues.push({
      field: 'height',
      message: t('wizard.validateHeightMin', 'Height must be at least 200cm.'),
    });
  } else if (dims.height > 400) {
    issues.push({
      field: 'height',
      message: t('wizard.validateHeightMax', 'Height must not exceed 400cm.'),
    });
  }

  // L-shape wall sum validation
  if (dims.shape === 'l_shaped' && dims.walls.length === 6) {
    const outerHorizontal = dims.walls[0]?.length || 0;
    const innerHorizontal = dims.walls[2]?.length || 0;
    const bottomHorizontal = dims.walls[4]?.length || 0;

    if (outerHorizontal > 0 && innerHorizontal > 0 && bottomHorizontal > 0) {
      if (Math.abs(outerHorizontal - (innerHorizontal + bottomHorizontal)) > 5) {
        issues.push({
          field: 'warning',
          message: t(
            'wizard.validateLShapeSum',
            'L-shape wall measurements may not add up correctly. Please verify walls 1, 3, and 5.',
          ),
        });
      }
    }
  }

  // Window/door width must not exceed wall length
  dims.walls.forEach((wall, idx) => {
    const openingWidth = (wall.hasWindow ? (wall.windowWidth || 0) : 0) + (wall.hasDoor ? (wall.doorWidth || 0) : 0);
    if (wall.length > 0 && openingWidth > wall.length) {
      issues.push({
        field: `wall-${idx}-openings`,
        message: t(
          'wizard.validateOpeningsTooWide',
          `Wall ${idx + 1}: combined window/door width (${openingWidth}cm) exceeds wall length (${wall.length}cm).`,
        ),
      });
    }
  });

  return issues;
}

export { DimensionWizard };
export type { DimensionWizardProps };
