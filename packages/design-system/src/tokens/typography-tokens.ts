/**
 * Typography Tokens
 * Semantic typography tokens for consistent text styling
 */

import {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
} from '../foundations/typography';

/**
 * Heading styles
 */
export const headingTokens = {
  h1: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  h2: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
  h3: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  h4: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacings.normal,
  },
  h5: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  h6: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
} as const;

/**
 * Body text styles
 */
export const bodyTokens = {
  large: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  },
  default: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  small: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  tiny: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
} as const;

/**
 * Label styles (for form elements, buttons)
 */
export const labelTokens = {
  large: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.normal,
  },
  default: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.normal,
  },
  small: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.wide,
  },
} as const;

/**
 * Caption/helper text styles
 */
export const captionTokens = {
  default: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.normal,
  },
  small: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacings.wide,
  },
} as const;

/**
 * Code/monospace styles
 */
export const codeTokens = {
  block: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
  },
  inline: {
    fontFamily: fontFamilies.mono,
    fontSize: '0.875em', // Relative to parent
    fontWeight: fontWeights.normal,
    lineHeight: 'inherit',
    letterSpacing: letterSpacings.normal,
  },
} as const;

/**
 * Display styles (for hero sections, marketing)
 */
export const displayTokens = {
  large: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['7xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.tighter,
  },
  medium: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.tight,
  },
  small: {
    fontFamily: fontFamilies.heading,
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacings.tight,
  },
} as const;

/**
 * Link styles
 */
export const linkTokens = {
  default: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: fontWeights.medium,
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textDecoration: 'underline',
  },
  subtle: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    lineHeight: 'inherit',
    letterSpacing: 'inherit',
    textDecoration: 'none',
  },
} as const;

/**
 * Button text styles
 */
export const buttonTextTokens = {
  large: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.wide,
  },
  default: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.wide,
  },
  small: {
    fontFamily: fontFamilies.body,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.wider,
  },
} as const;

/**
 * Measurement text styles (for dimensions, prices)
 */
export const measurementTokens = {
  large: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.normal,
  },
  default: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.normal,
  },
  small: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacings.normal,
  },
} as const;

// Types
export type HeadingToken = keyof typeof headingTokens;
export type BodyToken = keyof typeof bodyTokens;
export type LabelToken = keyof typeof labelTokens;
export type CaptionToken = keyof typeof captionTokens;
export type CodeToken = keyof typeof codeTokens;
export type DisplayToken = keyof typeof displayTokens;
export type LinkToken = keyof typeof linkTokens;
export type ButtonTextToken = keyof typeof buttonTextTokens;
export type MeasurementToken = keyof typeof measurementTokens;

export interface TypographyStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number | string;
  letterSpacing: string;
  textDecoration?: string;
}

// Combined export
export const typographyTokens = {
  heading: headingTokens,
  body: bodyTokens,
  label: labelTokens,
  caption: captionTokens,
  code: codeTokens,
  display: displayTokens,
  link: linkTokens,
  button: buttonTextTokens,
  measurement: measurementTokens,
} as const;

export type TypographyTokens = typeof typographyTokens;
