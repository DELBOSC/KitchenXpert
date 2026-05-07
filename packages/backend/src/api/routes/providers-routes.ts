/**
 * Providers Index + Cross-Provider Import
 *
 * The per-provider routers (`leroy-merlin-routes.ts`, etc.) handle browsing
 * within a single catalog. This file adds the *cross-provider* concerns:
 *
 *   GET    /api/v1/providers              — list every provider with counts
 *   POST   /api/v1/providers/import       — drop a product or appliance into
 *                                           a kitchen (creates a KitchenItem)
 *
 * Importing is done here rather than inside each provider router because the
 * destination — `KitchenItem` — is the same regardless of source. The frontend
 * "Add to design" button on any provider catalog page hits this single
 * endpoint with `{ source: 'product'|'appliance', sourceId, kitchenId }`.
 */

import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/client';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';
import { asyncHandler } from '../middleware/error-middleware';

const router: RouterType = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const providers = await prisma.catalogProvider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true, appliances: true } },
      },
    });
    res.json({
      data: providers.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        productCount: p._count.products,
        applianceCount: p._count.appliances,
      })),
    });
  }),
);

const ImportSchema = z.object({
  source: z.enum(['product', 'appliance']),
  sourceId: z.string().min(1),
  kitchenId: z.string().uuid(),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  positionZ: z.number().default(0),
  rotationY: z.number().default(0),
  quantity: z.number().int().positive().max(50).default(1),
});

router.post(
  '/import',
  authenticate,
  validateBody(ImportSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { source, sourceId, kitchenId, positionX, positionY, positionZ, rotationY, quantity } =
      req.body as z.infer<typeof ImportSchema>;

    // Ownership: the kitchen must belong to the caller (or admin override).
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId, deletedAt: null },
      select: { userId: true, name: true },
    });
    if (!kitchen) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kitchen not found' } });
      return;
    }
    if (kitchen.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not own this kitchen' } });
      return;
    }

    // Resolve the source row and convert it into a KitchenItem.
    if (source === 'product') {
      const product = await prisma.product.findUnique({ where: { id: sourceId } });
      if (!product) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
        return;
      }
      const item = await prisma.kitchenItem.create({
        data: {
          kitchenId,
          productId: product.id,
          type: 'cabinet' as never,
          name: product.name,
          brand: product.brand,
          model: product.sku,
          positionX, positionY, positionZ, rotationY,
          width: Number(product.width ?? 60),
          depth: Number(product.depth ?? 60),
          height: Number(product.height ?? 80),
          price: Number(product.price) * quantity,
          metadata: {
            source: 'product',
            sourceId: product.id,
            providerId: product.providerId,
            sku: product.sku,
            quantity,
          } as never,
        },
      });
      res.status(201).json({ data: item });
      return;
    }

    // Appliance branch.
    const appliance = await prisma.appliance.findUnique({ where: { id: sourceId } });
    if (!appliance) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appliance not found' } });
      return;
    }
    const item = await prisma.kitchenItem.create({
      data: {
        kitchenId,
        applianceId: appliance.id,
        type: 'appliance' as never,
        name: appliance.name,
        brand: appliance.brand,
        model: appliance.model,
        positionX, positionY, positionZ, rotationY,
        width: Number(appliance.width),
        depth: Number(appliance.depth),
        height: Number(appliance.height),
        price: Number(appliance.price) * quantity,
        metadata: {
          source: 'appliance',
          sourceId: appliance.id,
          providerId: appliance.providerId,
          model: appliance.model,
          type: appliance.type,
          quantity,
        } as never,
      },
    });
    res.status(201).json({ data: item });
  }),
);

export default router;
