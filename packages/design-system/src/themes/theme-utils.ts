/**
 * Theme Utilities
 * Helper functions for theme management and CSS variable generation
 */

import { lightTheme } from './light-theme';
import { darkTheme } from './dark-theme';
import { highContrastTheme } from './high-contrast-theme';

// Theme type union
export type ThemeName = 'light' | 'dark' | 'high-contrast';

export type Theme = typeof lightTheme | typeof darkTheme | typeof highContrastTheme;

// Theme map
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast': highContrastTheme,
} as const;

/**
 * Get a theme by name
 */
export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

/**
 * Flatten nested object to CSS variable format
 * { colors: { primary: '#000' } } => { '--colors-primary': '#000' }
 */
export function flattenToCssVars(
  obj: Record<string, unknown>,
  prefix = '-'
): Record<string, string> {
  const result: Record<string, string> = {};

  function flatten(current: unknown, path: string): void {
    if (current === null || current === undefined) {
      return;
    }

    if (typeof current === 'object' && !Array.isArray(current)) {
      for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
        flatten(value, `${path}-${key}`);
      }
    } else {
      result[path] = String(current);
    }
  }

  flatten(obj, prefix);
  return result;
}

/**
 * Generate CSS custom properties from a theme
 */
export function generateCssVariables(theme: Theme): Record<string, string> {
  return flattenToCssVars(theme, '--theme');
}

/**
 * Generate CSS string from theme variables
 */
export function generateCssString(theme: Theme, selector = ':root'): string {
  const vars = generateCssVariables(theme);
  const cssVars = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  return `${selector} {\n${cssVars}\n}`;
}

/**
 * Apply theme to document root
 */
export function applyTheme(theme: Theme | ThemeName): void {
  if (typeof document === 'undefined') return;

  const themeObj = typeof theme === 'string' ? getTheme(theme) : theme;
  const vars = generateCssVariables(themeObj);

  const root = document.documentElement;

  // Set theme attribute
  root.setAttribute('data-theme', themeObj.name);

  // Apply CSS variables
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Get current theme from document
 */
export function getCurrentTheme(): ThemeName {
  if (typeof document === 'undefined') return 'light';

  const themeName = document.documentElement.getAttribute('data-theme');
  if (themeName && themeName in themes) {
    return themeName as ThemeName;
  }

  return 'light';
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Get the preferred theme based on user's system settings
 */
export function getPreferredTheme(): ThemeName {
  if (prefersHighContrast()) {
    return 'high-contrast';
  }
  if (prefersDarkMode()) {
    return 'dark';
  }
  return 'light';
}

/**
 * Watch for theme preference changes
 */
export function watchThemePreferences(callback: (theme: ThemeName) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const contrastQuery = window.matchMedia('(prefers-contrast: more)');

  const handleChange = () => {
    callback(getPreferredTheme());
  };

  darkModeQuery.addEventListener('change', handleChange);
  contrastQuery.addEventListener('change', handleChange);

  return () => {
    darkModeQuery.removeEventListener('change', handleChange);
    contrastQuery.removeEventListener('change', handleChange);
  };
}

/**
 * Create a theme from base with overrides
 */
export function createTheme<T extends Theme>(baseTheme: T, overrides: DeepPartial<T>): T {
  return deepMerge(baseTheme, overrides) as T;
}

/**
 * Deep merge utility
 */
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    for (const key of Object.keys(source)) {
      const sourceValue = (source as Record<string, unknown>)[key];
      const targetValue = (target as Record<string, unknown>)[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        (output as Record<string, unknown>)[key] = deepMerge(
          targetValue,
          sourceValue as DeepPartial<typeof targetValue>
        );
      } else if (sourceValue !== undefined) {
        (output as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return output;
}

function isObject(item: unknown): item is Record<string, unknown> {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item));
}

// Deep partial type
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Get a specific color from the theme using a path
 * e.g., getThemeColor(theme, 'colors.brand.primary')
 */
export function getThemeValue(theme: Theme, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = theme;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Theme context value type for React
 */
export interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
}

/**
 * Storage key for persisted theme preference
 */
export const THEME_STORAGE_KEY = 'kitchenxpert-theme';

/**
 * Save theme preference to localStorage
 */
export function saveThemePreference(theme: ThemeName): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Load theme preference from localStorage
 */
export function loadThemePreference(): ThemeName | null {
  if (typeof localStorage === 'undefined') return null;
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved && saved in themes) {
    return saved as ThemeName;
  }
  return null;
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(): ThemeName {
  // Check for saved preference first
  const saved = loadThemePreference();
  if (saved) {
    applyTheme(saved);
    return saved;
  }

  // Fall back to system preference
  const preferred = getPreferredTheme();
  applyTheme(preferred);
  return preferred;
}
