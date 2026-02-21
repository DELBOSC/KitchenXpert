/**
 * Design System Tokens
 * Semantic tokens for consistent styling across components
 */

// Color tokens
export {
  colorTokens,
  backgroundTokens,
  textTokens,
  borderTokens,
  iconTokens,
  componentTokens,
} from './color-tokens';
export type {
  ColorTokens,
  BackgroundTokens,
  TextTokens,
  BorderTokens,
  IconTokens,
  ComponentTokens,
} from './color-tokens';

// Typography tokens
export {
  typographyTokens,
  headingTokens,
  bodyTokens,
  labelTokens,
  captionTokens,
  codeTokens,
  displayTokens,
  linkTokens,
  buttonTextTokens,
  measurementTokens,
} from './typography-tokens';
export type {
  TypographyTokens,
  TypographyStyle,
  HeadingToken,
  BodyToken,
  LabelToken,
  CaptionToken,
  CodeToken,
  DisplayToken,
  LinkToken,
  ButtonTextToken,
  MeasurementToken,
} from './typography-tokens';

// Spacing tokens
export {
  spacingTokens,
  paddingTokens,
  marginTokens,
  gapTokens,
  radiusTokens,
  sizeTokens,
} from './spacing-tokens';
export type {
  SpacingTokens,
  PaddingToken,
  MarginToken,
  GapToken,
  RadiusToken,
  SizeToken,
} from './spacing-tokens';

// Elevation tokens
export {
  elevationTokens,
  surfaceElevationTokens,
  componentElevationTokens,
  focusTokens,
  zIndexTokens,
  shadowTokens,
} from './elevation-tokens';
export type {
  ElevationTokens,
  SurfaceElevation,
  ComponentElevation,
  FocusToken,
  ZIndexToken,
  ShadowToken,
} from './elevation-tokens';

// Motion tokens
export {
  motionTokens,
  transitionTokens,
  animationTokens,
  componentMotionTokens,
  reducedMotionTokens,
} from './motion-tokens';
export type {
  MotionTokens,
  TransitionToken,
  AnimationToken,
  ComponentMotionToken,
} from './motion-tokens';

/**
 * Combined tokens object for convenience
 */
export const tokens = {
  color: {} as typeof import('./color-tokens').colorTokens,
  typography: {} as typeof import('./typography-tokens').typographyTokens,
  spacing: {} as typeof import('./spacing-tokens').spacingTokens,
  elevation: {} as typeof import('./elevation-tokens').elevationTokens,
  motion: {} as typeof import('./motion-tokens').motionTokens,
} as const;

// Initialize tokens
import { colorTokens as _colorTokens } from './color-tokens';
import { typographyTokens as _typographyTokens } from './typography-tokens';
import { spacingTokens as _spacingTokens } from './spacing-tokens';
import { elevationTokens as _elevationTokens } from './elevation-tokens';
import { motionTokens as _motionTokens } from './motion-tokens';

Object.assign(tokens, {
  color: _colorTokens,
  typography: _typographyTokens,
  spacing: _spacingTokens,
  elevation: _elevationTokens,
  motion: _motionTokens,
});

export type Tokens = typeof tokens;
