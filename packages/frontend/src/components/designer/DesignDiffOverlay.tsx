import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DesignItem {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  material?: string;
  rotation?: number;
}

interface DesignDiffOverlayProps {
  currentItems: DesignItem[];
  comparedItems: DesignItem[];
  visible: boolean;
  onClose: () => void;
}

type DiffType = 'added' | 'removed' | 'moved' | 'modified';

interface DiffEntry {
  type: DiffType;
  item: DesignItem;
  oldItem?: DesignItem; // for moved/modified -- the previous version
}

// ─── Diff Computation ─────────────────────────────────────────────────────────

const POSITION_THRESHOLD = 5; // 5cm threshold for detecting movement

function computeDiff(current: DesignItem[], compared: DesignItem[]): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  const currentMap = new Map<string, DesignItem>();
  const comparedMap = new Map<string, DesignItem>();

  for (const item of current) {
    currentMap.set(item.id, item);
  }
  for (const item of compared) {
    comparedMap.set(item.id, item);
  }

  // Items in current but not in compared = added
  for (const item of current) {
    if (!comparedMap.has(item.id)) {
      diffs.push({ type: 'added', item });
    }
  }

  // Items in compared but not in current = removed
  for (const item of compared) {
    if (!currentMap.has(item.id)) {
      diffs.push({ type: 'removed', item });
    }
  }

  // Items in both -- check for moves and modifications
  for (const item of current) {
    const old = comparedMap.get(item.id);
    if (!old) {continue;}

    const dx = Math.abs(item.position.x - old.position.x);
    const dy = Math.abs(item.position.y - old.position.y);
    const dz = Math.abs(item.position.z - old.position.z);
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > POSITION_THRESHOLD) {
      diffs.push({ type: 'moved', item, oldItem: old });
    } else {
      // Check for material/dimension changes
      const materialChanged = item.material !== old.material;
      const dimensionsChanged =
        item.dimensions.width !== old.dimensions.width ||
        item.dimensions.height !== old.dimensions.height ||
        item.dimensions.depth !== old.dimensions.depth;

      if (materialChanged || dimensionsChanged) {
        diffs.push({ type: 'modified', item, oldItem: old });
      }
    }
  }

  return diffs;
}

// ─── Color Scheme ─────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<DiffType, { bg: string; border: string; text: string; label: string }> = {
  added: {
    bg: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-green-600 dark:text-green-400',
    label: 'green',
  },
  removed: {
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-red-600 dark:text-red-400',
    label: 'red',
  },
  moved: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'yellow',
  },
  modified: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'blue',
  },
};

// ─── Diff Card ────────────────────────────────────────────────────────────────

