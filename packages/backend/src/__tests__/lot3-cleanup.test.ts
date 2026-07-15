/**
 * Lot 3 — two CodeQL js/remote-property-injection fixes, proven by negative control.
 *
 * Both were mis-scoped as "dead code / just a 500" at first triage. The reading showed
 * they are live and reachable from request input:
 *  - product-repository sortBy flows into orderBy[sortBy] (arbitrary column write);
 *  - toSnakeCase/toCamelCase write result[fn(key)] where key comes from req.body.
 */
import { ProductRepository } from '../repositories/product-repository';
import { toSnakeCase, toCamelCase } from '../services/ai-service-transformers';

import type { PrismaClient } from '@prisma/client';

describe('toSnakeCase/toCamelCase — a __proto__ key cannot corrupt the prototype', () => {
  afterEach(() => {
    // Guard against a leaked pollution from a failing run.
    delete (Object.prototype as Record<string, unknown>).polluted;
  });

  it('🔒 skips __proto__ / constructor / prototype keys (no prototype pollution)', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}, "roomWidth": 3000}');
    const out = toSnakeCase(malicious);
    // The dangerous key is dropped; the real one survives.
    expect(out.room_width).toBe(3000);
    // The meaningful assertion: the returned object's prototype was NOT swapped, so it
    // does not inherit `polluted`. Old code did `result['__proto__'] = {...}` → out.polluted
    // would be 'yes'. New code skips the key → undefined.
    expect((out as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('🔒 toCamelCase (the twin) skips them too', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": "yes"}, "room_width": 3000}');
    const out = toCamelCase(malicious);
    expect(out.roomWidth).toBe(3000);
    expect((out as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('product-repository findAll — sortBy is whitelisted (no arbitrary orderBy column)', () => {
  it('🔒 a malicious sortBy falls back to createdAt; a valid one passes through', async () => {
    const calls: Array<{ orderBy: Record<string, string> }> = [];
    const prisma = {
      product: {
        findMany: (args: { orderBy: Record<string, string> }) => {
          calls.push(args);
          return Promise.resolve([]);
        },
        count: () => Promise.resolve(0),
      },
    } as unknown as PrismaClient;

    const repo = new ProductRepository(prisma);
    await repo.findAll({}, { sortBy: '__proto__; DROP', sortOrder: 'asc' });
    expect(calls[0]?.orderBy).toEqual({ createdAt: 'asc' }); // rejected → default column

    await repo.findAll({}, { sortBy: 'price', sortOrder: 'asc' });
    expect(calls[1]?.orderBy).toEqual({ price: 'asc' }); // whitelisted → passes
  });
});
