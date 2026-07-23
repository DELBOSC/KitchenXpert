import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { KitchenEngine } from '@kitchenxpert/3d-engine';

// Spy on the real apply primitive without pulling in three.js material graphs — we are
// testing the SELECTION logic (which objects get repainted) and the color parsing, not
// MaterialLibrary internals (those have their own tests).
const { applyMaterialSpy } = vi.hoisted(() => ({ applyMaterialSpy: vi.fn() }));

vi.mock('@kitchenxpert/3d-engine', () => ({
  MaterialLibrary: vi.fn(() => ({ applyMaterial: applyMaterialSpy })),
}));
vi.mock('../../../components/designer/build-catalog-material', () => ({
  buildCatalogMaterial: vi.fn((key: string) => ({ id: `catalog-${key}` })),
}));

import {
  applyChatStyleSuggestion,
  extractColorKey,
} from '../../../components/designer/apply-chat-style';

function fakeEngine(objects: Array<{ userData: Record<string, unknown> }>): KitchenEngine {
  const map = new Map(objects.map((o, i) => [String(i), o]));
  return { scene: { getAllObjects: () => map } } as unknown as KitchenEngine;
}

beforeEach(() => {
  applyMaterialSpy.mockClear();
});

describe('extractColorKey', () => {
  it('reads a color at a word start, incl. adjective suffixes', () => {
    expect(extractColorKey('Je verrais bien une finition noire')).toBe('noir');
    expect(extractColorKey('des façades blanches et modernes')).toBe('blanc');
  });

  it('prefers the longest matching key (anthracite over gris)', () => {
    expect(extractColorKey('un gris anthracite chic')).toBe('anthracite');
  });

  it('returns null when no known color is mentioned', () => {
    expect(extractColorKey('ajoute une étagère plus lumineuse')).toBeNull();
  });
});

describe('applyChatStyleSuggestion', () => {
  const scene = [
    { userData: { type: 'cabinet' } },
    { userData: { type: 'wall' } },
    { userData: { type: 'floor' } },
    { userData: { type: 'appliance' } },
    { userData: { type: 'wall_cabinet' } },
    { userData: { isKitchenStructure: true } },
  ];

  it('repaints only furniture — never walls/floor/appliances/structure', () => {
    const engine = fakeEngine(scene);

    const res = applyChatStyleSuggestion(engine, 'suggest_style_improvement', {
      aspect: 'couleurs',
      reason: 'une finition noire donnerait un rendu plus premium',
    });

    // Load-bearing: exactly the 2 cabinets, and nothing else. This fails if the loop
    // iterates the Map entries instead of .values() (undefined userData → everything
    // counts), or if the exclusion filter lets appliances/structure through.
    expect(res).toEqual({ applied: true, colorKey: 'noir', count: 2 });
    expect(applyMaterialSpy).toHaveBeenCalledTimes(2);
    expect(scene[0].userData.materialId).toBe('catalog-noir');
    expect(scene[4].userData.materialId).toBe('catalog-noir');
    // Structure was left alone.
    expect(scene[1].userData.materialId).toBeUndefined();
    expect(scene[2].userData.materialId).toBeUndefined();
    expect(scene[3].userData.materialId).toBeUndefined();
    expect(scene[5].userData.materialId).toBeUndefined();
  });

  it('is a no-op for a non-style tool', () => {
    const res = applyChatStyleSuggestion(fakeEngine(scene), 'estimate_budget', {});
    expect(res.applied).toBe(false);
    expect(applyMaterialSpy).not.toHaveBeenCalled();
  });

  it('is a no-op for a style aspect that is not color/material', () => {
    const res = applyChatStyleSuggestion(fakeEngine(scene), 'suggest_style_improvement', {
      aspect: 'eclairage',
      reason: 'ajoute des spots',
    });
    expect(res.applied).toBe(false);
    expect(applyMaterialSpy).not.toHaveBeenCalled();
  });

  it('is a no-op (honest) when the reason names no known color', () => {
    const res = applyChatStyleSuggestion(fakeEngine(scene), 'suggest_style_improvement', {
      aspect: 'couleurs',
      reason: 'quelque chose de plus lumineux',
    });
    expect(res.applied).toBe(false);
    expect(applyMaterialSpy).not.toHaveBeenCalled();
  });
});
