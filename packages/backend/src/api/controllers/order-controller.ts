import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { OrderRepository } from '../../repositories/order-repository';
import { getMailService } from '../../services/mail.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

import type { OrderDetails } from '../../services/mail-templates';


const orderRepository = new OrderRepository(prisma);

// Statuses that can be cancelled
const CANCELLABLE_STATUSES = ['pending', 'confirmed'];

/**
 * Order Controller
 * Handles all order-related HTTP requests
 */
export class OrderController {
  /**
   * GET /orders
   * Get all orders for current user
   */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, status } = req.query;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const result = await orderRepository.findAll(
      { userId, status: status as string | undefined },
      { page: Number(page), limit: Number(limit) },
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: Number(limit),
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  });

  /**
   * GET /orders/:id
   * Get a single order by ID
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const userId = req.user?.userId;

    if (!id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    const order = await orderRepository.findById(id, true);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Check ownership (unless admin)
    const userRole = req.user?.role;
    if (order.userId !== userId && userRole !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  });

  /**
   * POST /orders
   * Create a new order
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const { projectId, items, shippingAddress, billingAddress, notes, currency } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Items are required and must be a non-empty array',
      });
      return;
    }

    // Validate shipping address
    if (!shippingAddress) {
      res.status(400).json({
        success: false,
        error: 'Shipping address is required',
      });
      return;
    }

    const order = await orderRepository.create({
      userId,
      projectId,
      items: items.map((item: any) => ({
        productId: item.productId,
        applianceId: item.applianceId,
        name: item.name || `Product ${item.productId || item.applianceId}`,
        sku: item.sku,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
      })),
      shippingAddress,
      billingAddress,
      notes,
      currency,
    });

    // Send order confirmation email (non-blocking)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (user) {
        const mailService = getMailService();
        const orderDetails: OrderDetails = {
          orderNumber: order.orderNumber,
          customerName: user.firstName || user.email.split('@')[0] || 'Client',
          items: (order.items || []).map((item) => ({
            name: item.name,
            sku: item.sku || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          subtotal: order.subtotal,
          tax: order.tax,
          shipping: order.shipping,
          total: order.total,
          currency: order.currency,
          shippingAddress: {
            name: shippingAddress.name || user.firstName || '',
            street: shippingAddress.street || shippingAddress.address || '',
            city: shippingAddress.city || '',
            state: shippingAddress.state,
            postalCode: shippingAddress.postalCode || shippingAddress.zipCode || '',
            country: shippingAddress.country || 'FR',
          },
          orderUrl: `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/orders/${order.id}`,
        };

        await mailService.sendOrderConfirmation(
          { email: user.email, name: user.firstName },
          orderDetails,
        );
      }
    } catch (error) {
      logger.error('Failed to send order confirmation email', { error, orderId: order.id });
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });
  });

  /**
   * PUT /orders/:id
   * Update an order
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const userId = req.user?.userId;
    const { shippingAddress, billingAddress, notes } = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    // Check ownership
    const existingOrder = await orderRepository.findById(id, false);
    if (!existingOrder) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const userRole = req.user?.role;
    if (existingOrder.userId !== userId && userRole !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Only allow updates for pending orders
    if (!['pending', 'draft'].includes(existingOrder.status)) {
      res.status(400).json({
        success: false,
        error: 'Order cannot be updated in current status',
      });
      return;
    }

    const order = await orderRepository.update(id, {
      shippingAddress,
      billingAddress,
      notes,
    });

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order updated successfully',
    });
  });

  /**
   * POST /orders/:id/cancel
   * Cancel an order
   */
  cancel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const userId = req.user?.userId;
    const { reason } = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    // Check ownership
    const existingOrder = await orderRepository.findById(id, false);
    if (!existingOrder) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const userRole = req.user?.role;
    if (existingOrder.userId !== userId && userRole !== 'admin') {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Check if order can be cancelled
    if (!CANCELLABLE_STATUSES.includes(existingOrder.status)) {
      res.status(400).json({
        success: false,
        error: `Order cannot be cancelled. Current status: ${existingOrder.status}. Cancellable statuses: ${CANCELLABLE_STATUSES.join(', ')}`,
      });
      return;
    }

    const order = await orderRepository.cancel(id, reason);

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    });
  });

  /**
   * GET /orders/stats
   * Get order statistics for current user
   */
  getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const stats = await orderRepository.getUserStats(userId);

    res.status(200).json({ success: true, data: stats });
  });

  /**
   * GET /orders/recent
   * Get recent orders for current user
   */
  getRecent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 50);

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const orders = await orderRepository.getRecentOrders(userId, limit);

    res.status(200).json({ success: true, data: orders });
  });

  /**
   * PUT /orders/:id/status (Admin only)
   * Update order status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    const { status } = req.body;

    if (!id) {
      res.status(400).json({ success: false, error: 'Order ID is required' });
      return;
    }

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }

    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
    ];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const order = await orderRepository.updateStatus(id, status);

    res.status(200).json({
      success: true,
      data: order,
      message: 'Order status updated successfully',
    });
  });
}

export const orderController = new OrderController();
export default orderController;
