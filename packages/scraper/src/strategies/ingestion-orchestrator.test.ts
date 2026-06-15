import { describe, it, expect, vi } from 'vitest';

import {
  IngestionOrchestrator,
  SUPPORTED_BRANDS,
  isSupportedBrand,
  IkeaStrategy,
  LapeyreStrategy,
  EprelApplianceStrategy,
  type JsonFetcher,
} from '@kitchenxpert/common';

const fetcher: JsonFetcher = { fetchJson: vi.fn().mockResolvedValue({}) };

describe('IngestionOrchestrator', () => {
  it('expose les marques supportées (ikea, lapeyre, eprel)', () => {
    expect([...SUPPORTED_BRANDS].sort()).toEqual(['eprel', 'ikea', 'lapeyre']);
    expect(new IngestionOrchestrator(fetcher).brands).toEqual(SUPPORTED_BRANDS);
  });

  it('route chaque marque vers la bonne Strategy concrète', () => {
    const o = new IngestionOrchestrator(fetcher);
    expect(o.strategyFor('ikea')).toBeInstanceOf(IkeaStrategy);
    expect(o.strategyFor('lapeyre')).toBeInstanceOf(LapeyreStrategy);
    expect(o.strategyFor('eprel')).toBeInstanceOf(EprelApplianceStrategy);
  });

  it('les Strategies routées portent le bon brandId/sourceLevel', () => {
    const o = new IngestionOrchestrator(fetcher);
    expect(o.strategyFor('ikea').brandId).toBe('ikea');
    expect(o.strategyFor('eprel').sourceLevel).toBe(1);
    expect(o.strategyFor('lapeyre').sourceLevel).toBe(2);
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
