import { CatalogItem } from '@kitchenxpert/common';
import { ProviderProduct } from '../base-provider';

/**
 * Configuration de mapping déclarative
 * Permet de mapper des données sans écrire de code
 */
export interface MappingConfig {
  // Mapping direct champ → champ
  fields: {
    [catalogField: string]: string | string[] | FieldMapping;
  };

  // Transformations personnalisées
  transforms?: {
    [field: string]: TransformFunction;
  };

  // Valeurs par défaut
  defaults?: {
    [field: string]: any;
  };

  // Constantes (toujours la même valeur)
  constants?: {
    [field: string]: any;
  };
}

/**
 * Mapping complexe pour un champ
 */
export interface FieldMapping {
  // Source field(s)
  source: string | string[];

  // Fonction de transformation
  transform?: TransformFunction;

  // Valeur par défaut si source vide
  default?: any;

  // Requis ou optionnel
  required?: boolean;
}

/**
 * Fonction de transformation
 */
export type TransformFunction = (value: any, row: any) => any;

/**
 * Transformations prédéfinies communes
 */
export const CommonTransforms = {
  /**
   * Parse un nombre (gère string ou number)
   */
  toNumber: (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  },

  /**
   * Parse un prix avec devise
   */
  toPrice: (value: any): { price: number; currency: string } => {
    if (typeof value === 'object' && value.amount && value.currency) {
      return { price: value.amount, currency: value.currency };
    }

    let price = 0;
    let currency = 'EUR';

    if (typeof value === 'string') {
      // Extraire devise
      if (value.includes('€')) currency = 'EUR';
      else if (value.includes('$')) currency = 'USD';
      else if (value.includes('£')) currency = 'GBP';

      // Extraire montant
      price = CommonTransforms.toNumber(value);
    } else {
      price = CommonTransforms.toNumber(value);
    }

    return { price, currency };
  },

  /**
   * Parse des dimensions (WxDxH ou object)
   */
  toDimensions: (
    value: any
  ): { width: number; depth: number; height: number } | undefined => {
    if (!value) return undefined;

    // Format objet
    if (typeof value === 'object') {
      return {
        width: CommonTransforms.toNumber(value.width || value.w || 0),
        depth: CommonTransforms.toNumber(value.depth || value.d || 0),
        height: CommonTransforms.toNumber(value.height || value.h || 0),
      };
    }

    // Format string "WxDxH"
    if (typeof value === 'string' && value.includes('x')) {
      const parts = value.split('x').map((p) => CommonTransforms.toNumber(p));
      if (parts.length >= 3) {
        return { width: parts[0], depth: parts[1], height: parts[2] };
      }
    }

    return undefined;
  },

  /**
   * Split une string en array
   */
  toArray: (value: any, delimiter: string = ','): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(delimiter).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  },

  /**
   * Parse des images (URL ou array)
   */
  toImages: (
    value: any
  ): Array<{ url: string; isPrimary: boolean; order: number }> => {
    if (!value) return [];

    // Array d'URLs
    if (Array.isArray(value)) {
      if (typeof value[0] === 'string') {
        return value.map((url, i) => ({
          url,
          isPrimary: i === 0,
          order: i,
        }));
      }
      // Array d'objets
      return value.map((img, i) => ({
        url: img.url || img.src || img.image,
        isPrimary: img.isPrimary || i === 0,
        order: img.order !== undefined ? img.order : i,
      }));
    }

    // URL unique
    if (typeof value === 'string') {
      return [{ url: value, isPrimary: true, order: 0 }];
    }

    return [];
  },

  /**
   * Map un statut vers notre format
   */
  toStatus: (value: any): 'available' | 'out_of_stock' | 'discontinued' => {
    const str = String(value).toLowerCase();

    if (str.includes('available') || str.includes('in stock') || str === '1' || str === 'true') {
      return 'available';
    }
    if (str.includes('out') || str.includes('unavailable') || str === '0' || str === 'false') {
      return 'out_of_stock';
    }
    if (str.includes('discontinued')) {
      return 'discontinued';
    }

    return 'available';
  },

  /**
   * Uppercase première lettre
   */
  capitalize: (value: any): string => {
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Nettoie une string (trim + normalize spaces)
   */
  clean: (value: any): string => {
    return String(value).trim().replace(/\s+/g, ' ');
  },
};

