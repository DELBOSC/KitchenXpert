/**
 * Services Index
 * Export all backend services
 */

// Authentication & Authorization
// Primary auth: auth/auth.service.ts — legacy services/auth-service.ts removed
export * from './permission-service';
export * from './role-service';

// User Management
export * from './user-service';

// Project & Kitchen
export * from './project-service';
export * from './kitchen-service';

// AI Configuration - export selectively to avoid conflicts
export {
  AIKitchenConfiguratorService,
  createAIKitchenConfiguratorService,
  AIConfiguratorError,
  type ConfigurationResult,
  type RoomSpecifications,
  type KitchenConfiguration,
  type ItemPlacement,
  type CostEstimate,
  type ScoreBreakdown,
  type Recommendation,
  type GenerationMetadata,
  type GenerationOptions,
  type AIConfiguratorRepository,
  // Use AI-prefixed types to avoid conflicts
  type UserPreferences as AIUserPreferences,
  type KitchenStyle as AIKitchenStyle,
  type LayoutType as AILayoutType,
  type KitchenZone as AIKitchenZone,
  type CountertopSection as AICountertopSection,
  type Cutout as AICutout,
  type EdgeProfile as AIEdgeProfile,
  type Point2D as AIPoint2D,
  type Point3D as AIPoint3D,
} from './ai-kitchen-configurator';

// Catalog & Products
export * from './catalog-service';

// Storage & Files
export * from './storage-service';

// Communication
export * from './mail.service';
export {
  welcomeEmail,
  verificationEmail,
  passwordResetEmail,
  orderConfirmationEmail,
  projectSharedEmail,
  quoteReadyEmail,
  plainTextTemplates,
  type OrderDetails,
  type OrderItem,
  type Address as MailTemplateAddress,
} from './mail-templates';
export * from './notification-service';
export {
  EmailService,
  type EmailTemplateName,
  type EmailOptions as EmailServiceOptions,
} from './email.service';

// Partners & Integrations
// Note: partner-service and webhook-service are exported for external consumers but controllers use repositories directly
export * from './partner-service';
export * from './webhook-service';
export { WebhookEventService, type WebhookPayload } from './webhook-event.service';

// Data Export
export { ExportService, type ExportFormat, type ExportEntity } from './export.service';

// IKEA API Integration
export {
  IkeaClient,
  createIkeaClient,
  // Types with IKEA prefix to avoid conflicts
  type IkeaConfig,
  type IkeaCountry,
  type IkeaLanguage,
  type IkeaAuthToken,
  type IkeaProduct,
  type ItemCode as IkeaItemCode,
  type ChildItem as IkeaChildItem,
  type SearchParams as IkeaSearchParams,
  type SearchResult as IkeaSearchResult,
  type SearchResponse as IkeaSearchResponse,
  type StockInfo as IkeaStockInfo,
  type StockResponse as IkeaStockResponse,
  type CartItem as IkeaCartItem,
  type Cart as IkeaCart,
  type DeliveryService as IkeaDeliveryService,
  type ApiResponse as IkeaApiResponse,
  type ApiError as IkeaApiError,
  // Utilities
  parseItemCodes,
  formatItemCode,
  isValidItemCode,
  getCurrencyForCountry,
  IKEA_ENDPOINTS,
} from './ikea';

// Analytics & Monitoring
// Note: analytics-service and monitoring-service are exported for external consumers but controllers use repositories directly
export * from './analytics-service';
export * from './audit-service';
export * from './monitoring-service';

