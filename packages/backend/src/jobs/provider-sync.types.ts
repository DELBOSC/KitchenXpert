/**
 * Provider Sync — public types
 *
 * Decouples the sync job from any specific data source. We have two
 * implementations:
 *
 *   - `MockSyncSource`         — deterministic-ish price/availability drift
 *                                that lets the feature work end-to-end before
 *                                a real scraper is wired up.
 *   - `ScraperBridgeSyncSource` — lazy-imports the `@kitchenxpert/scraper`
 *                                package and forwards updates from its
 *                                BullMQ pipeline (only when both are present).
 */

export interface ProductUpdate {
  /** SKU on the *backend* side — i.e. `Product.sku`. */
  sku: string;
  /** New price in EUR (or whatever currency the row holds). */
  price?: number;
  /** Free-form availability tag matching `Product.availability`. */
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';
  /** Optional name override (rare — only when retailer renames a SKU). */
  name?: string;
}

export interface ApplianceUpdate {
  brand: string;
  model: string;
  price?: number;
  availability?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';
}

export interface SyncSource {
  /** Returned promise resolves with whatever the source could fetch. The
   *  job applies the deltas in a single transaction. */
  fetchUpdates(providerCode: string): Promise<{
    products: ProductUpdate[];
    appliances: ApplianceUpdate[];
  }>;
}
