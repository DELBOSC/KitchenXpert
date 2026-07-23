/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for KitchenXpert Frontend
 */

// Base URL from environment or default
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// API Endpoints organized by domain
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/password/change',
    FORGOT_PASSWORD: '/auth/password/forgot',
    RESET_PASSWORD: '/auth/password/reset',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
  },

  // Users
  USERS: {
    BASE: '/users',
    ME: '/users/me',
    PROFILE: '/users/me/profile',
    PROJECTS: '/users/me/projects',
    BY_ID: (id: string) => `/users/${id}`,
  },

  // Projects
  PROJECTS: {
    BASE: '/projects',
    BY_ID: (id: string) => `/projects/${id}`,
    KITCHENS: (id: string) => `/projects/${id}/kitchens`,
    COLLABORATORS: (id: string) => `/projects/${id}/collaborators`,
    DUPLICATE: (id: string) => `/projects/${id}/duplicate`,
    STATS: (id: string) => `/projects/${id}/stats`,
  },

  // Kitchens
  KITCHENS: {
    BASE: '/kitchens',
    BY_ID: (id: string) => `/kitchens/${id}`,
    COMPONENTS: (id: string) => `/kitchens/${id}/components`,
    MODEL: (id: string) => `/kitchens/${id}/model`,
    ITEMS: (id: string) => `/kitchens/${id}/items`,
    DUPLICATE: (id: string) => `/kitchens/${id}/duplicate`,
    ARCHIVE: (id: string) => `/kitchens/${id}/archive`,
    RESTORE: (id: string) => `/kitchens/${id}/restore`,
    SHARE: (id: string) => `/kitchens/${id}/share`,
    EXPORT: (id: string) => `/kitchens/${id}/export`,
  },

  // Catalog
  CATALOG: {
    BASE: '/catalog',
    STATS: '/catalog/stats',
    BY_ID: (id: string) => `/catalog/${id}`,
    PROVIDERS: '/catalog/providers/list',
    PROVIDER_BY_ID: (id: string) => `/catalog/providers/${id}`,
    PRODUCTS: '/catalog/products',
    PRODUCT_BY_ID: (id: string) => `/catalog/products/${id}`,
    CATEGORIES: '/catalog/categories',
    APPLIANCES: '/catalog/appliances',
    MATERIALS: '/catalog/materials',
  },

  // Products
  PRODUCTS: {
    BASE: '/products',
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories',
    BY_ID: (id: string) => `/products/${id}`,
    COMPATIBILITY: (id: string) => `/products/${id}/compatibility`,
  },

  // Orders
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    CANCEL: (id: string) => `/orders/${id}/cancel`,
    QUOTE: (id: string) => `/orders/${id}/quote`,
  },

  // AI Generator
  AI_GENERATOR: {
    PREFERENCES: (projectId: string) => `/ai-generator/preferences/${projectId}`,
    GENERATE: '/ai-generator/generate',
    RESULTS: (generationId: string) => `/ai-generator/results/${generationId}`,
    SAVE_DESIGN: '/ai-generator/save-design',
    VALIDATE: '/ai-generator/validate',
    OPTIMIZE: '/ai-generator/optimize',
  },

  // Kitchen Generator
  KITCHEN_GENERATOR: {
    GENERATE: '/kitchen-generator/generate',
    VALIDATE: '/kitchen-generator/validate',
    OPTIMIZE: '/kitchen-generator/optimize',
    COMPATIBILITY: '/kitchen-generator/compatibility',
  },

  // Admin
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    USER_BY_ID: (id: string) => `/admin/users/${id}`,
    USER_ACTION: (id: string, action: string) => `/admin/users/${id}/${action}`,
    SYSTEM_INFO: '/admin/system',
    SETTINGS: '/admin/settings',
  },

  // Roles & Permissions
  ROLES: {
    BASE: '/roles',
    BY_ID: (id: string) => `/roles/${id}`,
    PERMISSIONS: (id: string) => `/roles/${id}/permissions`,
  },
  PERMISSIONS: {
    BASE: '/permissions',
    BY_ID: (id: string) => `/permissions/${id}`,
    CATEGORIES: '/permissions/categories',
    SEED: '/permissions/seed',
  },

  // Audit
  AUDIT: {
    BASE: '/audit',
    BY_ID: (id: string) => `/audit/${id}`,
    EXPORT: '/audit/export',
    STATS: '/audit/stats',
  },

  // Monitoring
  MONITORING: {
    HEALTH: '/health',
    DETAILED: '/health/detailed',
    METRICS: '/monitoring/metrics',
    SYSTEM: '/monitoring/system',
  },

  // Webhooks
  WEBHOOKS: {
    BASE: '/webhooks',
    BY_ID: (id: string) => `/webhooks/${id}`,
    TEST: (id: string) => `/webhooks/${id}/test`,
    EVENTS: (id: string) => `/webhooks/${id}/events`,
  },

  // i18n
  I18N: {
    LOCALES: '/i18n/locales',
    DEFAULT_LOCALE: '/i18n/locales/default',
    LOCALE_BY_CODE: (code: string) => `/i18n/locales/code/${code}`,
    TRANSLATIONS: (code: string) => `/i18n/translations/${code}`,
  },

  // Partners
  PARTNERS: {
    BASE: '/partners',
    BY_ID: (id: string) => `/partners/${id}`,
    REGISTER: '/partners/register',
    CATALOG: (id: string) => `/partners/${id}/catalog`,
    ANALYTICS: (id: string) => `/partners/${id}/analytics`,
  },

  // Questionnaire
  QUESTIONNAIRE: {
    BASE: '/questionnaire',
    USER_PROFILE: '/questionnaire/user-profile',
    SPATIAL: '/questionnaire/spatial-constraints',
    STYLE: '/questionnaire/style-preferences',
    BUDGET: '/questionnaire/budget-planning',
    COMPLETE: '/questionnaire/complete',
    PROGRESS: '/questionnaire/progress',
    AI_TIPS: (section: string) => `/questionnaire/${section}/ai-tips`,
    AUTO_BRIDGE: '/questionnaire/auto-bridge',
    AUTO_GENERATE: '/questionnaire/auto-generate',
  },
  // Room Scanner
  ROOM_SCAN: {
    ANALYZE: '/room-scan/analyze',
    PHOTO_SCAN: '/room-scan/photo-scan',
  },

  // AI Chat (3D editor assistant)
  AI_CHAT: {
    STREAM: '/ai-chat/stream',
    MESSAGE: '/ai-chat/message',
    HISTORY: (sessionId: string) => `/ai-chat/history/${sessionId}`,
    EXECUTE_TOOL: '/ai-chat/execute-tool',
    TOOL_USE: '/ai-chat/tool-use',
    SESSIONS: '/ai-chat/sessions',
    SESSION_BY_ID: (id: string) => `/ai-chat/sessions/${id}`,
  },

  // AI Catalog Search
  AI_SEARCH: {
    CATALOG: '/ai-search/catalog',
  },

  // AI Project Assistant
  AI_PROJECT: {
    DESCRIBE: '/ai-project/describe',
    COMPARE: '/ai-project/compare-designs',
    RECOMMENDATIONS: (projectId: string) => `/ai-project/recommendations/${projectId}`,
  },

  // AI Recommendations
  AI_RECOMMENDATIONS: {
    COMPLEMENTARY: '/ai-recommendations/complementary',
  },

  // Design Ratings
  DESIGN_RATINGS: {
    BASE: '/design-ratings',
    BY_KITCHEN: (kitchenId: string) => `/design-ratings/${kitchenId}`,
    MY_RATING: (kitchenId: string) => `/design-ratings/${kitchenId}/my`,
  },

  // Bill of Materials
  BOM: {
    GENERATE: '/bom/generate',
  },

  // Shopping List
  SHOPPING_LIST: {
    BY_KITCHEN: (kitchenId: string) => `/shopping-list/${kitchenId}`,
  },

  // Comments
  COMMENTS: {
    BASE: '/comments',
    BY_ID: (id: string) => `/comments/${id}`,
  },

  // Design Versions
  DESIGN_VERSIONS: {
    BASE: (kitchenId: string) => `/design-versions/${kitchenId}`,
    VERSION: (kitchenId: string, version: number) => `/design-versions/${kitchenId}/${version}`,
    RESTORE: (kitchenId: string, version: number) =>
      `/design-versions/${kitchenId}/${version}/restore`,
  },

  // Enrichment (AI-powered catalog enrichment)
  ENRICHMENT: {
    ENRICH: '/enrichment/enrich',
    ENRICH_ALL: '/enrichment/enrich-all',
    STATUS: '/enrichment/status',
    PRODUCT: (type: string, id: string) => `/enrichment/product/${type}/${id}`,
    COMPATIBILITY_GENERATE: '/enrichment/compatibility/generate',
    COMPATIBILITY_BY_TYPE: (cabinetType: string) => `/enrichment/compatibility/${cabinetType}`,
    COMPATIBILITY_CHECK: '/enrichment/compatibility/check',
    MATCH_BRANDS: (brandA: string, brandB: string) => `/enrichment/match/${brandA}/${brandB}`,
    MATCHES: (productId: string) => `/enrichment/matches/${productId}`,
  },
  // Quotes (Quote-to-Partner)
  QUOTES: {
    SEND: '/quotes/send',
    BASE: '/quotes',
    BY_ID: (id: string) => `/quotes/${id}`,
    NEARBY_PARTNERS: '/quotes/partners/nearby',
  },

  // Digital Twin
  DIGITAL_TWIN: {
    CREATE: '/digital-twin',
    BY_KITCHEN: (kitchenId: string) => `/digital-twin/${kitchenId}`,
    SYNC: (kitchenId: string) => `/digital-twin/${kitchenId}/sync`,
    MAINTENANCE: (kitchenId: string) => `/digital-twin/${kitchenId}/maintenance`,
  },

  // Stock Checker
  STOCK: {
    CHECK: '/stock/check',
    BULK: '/stock/bulk',
  },

  // Carbon Calculator
  CARBON: {
    CALCULATE: '/carbon/calculate',
    REPORT: (kitchenId: string) => `/carbon/report/${kitchenId}`,
  },

  // Sustainability (Eco Score)
  SUSTAINABILITY: {
    ECO_SCORE: (kitchenId: string) => `/carbon/eco-score/${kitchenId}`,
  },

  // Style Transfer
  STYLE_TRANSFER: {
    ANALYZE: '/ai-chat/style-transfer',
  },

  // Abandonment Detection
  ABANDONMENT: {
    ANALYZE: '/abandonment/analyze',
    STATS: '/abandonment/stats',
  },
  // F1: Compliance / Building Codes
  COMPLIANCE: {
    CHECK: (kitchenId: string) => `/compliance/check/${kitchenId}`,
    RULES: '/compliance/rules',
    RULE_BY_CODE: (code: string) => `/compliance/rules/${code}`,
    HISTORY: (kitchenId: string) => `/compliance/history/${kitchenId}`,
  },

  // F6: Installer Marketplace
  INSTALLERS: {
    BASE: '/installers',
    SEARCH: '/installers/search',
    BY_ID: (id: string) => `/installers/${id}`,
    REVIEWS: (id: string) => `/installers/${id}/reviews`,
    REQUEST_INSTALL: '/installers/request',
    MY_PROJECTS: '/installers/my-projects',
    PROJECT_BY_ID: (id: string) => `/installers/projects/${id}`,
    PROJECT_MILESTONE: (id: string) => `/installers/projects/${id}/milestone`,
  },

  // F7: Renovation Before/After
  RENOVATION: {
    CREATE: '/renovation',
    BY_ID: (id: string) => `/renovation/${id}`,
    ANALYZE_PHOTO: '/renovation/analyze-photo',
    COMPARE: (id: string) => `/renovation/${id}/compare`,
    MY_PROJECTS: '/renovation/my-projects',
  },

  // F8: Financing
  FINANCING: {
    SIMULATE: '/financing/simulate',
    ECO_AIDS: '/financing/eco-aids',
    PROVIDERS: '/financing/providers',
    MY_SIMULATIONS: '/financing/my-simulations',
    BY_ID: (id: string) => `/financing/${id}`,
    AI_ADVICE: '/financing/ai-advice',
  },

  // F9: Price Tracker
  PRICE_TRACKER: {
    HISTORY: (productId: string) => `/price-tracker/history/${productId}`,
    ALERTS: '/price-tracker/alerts',
    ALERT_BY_ID: (id: string) => `/price-tracker/alerts/${id}`,
    CREATE_ALERT: '/price-tracker/alerts',
    TRENDS: '/price-tracker/trends',
    BEST_TIME: (productId: string) => `/price-tracker/best-time/${productId}`,
  },

  // F10: Collaboration Roles
  COLLABORATION_ROLES: {
    INVITE: '/collaboration-roles/invite',
    MY_INVITES: '/collaboration-roles/my-invites',
    ACCEPT: (token: string) => `/collaboration-roles/accept/${token}`,
    DECLINE: (token: string) => `/collaboration-roles/decline/${token}`,
    MEMBERS: (kitchenId: string) => `/collaboration-roles/members/${kitchenId}`,
    UPDATE_ROLE: (inviteId: string) => `/collaboration-roles/${inviteId}`,
    REMOVE: (inviteId: string) => `/collaboration-roles/${inviteId}`,
  },

  // F11: Smart Home
  SMART_HOME: {
    PLAN: (kitchenId: string) => `/smart-home/${kitchenId}`,
    CREATE: '/smart-home',
    UPDATE: (kitchenId: string) => `/smart-home/${kitchenId}`,
    DEVICES: '/smart-home/devices',
    COVERAGE: (kitchenId: string) => `/smart-home/${kitchenId}/coverage`,
  },

  // F13: Certified Quotes
  CERTIFIED_QUOTES: {
    CREATE: '/certified-quotes',
    BASE: '/certified-quotes',
    BY_ID: (id: string) => `/certified-quotes/${id}`,
    SIGN: (id: string) => `/certified-quotes/${id}/sign`,
    SEND: (id: string) => `/certified-quotes/${id}/send`,
    PDF: (id: string) => `/certified-quotes/${id}/pdf`,
    NEXT_NUMBER: '/certified-quotes/next-number',
  },

  // F5: Workflow Simulation
  WORKFLOW_SIMULATION: {
    SIMULATE: '/workflow-simulation/simulate',
    SCENARIOS: '/workflow-simulation/scenarios',
    OPTIMIZE: '/workflow-simulation/optimize',
    HISTORY: (kitchenId: string) => `/workflow-simulation/history/${kitchenId}`,
  },
} as const;

export default API_ENDPOINTS;
