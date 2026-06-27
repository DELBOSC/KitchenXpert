import { type Partner } from '@prisma/client';
import { type Request, type Response, type NextFunction } from 'express';

import { prisma } from '../../database/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pull the typed partner off the request (injected by requirePartner). */
function getPartner(req: Request): Partner {
  // requirePartner guarantees this exists before any of these handlers run.
  return req.partner as Partner;
}

/** Resolve the number of days for an analytics period query param. */
function resolvePeriodDays(period: unknown): number {
  switch (period) {
    case '7d':
      return 7;
    case '90d':
      return 90;
    case '1y':
      return 365;
    case '30d':
    default:
      return 30;
  }
}

/**
 * Return the list of CatalogProvider IDs whose `code` matches the partner's
 * code.  Partners are matched to catalog providers by their `code` field since
 * there is no explicit FK in the current schema.
 */
async function getPartnerProviderIds(partner: Partner): Promise<string[]> {
  const providers = await prisma.catalogProvider.findMany({
    where: { code: partner.code },
    select: { id: true },
  });
  return providers.map((p) => p.id);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * GET /partner/profile
 * Return Partner record merged with the matching User's public data.
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);

    // Fetch the user whose email matches the partner, omitting the password.
    const user = await prisma.user.findFirst({
      where: { email: partner.email },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        language: true,
        timezone: true,
      },
    });

    res.json({ ...partner, user });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /partner/profile
 * Update Partner fields (name, website, phone) and matching User fields
 * (firstName, lastName, phone) atomically.
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const {
      name,
      website,
      phone,
      firstName,
      lastName,
    }: {
      name?: string;
      website?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
    } = req.body;

    // Basic validation
    if (name !== undefined && name.trim() === '') {
      res.status(400).json({ error: 'Company name cannot be empty' });
      return;
    }

    const [updatedPartner, updatedUser] = await prisma.$transaction([
      prisma.partner.update({
        where: { id: partner.id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(website !== undefined && { website }),
          ...(phone !== undefined && { phone }),
        },
      }),
      prisma.user.updateMany({
        where: { email: partner.email },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone }),
        },
      }),
    ]);

    res.json({ ...updatedPartner, updatedUserCount: updatedUser.count });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * GET /partner/dashboard/stats
 * Aggregate top-level stats for the partner dashboard.
 */
