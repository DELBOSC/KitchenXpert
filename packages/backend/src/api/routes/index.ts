import { Router, type Router as RouterType } from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './auth-routes';
import userRoutes from './user-routes';
import kitchenRoutes from './kitchen-routes';
import projectRoutes from './project-routes';
import catalogRoutes from './catalog-routes';
import productRoutes from './product-routes';
import partnerRoutes from './partner-routes';
import webhookRoutes from './webhook-routes';
import roleRoutes from './role-routes';
import permissionRoutes from './permission-routes';
import auditRoutes from './audit-routes';
import adminRoutes from './admin-routes';
import i18nRoutes from './i18n-routes';
import monitoringRoutes from './monitoring-routes';
import orderRoutes from './order-routes';
import ikeaRoutes from './ikea-routes';
import kitchenGeneratorRoutes from './kitchen-generator-routes';
import aiGeneratorRoutes from './ai-generator-routes';
import questionnaireRoutes from './questionnaire-routes';
import uploadRoutes from './upload-routes';
import paymentRoutes from './payment-routes';
import subscriptionRoutes from './subscription-routes';
import leroyMerlinRoutes from './leroy-merlin-routes';
import castoramaRoutes from './castorama-routes';
import schmidtRoutes from './schmidt-routes';
import boschRoutes from './bosch-routes';
import roomScanRoutes from './room-scan-routes';
import aiChatRoutes from './ai-chat-routes';
import aiSearchRoutes from './ai-search-routes';
import exportRoutes from './export-routes';
import aiProjectRoutes from './ai-project-routes';
import aiRecommendationRoutes from './ai-recommendation-routes';
import aiAdminRoutes from './ai-admin-routes';
import designVersionRoutes from './design-version-routes';
import designRatingRoutes from './design-rating-routes';
import bomRoutes from './bom-routes';
import shoppingListRoutes from './shopping-list-routes';
import commentRoutes from './comment-routes';
import enrichmentRoutes from './enrichment-routes';
import quoteRoutes from './quote-routes';
import stockRoutes from './stock-routes';
import carbonRoutes from './carbon-routes';
import digitalTwinRoutes from './digital-twin-routes';
import abandonmentRoutes from './abandonment-routes';
import complianceRoutes from './compliance-routes';
import installerRoutes from './installer-routes';
import renovationRoutes from './renovation-routes';
import financingRoutes from './financing-routes';
import priceTrackerRoutes from './price-tracker-routes';
import collaborationRoleRoutes from './collaboration-role-routes';
import smartHomeRoutes from './smart-home-routes';
import certifiedQuoteRoutes from './certified-quote-routes';
import workflowSimulationRoutes from './workflow-simulation-routes';
import partnerPortalRoutes from './partner-portal-routes';
import gdprRoutes from './gdpr-routes';
import docsRoutes from './docs-routes';
import providersRoutes from './providers-routes';

const router: RouterType = Router();

// Strict rate limiter for auth routes (in addition to per-route limiters in auth-routes.ts)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window for auth
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.use('/auth', authRateLimit, authRoutes);
router.use('/i18n', i18nRoutes);
router.use('/health', monitoringRoutes);

// Protected routes
router.use('/users', userRoutes);
router.use('/me/gdpr', gdprRoutes);
router.use('/docs', docsRoutes);
router.use('/providers', providersRoutes);
router.use('/kitchens', kitchenRoutes);
router.use('/projects', projectRoutes);
router.use('/catalog', catalogRoutes);
router.use('/products', productRoutes);
router.use('/partners', partnerRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/orders', orderRoutes);
router.use('/kitchen-generator', kitchenGeneratorRoutes);
router.use('/ai-generator', aiGeneratorRoutes);
router.use('/questionnaire', questionnaireRoutes);
router.use('/ikea', ikeaRoutes);
router.use('/leroy-merlin', leroyMerlinRoutes);
router.use('/castorama', castoramaRoutes);
router.use('/schmidt', schmidtRoutes);
router.use('/bosch', boschRoutes);
router.use('/uploads', uploadRoutes);
router.use('/room-scan', roomScanRoutes);
router.use('/ai-chat', aiChatRoutes);
router.use('/ai-search', aiSearchRoutes);
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
