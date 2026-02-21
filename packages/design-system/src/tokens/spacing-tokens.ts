/**
 * Spacing Tokens
 * Semantic spacing tokens for consistent layouts and component sizing
 */

import { spacing, radii, gaps } from '../foundations/spacing';

/**
 * Component padding tokens
 */
export const paddingTokens = {
  // Button padding
  button: {
    sm: {
      x: spacing[3],  // 12px
      y: spacing[1.5], // 6px
    },
    md: {
      x: spacing[4],  // 16px
      y: spacing[2],  // 8px
    },
    lg: {
      x: spacing[6],  // 24px
      y: spacing[3],  // 12px
    },
    xl: {
      x: spacing[8],  // 32px
      y: spacing[4],  // 16px
    },
  },
  // Input padding
  input: {
    sm: {
      x: spacing[2],  // 8px
      y: spacing[1.5], // 6px
    },
    md: {
      x: spacing[3],  // 12px
      y: spacing[2],  // 8px
    },
    lg: {
      x: spacing[4],  // 16px
      y: spacing[3],  // 12px
    },
  },
  // Card padding
  card: {
    sm: spacing[3],   // 12px
    md: spacing[4],   // 16px
    lg: spacing[6],   // 24px
    xl: spacing[8],   // 32px
  },
  // Modal padding
  modal: {
    header: spacing[6],
    body: spacing[6],
    footer: spacing[4],
  },
  // Page/container padding
  page: {
    x: {
      mobile: spacing[4],   // 16px
      tablet: spacing[6],   // 24px
      desktop: spacing[8],  // 32px
    },
    y: {
      sm: spacing[4],  // 16px
      md: spacing[8],  // 32px
      lg: spacing[12], // 48px
    },
  },
  // Section padding
  section: {
    sm: spacing[8],   // 32px
    md: spacing[12],  // 48px
    lg: spacing[16],  // 64px
    xl: spacing[24],  // 96px
  },
} as const;

/**
 * Component margin tokens
 */
export const marginTokens = {
  // Stack spacing (vertical)
  stack: {
    xs: spacing[1],   // 4px
    sm: spacing[2],   // 8px
    md: spacing[4],   // 16px
    lg: spacing[6],   // 24px
    xl: spacing[8],   // 32px
  },
  // Inline spacing (horizontal)
  inline: {
    xs: spacing[1],   // 4px
    sm: spacing[2],   // 8px
    md: spacing[3],   // 12px
    lg: spacing[4],   // 16px
    xl: spacing[6],   // 24px
  },
  // Form element spacing
  form: {
    field: spacing[5],  // 20px between fields
    group: spacing[8],  // 32px between groups
    section: spacing[10], // 40px between sections
  },
} as const;

/**
 * Gap tokens (for flex/grid)
 */
export const gapTokens = {
  // Grid gaps
  grid: {
    xs: gaps.xs,    // 4px
    sm: gaps.sm,    // 8px
    md: gaps.md,    // 16px
    lg: gaps.lg,    // 24px
    xl: gaps.xl,    // 32px
  },
  // Card grid
  cardGrid: {
    mobile: gaps.md,   // 16px
    tablet: gaps.lg,   // 24px
    desktop: gaps.xl,  // 32px
  },
  // Form gaps
  form: {
    inline: spacing[3],  // 12px
    stack: spacing[4],   // 16px
  },
  // Navigation gaps
  navigation: {
    items: spacing[1],   // 4px
    sections: spacing[4], // 16px
  },
} as const;

/**
 * Border radius tokens
 */
export const radiusTokens = {
  // Component radii
  button: {
    sm: radii.md,      // 6px
    md: radii.lg,      // 8px
    lg: radii.xl,      // 12px
    full: radii.full,  // pill shape
  },
  input: {
    sm: radii.default, // 4px
    md: radii.md,      // 6px
    lg: radii.lg,      // 8px
  },
  card: {
    sm: radii.lg,      // 8px
    md: radii.xl,      // 12px
    lg: radii['2xl'],  // 16px
  },
  modal: radii['2xl'],  // 16px
  tooltip: radii.md,    // 6px
  badge: radii.full,    // pill
  avatar: radii.full,   // circle
  // Global
  none: radii.none,
  sm: radii.sm,
  md: radii.md,
  lg: radii.lg,
  xl: radii.xl,
  full: radii.full,
} as const;

/**
 * Size tokens (width/height)
 */
export const sizeTokens = {
  // Icon sizes
  icon: {
    xs: spacing[3],   // 12px
    sm: spacing[4],   // 16px
    md: spacing[5],   // 20px
    lg: spacing[6],   // 24px
    xl: spacing[8],   // 32px
  },
  // Avatar sizes
  avatar: {
    xs: spacing[6],   // 24px
    sm: spacing[8],   // 32px
    md: spacing[10],  // 40px
    lg: spacing[12],  // 48px
    xl: spacing[16],  // 64px
  },
  // Button heights
  button: {
    sm: spacing[8],   // 32px
    md: spacing[10],  // 40px
    lg: spacing[12],  // 48px
    xl: spacing[14],  // 56px
  },
  // Input heights
  input: {
    sm: spacing[8],   // 32px
    md: spacing[10],  // 40px
    lg: spacing[12],  // 48px
  },
  // Touch targets (minimum)
  touchTarget: {
    min: spacing[11], // 44px (accessibility minimum)
    comfortable: spacing[12], // 48px
  },
  // Modal widths
  modal: {
    sm: '400px',
    md: '560px',
    lg: '720px',
    xl: '960px',
    full: '100%',
  },
  // Sidebar width
  sidebar: {
    collapsed: spacing[16], // 64px
    expanded: '280px',
    wide: '320px',
  },
  // Container max-widths
  container: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  },
} as const;

// Types
export type PaddingToken = typeof paddingTokens;
export type MarginToken = typeof marginTokens;
export type GapToken = typeof gapTokens;
export type RadiusToken = typeof radiusTokens;
export type SizeToken = typeof sizeTokens;

// Combined export
export const spacingTokens = {
  padding: paddingTokens,
  margin: marginTokens,
  gap: gapTokens,
  radius: radiusTokens,
  size: sizeTokens,
} as const;

export type SpacingTokens = typeof spacingTokens;
