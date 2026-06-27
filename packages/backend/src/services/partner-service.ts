/**
 * Partner Service
 * Handles partner/vendor management, integrations, and B2B functionality
 */

import crypto from 'crypto';

import logger from '../utils/logger';

export interface Partner {
  id: string;
  name: string;
  slug: string;
  type: PartnerType;
  status: PartnerStatus;
  company: CompanyInfo;
  contact: ContactInfo;
  branding?: BrandingConfig;
  integration?: IntegrationConfig;
  subscription: PartnerSubscription;
  performance?: PartnerPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export type PartnerType =
  | 'manufacturer'
  | 'retailer'
  | 'installer'
  | 'designer'
  | 'distributor'
  | 'service_provider';

export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export interface CompanyInfo {
  legalName: string;
  registrationNumber?: string;
  vatNumber?: string;
  address: Address;
  website?: string;
  foundedYear?: number;
  employeeCount?: string;
  description?: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ContactInfo {
  primaryEmail: string;
  primaryPhone: string;
  contacts: Contact[];
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

export interface BrandingConfig {
  logo: string;
  logoWhite?: string;
  primaryColor: string;
  secondaryColor?: string;
  customDomain?: string;
}

export interface IntegrationConfig {
  apiKey: string;
  webhookUrl?: string;
  webhookSecret?: string;
  syncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  features: IntegrationFeature[];
}

export type IntegrationFeature =
  | 'catalog_sync'
  | 'order_sync'
  | 'inventory_sync'
  | 'pricing_sync'
  | 'analytics'
  | 'white_label';

export interface PartnerSubscription {
  plan: SubscriptionPlan;
  status: 'active' | 'past_due' | 'cancelled' | 'trial';
  startDate: Date;
  endDate?: Date;
  trialEndsAt?: Date;
  features: string[];
  limits: SubscriptionLimits;
}

export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise' | 'custom';

export interface SubscriptionLimits {
  productsLimit: number;
  usersLimit: number;
  apiCallsPerMonth: number;
  storageGb: number;
}

export interface PartnerPerformance {
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  responseTime: number; // hours
  completionRate: number; // percentage
  lastOrderAt?: Date;
}

export interface PartnerProduct {
  id: string;
  partnerId: string;
  externalId: string;
  catalogItemId?: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  availability: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';
  leadTime?: number;
  lastSyncAt: Date;
}

export interface PartnerOrder {
  id: string;
  partnerId: string;
  projectId: string;
  orderNumber: string;
  status: OrderStatus;
  items: PartnerOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: Address;
  estimatedDelivery?: Date;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface PartnerOrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  customizations?: Record<string, string>;
}

export interface PartnerSearchParams {
  type?: PartnerType;
  status?: PartnerStatus;
  query?: string;
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  features?: IntegrationFeature[];
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'rating' | 'orders' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedPartners {
  partners: Partner[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PartnerRepository {
  findById(id: string): Promise<Partner | null>;
  findBySlug(slug: string): Promise<Partner | null>;
  findByApiKey(apiKey: string): Promise<Partner | null>;
  search(params: PartnerSearchParams): Promise<PaginatedPartners>;
  create(data: Omit<Partner, 'id' | 'createdAt' | 'updatedAt'>): Promise<Partner>;
  update(id: string, data: Partial<Partner>): Promise<Partner | null>;
  delete(id: string): Promise<boolean>;
  getProducts(partnerId: string): Promise<PartnerProduct[]>;
  syncProduct(partnerId: string, product: Omit<PartnerProduct, 'id'>): Promise<PartnerProduct>;
  getOrders(partnerId: string, status?: OrderStatus): Promise<PartnerOrder[]>;
  createOrder(order: Omit<PartnerOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<PartnerOrder>;
  updateOrder(id: string, data: Partial<PartnerOrder>): Promise<PartnerOrder | null>;
}

export class PartnerService {
  constructor(private repository: PartnerRepository) {}

  /**
   * Register a new partner
   */
  async registerPartner(
    data: Omit<Partner, 'id' | 'status' | 'subscription' | 'createdAt' | 'updatedAt'>
  ): Promise<Partner> {
    // Generate slug from name
    const slug = this.generateSlug(data.name);

    // Check if slug already exists
    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw new PartnerServiceError('SLUG_EXISTS', 'A partner with this name already exists');
    }

    // Generate API key for integration
    const apiKey = this.generateApiKey();

    const partner = await this.repository.create({
      ...data,
      slug,
      status: 'pending',
      integration: data.integration
        ? { ...data.integration, apiKey }
        : {
            apiKey,
            syncEnabled: false,
            syncFrequency: 'daily',
            features: [],
          },
      subscription: {
        plan: 'starter',
        status: 'trial',
        startDate: new Date(),
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        features: this.getPlanFeatures('starter'),
        limits: this.getPlanLimits('starter'),
      },
    });

    return partner;
  }

  /**
   * Get partner by ID
   */
  async getPartnerById(id: string): Promise<Partner | null> {
    return this.repository.findById(id);
  }

  /**
   * Get partner by slug
   */
  async getPartnerBySlug(slug: string): Promise<Partner | null> {
    return this.repository.findBySlug(slug);
  }

  /**
   * Authenticate partner by API key
   */
  async authenticateByApiKey(apiKey: string): Promise<Partner | null> {
    const partner = await this.repository.findByApiKey(apiKey);

    if (!partner) {
      return null;
    }

    if (partner.status !== 'active') {
      throw new PartnerServiceError('PARTNER_INACTIVE', 'Partner account is not active');
    }

    return partner;
  }

  /**
   * Search partners
   */
  async searchPartners(params: PartnerSearchParams): Promise<PaginatedPartners> {
    return this.repository.search({
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
      ...params,
    });
  }

  /**
   * Update partner
   */
  async updatePartner(id: string, data: Partial<Partner>): Promise<Partner | null> {
    const partner = await this.repository.findById(id);
    if (!partner) {
      return null;
    }

    // Don't allow changing certain fields directly
    const {
      id: _id,
      slug: _slug,
      integration: _integration,
      subscription: _subscription,
      ...updateData
    } = data;

    return this.repository.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });
  }

  /**
   * Change partner status
   */
  async changeStatus(id: string, status: PartnerStatus): Promise<Partner | null> {
    const partner = await this.repository.findById(id);
    if (!partner) {
      return null;
    }

    return this.repository.update(id, {
      status,
      updatedAt: new Date(),
    });
  }

  /**
   * Upgrade/downgrade subscription
   */
  async updateSubscription(id: string, plan: SubscriptionPlan): Promise<Partner | null> {
    const partner = await this.repository.findById(id);
    if (!partner) {
      return null;
    }

    return this.repository.update(id, {
      subscription: {
        ...partner.subscription,
        plan,
        features: this.getPlanFeatures(plan),
        limits: this.getPlanLimits(plan),
        status: 'active',
        trialEndsAt: undefined,
      },
      updatedAt: new Date(),
    });
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(id: string): Promise<string> {
    const partner = await this.repository.findById(id);
    if (!partner) {
      throw new PartnerServiceError('PARTNER_NOT_FOUND', 'Partner not found');
    }

    const newApiKey = this.generateApiKey();

    await this.repository.update(id, {
      integration: {
        ...partner.integration!,
        apiKey: newApiKey,
      },
      updatedAt: new Date(),
    });

    return newApiKey;
  }

  /**
   * Configure webhook
   */
  async configureWebhook(
    id: string,
    webhookUrl: string
  ): Promise<{ webhookUrl: string; webhookSecret: string }> {
    const partner = await this.repository.findById(id);
    if (!partner) {
      throw new PartnerServiceError('PARTNER_NOT_FOUND', 'Partner not found');
    }

    const webhookSecret = this.generateWebhookSecret();

    await this.repository.update(id, {
      integration: {
        ...partner.integration!,
        webhookUrl,
        webhookSecret,
      },
      updatedAt: new Date(),
    });

    return { webhookUrl, webhookSecret };
  }

  /**
   * Sync product from partner
   */
  async syncProduct(
    partnerId: string,
    product: Omit<PartnerProduct, 'id' | 'partnerId' | 'lastSyncAt'>
  ): Promise<PartnerProduct> {
    const partner = await this.repository.findById(partnerId);
    if (!partner) {
      throw new PartnerServiceError('PARTNER_NOT_FOUND', 'Partner not found');
    }

    if (!partner.integration?.syncEnabled) {
      throw new PartnerServiceError(
        'SYNC_DISABLED',
        'Product sync is not enabled for this partner'
      );
    }

    return this.repository.syncProduct(partnerId, {
      ...product,
      partnerId,
      lastSyncAt: new Date(),
    });
  }

  /**
   * Get partner products
   */
  async getPartnerProducts(partnerId: string): Promise<PartnerProduct[]> {
    return this.repository.getProducts(partnerId);
  }

  /**
   * Create order for partner
   */
  async createOrder(
    partnerId: string,
    orderData: Omit<
      PartnerOrder,
      'id' | 'partnerId' | 'orderNumber' | 'status' | 'createdAt' | 'updatedAt'
    >
  ): Promise<PartnerOrder> {
    const partner = await this.repository.findById(partnerId);
    if (!partner) {
      throw new PartnerServiceError('PARTNER_NOT_FOUND', 'Partner not found');
    }

    if (partner.status !== 'active') {
      throw new PartnerServiceError('PARTNER_INACTIVE', 'Cannot create order for inactive partner');
    }

    const orderNumber = this.generateOrderNumber(partnerId);

    const order = await this.repository.createOrder({
      ...orderData,
      partnerId,
      orderNumber,
      status: 'pending',
    });

    // Notify partner via webhook if configured
    if (partner.integration?.webhookUrl) {
      await this.sendWebhook(partner, 'order.created', order);
    }

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    data?: { trackingNumber?: string; notes?: string }
  ): Promise<PartnerOrder | null> {
    const order = await this.repository.updateOrder(orderId, {
      status,
      ...data,
      updatedAt: new Date(),
    });

    if (order) {
      const partner = await this.repository.findById(order.partnerId);
      if (partner?.integration?.webhookUrl) {
        await this.sendWebhook(partner, 'order.updated', order);
      }
    }

    return order;
  }

  /**
   * Get partner orders
   */
  async getPartnerOrders(partnerId: string, status?: OrderStatus): Promise<PartnerOrder[]> {
    return this.repository.getOrders(partnerId, status);
  }

  /**
   * Calculate partner performance metrics
   */
  async calculatePerformance(partnerId: string): Promise<PartnerPerformance> {
    const orders = await this.repository.getOrders(partnerId);

    if (orders.length === 0) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        responseTime: 0,
        completionRate: 0,
      };
    }

    const completedOrders = orders.filter((o) => o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const completionRate = (completedOrders.length / orders.length) * 100;

    // Find most recent order
    const sortedOrders = orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      totalOrders: orders.length,
      totalRevenue,
      averageRating: 0, // Would come from reviews
      responseTime: 24, // Would be calculated from actual response times
      completionRate,
      lastOrderAt: sortedOrders[0]?.createdAt,
    };
  }

  /**
   * Find nearest partners by location
   */
  async findNearestPartners(
    lat: number,
    lng: number,
    radiusKm: number,
    type?: PartnerType
  ): Promise<Partner[]> {
    const result = await this.repository.search({
      type,
      status: 'active',
      location: { lat, lng, radiusKm },
      sortBy: 'rating',
      sortOrder: 'desc',
    });

    return result.partners;
  }

  // Private helper methods

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateApiKey(): string {
    return `kx_${crypto.randomBytes(24).toString('base64url')}`;
  }

  private generateWebhookSecret(): string {
    return `whsec_${crypto.randomBytes(18).toString('base64url')}`;
  }

  private generateOrderNumber(partnerId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const partnerPrefix = partnerId.slice(0, 4).toUpperCase();
    return `${partnerPrefix}-${timestamp}-${random}`;
  }

  private getPlanFeatures(plan: SubscriptionPlan): string[] {
    const features: Record<SubscriptionPlan, string[]> = {
      starter: ['catalog_sync', 'basic_analytics'],
      professional: [
        'catalog_sync',
        'order_sync',
        'inventory_sync',
        'analytics',
        'priority_support',
      ],
      enterprise: [
        'catalog_sync',
        'order_sync',
        'inventory_sync',
        'pricing_sync',
        'analytics',
        'white_label',
        'dedicated_support',
        'custom_integration',
      ],
      custom: ['all_features'],
    };
    return features[plan];
  }

  private getPlanLimits(plan: SubscriptionPlan): SubscriptionLimits {
    const limits: Record<SubscriptionPlan, SubscriptionLimits> = {
      starter: {
        productsLimit: 100,
        usersLimit: 2,
        apiCallsPerMonth: 10000,
        storageGb: 1,
      },
      professional: {
        productsLimit: 1000,
        usersLimit: 10,
        apiCallsPerMonth: 100000,
        storageGb: 10,
      },
      enterprise: {
        productsLimit: -1, // unlimited
        usersLimit: -1,
        apiCallsPerMonth: -1,
        storageGb: 100,
      },
      custom: {
        productsLimit: -1,
        usersLimit: -1,
        apiCallsPerMonth: -1,
        storageGb: -1,
      },
    };
    return limits[plan];
  }

  private async sendWebhook(partner: Partner, event: string, payload: unknown): Promise<void> {
    if (!partner.integration?.webhookUrl) {
      return;
    }

    // In real implementation, would send HTTP request with signature
    logger.info(`[Webhook] Sending ${event} to ${partner.integration.webhookUrl}`, { payload });
  }
}

export class PartnerServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'PartnerServiceError';
  }
}

export function createPartnerService(repository: PartnerRepository): PartnerService {
  return new PartnerService(repository);
}

export default PartnerService;
