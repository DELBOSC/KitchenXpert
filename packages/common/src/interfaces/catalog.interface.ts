/**
 * Interfaces pour le catalogue de produits
 */

import { ID } from '../types/base.types';
import { CatalogItem, CatalogSearchParams, ProviderSyncResult } from '../types/catalog.types';

/**
 * Interface pour le service de catalogue
 */
export interface ICatalogService {
  getItem(id: ID): Promise<CatalogItem | null>;
  searchItems(params: CatalogSearchParams): Promise<CatalogSearchResult>;
  syncProvider(providerId: ID): Promise<ProviderSyncResult>;
  getCategories(): Promise<CatalogCategory[]>;
  getBrands(): Promise<CatalogBrand[]>;
}

export interface CatalogSearchResult {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
  facets?: CatalogFacets;
}

export interface CatalogFacets {
  categories: FacetItem[];
  brands: FacetItem[];
  priceRanges: FacetItem[];
  materials: FacetItem[];
}

export interface FacetItem {
  value: string;
  label: string;
  count: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  icon?: string;
  itemCount: number;
  children?: CatalogCategory[];
}

export interface CatalogBrand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  itemCount: number;
}

/**
 * Interface pour l'import de catalogue
 */
export interface ICatalogImporter {
  importFromCsv(file: Buffer, options?: ImportOptions): Promise<ImportResult>;
  importFromExcel(file: Buffer, options?: ImportOptions): Promise<ImportResult>;
  importFromJson(data: unknown[], options?: ImportOptions): Promise<ImportResult>;
  validateImportData(data: unknown[]): Promise<ValidationResult>;
}

export interface ImportOptions {
  updateExisting?: boolean;
  skipInvalid?: boolean;
  dryRun?: boolean;
  mapping?: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
}
