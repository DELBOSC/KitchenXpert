import { CatalogItem, ProviderConfig, ProviderSyncResult } from '@common/types';

/**
 * Interface pour un client API de provider
 */
export interface IProviderApiClient {
  fetchProducts(options?: FetchOptions): Promise<ProviderProduct[]>;
  fetchProductById(id: string): Promise<ProviderProduct>;
  testConnection(): Promise<boolean>;
}

/**
 * Interface pour un mapper de schéma
 */
export interface ISchemaMapper {
  mapToCatalogItem(providerProduct: ProviderProduct): CatalogItem;
  mapToProviderFormat(catalogItem: CatalogItem): ProviderProduct;
}

/**
 * Interface pour un transformer
 */
export interface ITransformer {
  transformDimensions(data: any): { width: number; depth: number; height: number };
  transformPrice(data: any): { price: number; currency: string };
  transformImages(data: any): Array<{ url: string; isPrimary: boolean; order: number }>;
  transformSpecifications(data: any): Record<string, unknown>;
}

/**
 * Interface pour un validateur
 */
export interface IValidator {
  validate(data: ProviderProduct): ValidationResult;
  validateCatalogItem(item: CatalogItem): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FetchOptions {
  category?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export interface ProviderProduct {
  id: string;
  [key: string]: any;
}

/**
 * Classe abstraite de base pour tous les providers
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected apiClient: IProviderApiClient;
  protected schemaMapper: ISchemaMapper;
  protected transformer: ITransformer;
  protected validator: IValidator;

  constructor(
    config: ProviderConfig,
    apiClient: IProviderApiClient,
    schemaMapper: ISchemaMapper,
    transformer: ITransformer,
    validator: IValidator
  ) {
    this.config = config;
    this.apiClient = apiClient;
    this.schemaMapper = schemaMapper;
    this.transformer = transformer;
    this.validator = validator;
  }

  /**
   * Synchronise les produits du provider
   */
  async sync(): Promise<ProviderSyncResult> {
    const startTime = new Date();
    let itemsAdded = 0;
    let itemsUpdated = 0;
    let itemsRemoved = 0;
    const errors: string[] = [];

    try {
      // Tester la connexion
      const connected = await this.apiClient.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to provider API');
      }

      // Récupérer les produits
      const products = await this.apiClient.fetchProducts();

      for (const product of products) {
        try {
          // Valider le produit
          const validationResult = this.validator.validate(product);
          if (!validationResult.valid) {
            errors.push(
              `Invalid product ${product.id}: ${validationResult.errors.join(', ')}`
            );
            continue;
          }

          // Mapper vers le format catalog
          const catalogItem = this.schemaMapper.mapToCatalogItem(product);

          // Valider le catalog item
          const catalogValidation = this.validator.validateCatalogItem(catalogItem);
          if (!catalogValidation.valid) {
            errors.push(
              `Invalid catalog item ${catalogItem.id}: ${catalogValidation.errors.join(', ')}`
            );
            continue;
          }

          // TODO: Sauvegarder dans la base de données
          // Pour l'instant, on compte juste
          itemsAdded++;
        } catch (error) {
          errors.push(`Error processing product ${product.id}: ${error}`);
        }
      }

      return {
        providerId: this.config.apiEndpoint,
        itemsAdded,
        itemsUpdated,
        itemsRemoved,
        errors,
        syncedAt: startTime,
      };
    } catch (error) {
      throw new Error(`Sync failed: ${error}`);
    }
  }

  /**
   * Récupère un produit par ID
   */
  async fetchProduct(id: string): Promise<CatalogItem> {
    const product = await this.apiClient.fetchProductById(id);
    const validationResult = this.validator.validate(product);

    if (!validationResult.valid) {
      throw new Error(`Invalid product: ${validationResult.errors.join(', ')}`);
    }

    return this.schemaMapper.mapToCatalogItem(product);
  }

  /**
   * Teste la connexion au provider
   */
  async testConnection(): Promise<boolean> {
    return this.apiClient.testConnection();
  }
}
