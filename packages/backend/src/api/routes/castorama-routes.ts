/**
 * Castorama API Routes
 *
 * REST endpoints for Castorama kitchen product data.
 * Covers: kitchen furniture (GoodHome range), worktops, appliances.
 * Segment: entry_mid | Has prices online: true
 */

import { createProviderRoutes } from './provider-routes-factory';

const router = createProviderRoutes({
  providerCode: 'castorama',
  displayName: 'Castorama',
  type: 'furniture',
  rateLimit: 30,
  categories: ['meubles-cuisine', 'plans-travail', 'eviers', 'credences', 'goodhome'],
});

export default router;
