/**
 * Types pour les partenaires (fabricants, distributeurs)
 */

import { BaseEntity, ID, Metadata } from './base.types';

export type PartnerType = 'manufacturer' | 'distributor' | 'retailer' | 'installer';
export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'inactive';
export type PartnerTier = 'basic' | 'standard' | 'premium' | 'enterprise';

export interface Partner extends BaseEntity {
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
}

export interface PartnerAddress {
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

export interface PartnerContact {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isPrimary: boolean;
}

export interface PartnerSettings {
  autoApproveProducts: boolean;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    webhook: boolean;
  };
  apiAccess: {
    enabled: boolean;
    rateLimit: number;
    allowedIps?: string[];
  };
  catalogSettings: {
    allowBulkUpload: boolean;
    requireImageApproval: boolean;
    defaultCurrency: string;
  };
}

export interface PartnerBilling {
  plan: PartnerTier;
  subscriptionId?: string;
  customerId?: string;
  billingEmail: string;
  billingAddress?: PartnerAddress;
  paymentMethod?: {
    type: 'card' | 'invoice' | 'bank_transfer';
    last4?: string;
    brand?: string;
  };
  nextBillingDate?: Date;
}

export interface PartnerInvitation extends BaseEntity {
  partnerId: ID;
  email: string;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  token: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  invitedBy: ID;
}

export interface PartnerUser extends BaseEntity {
  partnerId: ID;
  userId: ID;
  role: 'admin' | 'manager' | 'editor' | 'viewer';
  permissions: string[];
  isActive: boolean;
}

export interface PartnerStats {
  partnerId: ID;
  period: 'day' | 'week' | 'month' | 'year';
  productViews: number;
  productClicks: number;
  inquiries: number;
  conversions: number;
  revenue: number;
  currency: string;
  topProducts: Array<{
    productId: ID;
    name: string;
    views: number;
    clicks: number;
  }>;
}

export interface PartnerOnboarding {
  partnerId: ID;
  completedSteps: string[];
  currentStep: string;
  progress: number;
  startedAt: Date;
  completedAt?: Date | null;
}
