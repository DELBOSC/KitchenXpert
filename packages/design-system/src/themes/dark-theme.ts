/**
 * Dark Theme
 * Dark mode theme for KitchenXpert Design System
 */

import { colors } from '../foundations/colors';
import { shadows } from '../foundations/elevation';

// Dark mode specific colors
const darkColors = {
  // Darker backgrounds
  bg: {
    0: '#0A0A0A',
    50: '#121212',
    100: '#1A1A1A',
    200: '#242424',
    300: '#2E2E2E',
    400: '#383838',
    500: '#424242',
  },
};

export const darkTheme = {
  name: 'dark' as const,
  isDark: true,

  colors: {
    // Background colors
    background: {
      primary: darkColors.bg[50],
      secondary: darkColors.bg[100],
      tertiary: darkColors.bg[200],
      inverse: colors.neutral[50],
    },

    // Surface colors (for cards, modals, etc.)
    surface: {
      default: darkColors.bg[100],
      elevated: darkColors.bg[200],
      sunken: darkColors.bg[0],
      overlay: 'rgba(0, 0, 0, 0.7)',
    },

    // Text colors
    text: {
      primary: colors.neutral[50],
      secondary: colors.neutral[300],
      tertiary: colors.neutral[400],
      disabled: colors.neutral[600],
      inverse: colors.neutral[900],
      link: colors.primary[400],
      linkHover: colors.primary[300],
    },

    // Border colors
    border: {
      default: darkColors.bg[400],
      subtle: darkColors.bg[300],
      strong: darkColors.bg[500],
      focus: colors.primary[400],
      divider: darkColors.bg[300],
    },

    // Icon colors
    icon: {
      primary: colors.neutral[200],
      secondary: colors.neutral[400],
      disabled: colors.neutral[600],
      inverse: colors.neutral[900],
    },

    // Status colors (slightly adjusted for dark mode)
    status: {
      success: {
        default: colors.success[400],
        subtle: 'rgba(16, 185, 129, 0.15)',
        text: colors.success[400],
        border: colors.success[500],
      },
      warning: {
        default: colors.warning[400],
        subtle: 'rgba(245, 158, 11, 0.15)',
        text: colors.warning[400],
        border: colors.warning[500],
      },
      error: {
        default: colors.error[400],
        subtle: 'rgba(239, 68, 68, 0.15)',
        text: colors.error[400],
        border: colors.error[500],
      },
      info: {
        default: colors.info[400],
        subtle: 'rgba(59, 130, 246, 0.15)',
        text: colors.info[400],
        border: colors.info[500],
      },
    },

    // Brand colors (adjusted for dark mode)
    brand: {
      primary: colors.primary[400],
      primaryHover: colors.primary[300],
      primaryActive: colors.primary[500],
      primarySubtle: 'rgba(0, 178, 178, 0.15)',
      secondary: colors.secondary[400],
      secondaryHover: colors.secondary[300],
      secondaryActive: colors.secondary[500],
      secondarySubtle: 'rgba(255, 149, 0, 0.15)',
    },

    // Component-specific colors
    components: {
      // Button
      button: {
        primary: {
          bg: colors.primary[500],
          bgHover: colors.primary[400],
          bgActive: colors.primary[600],
          text: colors.neutral[0],
        },
        secondary: {
          bg: 'transparent',
          bgHover: 'rgba(0, 178, 178, 0.15)',
          bgActive: 'rgba(0, 178, 178, 0.25)',
          text: colors.primary[400],
          border: colors.primary[500],
        },
        ghost: {
          bg: 'transparent',
          bgHover: darkColors.bg[300],
          bgActive: darkColors.bg[400],
          text: colors.neutral[200],
        },
      },
      // Input
      input: {
        bg: darkColors.bg[200],
        bgDisabled: darkColors.bg[100],
        border: darkColors.bg[400],
        borderHover: darkColors.bg[500],
        borderFocus: colors.primary[400],
        borderError: colors.error[400],
        text: colors.neutral[50],
        placeholder: colors.neutral[500],
      },
      // Card
      card: {
        bg: darkColors.bg[100],
        bgHover: darkColors.bg[200],
        border: darkColors.bg[300],
      },
      // Navigation
      navigation: {
        bg: darkColors.bg[100],
        bgActive: 'rgba(0, 178, 178, 0.15)',
        text: colors.neutral[400],
        textHover: colors.neutral[200],
        textActive: colors.primary[400],
        indicator: colors.primary[400],
      },
      // Sidebar
      sidebar: {
        bg: darkColors.bg[50],
        bgItem: 'transparent',
        bgItemHover: darkColors.bg[200],
        bgItemActive: 'rgba(0, 178, 178, 0.15)',
        text: colors.neutral[300],
        textActive: colors.primary[400],
      },
      // Header
      header: {
        bg: darkColors.bg[100],
        border: darkColors.bg[300],
      },
      // Table
      table: {
        headerBg: darkColors.bg[200],
        rowBg: darkColors.bg[100],
        rowBgHover: darkColors.bg[200],
        rowBgAlt: darkColors.bg[50],
        border: darkColors.bg[300],
      },
      // Modal
      modal: {
        bg: darkColors.bg[100],
        overlay: 'rgba(0, 0, 0, 0.75)',
      },
      // Tooltip
      tooltip: {
        bg: darkColors.bg[400],
        text: colors.neutral[50],
      },
    },
  },

  shadows: {
    none: shadows.none,
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    // Component shadows
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
    cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
    dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    button: shadows.none,
    buttonHover: '0 1px 3px 0 rgba(0, 0, 0, 0.4)',
  },

  focus: {
    ring: `0 0 0 2px ${colors.primary[400]}`,
    ringOffset: `0 0 0 2px ${darkColors.bg[100]}, 0 0 0 4px ${colors.primary[400]}`,
  },
} as const;

export type DarkTheme = typeof darkTheme;
