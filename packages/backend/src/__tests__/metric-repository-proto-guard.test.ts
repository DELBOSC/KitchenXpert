/**
 * Regression proof: getLatestValues refuses prototype-polluting metric names.
 *
 * `names` reaches getLatestValues straight from POST /monitoring/metrics/latest
 * (req.body.names, no schema). It writes result[name] via bracket access, so a name of
 * '__proto__' would rebind the result object's prototype (js/remote-property-injection).
 * The guard skips __proto__/constructor/prototype; legit names still map to their value.
 */
import { MetricRepository } from '../repositories/metric-repository';

import type { PrismaClient } from '@prisma/client';

function repoWith(metrics: Array<{ name: string; value: number }>): MetricRepository {
  const prisma = {
    metric: { findMany: jest.fn().mockResolvedValue(metrics) },
  } as unknown as PrismaClient;
  return new MetricRepository(prisma);
}

describe('MetricRepository.getLatestValues — untrusted names cannot pollute the prototype', () => {
  afterEach(() => {
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('🔒 __proto__/constructor/prototype names are skipped, prototype untouched', async () => {
    const repo = repoWith([{ name: 'cpu', value: 42 }]);
    const out = await repo.getLatestValues(['__proto__', 'constructor', 'prototype', 'cpu']);

    // Prototype not rebound…
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    // …no own dangerous keys…
    expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(out, 'constructor')).toBe(false);
    // …legit metric still resolved.
    expect(out.cpu).toBe(42);
  });

  it('resolves a missing metric to null (behaviour unchanged)', async () => {
    const repo = repoWith([]);
    const out = await repo.getLatestValues(['nope']);
    expect(out.nope).toBeNull();
  });
});