// Kitchen Generator Service
export {
  KitchenGeneratorService,
  createKitchenGeneratorService,
  KitchenGeneratorError,
  // Room & Space Types — aliased because RoomDimensions is also exported
  // from kitchen-service via `export *` at the top of this file.
  type RoomDimensions as GeneratorRoomDimensions,
  type RoomShape as GeneratorRoomShape,
  type WallSegment,
  type WallSide as GeneratorWallSide,
  type Point2D as GeneratorPoint2D,
  type Point3D as GeneratorPoint3D,
  type WallObstacle,
  type ObstacleType,
  type UtilityConnection,
  type UtilityType,
  type RoomSpecification,
  // Preferences Types
  type GeneratorPreferences,
  type BudgetConstraint,
  type KitchenStylePreference,
  type LayoutType as GeneratorLayoutType,
  type PriorityArea,
  type RequiredAppliance,
  type ApplianceType as GeneratorApplianceType,
  type ColorScheme,
  type AccessibilityOptions,
  // Configuration Types
  type GeneratedKitchenConfiguration,
  type ConfigurationScores,
  type ItemPlacement as GeneratorItemPlacement,
  type PlacedProduct,
  type ProductCategoryType,
  type ProductDimensionInfo,
  type KitchenZone as GeneratorKitchenZone,
  type PlacementConnection,
  type WorkTriangleResult,
  type CostBreakdown,
  type ConfigurationStatistics,
  type ValidationResult,
  type ValidationIssue,
  type ConfigurationRecommendation,
  type RecommendedAction as GeneratorRecommendedAction,
  type GenerationMetadata as GeneratorMetadata,
  // Repository Types
  type KitchenGeneratorRepository,
  type ProductQueryFilters,
  type GeneratorProduct,
  type CatalogProviderInfo,
} from './kitchen-generator.service';

// Utilities
// Note: logger-service and i18n-service are exported for external consumers but controllers use repositories directly
export * from './logger-service';
export * from './i18n-service';

// Email Token Service
export {
  EmailTokenService,
  EmailTokenError,
  getEmailTokenService,
  createEmailTokenService,
  resetEmailTokenService,
  TOKEN_EXPIRATION,
  type TokenType,
  type TokenGenerationResult,
  type TokenVerificationResult,
} from './email-token.service';

// Redis-backed Services
export { TokenBlacklistService } from './token-blacklist.service';
export { CacheService } from './cache.service';

// Stock & Sustainability
export { StockCheckerService } from './catalog/stock-checker.service';
export { CarbonCalculatorService } from './sustainability/carbon-calculator.service';

// Digital Twin
export { DigitalTwinService } from './digital-twin/digital-twin.service';

// Collaboration
export { CRDTSyncService } from './collaboration/crdt-sync.service';

// Room Scanning
export { LiDARProcessorService } from './room-scan/lidar-processor.service';
export { PhotogrammetryService } from './room-scan/photogrammetry.service';

// Analytics
export { AbandonmentDetectorService } from './analytics/abandonment-detector.service';

// Financing
export {
  FinancingService,
  financingService,
  type FinancingProvider,
  type FinancingSimulationResult,
  type EcoAidsResult,
  type BudgetAdvice,
  type IncomeBracket,
  type EquipmentType,
} from './financing/financing.service';

// AI Services (re-export barrel)
export {
  AnthropicService,
  SYSTEM_PROMPTS,
  PROMPT_VERSIONS,
  KITCHEN_CHAT_TOOLS,
  DesignGeneratorService,
  QuestionnaireAdvisorService,
  AICatalogSearchService,
  ProjectAssistantService,
  ProductRecommendationService,
  AdminInsightsService,
  ProductEnrichmentService,
  CompatibilityGeneratorService,
  ProductMatcherService,
  CrossCategoryRecommenderService,
  StyleTransferService,
  PhotoRoomScannerService,
  RenovationService,
  WorkflowSimulationService,
} from './ai/index';
export type {
  KitchenToolName,
  CategoryRecommendations,
  PopularPairing,
  SelectedProduct,
  StyleExtraction,
  RoomScanResult,
  FloorPlanData,
  ExistingKitchenAnalysis,
  ComparisonData,
  CreateRenovationDto,
  SimulationResult,
  SimulationStep,
  Bottleneck,
  OptimizationResult,
  OptimizationSuggestion,
  ScenarioDefinition,
  // Position3D is also exported by SmartHomeService below; alias to avoid
  // an `import/export` collision warning. Inline `type` modifier is dropped
  // because the enclosing `export type {}` already marks the whole list.
  Position3D as AIPosition3D,
} from './ai/index';

// Compliance
export { ComplianceService } from './compliance/compliance.service';

// Installer
export { InstallerService } from './installer/installer.service';

// Price Tracker
export { PriceTrackerService } from './price-tracker/price-tracker.service';

// Certified Quote
export { CertifiedQuoteService } from './quote/certified-quote.service';

// Smart Home
export {
  SmartHomeService,
  type SmartDevice,
  type PlacedDevice,
  type AutomationRule,
  type Circuit,
  type CoverageMap,
  type SmartHomePlanData,
  type SmartHomePreferences,
  type UpdateSmartHomeDto,
  type Position3D as SmartHomePosition3D,
} from './smart-home/smart-home.service';
