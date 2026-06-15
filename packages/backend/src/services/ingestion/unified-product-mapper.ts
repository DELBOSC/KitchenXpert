/**
 * UnifiedProduct -> Product mapper (CLAUDE.md §15.8 step d).
 *
 * Bridges the ingestion contract (@kitchenxpert/common UnifiedProduct, produced
 * by the scraper Strategies) to the persistence DTO consumed by
 * {@link ProductRepository.upsertBySku}. Pure + synchronous so it is trivially
 * unit-testable with no DB.
 *
 * Design decisions (validated 14-15/06):
 *  1. SKU namespacing: `${BRAND}-${sku}` (brand upper-cased) — globally unique
 *     across brands, matches the existing providers-routes convention.
 *  2. Dimensions mm -> cm via /10. Legacy Product dims are CENTIMETRES
 *     (services/ikea/utils parseDimensions). Lossless: 600mm -> 60.00, 65mm -> 6.50.
 *  3. Missing price: store price=0 AND flag `specifications.priceMissing=true`
 *     (honest — lets catalog-search exclude un-priced rows instead of pretending
 *     they cost 0€).
 */
import type { UnifiedProduct } from '@kitchenxpert/common';

import type { UpsertProductDto } from '../../repositories/product-repository';

/** Convert integer millimetres to centimetres (2-decimal Number), or undefined. */
function mmToCm(mm: number | null): number | undefined {
  return mm == null ? undefined : Number((mm / 10).toFixed(2));
}

/**
 * Map a validated {@link UnifiedProduct} to the `{ sku, data }` pair expected by
 * `ProductRepository.upsertBySku`. The returned `sku` is brand-namespaced.
 */
export function mapUnifiedProductToUpsert(up: UnifiedProduct): {
  sku: string;
  data: UpsertProductDto;
} {
  const sku = `${up.brand.toUpperCase()}-${up.sku}`;
  const priceMissing = up.priceEurCents == null;
  // Narrow on the field directly (TS doesn't track the `priceMissing` alias).
  const priceEur = up.priceEurCents == null ? 0 : up.priceEurCents / 100;

  // Preserve brand metadata + product family in specifications (the Product
  // model has no top-level `type`); add an honest priceMissing flag.
  const specifications: Record<string, unknown> = {
    ...(up.specifications ?? {}),
    productType: up.type,
    ...(up.ean != null && { ean: up.ean }),
    ...(priceMissing && { priceMissing: true }),
  };

  return {
    sku,
    data: {
      name: up.name,
      brand: up.brand,
      price: Number(priceEur.toFixed(2)),
      currency: up.currency || 'EUR',
      width: mmToCm(up.widthMm),
      depth: mmToCm(up.depthMm),
      height: mmToCm(up.heightMm),
      images: up.imageUrls?.length ? up.imageUrls : undefined,
      specifications,
      // Ingestion provenance (§15.8 Principe 3).
      dimensionConfidence: up.dimensionConfidence,
      sourceLevel: up.sourceLevel,
      sourceUrl: up.sourceUrl,
      lastVerifiedAt: up.lastVerifiedAt,
    },
  };
}
