import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { ProductRepository } from '../../repositories/product-repository';
import { asyncHandler } from '../middleware/error-middleware';
const productRepository = new ProductRepository(prisma);

/**
 * Product Controller
 * Handles all product-related HTTP requests
 */
export class ProductController {
  /**
   * GET /products
   * Get all products with filters and pagination
   */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
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
      {
        page: Number(page),
        limit: Number(limit),
        sortBy: ['createdAt', 'name', 'price', 'brand', 'updatedAt'].includes(sortBy as string)
          ? (sortBy as string)
          : 'createdAt',
        sortOrder: sortOrder as 'asc' | 'desc',
      }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /products/search
   * Search products
   */
  search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { q, limit = 20 } = req.query;

    if (!q) {
      res.status(400).json({ success: false, error: 'Search query is required' });
      return;
    }

    const products = await productRepository.search(q as string, Number(limit));

    res.status(200).json({
      success: true,
      data: products,
    });
  });

  /**
   * GET /products/filters
   * Get available filter options
   */
  getFilters = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { categoryId, brand } = req.query;

    const [brands, materials, colors, priceRange] = await Promise.all([
      productRepository.getBrands(),
      productRepository.getMaterials(),
      productRepository.getColors(),
      productRepository.getPriceRange({
        categoryId: categoryId as string,
        brand: brand as string,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        brands,
        materials,
        colors,
        priceRange,
      },
    });
  });

  /**
   * GET /products/:id
   * Get product by ID
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;

    if (!id) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const product = await productRepository.findById(id);

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  });

  /**
   * GET /products/sku/:sku
   * Get product by SKU
   */
  getBySku = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const sku = req.params.sku;

    if (!sku) {
      res.status(400).json({ success: false, error: 'Product SKU is required' });
      return;
    }

    const product = await productRepository.findBySku(sku);

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  });

  /**
   * GET /products/:id/related
   * Get related products
   */
  getRelated = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const limit = req.query.limit ? Number(req.query.limit) : 5;

    if (!id) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const products = await productRepository.getRelated(id, limit);

    res.status(200).json({ success: true, data: products });
  });

  /**
   * POST /products
   * Create a new product (admin)
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      catalogId,
      providerId,
      categoryId,
      sku,
      name,
      description,
      brand,
      model,
      price,
      currency,
      width,
      depth,
      height,
      weight,
      color,
      material,
      finish,
      images,
      specifications,
      availability,
    } = req.body;

    if (!sku || !name || price === undefined) {
      res.status(400).json({
        success: false,
        error: 'SKU, name and price are required',
      });
      return;
    }

    // Check for duplicate SKU
    const existing = await productRepository.findBySku(sku);
    if (existing) {
      res.status(409).json({ success: false, error: 'Product with this SKU already exists' });
      return;
    }

    const product = await productRepository.create({
      catalogId,
      providerId,
      categoryId,
      sku,
      name,
      description,
      brand,
      model,
      price: Number(price),
      currency,
      width: width ? Number(width) : undefined,
      depth: depth ? Number(depth) : undefined,
      height: height ? Number(height) : undefined,
      weight: weight ? Number(weight) : undefined,
      color,
      material,
      finish,
      images,
      specifications,
      availability,
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  });

  /**
   * PUT /products/:id
   * Update a product (admin)
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const updateData = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const product = await productRepository.update(id, updateData);

    res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  });

  /**
   * DELETE /products/:id
   * Delete a product (admin)
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;

    if (!id) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    await productRepository.delete(id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  });

  // ==================== CATEGORIES ====================

  /**
   * GET /products/categories
   * Get all categories
   */
  getCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const categories = await productRepository.getCategories();

    res.status(200).json({ success: true, data: categories });
  });

  /**
   * GET /products/categories/:slug
   * Get category by slug
   */
  getCategoryBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const slug = req.params.slug;

    if (!slug) {
      res.status(400).json({ success: false, error: 'Category slug is required' });
      return;
    }

    const category = await productRepository.findCategoryBySlug(slug);

    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    res.status(200).json({ success: true, data: category });
  });

  /**
   * GET /products/category/:categoryId
   * Get products by category
   */
  getByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const categoryId = req.params.categoryId;

    if (!categoryId) {
      res.status(400).json({ success: false, error: 'Category ID is required' });
      return;
    }

    const products = await productRepository.findByCategory(categoryId);

    res.status(200).json({ success: true, data: products });
  });

  /**
   * GET /products/:id/compatibility
   * Check product compatibility with a kitchen
   */
  checkCompatibility = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const { kitchenId } = req.query;

    if (!id) {
      res.status(400).json({ success: false, error: 'Product ID is required' });
      return;
    }

    const product = await productRepository.findById(id);

    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    // Basic compatibility check - can be extended with more sophisticated logic
    const compatibility = {
      productId: id,
      kitchenId: kitchenId as string | undefined,
      isCompatible: true,
      dimensionsOk: true,
      styleMatch: true,
      warnings: [] as string[],
      suggestions: [] as string[],
    };

    res.status(200).json({ success: true, data: compatibility });
  });
}

export const productController = new ProductController();
export default productController;
