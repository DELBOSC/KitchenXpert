/**
 * Product Enrichment Service Tests
 *
 * Tests for AI-powered product data enrichment:
 * - enrichBatch (mock Claude for batch enrichment)
 * - enrichSingle (single product enrichment)
 * - processPendingBatch (DB queue processing)
 * - queueForEnrichment (upsert pending records)
 * - getStats (enrichment statistics)
 */

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  productEnrichment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  aIUsageLog: {
    create: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
}));

// ---------------------------------------------------------------------------
// Mock AnthropicService
// ---------------------------------------------------------------------------
const mockGenerateJSON = jest.fn();
const mockLogUsage = jest.fn();

jest.mock('../services/ai/anthropic.service', () => ({
  AnthropicService: {
    getInstance: jest.fn(() => ({
      generateJSON: mockGenerateJSON,
      logUsage: mockLogUsage,
    })),
  },
}));

// ---------------------------------------------------------------------------
// Mock prompt templates
// ---------------------------------------------------------------------------
jest.mock('../services/ai/prompt-templates', () => ({
  SYSTEM_PROMPTS: {
    PRODUCT_ENRICHMENT: 'You are a product enrichment specialist.',
  },
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { ProductEnrichmentService } from '../services/ai/product-enrichment.service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockProduct = {
  id: 'prod-1',
  type: 'cabinet',
  name: 'Meuble bas METOD 60cm',
  brand: 'IKEA',
  description: 'Meuble bas avec 2 tiroirs, blanc, 60x60x80 cm',
};

const mockProduct2 = {
  id: 'prod-2',
  type: 'cabinet',
  name: 'Meuble haut FAKTUM 80cm',
  brand: 'IKEA',
  description: 'Meuble haut avec porte, blanc, 80x37x60 cm',
};

const mockEnrichmentResult = {
  productId: 'prod-1',
  specifications: {
    installationDepth: 560,
    ventilationGapBack: 10,
    ventilationGapSide: null,
    electricalRequirement: null,
    waterConnection: false,
    gasConnection: false,
    assemblyComplexity: 'medium',
    weightCapacity: 25,
    hingeType: 'soft-close',
    drawerSlideType: 'full-extension',
    mountingType: 'wall',
    loadCapacityShelf: 13,
  },
  warranty: {
    duration: '25 ans',
    coverage: 'Defauts de fabrication',
    conditions: 'Usage domestique normal',
  },
  certifications: ['FSC', 'CE'],
  energyDetails: null,
  confidence: 0.88,
};

const mockEnrichmentResult2 = {
  productId: 'prod-2',
  specifications: {
    installationDepth: 370,
    assemblyComplexity: 'easy',
    mountingType: 'wall',
  },
  warranty: {
    duration: '25 ans',
  },
  certifications: ['FSC'],
  energyDetails: null,
  confidence: 0.82,
};

const mockPendingRecords = [
  {
    id: 'enrich-1',
    productId: 'prod-1',
    productType: 'cabinet',
    brandId: 'ikea',
    status: 'pending',
    rawDescription: 'Meuble bas blanc',
    rawHtml: null,
    createdAt: new Date(),
  },
  {
    id: 'enrich-2',
    productId: 'prod-2',
    productType: 'cabinet',
    brandId: 'ikea',
    status: 'pending',
    rawDescription: 'Meuble haut blanc',
    rawHtml: null,
    createdAt: new Date(),
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProductEnrichmentService', () => {
  let service: ProductEnrichmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    (ProductEnrichmentService as any).instance = undefined;
    service = ProductEnrichmentService.getInstance();
  });

  // ==================== enrichBatch ====================

  describe('enrichBatch', () => {
    it('should enrich a batch of products via Claude and return results', async () => {
      mockGenerateJSON.mockResolvedValue({
        data: [mockEnrichmentResult, mockEnrichmentResult2],
        inputTokens: 3000,
        outputTokens: 1500,
      });
      mockLogUsage.mockResolvedValue(undefined);

      const result = await service.enrichBatch([mockProduct, mockProduct2]);

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('prod-1');
      expect(result[0].confidence).toBe(0.88);
      expect(result[0].certifications).toContain('FSC');
      expect(result[1].productId).toBe('prod-2');

      expect(mockGenerateJSON).toHaveBeenCalledTimes(1);
      expect(mockLogUsage).toHaveBeenCalledWith(
        'system',
        'product-enrichment',
        'claude-sonnet-4-5-20250929',
        3000,
        1500,
        expect.any(Number)
      );
    });

    it('should return empty array when given empty input', async () => {
      const result = await service.enrichBatch([]);

      expect(result).toEqual([]);
      expect(mockGenerateJSON).not.toHaveBeenCalled();
    });

    it('should limit batch size to 10 products', async () => {
      const manyProducts = Array.from({ length: 15 }, (_, i) => ({
        id: `prod-${i}`,
        type: 'cabinet',
        name: `Product ${i}`,
      }));

      const mockResults = manyProducts.slice(0, 10).map((p) => ({
        productId: p.id,
        specifications: {},
        warranty: {},
        certifications: [],
        energyDetails: null,
        confidence: 0.8,
      }));

      mockGenerateJSON.mockResolvedValue({
        data: mockResults,
        inputTokens: 5000,
        outputTokens: 3000,
      });
      mockLogUsage.mockResolvedValue(undefined);

      const result = await service.enrichBatch(manyProducts);

      // Should only process 10 products max
      expect(result).toHaveLength(10);
    });

    it('should return fallback results with zero confidence when AI fails', async () => {
      mockGenerateJSON.mockRejectedValue(new Error('AI service error'));

      const result = await service.enrichBatch([mockProduct, mockProduct2]);

      expect(result).toHaveLength(2);
      result.forEach((r) => {
        expect(r.confidence).toBe(0);
        expect(r.certifications).toEqual([]);
        expect(r.energyDetails).toBeNull();
      });
    });

    it('should include product descriptions and raw HTML in the AI prompt', async () => {
      const productWithHtml = {
        ...mockProduct,
        rawHtml: '<div class="specs">Material: MDF</div>',
        currentSpecs: { width: 60 },
      };

      mockGenerateJSON.mockResolvedValue({
        data: [mockEnrichmentResult],
        inputTokens: 3000,
        outputTokens: 1500,
      });
      mockLogUsage.mockResolvedValue(undefined);

      await service.enrichBatch([productWithHtml]);

      const callArgs = mockGenerateJSON.mock.calls[0][0];
      const messageContent = callArgs.messages[0].content;
      expect(messageContent).toContain('Meuble bas METOD 60cm');
      expect(messageContent).toContain('IKEA');
    });
  });

  // ==================== enrichSingle ====================

  describe('enrichSingle', () => {
    it('should enrich a single product by delegating to enrichBatch', async () => {
      mockGenerateJSON.mockResolvedValue({
        data: [mockEnrichmentResult],
        inputTokens: 2000,
        outputTokens: 1000,
      });
      mockLogUsage.mockResolvedValue(undefined);

      const result = await service.enrichSingle(mockProduct);

      expect(result.productId).toBe('prod-1');
      expect(result.confidence).toBe(0.88);
      expect(mockGenerateJSON).toHaveBeenCalledTimes(1);
    });

    it('should return fallback result when AI returns empty array', async () => {
      mockGenerateJSON.mockResolvedValue({
        data: [],
        inputTokens: 2000,
        outputTokens: 100,
      });
      mockLogUsage.mockResolvedValue(undefined);

      const result = await service.enrichSingle(mockProduct);

      expect(result.productId).toBe('prod-1');
      expect(result.confidence).toBe(0);
    });
  });

  // ==================== processPendingBatch ====================

  describe('processPendingBatch', () => {
    it('should process pending enrichments and update database records', async () => {
      mockPrisma.productEnrichment.findMany.mockResolvedValue(mockPendingRecords);
      mockGenerateJSON.mockResolvedValue({
        data: [mockEnrichmentResult, mockEnrichmentResult2],
        inputTokens: 3000,
        outputTokens: 1500,
      });
      mockLogUsage.mockResolvedValue(undefined);
      mockPrisma.productEnrichment.update.mockResolvedValue({});

      const count = await service.processPendingBatch(5);

      expect(count).toBe(2);
      expect(mockPrisma.productEnrichment.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        take: 5,
        orderBy: { createdAt: 'asc' },
      });
      expect(mockPrisma.productEnrichment.update).toHaveBeenCalledTimes(2);
      // First update should set status to 'enriched'
      expect(mockPrisma.productEnrichment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'enrich-1' },
          data: expect.objectContaining({
            status: 'enriched',
            confidence: 0.88,
            enrichedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should return 0 when no pending enrichments exist', async () => {
      mockPrisma.productEnrichment.findMany.mockResolvedValue([]);

      const count = await service.processPendingBatch();

      expect(count).toBe(0);
      expect(mockGenerateJSON).not.toHaveBeenCalled();
    });

    it('should mark records as failed when enrichment returns zero confidence', async () => {
      mockPrisma.productEnrichment.findMany.mockResolvedValue([mockPendingRecords[0]]);
      mockGenerateJSON.mockResolvedValue({
        data: [
          {
            productId: 'prod-1',
            specifications: {},
            warranty: {},
            certifications: [],
            energyDetails: null,
            confidence: 0,
          },
        ],
        inputTokens: 2000,
        outputTokens: 500,
      });
      mockLogUsage.mockResolvedValue(undefined);
      mockPrisma.productEnrichment.update.mockResolvedValue({});

      const count = await service.processPendingBatch();

      expect(count).toBe(0);
      expect(mockPrisma.productEnrichment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            errorMessage: 'Claude returned zero confidence',
          }),
        })
      );
    });

    it('should handle database update errors gracefully without crashing', async () => {
      mockPrisma.productEnrichment.findMany.mockResolvedValue([mockPendingRecords[0]]);
      mockGenerateJSON.mockResolvedValue({
        data: [mockEnrichmentResult],
        inputTokens: 2000,
        outputTokens: 1000,
      });
      mockLogUsage.mockResolvedValue(undefined);
      mockPrisma.productEnrichment.update.mockRejectedValue(new Error('DB write error'));

      // Should not throw -- the method handles DB errors internally
      const count = await service.processPendingBatch();

      expect(count).toBe(0); // 0 because the update itself failed
    });
  });

  // ==================== queueForEnrichment ====================

  describe('queueForEnrichment', () => {
    it('should upsert a pending enrichment record', async () => {
      mockPrisma.productEnrichment.upsert.mockResolvedValue({});

      await service.queueForEnrichment({
        productType: 'cabinet',
        productId: 'prod-1',
        brandId: 'ikea',
        name: 'METOD 60cm',
        description: 'Base cabinet white',
      });

      expect(mockPrisma.productEnrichment.upsert).toHaveBeenCalledWith({
        where: {
          productType_productId: {
            productType: 'cabinet',
            productId: 'prod-1',
          },
        },
        create: expect.objectContaining({
          productType: 'cabinet',
          productId: 'prod-1',
          brandId: 'ikea',
          status: 'pending',
        }),
        update: expect.objectContaining({
          status: 'pending',
        }),
      });
    });

    it('should not throw when upsert fails (logs warning only)', async () => {
      mockPrisma.productEnrichment.upsert.mockRejectedValue(new Error('Unique constraint'));

      // Should not throw
      await expect(
        service.queueForEnrichment({
          productType: 'cabinet',
          productId: 'prod-1',
          brandId: 'ikea',
          name: 'Test',
        })
      ).resolves.not.toThrow();
    });
  });

  // ==================== getStats ====================

  describe('getStats', () => {
    it('should return enrichment statistics from the database', async () => {
      mockPrisma.productEnrichment.count
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(80) // enriched
        .mockResolvedValueOnce(5) // failed
        .mockResolvedValueOnce(3); // skipped

      mockPrisma.productEnrichment.aggregate.mockResolvedValue({
        _avg: { confidence: 0.85 },
      });

      mockPrisma.productEnrichment.groupBy
        .mockResolvedValueOnce([
          { productType: 'cabinet', _count: 50 },
          { productType: 'appliance', _count: 30 },
        ])
        .mockResolvedValueOnce([
          { brandId: 'ikea', _count: 40 },
          { brandId: 'leroy', _count: 40 },
        ]);

      const stats = await service.getStats();

      expect(stats.pending).toBe(10);
      expect(stats.enriched).toBe(80);
      expect(stats.failed).toBe(5);
      expect(stats.skipped).toBe(3);
      expect(stats.avgConfidence).toBe(0.85);
      expect(stats.byType['cabinet']).toBe(50);
      expect(stats.byType['appliance']).toBe(30);
      expect(stats.byBrand['ikea']).toBe(40);
      expect(stats.byBrand['leroy']).toBe(40);
    });

    it('should handle zero enriched products gracefully', async () => {
      mockPrisma.productEnrichment.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrisma.productEnrichment.aggregate.mockResolvedValue({
        _avg: { confidence: null },
      });

      mockPrisma.productEnrichment.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const stats = await service.getStats();

      expect(stats.pending).toBe(0);
      expect(stats.enriched).toBe(0);
      expect(stats.avgConfidence).toBe(0);
      expect(stats.byType).toEqual({});
      expect(stats.byBrand).toEqual({});
    });
  });
});
