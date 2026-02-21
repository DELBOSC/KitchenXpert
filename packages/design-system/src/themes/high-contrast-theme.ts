/**
 * High Contrast Theme
 * Accessibility-focused high contrast theme for KitchenXpert Design System
 * Follows WCAG AAA guidelines for contrast ratios
 */

import { shadows } from '../foundations/elevation';

// High contrast specific colors
const hcColors = {
  // Pure black and white for maximum contrast
  black: '#000000',
  white: '#FFFFFF',

  // High contrast accent colors
  primary: '#00E5E5', // Bright cyan for visibility
  secondary: '#FF8C00', // Bright orange

  // Status colors - highly saturated for visibility
  success: '#00FF00', // Pure green
  warning: '#FFD700', // Gold/yellow
  error: '#FF0000', // Pure red
  info: '#00BFFF', // Deep sky blue

  // Links
  link: '#00FFFF', // Cyan
  linkVisited: '#EE82EE', // Violet
};

export const highContrastTheme = {
  name: 'high-contrast' as const,
  isDark: true,
  isHighContrast: true,

  colors: {
    // Background colors - pure black
    background: {
      primary: hcColors.black,
      secondary: hcColors.black,
      tertiary: '#0A0A0A',
      inverse: hcColors.white,
    },

    // Surface colors
    surface: {
      default: hcColors.black,
      elevated: '#0A0A0A',
      sunken: hcColors.black,
      overlay: 'rgba(0, 0, 0, 0.9)',
    },

    // Text colors - pure white for maximum contrast
    text: {
      primary: hcColors.white,
      secondary: hcColors.white,
      tertiary: '#E0E0E0',
      disabled: '#808080',
      inverse: hcColors.black,
      link: hcColors.link,
      linkHover: hcColors.white,
    },

    // Border colors - white for visibility
    border: {
      default: hcColors.white,
      subtle: '#808080',
      strong: hcColors.white,
      focus: hcColors.primary,
      divider: hcColors.white,
    },

    // Icon colors
    icon: {
      primary: hcColors.white,
      secondary: hcColors.white,
      disabled: '#808080',
      inverse: hcColors.black,
    },

    // Status colors - highly visible
    status: {
      success: {
        default: hcColors.success,
        subtle: hcColors.black,
        text: hcColors.success,
        border: hcColors.success,
      },
      warning: {
        default: hcColors.warning,
        subtle: hcColors.black,
        text: hcColors.warning,
        border: hcColors.warning,
      },
      error: {
        default: hcColors.error,
        subtle: hcColors.black,
        text: hcColors.error,
        border: hcColors.error,
      },
      info: {
        default: hcColors.info,
        subtle: hcColors.black,
        text: hcColors.info,
        border: hcColors.info,
      },
    },

    // Brand colors
    brand: {
      primary: hcColors.primary,
      primaryHover: hcColors.white,
      primaryActive: hcColors.primary,
      primarySubtle: hcColors.black,
      secondary: hcColors.secondary,
      secondaryHover: hcColors.white,
      secondaryActive: hcColors.secondary,
      secondarySubtle: hcColors.black,
    },

    // Component-specific colors
    components: {
      // Button - high contrast with clear borders
      button: {
        primary: {
          bg: hcColors.primary,
          bgHover: hcColors.white,
          bgActive: hcColors.primary,
          text: hcColors.black,
        },
        secondary: {
          bg: hcColors.black,
          bgHover: hcColors.white,
          bgActive: hcColors.black,
          text: hcColors.white,
          border: hcColors.white,
        },
        ghost: {
          bg: 'transparent',
          bgHover: hcColors.white,
          bgActive: 'transparent',
          text: hcColors.white,
        },
      },
      // Input
      input: {
        bg: hcColors.black,
        bgDisabled: '#1A1A1A',
        border: hcColors.white,
        borderHover: hcColors.primary,
        borderFocus: hcColors.primary,
        borderError: hcColors.error,
        text: hcColors.white,
        placeholder: '#808080',
      },
      // Card
      card: {
        bg: hcColors.black,
        bgHover: '#0A0A0A',
        border: hcColors.white,
      },
      // Navigation
      navigation: {
        bg: hcColors.black,
        bgActive: hcColors.primary,
        text: hcColors.white,
        textHover: hcColors.primary,
        textActive: hcColors.black,
        indicator: hcColors.primary,
      },
      // Sidebar
      sidebar: {
        bg: hcColors.black,
        bgItem: 'transparent',
        bgItemHover: hcColors.white,
        bgItemActive: hcColors.primary,
        text: hcColors.white,
        textActive: hcColors.black,
      },
      // Header
      header: {
        bg: hcColors.black,
        border: hcColors.white,
      },
      // Table
      table: {
        headerBg: '#1A1A1A',
        rowBg: hcColors.black,
        rowBgHover: '#1A1A1A',
        rowBgAlt: '#0A0A0A',
        border: hcColors.white,
      },
      // Modal
      modal: {
        bg: hcColors.black,
        overlay: 'rgba(0, 0, 0, 0.95)',
      },
      // Tooltip
      tooltip: {
        bg: hcColors.white,
        text: hcColors.black,
      },
    },
  },

  shadows: {
    // Minimal shadows - rely on borders instead
    none: shadows.none,
    xs: shadows.none,
    sm: shadows.none,
    md: shadows.none,
    lg: shadows.none,
    xl: shadows.none,
    '2xl': shadows.none,
    inner: shadows.none,
    // Component shadows - none for high contrast
    card: shadows.none,
    cardHover: shadows.none,
    dropdown: shadows.none,
    modal: shadows.none,
    button: shadows.none,
    buttonHover: shadows.none,
  },

  focus: {
    // Extra thick focus ring for visibility
    ring: `0 0 0 3px ${hcColors.primary}`,
    ringOffset: `0 0 0 3px ${hcColors.black}, 0 0 0 6px ${hcColors.primary}`,
  },

  // Additional accessibility features
  accessibility: {
    // Force all text to be bold for readability
    fontWeightMin: 500,
    // Increased text size
    fontSizeMin: '16px',
    // Underline all links
    linkUnderline: true,
    // Show focus indicators always
    alwaysShowFocus: true,
    // Disable animations
    reduceMotion: true,
  },
} as const;

export type HighContrastTheme = typeof highContrastTheme;
