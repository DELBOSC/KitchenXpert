/**
 * IngestionOrchestrator (CLAUDE.md §15.8 Principe 2 / roadmap step c).
 *
 * Brand registry : route un brandId vers sa Strategy concrète, en injectant un
 * JsonFetcher partagé. Découplé de tout client HTTP concret (le backend injecte
 * son propre fetcher ; le scraper son ApiAdapter). Ajouter une marque = ajouter
 * une entrée FACTORIES (Strategy pattern, §15.8 Principe 2).
 */
import type { IngestionStrategy, JsonFetcher } from './ingestion-strategy';
import { IkeaStrategy } from './ikea-strategy';
import { LapeyreStrategy } from './lapeyre-strategy';
import { EprelApplianceStrategy } from './eprel-strategy';

/** Marques actuellement câblées (un Strategy chacune). */
export type BrandId = 'ikea' | 'lapeyre' | 'eprel';

export const SUPPORTED_BRANDS: readonly BrandId[] = ['ikea', 'lapeyre', 'eprel'];

const FACTORIES: Record<BrandId, (fetcher: JsonFetcher) => IngestionStrategy> = {
  ikea: (f) => new IkeaStrategy(f),
  lapeyre: (f) => new LapeyreStrategy(f),
  eprel: (f) => new EprelApplianceStrategy(f),
};

/** Type guard : `brand` est-il une marque supportée ? */
export function isSupportedBrand(brand: string): brand is BrandId {
  return (SUPPORTED_BRANDS as readonly string[]).includes(brand);
}

/**
 * Route les marques vers leur Strategy. Construit une fois avec le JsonFetcher
 * partagé (rate-limit/retry centralisés au niveau du fetcher injecté).
 */
export class IngestionOrchestrator {
  constructor(private readonly fetcher: JsonFetcher) {}

  /** Marques disponibles. */
  get brands(): readonly BrandId[] {
    return SUPPORTED_BRANDS;
  }

  /** Instancie la Strategy d'une marque. Throw si marque inconnue. */
  strategyFor(brand: string): IngestionStrategy {
    if (!isSupportedBrand(brand)) {
      throw new Error(
        `Unknown ingestion brand: "${brand}". Supported: ${SUPPORTED_BRANDS.join(', ')}`,
      );
    }
    return FACTORIES[brand](this.fetcher);
  }
}
