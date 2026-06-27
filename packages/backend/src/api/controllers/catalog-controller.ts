import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { ApplianceRepository } from '../../repositories/appliance-repository';
import { CatalogRepository } from '../../repositories/catalog-repository';
import { MaterialRepository } from '../../repositories/material-repository';
import { ProductRepository } from '../../repositories/product-repository';
import { CacheService } from '../../services/cache.service';
import { variantResolver } from '../../services/variant-resolver';
import { asyncHandler } from '../middleware/error-middleware';
const catalogRepository = new CatalogRepository(prisma);
const productRepository = new ProductRepository(prisma);
const applianceRepository = new ApplianceRepository(prisma);
const materialRepository = new MaterialRepository(prisma);

/**
 * Catalog Controller
 * Handles all catalog, product, appliance, and material HTTP requests
 */
export class CatalogController {
  // ==================== CATALOGS ====================

  /**
   * GET /catalogs
   * Get all catalogs
   */
  getCatalogs = asyncHandler(async (req: Request, res: Response) => {
    const { providerId, isActive, page = 1, limit = 20 } = req.query;
    const result = await catalogRepository.findAll(
      { providerId: providerId as string, isActive: isActive === 'true' },
      { page: Number(page), limit: Math.min(Number(limit), 100) }
    );
    res.status(200).json({ success: true, data: result.data });
  });

