import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';

import abandonmentRoutes from './abandonment-routes';
import adminRoutes from './admin-routes';
import aiAdminRoutes from './ai-admin-routes';
import aiChatRoutes from './ai-chat-routes';
import aiFeaturesRoutes from './ai-features-routes';
import aiGeneratorRoutes from './ai-generator-routes';
import aiProjectRoutes from './ai-project-routes';
import aiRecommendationRoutes from './ai-recommendation-routes';
import aiSearchRoutes from './ai-search-routes';
import auditRoutes from './audit-routes';
import authRoutes from './auth-routes';
import bomRoutes from './bom-routes';
import boschRoutes from './bosch-routes';
import carbonRoutes from './carbon-routes';
import castoramaRoutes from './castorama-routes';
import catalogRoutes from './catalog-routes';
import certifiedQuoteRoutes from './certified-quote-routes';
import collaborationRoleRoutes from './collaboration-role-routes';
import commentRoutes from './comment-routes';
import complianceRoutes from './compliance-routes';
import designRatingRoutes from './design-rating-routes';
import designVersionRoutes from './design-version-routes';
import digitalTwinRoutes from './digital-twin-routes';
import docsRoutes from './docs-routes';
import enrichmentRoutes from './enrichment-routes';
import exportRoutes from './export-routes';
import financingRoutes from './financing-routes';
import gdprRoutes from './gdpr-routes';
import i18nRoutes from './i18n-routes';
import ikeaRoutes from './ikea-routes';
import installerRoutes from './installer-routes';
import kitchenGeneratorRoutes from './kitchen-generator-routes';
import kitchenRoutes from './kitchen-routes';
import leroyMerlinRoutes from './leroy-merlin-routes';
import monitoringRoutes from './monitoring-routes';
import orderRoutes from './order-routes';
import partnerPortalRoutes from './partner-portal-routes';
import partnerRoutes from './partner-routes';
import paymentRoutes from './payment-routes';
import permissionRoutes from './permission-routes';
import priceTrackerRoutes from './price-tracker-routes';
import productRoutes from './product-routes';
import projectRoutes from './project-routes';
import providersRoutes from './providers-routes';
import questionnaireRoutes from './questionnaire-routes';
import quoteRoutes from './quote-routes';
import renovationRoutes from './renovation-routes';
import reviewRoutes from './review-routes';
import roleRoutes from './role-routes';
import roomScanRoutes from './room-scan-routes';
import schmidtRoutes from './schmidt-routes';
import shoppingListRoutes from './shopping-list-routes';
import smartHomeRoutes from './smart-home-routes';
import statsRoutes from './stats-routes';
import stockRoutes from './stock-routes';
import subscriptionRoutes from './subscription-routes';
import uploadRoutes from './upload-routes';
import userRoutes from './user-routes';
import webhookRoutes from './webhook-routes';
import workflowSimulationRoutes from './workflow-simulation-routes';
import {
  catalogRateLimiter,
  aiUnauthRateLimiter,
} from '../middleware/rate-limit-middleware';

const router: RouterType = Router();

// Strict rate limiter for auth routes (in addition to per-route limiters in auth-routes.ts)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window for auth
  // Skip under NODE_ENV=test so the E2E suite isn't throttled (mirrors the
  // skipFunction in rate-limit-middleware.ts). This is the second auth limiter
  // — it wraps the whole /auth mount, in addition to the per-route limiters.
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.use('/auth', authRateLimit, authRoutes);
router.use('/i18n', i18nRoutes);
router.use('/health', monitoringRoutes);
router.use('/stats', statsRoutes); // public counters for the marketing site

// Protected routes
router.use('/users', userRoutes);
router.use('/me/gdpr', gdprRoutes);
router.use('/me/reviews', reviewRoutes); // satisfaction modal + external review redirects
router.use('/docs', docsRoutes);
router.use('/providers', providersRoutes);
router.use('/kitchens', kitchenRoutes);
router.use('/projects', projectRoutes);
// Catalog browse surfaces — capped at 60 req/min/IP to deter scrapers
// and protect our partner-API quotas. Authenticated users still benefit
// from the higher per-user limit applied inside the route handlers.
router.use('/catalog',     catalogRateLimiter, catalogRoutes);
router.use('/products',    catalogRateLimiter, productRoutes);
router.use('/ikea',        catalogRateLimiter, ikeaRoutes);
router.use('/leroy-merlin',catalogRateLimiter, leroyMerlinRoutes);
router.use('/castorama',   catalogRateLimiter, castoramaRoutes);
router.use('/schmidt',     catalogRateLimiter, schmidtRoutes);
router.use('/bosch',       catalogRateLimiter, boschRoutes);

router.use('/partners', partnerRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/orders', orderRoutes);
router.use('/kitchen-generator', kitchenGeneratorRoutes);
router.use('/ai-generator', aiGeneratorRoutes);
router.use('/ai', aiFeaturesRoutes); // POST /auto-layout, /snapit, /style-transfer
router.use('/questionnaire', questionnaireRoutes);
router.use('/uploads', uploadRoutes);
router.use('/room-scan', roomScanRoutes);

// AI chat/search are expensive (Anthropic + Gemini). Apply the
// unauthenticated limiter first; authenticated requests skip it via the
// in-handler aiRateLimiter (20/hour/user).
router.use('/ai-chat',   aiUnauthRateLimiter, aiChatRoutes);
router.use('/ai-search', aiUnauthRateLimiter, aiSearchRoutes);
router.use('/payments', paymentRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/ai-project', aiProjectRoutes);
router.use('/ai-recommendations', aiRecommendationRoutes);
router.use('/design-versions', designVersionRoutes);
router.use('/design-ratings', designRatingRoutes);
router.use('/bom', bomRoutes);
router.use('/shopping-list', shoppingListRoutes);
router.use('/comments', commentRoutes);
router.use('/enrichment', enrichmentRoutes);
router.use('/quotes', quoteRoutes);
router.use('/stock', stockRoutes);
router.use('/carbon', carbonRoutes);
router.use('/digital-twin', digitalTwinRoutes);
router.use('/abandonment', abandonmentRoutes);

// New feature routes
router.use('/compliance', complianceRoutes);
router.use('/installers', installerRoutes);
router.use('/renovation', renovationRoutes);
router.use('/financing', financingRoutes);
router.use('/price-tracker', priceTrackerRoutes);
router.use('/collaboration-roles', collaborationRoleRoutes);
router.use('/smart-home', smartHomeRoutes);
router.use('/certified-quotes', certifiedQuoteRoutes);
router.use('/workflow-simulation', workflowSimulationRoutes);

// Partner portal routes (self-service for partners managing their own data)
router.use('/partner', partnerPortalRoutes);

// Admin routes
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/audit', auditRoutes);
router.use('/admin', adminRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/export', exportRoutes);
router.use('/ai-admin', aiAdminRoutes);

export default router;
