import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'system';
    }
    const stored = localStorage.getItem('theme');
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  });

  // Update resolved theme when theme changes
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);

    // Apply to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent): void => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme): void => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch {
      // localStorage may be full or disabled in private browsing
    }
  }, []);

  const toggleTheme = useCallback((): void => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
