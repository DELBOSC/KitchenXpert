/**
 * Stripe Payment Service
 * Handles all Stripe payment operations including payment intents,
 * customers, subscriptions, webhooks, and refunds.
 */

import Stripe from 'stripe';
import { createModuleLogger } from '../utils/logger';
import { prisma } from '../database/client';

const logger = createModuleLogger('stripe-service');

// =================================
// Types and Interfaces
// =================================

export interface PaymentIntentData {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  customerId?: string;
  description?: string;
  receiptEmail?: string;
}

export interface CustomerData {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  phone?: string;
  address?: Stripe.AddressParam;
}

export interface SubscriptionData {
  customerId: string;
  priceId: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  paymentBehavior?: Stripe.SubscriptionCreateParams.PaymentBehavior;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created: Date;
  receiptUrl: string | null;
  metadata: Record<string, string>;
}

export interface RefundResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentIntentId: string;
  created: Date;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: Stripe.PaymentIntent | Stripe.Subscription | Stripe.Customer | Stripe.Charge | Stripe.Invoice;
  };
}

// =================================
// Stripe Service Class
// =================================

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      logger.warn('STRIPE_SECRET_KEY is not configured. Stripe operations will fail.');
    }

    if (!webhookSecret) {
      logger.warn('STRIPE_WEBHOOK_SECRET is not configured. Webhook verification will fail.');
    }

    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });

    this.webhookSecret = webhookSecret || '';
  }

  /**
   * Check if Stripe is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  }

  // =================================
  // Payment Intent Methods
  // =================================

  /**
   * Create a payment intent for one-time payments
   * @param data - Payment intent data including amount, currency, and metadata
   * @returns The created payment intent
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    const { amount, currency, metadata, customerId, description, receiptEmail } = data;

    logger.info('Creating payment intent', { amount, currency, customerId });

    try {
      const currencyLower = currency.toLowerCase();
      // PSD2/SCA: force 3DS for EU currencies above the regulatory threshold (€30 = 3000 cents).
      // Stripe normally triggers SCA automatically, but requesting it explicitly guarantees
      // strong customer authentication and creates an auditable decision trail.
      const euCurrencies = new Set(['eur', 'gbp', 'chf', 'sek', 'nok', 'dkk', 'pln', 'czk', 'ron', 'bgn', 'huf']);
      const requiresSca = euCurrencies.has(currencyLower) && amount >= 3000;

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: currencyLower,
        metadata: metadata || {},
        automatic_payment_methods: { enabled: true },
        ...(requiresSca && {
          payment_method_options: {
            card: { request_three_d_secure: 'any' },
          },
        }),
      };

      if (customerId) paymentIntentParams.customer = customerId;
      if (description) paymentIntentParams.description = description;
      if (receiptEmail) paymentIntentParams.receipt_email = receiptEmail;

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      logger.info('Payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        scaEnforced: requiresSca,
      });

      return paymentIntent;
    } catch (error) {
      const stripeErr = error as Stripe.errors.StripeError;
      logger.error('Failed to create payment intent', {
        error: stripeErr?.message || String(error),
        code: stripeErr?.code,
        declineCode: (stripeErr as Stripe.errors.StripeCardError)?.decline_code,
        type: stripeErr?.type,
        amount,
        currency,
      });

      // Audit trail for payment creation failures (regulatory + fraud monitoring).
      const userId = metadata?.userId;
      if (userId) {
        try {
          await prisma.auditLog.create({
            data: {
              userId,
              action: 'payment_failed',
              resource: 'payment',
              resourceId: stripeErr?.requestId || 'creation-attempt',
              metadata: {
                kind: 'payment_intent_creation_failed',
                amount,
                currency,
                code: stripeErr?.code || null,
                declineCode: (stripeErr as Stripe.errors.StripeCardError)?.decline_code || null,
                type: stripeErr?.type || null,
                message: stripeErr?.message || String(error),
              },
            },
          });
        } catch (auditErr) {
          logger.error('Failed to write payment failure audit log', {
            error: auditErr instanceof Error ? auditErr.message : String(auditErr),
          });
        }
      }

      throw new StripeServiceError(
        'PAYMENT_INTENT_CREATION_FAILED',
        'Failed to create payment intent'
      );
    }
  }

  /**
   * Retrieve a payment intent by ID
   * @param paymentIntentId - The payment intent ID
   * @returns The payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      logger.error('Failed to retrieve payment intent', {
        paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'PAYMENT_INTENT_NOT_FOUND',
        `Failed to retrieve payment intent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cancel a payment intent
   * @param paymentIntentId - The payment intent ID to cancel
   * @returns The cancelled payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    logger.info('Cancelling payment intent', { paymentIntentId });

    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      logger.info('Payment intent cancelled successfully', { paymentIntentId });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to cancel payment intent', {
        paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'PAYMENT_INTENT_CANCELLATION_FAILED',
        `Failed to cancel payment intent: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // =================================
  // Customer Methods
  // =================================

  /**
   * Create a new Stripe customer
   * @param data - Customer data including email and name
   * @returns The created customer
   */
  async createCustomer(data: CustomerData): Promise<Stripe.Customer> {
    const { email, name, metadata, phone, address } = data;

    logger.info('Creating Stripe customer', { email, name });

    try {
      const customerParams: Stripe.CustomerCreateParams = {
        email,
        metadata: metadata || {},
      };

      if (name) {
        customerParams.name = name;
      }

      if (phone) {
        customerParams.phone = phone;
      }

      if (address) {
        customerParams.address = address;
      }

      const customer = await this.stripe.customers.create(customerParams);

      logger.info('Stripe customer created successfully', {
        customerId: customer.id,
        email,
      });

      return customer;
    } catch (error) {
      logger.error('Failed to create Stripe customer', {
        error: error instanceof Error ? error.message : String(error),
        email,
      });
      throw new StripeServiceError(
        'CUSTOMER_CREATION_FAILED',
        `Failed to create customer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Retrieve a customer by ID
   * @param customerId - The customer ID
   * @returns The customer
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      logger.error('Failed to retrieve customer', {
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'CUSTOMER_NOT_FOUND',
        `Failed to retrieve customer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update a customer
   * @param customerId - The customer ID
   * @param data - Data to update
   * @returns The updated customer
   */
  async updateCustomer(
    customerId: string,
    data: Partial<CustomerData>
  ): Promise<Stripe.Customer> {
    logger.info('Updating Stripe customer', { customerId });

    try {
      const updateParams: Stripe.CustomerUpdateParams = {};

      if (data.email) updateParams.email = data.email;
      if (data.name) updateParams.name = data.name;
      if (data.phone) updateParams.phone = data.phone;
      if (data.metadata) updateParams.metadata = data.metadata;
      if (data.address) updateParams.address = data.address;

      const customer = await this.stripe.customers.update(customerId, updateParams);

      logger.info('Stripe customer updated successfully', { customerId });

      return customer;
    } catch (error) {
      logger.error('Failed to update customer', {
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'CUSTOMER_UPDATE_FAILED',
        `Failed to update customer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a customer
   * @param customerId - The customer ID to delete
   * @returns The deleted customer confirmation
   */
  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    logger.info('Deleting Stripe customer', { customerId });

    try {
      const deletedCustomer = await this.stripe.customers.del(customerId);

      logger.info('Stripe customer deleted successfully', { customerId });

      return deletedCustomer;
    } catch (error) {
      logger.error('Failed to delete customer', {
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'CUSTOMER_DELETION_FAILED',
        `Failed to delete customer: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // =================================
  // Subscription Methods
  // =================================

  /**
   * Create a new subscription
   * @param data - Subscription data including customer ID and price ID
   * @returns The created subscription
   */
  async createSubscription(data: SubscriptionData): Promise<Stripe.Subscription> {
    const { customerId, priceId, metadata, trialPeriodDays, paymentBehavior } = data;

    logger.info('Creating subscription', { customerId, priceId });

    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata: metadata || {},
        payment_behavior: paymentBehavior || 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
      };

      if (trialPeriodDays && trialPeriodDays > 0) {
        subscriptionParams.trial_period_days = trialPeriodDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionParams);

      logger.info('Subscription created successfully', {
        subscriptionId: subscription.id,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', {
        error: error instanceof Error ? error.message : String(error),
        customerId,
        priceId,
      });
      throw new StripeServiceError(
        'SUBSCRIPTION_CREATION_FAILED',
        `Failed to create subscription: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Retrieve a subscription by ID
   * @param subscriptionId - The subscription ID
   * @returns The subscription
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Failed to retrieve subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'SUBSCRIPTION_NOT_FOUND',
        `Failed to retrieve subscription: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Cancel a subscription
   * @param subscriptionId - The subscription ID to cancel
   * @param cancelAtPeriodEnd - If true, cancel at end of billing period
   * @returns The cancelled subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = false
  ): Promise<Stripe.Subscription> {
    logger.info('Cancelling subscription', { subscriptionId, cancelAtPeriodEnd });

    try {
      let subscription: Stripe.Subscription;

      if (cancelAtPeriodEnd) {
        // Cancel at the end of the current billing period
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        // Cancel immediately
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      }

      logger.info('Subscription cancelled successfully', {
        subscriptionId,
        status: subscription.status,
        cancelAtPeriodEnd,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to cancel subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'SUBSCRIPTION_CANCELLATION_FAILED',
        `Failed to cancel subscription: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Update a subscription
   * @param subscriptionId - The subscription ID
   * @param params - Update parameters
   * @returns The updated subscription
   */
  async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams
  ): Promise<Stripe.Subscription> {
    logger.info('Updating subscription', { subscriptionId });

    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, params);

      logger.info('Subscription updated successfully', {
        subscriptionId,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to update subscription', {
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'SUBSCRIPTION_UPDATE_FAILED',
        `Failed to update subscription: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * List subscriptions for a customer
   * @param customerId - The customer ID
   * @param limit - Maximum number of subscriptions to return
   * @returns List of subscriptions
   */
  async listCustomerSubscriptions(
    customerId: string,
    limit: number = 10
  ): Promise<Stripe.ApiList<Stripe.Subscription>> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        limit,
      });
      return subscriptions;
    } catch (error) {
      logger.error('Failed to list customer subscriptions', {
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'SUBSCRIPTIONS_LIST_FAILED',
        `Failed to list subscriptions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // =================================
  // Webhook Methods
  // =================================

  /**
   * Verify and construct a webhook event from payload and signature
   * @param payload - The raw request body
   * @param signature - The Stripe-Signature header value
   * @returns The verified webhook event
   */
  handleWebhook(payload: string | Buffer, signature: string): Stripe.Event {
    logger.info('Processing webhook event');

    if (!this.webhookSecret) {
      throw new StripeServiceError(
        'WEBHOOK_SECRET_NOT_CONFIGURED',
        'Webhook secret is not configured'
      );
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      logger.info('Webhook event verified successfully', {
        eventId: event.id,
        eventType: event.type,
      });

      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'WEBHOOK_SIGNATURE_INVALID',
        `Webhook signature verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Process a webhook event based on its type
   * @param event - The Stripe webhook event
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const { type, data } = event;

    logger.info('Processing webhook event', { eventType: type, eventId: event.id });

    switch (type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(data.object as Stripe.Invoice);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(data.object as Stripe.Charge);
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType: type });
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    logger.info('Payment intent succeeded', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerId: paymentIntent.customer,
    });

    const customerId = typeof paymentIntent.customer === 'string'
      ? paymentIntent.customer
      : paymentIntent.customer?.id;

    if (!customerId) return;

    try {
      // Find the user linked to this Stripe customer
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) {
        logger.warn('No user found for Stripe customer', { customerId });
        return;
      }

      // Record the payment in audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'payment_succeeded',
          resource: 'payment',
          resourceId: paymentIntent.id,
          metadata: {
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        },
      });

      logger.info('Payment recorded for user', { userId: user.id, paymentIntentId: paymentIntent.id });
    } catch (error) {
      logger.error('Failed to process payment success webhook', {
        error: error instanceof Error ? error.message : String(error),
        paymentIntentId: paymentIntent.id,
      });
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const err = paymentIntent.last_payment_error;
    logger.warn('Payment intent failed', {
      paymentIntentId: paymentIntent.id,
      code: err?.code,
      declineCode: err?.decline_code,
      type: err?.type,
      message: err?.message,
    });

    const customerId = typeof paymentIntent.customer === 'string'
      ? paymentIntent.customer
      : paymentIntent.customer?.id;

    if (!customerId) return;

    try {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return;

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'payment_failed',
          resource: 'payment',
          resourceId: paymentIntent.id,
          metadata: {
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            code: err?.code || null,
            declineCode: err?.decline_code || null,
            type: err?.type || null,
            paymentMethodType: err?.payment_method?.type || null,
            network: (err?.payment_method?.card as { network?: string } | undefined)?.network || null,
            message: err?.message || 'Unknown error',
          },
        },
      });
    } catch (error) {
      logger.error('Failed to process payment failure webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    try {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) {
        logger.warn('No user found for Stripe customer on subscription create', { customerId });
        return;
      }

      // Upgrade user role to match their subscription
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'subscription_created',
          resource: 'subscription',
          resourceId: subscription.id,
          metadata: { status: subscription.status },
        },
      });

      logger.info('User subscription provisioned', { userId: user.id, subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to process subscription created webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription updated', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    try {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: subscription.status,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'subscription_updated',
          resource: 'subscription',
          resourceId: subscription.id,
          metadata: {
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to process subscription updated webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Subscription deleted', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    try {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return;

      // Downgrade user: clear subscription and revert to free tier
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionId: null,
          subscriptionStatus: 'canceled',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'subscription_deleted',
          resource: 'subscription',
          resourceId: subscription.id,
        },
      });

      logger.info('User subscription deprovisioned', { userId: user.id });
    } catch (error) {
      logger.error('Failed to process subscription deleted webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Invoice paid', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amountPaid: invoice.amount_paid,
    });

    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) return;

    try {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return;

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'invoice_paid',
          resource: 'invoice',
          resourceId: invoice.id,
          metadata: {
            amountPaid: invoice.amount_paid,
            currency: invoice.currency,
            invoiceUrl: invoice.hosted_invoice_url,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to process invoice paid webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn('Invoice payment failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      attemptCount: invoice.attempt_count,
    });

    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) return;

    try {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return;

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'invoice_payment_failed',
          resource: 'invoice',
          resourceId: invoice.id,
          metadata: {
            attemptCount: invoice.attempt_count,
            nextAttempt: invoice.next_payment_attempt
              ? new Date(invoice.next_payment_attempt * 1000).toISOString()
              : null,
          },
        },
      });

      // If too many failed attempts, flag the user's subscription
      if (invoice.attempt_count && invoice.attempt_count >= 3) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'past_due' },
        });
        logger.warn('User subscription marked as past_due after 3 failed attempts', { userId: user.id });
      }
    } catch (error) {
      logger.error('Failed to process invoice payment failed webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    logger.info('Charge refunded', {
      chargeId: charge.id,
      amount: charge.amount_refunded,
      paymentIntentId: charge.payment_intent,
    });

    const customerId = typeof charge.customer === 'string'
      ? charge.customer
      : charge.customer?.id;

    if (!customerId) return;

    try {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return;

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'charge_refunded',
          resource: 'charge',
          resourceId: charge.id,
          metadata: {
            amountRefunded: charge.amount_refunded,
            currency: charge.currency,
            paymentIntentId: typeof charge.payment_intent === 'string'
              ? charge.payment_intent
              : charge.payment_intent?.id,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to process charge refunded webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // =================================
  // Payment History Methods
  // =================================

  /**
   * Get payment history for a customer
   * @param customerId - The Stripe customer ID
   * @param userId - The authenticated user's ID for ownership verification
   * @param limit - Maximum number of payments to return
   * @returns List of payment history items
   */
  async getPaymentHistory(
    customerId: string,
    userId: string,
    limit: number = 10
  ): Promise<PaymentHistoryItem[]> {
    logger.info('Fetching payment history', { customerId, userId, limit });

    try {
      // IDOR protection: verify the Stripe customer belongs to the authenticated user
      const customer = await this.stripe.customers.retrieve(customerId);
      if (!customer || customer.deleted) {
        throw new StripeServiceError(
          'CUSTOMER_NOT_FOUND',
          'Customer not found or has been deleted'
        );
      }
      if ((customer as Stripe.Customer).metadata?.userId !== userId) {
        throw new StripeServiceError(
          'PAYMENT_HISTORY_UNAUTHORIZED',
          'You are not authorized to view this customer\'s payment history'
        );
      }

      const charges = await this.stripe.charges.list({
        customer: customerId,
        limit,
      });

      const history: PaymentHistoryItem[] = charges.data.map((charge: Stripe.Charge) => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        description: charge.description,
        created: new Date(charge.created * 1000),
        receiptUrl: charge.receipt_url,
        metadata: charge.metadata as Record<string, string>,
      }));

      logger.info('Payment history fetched successfully', {
        customerId,
        count: history.length,
      });

      return history;
    } catch (error) {
      if (error instanceof StripeServiceError) {
        throw error;
      }
      logger.error('Failed to fetch payment history', {
        customerId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'PAYMENT_HISTORY_FETCH_FAILED',
        `Failed to fetch payment history: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // =================================
  // Refund Methods
  // =================================

  /**
   * Refund a payment
   * @param paymentIntentId - The payment intent ID to refund
   * @param amount - Optional partial refund amount (in smallest currency unit)
   * @returns The refund result
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<RefundResult> {
    logger.info('Processing refund', { paymentIntentId, amount });

    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount !== undefined && amount > 0) {
        refundParams.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      const result: RefundResult = {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status || 'unknown',
        paymentIntentId: paymentIntentId,
        created: new Date(refund.created * 1000),
      };

      logger.info('Refund processed successfully', {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      });

      return result;
    } catch (error) {
      logger.error('Failed to process refund', {
        paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'REFUND_FAILED',
        `Failed to process refund: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get refund by ID
   * @param refundId - The refund ID
   * @returns The refund
   */
  async getRefund(refundId: string): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      return refund;
    } catch (error) {
      logger.error('Failed to retrieve refund', {
        refundId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'REFUND_NOT_FOUND',
        `Failed to retrieve refund: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // =================================
  // Price and Product Methods
  // =================================

  /**
   * List available prices
   * @param productId - Optional product ID to filter by
   * @param active - Whether to only return active prices
   * @returns List of prices
   */
  async listPrices(
    productId?: string,
    active: boolean = true
  ): Promise<Stripe.ApiList<Stripe.Price>> {
    try {
      const params: Stripe.PriceListParams = {
        active,
        limit: 100,
      };

      if (productId) {
        params.product = productId;
      }

      const prices = await this.stripe.prices.list(params);
      return prices;
    } catch (error) {
      logger.error('Failed to list prices', {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'PRICES_LIST_FAILED',
        `Failed to list prices: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * List available products
   * @param active - Whether to only return active products
   * @returns List of products
   */
  async listProducts(active: boolean = true): Promise<Stripe.ApiList<Stripe.Product>> {
    try {
      const products = await this.stripe.products.list({
        active,
        limit: 100,
      });
      return products;
    } catch (error) {
      logger.error('Failed to list products', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new StripeServiceError(
        'PRODUCTS_LIST_FAILED',
        `Failed to list products: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// =================================
// Error Class
// =================================

export class StripeServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'StripeServiceError';
  }
}

// =================================
// Singleton Instance
// =================================

let stripeServiceInstance: StripeService | null = null;

/**
 * Get the singleton Stripe service instance
 */
export function getStripeService(): StripeService {
  if (!stripeServiceInstance) {
    stripeServiceInstance = new StripeService();
  }
  return stripeServiceInstance;
}

/**
 * Create a new Stripe service instance (useful for testing)
 */
export function createStripeService(): StripeService {
  return new StripeService();
}

export default StripeService;
