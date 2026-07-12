/**
 * Unit tests for the `resolve_colors` shopping-chat tool dispatch
 * (executeShoppingTool in ai-chat-routes.ts) — CLAUDE.md §15.8.4 P7 Phase 2b.
 *
 * Deterministic dispatch ONLY: the shared variantResolver is mocked, no LLM is
 * involved. The conversational behaviour of Claude (when/how it calls the tool)
 * is NOT unit-testable and is validated manually after merge.
 *
 * ai-chat-routes.ts has module-level side effects (new Anthropic(), route
 * registration), so the heavy deps are mocked just to let the module load.
 */

// The unit under test only depends on these — control them.
const mockResolveColors = jest.fn();
jest.mock('../services/variant-resolver', () => ({
  variantResolver: { resolveColors: (...args: unknown[]) => mockResolveColors(...args) },
}));

const mockSearchProducts = jest.fn();
jest.mock('../services/ai/catalog-search.service', () => ({
  searchProductsStructured: (...args: unknown[]) => mockSearchProducts(...args),
  AICatalogSearchService: jest.fn().mockImplementation(() => ({})),
}));

// Neutralize the module-level `new Anthropic()` (no API key in tests).
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = { create: jest.fn(), stream: jest.fn() };
  },
}));

// Side-effecting / heavy imports pulled in by the route module.
jest.mock('../database/client', () => ({
  prisma: {},
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: unknown) => fn,
}));
jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../api/middleware/rate-limit-middleware', () => ({
  aiRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../services/ai/chat.service', () => ({
  AIChatService: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
    streamChatWithTools: jest.fn(),
  })),
}));
jest.mock('../services/ai/style-transfer.service', () => ({
  StyleTransferService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../services/ai/anthropic.service', () => ({
  AnthropicService: { getInstance: () => ({ generateJSON: jest.fn() }) },
}));

// Import AFTER the mocks so the route module loads against them.
import { executeShoppingTool } from '../api/routes/ai-chat-routes';

const ctx = { userId: 'test-user-1' };

describe('executeShoppingTool — resolve_colors dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('(a) a valid SKU returns { sku, colors } from the resolver', async () => {
    const colors = [{ key: 'blanc' }, { key: 'anthracite' }, { key: 'noir' }];
    mockResolveColors.mockResolvedValue(colors);

    const out = await executeShoppingTool('resolve_colors', { sku: 'CASTORAMA-CANON' }, ctx);

    expect(mockResolveColors).toHaveBeenCalledWith('CASTORAMA-CANON');
    expect(out).toEqual({ sku: 'CASTORAMA-CANON', colors });
  });

  it('(b) an empty sku returns an error and does NOT call the resolver', async () => {
    const out = await executeShoppingTool('resolve_colors', { sku: '' }, ctx);

    expect(out).toEqual({ error: 'sku is required' });
    expect(mockResolveColors).not.toHaveBeenCalled();
  });

  it('(c) a non-string sku returns an error and does NOT call the resolver', async () => {
    const out = await executeShoppingTool('resolve_colors', { sku: 123 }, ctx);

    expect(out).toEqual({ error: 'sku is required' });
    expect(mockResolveColors).not.toHaveBeenCalled();
  });

  it('(d) an unknown sku relays an empty list (200-style, no error)', async () => {
    mockResolveColors.mockResolvedValue([]);

    const out = await executeShoppingTool('resolve_colors', { sku: 'CASTORAMA-UNKNOWN' }, ctx);

    expect(out).toEqual({ sku: 'CASTORAMA-UNKNOWN', colors: [] });
  });

  it('trims the sku before resolving', async () => {
    mockResolveColors.mockResolvedValue([]);

    await executeShoppingTool('resolve_colors', { sku: '  CASTORAMA-CANON  ' }, ctx);

    expect(mockResolveColors).toHaveBeenCalledWith('CASTORAMA-CANON');
  });

  it('(e) a resolver failure degrades gracefully to { error } (does NOT reject)', async () => {
    mockResolveColors.mockRejectedValueOnce(new Error('db down'));

    const out = await executeShoppingTool('resolve_colors', { sku: 'CASTORAMA-CANON' }, ctx);

    expect(out).toEqual({ error: 'color lookup failed' });
  });
});

describe('executeShoppingTool — searchCatalog dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const ROW = {
    sku: 'CASTORAMA-4251421945043',
    name: 'Façade blanche 60 cm',
    brand: 'GoodHome',
    price: 44.9, // Prisma Decimal in prod; Number() normalises either way
    category: { name: 'Façades' },
  };

  it('(a) returns REAL rows mapped to verifiable facts (sku, price) — never []', async () => {
    mockSearchProducts.mockResolvedValue([ROW]);

    const out = await executeShoppingTool('searchCatalog', { query: 'façade blanche' }, ctx);

    expect(out).toEqual({
      count: 1,
      results: [
        {
          sku: 'CASTORAMA-4251421945043',
          name: 'Façade blanche 60 cm',
          brand: 'GoodHome',
          priceEur: 44.9,
          category: 'Façades',
        },
      ],
    });
  });

  it('(b) forwards the structured filters (category→type bridge, brand, maxPrice) + caps at 5', async () => {
    mockSearchProducts.mockResolvedValue([]);

    await executeShoppingTool(
      'searchCatalog',
      { query: 'four', filters: { category: 'appliance', brand: 'BOSCH', maxPriceEur: 600 } },
      ctx
    );

    expect(mockSearchProducts).toHaveBeenCalledWith(
      { query: 'four', type: 'appliance', brand: 'BOSCH', maxPrice: 600 },
      5
    );
  });

  it('(c) ANTI-HALLUCINATION: no match stays empty — the tool never fabricates a fallback', async () => {
    mockSearchProducts.mockResolvedValue([]);

    const out = await executeShoppingTool(
      'searchCatalog',
      { query: 'licorne en titane' },
      ctx
    );

    // count: 0 + results: [] is the ONLY honest answer. The system prompt then
    // forces Claude to say it found nothing rather than invent a product/price.
    expect(out).toEqual({ count: 0, results: [] });
  });

  it('(d) an empty query short-circuits without touching the DB', async () => {
    const out = await executeShoppingTool('searchCatalog', { query: '  ' }, ctx);

    expect(out).toEqual({ count: 0, results: [], note: 'query is required' });
    expect(mockSearchProducts).not.toHaveBeenCalled();
  });

  it('(e) a DB failure degrades gracefully to { error } (does NOT reject the chat turn)', async () => {
    mockSearchProducts.mockRejectedValueOnce(new Error('db down'));

    const out = await executeShoppingTool('searchCatalog', { query: 'façade' }, ctx);

    expect(out).toEqual({ error: 'catalog search failed' });
  });
});
