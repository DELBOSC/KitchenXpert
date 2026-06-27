/**
 * Providers Index + Cross-Provider Import
 *
 * The per-provider routers (`leroy-merlin-routes.ts`, etc.) handle browsing
 * within a single catalog. This file adds the *cross-provider* concerns:
 *
 *   GET  /api/v1/providers              — list every provider with counts
 *   POST /api/v1/providers/import       — drop a Product / Appliance / live
 *                                         IKEA item into a kitchen as a
 *                                         KitchenItem
 *
 * IKEA imports are special: the source row doesn't exist locally because
 * IKEA browsing is a live API proxy. The endpoint upserts a Product row on
 * the fly using the IKEA item code as SKU, then takes the standard product
 * import path. This means a re-import of the same IKEA reference reuses the
 * same Product (idempotent SKU) and can later be backfilled by the sync job.
 */

import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { prisma } from '../../database/client';
import { createIkeaClient } from '../../services/ikea';
import { parseDimensions } from '../../services/ikea/utils';
import { authenticate } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-middleware';
import { validateBody } from '../middleware/validation-middleware';

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
  })
);

const ImportSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('product'),
    sourceId: z.string().min(1),
    kitchenId: z.string().uuid(),
    positionX: z.number().default(0),
    positionY: z.number().default(0),
    positionZ: z.number().default(0),
    rotationY: z.number().default(0),
    quantity: z.number().int().positive().max(50).default(1),
  }),
  z.object({
    source: z.literal('appliance'),
    sourceId: z.string().min(1),
    kitchenId: z.string().uuid(),
    positionX: z.number().default(0),
    positionY: z.number().default(0),
    positionZ: z.number().default(0),
    rotationY: z.number().default(0),
    quantity: z.number().int().positive().max(50).default(1),
  }),
  z.object({
    source: z.literal('ikea'),
    /** IKEA item code, e.g. "303.658.94" */
    itemCode: z.string().min(6),
    country: z.string().length(2).default('fr'),
    language: z.string().length(2).default('fr'),
    kitchenId: z.string().uuid(),
    positionX: z.number().default(0),
    positionY: z.number().default(0),
    positionZ: z.number().default(0),
    rotationY: z.number().default(0),
    quantity: z.number().int().positive().max(50).default(1),
  }),
]);

router.post(
  '/import',
  authenticate,
  validateBody(ImportSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = req.body as z.infer<typeof ImportSchema>;

    // Ownership: the kitchen must belong to the caller (or admin override).
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: body.kitchenId, deletedAt: null },
      select: { userId: true },
    });
    if (!kitchen) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kitchen not found' } });
      return;
    }
    if (kitchen.userId !== userId && req.user?.role !== 'admin') {
      res
        .status(403)
        .json({ error: { code: 'FORBIDDEN', message: 'You do not own this kitchen' } });
      return;
    }

    const sharedPos = {
      positionX: body.positionX,
      positionY: body.positionY,
      positionZ: body.positionZ,
      rotationY: body.rotationY,
      quantity: body.quantity,
    };

    if (body.source === 'product') {
      const item = await importProduct(body.sourceId, body.kitchenId, sharedPos);
      if (!item) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
        return;
      }
      res.status(201).json({ data: item });
      return;
    }

    if (body.source === 'appliance') {
      const item = await importAppliance(body.sourceId, body.kitchenId, sharedPos);
      if (!item) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Appliance not found' } });
        return;
      }
      res.status(201).json({ data: item });
      return;
    }

    // IKEA live path: fetch the product from IKEA, upsert into Product, then
    // delegate to the standard product import. Reusing importProduct keeps
    // the visual + audit fields consistent across all sources.
    const product = await upsertIkeaProduct(body.itemCode, body.country, body.language);
    if (!product) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'IKEA product not found' } });
      return;
    }
    const item = await importProduct(product.id, body.kitchenId, sharedPos);
    res.status(201).json({ data: item });
  })
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SharedImportFields {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  quantity: number;
}

/**
 * Common metadata shape stamped on every imported KitchenItem so the
 * frontend renderer knows where the asset came from and which texture to use.
 */
function buildItemMetadata(opts: {
  source: 'product' | 'appliance' | 'ikea';
  sourceId: string;
  providerId: string | null;
  sku?: string;
  model?: string;
  type?: string;
  quantity: number;
  images: string[];
  material?: string | null;
  color?: string | null;
  finish?: string | null;
}): Record<string, unknown> {
  return {
    source: opts.source,
    sourceId: opts.sourceId,
    providerId: opts.providerId,
    ...(opts.sku && { sku: opts.sku }),
    ...(opts.model && { model: opts.model }),
    ...(opts.type && { type: opts.type }),
    quantity: opts.quantity,
    visuals: {
      images: opts.images,
      thumbnail: opts.images[0] ?? null,
      material: opts.material ?? null,
      color: opts.color ?? null,
      finish: opts.finish ?? null,
    },
  };
}

