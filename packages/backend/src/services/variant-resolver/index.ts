import { VariantResolverService } from './variant-resolver.service';
import { prisma } from '../../database/client';

import type { ResolverDb } from './variant-resolver.types';

/**
 * Single shared VariantResolverService instance.
 *
 * `prisma.product` is a structural superset of the minimal `ResolverDb`
 * contract (the DI interface is kept narrow on purpose). The cast lives HERE,
 * once — every consumer (REST controller, chat tool…) imports this instance
 * instead of re-instantiating + re-casting. The service is stateless, so a
 * shared singleton is safe.
 */
export const variantResolver = new VariantResolverService(prisma as unknown as ResolverDb);
