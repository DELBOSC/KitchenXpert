import { BaseEntity, ID, Metadata } from './base.types';

export type ProductCategory =
  | 'cabinets'
  | 'appliances'
  | 'countertops'
  | 'sinks'
  | 'faucets'
  | 'lighting'
  | 'hardware'
  | 'accessories'
  | 'flooring'
  | 'backsplash';

export type ProductStatus = 'active' | 'inactive' | 'discontinued' | 'coming_soon';

export interface Product extends BaseEntity {
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
}

export interface Brand {
  id: ID;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  country?: string;
  tier: 'budget' | 'mid_range' | 'premium' | 'luxury';
  description?: string;
}

export interface PriceInfo {
  amount: number;
  currency: string;
  originalPrice?: number;
  discountPercent?: number;
  taxIncluded: boolean;
  validUntil?: string;
  pricePerUnit?: {
    amount: number;
    unit: string;
  };
}

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
  unit: 'mm' | 'cm' | 'in';
  weight?: number;
  weightUnit?: 'kg' | 'lb';
}

export interface ProductMaterial {
  name: string;
  type: string;
  finish?: string;
  color?: string;
  percentage?: number;
  isEcoFriendly?: boolean;
}

export interface ProductColor {
  name: string;
  hex: string;
  ral?: string;
  isDefault: boolean;
  image?: string;
  priceModifier?: number;
}

export interface ProductImage {
  id: ID;
  url: string;
  alt: string;
  type: 'main' | 'gallery' | 'detail' | 'dimension' | '3d' | 'lifestyle';
  width: number;
  height: number;
  order: number;
}

export interface ProductDocument {
  id: ID;
  name: string;
  type: 'datasheet' | 'manual' | 'warranty' | 'certificate' | 'cad' | '3d_model';
  url: string;
  format: string;
  size: number;
  language: string;
}

export interface AvailabilityInfo {
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'pre_order' | 'discontinued';
  quantity?: number;
  leadTime?: number;
  leadTimeUnit?: 'days' | 'weeks';
  nextRestockDate?: string;
}

export interface RatingInfo {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  recommended: number;
}

export interface ProductVariant {
  id: ID;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price?: PriceInfo;
  dimensions?: Partial<ProductDimensions>;
  images?: ProductImage[];
  availability?: AvailabilityInfo;
}

// Search types
export interface ProductSearchParams {
  query?: string;
  category?: ProductCategory;
  subcategories?: string[];
  brandIds?: ID[];
  partnerIds?: ID[];
  priceMin?: number;
  priceMax?: number;
  materials?: string[];
  colors?: string[];
  inStock?: boolean;
  minRating?: number;
  features?: string[];
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'popularity';
  page?: number;
  limit?: number;
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  facets: ProductFacets;
}

export interface ProductFacets {
  categories: FacetCount[];
  brands: FacetCount[];
  materials: FacetCount[];
  colors: FacetCount[];
  priceRange: { min: number; max: number };
}

export interface FacetCount {
  value: string;
  label: string;
  count: number;
}
