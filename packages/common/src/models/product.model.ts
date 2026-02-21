/**
 * Product Model Class
 * Provides methods for working with product data
 */

import {
  Product,
  ProductCategory,
  ProductStatus,
  Brand,
  PriceInfo,
  ProductDimensions,
  ProductMaterial,
  ProductColor,
  ProductImage,
  ProductDocument,
  AvailabilityInfo,
  RatingInfo,
  ProductVariant,
  ProductSearchParams,
  ID,
  Metadata,
} from '../types';

export interface ProductCreateInput {
  sku: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: ProductCategory;
  subcategory?: string;
  brandId: ID;
  partnerId: ID;
  price: PriceInfo;
  dimensions: ProductDimensions;
  materials?: ProductMaterial[];
  colors?: ProductColor[];
  images?: ProductImage[];
  documents?: ProductDocument[];
  specifications?: Record<string, string | number | boolean>;
  features?: string[];
  tags?: string[];
  status?: ProductStatus;
  availability?: AvailabilityInfo;
}

export interface ProductUpdateInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  category?: ProductCategory;
  subcategory?: string;
  price?: PriceInfo;
  dimensions?: ProductDimensions;
  materials?: ProductMaterial[];
  colors?: ProductColor[];
  images?: ProductImage[];
  documents?: ProductDocument[];
  specifications?: Record<string, string | number | boolean>;
  features?: string[];
  tags?: string[];
  status?: ProductStatus;
  availability?: AvailabilityInfo;
}

