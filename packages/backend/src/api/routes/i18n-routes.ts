import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';

import { i18nController } from '../controllers/i18n-controller';
import { authenticate, authorize } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

const createLocaleSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(1).max(100),
  nativeName: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});

const updateLocaleSchema = createLocaleSchema.partial();

const createTranslationSchema = z.object({
  localeId: z.string().uuid(),
  namespace: z.string().min(1).max(100),
  key: z.string().min(1).max(500),
  value: z.string(),
});

const bulkTranslationsSchema = z.object({
  translations: z.array(createTranslationSchema).min(1).max(1000),
});

// Public routes (get translations)

/**
 * @swagger
 * /api/v1/i18n/locales:
 *   get:
 *     summary: Get all available locales
 *     tags: [i18n]
 *     responses:
 *       200:
 *         description: List of locales
 */
router.get('/locales', i18nController.getLocales);

/**
 * @swagger
 * /api/v1/i18n/locales/default:
 *   get:
 *     summary: Get the default locale
 *     tags: [i18n]
 *     responses:
 *       200:
 *         description: Default locale data
 */
router.get('/locales/default', i18nController.getDefaultLocale);

/**
 * @swagger
 * /api/v1/i18n/locales/code/{code}:
 *   get:
 *     summary: Get locale by language code
 *     tags: [i18n]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Locale data
 *       404:
 *         description: Locale not found
 */
router.get('/locales/code/:code', i18nController.getLocaleByCode);

/**
 * @swagger
 * /api/v1/i18n/translations/{localeCode}:
 *   get:
 *     summary: Get all translations for a locale
 *     tags: [i18n]
 *     parameters:
 *       - in: path
 *         name: localeCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All translations for locale
 */
router.get('/translations/:localeCode', i18nController.getAllTranslationsForLocale);

/**
 * @swagger
 * /api/v1/i18n/translations/{localeCode}/{namespace}:
 *   get:
 *     summary: Get translations for a locale and namespace
 *     tags: [i18n]
 *     parameters:
 *       - in: path
 *         name: localeCode
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: namespace
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Namespace translations
 */
router.get('/translations/:localeCode/:namespace', i18nController.getNamespaceTranslations);

/**
 * @swagger
 * /api/v1/i18n/namespaces:
 *   get:
 *     summary: Get all translation namespaces
 *     tags: [i18n]
 *     responses:
 *       200:
 *         description: List of namespaces
 */
router.get('/namespaces', i18nController.getNamespaces);

// Protected routes (admin only for management)
router.use(authenticate);
router.use(authorize(['admin']));

// Locale management

/**
 * @swagger
 * /api/v1/i18n/locales/{id}:
 *   get:
 *     summary: Get locale by ID (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Locale data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Locale not found
 */
router.get('/locales/:id', i18nController.getLocaleById);

/**
 * @swagger
 * /api/v1/i18n/locales:
 *   post:
 *     summary: Create a new locale (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name]
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               nativeName:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Locale created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/locales', validateBody(createLocaleSchema), i18nController.createLocale);

/**
 * @swagger
 * /api/v1/i18n/locales/{id}:
 *   put:
 *     summary: Update locale (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               nativeName:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Locale updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Locale not found
 */
router.put('/locales/:id', validateBody(updateLocaleSchema), i18nController.updateLocale);

/**
 * @swagger
 * /api/v1/i18n/locales/{id}:
 *   delete:
 *     summary: Delete locale (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Locale deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Locale not found
 */
router.delete('/locales/:id', i18nController.deleteLocale);

/**
 * @swagger
 * /api/v1/i18n/locales/{id}/set-default:
 *   post:
 *     summary: Set a locale as default (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Default locale set
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Locale not found
 */
router.post('/locales/:id/set-default', i18nController.setDefaultLocale);

// Translation management

/**
 * @swagger
 * /api/v1/i18n/translations:
 *   get:
 *     summary: Get all translations (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of translations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/translations', i18nController.getTranslations);

/**
 * @swagger
 * /api/v1/i18n/translations:
 *   post:
 *     summary: Create a translation (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [localeId, namespace, key, value]
 *             properties:
 *               localeId:
 *                 type: string
 *                 format: uuid
 *               namespace:
 *                 type: string
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       201:
 *         description: Translation created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/translations', validateBody(createTranslationSchema), i18nController.createTranslation);

/**
 * @swagger
 * /api/v1/i18n/translations:
 *   put:
 *     summary: Upsert a translation (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [localeId, namespace, key, value]
 *             properties:
 *               localeId:
 *                 type: string
 *                 format: uuid
 *               namespace:
 *                 type: string
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Translation upserted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.put('/translations', validateBody(createTranslationSchema), i18nController.upsertTranslation);

/**
 * @swagger
 * /api/v1/i18n/translations/{id}:
 *   put:
 *     summary: Update translation by ID (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Translation updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Translation not found
 */
router.put('/translations/:id', i18nController.updateTranslation);

/**
 * @swagger
 * /api/v1/i18n/translations/{id}:
 *   delete:
 *     summary: Delete translation by ID (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Translation deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 *       404:
 *         description: Translation not found
 */
router.delete('/translations/:id', i18nController.deleteTranslation);

/**
 * @swagger
 * /api/v1/i18n/translations/bulk:
 *   post:
 *     summary: Bulk create translations (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [translations]
 *             properties:
 *               translations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [localeId, namespace, key, value]
 *                   properties:
 *                     localeId:
 *                       type: string
 *                       format: uuid
 *                     namespace:
 *                       type: string
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *     responses:
 *       201:
 *         description: Translations created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/translations/bulk', validateBody(bulkTranslationsSchema), i18nController.bulkCreateTranslations);

/**
 * @swagger
 * /api/v1/i18n/translations/namespace/{localeId}/{namespace}:
 *   delete:
 *     summary: Delete all translations in a namespace (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: localeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: namespace
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Namespace translations deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.delete('/translations/namespace/:localeId/:namespace', i18nController.deleteNamespaceTranslations);

// Utilities

/**
 * @swagger
 * /api/v1/i18n/stats:
 *   get:
 *     summary: Get i18n statistics (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Translation statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/stats', i18nController.getStats);

/**
 * @swagger
 * /api/v1/i18n/missing/{sourceLocaleId}/{targetLocaleId}:
 *   get:
 *     summary: Get missing translations between locales (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sourceLocaleId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: targetLocaleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Missing translations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/missing/:sourceLocaleId/:targetLocaleId', i18nController.getMissingTranslations);

/**
 * @swagger
 * /api/v1/i18n/import/{localeCode}:
 *   post:
 *     summary: Import translations for a locale (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: localeCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Translations imported
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.post('/import/:localeCode', i18nController.importTranslations);

/**
 * @swagger
 * /api/v1/i18n/export/{localeCode}:
 *   get:
 *     summary: Export translations for a locale (admin only)
 *     tags: [i18n]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: localeCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exported translation data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/export/:localeCode', i18nController.exportTranslations);

export default router;
