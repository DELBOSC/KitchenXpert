/**
 * Stripe Service Tests
 * Tests for payment intents, customers, subscriptions, webhooks, and refunds
 */

// Set env vars before importing
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing_purposes_only';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';

import { StripeService, StripeServiceError } from '../services/stripe-service';

// Mock Stripe SDK
const mockStripe = {
  paymentIntents: {
    create: jest.fn(),
    retrieve: jest.fn(),
    cancel: jest.fn(),
  },
  customers: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    del: jest.fn(),
  },
  subscriptions: {
    create: jest.fn(),
    retrieve: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    list: jest.fn(),
  },
  charges: {
    list: jest.fn(),
  },
  refunds: {
    create: jest.fn(),
    retrieve: jest.fn(),
  },
  prices: {
    list: jest.fn(),
  },
  products: {
    list: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StripeService();
  });

  // ==================== PAYMENT INTENTS ====================

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPI = { id: 'pi_test', status: 'requires_payment_method', amount: 5000 };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPI);

      const result = await service.createPaymentIntent({
        amount: 5000,
        currency: 'eur',
        description: 'Kitchen design plan',
      });

      expect(result).toEqual(mockPI);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
        })
      );
    });

    it('should include customer ID when provided', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({ id: 'pi_test' });

      await service.createPaymentIntent({
        amount: 5000,
        currency: 'eur',
        customerId: 'cus_123',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_123' })
      );
    });

    it('should throw StripeServiceError on failure', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Card declined'));

      await expect(
        service.createPaymentIntent({ amount: 5000, currency: 'eur' })
      ).rejects.toThrow(StripeServiceError);
    });
  });

  describe('getPaymentIntent', () => {
    it('should retrieve a payment intent', async () => {
      const mockPI = { id: 'pi_test', status: 'succeeded' };
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPI);

      const result = await service.getPaymentIntent('pi_test');

      expect(result).toEqual(mockPI);
    });
  });

  describe('cancelPaymentIntent', () => {
    it('should cancel a payment intent', async () => {
      mockStripe.paymentIntents.cancel.mockResolvedValue({ id: 'pi_test', status: 'canceled' });

      const result = await service.cancelPaymentIntent('pi_test');

      expect(result.status).toBe('canceled');
    });
  });

  // ==================== CUSTOMERS ====================

  describe('createCustomer', () => {
    it('should create a customer', async () => {
      const mockCustomer = { id: 'cus_test', email: 'test@test.com' };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer({
        email: 'test@test.com',
        name: 'Test User',
      });

      expect(result).toEqual(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@test.com', name: 'Test User' })
      );
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer', async () => {
      mockStripe.customers.del.mockResolvedValue({ id: 'cus_test', deleted: true });

      const result = await service.deleteCustomer('cus_test');

      expect(result.deleted).toBe(true);
    });
  });

  // ==================== SUBSCRIPTIONS ====================

  describe('createSubscription', () => {
    it('should create a subscription', async () => {
      const mockSub = { id: 'sub_test', status: 'active' };
      mockStripe.subscriptions.create.mockResolvedValue(mockSub);

      const result = await service.createSubscription({
        customerId: 'cus_test',
        priceId: 'price_test',
      });

      expect(result).toEqual(mockSub);
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test',
          items: [{ price: 'price_test' }],
        })
      );
    });

    it('should include trial period when specified', async () => {
      mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_test' });

      await service.createSubscription({
        customerId: 'cus_test',
        priceId: 'price_test',
        trialPeriodDays: 14,
      });

      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ trial_period_days: 14 })
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel immediately by default', async () => {
      mockStripe.subscriptions.cancel.mockResolvedValue({ id: 'sub_test', status: 'canceled' });

      await service.cancelSubscription('sub_test');

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test');
    });

    it('should cancel at period end when requested', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test',
        cancel_at_period_end: true,
      });

      await service.cancelSubscription('sub_test', true);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_test', {
        cancel_at_period_end: true,
      });
    });
  });

  // ==================== WEBHOOKS ====================

  describe('handleWebhook', () => {
    it('should verify and return webhook event', () => {
      const mockEvent = { id: 'evt_test', type: 'payment_intent.succeeded' };
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = service.handleWebhook('payload', 'sig_header');

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'sig_header',
        expect.any(String)
      );
    });

    it('should throw on invalid signature', () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => service.handleWebhook('bad', 'bad')).toThrow(StripeServiceError);
    });
  });

  describe('processWebhookEvent', () => {
    it('should process payment_intent.succeeded event', async () => {
      const event = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test',
            amount: 5000,
            currency: 'eur',
            customer: 'cus_test',
          },
        },
      } as any;

      // Should not throw
      await expect(service.processWebhookEvent(event)).resolves.not.toThrow();
    });

    it('should process payment_intent.payment_failed event', async () => {
      const event = {
        id: 'evt_test',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test',
            last_payment_error: { message: 'Card declined' },
          },
        },
      } as any;

      await expect(service.processWebhookEvent(event)).resolves.not.toThrow();
    });

    it('should process customer.subscription.created event', async () => {
      const event = {
        id: 'evt_test',
        type: 'customer.subscription.created',
        data: {
          object: { id: 'sub_test', customer: 'cus_test', status: 'active' },
        },
      } as any;

      await expect(service.processWebhookEvent(event)).resolves.not.toThrow();
    });

    it('should process invoice.payment_failed event', async () => {
      const event = {
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: {
          object: { id: 'in_test', customer: 'cus_test', attempt_count: 2 },
        },
      } as any;

      await expect(service.processWebhookEvent(event)).resolves.not.toThrow();
    });

    it('should process charge.refunded event', async () => {
      const event = {
        id: 'evt_test',
        type: 'charge.refunded',
        data: {
          object: { id: 'ch_test', amount_refunded: 5000, payment_intent: 'pi_test' },
        },
      } as any;

      await expect(service.processWebhookEvent(event)).resolves.not.toThrow();
    });

    it('should handle unrecognized event types gracefully', async () => {
      const event = {
        id: 'evt_test',
        type: 'unknown.event.type',
        data: { object: {} },
      } as any;

      await expect(service.processWebhookEvent(event)).resolves.not.toThrow();
    });
  });

  // ==================== REFUNDS ====================

  describe('refundPayment', () => {
    it('should process a full refund', async () => {
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test',
        amount: 5000,
        currency: 'eur',
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000),
      });

      const result = await service.refundPayment('pi_test');

      expect(result.id).toBe('re_test');
      expect(result.amount).toBe(5000);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
      });
    });

    it('should process a partial refund', async () => {
      mockStripe.refunds.create.mockResolvedValue({
        id: 're_test',
        amount: 2000,
        currency: 'eur',
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000),
      });

      const result = await service.refundPayment('pi_test', 2000);

      expect(result.amount).toBe(2000);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test',
        amount: 2000,
      });
    });
  });

  // ==================== PAYMENT HISTORY ====================

  describe('getPaymentHistory', () => {
    it('should return formatted payment history', async () => {
      mockStripe.charges.list.mockResolvedValue({
        data: [
          {
            id: 'ch_1',
            amount: 5000,
            currency: 'eur',
            status: 'succeeded',
            description: 'Kitchen plan',
            created: Math.floor(Date.now() / 1000),
            receipt_url: 'https://receipt.stripe.com/1',
            metadata: { orderId: 'order-1' },
          },
        ],
      });

      const result = await service.getPaymentHistory('cus_test');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ch_1');
      expect(result[0].amount).toBe(5000);
      expect(result[0].created).toBeInstanceOf(Date);
    });
  });

  // ==================== PRODUCTS & PRICES ====================

  describe('listPrices', () => {
    it('should list active prices', async () => {
      mockStripe.prices.list.mockResolvedValue({ data: [{ id: 'price_1' }] });

      const result = await service.listPrices();

      expect(mockStripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({ active: true, limit: 100 })
      );
    });

    it('should filter by product ID', async () => {
      mockStripe.prices.list.mockResolvedValue({ data: [] });

      await service.listPrices('prod_test');

      expect(mockStripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({ product: 'prod_test' })
      );
    });
  });
});
