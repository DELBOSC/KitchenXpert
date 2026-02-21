/**
 * Design System Foundations
 * Core design tokens and values for KitchenXpert
 */

// Colors
export {
  colors,
  primary,
  secondary,
  neutral,
  success,
  warning,
  error,
  info,
  kitchen,
} from './colors';
export type {
  Colors,
  PrimaryColor,
  SecondaryColor,
  NeutralColor,
  SuccessColor,
  WarningColor,
  ErrorColor,
  InfoColor,
  KitchenColor,
  ColorShade,
  NeutralShade,
} from './colors';

// Typography
export {
  typography,
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  textDecorations,
  textTransforms,
} from './typography';
export type {
  Typography,
  FontFamilies,
  FontSizes,
  FontWeights,
  LineHeights,
  LetterSpacings,
  TextDecorations,
  TextTransforms,
  FontFamily,
  FontSize,
  FontWeight,
  LineHeight,
  LetterSpacing,
} from './typography';

// Spacing
export {
  spacingFoundation,
  spacing,
  negativeSpacing,
  gaps,
  radii,
  SPACING_UNIT,
} from './spacing';
export type {
  SpacingFoundation,
  Spacing,
  NegativeSpacing,
  Gaps,
  Radii,
  SpacingKey,
  GapKey,
  RadiusKey,
} from './spacing';

// Breakpoints
export {
  breakpoints,
  breakpointValues,
  mediaQueries,
  mediaQueriesDown,
  containerMaxWidths,
  orientationQueries,
  printQuery,
  reducedMotionQuery,
  darkModeQuery,
  highContrastQuery,
  getBreakpointValue,
  isBreakpointUp,
  isBreakpointDown,
  getActiveBreakpoint,
  createMediaQuery,
} from './breakpoints';
export type {
  Breakpoints,
  BreakpointKey,
  BreakpointValue,
  MediaQuery,
  ContainerMaxWidth,
} from './breakpoints';

// Elevation
export {
  elevation,
  shadows,
  coloredShadows,
  focusRings,
  zIndices,
} from './elevation';
export type {
  Elevation,
  Shadows,
  ColoredShadows,
  FocusRings,
  ZIndices,
  ShadowKey,
  ZIndexKey,
} from './elevation';

// Motion
export {
  motion,
  durations,
  durationValues,
  easings,
  keyframes,
  animations,
  transitions,
  createTransition,
} from './motion';
export type {
  Motion,
  Duration,
  DurationValue,
  Easing,
  Animation,
  Transition,
} from './motion';

/**
 * Combined foundations object for convenience
 */
import { colors as _colors } from './colors';
import { typography as _typography } from './typography';
import { spacingFoundation as _spacing } from './spacing';
import { breakpoints as _breakpoints } from './breakpoints';
import { elevation as _elevation } from './elevation';
import { motion as _motion } from './motion';

export const foundations = {
  colors: _colors,
  typography: _typography,
  spacing: _spacing,
  breakpoints: _breakpoints,
  elevation: _elevation,
  motion: _motion,
} as const;

export type Foundations = typeof foundations;
