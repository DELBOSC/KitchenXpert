/**
 * Leroy Merlin API Routes
 *
 * REST endpoints for Leroy Merlin kitchen product data.
 * Segment: entry_mid | Has prices online: true
 */

import { createProviderRoutes } from './provider-routes-factory';

const router = createProviderRoutes({
  providerCode: 'leroy-merlin',
  displayName: 'Leroy Merlin',
  type: 'furniture',
  rateLimit: 30,
  categories: [
    'meubles-cuisine',
    'plans-travail',
    'eviers',
    'robinetterie',
    'credences',
    'eclairage',
  ],
});

export default router;
