/**
 * Semantic Color Tokens
 * Design tokens that provide semantic meaning to colors
 */

import { colors } from '../foundations/colors';

/**
 * Background tokens - for surfaces and containers
 */
export const backgroundTokens = {
  // Surface backgrounds
  surface: {
    primary: colors.neutral[0],
    secondary: colors.neutral[50],
    tertiary: colors.neutral[100],
    inverse: colors.neutral[900],
  },
  // Elevated surfaces (cards, modals)
  elevated: {
    low: colors.neutral[0],
    medium: colors.neutral[0],
    high: colors.neutral[0],
  },
  // Sunken/recessed areas
  sunken: {
    default: colors.neutral[100],
    subtle: colors.neutral[50],
  },
  // Interactive backgrounds
  interactive: {
    default: colors.neutral[0],
    hover: colors.neutral[50],
    active: colors.neutral[100],
    disabled: colors.neutral[100],
  },
  // Status backgrounds
  status: {
    success: colors.success[50],
    warning: colors.warning[50],
    error: colors.error[50],
    info: colors.info[50],
  },
  // Brand backgrounds
  brand: {
    primary: colors.primary[500],
    primarySubtle: colors.primary[50],
    secondary: colors.secondary[500],
    secondarySubtle: colors.secondary[50],
  },
  // Overlay
  overlay: {
    light: 'rgba(255, 255, 255, 0.8)',
    dark: 'rgba(0, 0, 0, 0.5)',
    heavy: 'rgba(0, 0, 0, 0.75)',
  },
} as const;

/**
 * Text color tokens
 */
export const textTokens = {
  // Content hierarchy
  primary: colors.neutral[900],
  secondary: colors.neutral[600],
  tertiary: colors.neutral[500],
  quaternary: colors.neutral[400],
  disabled: colors.neutral[300],
  inverse: colors.neutral[0],
  // Links
  link: {
    default: colors.primary[600],
    hover: colors.primary[700],
    visited: colors.primary[800],
    active: colors.primary[700],
  },
  // Status text
  status: {
    success: colors.success[700],
    warning: colors.warning[700],
    error: colors.error[700],
    info: colors.info[700],
  },
  // Brand text
  brand: {
    primary: colors.primary[600],
    secondary: colors.secondary[600],
  },
  // On colored backgrounds
  onBrand: {
    primary: colors.neutral[0],
    secondary: colors.neutral[0],
  },
  onStatus: {
    success: colors.neutral[0],
    warning: colors.neutral[900],
    error: colors.neutral[0],
    info: colors.neutral[0],
  },
} as const;

/**
 * Border color tokens
 */
export const borderTokens = {
  // Structural borders
  default: colors.neutral[200],
  subtle: colors.neutral[100],
  strong: colors.neutral[300],
  // Interactive states
  interactive: {
    default: colors.neutral[300],
    hover: colors.neutral[400],
    focus: colors.primary[500],
    active: colors.primary[600],
    disabled: colors.neutral[200],
  },
  // Status borders
  status: {
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    info: colors.info[500],
  },
  // Brand borders
  brand: {
    primary: colors.primary[500],
    secondary: colors.secondary[500],
  },
  // Dividers
  divider: {
    default: colors.neutral[200],
    subtle: colors.neutral[100],
    strong: colors.neutral[300],
  },
} as const;

/**
 * Icon color tokens
 */
export const iconTokens = {
  primary: colors.neutral[700],
  secondary: colors.neutral[500],
  tertiary: colors.neutral[400],
  disabled: colors.neutral[300],
  inverse: colors.neutral[0],
  // Interactive
  interactive: {
    default: colors.neutral[600],
    hover: colors.neutral[700],
    active: colors.neutral[800],
  },
  // Status
  status: {
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    info: colors.info[500],
  },
  // Brand
  brand: {
    primary: colors.primary[500],
    secondary: colors.secondary[500],
  },
} as const;

/**
 * Component-specific color tokens
 */
export const componentTokens = {
  // Button colors
  button: {
    primary: {
      background: colors.primary[500],
      backgroundHover: colors.primary[600],
      backgroundActive: colors.primary[700],
      backgroundDisabled: colors.neutral[200],
      text: colors.neutral[0],
      textDisabled: colors.neutral[400],
    },
    secondary: {
      background: 'transparent',
      backgroundHover: colors.primary[50],
      backgroundActive: colors.primary[100],
      backgroundDisabled: 'transparent',
      text: colors.primary[600],
      textHover: colors.primary[700],
      textDisabled: colors.neutral[400],
      border: colors.primary[500],
      borderDisabled: colors.neutral[300],
    },
    ghost: {
      background: 'transparent',
      backgroundHover: colors.neutral[100],
      backgroundActive: colors.neutral[200],
      text: colors.neutral[700],
      textHover: colors.neutral[900],
    },
    danger: {
      background: colors.error[500],
      backgroundHover: colors.error[600],
      backgroundActive: colors.error[700],
      text: colors.neutral[0],
    },
  },
  // Input colors
  input: {
    background: colors.neutral[0],
    backgroundDisabled: colors.neutral[100],
    border: colors.neutral[300],
    borderHover: colors.neutral[400],
    borderFocus: colors.primary[500],
    borderError: colors.error[500],
    borderSuccess: colors.success[500],
    text: colors.neutral[900],
    textPlaceholder: colors.neutral[400],
    textDisabled: colors.neutral[400],
  },
  // Card colors
  card: {
    background: colors.neutral[0],
    backgroundHover: colors.neutral[50],
    border: colors.neutral[200],
    borderHover: colors.neutral[300],
  },
  // Badge colors
  badge: {
    default: {
      background: colors.neutral[100],
      text: colors.neutral[700],
    },
    primary: {
      background: colors.primary[100],
      text: colors.primary[700],
    },
    success: {
      background: colors.success[100],
      text: colors.success[700],
    },
    warning: {
      background: colors.warning[100],
      text: colors.warning[800],
    },
    error: {
      background: colors.error[100],
      text: colors.error[700],
    },
  },
  // Navigation colors
  navigation: {
    background: colors.neutral[0],
    backgroundActive: colors.primary[50],
    text: colors.neutral[600],
    textHover: colors.neutral[900],
    textActive: colors.primary[600],
    border: colors.neutral[200],
    indicator: colors.primary[500],
  },
  // Tooltip colors
  tooltip: {
    background: colors.neutral[800],
    text: colors.neutral[0],
  },
} as const;

// Types
export type BackgroundTokens = typeof backgroundTokens;
export type TextTokens = typeof textTokens;
export type BorderTokens = typeof borderTokens;
export type IconTokens = typeof iconTokens;
export type ComponentTokens = typeof componentTokens;

// Combined export
export const colorTokens = {
  background: backgroundTokens,
  text: textTokens,
  border: borderTokens,
  icon: iconTokens,
  component: componentTokens,
} as const;

export type ColorTokens = typeof colorTokens;
