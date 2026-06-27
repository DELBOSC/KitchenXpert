import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { LocaleRepository } from '../../repositories/locale-repository';
import { asyncHandler } from '../middleware/error-middleware';
const localeRepository = new LocaleRepository(prisma);

/**
 * I18n Controller
 * Handles all internationalization HTTP requests
 */
export class I18nController {
  // ==================== LOCALES ====================

  /**
   * GET /i18n/locales
   * Get all locales
   */
  getLocales = asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.query;
    const locales = await localeRepository.findAllLocales(
      isActive !== undefined ? isActive === 'true' : undefined
    );
    res.status(200).json({ success: true, data: locales });
  });

  /**
   * GET /i18n/locales/:id
   * Get a locale by ID
   */
  getLocaleById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const locale = await localeRepository.findLocaleById(id);
    if (!locale) {
      res.status(404).json({ success: false, error: 'Locale not found' });
      return;
    }
    res.status(200).json({ success: true, data: locale });
  });

  /**
   * GET /i18n/locales/code/:code
   * Get a locale by code
   */
  getLocaleByCode = asyncHandler(async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const locale = await localeRepository.findLocaleByCode(code);
    if (!locale) {
      res.status(404).json({ success: false, error: 'Locale not found' });
      return;
    }
    res.status(200).json({ success: true, data: locale });
  });

  /**
   * GET /i18n/locales/default
   * Get the default locale
   */
  getDefaultLocale = asyncHandler(async (_req: Request, res: Response) => {
    const locale = await localeRepository.getDefaultLocale();
    if (!locale) {
      res.status(404).json({ success: false, error: 'No default locale configured' });
      return;
    }
    res.status(200).json({ success: true, data: locale });
  });

  /**
   * POST /i18n/locales
   * Create a new locale
   */
  createLocale = asyncHandler(async (req: Request, res: Response) => {
    const { code, name, nativeName, isDefault } = req.body;

    // Check for existing code
    const existing = await localeRepository.findLocaleByCode(code);
    if (existing) {
      res.status(409).json({ success: false, error: 'Locale code already exists' });
      return;
    }

    const locale = await localeRepository.createLocale({ code, name, nativeName, isDefault });
    res.status(201).json({ success: true, data: locale, message: 'Locale created successfully' });
  });

  /**
   * PUT /i18n/locales/:id
   * Update a locale
   */
  updateLocale = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, nativeName, isDefault, isActive } = req.body;

    const locale = await localeRepository.updateLocale(id, {
      name,
      nativeName,
      isDefault,
      isActive,
    });
    res.status(200).json({ success: true, data: locale, message: 'Locale updated successfully' });
  });

  /**
   * DELETE /i18n/locales/:id
   * Delete a locale
   */
  deleteLocale = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    try {
      await localeRepository.deleteLocale(id);
      res.status(200).json({ success: true, message: 'Locale deleted successfully' });
    } catch (error: any) {
      if (error.message === 'Cannot delete default locale') {
        res.status(400).json({ success: false, error: error.message });
        return;
      }
      throw error;
    }
  });

  /**
   * POST /i18n/locales/:id/set-default
   * Set a locale as default
   */
  setDefaultLocale = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const locale = await localeRepository.setDefaultLocale(id);
    res
      .status(200)
      .json({ success: true, data: locale, message: 'Default locale updated successfully' });
  });

  // ==================== TRANSLATIONS ====================

  /**
   * GET /i18n/translations
   * Get translations with filters
   */
  getTranslations = asyncHandler(async (req: Request, res: Response) => {
    const { localeId, namespace, search } = req.query;
    const translations = await localeRepository.findTranslations({
      localeId: localeId as string,
      namespace: namespace as string,
      search: search as string,
    });
    res.status(200).json({ success: true, data: translations });
  });

  /**
   * GET /i18n/translations/:localeCode/:namespace
   * Get namespace translations for a locale
   */
  getNamespaceTranslations = asyncHandler(async (req: Request, res: Response) => {
    const localeCode = req.params.localeCode as string;
    const namespace = req.params.namespace as string;
    const translations = await localeRepository.getNamespaceTranslations(localeCode, namespace);
    res.status(200).json({ success: true, data: translations });
  });

  /**
   * GET /i18n/translations/:localeCode
   * Get all translations for a locale (grouped by namespace)
   */
  getAllTranslationsForLocale = asyncHandler(async (req: Request, res: Response) => {
    const localeCode = req.params.localeCode as string;
    const translations = await localeRepository.getAllTranslationsForLocale(localeCode);
    res.status(200).json({ success: true, data: translations });
  });

  /**
   * POST /i18n/translations
   * Create a translation
   */
  createTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { localeId, namespace, key, value } = req.body;
    const translation = await localeRepository.createTranslation({
      localeId,
      namespace,
      key,
      value,
    });
    res
      .status(201)
      .json({ success: true, data: translation, message: 'Translation created successfully' });
  });

  /**
   * PUT /i18n/translations
   * Create or update a translation (upsert)
   */
  upsertTranslation = asyncHandler(async (req: Request, res: Response) => {
    const { localeId, namespace, key, value } = req.body;
    const translation = await localeRepository.upsertTranslation({
      localeId,
      namespace,
      key,
      value,
    });
    res
      .status(200)
      .json({ success: true, data: translation, message: 'Translation saved successfully' });
  });

  /**
   * PUT /i18n/translations/:id
   * Update a translation value
   */
  updateTranslation = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { value } = req.body;
    const translation = await localeRepository.updateTranslation(id, value);
    res
      .status(200)
      .json({ success: true, data: translation, message: 'Translation updated successfully' });
  });

  /**
   * DELETE /i18n/translations/:id
   * Delete a translation
   */
  deleteTranslation = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await localeRepository.deleteTranslation(id);
    res.status(200).json({ success: true, message: 'Translation deleted successfully' });
  });

  /**
   * POST /i18n/translations/bulk
   * Bulk create translations
   */
  bulkCreateTranslations = asyncHandler(async (req: Request, res: Response) => {
    const { translations } = req.body;
    const result = await localeRepository.createManyTranslations(translations);
    res
      .status(201)
      .json({ success: true, data: result, message: `${result.count} translations created` });
  });

  /**
   * DELETE /i18n/translations/namespace/:localeId/:namespace
   * Delete all translations in a namespace
   */
  deleteNamespaceTranslations = asyncHandler(async (req: Request, res: Response) => {
    const localeId = req.params.localeId as string;
    const namespace = req.params.namespace as string;
    const result = await localeRepository.deleteNamespaceTranslations(localeId, namespace);
    res
      .status(200)
      .json({ success: true, data: result, message: `${result.count} translations deleted` });
  });

  // ==================== UTILITIES ====================

  /**
   * GET /i18n/namespaces
   * Get all translation namespaces
   */
  getNamespaces = asyncHandler(async (_req: Request, res: Response) => {
    const namespaces = await localeRepository.getNamespaces();
    res.status(200).json({ success: true, data: namespaces });
  });

  /**
   * GET /i18n/stats
   * Get translation statistics
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const { localeId } = req.query;
    const count = await localeRepository.countTranslations(localeId as string);
    const namespaces = await localeRepository.getNamespaces();
    const locales = await localeRepository.findAllLocales(true);

    res.status(200).json({
      success: true,
      data: {
        totalTranslations: count,
        namespaceCount: namespaces.length,
        namespaces,
        localeCount: locales.length,
      },
    });
  });

  /**
   * GET /i18n/missing/:sourceLocaleId/:targetLocaleId
   * Get missing translations between two locales
   */
  getMissingTranslations = asyncHandler(async (req: Request, res: Response) => {
    const sourceLocaleId = req.params.sourceLocaleId as string;
    const targetLocaleId = req.params.targetLocaleId as string;
    const missing = await localeRepository.getMissingTranslations(sourceLocaleId, targetLocaleId);
    res.status(200).json({ success: true, data: missing, count: missing.length });
  });

  /**
   * POST /i18n/import/:localeCode
   * Import translations for a locale
   */
  importTranslations = asyncHandler(async (req: Request, res: Response) => {
    const localeCode = req.params.localeCode as string;
    const { data } = req.body;

    try {
      const result = await localeRepository.importTranslations(localeCode, data);
      res.status(200).json({
        success: true,
        data: result,
        message: `${result.count} translations imported`,
      });
    } catch (error: any) {
      if (error.message === 'Locale not found') {
        res.status(404).json({ success: false, error: error.message });
        return;
      }
      throw error;
    }
  });

  /**
   * GET /i18n/export/:localeCode
   * Export all translations for a locale
   */
  exportTranslations = asyncHandler(async (req: Request, res: Response) => {
    const localeCode = req.params.localeCode as string;
    const translations = await localeRepository.getAllTranslationsForLocale(localeCode);
    res.status(200).json({ success: true, data: translations });
  });
}

export const i18nController = new I18nController();
export default i18nController;
