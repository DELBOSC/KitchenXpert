/**
 * @kitchenxpert/design-system
 * Design system for KitchenXpert application
 */

// Foundations
export * from './foundations';

// Tokens
export * from './tokens';

// Themes
export * from './themes';

// Icons
export * from './icons';

// Re-export commonly used items at top level for convenience
export {
  colors,
  primary,
  secondary,
  neutral,
  success,
  warning,
  error,
  info,
} from './foundations/colors';

export {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
} from './foundations/typography';

export {
  spacing,
  radii,
  gaps,
} from './foundations/spacing';

export {
  breakpoints,
  mediaQueries,
} from './foundations/breakpoints';

export {
  shadows,
  zIndices,
} from './foundations/elevation';

export {
  durations,
  easings,
  animations,
} from './foundations/motion';

export {
  lightTheme,
  darkTheme,
  highContrastTheme,
  themes,
  applyTheme,
  getTheme,
  getPreferredTheme,
  initializeTheme,
} from './themes';

/**
 * Design system version
 */
export const DESIGN_SYSTEM_VERSION = '1.0.0';

/**
 * Design system configuration
 */
export const designSystemConfig = {
  version: DESIGN_SYSTEM_VERSION,
  defaultTheme: 'light' as const,
  supportedThemes: ['light', 'dark', 'high-contrast'] as const,
  breakpoints: {
    xs: 0,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const;

export type DesignSystemConfig = typeof designSystemConfig;
