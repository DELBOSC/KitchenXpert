/**
 * Payment Controller
 * Handles all payment-related HTTP requests including payment intents,
 * subscriptions, webhooks, and refunds.
 */

import { Request, Response } from 'express';
import type Stripe from 'stripe';
import { asyncHandler } from '../middleware/error-middleware';
import { getStripeService, StripeServiceError } from '../../services/stripe-service';
import logger from '../../utils/logger';

/**
 * Payment Controller
 * Handles all payment-related HTTP requests
 */
export class PaymentController {
  /**
   * POST /payments/intent
   * Create a new payment intent
   */
  createPaymentIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { amount, currency, metadata, description, receiptEmail } = req.body;
    const userId = req.user?.userId;

    // Validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Amount is required and must be a positive number',
      });
      return;
    }

    if (!currency || typeof currency !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Currency is required and must be a string (e.g., "eur", "usd")',
      });
      return;
    }

    const stripeService = getStripeService();

    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Payment service is not configured',
      });
      return;
    }

    try {
      const paymentIntent = await stripeService.createPaymentIntent({
        amount,
        currency,
        metadata: {
          ...metadata,
          userId: userId || 'anonymous',
        },
        description,
        receiptEmail,
      });

      res.status(201).json({
        success: true,
        data: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
        message: 'Payment intent created successfully',
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /payments/intent/:id
   * Get a payment intent by ID
   */
  getPaymentIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Payment intent ID is required',
      });
      return;
    }

    const stripeService = getStripeService();
    const userId = req.user?.userId;

    try {
      const paymentIntent = await stripeService.getPaymentIntent(id);

      // Verify metadata field is present
      if (!paymentIntent.metadata?.userId) {
        res.status(400).json({ success: false, error: 'Invalid payment intent' });
        return;
      }

      // Verify ownership
      if (paymentIntent.metadata.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Not authorized to view this payment',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          metadata: paymentIntent.metadata,
          created: new Date(paymentIntent.created * 1000),
        },
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(404).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /payments/intent/:id/cancel
   * Cancel a payment intent
   */
  cancelPaymentIntent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Payment intent ID is required',
      });
      return;
    }

    const stripeService = getStripeService();
    const userId = req.user?.userId;

    try {
      // Verify ownership before cancelling
      const existing = await stripeService.getPaymentIntent(id);

      // Verify metadata field is present
      if (!existing.metadata?.userId) {
        res.status(400).json({ success: false, error: 'Invalid payment intent' });
        return;
      }

      if (existing.metadata.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Not authorized to cancel this payment',
        });
        return;
      }

      const paymentIntent = await stripeService.cancelPaymentIntent(id);

      res.status(200).json({
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        },
        message: 'Payment intent cancelled successfully',
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /payments/webhook
   * Handle Stripe webhook events
   * Note: This endpoint should NOT use JSON body parser - it needs raw body
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.warn('Webhook received without signature');
      res.status(400).json({
        success: false,
        error: 'Missing Stripe signature header',
      });
      return;
    }

    const stripeService = getStripeService();

    try {
      // req.body should be the raw buffer for webhook verification
      const event = stripeService.handleWebhook(req.body, signature);

      // Process the event asynchronously
      stripeService.processWebhookEvent(event).catch((error) => {
        logger.error('Error processing webhook event', {
          eventId: event.id,
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      // Acknowledge receipt immediately
      res.status(200).json({ received: true, eventId: event.id });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        logger.error('Webhook verification failed', {
          error: error.message,
          code: error.code,
        });
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }

      logger.error('Unexpected webhook error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error processing webhook',
      });
    }
  });

  /**
   * GET /payments/history
   * Get payment history for current user or specified customer
   */
  getPaymentHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { customerId, limit = '10' } = req.query;
    const userId = req.user?.userId;

    if (!customerId || typeof customerId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Customer ID is required',
      });
      return;
    }

    const stripeService = getStripeService();

    // IDOR protection: verify the Stripe customer belongs to the authenticated user
    try {
      const customer = await stripeService.getCustomer(customerId);
      if (customer.deleted || customer.metadata?.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'You are not authorized to view this customer\'s payment history',
        });
        return;
      }
    } catch {
      res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
      return;
    }

    try {
      const history = await stripeService.getPaymentHistory(
        customerId,
        userId!,
        parseInt(limit as string, 10) || 10
      );

      res.status(200).json({
        success: true,
        data: history,
        meta: {
          count: history.length,
          customerId,
        },
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /payments/refund
   * Refund a payment
   */
  refundPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { paymentIntentId, amount } = req.body;

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Payment intent ID is required',
      });
      return;
    }

    // Validate amount if provided
    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      res.status(400).json({
        success: false,
        error: 'Amount must be a positive number',
      });
      return;
    }

    const stripeService = getStripeService();

    try {
      // Verify ownership: retrieve payment intent and check customer belongs to user
      const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);
      if (paymentIntent.customer) {
        const customer = await stripeService.getCustomer(paymentIntent.customer as string);
        if (customer.deleted || (customer.metadata?.userId !== userId && req.user?.role !== 'admin')) {
          res.status(403).json({ success: false, error: 'You do not have permission to refund this payment' });
          return;
        }
      } else if (req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'You do not have permission to refund this payment' });
        return;
      }

      const refund = await stripeService.refundPayment(paymentIntentId, amount);

      res.status(200).json({
        success: true,
        data: refund,
        message: amount ? 'Partial refund processed successfully' : 'Full refund processed successfully',
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /payments/customers
   * Create a new Stripe customer
   */
  createCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { email, name, metadata, phone, address } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    const stripeService = getStripeService();

    try {
      const customer = await stripeService.createCustomer({
        email,
        name,
        metadata: {
          ...metadata,
          userId,
        },
        phone,
        address,
      });

      res.status(201).json({
        success: true,
        data: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          created: new Date(customer.created * 1000),
        },
        message: 'Customer created successfully',
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /payments/customers/:id
   * Get a customer by ID
   */
  getCustomer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Customer ID is required',
      });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const stripeService = getStripeService();

    try {
      const customer = await stripeService.getCustomer(id);

      if ('deleted' in customer && customer.deleted) {
        res.status(404).json({
          success: false,
          error: 'Customer has been deleted',
        });
        return;
      }

      // After the deleted check above, we know this is a full Customer object
      const activeCustomer = customer as Stripe.Customer;

      // Verify ownership: customer must belong to the authenticated user
      if (activeCustomer.metadata?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: activeCustomer.id,
          email: activeCustomer.email,
          name: activeCustomer.name,
          phone: activeCustomer.phone,
          created: new Date(activeCustomer.created * 1000),
          metadata: activeCustomer.metadata,
        },
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(404).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /subscriptions
   * Create a new subscription
   */
  createSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { customerId, priceId, metadata, trialPeriodDays } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    if (!customerId || typeof customerId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Customer ID is required',
      });
      return;
    }

    if (!priceId || typeof priceId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Price ID is required',
      });
      return;
    }

    const stripeService = getStripeService();

    // Check if Stripe is configured
    if (!stripeService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Payment service is not configured',
      });
      return;
    }

    // Verify customer ownership before creating subscription
    try {
      const customer = await stripeService.getCustomer(customerId);
      const activeCustomer = customer as Stripe.Customer;
      if (activeCustomer.metadata?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied: customer does not belong to you' });
        return;
      }
    } catch {
      res.status(400).json({ success: false, error: 'Invalid customer ID' });
      return;
    }

    try {
      const subscription = await stripeService.createSubscription({
        customerId,
        priceId,
        metadata: {
          ...metadata,
          userId: userId || 'unknown',
        },
        trialPeriodDays,
      });

      // Extract client secret from the latest invoice if available
      // The subscription was created with expand: ['latest_invoice.payment_intent'],
      // so latest_invoice is an expanded Stripe.Invoice and its payment_intent is an expanded Stripe.PaymentIntent
      let clientSecret: string | null = null;
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null;
      if (latestInvoice) {
        const paymentIntent = latestInvoice.payment_intent as Stripe.PaymentIntent | null;
        if (paymentIntent?.client_secret) {
          clientSecret = paymentIntent.client_secret;
        }
      }

      res.status(201).json({
        success: true,
        data: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          clientSecret,
          customerId: subscription.customer,
          priceId: (subscription.items.data[0]?.price as Stripe.Price | undefined)?.id,
        },
        message: 'Subscription created successfully',
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /subscriptions/:id
   * Get a subscription by ID
   */
  getSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Subscription ID is required',
      });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const stripeService = getStripeService();

    try {
      const subscription = await stripeService.getSubscription(id);

      // Verify ownership via customer metadata
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      const customer = await stripeService.getCustomer(customerId);
      const activeCustomer = customer as Stripe.Customer;
      if (activeCustomer.metadata?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          customerId: subscription.customer,
          priceId: (subscription.items.data[0]?.price as Stripe.Price | undefined)?.id,
          metadata: subscription.metadata,
        },
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(404).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * DELETE /subscriptions/:id
   * Cancel a subscription
   */
  cancelSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { cancelAtPeriodEnd = false } = req.body;
    const userId = req.user?.userId;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Subscription ID is required',
      });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const stripeService = getStripeService();

    // Verify ownership before cancelling
    try {
      const existingSub = await stripeService.getSubscription(id);
      const customerId = typeof existingSub.customer === 'string' ? existingSub.customer : existingSub.customer.id;
      const customer = await stripeService.getCustomer(customerId);
      const activeCustomer = customer as Stripe.Customer;
      if (activeCustomer.metadata?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
    } catch {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }

    try {
      const subscription = await stripeService.cancelSubscription(id, cancelAtPeriodEnd);

      res.status(200).json({
        success: true,
        data: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
        message: cancelAtPeriodEnd
          ? 'Subscription will be cancelled at the end of the billing period'
          : 'Subscription cancelled immediately',
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /subscriptions/customer/:customerId
   * List subscriptions for a customer
   */
  listCustomerSubscriptions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { customerId } = req.params;
    const { limit = '10' } = req.query;
    const userId = req.user?.userId;

    if (!customerId) {
      res.status(400).json({
        success: false,
        error: 'Customer ID is required',
      });
      return;
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    const stripeService = getStripeService();

    // Verify customer ownership
    try {
      const customer = await stripeService.getCustomer(customerId);
      const activeCustomer = customer as Stripe.Customer;
      if (activeCustomer.metadata?.userId !== userId && req.user?.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
    } catch {
      res.status(400).json({ success: false, error: 'Invalid customer ID' });
      return;
    }

    try {
      const subscriptions = await stripeService.listCustomerSubscriptions(
        customerId,
        parseInt(limit as string, 10) || 10
      );

      res.status(200).json({
        success: true,
        data: subscriptions.data.map((sub: Stripe.Subscription) => ({
          id: sub.id,
          status: sub.status,
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          priceId: (sub.items.data[0]?.price as Stripe.Price | undefined)?.id,
        })),
        meta: {
          count: subscriptions.data.length,
          hasMore: subscriptions.has_more,
        },
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /payments/prices
   * List available prices
   */
  listPrices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { productId, active = 'true' } = req.query;

    const stripeService = getStripeService();

    try {
      const prices = await stripeService.listPrices(
        productId as string | undefined,
        active === 'true'
      );

      res.status(200).json({
        success: true,
        data: prices.data.map((price: Stripe.Price) => ({
          id: price.id,
          productId: price.product,
          unitAmount: price.unit_amount,
          currency: price.currency,
          type: price.type,
          recurring: price.recurring
            ? {
                interval: price.recurring.interval,
                intervalCount: price.recurring.interval_count,
              }
            : null,
          active: price.active,
          nickname: price.nickname,
        })),
        meta: {
          count: prices.data.length,
          hasMore: prices.has_more,
        },
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /payments/products
   * List available products
   */
  listProducts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { active = 'true' } = req.query;

    const stripeService = getStripeService();

    try {
      const products = await stripeService.listProducts(active === 'true');

      res.status(200).json({
        success: true,
        data: products.data.map((product: Stripe.Product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          active: product.active,
          images: product.images,
          metadata: product.metadata,
        })),
        meta: {
          count: products.data.length,
          hasMore: products.has_more,
        },
      });
    } catch (error) {
      if (error instanceof StripeServiceError) {
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  });
}

export const paymentController = new PaymentController();
export default paymentController;
