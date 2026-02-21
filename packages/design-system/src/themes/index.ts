/**
 * Design System Themes
 * Theme definitions and utilities for KitchenXpert
 */

// Theme definitions
export { lightTheme } from './light-theme';
export type { LightTheme, ThemeColors, ThemeShadows } from './light-theme';

export { darkTheme } from './dark-theme';
export type { DarkTheme } from './dark-theme';

export { highContrastTheme } from './high-contrast-theme';
export type { HighContrastTheme } from './high-contrast-theme';

// Theme utilities
export {
  themes,
  getTheme,
  generateCssVariables,
  generateCssString,
  flattenToCssVars,
  applyTheme,
  getCurrentTheme,
  prefersDarkMode,
  prefersReducedMotion,
  prefersHighContrast,
  getPreferredTheme,
  watchThemePreferences,
  createTheme,
  getThemeValue,
  saveThemePreference,
  loadThemePreference,
  initializeTheme,
  THEME_STORAGE_KEY,
} from './theme-utils';
export type { ThemeName, Theme, ThemeContextValue } from './theme-utils';

// Default theme export
export { lightTheme as defaultTheme } from './light-theme';
