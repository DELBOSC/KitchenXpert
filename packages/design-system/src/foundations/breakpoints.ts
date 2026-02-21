/**
 * Breakpoint Foundations
 * KitchenXpert Design System - Responsive breakpoints
 */

// Breakpoint values in pixels
export const breakpointValues = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Media query strings (min-width)
export const mediaQueries = {
  xs: `@media (min-width: ${breakpointValues.xs}px)`,
  sm: `@media (min-width: ${breakpointValues.sm}px)`,
  md: `@media (min-width: ${breakpointValues.md}px)`,
  lg: `@media (min-width: ${breakpointValues.lg}px)`,
  xl: `@media (min-width: ${breakpointValues.xl}px)`,
  '2xl': `@media (min-width: ${breakpointValues['2xl']}px)`,
} as const;

// Media query strings (max-width) - for mobile-first overrides
export const mediaQueriesDown = {
  xs: `@media (max-width: ${breakpointValues.sm - 1}px)`,
  sm: `@media (max-width: ${breakpointValues.md - 1}px)`,
  md: `@media (max-width: ${breakpointValues.lg - 1}px)`,
  lg: `@media (max-width: ${breakpointValues.xl - 1}px)`,
  xl: `@media (max-width: ${breakpointValues['2xl'] - 1}px)`,
} as const;

// Container max-widths at each breakpoint
export const containerMaxWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Common device orientations
export const orientationQueries = {
  portrait: '@media (orientation: portrait)',
  landscape: '@media (orientation: landscape)',
} as const;

// Print media query
export const printQuery = '@media print';

// Reduced motion preference
export const reducedMotionQuery = '@media (prefers-reduced-motion: reduce)';

// Dark mode preference
export const darkModeQuery = '@media (prefers-color-scheme: dark)';

// High contrast preference
export const highContrastQuery = '@media (prefers-contrast: more)';

// Types
export type BreakpointKey = keyof typeof breakpointValues;
export type BreakpointValue = typeof breakpointValues[BreakpointKey];
export type MediaQuery = typeof mediaQueries[BreakpointKey];
export type ContainerMaxWidth = typeof containerMaxWidths[Exclude<BreakpointKey, 'xs'>];

// Utility functions
export function getBreakpointValue(breakpoint: BreakpointKey): number {
  return breakpointValues[breakpoint];
}

export function isBreakpointUp(width: number, breakpoint: BreakpointKey): boolean {
  return width >= breakpointValues[breakpoint];
}

export function isBreakpointDown(width: number, breakpoint: BreakpointKey): boolean {
  return width < breakpointValues[breakpoint];
}

export function getActiveBreakpoint(width: number): BreakpointKey {
  if (width >= breakpointValues['2xl']) return '2xl';
  if (width >= breakpointValues.xl) return 'xl';
  if (width >= breakpointValues.lg) return 'lg';
  if (width >= breakpointValues.md) return 'md';
  if (width >= breakpointValues.sm) return 'sm';
  return 'xs';
}

// Create custom media query
export function createMediaQuery(minWidth?: number, maxWidth?: number): string {
  if (minWidth !== undefined && maxWidth !== undefined) {
    return `@media (min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;
  }
  if (minWidth !== undefined) {
    return `@media (min-width: ${minWidth}px)`;
  }
  if (maxWidth !== undefined) {
    return `@media (max-width: ${maxWidth}px)`;
  }
  return '@media all';
}

// Combined breakpoints export
export const breakpoints = {
  values: breakpointValues,
  up: mediaQueries,
  down: mediaQueriesDown,
  containers: containerMaxWidths,
  orientation: orientationQueries,
  print: printQuery,
  reducedMotion: reducedMotionQuery,
  darkMode: darkModeQuery,
  highContrast: highContrastQuery,
} as const;

export type Breakpoints = typeof breakpoints;
