import { BaseValidator } from '../../common/base-validator';
import { ProviderProduct, ValidationResult } from '../../common/base-provider';

/**
 * Validateur IKEA
 * Étend le BaseValidator avec des règles spécifiques à IKEA
 */
export class IkeaValidator extends BaseValidator {
  /**
   * Valide un produit IKEA
   */
  validate(data: ProviderProduct): ValidationResult {
    // Appeler d'abord la validation de base
    const baseResult = super.validate(data);
    const errors = [...baseResult.errors];

    // Validations spécifiques IKEA
    if (!data.name && !data.productName) {
      errors.push('Missing required field: name or productName');
    }

    if (!data.articleNumber && !data.sku) {
      errors.push('Missing required field: articleNumber or sku');
    }

    if (!data.price || typeof data.price !== 'object') {
      errors.push('price must be an object with amount and currency');
    }

    if (data.price && typeof data.price.amount !== 'number') {
      errors.push('price.amount must be a number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