export class ProductModel implements Product {
  id: ID;
  sku: string;
  name: string;
  description: string;
  shortDescription?: string;
  category: ProductCategory;
  subcategory?: string;
  brandId: ID;
  brand?: Brand;
  partnerId: ID;
  price: PriceInfo;
  dimensions: ProductDimensions;
  materials: ProductMaterial[];
  colors: ProductColor[];
  images: ProductImage[];
  documents: ProductDocument[];
  specifications: Record<string, string | number | boolean>;
  features: string[];
  tags: string[];
  status: ProductStatus;
  availability: AvailabilityInfo;
  ratings?: RatingInfo;
  relatedProducts: ID[];
  variants?: ProductVariant[];
  metadata?: Metadata;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: Product) {
    this.id = data.id;
    this.sku = data.sku;
    this.name = data.name;
    this.description = data.description;
    this.shortDescription = data.shortDescription;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.brandId = data.brandId;
    this.brand = data.brand;
    this.partnerId = data.partnerId;
    this.price = data.price;
    this.dimensions = data.dimensions;
    this.materials = data.materials || [];
    this.colors = data.colors || [];
    this.images = data.images || [];
    this.documents = data.documents || [];
    this.specifications = data.specifications || {};
    this.features = data.features || [];
    this.tags = data.tags || [];
    this.status = data.status;
    this.availability = data.availability;
    this.ratings = data.ratings;
    this.relatedProducts = data.relatedProducts || [];
    this.variants = data.variants;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if the product is active
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if the product is discontinued
   */
  isDiscontinued(): boolean {
    return this.status === 'discontinued';
  }

  /**
   * Check if the product is in stock
   */
  isInStock(): boolean {
    return this.availability.status === 'in_stock' || this.availability.status === 'low_stock';
  }

  /**
   * Check if the product has low stock
   */
  hasLowStock(): boolean {
    return this.availability.status === 'low_stock';
  }

  /**
   * Check if the product is out of stock
   */
  isOutOfStock(): boolean {
    return this.availability.status === 'out_of_stock';
  }

  /**
   * Get the main product image
   */
  getMainImage(): ProductImage | null {
    return this.images.find((img) => img.type === 'main') || this.images[0] || null;
  }

  /**
   * Get gallery images
   */
  getGalleryImages(): ProductImage[] {
    return this.images.filter((img) => img.type === 'gallery');
  }

  /**
   * Get the current price
   */
  getCurrentPrice(): number {
    return this.price.amount;
  }

  /**
   * Get the original price (before discount)
   */
  getOriginalPrice(): number {
    return this.price.originalPrice || this.price.amount;
  }

  /**
   * Check if the product has a discount
   */
  hasDiscount(): boolean {
    return !!this.price.discountPercent && this.price.discountPercent > 0;
  }

  /**
   * Get the discount amount
   */
  getDiscountAmount(): number {
    if (!this.hasDiscount() || !this.price.originalPrice) {
      return 0;
    }
    return this.price.originalPrice - this.price.amount;
  }

  /**
   * Get formatted price
   */
  getFormattedPrice(locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.price.currency,
    }).format(this.price.amount);
  }

  /**
   * Get the default color
   */
  getDefaultColor(): ProductColor | null {
    return this.colors.find((color) => color.isDefault) || this.colors[0] || null;
  }

  /**
   * Get the average rating
   */
  getAverageRating(): number {
    return this.ratings?.average || 0;
  }

  /**
   * Get the review count
   */
  getReviewCount(): number {
    return this.ratings?.count || 0;
  }

  /**
   * Check if the product has variants
   */
  hasVariants(): boolean {
    return !!this.variants && this.variants.length > 0;
  }

  /**
   * Get a variant by ID
   */
  getVariant(variantId: ID): ProductVariant | null {
    return this.variants?.find((v) => v.id === variantId) || null;
  }

  /**
   * Check if the product matches search parameters
   */
  matchesSearchParams(params: ProductSearchParams): boolean {
    if (params.category && this.category !== params.category) return false;
    if (params.brandIds && !params.brandIds.includes(this.brandId)) return false;
    if (params.partnerIds && !params.partnerIds.includes(this.partnerId)) return false;
    if (params.priceMin !== undefined && this.price.amount < params.priceMin) return false;
    if (params.priceMax !== undefined && this.price.amount > params.priceMax) return false;
    if (params.inStock && !this.isInStock()) return false;
    if (params.minRating !== undefined && this.getAverageRating() < params.minRating) return false;
    if (params.query) {
      const query = params.query.toLowerCase();
      const searchable = `${this.name} ${this.description} ${this.brand?.name || ''}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  }

  /**
   * Get documents by type
   */
  getDocumentsByType(type: ProductDocument['type']): ProductDocument[] {
    return this.documents.filter((doc) => doc.type === type);
  }

  /**
   * Get the lead time in days
   */
  getLeadTimeDays(): number | null {
    if (!this.availability.leadTime) return null;
    if (this.availability.leadTimeUnit === 'weeks') {
      return this.availability.leadTime * 7;
    }
    return this.availability.leadTime;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Product {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      shortDescription: this.shortDescription,
      category: this.category,
      subcategory: this.subcategory,
      brandId: this.brandId,
      brand: this.brand,
      partnerId: this.partnerId,
      price: this.price,
      dimensions: this.dimensions,
      materials: this.materials,
      colors: this.colors,
      images: this.images,
      documents: this.documents,
      specifications: this.specifications,
      features: this.features,
      tags: this.tags,
      status: this.status,
      availability: this.availability,
      ratings: this.ratings,
      relatedProducts: this.relatedProducts,
      variants: this.variants,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Create a new ProductModel from input data
   */
  static create(input: ProductCreateInput, id: ID): ProductModel {
    const now = new Date();
    return new ProductModel({
      id,
      sku: input.sku,
      name: input.name,
      description: input.description,
      shortDescription: input.shortDescription,
      category: input.category,
      subcategory: input.subcategory,
      brandId: input.brandId,
      partnerId: input.partnerId,
      price: input.price,
      dimensions: input.dimensions,
      materials: input.materials || [],
      colors: input.colors || [],
      images: input.images || [],
      documents: input.documents || [],
      specifications: input.specifications || {},
      features: input.features || [],
      tags: input.tags || [],
      status: input.status || 'active',
      availability: input.availability || { status: 'in_stock' },
      relatedProducts: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default ProductModel;
