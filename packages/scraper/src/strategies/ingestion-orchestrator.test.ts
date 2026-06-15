import { describe, it, expect, vi } from 'vitest';

import {
  IngestionOrchestrator,
  SUPPORTED_BRANDS,
  isSupportedBrand,
  IkeaStrategy,
  LapeyreStrategy,
  EprelApplianceStrategy,
  CastoramaStrategy,
  type IngestionFetcher,
} from '@kitchenxpert/common';

const fetcher: IngestionFetcher = {
  fetchJson: vi.fn().mockResolvedValue({}),
  fetchText: vi.fn().mockResolvedValue(''),
};

describe('IngestionOrchestrator', () => {
  it('expose les marques supportées (ikea, lapeyre, eprel, castorama)', () => {
    expect([...SUPPORTED_BRANDS].sort()).toEqual(['castorama', 'eprel', 'ikea', 'lapeyre']);
    expect(new IngestionOrchestrator(fetcher).brands).toEqual(SUPPORTED_BRANDS);
  });

  it('route chaque marque vers la bonne Strategy concrète', () => {
    const o = new IngestionOrchestrator(fetcher);
    expect(o.strategyFor('ikea')).toBeInstanceOf(IkeaStrategy);
    expect(o.strategyFor('lapeyre')).toBeInstanceOf(LapeyreStrategy);
    expect(o.strategyFor('eprel')).toBeInstanceOf(EprelApplianceStrategy);
    expect(o.strategyFor('castorama')).toBeInstanceOf(CastoramaStrategy);
  });

  it('les Strategies routées portent le bon brandId/sourceLevel', () => {
    const o = new IngestionOrchestrator(fetcher);
    expect(o.strategyFor('ikea').brandId).toBe('ikea');
    expect(o.strategyFor('eprel').sourceLevel).toBe(1);
    expect(o.strategyFor('lapeyre').sourceLevel).toBe(2);
    expect(o.strategyFor('castorama').sourceLevel).toBe(3);
  });

  it('throw sur une marque inconnue (message explicite)', () => {
    const o = new IngestionOrchestrator(fetcher);
    expect(() => o.strategyFor('leroy-merlin')).toThrow(/Unknown ingestion brand/i);
  });

  it('isSupportedBrand = type guard fiable', () => {
    expect(isSupportedBrand('ikea')).toBe(true);
    expect(isSupportedBrand('eprel')).toBe(true);
    expect(isSupportedBrand('nope')).toBe(false);
  });
});
