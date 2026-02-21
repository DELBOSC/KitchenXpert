/**
 * Schmidt API Routes
 *
 * REST endpoints for Schmidt kitchen product data.
 * Premium French kitchen manufacturer with ranges like Arcos and Loft.
 * Segment: mid_premium | Has prices online: false (devis only)
 */

import { createProviderRoutes } from './provider-routes-factory';

const router = createProviderRoutes({
  providerCode: 'schmidt',
  displayName: 'Schmidt',
  type: 'furniture',
  rateLimit: 30,
  categories: ['cuisines', 'rangements', 'arcos', 'loft'],
});

export default router;
