/**
 * Bosch API Routes
 *
 * REST endpoints for Bosch kitchen appliance data (BSH Group).
 * Covers: ovens, cooktops, range hoods, dishwashers, refrigerators, microwaves.
 * Series: Serie 2, Serie 4, Serie 6, Serie 8.
 * Segment: mid_premium appliances
 */

import { createProviderRoutes } from './provider-routes-factory';

const router = createProviderRoutes({
  providerCode: 'bosch',
  displayName: 'Bosch',
  type: 'appliance',
  rateLimit: 30,
});

export default router;
