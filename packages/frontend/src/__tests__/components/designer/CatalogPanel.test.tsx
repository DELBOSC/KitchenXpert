import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import CatalogPanel from '../../../components/designer/CatalogPanel';

// i18n: t() returns the fallback (2nd arg) so labels/names render as text.
// `t` and the returned object MUST keep a stable identity across renders —
// react-i18next memoizes them; a fresh `t` each call would make the
// localCatalogItems useMemo (dep [brandProfile, t]) recompute every render,
// re-firing the [localCatalogItems] effect → infinite render loop.
const t = (key: string, opts?: string | { defaultValue?: string }): string => {
  if (typeof opts === 'string') return opts;
  if (opts && typeof opts === 'object' && typeof opts.defaultValue === 'string')
    return opts.defaultValue;
  return key;
};
const i18nValue = { t, i18n: { language: 'fr' } };
vi.mock('react-i18next', () => ({
  useTranslation: () => i18nValue,
}));

// 3d-engine: ModelLoader.createProceduralFallback returns a controllable mesh
// stub. handleAddItem overwrites mesh.userData, so a plain object suffices.
const createProceduralFallback = vi.fn(() => ({ userData: {}, position: { y: 0 } }));
vi.mock('@kitchenxpert/3d-engine', () => ({
  ModelLoader: class {
    createProceduralFallback = createProceduralFallback;
  },
  mmToM: (mm: number) => mm / 1000,
}));

// api: list endpoint returns the products we inject per test.
const apiGet = vi.fn();
vi.mock('../../../services/api/api', () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
}));
vi.mock('../../../services/api/endpoints', () => ({
  API_ENDPOINTS: { PRODUCTS: { BASE: '/products' } },
}));

// base_cabinets is expanded by default → product cards render without a click.
// Full enough stub for the localCatalogItems fallback useMemo (base/wall/tall/worktop).
const brandProfile = {
  base: { availableWidths: [600], totalHeight: 900, defaultDepth: 560 },
  wall: { availableHeights: [720], defaultHeight: 720, defaultDepth: 350, bottomY: 1400 },
  tall: { availableHeights: [2000], defaultDepth: 560 },
  worktop: { defaultThickness: 38, overhangFront: 20 },
} as never;

function placedFrom(addObject: ReturnType<typeof vi.fn>): { userData: Record<string, unknown> } {
  // addObject(id, mesh) — the mesh is the 2nd arg of the first call.
  return addObject.mock.calls[0][1] as { userData: Record<string, unknown> };
}

describe('CatalogPanel — SKU binding on placed items (Slice 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('places a catalog product carrying its real sku in userData', async () => {
    apiGet.mockResolvedValue({
      success: true,
      data: {
        data: [
          {
            id: 'p1',
            sku: 'CASTORAMA-4251421945043',
            type: 'base_cabinet',
            name: 'Vicco Facade 45cm',
            width: 450,
            height: 720,
            depth: 560,
            color: 0xffffff,
            category: 'base_cabinets',
            price: 44.9,
          },
        ],
      },
    });
    const addObject = vi.fn();
    render(<CatalogPanel addObject={addObject} brandProfile={brandProfile} />);

    const name = await screen.findByText('Vicco Facade 45cm');
    fireEvent.click(name.closest('button') as HTMLButtonElement);

    expect(addObject).toHaveBeenCalledTimes(1);
    const placed = placedFrom(addObject);
    expect(placed.userData.sku).toBe('CASTORAMA-4251421945043'); // the real catalog SKU flows to userData
    expect(placed.userData.catalogId).toBe('p1'); // existing field untouched
  });

  it('places an item WITHOUT a sku safely (userData.sku undefined, no crash)', async () => {
    apiGet.mockResolvedValue({
      success: true,
      data: {
        data: [
          {
            id: 'p2',
            // no sku — e.g. a legacy/local item
            type: 'base_cabinet',
            name: 'NoSku Cabinet',
            width: 600,
            height: 720,
            depth: 560,
            color: 0xd4a574,
            category: 'base_cabinets',
            price: 99,
          },
        ],
      },
    });
    const addObject = vi.fn();
    render(<CatalogPanel addObject={addObject} brandProfile={brandProfile} />);

    const name = await screen.findByText('NoSku Cabinet');
    fireEvent.click(name.closest('button') as HTMLButtonElement);

    expect(addObject).toHaveBeenCalledTimes(1);
    const placed = placedFrom(addObject);
    expect(placed.userData.sku).toBeUndefined(); // tolerated — optional by design
  });
});
