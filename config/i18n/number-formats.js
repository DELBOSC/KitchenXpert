/**
 * Localized Number Formats for KitchenXpert
 *
 * Purpose:
 * - Provide locale-specific number formatting
 * - Support currency, decimal, percentage, and unit formatting
 * - Use Intl.NumberFormat for native browser support
 *
 * Usage:
 * - Format currency: formatCurrency(1234.56, 'EUR', 'fr-FR')
 * - Format number: formatNumber(1234.56, 'fr-FR')
 * - Format percentage: formatPercentage(0.85, 'fr-FR')
 */

export const formatCurrency = (amount, currency = 'EUR', locale = 'fr-FR') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (number, locale = 'fr-FR', decimals = 2) => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

export const formatPercentage = (value, locale = 'fr-FR') => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatUnit = (value, unit, locale = 'fr-FR') => {
  const units = { cm: 'centimeter', m: 'meter', kg: 'kilogram', l: 'liter' };
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[unit] || unit,
  }).format(value);
};

export default { formatCurrency, formatNumber, formatPercentage, formatUnit };
