/**
 * Types pour les commandes et devis
 */

import { BaseEntity, ID, Metadata } from './base.types';
import { PartnerAddress } from './partner.types';

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';

export type PaymentMethod = 'card' | 'bank_transfer' | 'invoice' | 'financing';

export interface Order extends BaseEntity {
  orderNumber: string;
  userId: ID;
  projectId?: ID | null;
  partnerId?: ID | null;
  status: OrderStatus;
  items: OrderItem[];
  pricing: OrderPricing;
  payment: OrderPayment;
  shipping: OrderShipping;
  billing: OrderBilling;
  notes?: string | null;
  internalNotes?: string | null;
  timeline: OrderTimelineEvent[];
  metadata?: Metadata;
}

export interface OrderItem {
  id: ID;
  productId: ID;
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  discount?: OrderItemDiscount;
  specifications?: Record<string, unknown>;
  customizations?: OrderItemCustomization[];
  deliveryEstimate?: DeliveryEstimate;
}

export interface OrderItemDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  reason?: string;
}

export interface OrderItemCustomization {
  type: string;
  value: string;
  priceModifier?: number;
}

export interface DeliveryEstimate {
  minDays: number;
  maxDays: number;
  estimatedDate?: Date;
}

export interface OrderPricing {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  taxes: TaxLine[];
  discounts: DiscountLine[];
}

export interface TaxLine {
  name: string;
  rate: number;
  amount: number;
  taxable: number;
}

export interface DiscountLine {
  code?: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
}

export interface OrderPayment {
  status: PaymentStatus;
  method?: PaymentMethod;
  transactionId?: string;
  paidAt?: Date | null;
  paidAmount?: number;
  refundedAmount?: number;
  paymentDetails?: {
    last4?: string;
    brand?: string;
    bankName?: string;
    reference?: string;
  };
}

export interface OrderShipping {
  method: 'standard' | 'express' | 'installation' | 'pickup';
  address: ShippingAddress;
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: Date | null;
  actualDelivery?: Date | null;
  instructions?: string;
  cost: number;
  currency: string;
}

export interface ShippingAddress extends PartnerAddress {
  recipientName: string;
  phone?: string;
  email?: string;
  isResidential: boolean;
  accessCode?: string;
  deliveryInstructions?: string;
}

export interface OrderBilling {
  address: BillingAddress;
  companyName?: string;
  taxId?: string;
  invoiceNumber?: string;
  invoiceDate?: Date;
  invoiceUrl?: string;
}

export interface BillingAddress extends PartnerAddress {
  name: string;
  email: string;
  phone?: string;
}

export interface OrderTimelineEvent {
  id: ID;
  event: string;
  status: OrderStatus;
  description: string;
  userId?: ID;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Quote types
export interface Quote extends BaseEntity {
  quoteNumber: string;
  userId: ID;
  projectId: ID;
  partnerId?: ID;
  status: QuoteStatus;
  items: QuoteItem[];
  pricing: OrderPricing;
  validUntil: Date;
  notes?: string;
  terms?: string;
  sentAt?: Date | null;
  viewedAt?: Date | null;
  acceptedAt?: Date | null;
  rejectedAt?: Date | null;
  convertedOrderId?: ID | null;
}

export interface QuoteItem extends OrderItem {
  optional: boolean;
  alternatives?: AlternativeItem[];
}

export interface AlternativeItem {
  productId: ID;
  name: string;
  unitPrice: number;
  currency: string;
  priceDifference: number;
}

// Cart types
export interface Cart {
  id: ID;
  userId?: ID;
  sessionId?: string;
  items: CartItem[];
  pricing: CartPricing;
  appliedCoupons: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface CartItem {
  id: ID;
  productId: ID;
  variantId?: ID;
  quantity: number;
  unitPrice: number;
  customizations?: OrderItemCustomization[];
  addedAt: Date;
}

export interface CartPricing {
  subtotal: number;
  discountTotal: number;
  estimatedTax: number;
  estimatedShipping: number;
  total: number;
  currency: string;
}

// Order search and filters
export interface OrderSearchParams {
  userId?: ID;
  partnerId?: ID;
  status?: OrderStatus | OrderStatus[];
  paymentStatus?: PaymentStatus | PaymentStatus[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
  minTotal?: number;
  maxTotal?: number;
  search?: string;
  sortBy?: 'createdAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStats {
  period: 'day' | 'week' | 'month' | 'year';
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatus, number>;
  topProducts: Array<{
    productId: ID;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}
