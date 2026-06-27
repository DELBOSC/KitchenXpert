/**
 * Base Transformer
 *
 * Normalizes raw provider data into the unified ProviderProduct / CatalogItem format.
 * Each provider-specific transformer can extend this class to handle vendor-specific quirks.
 */

import { ITransformer } from '../base-provider';

export interface RawDimensions {
  width?: number | string;
  height?: number | string;
  depth?: number | string;
  unit?: string;
  // Alternate field names used by various providers
  largeur?: number | string;
  hauteur?: number | string;
  profondeur?: number | string;
  w?: number | string;
  h?: number | string;
  d?: number | string;
}

export interface RawPrice {
  price?: number | string;
  amount?: number | string;
  value?: number | string;
  currency?: string;
  // French-specific
  prix?: number | string;
  devise?: string;
}

export interface RawImage {
  url?: string;
  src?: string;
  href?: string;
  primary?: boolean;
  main?: boolean;
  order?: number;
  alt?: string;
}

/**
 * Unit conversion multipliers to centimeters
 */
const UNIT_TO_CM: Record<string, number> = {
  cm: 1,
  mm: 0.1,
  m: 100,
  in: 2.54,
  inch: 2.54,
  inches: 2.54,
  ft: 30.48,
  feet: 30.48,
};

/**
 * Parse a numeric value from various formats
 */
function parseNumeric(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  // Handle European format: "1.234,56" or "1 234,56"
  const cleaned = value
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export class BaseTransformer implements ITransformer {
  /**
   * Transform raw dimension data into standardized { width, depth, height } in cm
   */
  transformDimensions(data: RawDimensions): { width: number; depth: number; height: number } {
    const unit = (data.unit || 'cm').toLowerCase();
    const multiplier = UNIT_TO_CM[unit] || 1;

    const width = parseNumeric(data.width ?? data.largeur ?? data.w) * multiplier;
    const height = parseNumeric(data.height ?? data.hauteur ?? data.h) * multiplier;
    const depth = parseNumeric(data.depth ?? data.profondeur ?? data.d) * multiplier;

    return {
      width: Math.round(width * 10) / 10,
      depth: Math.round(depth * 10) / 10,
      height: Math.round(height * 10) / 10,
    };
  }

  /**
   * Transform raw price data into standardized { price, currency }
   */
  transformPrice(data: RawPrice): { price: number; currency: string } {
    const price = parseNumeric(data.price ?? data.amount ?? data.value ?? data.prix);
    const currency = (data.currency ?? data.devise ?? 'EUR').toUpperCase();

    return {
      price: Math.round(price * 100) / 100,
      currency,
    };
  }

  /**
   * Transform raw image data into standardized array
   */
  transformImages(
    data: RawImage | RawImage[] | string | string[]
  ): Array<{ url: string; isPrimary: boolean; order: number }> {
    // Normalize to array
    const items = Array.isArray(data) ? data : [data];

    return items
      .map((item, index) => {
        if (typeof item === 'string') {
          return { url: item, isPrimary: index === 0, order: index };
        }
        const url = item.url || item.src || item.href || '';
        if (!url) return null;
        return {
          url,
          isPrimary: item.primary ?? item.main ?? index === 0,
          order: item.order ?? index,
        };
      })
      .filter((img): img is { url: string; isPrimary: boolean; order: number } => img !== null)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Transform raw specifications into a normalized record
   * Flattens nested objects and ensures all values are serializable
   */
  transformSpecifications(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || typeof data !== 'object') return {};

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Normalize key to lowercase with underscores
      const normalizedKey = key
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        // Flatten nested objects with dot notation
        const nested = this.transformSpecifications(value as Record<string, unknown>);
        for (const [nestedKey, nestedValue] of Object.entries(nested)) {
          result[`${normalizedKey}.${nestedKey}`] = nestedValue;
        }
      } else {
        result[normalizedKey] = value;
      }
    }

    return result;
  }
}

export default BaseTransformer;
