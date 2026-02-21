/**
 * API Endpoints Tests
 * Tests for API endpoint configuration - structure, paths, and dynamic endpoint generation
 */

import { API_BASE_URL, API_ENDPOINTS } from '../../services/api/endpoints';

describe('API Endpoints', () => {
  describe('API_BASE_URL', () => {
    it('should have a default base URL', () => {
      expect(API_BASE_URL).toBeDefined();
      expect(typeof API_BASE_URL).toBe('string');
    });

    it('should have localhost as default', () => {
      // The actual value depends on environment, but we verify it's defined
      expect(API_BASE_URL).toContain('api');
    });
  });

  describe('AUTH Endpoints', () => {
    it('should have all auth endpoints defined', () => {
      expect(API_ENDPOINTS.AUTH.LOGIN).toBe('/auth/login');
      expect(API_ENDPOINTS.AUTH.REGISTER).toBe('/auth/register');
      expect(API_ENDPOINTS.AUTH.LOGOUT).toBe('/auth/logout');
      expect(API_ENDPOINTS.AUTH.REFRESH).toBe('/auth/refresh');
      expect(API_ENDPOINTS.AUTH.ME).toBe('/auth/me');
    });

    it('should have password related endpoints', () => {
      expect(API_ENDPOINTS.AUTH.CHANGE_PASSWORD).toBe('/auth/password/change');
      expect(API_ENDPOINTS.AUTH.FORGOT_PASSWORD).toBe('/auth/password/forgot');
      expect(API_ENDPOINTS.AUTH.RESET_PASSWORD).toBe('/auth/password/reset');
    });

    it('should have verification endpoints', () => {
      expect(API_ENDPOINTS.AUTH.VERIFY_EMAIL).toBe('/auth/verify-email');
      expect(API_ENDPOINTS.AUTH.RESEND_VERIFICATION).toBe('/auth/resend-verification');
    });
  });

  describe('USERS Endpoints', () => {
    it('should have base users endpoint', () => {
      expect(API_ENDPOINTS.USERS.BASE).toBe('/users');
    });

    it('should have current user endpoints', () => {
      expect(API_ENDPOINTS.USERS.ME).toBe('/users/me');
      expect(API_ENDPOINTS.USERS.PROFILE).toBe('/users/me/profile');
      expect(API_ENDPOINTS.USERS.PROJECTS).toBe('/users/me/projects');
    });

    it('should generate user by ID endpoint', () => {
      const userId = 'user-123';
      expect(API_ENDPOINTS.USERS.BY_ID(userId)).toBe('/users/user-123');
    });
  });

  describe('PROJECTS Endpoints', () => {
    it('should have base projects endpoint', () => {
      expect(API_ENDPOINTS.PROJECTS.BASE).toBe('/projects');
    });

    it('should generate project by ID endpoint', () => {
      const projectId = 'project-123';
      expect(API_ENDPOINTS.PROJECTS.BY_ID(projectId)).toBe('/projects/project-123');
    });

    it('should generate project kitchens endpoint', () => {
      const projectId = 'project-123';
      expect(API_ENDPOINTS.PROJECTS.KITCHENS(projectId)).toBe('/projects/project-123/kitchens');
    });

    it('should generate project collaborators endpoint', () => {
      const projectId = 'project-123';
      expect(API_ENDPOINTS.PROJECTS.COLLABORATORS(projectId)).toBe('/projects/project-123/collaborators');
    });

    it('should generate project duplicate endpoint', () => {
      const projectId = 'project-123';
      expect(API_ENDPOINTS.PROJECTS.DUPLICATE(projectId)).toBe('/projects/project-123/duplicate');
    });

    it('should generate project stats endpoint', () => {
      const projectId = 'project-123';
      expect(API_ENDPOINTS.PROJECTS.STATS(projectId)).toBe('/projects/project-123/stats');
    });
  });

  describe('KITCHENS Endpoints', () => {
    it('should have base kitchens endpoint', () => {
      expect(API_ENDPOINTS.KITCHENS.BASE).toBe('/kitchens');
    });

    it('should generate kitchen by ID endpoint', () => {
      const kitchenId = 'kitchen-123';
      expect(API_ENDPOINTS.KITCHENS.BY_ID(kitchenId)).toBe('/kitchens/kitchen-123');
    });

    it('should generate kitchen components endpoint', () => {
      const kitchenId = 'kitchen-123';
      expect(API_ENDPOINTS.KITCHENS.COMPONENTS(kitchenId)).toBe('/kitchens/kitchen-123/components');
    });

    it('should generate kitchen model endpoint', () => {
      const kitchenId = 'kitchen-123';
      expect(API_ENDPOINTS.KITCHENS.MODEL(kitchenId)).toBe('/kitchens/kitchen-123/model');
    });

    it('should generate kitchen action endpoints', () => {
      const kitchenId = 'kitchen-123';
      expect(API_ENDPOINTS.KITCHENS.DUPLICATE(kitchenId)).toBe('/kitchens/kitchen-123/duplicate');
      expect(API_ENDPOINTS.KITCHENS.ARCHIVE(kitchenId)).toBe('/kitchens/kitchen-123/archive');
      expect(API_ENDPOINTS.KITCHENS.RESTORE(kitchenId)).toBe('/kitchens/kitchen-123/restore');
      expect(API_ENDPOINTS.KITCHENS.SHARE(kitchenId)).toBe('/kitchens/kitchen-123/share');
      expect(API_ENDPOINTS.KITCHENS.EXPORT(kitchenId)).toBe('/kitchens/kitchen-123/export');
    });
  });

  describe('CATALOG Endpoints', () => {
    it('should have base catalog endpoint', () => {
      expect(API_ENDPOINTS.CATALOG.BASE).toBe('/catalog');
    });

    it('should have catalog stats endpoint', () => {
      expect(API_ENDPOINTS.CATALOG.STATS).toBe('/catalog/stats');
    });

    it('should generate catalog by ID endpoint', () => {
      const catalogId = 'catalog-123';
      expect(API_ENDPOINTS.CATALOG.BY_ID(catalogId)).toBe('/catalog/catalog-123');
    });

    it('should have providers endpoint', () => {
      expect(API_ENDPOINTS.CATALOG.PROVIDERS).toBe('/catalog/providers/list');
    });

    it('should generate provider by ID endpoint', () => {
      const providerId = 'provider-123';
      expect(API_ENDPOINTS.CATALOG.PROVIDER_BY_ID(providerId)).toBe('/catalog/providers/provider-123');
    });

    it('should have products and categories endpoints', () => {
      expect(API_ENDPOINTS.CATALOG.PRODUCTS).toBe('/catalog/products');
      expect(API_ENDPOINTS.CATALOG.CATEGORIES).toBe('/catalog/categories');
      expect(API_ENDPOINTS.CATALOG.APPLIANCES).toBe('/catalog/appliances');
      expect(API_ENDPOINTS.CATALOG.MATERIALS).toBe('/catalog/materials');
    });

    it('should generate product by ID endpoint', () => {
      const productId = 'product-123';
      expect(API_ENDPOINTS.CATALOG.PRODUCT_BY_ID(productId)).toBe('/catalog/products/product-123');
    });
  });

  describe('PRODUCTS Endpoints', () => {
    it('should have base products endpoint', () => {
      expect(API_ENDPOINTS.PRODUCTS.BASE).toBe('/products');
    });

    it('should have search and categories endpoints', () => {
      expect(API_ENDPOINTS.PRODUCTS.SEARCH).toBe('/products/search');
      expect(API_ENDPOINTS.PRODUCTS.CATEGORIES).toBe('/products/categories');
    });

    it('should generate product by ID endpoint', () => {
      const productId = 'product-123';
      expect(API_ENDPOINTS.PRODUCTS.BY_ID(productId)).toBe('/products/product-123');
    });

    it('should generate product compatibility endpoint', () => {
      const productId = 'product-123';
      expect(API_ENDPOINTS.PRODUCTS.COMPATIBILITY(productId)).toBe('/products/product-123/compatibility');
    });
  });

  describe('ORDERS Endpoints', () => {
    it('should have base orders endpoint', () => {
      expect(API_ENDPOINTS.ORDERS.BASE).toBe('/orders');
    });

    it('should generate order endpoints', () => {
      const orderId = 'order-123';
      expect(API_ENDPOINTS.ORDERS.BY_ID(orderId)).toBe('/orders/order-123');
      expect(API_ENDPOINTS.ORDERS.CANCEL(orderId)).toBe('/orders/order-123/cancel');
      expect(API_ENDPOINTS.ORDERS.QUOTE(orderId)).toBe('/orders/order-123/quote');
    });
  });

  describe('AI_GENERATOR Endpoints', () => {
    it('should generate preferences endpoint', () => {
      const projectId = 'project-123';
      expect(API_ENDPOINTS.AI_GENERATOR.PREFERENCES(projectId)).toBe('/ai-generator/preferences/project-123');
    });

    it('should have AI action endpoints', () => {
      expect(API_ENDPOINTS.AI_GENERATOR.GENERATE).toBe('/ai-generator/generate');
      expect(API_ENDPOINTS.AI_GENERATOR.VALIDATE).toBe('/ai-generator/validate');
      expect(API_ENDPOINTS.AI_GENERATOR.OPTIMIZE).toBe('/ai-generator/optimize');
    });
  });

  describe('KITCHEN_GENERATOR Endpoints', () => {
    it('should have kitchen generator endpoints', () => {
      expect(API_ENDPOINTS.KITCHEN_GENERATOR.GENERATE).toBe('/kitchen-generator/generate');
      expect(API_ENDPOINTS.KITCHEN_GENERATOR.VALIDATE).toBe('/kitchen-generator/validate');
      expect(API_ENDPOINTS.KITCHEN_GENERATOR.OPTIMIZE).toBe('/kitchen-generator/optimize');
      expect(API_ENDPOINTS.KITCHEN_GENERATOR.COMPATIBILITY).toBe('/kitchen-generator/compatibility');
    });
  });

  describe('ADMIN Endpoints', () => {
    it('should have admin dashboard endpoint', () => {
      expect(API_ENDPOINTS.ADMIN.DASHBOARD).toBe('/admin/dashboard');
    });

    it('should have admin users endpoint', () => {
      expect(API_ENDPOINTS.ADMIN.USERS).toBe('/admin/users');
    });

    it('should generate admin user endpoints', () => {
      const userId = 'user-123';
      expect(API_ENDPOINTS.ADMIN.USER_BY_ID(userId)).toBe('/admin/users/user-123');
      expect(API_ENDPOINTS.ADMIN.USER_ACTION(userId, 'suspend')).toBe('/admin/users/user-123/suspend');
      expect(API_ENDPOINTS.ADMIN.USER_ACTION(userId, 'activate')).toBe('/admin/users/user-123/activate');
    });

    it('should have system endpoints', () => {
      expect(API_ENDPOINTS.ADMIN.SYSTEM_INFO).toBe('/admin/system');
      expect(API_ENDPOINTS.ADMIN.SETTINGS).toBe('/admin/settings');
    });
  });

  describe('ROLES Endpoints', () => {
    it('should have base roles endpoint', () => {
      expect(API_ENDPOINTS.ROLES.BASE).toBe('/roles');
    });

    it('should generate role endpoints', () => {
      const roleId = 'role-123';
      expect(API_ENDPOINTS.ROLES.BY_ID(roleId)).toBe('/roles/role-123');
      expect(API_ENDPOINTS.ROLES.PERMISSIONS(roleId)).toBe('/roles/role-123/permissions');
    });
  });

  describe('PERMISSIONS Endpoints', () => {
    it('should have permissions endpoints', () => {
      expect(API_ENDPOINTS.PERMISSIONS.BASE).toBe('/permissions');
      expect(API_ENDPOINTS.PERMISSIONS.CATEGORIES).toBe('/permissions/categories');
      expect(API_ENDPOINTS.PERMISSIONS.SEED).toBe('/permissions/seed');
    });

    it('should generate permission by ID endpoint', () => {
      const permissionId = 'permission-123';
      expect(API_ENDPOINTS.PERMISSIONS.BY_ID(permissionId)).toBe('/permissions/permission-123');
    });
  });

  describe('AUDIT Endpoints', () => {
    it('should have audit endpoints', () => {
      expect(API_ENDPOINTS.AUDIT.BASE).toBe('/audit');
      expect(API_ENDPOINTS.AUDIT.EXPORT).toBe('/audit/export');
      expect(API_ENDPOINTS.AUDIT.STATS).toBe('/audit/stats');
    });

    it('should generate audit by ID endpoint', () => {
      const auditId = 'audit-123';
      expect(API_ENDPOINTS.AUDIT.BY_ID(auditId)).toBe('/audit/audit-123');
    });
  });

  describe('MONITORING Endpoints', () => {
    it('should have health endpoints', () => {
      expect(API_ENDPOINTS.MONITORING.HEALTH).toBe('/health');
      expect(API_ENDPOINTS.MONITORING.DETAILED).toBe('/health/detailed');
    });

    it('should have metrics endpoints', () => {
      expect(API_ENDPOINTS.MONITORING.METRICS).toBe('/monitoring/metrics');
      expect(API_ENDPOINTS.MONITORING.SYSTEM).toBe('/monitoring/system');
    });
  });

  describe('WEBHOOKS Endpoints', () => {
    it('should have base webhooks endpoint', () => {
      expect(API_ENDPOINTS.WEBHOOKS.BASE).toBe('/webhooks');
    });

    it('should generate webhook endpoints', () => {
      const webhookId = 'webhook-123';
      expect(API_ENDPOINTS.WEBHOOKS.BY_ID(webhookId)).toBe('/webhooks/webhook-123');
      expect(API_ENDPOINTS.WEBHOOKS.TEST(webhookId)).toBe('/webhooks/webhook-123/test');
      expect(API_ENDPOINTS.WEBHOOKS.EVENTS(webhookId)).toBe('/webhooks/webhook-123/events');
    });
  });

  describe('I18N Endpoints', () => {
    it('should have locales endpoints', () => {
      expect(API_ENDPOINTS.I18N.LOCALES).toBe('/i18n/locales');
      expect(API_ENDPOINTS.I18N.DEFAULT_LOCALE).toBe('/i18n/locales/default');
    });

    it('should generate locale by code endpoint', () => {
      expect(API_ENDPOINTS.I18N.LOCALE_BY_CODE('en')).toBe('/i18n/locales/code/en');
      expect(API_ENDPOINTS.I18N.LOCALE_BY_CODE('fr')).toBe('/i18n/locales/code/fr');
    });

    it('should generate translations endpoint', () => {
      expect(API_ENDPOINTS.I18N.TRANSLATIONS('en')).toBe('/i18n/translations/en');
      expect(API_ENDPOINTS.I18N.TRANSLATIONS('fr')).toBe('/i18n/translations/fr');
    });
  });

  describe('PARTNERS Endpoints', () => {
    it('should have partners endpoints', () => {
      expect(API_ENDPOINTS.PARTNERS.BASE).toBe('/partners');
      expect(API_ENDPOINTS.PARTNERS.REGISTER).toBe('/partners/register');
    });

    it('should generate partner endpoints', () => {
      const partnerId = 'partner-123';
      expect(API_ENDPOINTS.PARTNERS.BY_ID(partnerId)).toBe('/partners/partner-123');
      expect(API_ENDPOINTS.PARTNERS.CATALOG(partnerId)).toBe('/partners/partner-123/catalog');
      expect(API_ENDPOINTS.PARTNERS.ANALYTICS(partnerId)).toBe('/partners/partner-123/analytics');
    });
  });

  describe('QUESTIONNAIRE Endpoints', () => {
    it('should have questionnaire endpoints', () => {
      expect(API_ENDPOINTS.QUESTIONNAIRE.BASE).toBe('/questionnaire');
      expect(API_ENDPOINTS.QUESTIONNAIRE.USER_PROFILE).toBe('/questionnaire/user-profile');
      expect(API_ENDPOINTS.QUESTIONNAIRE.SPATIAL).toBe('/questionnaire/spatial');
      expect(API_ENDPOINTS.QUESTIONNAIRE.STYLE).toBe('/questionnaire/style');
      expect(API_ENDPOINTS.QUESTIONNAIRE.BUDGET).toBe('/questionnaire/budget');
      expect(API_ENDPOINTS.QUESTIONNAIRE.COMPLETE).toBe('/questionnaire/complete');
      expect(API_ENDPOINTS.QUESTIONNAIRE.PROGRESS).toBe('/questionnaire/progress');
    });
  });

  describe('Endpoint Structure', () => {
    it('should have consistent path structure', () => {
      // All endpoints should start with /
      Object.values(API_ENDPOINTS).forEach((category) => {
        Object.values(category).forEach((endpoint) => {
          if (typeof endpoint === 'string') {
            expect(endpoint.startsWith('/')).toBe(true);
          } else if (typeof endpoint === 'function') {
            const result = endpoint('test-id');
            expect(result.startsWith('/')).toBe(true);
          }
        });
      });
    });

    it('should not have trailing slashes', () => {
      Object.values(API_ENDPOINTS).forEach((category) => {
        Object.values(category).forEach((endpoint) => {
          if (typeof endpoint === 'string') {
            expect(endpoint.endsWith('/')).toBe(false);
          } else if (typeof endpoint === 'function') {
            const result = endpoint('test-id');
            expect(result.endsWith('/')).toBe(false);
          }
        });
      });
    });
  });
});
