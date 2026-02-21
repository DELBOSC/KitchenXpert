/**
 * Translation Middleware for Express
 *
 * Purpose:
 * - Set locale from request (query, header, cookie)
 * - Attach i18n instance to request object
 * - Set response Content-Language header
 * - Handle locale switching in API
 *
 * Usage:
 * - app.use(translationMiddleware);
 * - Access in routes: req.t('common.welcome')
 * - Get locale: req.locale
 */

import i18n from './i18n-config';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './i18n-config';

/**
 * Translation middleware
 */
export const translationMiddleware = (req, res, next) => {
  // Detect locale from various sources
  let locale = DEFAULT_LOCALE;

  // 1. Check query parameter (?lng=fr-FR)
  if (req.query.lng && SUPPORTED_LOCALES[req.query.lng]) {
    locale = req.query.lng;
  }
  // 2. Check cookie
  else if (req.cookies?.i18next && SUPPORTED_LOCALES[req.cookies.i18next]) {
    locale = req.cookies.i18next;
  }
  // 3. Check Accept-Language header
  else if (req.headers['accept-language']) {
    const browserLocale = req.headers['accept-language'].split(',')[0].trim();
    if (SUPPORTED_LOCALES[browserLocale]) {
      locale = browserLocale;
    }
  }

  // Set locale in i18n
  i18n.changeLanguage(locale);

  // Attach to request
  req.i18n = i18n;
  req.locale = locale;
  req.t = i18n.t.bind(i18n);

  // Set response header
  res.setHeader('Content-Language', locale);

  // Helper to change language
  req.changeLanguage = async (newLocale) => {
    if (SUPPORTED_LOCALES[newLocale]) {
      await i18n.changeLanguage(newLocale);
      req.locale = newLocale;
      res.cookie('i18next', newLocale, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        sameSite: 'strict',
      });
    }
  };

  next();
};

export default translationMiddleware;
