import { CatalogItem } from '@common/types';
import { IValidator, ProviderProduct, ValidationResult } from './base-provider';

/**
 * Validateur de base avec logique commune
 */
export class BaseValidator implements IValidator {
  /**
   * Valide un produit provider (à surcharger si besoin)
   */
  validate(data: ProviderProduct): ValidationResult {
    const errors: string[] = [];

    if (!data.id) {
      errors.push('Missing required field: id');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valide un CatalogItem
   */
  validateCatalogItem(item: CatalogItem): ValidationResult {
    const errors: string[] = [];

    // Champs requis
    if (!item.name || item.name.trim() === '') {
      errors.push('name is required');
    }

    if (!item.brand || item.brand.trim() === '') {
      errors.push('brand is required');
    }

    if (!item.model || item.model.trim() === '') {
      errors.push('model is required');
    }

    if (!item.sku || item.sku.trim() === '') {
      errors.push('sku is required');
    }

    // Validation du prix
    if (typeof item.price !== 'number' || item.price < 0) {
      errors.push('price must be a positive number');
    }

    if (!item.currency || item.currency.length !== 3) {
      errors.push('currency must be a 3-letter code');
    }

    // Validation des dimensions
    if (item.dimensions) {
      if (
        typeof item.dimensions.width !== 'number' ||
        item.dimensions.width <= 0
      ) {
        errors.push('dimensions.width must be a positive number');
      }
      if (
        typeof item.dimensions.depth !== 'number' ||
        item.dimensions.depth <= 0
      ) {
        errors.push('dimensions.depth must be a positive number');
      }
      if (
        typeof item.dimensions.height !== 'number' ||
        item.dimensions.height <= 0
      ) {
        errors.push('dimensions.height must be a positive number');
      }
    }

    // Validation des images
    if (!item.images || item.images.length === 0) {
      errors.push('at least one image is required');
    } else {
      item.images.forEach((img, index) => {
        if (!img.url || !this.isValidUrl(img.url)) {
          errors.push(`images[${index}].url is invalid`);
        }
      });
    }

    // Validation du type
    if (!['appliance', 'furniture', 'accessory'].includes(item.type)) {
      errors.push('type must be appliance, furniture, or accessory');
    }

    // Validation du status
    if (
      !['available', 'out_of_stock', 'discontinued'].includes(item.status)
    ) {
      errors.push('status must be available, out_of_stock, or discontinued');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Vérifie si une URL est valide
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
