/**
 * Elevation Foundations
 * KitchenXpert Design System - Shadow and depth system
 */

// Box shadows for elevation levels
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
} as const;

// Colored shadows for interactive elements
export const coloredShadows = {
  primary: {
    sm: '0 1px 3px 0 rgba(255, 118, 38, 0.2), 0 1px 2px -1px rgba(255, 118, 38, 0.2)',
    md: '0 4px 6px -1px rgba(255, 118, 38, 0.2), 0 2px 4px -2px rgba(255, 118, 38, 0.2)',
    lg: '0 10px 15px -3px rgba(255, 118, 38, 0.2), 0 4px 6px -4px rgba(255, 118, 38, 0.2)',
  },
  secondary: {
    sm: '0 1px 3px 0 rgba(0, 175, 155, 0.2), 0 1px 2px -1px rgba(0, 175, 155, 0.2)',
    md: '0 4px 6px -1px rgba(0, 175, 155, 0.2), 0 2px 4px -2px rgba(0, 175, 155, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 175, 155, 0.2), 0 4px 6px -4px rgba(0, 175, 155, 0.2)',
  },
  success: {
    sm: '0 1px 3px 0 rgba(16, 185, 129, 0.2), 0 1px 2px -1px rgba(16, 185, 129, 0.2)',
    md: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -2px rgba(16, 185, 129, 0.2)',
    lg: '0 10px 15px -3px rgba(16, 185, 129, 0.2), 0 4px 6px -4px rgba(16, 185, 129, 0.2)',
  },
  error: {
    sm: '0 1px 3px 0 rgba(239, 68, 68, 0.2), 0 1px 2px -1px rgba(239, 68, 68, 0.2)',
    md: '0 4px 6px -1px rgba(239, 68, 68, 0.2), 0 2px 4px -2px rgba(239, 68, 68, 0.2)',
    lg: '0 10px 15px -3px rgba(239, 68, 68, 0.2), 0 4px 6px -4px rgba(239, 68, 68, 0.2)',
  },
  warning: {
    sm: '0 1px 3px 0 rgba(245, 158, 11, 0.2), 0 1px 2px -1px rgba(245, 158, 11, 0.2)',
    md: '0 4px 6px -1px rgba(245, 158, 11, 0.2), 0 2px 4px -2px rgba(245, 158, 11, 0.2)',
    lg: '0 10px 15px -3px rgba(245, 158, 11, 0.2), 0 4px 6px -4px rgba(245, 158, 11, 0.2)',
  },
} as const;

// Focus ring shadows
export const focusRings = {
  default: '0 0 0 2px rgba(255, 118, 38, 0.5)',
  offset: '0 0 0 2px #FFFFFF, 0 0 0 4px rgba(255, 118, 38, 0.5)',
  error: '0 0 0 2px rgba(239, 68, 68, 0.5)',
  success: '0 0 0 2px rgba(16, 185, 129, 0.5)',
} as const;

// Z-index scale
export const zIndices = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Types
export type Shadows = typeof shadows;
export type ColoredShadows = typeof coloredShadows;
export type FocusRings = typeof focusRings;
export type ZIndices = typeof zIndices;

export type ShadowKey = keyof Shadows;
export type ZIndexKey = keyof ZIndices;

// Combined elevation export
export const elevation = {
  shadows,
  coloredShadows,
  focusRings,
  zIndices,
} as const;

export type Elevation = typeof elevation;
