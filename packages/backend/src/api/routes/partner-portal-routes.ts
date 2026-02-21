import { Router, type Router as RouterType } from 'express';
import { authController } from '../controllers/auth-controller';
import { authenticate } from '../middleware/auth-middleware';
import { requirePartner } from '../middleware/require-partner';
import * as partnerPortalController from '../controllers/partner-portal-controller';

const router: RouterType = Router();

// ---------------------------------------------------------------------------
// Auth routes — proxy to the shared auth controller.
// No requirePartner check here: the partner is not logged in yet (login/refresh)
// or only needs to be authenticated (logout, change-password).
// ---------------------------------------------------------------------------

/** POST /partner/auth/login */
router.post('/auth/login', authController.login);

/** POST /partner/auth/refresh */
router.post('/auth/refresh', authController.refresh);

/** POST /partner/auth/logout — requires a valid access token */
router.post('/auth/logout', authenticate, authController.logout);

/** POST /partner/auth/change-password — requires a valid access token */
router.post('/auth/change-password', authenticate, authController.changePassword);

// ---------------------------------------------------------------------------
// All routes below require:
//   1. authenticate  — valid JWT access token (httpOnly cookie or Bearer header)
//   2. requirePartner — an active Partner record whose email matches req.user.email
// ---------------------------------------------------------------------------
router.use(authenticate, requirePartner);

// Profile
router.get('/profile', partnerPortalController.getProfile);
router.put('/profile', partnerPortalController.updateProfile);

// Dashboard
router.get('/dashboard/stats', partnerPortalController.getDashboardStats);

// Products
router.get('/products', partnerPortalController.listProducts);
router.post('/products', partnerPortalController.createProduct);
router.get('/products/:id', partnerPortalController.getProduct);
router.put('/products/:id', partnerPortalController.updateProduct);
router.delete('/products/:id', partnerPortalController.deleteProduct);

// Orders
router.get('/orders', partnerPortalController.listOrders);
router.get('/orders/:id', partnerPortalController.getOrder);
router.patch('/orders/:id/status', partnerPortalController.updateOrderStatus);

// Analytics
router.get('/analytics/sales', partnerPortalController.getSalesAnalytics);
router.get('/analytics/products/:id', partnerPortalController.getProductAnalytics);

export default router;
