/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Order Repository
 *
 * Handles all order-related database operations using Prisma ORM.
 */

import crypto from 'crypto';

import type { PrismaClient, OrderStatus } from '@prisma/client';

// Configurable pricing — override via environment variables
const TAX_RATE = parseFloat(process.env['TAX_RATE'] || '0.2'); // Default 20% VAT
if (isNaN(TAX_RATE)) {
  throw new Error('Invalid TAX_RATE configuration');
}
const DEFAULT_SHIPPING_COST = parseFloat(process.env['DEFAULT_SHIPPING_COST'] || '49.0'); // EUR
if (isNaN(DEFAULT_SHIPPING_COST)) {
  throw new Error('Invalid DEFAULT_SHIPPING_COST configuration');
}

export interface OrderWithItems {
  id: string;
  userId: string;
  projectId: string | null;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: any;
  billingAddress: any;
  notes: string | null;
  metadata: any;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItemData[];
}

export interface OrderItemData {
  id: string;
  orderId: string;
  productId: string | null;
  applianceId: string | null;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata: any;
}

export interface CreateOrderDto {
  userId: string;
  projectId?: string;
  items: CreateOrderItemDto[];
  shippingAddress: any;
  billingAddress?: any;
  notes?: string;
  currency?: string;
}

export interface CreateOrderItemDto {
  productId?: string;
  applianceId?: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
}

export interface UpdateOrderDto {
  status?: string;
  shippingAddress?: any;
  billingAddress?: any;
  notes?: string;
  metadata?: any;
}

export interface OrderFilters {
  userId?: string;
  projectId?: string;
  status?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `KX-${timestamp}-${random}`;
  }

  /**
   * Find an order by ID
   */
  async findById(id: string, includeItems = true): Promise<OrderWithItems | null> {
    const result = await this.prisma.order.findUnique({
      where: { id },
      include: includeItems
        ? {
            items: {
              include: {
                product: true,
                appliance: true,
              },
            },
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            project: { select: { id: true, name: true } },
          }
        : undefined,
    });
    return result as unknown as OrderWithItems | null;
  }

  /**
   * Find an order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<OrderWithItems | null> {
    const result = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: { product: true, appliance: true },
        },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
      },
    });
    return result as unknown as OrderWithItems | null;
  }

  /**
   * Find all orders with optional filters and pagination
   */
  async findAll(
    filters: OrderFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: OrderWithItems[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.status && { status: filters.status as OrderStatus }),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          items: {
            include: { product: true, appliance: true },
          },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data as unknown as OrderWithItems[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find orders by user ID
   */
  async findByUserId(
    userId: string,
    pagination: PaginationOptions = {}
  ): Promise<{ data: OrderWithItems[]; total: number; page: number; totalPages: number }> {
    return this.findAll({ userId }, pagination);
  }

  /**
   * Create a new order
   */
  async create(data: CreateOrderDto): Promise<OrderWithItems> {
    const result = await this.prisma.$transaction(async (tx) => {
      const orderNumber = this.generateOrderNumber();

      // Calculate totals
      const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const tax = subtotal * TAX_RATE;
      const shippingCost = DEFAULT_SHIPPING_COST;
      const total = subtotal + tax + shippingCost;

      return tx.order.create({
        data: {
          userId: data.userId,
          projectId: data.projectId,
          orderNumber,
          status: 'pending',
          subtotal,
          tax,
          shipping: shippingCost,
          discount: 0,
          total,
          currency: data.currency || 'EUR',
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              applianceId: item.applianceId,
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
            })),
          },
        },
        include: {
          items: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
    });
    return result as unknown as OrderWithItems;
  }

  /**
   * Update an order
   */
  async update(id: string, data: UpdateOrderDto): Promise<OrderWithItems> {
    const updateData: Record<string, any> = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.shippingAddress !== undefined) {
      updateData.shippingAddress = data.shippingAddress;
    }
    if (data.billingAddress !== undefined) {
      updateData.billingAddress = data.billingAddress;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    const result = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { product: true, appliance: true },
        },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    return result as unknown as OrderWithItems;
  }

  /**
   * Update order status
   */
  async updateStatus(
    id: string,
    status: string,
    additionalData?: Record<string, any>
  ): Promise<OrderWithItems> {
    const updateData: Record<string, any> = { status };

    // Set timestamp based on status
    if (status === 'paid' || status === 'confirmed') {
      updateData.paidAt = new Date();
    } else if (status === 'shipped') {
      updateData.shippedAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const result = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: { product: true, appliance: true },
        },
      },
    });
    return result as unknown as OrderWithItems;
  }

  /**
   * Cancel an order
   */
  async cancel(id: string, reason?: string): Promise<OrderWithItems> {
    const metadata = reason ? { cancellationReason: reason } : undefined;
    return this.updateStatus(id, 'cancelled', metadata ? { metadata } : undefined);
  }

  /**
   * Count orders with optional filters
   */
  async count(filters: OrderFilters = {}): Promise<number> {
    return this.prisma.order.count({
      where: {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.status && { status: filters.status as OrderStatus }),
      },
    });
  }

  /**
   * Get order statistics for a user.
   * Uses groupBy to derive all status counts from a single query
   * instead of 3 separate count() calls (was 4 queries, now 2).
   */
  async getUserStats(userId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSpent: number;
  }> {
    const [statusCounts, totalSpent] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { userId, status: 'delivered' },
        _sum: { total: true },
      }),
    ]);

    let totalOrders = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    for (const stat of statusCounts) {
      totalOrders += stat._count._all;
      if (stat.status === 'pending') {
        pendingOrders = stat._count._all;
      }
      if (stat.status === 'delivered') {
        completedOrders = stat._count._all;
      }
    }

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSpent: Number(totalSpent._sum.total) || 0,
    };
  }

  /**
   * Get recent orders for a user
   */
  async getRecentOrders(userId: string, limit = 5): Promise<OrderWithItems[]> {
    const result = await this.prisma.order.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true, appliance: true },
        },
        project: { select: { id: true, name: true } },
      },
    });
    return result as unknown as OrderWithItems[];
  }
}

export default OrderRepository;
