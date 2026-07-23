import React, { useState } from 'react';

import { Button } from '../ui';
import { Dialog } from '../ui/Dialog';

import type { Opening, OpeningType } from './openings';

interface OpeningsPanelProps {
  open: boolean;
  onClose: () => void;
  openings: Opening[];
  /** Number of walls in the current layout (the wall picker offers 0…wallCount-1). */
  wallCount: number;
  onChange: (openings: Opening[]) => void;
}

const TYPE_LABELS: Record<OpeningType, string> = {
  door: 'Porte',
  french_door: 'Porte-fenêtre',
  french_door_double: 'Porte-fenêtre double',
  window: 'Fenêtre',
};

// Sensible defaults per type (metres). "Sur mesure" = a window with edited dimensions.
const DEFAULTS: Record<OpeningType, { width: number; height: number; sill: number }> = {
  door: { width: 0.9, height: 2.03, sill: 0 },
  french_door: { width: 0.9, height: 2.1, sill: 0 },
  french_door_double: { width: 1.5, height: 2.1, sill: 0 },
  window: { width: 0.8, height: 1.0, sill: 1.0 },
};

const selectCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';
const numCls = `${selectCls}`;

export default function OpeningsPanel({
  open,
  onClose,
  openings,
  wallCount,
  onChange,
}: OpeningsPanelProps): React.ReactElement {
  const [wallIndex, setWallIndex] = useState(0);
  const [type, setType] = useState<OpeningType>('door');
  const [offset, setOffset] = useState(0.6);
  const [sill, setSill] = useState(DEFAULTS.door.sill);
  const [width, setWidth] = useState(DEFAULTS.door.width);
  const [height, setHeight] = useState(DEFAULTS.door.height);

  const applyType = (next: OpeningType): void => {
    setType(next);
    setWidth(DEFAULTS[next].width);
    setHeight(DEFAULTS[next].height);
    setSill(DEFAULTS[next].sill);
  };

  const add = (): void => {
    const opening: Opening = {
      id: crypto.randomUUID(),
      wallIndex,
      type,
      offset,
      sill,
      width,
      height,
    };
    onChange([...openings, opening]);
  };

  const remove = (id: string): void => {
    onChange(openings.filter((o) => o.id !== id));
  };

  const walls = Array.from({ length: Math.max(1, wallCount) }, (_, i) => i);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Ouvertures"
      description="Ajoute des portes, portes-fenêtres et fenêtres dans les murs. Les cotes sont en mètres."
    >
      <div className="space-y-4">
        {/* Existing openings */}
        {openings.length > 0 && (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {openings.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-700 dark:text-gray-200">
                  Mur {o.wallIndex + 1} · {TYPE_LABELS[o.type]} · {o.width.toFixed(2)}×
                  {o.height.toFixed(2)} m
                  {o.sill > 0 ? ` · allège ${o.sill.toFixed(2)} m` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => remove(o.id)}
                  className="kx-focus rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add form */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Mur
            <select
              className={selectCls}
              value={wallIndex}
              onChange={(e) => setWallIndex(Number(e.target.value))}
            >
              {walls.map((i) => (
                <option key={i} value={i}>
                  Mur {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Type
            <select
              className={selectCls}
              value={type}
              onChange={(e) => applyType(e.target.value as OpeningType)}
            >
              {(Object.keys(TYPE_LABELS) as OpeningType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Position (m)
            <input
              type="number"
              step="0.1"
              min="0"
              className={numCls}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Largeur (m)
            <input
              type="number"
              step="0.1"
              min="0.1"
              className={numCls}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Hauteur (m)
            <input
              type="number"
              step="0.1"
              min="0.1"
              className={numCls}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600 dark:text-gray-300">
            Allège (m)
            <input
              type="number"
              step="0.1"
              min="0"
              className={numCls}
              value={sill}
              onChange={(e) => setSill(Number(e.target.value))}
              disabled={type !== 'window'}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={add}>
            Ajouter l'ouverture
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
