import React from 'react';

import { useSandboxStore } from '../../sandbox/store';
import { trackSandbox } from '../../sandbox/useSandboxAnalytics';

/**
 * Sandbox palette — left sidebar with click-to-add cabinet presets.
 *
 * Drag-and-drop into the canvas is a future polish (requires a drop
 * target raycast on the canvas grid). Click-to-add ships now and is
 * fully functional + accessible.
 *
 * Items are stacked at increasing X so the user can see what they
 * just added without orbiting; they can then click+move in a later
 * pass once the gizmos ship.
 */

interface PaletteItem {
  sku: string;
  label: string;
  category: 'caisson' | 'electromenager' | 'colonne';
  width: number; // cm
  depth: number;
  height: number;
  unitPrice: number;
}

const PALETTE: PaletteItem[] = [
  {
    sku: 'METOD-60-WHITE',
    label: 'Caisson bas 60',
    category: 'caisson',
    width: 60,
    depth: 60,
    height: 80,
    unitPrice: 169,
  },
  {
    sku: 'METOD-80-WHITE',
    label: 'Caisson bas 80',
    category: 'caisson',
    width: 80,
    depth: 60,
    height: 80,
    unitPrice: 199,
  },
  {
    sku: 'METOD-100-WHITE',
    label: 'Caisson bas 100',
    category: 'caisson',
    width: 100,
    depth: 60,
    height: 80,
    unitPrice: 239,
  },
  {
    sku: 'METOD-EVIER-60',
    label: 'Caisson évier 60',
    category: 'caisson',
    width: 60,
    depth: 60,
    height: 80,
    unitPrice: 219,
  },
  {
    sku: 'METOD-EVIER-80',
    label: 'Caisson évier 80',
    category: 'caisson',
    width: 80,
    depth: 60,
    height: 80,
    unitPrice: 249,
  },
  {
    sku: 'METOD-PLAQUE-60',
    label: 'Plaque cuisson 60',
    category: 'electromenager',
    width: 60,
    depth: 60,
    height: 80,
    unitPrice: 209,
  },
  {
    sku: 'METOD-PLAQUE-80',
    label: 'Plaque cuisson 80',
    category: 'electromenager',
    width: 80,
    depth: 60,
    height: 80,
    unitPrice: 229,
  },
  {
    sku: 'METOD-FOUR',
    label: 'Caisson four 60',
    category: 'electromenager',
    width: 60,
    depth: 60,
    height: 80,
    unitPrice: 359,
  },
  {
    sku: 'METOD-LAVE-VAIS',
    label: 'Lave-vaisselle 60',
    category: 'electromenager',
    width: 60,
    depth: 60,
    height: 80,
    unitPrice: 449,
  },
  {
    sku: 'METOD-FRIGO',
    label: 'Colonne frigo 60',
    category: 'colonne',
    width: 60,
    depth: 60,
    height: 220,
    unitPrice: 489,
  },
  {
    sku: 'METOD-COIN',
    label: "Caisson d'angle",
    category: 'caisson',
    width: 80,
    depth: 80,
    height: 80,
    unitPrice: 289,
  },
];

const CATEGORY_LABEL: Record<PaletteItem['category'], string> = {
  caisson: 'Caissons',
  electromenager: 'Électroménager',
  colonne: 'Colonnes',
};

export function SandboxPalette(): React.ReactElement {
  const addItem = useSandboxStore((s) => s.addItem);
  const project = useSandboxStore((s) => s.project);
  const itemCount = project?.kitchen.items.length ?? 0;

  const onAdd = (p: PaletteItem): void => {
    // Naive placement: stack along the back wall (y=0, z=0) at increasing X.
    // The user can then click + drag (future polish) to reposition.
    const xCursor = (itemCount * 40) % Math.max(1, project?.kitchen.widthCm ?? 400);
    addItem({
      sku: p.sku,
      label: p.label,
      providerCode: 'IKEA',
      unitPrice: p.unitPrice,
      quantity: 1,
      position: { x: xCursor, y: 0, z: 0 },
      rotation: 0,
      size: { w: p.width, d: p.depth, h: p.height },
    });
    trackSandbox({ type: 'sandbox_first_action', props: { action: 'add_item' } });
  };

  // Group by category for the rendered list
  const grouped = (Object.keys(CATEGORY_LABEL) as PaletteItem['category'][]).map((cat) => ({
    cat,
    items: PALETTE.filter((p) => p.category === cat),
  }));

  return (
    <aside
      aria-label="Catalogue meubles"
      className="absolute left-0 top-0 bottom-0 z-20 flex w-72 flex-col overflow-hidden border-r border-white/10 bg-black/40 backdrop-blur-md"
    >
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-xs uppercase tracking-widest text-white/40">Catalogue</div>
        <div className="mt-1 text-sm font-medium text-white">IKEA METOD</div>
        <div className="mt-1 text-[11px] text-white/40">Cliquez pour ajouter à votre cuisine</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {grouped.map(({ cat, items }) => (
          <section key={cat} className="mb-5">
            <div className="mb-2 px-2 text-[10px] uppercase tracking-widest text-white/40">
              {CATEGORY_LABEL[cat]}
            </div>
            <div className="flex flex-col gap-1">
              {items.map((p) => (
                <button
                  key={p.sku}
                  type="button"
                  data-testid="palette-item"
                  onClick={() => onAdd(p)}
                  className="group flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <div>
                    <div className="font-medium">{p.label}</div>
                    <div className="text-[11px] text-white/40">
                      {p.width} × {p.depth} × {p.height} cm
                    </div>
                  </div>
                  <div className="text-xs tabular-nums text-white/60 group-hover:text-white">
                    {p.unitPrice}&nbsp;€
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer summary */}
      <div className="border-t border-white/10 px-5 py-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-white/50">
            {itemCount} meuble{itemCount > 1 ? 's' : ''}
          </span>
          <span className="font-semibold text-white tabular-nums">
            {(
              project?.kitchen.items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0) ?? 0
            ).toLocaleString('fr-FR')}{' '}
            €
          </span>
        </div>
      </div>
    </aside>
  );
}

export default SandboxPalette;
