/**
 * IKEA API Integration
 * Exports for IKEA API client and types
 */

export { IkeaClient, createIkeaClient } from './ikea-client';

export type {
  // Configuration
  IkeaConfig,
  IkeaCountry,
  IkeaLanguage,

  // Authentication
  IkeaAuthToken,
  IkeaAuthResponse,

  // Items
  ItemType,
  ItemCode,
  ChildItem,
  IkeaProduct,
  ProductDimensions,
  PackageMeasurement,

  // Search
  SearchType,
  SearchParams,
  SearchResult,
  SearchResponse,

  // Stock
  StockInfo,
  StockResponse,
  SalesLocation,

  // Cart
  CartItem,
  Cart,
  CouponInfo,
  AddToCartRequest,

  // Delivery
  DeliveryType,
  ServiceType,
  DeliveryService,
  UnavailableItem,
  CheckoutItem,
  ServiceAreaRequest,
  DeliveryServicesResponse,

  // Purchases
  PurchaseHistoryItem,
  OrderStatus,
  OrderDetails,
  OrderItem,
  Address,

  // 3D Models
  Model3D,

  // API Response
  ApiResponse,
  ApiError,
} from './types';

export { IKEA_CLIENT_IDS, IKEA_AUTH_SECRET, IKEA_ENDPOINTS } from './types';

export {
  parseItemCodes,
  formatItemCode,
  isValidItemCode,
  parseItemCodeWithType,
  getDefaultHeaders,
  buildUrl,
  parsePrice,
  extractImageUrl,
  buildProductUrl,
  delay,
  withRetry,
  chunk,
  safeJsonParse,
  getIkeaHost,
  getCurrencyForCountry,
} from './utils';
