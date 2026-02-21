/**
 * Partner Model Class
 * Provides methods for working with partner data
 */

import {
  Partner,
  PartnerType,
  PartnerStatus,
  PartnerTier,
  PartnerAddress,
  PartnerContact,
  PartnerSettings,
  PartnerBilling,
  ID,
  Metadata,
} from '../types';

// Re-export types that may be used externally
export type { PartnerInvitation, PartnerUser, PartnerStats, PartnerOnboarding } from '../types';

export interface PartnerCreateInput {
  name: string;
  slug: string;
  type: PartnerType;
  email: string;
  phone?: string | null;
  website?: string | null;
  logo?: string | null;
  description?: string | null;
  address: PartnerAddress;
}

export interface PartnerUpdateInput {
  name?: string;
  slug?: string;
  type?: PartnerType;
  status?: PartnerStatus;
  tier?: PartnerTier;
  email?: string;
  phone?: string | null;
  website?: string | null;
  logo?: string | null;
  description?: string | null;
  address?: PartnerAddress;
  settings?: Partial<PartnerSettings>;
}

export class PartnerModel implements Partner {
  id: ID;
  name: string;
  slug: string;
  type: PartnerType;
  status: PartnerStatus;
  tier: PartnerTier;
  email: string;
  phone?: string | null;
  website?: string | null;
  logo?: string | null;
  description?: string | null;
  address: PartnerAddress;
  contacts: PartnerContact[];
  settings: PartnerSettings;
  billing: PartnerBilling;
  metadata?: Metadata;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: Partner) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug;
    this.type = data.type;
    this.status = data.status;
    this.tier = data.tier;
    this.email = data.email;
    this.phone = data.phone;
    this.website = data.website;
    this.logo = data.logo;
    this.description = data.description;
    this.address = data.address;
    this.contacts = data.contacts || [];
    this.settings = data.settings;
    this.billing = data.billing;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if the partner is active
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if the partner is pending approval
   */
  isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Check if the partner is suspended
   */
  isSuspended(): boolean {
    return this.status === 'suspended';
  }

  /**
   * Check if the partner is a manufacturer
   */
  isManufacturer(): boolean {
    return this.type === 'manufacturer';
  }

  /**
   * Check if the partner is a distributor
   */
  isDistributor(): boolean {
    return this.type === 'distributor';
  }

  /**
   * Check if the partner is a retailer
   */
  isRetailer(): boolean {
    return this.type === 'retailer';
  }

  /**
   * Check if the partner is an installer
   */
  isInstaller(): boolean {
    return this.type === 'installer';
  }

  /**
   * Check if the partner has premium tier
   */
  isPremium(): boolean {
    return this.tier === 'premium' || this.tier === 'enterprise';
  }

  /**
   * Check if the partner has enterprise tier
   */
  isEnterprise(): boolean {
    return this.tier === 'enterprise';
  }

  /**
   * Check if the partner has API access enabled
   */
  hasApiAccess(): boolean {
    return this.settings.apiAccess.enabled;
  }

  /**
   * Get the primary contact
   */
  getPrimaryContact(): PartnerContact | null {
    return this.contacts.find((contact) => contact.isPrimary) || this.contacts[0] || null;
  }

  /**
   * Get the full address as a string
   */
  getFullAddress(): string {
    const parts = [
      this.address.street,
      this.address.city,
      this.address.state,
      this.address.postalCode,
      this.address.country,
    ].filter(Boolean);
    return parts.join(', ');
  }

  /**
   * Check if the partner can auto-approve products
   */
  canAutoApproveProducts(): boolean {
    return this.settings.autoApproveProducts;
  }

  /**
   * Check if the partner allows bulk upload
   */
  canBulkUpload(): boolean {
    return this.settings.catalogSettings.allowBulkUpload;
  }

  /**
   * Get the API rate limit
   */
  getApiRateLimit(): number {
    return this.settings.apiAccess.rateLimit;
  }

  /**
   * Check if email notifications are enabled
   */
  hasEmailNotifications(): boolean {
    return this.settings.notificationPreferences.email;
  }

  /**
   * Check if webhook notifications are enabled
   */
  hasWebhookNotifications(): boolean {
    return this.settings.notificationPreferences.webhook;
  }

  /**
   * Add a contact
   */
  addContact(contact: PartnerContact): void {
    this.contacts.push(contact);
  }

  /**
   * Remove a contact by ID
   */
  removeContact(contactId: ID): boolean {
    const index = this.contacts.findIndex((c) => c.id === contactId);
    if (index !== -1) {
      this.contacts.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Convert to plain object
   */
  toJSON(): Partner {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      type: this.type,
      status: this.status,
      tier: this.tier,
      email: this.email,
      phone: this.phone,
      website: this.website,
      logo: this.logo,
      description: this.description,
      address: this.address,
      contacts: this.contacts,
      settings: this.settings,
      billing: this.billing,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Create default settings for a new partner
   */
  static createDefaultSettings(): PartnerSettings {
    return {
      autoApproveProducts: false,
      notificationPreferences: {
        email: true,
        sms: false,
        webhook: false,
      },
      apiAccess: {
        enabled: false,
        rateLimit: 100,
      },
      catalogSettings: {
        allowBulkUpload: false,
        requireImageApproval: true,
        defaultCurrency: 'EUR',
      },
    };
  }

  /**
   * Create default billing for a new partner
   */
  static createDefaultBilling(tier: PartnerTier, email: string): PartnerBilling {
    return {
      plan: tier,
      billingEmail: email,
    };
  }

  /**
   * Create a new PartnerModel from input data
   */
  static create(input: PartnerCreateInput, id: ID): PartnerModel {
    const now = new Date();
    return new PartnerModel({
      id,
      name: input.name,
      slug: input.slug,
      type: input.type,
      status: 'pending',
      tier: 'basic',
      email: input.email,
      phone: input.phone,
      website: input.website,
      logo: input.logo,
      description: input.description,
      address: input.address,
      contacts: [],
      settings: PartnerModel.createDefaultSettings(),
      billing: PartnerModel.createDefaultBilling('basic', input.email),
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default PartnerModel;
