/**
 * Kitchen Generator Module
 *
 * AI-powered kitchen configuration generator that:
 * - Takes room dimensions and user preferences
 * - Fetches products from multiple providers (IKEA, appliance brands, etc.)
 * - Generates optimal kitchen layouts
 * - Scores configurations on ergonomics, storage, aesthetics, and budget
 *
 * @example
 * ```typescript
 * import { getKitchenGenerator, initializeDefaultProviders } from '@kitchenxpert/ai-kitchen-generator';
 *
 * // Initialize providers
 * initializeDefaultProviders({ country: 'fr' });
 *
 * // Generate configurations
 * const generator = getKitchenGenerator();
 * const result = await generator.generate({
 *   room: {
 *     dimensions: { width: 400, length: 300, height: 250, unit: 'cm' },
 *     walls: [...],
 *     utilities: [...],
 *   },
 *   preferences: {
 *     budget: { min: 5000, max: 15000, currency: 'EUR' },
 *     style: 'modern',
 *     requiredAppliances: ['refrigerator', 'oven', 'dishwasher'],
 *   },
 * });
 *
 * console.log('Recommended:', result.recommended);
 * ```
 */

// Types
export * from './types';

// Providers
export * from './providers';

// Services
export { KitchenGeneratorService, getKitchenGenerator } from './services/generator-service';

// Re-export commonly used items for convenience
export { providerRegistry } from './providers';
export { defaultIkeaProvider, METOD_RULES, createIkeaKitchenProvider } from './providers/ikea';
