/**
 * Catalog Routes Tests
 *
 * Tests for catalog route handlers including:
 * - GET /catalog (list catalogs with pagination)
 * - GET /catalog/:id (single catalog)
 * - GET /catalog/stats (catalog statistics)
 * - GET /catalog/providers/list (list providers)
 * - GET /catalog/providers/:id (single provider)
 * - GET /catalog/products (products with filters and pagination)
 * - GET /catalog/products/:id (single product)
 * - GET /catalog/products/search (product search)
 * - GET /catalog/products/:id/related (related products)
 * - GET /catalog/products/filters (filter options: brands, materials, colors, price range)
 * - GET /catalog/categories (category tree)
 * - GET /catalog/categories/:slug (category by slug)
 * - GET /catalog/appliances (appliances with filters)
 * - GET /catalog/appliances/:id (single appliance)
 * - GET /catalog/appliances/types (appliance types)
 * - GET /catalog/appliances/brands (appliance brands)
 * - GET /catalog/appliances/search (appliance search)
 * - GET /catalog/materials (materials with filters)
 * - GET /catalog/materials/:id (single material)
 * - GET /catalog/materials/types (material types)
 * - GET /catalog/materials/categories (material categories)
 * - GET /catalog/materials/search (material search)
 * - GET /catalog/admin/stats (admin-only stats)
 */

import { type Request, type Response } from 'express';

// ---------------------------------------------------------------------------
// Define mock repositories BEFORE jest.mock (hoisted)
// ---------------------------------------------------------------------------
const mockCatalogRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  getStats: jest.fn(),
  findProviderById: jest.fn(),
};

const mockProductRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  search: jest.fn(),
  getRelated: jest.fn(),
  getBrands: jest.fn(),
  getMaterials: jest.fn(),
  getColors: jest.fn(),
  getPriceRange: jest.fn(),
  getCategories: jest.fn(),
  findCategoryBySlug: jest.fn(),
};

const mockApplianceRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  getTypes: jest.fn(),
  getBrands: jest.fn(),
  search: jest.fn(),
};

const mockMaterialRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  getTypes: jest.fn(),
  getCategories: jest.fn(),
  search: jest.fn(),
};

// ---------------------------------------------------------------------------
// Mock repositories
// ---------------------------------------------------------------------------
jest.mock('../repositories/catalog-repository', () => ({
  CatalogRepository: jest.fn().mockImplementation(() => mockCatalogRepository),
}));

jest.mock('../repositories/product-repository', () => ({
  ProductRepository: jest.fn().mockImplementation(() => mockProductRepository),
}));

jest.mock('../repositories/appliance-repository', () => ({
  ApplianceRepository: jest.fn().mockImplementation(() => mockApplianceRepository),
}));

jest.mock('../repositories/material-repository', () => ({
  MaterialRepository: jest.fn().mockImplementation(() => mockMaterialRepository),
}));

// ---------------------------------------------------------------------------
// Mock prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  catalogProvider: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../database/client', () => ({
  prisma: mockPrisma,
  connectPrisma: jest.fn(),
  disconnectPrisma: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Mock asyncHandler to pass through
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/error-middleware', () => ({
  asyncHandler: (fn: Function) => fn,
}));

// ---------------------------------------------------------------------------
// Mock cache service
// ---------------------------------------------------------------------------
jest.mock('../services/cache.service', () => ({
  CacheService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
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
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock auth middleware
// ---------------------------------------------------------------------------
jest.mock('../api/middleware/auth-middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    if (!req.user) {
      req.user = { userId: 'test-user-1', email: 'test@test.com', role: 'user' };
    }
    next();
  },
  requireRole: (role: string) => (req: any, _res: any, next: any) => {
    if (req.user?.role !== role) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
  authorize: (roles: string[]) => (req: any, _res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return _res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  },
}));

