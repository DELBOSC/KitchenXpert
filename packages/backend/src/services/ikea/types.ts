/**
 * IKEA API Types
 * TypeScript interfaces for IKEA API integration
 */

// ============================================
// Configuration Types
// ============================================

export interface IkeaConfig {
  country: string;
  language: string;
  baseUrl?: string;
  userAgent?: string;
}

export type IkeaCountry =
  | 'fr' | 'de' | 'gb' | 'us' | 'ca' | 'se' | 'nl' | 'be' | 'es' | 'it'
  | 'at' | 'ch' | 'pl' | 'ru' | 'au' | 'jp' | 'kr' | 'cn' | 'hk' | 'tw';

export type IkeaLanguage =
  | 'fr' | 'de' | 'en' | 'sv' | 'nl' | 'es' | 'it' | 'pl' | 'ru' | 'ja' | 'ko' | 'zh';

// ============================================
// Authentication Types
// ============================================

export interface IkeaAuthToken {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface IkeaAuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// ============================================
// Item Types
// ============================================

export type ItemType = 'ART' | 'SPR';

export interface ItemCode {
  code: string;
  type: ItemType;
}

export interface ChildItem {
  name?: string;
  itemCode: string;
  weight: number;
  quantity: number;
}

export interface IkeaProduct {
  itemCode: string;
  name: string;
  type: ItemType;
  description?: string;
  imageUrl?: string;
  price: number;
  currency: string;
  url: string;
  categoryName?: string;
  categoryUrl?: string;
  weight: number;
  dimensions?: ProductDimensions;
  childItems?: ChildItem[];
  isCombination: boolean;
}

export interface ProductDimensions {
  width?: number;
  height?: number;
  depth?: number;
  unit: 'cm' | 'mm' | 'in';
}

export interface PackageMeasurement {
  packageNumber: number;
  width: number;
  height: number;
  length: number;
  weight: number;
}

// ============================================
// Search Types
// ============================================

export type SearchType = 'PRODUCT' | 'CONTENT' | 'PLANNER' | 'REFINED_SEARCHES' | 'ANSWER';

export interface SearchParams {
  query: string;
  limit?: number;
  types?: SearchType[];
  autocorrect?: boolean;
}

export interface SearchResult {
  itemCode: string;
  name: string;
  type: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  url?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  dimensions?: ProductDimensions;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchId?: string;
  autocorrectedQuery?: string;
}

// ============================================
// Stock Types
// ============================================

export interface StockInfo {
  itemCode: string;
  storeId: string;
  storeName: string;
  availableStock: number;
  inStockProbability: 'HIGH' | 'MEDIUM' | 'LOW';
  restockDate?: string;
  salesLocation?: SalesLocation;
}

export interface SalesLocation {
  aisle?: string;
  bin?: string;
  section?: string;
}

export interface StockResponse {
  itemCode: string;
  availabilities: StockInfo[];
  lastUpdated: string;
}

// ============================================
// Cart Types
// ============================================

export interface CartItem {
  itemCode: string;
  quantity: number;
  name?: string;
  price?: number;
  imageUrl?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  coupon?: CouponInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CouponInfo {
  code: string;
  discount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  description?: string;
}

export interface AddToCartRequest {
  items: Array<{
    itemCode: string;
    quantity: number;
  }>;
}

// ============================================
// Delivery Types
// ============================================

export type DeliveryType =
  | 'HOME_DELIVERY'
  | 'PUP' // Pick-up point
  | 'PUOP' // Pick-up at store
  | 'CLICK_COLLECT_STORE';

export type ServiceType =
  | 'CURBSIDE'
  | 'STANDARD'
  | 'EXPRESS'
  | 'ROOM_OF_CHOICE'
  | 'THRESHOLD';

export interface DeliveryService {
  type: DeliveryType;
  serviceType?: ServiceType;
  isAvailable: boolean;
  price: number;
  currency: string;
  estimatedDate?: string;
  serviceProvider?: string;
  unavailableItems?: UnavailableItem[];
}

export interface UnavailableItem {
  itemCode: string;
  availableQuantity: number;
  reason?: string;
}

export interface CheckoutItem {
  itemNo: string;
  quantity: number;
  uom?: string; // Unit of measure
}

export interface ServiceAreaRequest {
  checkoutId: string;
  zipCode: string;
  stateCode?: string;
}

export interface DeliveryServicesResponse {
  deliveryOptions: DeliveryService[];
  cannotAdd: string[];
}

// ============================================
// Purchase History Types
// ============================================

export interface PurchaseHistoryItem {
  orderId: string;
  status: OrderStatus;
  totalPrice: number;
  currency: string;
  orderDate: string;
  orderDateFormatted: string;
  store: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export interface OrderDetails {
  orderId: string;
  status: OrderStatus;
  purchaseDate: string;
  deliveryDate?: string;
  deliveryCost: number;
  totalCost: number;
  currency: string;
  items: OrderItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
}

export interface OrderItem {
  itemCode: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface Address {
  name: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

// ============================================
// 3D Model Types
// ============================================

export interface Model3D {
  itemCode: string;
  modelUrl: string;
  format: '3ds' | 'obj' | 'glb' | 'gltf';
  thumbnailUrl?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Client IDs (required for IKEA API)
// ============================================

export const IKEA_CLIENT_IDS = {
  auth: 'e026b58d-dd69-425f-a67f-1e9a5087b87b',
  stock: 'b6c117e5-ae61-4ef5-b4cc-e0b1e37f0631',
  cart: '66e4684a-dbcb-499c-8639-a72fa50ac0c3',
  ingkaItems: 'c4faceb6-0598-44a2-bae4-2c02f4019d06',
  orderCapture: 'af2525c3-1779-49be-8d7d-adf32cac1934',
  orderCaptureAlt: '6a38e438-0bbb-4d4f-bc55-eb314c2e8e23',
} as const;

// IKEA API auth secret - should be set via environment variable
// This is a public client secret used for IKEA's guest API access
export const IKEA_AUTH_SECRET = process.env.IKEA_AUTH_SECRET || '';

// ============================================
// API Endpoints
// ============================================

export const IKEA_ENDPOINTS = {
  auth: 'https://api.ingka.ikea.com/guest/token',
  search: (country: string, language: string) =>
    `https://sik.search.blue.cdtapps.com/${country}/${language}/search-result-page`,
  stock: (country: string) =>
    `https://api.ingka.ikea.com/cia/availabilities/ru/${country}`,
  ingkaItems: (language: string) =>
    `https://api.ingka.ikea.com/salesitem/communications/ru/${language}`,
  cart: 'https://cart.oneweb.ingka.com/graphql',
  purchases: 'https://purchase-history.ocp.ingka.ikea.com/graphql',
  orderCapture: (host: string, country: string) =>
    `https://ordercapture.${host}/ordercaptureapi/${country}`,
  pipItem: (baseUrl: string, country: string, language: string) =>
    `${baseUrl}/${country}/${language}/products`,
  rotera: 'https://www.ikea.com/global/assets/rotera/resources',
} as const;
