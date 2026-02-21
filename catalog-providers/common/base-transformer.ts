import { ITransformer } from './base-provider';

/**
 * Transformer de base avec logique commune
 */
export class BaseTransformer implements ITransformer {
  /**
   * Transforme les dimensions depuis différents formats
   */
  transformDimensions(data: any): {
    width: number;
    depth: number;
    height: number;
  } {
    // Format standard : { width, depth, height }
    if (data.width !== undefined && data.depth !== undefined && data.height !== undefined) {
      return {
        width: this.parseNumber(data.width),
        depth: this.parseNumber(data.depth),
        height: this.parseNumber(data.height),
      };
    }

    // Format alternatif : { w, d, h }
    if (data.w !== undefined && data.d !== undefined && data.h !== undefined) {
      return {
        width: this.parseNumber(data.w),
        depth: this.parseNumber(data.d),
        height: this.parseNumber(data.h),
      };
    }

    // Format dimensions array [width, depth, height]
    if (Array.isArray(data) && data.length >= 3) {
      return {
        width: this.parseNumber(data[0]),
        depth: this.parseNumber(data[1]),
        height: this.parseNumber(data[2]),
      };
    }

    throw new Error('Invalid dimensions format');
  }

  /**
   * Transforme le prix et la devise
   */
  transformPrice(data: any): { price: number; currency: string } {
    let price = 0;
    let currency = 'EUR';

    // Format : { price, currency }
    if (data.price !== undefined) {
      price = this.parseNumber(data.price);
      currency = data.currency || 'EUR';
    }
    // Format : { amount, currency }
    else if (data.amount !== undefined) {
      price = this.parseNumber(data.amount);
      currency = data.currency || 'EUR';
    }
    // Format : number direct
    else if (typeof data === 'number') {
      price = data;
    }

    return { price, currency: currency.toUpperCase() };
  }

  /**
   * Transforme les images
   */
  transformImages(data: any): Array<{
    url: string;
    isPrimary: boolean;
    order: number;
  }> {
    if (!data) return [];

    // Array d'URLs simples
    if (Array.isArray(data) && typeof data[0] === 'string') {
      return data.map((url, index) => ({
        url,
        isPrimary: index === 0,
        order: index,
      }));
    }

    // Array d'objets
    if (Array.isArray(data) && typeof data[0] === 'object') {
      return data.map((img, index) => ({
        url: img.url || img.src || img.image || '',
        isPrimary: img.isPrimary || img.primary || index === 0,
        order: img.order !== undefined ? img.order : index,
      }));
    }

    // URL unique
    if (typeof data === 'string') {
      return [{ url: data, isPrimary: true, order: 0 }];
    }

    return [];
  }

  /**
   * Transforme les spécifications
   */
  transformSpecifications(data: any): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const specs: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Nettoyer les clés
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      specs[cleanKey] = value;
    }

    return specs;
  }

  /**
   * Parse un nombre depuis string ou number
   */
  protected parseNumber(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      // Enlever les espaces et remplacer virgule par point
      const cleaned = value.replace(/\s/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      if (isNaN(parsed)) {
        throw new Error(`Cannot parse number from: ${value}`);
      }
      return parsed;
    }
    throw new Error(`Invalid number format: ${value}`);
  }

  /**
   * Nettoie une string (trim, enlève HTML, etc.)
   */
  protected cleanString(value: any): string {
    if (typeof value !== 'string') {
      return String(value);
    }
    return value
      .replace(/<[^>]*>/g, '') // Enlever HTML
      .trim()
      .replace(/\s+/g, ' '); // Normaliser les espaces
  }
}