  /**
   * GET /catalogs/:id
   * Get a catalog by ID
   */
  getCatalogById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const catalog = await catalogRepository.findById(id);
    if (!catalog) {
      res.status(404).json({ success: false, error: 'Catalog not found' });
      return;
    }
    res.status(200).json({ success: true, data: catalog });
  });

  /**
   * GET /catalogs/stats
   * Get catalog statistics
   */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await catalogRepository.getStats();
    res.status(200).json({ success: true, data: stats });
  });

  // ==================== PROVIDERS ====================

  /**
   * GET /providers
   * Get all catalog providers
   */
  getProviders = asyncHandler(async (req: Request, res: Response) => {
    const { isActive, page = 1, limit = 50 } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    const [providers, total] = await Promise.all([
      prisma.catalogProvider.findMany({ where, skip, take: limitNum, orderBy: { name: 'asc' } }),
      prisma.catalogProvider.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: providers,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  });

  /**
   * GET /providers/:id
   * Get a provider by ID
   */
  getProviderById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const provider = await catalogRepository.findProviderById(id);
    if (!provider) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }
    res.status(200).json({ success: true, data: provider });
  });

  // ==================== PRODUCTS ====================

  /**
   * GET /products
   * Get all products with filters
   */
  getProducts = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      categoryId,
      brand,
      material,
      color,
      minPrice,
      maxPrice,
      search,
    } = req.query;

    const result = await productRepository.findAll(
      {
        categoryId: categoryId as string,
        brand: brand as string,
        material: material as string,
        color: color as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        search: search as string,
      },
      { page: Number(page), limit: Math.min(Number(limit), 100) }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: Math.min(Number(limit), 100),
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /products/:id
   * Get a product by ID
   */
  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const product = await productRepository.findById(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.status(200).json({ success: true, data: product });
  });

  /**
   * GET /products/search
   * Search products
   */
  searchProducts = asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = 20 } = req.query;
    const products = await productRepository.search(q as string, Number(limit));
    res.status(200).json({ success: true, data: products });
  });

  /**
   * GET /products/:id/related
   * Get related products
   */
  getRelatedProducts = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { limit = 5 } = req.query;
    const products = await productRepository.getRelated(id, Number(limit));
    res.status(200).json({ success: true, data: products });
  });

  /**
   * GET /products/:sku/colors
   * Offerable color choices of a gamme, resolved from ANY of its SKUs
   * (canonical or variant). 404 if the SKU does not exist; 200 with an empty
   * array if it exists but offers no recognizable color.
   */
  getProductColors = asyncHandler(async (req: Request, res: Response) => {
    const sku = req.params.sku as string;
    if (!sku) {
      res.status(400).json({ success: false, error: 'sku is required' });
      return;
    }
    const product = await productRepository.findBySku(sku);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    const colors = await variantResolver.resolveColors(sku);
    res.status(200).json({ success: true, data: colors });
  });

  /**
   * GET /products/filters
   * Get available product filters (brands, materials, colors, price range)
   */
  getProductFilters = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.query;
    const cacheKey = categoryId ? `catalog:filters:${categoryId}` : 'catalog:filters';

    const cached = await CacheService.get<{
      brands: unknown;
      materials: unknown;
      colors: unknown;
      priceRange: unknown;
    }>(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, data: cached });
      return;
    }

    const [brands, materials, colors, priceRange] = await Promise.all([
      productRepository.getBrands(),
      productRepository.getMaterials(),
      productRepository.getColors(),
      productRepository.getPriceRange({ categoryId: categoryId as string }),
    ]);

    const data = { brands, materials, colors, priceRange };
    await CacheService.set(cacheKey, data, 3600);

    res.status(200).json({ success: true, data });
  });

  // ==================== CATEGORIES ====================

  /**
   * GET /categories
   * Get all product categories (tree structure)
   */
  getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const cacheKey = 'catalog:categories';

    const cached = await CacheService.get<unknown>(cacheKey);
    if (cached) {
      res.status(200).json({ success: true, data: cached });
      return;
    }

    const categories = await productRepository.getCategories();
    await CacheService.set(cacheKey, categories, 3600);

    res.status(200).json({ success: true, data: categories });
  });

  /**
   * GET /categories/:slug
   * Get a category by slug
   */
  getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = req.params.slug as string;
    const category = await productRepository.findCategoryBySlug(slug);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }
    res.status(200).json({ success: true, data: category });
  });

  // ==================== APPLIANCES ====================

  /**
   * GET /appliances
   * Get all appliances with filters
   */
  getAppliances = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      type,
      brand,
      energyRating,
      minPrice,
      maxPrice,
      hasSmart,
      search,
    } = req.query;

    const result = await applianceRepository.findAll(
      {
        type: type as string,
        brand: brand as string,
        energyRating: energyRating as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        hasSmart: hasSmart === 'true',
        search: search as string,
      },
      { page: Number(page), limit: Math.min(Number(limit), 100) }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: Math.min(Number(limit), 100),
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /appliances/:id
   * Get an appliance by ID
   */
  getApplianceById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const appliance = await applianceRepository.findById(id);
    if (!appliance) {
      res.status(404).json({ success: false, error: 'Appliance not found' });
      return;
    }
    res.status(200).json({ success: true, data: appliance });
  });

  /**
   * GET /appliances/types
   * Get all appliance types
   */
  getApplianceTypes = asyncHandler(async (_req: Request, res: Response) => {
    const types = await applianceRepository.getTypes();
    res.status(200).json({ success: true, data: types });
  });

  /**
   * GET /appliances/brands
   * Get all appliance brands
   */
  getApplianceBrands = asyncHandler(async (_req: Request, res: Response) => {
    const brands = await applianceRepository.getBrands();
    res.status(200).json({ success: true, data: brands });
  });

  /**
   * GET /appliances/search
   * Search appliances
   */
  searchAppliances = asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = 20 } = req.query;
    const appliances = await applianceRepository.search(q as string, Number(limit));
    res.status(200).json({ success: true, data: appliances });
  });

  // ==================== MATERIALS ====================

  /**
   * GET /materials
   * Get all materials with filters
   */
  getMaterials = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      maintenanceLevel,
      ecoRating,
      minPrice,
      maxPrice,
      search,
    } = req.query;

    const result = await materialRepository.findAll(
      {
        type: type as string,
        category: category as string,
        maintenanceLevel: maintenanceLevel as string,
        ecoRating: ecoRating as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        search: search as string,
      },
      { page: Number(page), limit: Math.min(Number(limit), 100) }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: Math.min(Number(limit), 100),
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /materials/:id
   * Get a material by ID
   */
  getMaterialById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const material = await materialRepository.findById(id);
    if (!material) {
      res.status(404).json({ success: false, error: 'Material not found' });
      return;
    }
    res.status(200).json({ success: true, data: material });
  });

  /**
   * GET /materials/types
   * Get all material types
   */
  getMaterialTypes = asyncHandler(async (_req: Request, res: Response) => {
    const types = await materialRepository.getTypes();
    res.status(200).json({ success: true, data: types });
  });

  /**
   * GET /materials/categories
   * Get all material categories
   */
  getMaterialCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await materialRepository.getCategories();
    res.status(200).json({ success: true, data: categories });
  });

  /**
   * GET /materials/search
   * Search materials
   */
  searchMaterials = asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = 20 } = req.query;
    const materials = await materialRepository.search(q as string, Number(limit));
    res.status(200).json({ success: true, data: materials });
  });
}

export const catalogController = new CatalogController();
export default catalogController;
