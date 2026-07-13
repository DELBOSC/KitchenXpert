/**
 * The architectural anti-hallucination guardrail (Palier 1).
 *
 * These tests assert the PROPERTY, not the prompt: an unanchored context is handed
 * NO tool, so the model has no fact source and cannot cite a product, a SKU or a
 * price — whatever it is asked. And a forged client payload never becomes a fact:
 * the designer snapshot is re-priced from the DB.
 */
const mockFindMany = jest.fn();
jest.mock('../database/client', () => ({
  prisma: { product: { findMany: (...args: unknown[]) => mockFindMany(...args) } },
}));

import {
  ANCHORED_CONTEXTS,
  ASSISTANT_CONTEXTS,
  CONTEXT_REGISTRY,
  UNANCHORED_CONTEXTS,
  isAnchored,
  verifyDesignerPayload,
} from '../services/ai/assistant-context';

describe('assistant context registry — the guardrail is structural', () => {
  it('EVERY unanchored context is handed ZERO tools (no fact source, by construction)', () => {
    for (const ctx of UNANCHORED_CONTEXTS) {
      expect(CONTEXT_REGISTRY[ctx].tools).toEqual([]);
      expect(isAnchored(ctx)).toBe(false);
    }
  });

  it('anchored contexts expose ONLY the tools that are really wired', () => {
    expect(CONTEXT_REGISTRY.designer.tools).toEqual(['resolve_colors', 'getBudgetSummary']);
    expect(CONTEXT_REGISTRY.catalog.tools).toEqual(['searchCatalog']); // real since #237
    for (const ctx of ANCHORED_CONTEXTS) {
      expect(isAnchored(ctx)).toBe(true);
    }
  });

  it('every declared context has a spec (no context can fall through unguarded)', () => {
    for (const ctx of ASSISTANT_CONTEXTS) {
      expect(CONTEXT_REGISTRY[ctx]).toBeDefined();
      expect(typeof CONTEXT_REGISTRY[ctx].systemPrompt).toBe('string');
      expect(CONTEXT_REGISTRY[ctx].systemPrompt.length).toBeGreaterThan(50);
    }
  });

  it('an unanchored prompt never promises data it does not have', () => {
    const prompt = CONTEXT_REGISTRY.financing.systemPrompt;
    expect(prompt).toMatch(/AUCUN outil/i);
    expect(prompt).toMatch(/n'inventes RIEN|LIGNE ROUGE/i);
  });

  it('rejects a designer payload that is not a kitchen snapshot', () => {
    const r = CONTEXT_REGISTRY.designer.payloadSchema.safeParse({ items: 'nope' });
    expect(r.success).toBe(false);
  });
});

describe('verifyDesignerPayload — a forged client payload never becomes a fact', () => {
  beforeEach(() => jest.clearAllMocks());

  const payload = {
    layout: 'L_SHAPED' as const,
    items: [
      // A REAL sku, but the client claims an absurd price → the DB price must win.
      { id: 'a', sku: 'CASTORAMA-REAL', label: 'client label', unitPriceEur: 1 },
      // A SKU that does not exist → must be DROPPED (nothing can be said about it).
      { id: 'b', sku: 'FAKE-SKU-999', label: 'Cuisine en or massif', unitPriceEur: 99999 },
    ],
  };

  it('re-prices from the DB, drops unknown SKUs, and computes the total server-side', async () => {
    mockFindMany.mockResolvedValue([
      { sku: 'CASTORAMA-REAL', name: 'Meuble haut 60 cm', price: 98.99 },
    ]);

    const v = await verifyDesignerPayload(payload);

    // The client's 1 € is ignored; the catalog's 98.99 € wins.
    expect(v.items).toEqual([
      { id: 'a', sku: 'CASTORAMA-REAL', label: 'Meuble haut 60 cm', unitPriceEur: 98.99 },
    ]);
    // The fake SKU is gone from what the model sees — and is surfaced instead.
    expect(v.unverifiedSkus).toEqual(['FAKE-SKU-999']);
    // The total is the server's arithmetic on DB prices, not the client's 100000.
    expect(v.budgetTotalEur).toBe(98.99);
  });

  it('an all-forged payload yields zero items and a zero total (nothing to cite)', async () => {
    mockFindMany.mockResolvedValue([]);

    const v = await verifyDesignerPayload(payload);

    expect(v.items).toEqual([]);
    expect(v.budgetTotalEur).toBe(0);
    expect(v.unverifiedSkus).toEqual(['CASTORAMA-REAL', 'FAKE-SKU-999']);
  });

  it('does not hit the DB when there is no item', async () => {
    const v = await verifyDesignerPayload({ layout: 'GALLEY', items: [] });

    expect(mockFindMany).not.toHaveBeenCalled();
    expect(v).toMatchObject({ items: [], budgetTotalEur: 0, unverifiedSkus: [] });
  });
});