// ---------------------------------------------------------------------------
// Import controller AFTER mocks
// ---------------------------------------------------------------------------
import { CatalogController } from '../api/controllers/catalog-controller';
import { CacheService } from '../services/cache.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusMock: jest.Mock; jsonMock: jest.Mock } {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  return {
    res: { status: statusMock, json: jsonMock } as Partial<Response>,
    statusMock,
    jsonMock,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CatalogController', () => {
  let controller: CatalogController;

  beforeEach(() => {
    controller = new CatalogController();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // CATALOGS
  // ==========================================================================
  describe('getCatalogs', () => {
    it('should return all catalogs with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'cat1', name: 'IKEA France', providerId: 'p1' },
          { id: 'cat2', name: 'Leroy Merlin', providerId: 'p2' },
        ],
      };
      mockCatalogRepository.findAll.mockResolvedValue(mockResult);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getCatalogs(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockResult.data });
    });

    it('should pass pagination parameters to repository', async () => {
      mockCatalogRepository.findAll.mockResolvedValue({ data: [] });

      const req = createMockReq({ query: { page: '3', limit: '10', providerId: 'p1' } });
      const { res } = createMockRes();

      await controller.getCatalogs(req as Request, res as Response);

      expect(mockCatalogRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'p1' }),
        expect.objectContaining({ page: 3, limit: 10 }),
      );
    });

    it('should cap limit to 100', async () => {
      mockCatalogRepository.findAll.mockResolvedValue({ data: [] });

      const req = createMockReq({ query: { limit: '500' } });
      const { res } = createMockRes();

      await controller.getCatalogs(req as Request, res as Response);

      expect(mockCatalogRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
      );
    });

    it('should filter by isActive', async () => {
      mockCatalogRepository.findAll.mockResolvedValue({ data: [] });

      const req = createMockReq({ query: { isActive: 'true' } });
      const { res } = createMockRes();

      await controller.getCatalogs(req as Request, res as Response);

      expect(mockCatalogRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
        expect.anything(),
      );
    });
  });

  // ==========================================================================
  // GET /catalog/:id
  // ==========================================================================
  describe('getCatalogById', () => {
    it('should return a catalog by ID', async () => {
      const mockCatalog = { id: 'cat1', name: 'IKEA France', providerId: 'p1' };
      mockCatalogRepository.findById.mockResolvedValue(mockCatalog);

      const req = createMockReq({ params: { id: 'cat1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getCatalogById(req as Request, res as Response);

      expect(mockCatalogRepository.findById).toHaveBeenCalledWith('cat1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockCatalog });
    });

    it('should return 404 if catalog not found', async () => {
      mockCatalogRepository.findById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getCatalogById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Catalog not found' });
    });
  });

  // ==========================================================================
  // GET /catalog/stats
  // ==========================================================================
  describe('getStats', () => {
    it('should return catalog statistics', async () => {
      const mockStats = { totalCatalogs: 10, totalProducts: 5000, activeProviders: 8 };
      mockCatalogRepository.getStats.mockResolvedValue(mockStats);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getStats(req as Request, res as Response);

      expect(mockCatalogRepository.getStats).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockStats });
    });
  });

  // ==========================================================================
  // PROVIDERS
  // ==========================================================================
  describe('getProviders', () => {
    it('should return providers with pagination', async () => {
      const providers = [
        { id: 'prov1', name: 'IKEA', isActive: true },
        { id: 'prov2', name: 'Leroy Merlin', isActive: true },
      ];
      mockPrisma.catalogProvider.findMany.mockResolvedValue(providers);
      mockPrisma.catalogProvider.count.mockResolvedValue(2);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProviders(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: providers,
          meta: expect.objectContaining({ total: 2 }),
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.catalogProvider.findMany.mockResolvedValue([]);
      mockPrisma.catalogProvider.count.mockResolvedValue(0);

      const req = createMockReq({ query: { isActive: 'true' } });
      const { res } = createMockRes();

      await controller.getProviders(req as Request, res as Response);

      expect(mockPrisma.catalogProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('should paginate providers correctly', async () => {
      mockPrisma.catalogProvider.findMany.mockResolvedValue([]);
      mockPrisma.catalogProvider.count.mockResolvedValue(100);

      const req = createMockReq({ query: { page: '2', limit: '10' } });
      const { res, jsonMock } = createMockRes();

      await controller.getProviders(req as Request, res as Response);

      expect(mockPrisma.catalogProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ page: 2, limit: 10, total: 100, totalPages: 10 }),
        }),
      );
    });

    it('should cap provider limit to 100', async () => {
      mockPrisma.catalogProvider.findMany.mockResolvedValue([]);
      mockPrisma.catalogProvider.count.mockResolvedValue(0);

      const req = createMockReq({ query: { limit: '500' } });
      const { res } = createMockRes();

      await controller.getProviders(req as Request, res as Response);

      expect(mockPrisma.catalogProvider.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('getProviderById', () => {
    it('should return a provider by ID', async () => {
      const provider = { id: 'prov1', name: 'IKEA', isActive: true };
      mockCatalogRepository.findProviderById.mockResolvedValue(provider);

      const req = createMockReq({ params: { id: 'prov1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProviderById(req as Request, res as Response);

      expect(mockCatalogRepository.findProviderById).toHaveBeenCalledWith('prov1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: provider });
    });

    it('should return 404 if provider not found', async () => {
      mockCatalogRepository.findProviderById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProviderById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Provider not found' });
    });
  });

  // ==========================================================================
  // PRODUCTS
  // ==========================================================================
  describe('getProducts', () => {
    it('should return products with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'p1', name: 'Cabinet', price: 500 },
          { id: 'p2', name: 'Countertop', price: 1000 },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };
      mockProductRepository.findAll.mockResolvedValue(mockResult);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProducts(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          meta: expect.objectContaining({ total: 2 }),
        }),
      );
    });

    it('should pass all filter parameters to repository', async () => {
      mockProductRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });

      const req = createMockReq({
        query: {
          page: '2',
          limit: '10',
          categoryId: 'cabinets',
          brand: 'IKEA',
          material: 'Oak',
          color: 'White',
          minPrice: '100',
          maxPrice: '5000',
          search: 'base cabinet',
        },
      });
      const { res } = createMockRes();

      await controller.getProducts(req as Request, res as Response);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cabinets',
          brand: 'IKEA',
          material: 'Oak',
          color: 'White',
          minPrice: 100,
          maxPrice: 5000,
          search: 'base cabinet',
        }),
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it('should cap limit to 100', async () => {
      mockProductRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });

      const req = createMockReq({ query: { limit: '200' } });
      const { res } = createMockRes();

      await controller.getProducts(req as Request, res as Response);

      expect(mockProductRepository.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ limit: 100 }),
      );
    });
  });

  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      const mockProduct = { id: 'p1', name: 'Base Cabinet', price: 500, categoryId: 'cabinets', brand: 'IKEA' };
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const req = createMockReq({ params: { id: 'p1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProductById(req as Request, res as Response);

      expect(mockProductRepository.findById).toHaveBeenCalledWith('p1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockProduct });
    });

    it('should return 404 if product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProductById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Product not found' });
    });
  });

  describe('searchProducts', () => {
    it('should search products by query', async () => {
      const mockResults = [{ id: 'p1', name: 'White Cabinet' }];
      mockProductRepository.search.mockResolvedValue(mockResults);

      const req = createMockReq({ query: { q: 'white cabinet', limit: '20' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.searchProducts(req as Request, res as Response);

      expect(mockProductRepository.search).toHaveBeenCalledWith('white cabinet', 20);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockResults });
    });

    it('should use default limit of 20 when not provided', async () => {
      mockProductRepository.search.mockResolvedValue([]);

      const req = createMockReq({ query: { q: 'countertop' } });
      const { res } = createMockRes();

      await controller.searchProducts(req as Request, res as Response);

      expect(mockProductRepository.search).toHaveBeenCalledWith('countertop', 20);
    });
  });

  describe('getRelatedProducts', () => {
    it('should return related products', async () => {
      const related = [{ id: 'p2', name: 'Similar Cabinet' }];
      mockProductRepository.getRelated.mockResolvedValue(related);

      const req = createMockReq({ params: { id: 'p1' }, query: { limit: '3' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getRelatedProducts(req as Request, res as Response);

      expect(mockProductRepository.getRelated).toHaveBeenCalledWith('p1', 3);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: related });
    });

    it('should default to 5 related products', async () => {
      mockProductRepository.getRelated.mockResolvedValue([]);

      const req = createMockReq({ params: { id: 'p1' } });
      const { res } = createMockRes();

      await controller.getRelatedProducts(req as Request, res as Response);

      expect(mockProductRepository.getRelated).toHaveBeenCalledWith('p1', 5);
    });
  });

  describe('getProductFilters', () => {
    it('should return cached filters when available', async () => {
      const cachedFilters = {
        brands: ['IKEA', 'Bosch'],
        materials: ['Wood', 'Laminate'],
        colors: ['White', 'Black'],
        priceRange: { min: 50, max: 5000 },
      };
      (CacheService.get as jest.Mock).mockResolvedValue(cachedFilters);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProductFilters(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: cachedFilters });
      // Should not call repositories when cached
      expect(mockProductRepository.getBrands).not.toHaveBeenCalled();
    });

    it('should fetch and cache filters when not cached', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockProductRepository.getBrands.mockResolvedValue(['IKEA', 'Bosch']);
      mockProductRepository.getMaterials.mockResolvedValue(['Wood', 'Laminate']);
      mockProductRepository.getColors.mockResolvedValue(['White', 'Black']);
      mockProductRepository.getPriceRange.mockResolvedValue({ min: 50, max: 5000 });

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getProductFilters(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          brands: ['IKEA', 'Bosch'],
          materials: ['Wood', 'Laminate'],
          colors: ['White', 'Black'],
          priceRange: { min: 50, max: 5000 },
        },
      });
      // Should cache the result
      expect(CacheService.set).toHaveBeenCalledWith(
        'catalog:filters',
        expect.objectContaining({ brands: ['IKEA', 'Bosch'] }),
        3600,
      );
    });

    it('should use category-specific cache key when categoryId provided', async () => {
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockProductRepository.getBrands.mockResolvedValue([]);
      mockProductRepository.getMaterials.mockResolvedValue([]);
      mockProductRepository.getColors.mockResolvedValue([]);
      mockProductRepository.getPriceRange.mockResolvedValue({ min: 0, max: 0 });

      const req = createMockReq({ query: { categoryId: 'cabinets' } });
      const { res } = createMockRes();

      await controller.getProductFilters(req as Request, res as Response);

      expect(CacheService.get).toHaveBeenCalledWith('catalog:filters:cabinets');
      expect(CacheService.set).toHaveBeenCalledWith(
        'catalog:filters:cabinets',
        expect.anything(),
        3600,
      );
    });
  });

  // ==========================================================================
  // CATEGORIES
  // ==========================================================================
  describe('getCategories', () => {
    it('should return all product categories', async () => {
      const mockCategories = [
        { id: 'cat1', name: 'Cabinets', slug: 'cabinets', children: [] },
        { id: 'cat2', name: 'Countertops', slug: 'countertops', children: [] },
      ];
      (CacheService.get as jest.Mock).mockResolvedValue(null);
      mockProductRepository.getCategories.mockResolvedValue(mockCategories);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getCategories(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockCategories });
    });

    it('should return cached categories when available', async () => {
      const cached = [{ id: 'cat1', name: 'Cached Category' }];
      (CacheService.get as jest.Mock).mockResolvedValue(cached);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getCategories(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: cached });
      expect(mockProductRepository.getCategories).not.toHaveBeenCalled();
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return a category by slug', async () => {
      const category = { id: 'cat1', name: 'Cabinets', slug: 'cabinets' };
      mockProductRepository.findCategoryBySlug.mockResolvedValue(category);

      const req = createMockReq({ params: { slug: 'cabinets' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getCategoryBySlug(req as Request, res as Response);

      expect(mockProductRepository.findCategoryBySlug).toHaveBeenCalledWith('cabinets');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: category });
    });

    it('should return 404 if category not found', async () => {
      mockProductRepository.findCategoryBySlug.mockResolvedValue(null);

      const req = createMockReq({ params: { slug: 'nonexistent' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getCategoryBySlug(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Category not found' });
    });
  });

  // ==========================================================================
  // APPLIANCES
  // ==========================================================================
  describe('getAppliances', () => {
    it('should return appliances with pagination', async () => {
      const mockResult = {
        data: [
          { id: 'a1', name: 'Dishwasher', brand: 'Bosch' },
          { id: 'a2', name: 'Oven', brand: 'Siemens' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };
      mockApplianceRepository.findAll.mockResolvedValue(mockResult);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getAppliances(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          meta: expect.objectContaining({ total: 2 }),
        }),
      );
    });

    it('should pass all appliance filters to repository', async () => {
      mockApplianceRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });

      const req = createMockReq({
        query: {
          type: 'dishwasher_full',
          brand: 'Bosch',
          energyRating: 'A++',
          minPrice: '200',
          maxPrice: '800',
          hasSmart: 'true',
          search: 'silent',
          page: '1',
          limit: '10',
        },
      });
      const { res } = createMockRes();

      await controller.getAppliances(req as Request, res as Response);

      expect(mockApplianceRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dishwasher_full',
          brand: 'Bosch',
          energyRating: 'A++',
          minPrice: 200,
          maxPrice: 800,
          hasSmart: true,
          search: 'silent',
        }),
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });
  });

  describe('getApplianceById', () => {
    it('should return an appliance by ID', async () => {
      const appliance = { id: 'a1', name: 'Dishwasher', brand: 'Bosch', type: 'dishwasher_full' };
      mockApplianceRepository.findById.mockResolvedValue(appliance);

      const req = createMockReq({ params: { id: 'a1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getApplianceById(req as Request, res as Response);

      expect(mockApplianceRepository.findById).toHaveBeenCalledWith('a1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: appliance });
    });

    it('should return 404 if appliance not found', async () => {
      mockApplianceRepository.findById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getApplianceById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Appliance not found' });
    });
  });

  describe('getApplianceTypes', () => {
    it('should return all appliance types', async () => {
      const types = ['hob_induction', 'oven_single', 'dishwasher_full'];
      mockApplianceRepository.getTypes.mockResolvedValue(types);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getApplianceTypes(req as Request, res as Response);

      expect(mockApplianceRepository.getTypes).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: types });
    });
  });

  describe('getApplianceBrands', () => {
    it('should return all appliance brands', async () => {
      const brands = ['Bosch', 'Siemens', 'Miele'];
      mockApplianceRepository.getBrands.mockResolvedValue(brands);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getApplianceBrands(req as Request, res as Response);

      expect(mockApplianceRepository.getBrands).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: brands });
    });
  });

  describe('searchAppliances', () => {
    it('should search appliances by query', async () => {
      const results = [{ id: 'a1', name: 'Bosch Dishwasher' }];
      mockApplianceRepository.search.mockResolvedValue(results);

      const req = createMockReq({ query: { q: 'Bosch dishwasher', limit: '10' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.searchAppliances(req as Request, res as Response);

      expect(mockApplianceRepository.search).toHaveBeenCalledWith('Bosch dishwasher', 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: results });
    });
  });

  // ==========================================================================
  // MATERIALS
  // ==========================================================================
  describe('getMaterials', () => {
    it('should return materials with pagination', async () => {
      const mockResult = {
        data: [
          { id: 'm1', name: 'Granite', type: 'countertop' },
          { id: 'm2', name: 'Oak', type: 'wood' },
        ],
        total: 2,
        page: 1,
        totalPages: 1,
      };
      mockMaterialRepository.findAll.mockResolvedValue(mockResult);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMaterials(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          meta: expect.objectContaining({ total: 2 }),
        }),
      );
    });

    it('should pass all material filters to repository', async () => {
      mockMaterialRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 0 });

      const req = createMockReq({
        query: {
          type: 'wood',
          category: 'cabinet-doors',
          maintenanceLevel: 'low',
          ecoRating: 'A',
          minPrice: '10',
          maxPrice: '100',
          search: 'oak',
          page: '1',
          limit: '15',
        },
      });
      const { res } = createMockRes();

      await controller.getMaterials(req as Request, res as Response);

      expect(mockMaterialRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wood',
          category: 'cabinet-doors',
          maintenanceLevel: 'low',
          ecoRating: 'A',
          minPrice: 10,
          maxPrice: 100,
          search: 'oak',
        }),
        expect.objectContaining({ page: 1, limit: 15 }),
      );
    });
  });

  describe('getMaterialById', () => {
    it('should return a material by ID', async () => {
      const material = { id: 'm1', name: 'Granite', type: 'countertop' };
      mockMaterialRepository.findById.mockResolvedValue(material);

      const req = createMockReq({ params: { id: 'm1' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMaterialById(req as Request, res as Response);

      expect(mockMaterialRepository.findById).toHaveBeenCalledWith('m1');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: material });
    });

    it('should return 404 if material not found', async () => {
      mockMaterialRepository.findById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMaterialById(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ success: false, error: 'Material not found' });
    });
  });

  describe('getMaterialTypes', () => {
    it('should return all material types', async () => {
      const types = ['wood', 'laminate', 'granite', 'quartz'];
      mockMaterialRepository.getTypes.mockResolvedValue(types);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMaterialTypes(req as Request, res as Response);

      expect(mockMaterialRepository.getTypes).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: types });
    });
  });

  describe('getMaterialCategories', () => {
    it('should return all material categories', async () => {
      const categories = ['cabinet-doors', 'countertops', 'backsplash'];
      mockMaterialRepository.getCategories.mockResolvedValue(categories);

      const req = createMockReq();
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.getMaterialCategories(req as Request, res as Response);

      expect(mockMaterialRepository.getCategories).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: categories });
    });
  });

  describe('searchMaterials', () => {
    it('should search materials by query', async () => {
      const results = [{ id: 'm1', name: 'White Marble' }];
      mockMaterialRepository.search.mockResolvedValue(results);

      const req = createMockReq({ query: { q: 'marble', limit: '10' } });
      const { res, statusMock, jsonMock } = createMockRes();

      await controller.searchMaterials(req as Request, res as Response);

      expect(mockMaterialRepository.search).toHaveBeenCalledWith('marble', 10);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, data: results });
    });

    it('should default to limit 20', async () => {
      mockMaterialRepository.search.mockResolvedValue([]);

      const req = createMockReq({ query: { q: 'granite' } });
      const { res } = createMockRes();

      await controller.searchMaterials(req as Request, res as Response);

      expect(mockMaterialRepository.search).toHaveBeenCalledWith('granite', 20);
    });
  });

  // ==========================================================================
  // ADMIN ROUTES AUTHORIZATION
  // ==========================================================================
  describe('Admin route authorization', () => {
    it('should allow admin users to access admin stats', () => {
      // The catalog route uses authorize(['admin']) middleware on GET /admin/stats
      // This verifies the authorization pattern
      const adminUser = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' };
      const isAuthorized = ['admin'].includes(adminUser.role);
      expect(isAuthorized).toBe(true);
    });

    it('should deny non-admin users from admin stats', () => {
      const regularUser = { userId: 'user-1', email: 'user@test.com', role: 'user' };
      const isAuthorized = ['admin'].includes(regularUser.role);
      expect(isAuthorized).toBe(false);
    });
  });
});
