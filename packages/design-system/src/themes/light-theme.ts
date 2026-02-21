/**
 * Light Theme
 * Default light theme for KitchenXpert Design System
 */

import { colors } from '../foundations/colors';
import { shadows } from '../foundations/elevation';

export const lightTheme = {
  name: 'light' as const,
  isDark: false,

  colors: {
    // Background colors
    background: {
      primary: colors.neutral[0],
      secondary: colors.neutral[50],
      tertiary: colors.neutral[100],
      inverse: colors.neutral[900],
    },

    // Surface colors (for cards, modals, etc.)
    surface: {
      default: colors.neutral[0],
      elevated: colors.neutral[0],
      sunken: colors.neutral[100],
      overlay: 'rgba(0, 0, 0, 0.5)',
    },

    // Text colors
    text: {
      primary: colors.neutral[900],
      secondary: colors.neutral[600],
      tertiary: colors.neutral[500],
      disabled: colors.neutral[400],
      inverse: colors.neutral[0],
      link: colors.primary[600],
      linkHover: colors.primary[700],
    },

    // Border colors
    border: {
      default: colors.neutral[200],
      subtle: colors.neutral[100],
      strong: colors.neutral[300],
      focus: colors.primary[500],
      divider: colors.neutral[200],
    },

    // Icon colors
    icon: {
      primary: colors.neutral[700],
      secondary: colors.neutral[500],
      disabled: colors.neutral[400],
      inverse: colors.neutral[0],
    },

    // Status colors
    status: {
      success: {
        default: colors.success[500],
        subtle: colors.success[50],
        text: colors.success[700],
        border: colors.success[500],
      },
      warning: {
        default: colors.warning[500],
        subtle: colors.warning[50],
        text: colors.warning[700],
        border: colors.warning[500],
      },
      error: {
        default: colors.error[500],
        subtle: colors.error[50],
        text: colors.error[700],
        border: colors.error[500],
      },
      info: {
        default: colors.info[500],
        subtle: colors.info[50],
        text: colors.info[700],
        border: colors.info[500],
      },
    },

    // Brand colors
    brand: {
      primary: colors.primary[500],
      primaryHover: colors.primary[600],
      primaryActive: colors.primary[700],
      primarySubtle: colors.primary[50],
      secondary: colors.secondary[500],
      secondaryHover: colors.secondary[600],
      secondaryActive: colors.secondary[700],
      secondarySubtle: colors.secondary[50],
    },

    // Component-specific colors
    components: {
      // Button
      button: {
        primary: {
          bg: colors.primary[500],
          bgHover: colors.primary[600],
          bgActive: colors.primary[700],
          text: colors.neutral[0],
        },
        secondary: {
          bg: 'transparent',
          bgHover: colors.primary[50],
          bgActive: colors.primary[100],
          text: colors.primary[600],
          border: colors.primary[500],
        },
        ghost: {
          bg: 'transparent',
          bgHover: colors.neutral[100],
          bgActive: colors.neutral[200],
          text: colors.neutral[700],
        },
      },
      // Input
      input: {
        bg: colors.neutral[0],
        bgDisabled: colors.neutral[100],
        border: colors.neutral[300],
        borderHover: colors.neutral[400],
        borderFocus: colors.primary[500],
        borderError: colors.error[500],
        text: colors.neutral[900],
        placeholder: colors.neutral[400],
      },
      // Card
      card: {
        bg: colors.neutral[0],
        bgHover: colors.neutral[50],
        border: colors.neutral[200],
      },
      // Navigation
      navigation: {
        bg: colors.neutral[0],
        bgActive: colors.primary[50],
        text: colors.neutral[600],
        textHover: colors.neutral[900],
        textActive: colors.primary[600],
        indicator: colors.primary[500],
      },
      // Sidebar
      sidebar: {
        bg: colors.neutral[50],
        bgItem: 'transparent',
        bgItemHover: colors.neutral[100],
        bgItemActive: colors.primary[50],
        text: colors.neutral[700],
        textActive: colors.primary[700],
      },
      // Header
      header: {
        bg: colors.neutral[0],
        border: colors.neutral[200],
      },
      // Table
      table: {
        headerBg: colors.neutral[50],
        rowBg: colors.neutral[0],
        rowBgHover: colors.neutral[50],
        rowBgAlt: '#FCFCFD', // Slightly different from rowBg for zebra striping
        border: colors.neutral[200],
      },
      // Modal
      modal: {
        bg: colors.neutral[0],
        overlay: 'rgba(0, 0, 0, 0.5)',
      },
      // Tooltip
      tooltip: {
        bg: colors.neutral[800],
        text: colors.neutral[0],
      },
    },
  },

  shadows: {
    none: shadows.none,
    xs: shadows.xs,
    sm: shadows.sm,
    md: shadows.md,
    lg: shadows.lg,
    xl: shadows.xl,
    '2xl': shadows['2xl'],
    inner: shadows.inner,
    // Component shadows
    card: shadows.sm,
    cardHover: shadows.md,
    dropdown: shadows.lg,
    modal: shadows['2xl'],
    button: shadows.none,
    buttonHover: shadows.sm,
  },

  focus: {
    ring: `0 0 0 2px ${colors.primary[500]}`,
    ringOffset: `0 0 0 2px ${colors.neutral[0]}, 0 0 0 4px ${colors.primary[500]}`,
  },
} as const;

export type LightTheme = typeof lightTheme;
export type ThemeColors = typeof lightTheme.colors;
export type ThemeShadows = typeof lightTheme.shadows;
