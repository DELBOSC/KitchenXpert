/**
 * Color Foundations
 * Base color palette for KitchenXpert Design System
 *
 * These are the raw color values that form the foundation of the design system.
 * They should be used through semantic tokens and themes, not directly in components.
 */

/**
 * Primary colors - KitchenXpert brand teal
 * Used for primary actions, links, and brand elements
 */
export const primary = {
  50: '#E6F7F7',
  100: '#B3E8E8',
  200: '#80D9D9',
  300: '#4DCACA',
  400: '#26BEBE',
  500: '#00B2B2', // Main brand color
  600: '#009999',
  700: '#007A7A',
  800: '#005C5C',
  900: '#003D3D',
} as const;

/**
 * Secondary colors - Warm orange accent
 * Used for secondary actions and accents
 */
export const secondary = {
  50: '#FFF4E6',
  100: '#FFE0B3',
  200: '#FFCC80',
  300: '#FFB84D',
  400: '#FFA726',
  500: '#FF9500', // Main secondary color
  600: '#E68600',
  700: '#CC7700',
  800: '#995900',
  900: '#663C00',
} as const;

/**
 * Neutral colors - Grays for text, backgrounds, borders
 */
export const neutral = {
  0: '#FFFFFF',
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
  950: '#030712',
} as const;

/**
 * Success colors - Green for positive states
 */
export const success = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
} as const;

/**
 * Warning colors - Amber for cautionary states
 */
export const warning = {
  50: '#FFFBEB',
  100: '#FEF3C7',
  200: '#FDE68A',
  300: '#FCD34D',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
  700: '#B45309',
  800: '#92400E',
  900: '#78350F',
} as const;

/**
 * Error colors - Red for error and destructive states
 */
export const error = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
  800: '#991B1B',
  900: '#7F1D1D',
} as const;

/**
 * Info colors - Blue for informational states
 */
export const info = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
} as const;

/**
 * Kitchen-specific colors
 * Special colors for kitchen design elements
 */
export const kitchen = {
  wood: {
    oak: '#D4A574',
    walnut: '#5D4037',
    maple: '#E8D4B8',
    cherry: '#8B4513',
    pine: '#DEB887',
  },
  stone: {
    marble: '#F5F5F5',
    granite: '#696969',
    quartz: '#E8E8E8',
    slate: '#708090',
  },
  metal: {
    stainless: '#C0C0C0',
    brass: '#B5A642',
    copper: '#B87333',
    chrome: '#DBE4E8',
  },
} as const;

/**
 * Combined colors object for easy access
 */
export const colors = {
  primary,
  secondary,
  neutral,
  success,
  warning,
  error,
  info,
  kitchen,
} as const;

/**
 * Type definitions for colors
 */
export type PrimaryColor = typeof primary;
export type SecondaryColor = typeof secondary;
export type NeutralColor = typeof neutral;
export type SuccessColor = typeof success;
export type WarningColor = typeof warning;
export type ErrorColor = typeof error;
export type InfoColor = typeof info;
export type KitchenColor = typeof kitchen;
export type Colors = typeof colors;

/**
 * Color shade type (common across all color scales)
 */
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/**
 * Neutral shade type (includes 0 and 950)
 */
export type NeutralShade = 0 | ColorShade | 950;

export default colors;