function DiffCard({
  diff,
  t,
}: {
  diff: DiffEntry;
  t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const colors = DIFF_COLORS[diff.type];
  const typeLabels: Record<DiffType, string> = {
    added: t('diff.added', 'Added'),
    removed: t('diff.removed', 'Removed'),
    moved: t('diff.moved', 'Moved'),
    modified: t('diff.modified', 'Modified'),
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${colors.border} ${colors.bg}`}>
      {/* Diff type icon */}
      <div className={`flex-shrink-0 mt-0.5 ${colors.text}`}>
        {diff.type === 'added' && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        )}
        {diff.type === 'removed' && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        )}
        {diff.type === 'moved' && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
        )}
        {diff.type === 'modified' && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
            {typeLabels[diff.type]}
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {diff.item.name || diff.item.type}
          </span>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
          <div>
            {t('diff.position', 'Position')}: ({Math.round(diff.item.position.x)}, {Math.round(diff.item.position.y)}, {Math.round(diff.item.position.z)})
          </div>
          <div>
            {t('diff.size', 'Size')}: {diff.item.dimensions.width} x {diff.item.dimensions.height} x {diff.item.dimensions.depth}
          </div>
          {diff.item.material && (
            <div>{t('diff.material', 'Material')}: {diff.item.material}</div>
          )}

          {/* Movement arrow info */}
          {diff.type === 'moved' && diff.oldItem && (
            <div className="flex items-center gap-1 mt-1 text-yellow-600 dark:text-yellow-400">
              <span>({Math.round(diff.oldItem.position.x)}, {Math.round(diff.oldItem.position.y)}, {Math.round(diff.oldItem.position.z)})</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span>({Math.round(diff.item.position.x)}, {Math.round(diff.item.position.y)}, {Math.round(diff.item.position.z)})</span>
            </div>
          )}

          {/* Modification details */}
          {diff.type === 'modified' && diff.oldItem && (
            <div className="mt-1 text-blue-600 dark:text-blue-400">
              {diff.oldItem.material !== diff.item.material && (
                <div>{t('diff.materialChange', 'Material')}: {diff.oldItem.material || '-'} &rarr; {diff.item.material || '-'}</div>
              )}
              {(diff.oldItem.dimensions.width !== diff.item.dimensions.width ||
                diff.oldItem.dimensions.height !== diff.item.dimensions.height ||
                diff.oldItem.dimensions.depth !== diff.item.dimensions.depth) && (
                <div>
                  {t('diff.dimensionChange', 'Dimensions')}: {diff.oldItem.dimensions.width}x{diff.oldItem.dimensions.height}x{diff.oldItem.dimensions.depth} &rarr; {diff.item.dimensions.width}x{diff.item.dimensions.height}x{diff.item.dimensions.depth}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Visual Diff Box (overlay rectangles) ─────────────────────────────────────

function DiffVisualizationSVG({
  diffs,
  visibleTypes,
}: {
  diffs: DiffEntry[];
  visibleTypes: Set<DiffType>;
}): React.ReactElement {
  // Compute bounds for the SVG viewport
  const allItems = diffs
    .filter((d) => visibleTypes.has(d.type))
    .flatMap((d) => [d.item, d.oldItem].filter(Boolean) as DesignItem[]);

  if (allItems.length === 0) {
    return <div className="w-full h-48 flex items-center justify-center text-sm text-gray-400">No visible diffs</div>;
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const item of allItems) {
    const left = item.position.x - item.dimensions.width / 2;
    const right = item.position.x + item.dimensions.width / 2;
    const top = item.position.z - item.dimensions.depth / 2;
    const bottom = item.position.z + item.dimensions.depth / 2;
    if (left < minX) {minX = left;}
    if (right > maxX) {maxX = right;}
    if (top < minZ) {minZ = top;}
    if (bottom > maxZ) {maxZ = bottom;}
  }

  // Add padding
  const padding = 30;
  minX -= padding;
  maxX += padding;
  minZ -= padding;
  maxZ += padding;

  const width = maxX - minX;
  const height = maxZ - minZ;

  const colorMap: Record<DiffType, { fill: string; stroke: string }> = {
    added: { fill: 'rgba(34,197,94,0.25)', stroke: '#22c55e' },
    removed: { fill: 'rgba(239,68,68,0.25)', stroke: '#ef4444' },
    moved: { fill: 'rgba(234,179,8,0.25)', stroke: '#eab308' },
    modified: { fill: 'rgba(59,130,246,0.25)', stroke: '#3b82f6' },
  };

  return (
    <svg viewBox={`${minX} ${minZ} ${width} ${height}`} className="w-full h-48 sm:h-64 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50">
      {diffs
        .filter((d) => visibleTypes.has(d.type))
        .map((diff, idx) => {
          const { item, oldItem, type } = diff;
          const colors = colorMap[type];

          const rectX = item.position.x - item.dimensions.width / 2;
          const rectZ = item.position.z - item.dimensions.depth / 2;

          return (
            <g key={`${item.id}-${idx}`}>
              {/* Old position for moved items */}
              {type === 'moved' && oldItem && (
                <>
                  <rect
                    x={oldItem.position.x - oldItem.dimensions.width / 2}
                    y={oldItem.position.z - oldItem.dimensions.depth / 2}
                    width={oldItem.dimensions.width}
                    height={oldItem.dimensions.depth}
                    fill="rgba(234,179,8,0.1)"
                    stroke="#eab308"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                  {/* Arrow from old to new */}
                  <line
                    x1={oldItem.position.x}
                    y1={oldItem.position.z}
                    x2={item.position.x}
                    y2={item.position.z}
                    stroke="#eab308"
                    strokeWidth="2"
                    markerEnd="url(#diffArrow)"
                  />
                </>
              )}

              {/* Current position rectangle */}
              <rect
                x={rectX}
                y={rectZ}
                width={item.dimensions.width}
                height={item.dimensions.depth}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth="2"
                rx="2"
              />

              {/* Label */}
              <text
                x={item.position.x}
                y={item.position.z}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(8, Math.min(14, item.dimensions.width / 6))}
                fill={colors.stroke}
                fontWeight="bold"
              >
                {(item.name || item.type).slice(0, 10)}
              </text>
            </g>
          );
        })}

      {/* Arrow marker definition */}
      <defs>
        <marker id="diffArrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="#eab308" />
        </marker>
      </defs>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DesignDiffOverlay({
  currentItems,
  comparedItems,
  visible,
  onClose,
}: DesignDiffOverlayProps): React.ReactElement | null {
  const { t } = useTranslation();

  const [visibleTypes, setVisibleTypes] = useState<Set<DiffType>>(
    new Set(['added', 'removed', 'moved', 'modified']),
  );

  // Compute the diff
  const diffs = useMemo(
    () => computeDiff(currentItems, comparedItems),
    [currentItems, comparedItems],
  );

  // Count by type
  const counts = useMemo(() => {
    const c: Record<DiffType, number> = { added: 0, removed: 0, moved: 0, modified: 0 };
    for (const d of diffs) {
      c[d.type]++;
    }
    return c;
  }, [diffs]);

  // Filtered diffs
  const filteredDiffs = useMemo(
    () => diffs.filter((d) => visibleTypes.has(d.type)),
    [diffs, visibleTypes],
  );

  const toggleType = useCallback((type: DiffType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  if (!visible) {return null;}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('diff.title', 'Design Comparison')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('diff.subtitle', 'Visual differences between two design versions')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 text-xs font-medium flex-wrap">
            <span className="text-green-600 dark:text-green-400">
              {counts.added} {t('diff.addedCount', 'added')}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-red-600 dark:text-red-400">
              {counts.removed} {t('diff.removedCount', 'removed')}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-yellow-600 dark:text-yellow-400">
              {counts.moved} {t('diff.movedCount', 'moved')}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-blue-600 dark:text-blue-400">
              {counts.modified} {t('diff.modifiedCount', 'modified')}
            </span>
          </div>
        </div>

        {/* Filter toggles (legend) */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mr-1">
              {t('diff.filter', 'Filter:')}
            </span>
            {(['added', 'removed', 'moved', 'modified'] as DiffType[]).map((type) => {
              const colors = DIFF_COLORS[type];
              const isActive = visibleTypes.has(type);
              const typeLabels: Record<DiffType, string> = {
                added: t('diff.added', 'Added'),
                removed: t('diff.removed', 'Removed'),
                moved: t('diff.moved', 'Moved'),
                modified: t('diff.modified', 'Modified'),
              };
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    isActive
                      ? `${colors.border} ${colors.bg} ${colors.text}`
                      : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 bg-transparent'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isActive ? `bg-${colors.label}-500` : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{
                      backgroundColor: isActive
                        ? { green: '#22c55e', red: '#ef4444', yellow: '#eab308', blue: '#3b82f6' }[colors.label]
                        : undefined,
                    }}
                  />
                  {typeLabels[type]} ({counts[type]})
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual SVG overlay */}
        <div className="px-6 py-4 flex-shrink-0">
          <DiffVisualizationSVG diffs={diffs} visibleTypes={visibleTypes} />
        </div>

        {/* Diff list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filteredDiffs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {diffs.length === 0
                  ? t('diff.noDifferences', 'No differences found between the two versions.')
                  : t('diff.allFiltered', 'All differences are filtered out. Toggle a category above.')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDiffs.map((diff, idx) => (
                <DiffCard key={`${diff.item.id}-${diff.type}-${idx}`} diff={diff} t={t} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export { DesignDiffOverlay };
export type { DesignDiffOverlayProps, DesignItem as DiffDesignItem, DiffEntry, DiffType };