/**
 * Mapper déclaratif
 * Utilise une configuration JSON pour mapper les données
 */
export class DeclarativeMapper {
  private config: MappingConfig;

  constructor(config: MappingConfig) {
    this.config = config;
  }

  /**
   * Mappe un objet source vers CatalogItem
   */
  map(source: ProviderProduct, providerId: string): Partial<CatalogItem> {
    const result: any = {};

    // Appliquer les constantes
    if (this.config.constants) {
      Object.assign(result, this.config.constants);
    }

    // Appliquer les valeurs par défaut
    if (this.config.defaults) {
      Object.assign(result, this.config.defaults);
    }

    // Mapper les champs
    for (const [targetField, mapping] of Object.entries(this.config.fields)) {
      const value = this.extractValue(source, mapping);
      if (value !== undefined) {
        result[targetField] = value;
      }
    }

    // Appliquer les transformations personnalisées
    if (this.config.transforms) {
      for (const [field, transform] of Object.entries(this.config.transforms)) {
        if (result[field] !== undefined) {
          result[field] = transform(result[field], source);
        }
      }
    }

    // Ajouter les champs obligatoires
    result.providerId = providerId;
    result.id = `${providerId}_${source.id}`;
    result.providerItemId = source.id;
    result.createdAt = new Date();
    result.updatedAt = new Date();

    return result;
  }

  /**
   * Extrait une valeur depuis la source selon le mapping
   */
  private extractValue(source: any, mapping: string | string[] | FieldMapping): any {
    // Mapping simple (string)
    if (typeof mapping === 'string') {
      return this.getNestedValue(source, mapping);
    }

    // Array de champs (premier non-vide)
    if (Array.isArray(mapping)) {
      for (const field of mapping) {
        const value = this.getNestedValue(source, field);
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
      return undefined;
    }

    // FieldMapping complexe
    const sourceFields = Array.isArray(mapping.source)
      ? mapping.source
      : [mapping.source];

    let value: any;

    for (const field of sourceFields) {
      value = this.getNestedValue(source, field);
      if (value !== undefined && value !== null && value !== '') {
        break;
      }
    }

    // Valeur par défaut si vide
    if (
      (value === undefined || value === null || value === '') &&
      mapping.default !== undefined
    ) {
      value = mapping.default;
    }

    // Transformation
    if (value !== undefined && mapping.transform) {
      value = mapping.transform(value, source);
    }

    return value;
  }

  /**
   * Récupère une valeur nested (ex: "user.address.city")
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Mappe un array de produits
   */
  mapMany(sources: ProviderProduct[], providerId: string): Partial<CatalogItem>[] {
    return sources.map((source) => this.map(source, providerId));
  }
}

/**
 * Exemple de configuration de mapping
 */
export const ExampleMappingConfig: MappingConfig = {
  // Constantes (toujours les mêmes)
  constants: {
    type: 'furniture',
    brand: 'My Brand',
  },

  // Valeurs par défaut
  defaults: {
    currency: 'EUR',
    status: 'available',
  },

  // Mapping des champs
  fields: {
    // Simple: field → field
    name: 'product_name',
    description: 'desc',

    // Fallback: essayer plusieurs champs
    model: ['model_number', 'reference', 'sku'],

    // Mapping complexe avec transformation
    price: {
      source: 'price_value',
      transform: CommonTransforms.toNumber,
      required: true,
    },

    dimensions: {
      source: ['dimensions', 'size'],
      transform: CommonTransforms.toDimensions,
    },

    images: {
      source: ['image_urls', 'photos'],
      transform: CommonTransforms.toImages,
    },

    colors: {
      source: 'available_colors',
      transform: (v) => CommonTransforms.toArray(v, '|'),
    },

    sku: {
      source: ['sku', 'product_code', 'id'],
      required: true,
    },
  },

  // Transformations post-mapping
  transforms: {
    name: CommonTransforms.clean,
    description: CommonTransforms.clean,
  },
};