export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const providerIds = await getPartnerProviderIds(partner);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Products
    const [totalProducts, activeProducts] = await Promise.all([
      prisma.product.count({
        where: { providerId: { in: providerIds }, deletedAt: null },
      }),
      prisma.product.count({
        where: { providerId: { in: providerIds }, isActive: true, deletedAt: null },
      }),
    ]);

    // Orders this month that contain at least one of the partner's products
    const partnerProductIds = await prisma.product
      .findMany({
        where: { providerId: { in: providerIds }, deletedAt: null },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    const [monthlyOrders, recentOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          items: { some: { productId: { in: partnerProductIds } } },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          items: {
            where: { productId: { in: partnerProductIds } },
            select: { totalPrice: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          items: { some: { productId: { in: partnerProductIds } } },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Monthly revenue: sum of partner's order items this month
    const monthlyRevenueAgg = await prisma.orderItem.aggregate({
      _sum: { totalPrice: true },
      where: {
        productId: { in: partnerProductIds },
        order: { createdAt: { gte: startOfMonth } },
      },
    });

    const monthlyRevenue = Number(monthlyRevenueAgg._sum.totalPrice ?? 0);

    res.json({
      totalProducts,
      activeProducts,
      totalOrders: monthlyOrders.length,
      monthlyRevenue,
      recentOrders,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * GET /partner/products
 * List the partner's products with pagination and optional search/status filter.
 */
export const listProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const providerIds = await getPartnerProviderIds(partner);

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    let isActive: boolean | undefined;
    if (status === 'active') {
      isActive = true;
    } else if (status === 'inactive') {
      isActive = false;
    }

    const where = {
      providerId: { in: providerIds },
      deletedAt: null,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
          { brand: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /partner/products
 * Create a new product linked to the partner's catalog provider.
 */
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const {
      name,
      sku,
      price,
      categoryId,
      description,
      brand,
      model,
      currency,
      width,
      depth,
      height,
      weight,
      color,
      material,
      finish,
      images,
      specifications,
      availability,
    } = req.body;

    // Required field validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Product name is required' });
      return;
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      res.status(400).json({ error: 'Valid product price is required' });
      return;
    }
    if (!sku || typeof sku !== 'string' || sku.trim() === '') {
      res.status(400).json({ error: 'Product SKU is required' });
      return;
    }

    // Resolve the partner's primary CatalogProvider
    const provider = await prisma.catalogProvider.findFirst({
      where: { code: partner.code },
    });
    if (!provider) {
      res.status(400).json({ error: 'No catalog provider found for this partner' });
      return;
    }

    // Resolve (or create) a catalog for this provider
    const catalog = await prisma.catalog.findFirst({
      where: { providerId: provider.id, isActive: true },
    });

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        sku: sku.trim(),
        price: Number(price),
        providerId: provider.id,
        ...(catalog && { catalogId: catalog.id }),
        ...(categoryId && { categoryId }),
        ...(description !== undefined && { description }),
        ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }),
        ...(currency !== undefined && { currency }),
        ...(width !== undefined && { width: Number(width) }),
        ...(depth !== undefined && { depth: Number(depth) }),
        ...(height !== undefined && { height: Number(height) }),
        ...(weight !== undefined && { weight: Number(weight) }),
        ...(color !== undefined && { color }),
        ...(material !== undefined && { material }),
        ...(finish !== undefined && { finish }),
        ...(images !== undefined && { images }),
        ...(specifications !== undefined && { specifications }),
        ...(availability !== undefined && { availability }),
      },
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /partner/products/:id
 * Return a single product, verifying it belongs to this partner (IDOR check).
 */
export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const { id } = req.params;
    const providerIds = await getPartnerProviderIds(partner);

    const product = await prisma.product.findFirst({
      where: { id, providerId: { in: providerIds }, deletedAt: null },
      include: {
        category: true,
        catalog: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /partner/products/:id
 * Update a product, verifying ownership first.
 */
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const { id } = req.params;
    const providerIds = await getPartnerProviderIds(partner);

    const existing = await prisma.product.findFirst({
      where: { id, providerId: { in: providerIds }, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const {
      name,
      price,
      categoryId,
      description,
      brand,
      model,
      currency,
      width,
      depth,
      height,
      weight,
      color,
      material,
      finish,
      images,
      specifications,
      availability,
      isActive,
    } = req.body;

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ error: 'Product name cannot be empty' });
      return;
    }
    if (price !== undefined && isNaN(Number(price))) {
      res.status(400).json({ error: 'Invalid product price' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(price !== undefined && { price: Number(price) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(description !== undefined && { description }),
        ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }),
        ...(currency !== undefined && { currency }),
        ...(width !== undefined && { width: Number(width) }),
        ...(depth !== undefined && { depth: Number(depth) }),
        ...(height !== undefined && { height: Number(height) }),
        ...(weight !== undefined && { weight: Number(weight) }),
        ...(color !== undefined && { color }),
        ...(material !== undefined && { material }),
        ...(finish !== undefined && { finish }),
        ...(images !== undefined && { images }),
        ...(specifications !== undefined && { specifications }),
        ...(availability !== undefined && { availability }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /partner/products/:id
 * Soft-delete a product (sets isActive = false, deletedAt = now).
 * Verifies ownership before deleting.
 */
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const { id } = req.params;
    const providerIds = await getPartnerProviderIds(partner);

    const existing = await prisma.product.findFirst({
      where: { id, providerId: { in: providerIds }, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * GET /partner/orders
 * List orders that contain at least one of this partner's products.
 * Customer PII is masked (only first name + masked email).
 */
export const listOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const providerIds = await getPartnerProviderIds(partner);

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status as string | undefined;

    const partnerProductIds = await prisma.product
      .findMany({
        where: { providerId: { in: providerIds }, deletedAt: null },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    const where = {
      items: { some: { productId: { in: partnerProductIds } } },
      ...(statusFilter && { status: statusFilter as never }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          subtotal: true,
          total: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          shippedAt: true,
          deliveredAt: true,
          // Mask customer PII — only safe user fields
          user: {
            select: {
              firstName: true,
              email: true,
            },
          },
          items: {
            where: { productId: { in: partnerProductIds } },
            select: {
              id: true,
              name: true,
              sku: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              productId: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    // Mask email: john.doe@example.com → j***@e***.com
    const maskedOrders = orders.map((order) => ({
      ...order,
      user: order.user
        ? {
            firstName: order.user.firstName,
            email: maskEmail(order.user.email),
          }
        : null,
    }));

    res.json({
      data: maskedOrders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /partner/orders/:id
 * Return full details of a single order, verifying it contains the partner's products.
 */
export const getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const partner = getPartner(req);
    const { id } = req.params;
    const providerIds = await getPartnerProviderIds(partner);

    const partnerProductIds = await prisma.product
      .findMany({
        where: { providerId: { in: providerIds }, deletedAt: null },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    const order = await prisma.order.findFirst({
      where: {
        id,
        items: { some: { productId: { in: partnerProductIds } } },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        tax: true,
        shipping: true,
        discount: true,
        total: true,
        currency: true,
        shippingAddress: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        user: {
          select: {
            firstName: true,
            email: true,
          },
        },
        items: {
          where: { productId: { in: partnerProductIds } },
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const maskedOrder = {
      ...order,
      user: order.user
        ? {
            firstName: order.user.firstName,
            email: maskEmail(order.user.email),
          }
        : null,
    };

    res.json(maskedOrder);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /partner/orders/:id/status
 * Update the status of an order, subject to allowed transitions and ownership.
 *
 * Allowed transitions: pending→confirmed, confirmed→shipped, shipped→delivered
 */
export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const { id } = req.params;
    const { status } = req.body;

    const ALLOWED_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered'] as const;
    type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

    const TRANSITIONS: Record<AllowedStatus, AllowedStatus | null> = {
      pending: 'confirmed',
      confirmed: 'shipped',
      shipped: 'delivered',
      delivered: null,
    };

    if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
      res.status(400).json({
        error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
      });
      return;
    }

    const providerIds = await getPartnerProviderIds(partner);
    const partnerProductIds = await prisma.product
      .findMany({
        where: { providerId: { in: providerIds }, deletedAt: null },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    const order = await prisma.order.findFirst({
      where: {
        id,
        items: { some: { productId: { in: partnerProductIds } } },
      },
      select: { id: true, status: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const currentStatus = order.status as AllowedStatus;
    const expectedNext = TRANSITIONS[currentStatus];

    if (expectedNext === null) {
      res.status(400).json({ error: `Order is already in terminal status: ${currentStatus}` });
      return;
    }

    if (status !== expectedNext) {
      res.status(400).json({
        error: `Invalid status transition: ${currentStatus} → ${status}. Expected: ${currentStatus} → ${expectedNext}`,
      });
      return;
    }

    // Set timestamp fields alongside status
    const now = new Date();
    const timestampUpdate =
      status === 'shipped'
        ? { shippedAt: now }
        : status === 'delivered'
          ? { deliveredAt: now }
          : {};

    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as never, ...timestampUpdate },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        shippedAt: true,
        deliveredAt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/**
 * GET /partner/analytics/sales
 * Sales analytics for the specified period (7d, 30d, 90d, 1y).
 */
export const getSalesAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const days = resolvePeriodDays(req.query.period);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const providerIds = await getPartnerProviderIds(partner);
    const partnerProductIds = await prisma.product
      .findMany({
        where: { providerId: { in: providerIds }, deletedAt: null },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    // Fetch all relevant order items in the period
    const orderItems = await prisma.orderItem.findMany({
      where: {
        productId: { in: partnerProductIds },
        order: { createdAt: { gte: since } },
      },
      select: {
        totalPrice: true,
        quantity: true,
        productId: true,
        name: true,
        order: {
          select: { id: true, createdAt: true },
        },
      },
    });

    // Aggregate totals
    const totalRevenue = orderItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const orderIds = new Set(orderItems.map((item) => item.order.id));
    const totalOrders = orderIds.size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Daily revenue breakdown
    const dailyMap = new Map<string, { revenue: number; orderIds: Set<string> }>();
    for (const item of orderItems) {
      const dateKey = item.order.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { revenue: 0, orderIds: new Set() });
      }
      const day = dailyMap.get(dateKey)!;
      day.revenue += Number(item.totalPrice);
      day.orderIds.add(item.order.id);
    }

    const dailyRevenue = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orderIds.size,
      }));

    // Top products by revenue
    const productMap = new Map<
      string,
      { id: string; name: string; revenue: number; units: number }
    >();
    for (const item of orderItems) {
      if (!item.productId) {
        continue;
      }
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          id: item.productId,
          name: item.name,
          revenue: 0,
          units: 0,
        });
      }
      const entry = productMap.get(item.productId)!;
      entry.revenue += Number(item.totalPrice);
      entry.units += item.quantity;
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      period: req.query.period ?? '30d',
      totalRevenue,
      totalOrders,
      avgOrderValue,
      dailyRevenue,
      topProducts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /partner/analytics/products/:id
 * Per-product analytics: orders, revenue, and order conversion data.
 * Verifies ownership before returning data.
 */
export const getProductAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partner = getPartner(req);
    const { id } = req.params;
    const providerIds = await getPartnerProviderIds(partner);

    // IDOR check: verify the product belongs to this partner
    const product = await prisma.product.findFirst({
      where: { id, providerId: { in: providerIds }, deletedAt: null },
      select: { id: true, name: true, price: true, createdAt: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Aggregate order items for this product
    const orderItems = await prisma.orderItem.findMany({
      where: { productId: id },
      select: {
        quantity: true,
        totalPrice: true,
        unitPrice: true,
        order: { select: { createdAt: true } },
      },
    });

    const totalOrders = orderItems.length;
    const revenue = orderItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const units = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    // Price history derived from historical order items
    const priceHistory = Array.from(
      new Map(
        orderItems.map((item) => [
          item.order.createdAt.toISOString().slice(0, 10),
          Number(item.unitPrice),
        ])
      ).entries()
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, price]) => ({ date, price }));

    res.json({
      productId: id,
      productName: product.name,
      orders: totalOrders,
      revenue,
      units,
      // views and conversionRate require a separate analytics/tracking system;
      // return 0 as placeholder until that data source is integrated.
      views: 0,
      conversionRate: 0,
      priceHistory,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Private utilities
// ---------------------------------------------------------------------------

/**
 * Mask an email address for display, e.g. john.doe@example.com → j***@e***.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) {
    return email;
  }
  const [domainName, ...tldParts] = domain.split('.');
  const maskedLocal = `${(local ?? '').charAt(0)}***`;
  const maskedDomain = `${domainName?.charAt(0) ?? ''}***`;
  return `${maskedLocal}@${maskedDomain}.${tldParts.join('.')}`;
}