function imagesFromJson(raw: unknown): string[] {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    return [raw];
  }
  if (typeof raw === 'object') {
    const out: string[] = [];
    for (const v of Object.values(raw as Record<string, unknown>)) {
      if (typeof v === 'string') {
        out.push(v);
      }
    }
    return out;
  }
  return [];
}

async function importProduct(
  productId: string,
  kitchenId: string,
  shared: SharedImportFields
): Promise<unknown | null> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return null;
  }

  const images = imagesFromJson(product.images);
  return prisma.kitchenItem.create({
    data: {
      kitchenId,
      productId: product.id,
      type: 'cabinet' as never,
      name: product.name,
      brand: product.brand,
      model: product.sku,
      positionX: shared.positionX,
      positionY: shared.positionY,
      positionZ: shared.positionZ,
      rotationY: shared.rotationY,
      width: Number(product.width ?? 60),
      depth: Number(product.depth ?? 60),
      height: Number(product.height ?? 80),
      price: Number(product.price) * shared.quantity,
      metadata: buildItemMetadata({
        source: 'product',
        sourceId: product.id,
        providerId: product.providerId,
        sku: product.sku,
        quantity: shared.quantity,
        images,
        material: product.material,
        color: product.color,
        finish: product.finish,
      }) as never,
    },
  });
}

async function importAppliance(
  applianceId: string,
  kitchenId: string,
  shared: SharedImportFields
): Promise<unknown | null> {
  const appliance = await prisma.appliance.findUnique({ where: { id: applianceId } });
  if (!appliance) {
    return null;
  }

  const images = imagesFromJson(appliance.images);
  return prisma.kitchenItem.create({
    data: {
      kitchenId,
      applianceId: appliance.id,
      type: 'appliance' as never,
      name: appliance.name,
      brand: appliance.brand,
      model: appliance.model,
      positionX: shared.positionX,
      positionY: shared.positionY,
      positionZ: shared.positionZ,
      rotationY: shared.rotationY,
      width: Number(appliance.width),
      depth: Number(appliance.depth),
      height: Number(appliance.height),
      price: Number(appliance.price) * shared.quantity,
      metadata: buildItemMetadata({
        source: 'appliance',
        sourceId: appliance.id,
        providerId: appliance.providerId,
        model: appliance.model,
        type: appliance.type,
        quantity: shared.quantity,
        images,
        material: null,
        color: appliance.color,
        finish: appliance.finish,
      }) as never,
    },
  });
}

/**
 * Fetch an IKEA reference live and upsert it into the local `Product` table
 * (provider = ikea, SKU = item code). Subsequent imports of the same code
 * reuse the existing row, and a future scraper sync can backfill missing
 * fields without disturbing the relations.
 */
async function upsertIkeaProduct(
  itemCode: string,
  country: string,
  language: string
): Promise<{ id: string } | null> {
  const ikea = createIkeaClient({ country, language });
  const result = await ikea.getProduct(itemCode);
  if (!result.success || !result.data) {
    return null;
  }
  const ikeaProduct = result.data;

  // Make sure the IKEA provider row exists; idempotent upsert on `code`.
  const provider = await prisma.catalogProvider.upsert({
    where: { code: 'ikea' },
    create: { code: 'ikea', name: 'IKEA', isActive: true },
    update: {},
  });

  const dims = parseDimensions(ikeaProduct as unknown as Record<string, unknown>);
  const width = ikeaProduct.dimensions?.width ?? dims.width ?? null;
  const depth = ikeaProduct.dimensions?.depth ?? dims.depth ?? null;
  const height = ikeaProduct.dimensions?.height ?? dims.height ?? null;
  const sku = `IKEA-${ikeaProduct.itemCode.replace(/\./g, '')}`;
  const images = ikeaProduct.imageUrl ? [ikeaProduct.imageUrl] : [];

  const upserted = await prisma.product.upsert({
    where: { sku },
    create: {
      sku,
      name: ikeaProduct.name,
      description: ikeaProduct.description ?? null,
      brand: 'IKEA',
      providerId: provider.id,
      price: ikeaProduct.price || 0,
      currency: ikeaProduct.currency || 'EUR',
      width,
      depth,
      height,
      images: images as never,
      isActive: true,
    },
    update: {
      name: ikeaProduct.name,
      price: ikeaProduct.price || 0,
      currency: ikeaProduct.currency || 'EUR',
      ...(width !== null && { width }),
      ...(depth !== null && { depth }),
      ...(height !== null && { height }),
      ...(images.length > 0 && { images: images as never }),
    },
    select: { id: true },
  });
  return upserted;
}

export default router;
