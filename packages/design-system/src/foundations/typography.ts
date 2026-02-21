/**
 * Typography Foundations
 * KitchenXpert Design System - Typographic scale and properties
 */

// Font families
export const fontFamilies = {
  // Primary font for headings - Modern, clean, slightly rounded
  heading: '"Nunito Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
  // Body font for readability
  body: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
  // Monospace for code, measurements, timers
  mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
} as const;

// Font sizes (rem-based for accessibility)
export const fontSizes = {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
  '6xl': '3.75rem',  // 60px
  '7xl': '4.5rem',   // 72px
} as const;

// Font weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

// Line heights
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

// Letter spacing
export const letterSpacings = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// Text decorations
export const textDecorations = {
  none: 'none',
  underline: 'underline',
  lineThrough: 'line-through',
  overline: 'overline',
} as const;

// Text transforms
export const textTransforms = {
  none: 'none',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
} as const;

// Types
export type FontFamilies = typeof fontFamilies;
export type FontSizes = typeof fontSizes;
export type FontWeights = typeof fontWeights;
export type LineHeights = typeof lineHeights;
export type LetterSpacings = typeof letterSpacings;
export type TextDecorations = typeof textDecorations;
export type TextTransforms = typeof textTransforms;

export type FontFamily = keyof FontFamilies;
export type FontSize = keyof FontSizes;
export type FontWeight = keyof FontWeights;
export type LineHeight = keyof LineHeights;
export type LetterSpacing = keyof LetterSpacings;

// Combined typography export
export const typography = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  textDecorations,
  textTransforms,
} as const;

export type Typography = typeof typography;
