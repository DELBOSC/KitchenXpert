import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as THREE from 'three';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import PropertiesPanel from '../../../components/designer/PropertiesPanel';

// vi.mock factories are hoisted above const declarations → reference the spies
// through vi.hoisted to avoid the TDZ. `t`/`i18nValue` keep a stable identity.
const { applyMaterialSpy, apiGet, i18nValue } = vi.hoisted(() => {
  const t = (key: string, opts?: string | { defaultValue?: string }): string => {
    if (typeof opts === 'string') return opts;
    if (opts && typeof opts === 'object' && typeof opts.defaultValue === 'string')
      return opts.defaultValue;
    return key;
  };
  return {
    applyMaterialSpy: vi.fn(),
    apiGet: vi.fn(),
    i18nValue: { t, i18n: { language: 'fr' } },
  };
});

vi.mock('react-i18next', () => ({ useTranslation: () => i18nValue }));

// 3d-engine: spy applyMaterial (shared across instances) + a minimal generic library.
vi.mock('@kitchenxpert/3d-engine', () => ({
  MaterialLibrary: class {
    applyMaterial = applyMaterialSpy;
    getMaterial = vi.fn();
  },
  KITCHEN_MATERIALS: [
    {
      id: 'wood-oak',
      name: 'Chêne naturel',
      type: 'wood',
      color: '#D4A574',
      roughness: 0.75,
      metalness: 0.05,
    },
  ],
}));

vi.mock('../../../services/api/api', () => ({ api: { get: (...a: unknown[]) => apiGet(...a) } }));
vi.mock('../../../services/api/endpoints', () => ({
  API_ENDPOINTS: { CATALOG: { PRODUCTS: '/catalog/products' } },
}));

const COLORS = [
  {
    key: 'anthracite',
    label: 'Anthracite',
    kind: 'color',
    priceFrom: 44.9,
    representativeSku: 'S-ANT',
    score: 60,
    skuCount: 3,
  },
  {
    key: 'blanc',
    label: 'Blanc',
    kind: 'color',
    priceFrom: 42.9,
    representativeSku: 'S-BLC',
    score: 50,
    skuCount: 2,
  },
  {
    key: 'chene',
    label: 'Chêne',
    kind: 'material',
    priceFrom: 49.9,
    representativeSku: 'S-CHN',
    score: 50,
    skuCount: 1,
  },
];

function fakeObject(userData: Record<string, unknown>): THREE.Object3D {
  return {
    // dimensions present → getObjectDimensions uses userData (no THREE.Box3 on a plain fake)
    userData: { dimensions: { width: 0.6, height: 0.72, depth: 0.56 }, ...userData },
    position: { x: 0, y: 0, z: 0 },
    rotation: { y: 0 },
    uuid: 'abcdef1234',
  } as unknown as THREE.Object3D;
}

const props = { engine: null, removeSelected: vi.fn(), duplicateSelected: vi.fn() };

describe('PropertiesPanel — catalog color-picker (Palier 2)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches /colors for a selected object that carries a SKU', async () => {
    apiGet.mockResolvedValue({ success: true, data: COLORS });
    render(<PropertiesPanel {...props} selectedObject={fakeObject({ sku: 'SKU-1' })} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('/catalog/products/SKU-1/colors'));
  });

  it('does NOT fetch /colors when the object has no SKU', async () => {
    apiGet.mockResolvedValue({ success: true, data: [] });
    render(<PropertiesPanel {...props} selectedObject={fakeObject({ id: 'x', name: 'Mur' })} />);
    // let effects flush
    await waitFor(() => expect(screen.getByText('Materiau')).toBeInTheDocument());
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('applies buildCatalogMaterial(key) and sets userData.materialId on swatch click', async () => {
    apiGet.mockResolvedValue({ success: true, data: COLORS });
    const obj = fakeObject({ sku: 'SKU-1' });
    render(<PropertiesPanel {...props} selectedObject={obj} />);

    const swatch = await screen.findByRole('radio', { name: /Anthracite/ });
    fireEvent.click(swatch);

    // materialLibrary.applyMaterial(obj, buildCatalogMaterial('anthracite'))
    const applied = applyMaterialSpy.mock.calls.at(-1);
    expect(applied?.[1]).toMatchObject({ id: 'catalog-anthracite', color: '#3D3D3D' });
    expect((obj.userData as { materialId?: string }).materialId).toBe('catalog-anthracite');
    expect(swatch).toHaveAttribute('aria-checked', 'true');
  });

  it('hides the catalog section (Matériau stays primary) when /colors returns []', async () => {
    apiGet.mockResolvedValue({ success: true, data: [] });
    render(<PropertiesPanel {...props} selectedObject={fakeObject({ sku: 'SKU-EMPTY' })} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    // no radiogroup, header is "Materiau" not "Personnaliser"
    await waitFor(() => expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument());
    expect(screen.getByText('Materiau')).toBeInTheDocument();
    expect(screen.queryByText('Personnaliser')).not.toBeInTheDocument();
  });

  it('R2: catalog and generic selections are mutually exclusive (single source of truth)', async () => {
    apiGet.mockResolvedValue({ success: true, data: COLORS });
    const obj = fakeObject({ sku: 'SKU-1' });
    render(<PropertiesPanel {...props} selectedObject={obj} />);

    // 1) pick a catalog color
    const anthracite = await screen.findByRole('radio', { name: /Anthracite/ });
    fireEvent.click(anthracite);
    expect(anthracite).toHaveAttribute('aria-checked', 'true');

    // 2) open "Personnaliser" and apply a generic material
    fireEvent.click(screen.getByText('Choisir un materiau'));
    fireEvent.click(await screen.findByTitle('Chêne naturel'));

    // generic now owns the selection; catalog swatch deselected (no orphan aria-checked)
    expect((obj.userData as { materialId?: string }).materialId).toBe('wood-oak');
    expect(anthracite).toHaveAttribute('aria-checked', 'false');
  });
});
