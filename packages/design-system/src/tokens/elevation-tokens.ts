/**
 * Elevation Tokens
 * Semantic elevation tokens for depth and layering
 */

import { shadows, zIndices, focusRings } from '../foundations/elevation';

/**
 * Surface elevation tokens
 * Higher levels = more elevated above the base surface
 */
export const surfaceElevationTokens = {
  // Level 0 - Base surface (page background)
  base: {
    shadow: shadows.none,
    zIndex: zIndices.base,
  },
  // Level 1 - Slightly raised (cards, containers)
  raised: {
    shadow: shadows.sm,
    zIndex: zIndices.base,
  },
  // Level 2 - Floating elements (dropdown menus)
  floating: {
    shadow: shadows.md,
    zIndex: zIndices.dropdown,
  },
  // Level 3 - Overlay elements (modals, dialogs)
  overlay: {
    shadow: shadows.lg,
    zIndex: zIndices.modal,
  },
  // Level 4 - Top layer (tooltips, toasts)
  top: {
    shadow: shadows.xl,
    zIndex: zIndices.tooltip,
  },
} as const;

/**
 * Component-specific elevation tokens
 */
export const componentElevationTokens = {
  // Card elevations
  card: {
    default: {
      shadow: shadows.sm,
      shadowHover: shadows.md,
    },
    elevated: {
      shadow: shadows.md,
      shadowHover: shadows.lg,
    },
    flat: {
      shadow: shadows.none,
      shadowHover: shadows.sm,
    },
  },
  // Button elevations
  button: {
    default: {
      shadow: shadows.none,
      shadowHover: shadows.sm,
      shadowActive: shadows.none,
    },
    raised: {
      shadow: shadows.sm,
      shadowHover: shadows.md,
      shadowActive: shadows.xs,
    },
  },
  // Input elevations
  input: {
    default: {
      shadow: shadows.none,
      shadowFocus: shadows.none,
    },
    elevated: {
      shadow: shadows.xs,
      shadowFocus: shadows.sm,
    },
  },
  // Dropdown/popover elevations
  dropdown: {
    shadow: shadows.lg,
    zIndex: zIndices.dropdown,
  },
  // Modal elevations
  modal: {
    shadow: shadows['2xl'],
    zIndex: zIndices.modal,
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
  // Toast elevations
  toast: {
    shadow: shadows.lg,
    zIndex: zIndices.toast,
  },
  // Tooltip elevations
  tooltip: {
    shadow: shadows.md,
    zIndex: zIndices.tooltip,
  },
  // Sidebar elevations
  sidebar: {
    shadow: shadows.lg,
    zIndex: zIndices.docked,
  },
  // Header elevations
  header: {
    default: {
      shadow: shadows.none,
    },
    scrolled: {
      shadow: shadows.md,
    },
    sticky: {
      shadow: shadows.sm,
      zIndex: zIndices.sticky,
    },
  },
} as const;

/**
 * Focus ring tokens
 */
export const focusTokens = {
  // Default focus ring
  default: {
    ring: focusRings.default,
    offset: '2px',
    width: '2px',
  },
  // Focus with offset (for elements with backgrounds)
  offset: {
    ring: focusRings.offset,
    offset: '2px',
    width: '2px',
  },
  // Error state focus
  error: {
    ring: focusRings.error,
    offset: '2px',
    width: '2px',
  },
  // Success state focus
  success: {
    ring: focusRings.success,
    offset: '2px',
    width: '2px',
  },
  // Inset focus (for inputs)
  inset: {
    ring: 'inset 0 0 0 2px var(--focus-color, #00B2B2)',
    offset: '0',
    width: '2px',
  },
} as const;

/**
 * Z-index tokens by use case
 */
export const zIndexTokens = {
  // Structural
  base: zIndices.base,
  below: zIndices.hide,

  // Fixed/Sticky elements
  sticky: zIndices.sticky,
  fixed: zIndices.sticky,
  docked: zIndices.docked,

  // Overlays
  dropdown: zIndices.dropdown,
  overlay: zIndices.overlay,
  modal: zIndices.modal,
  popover: zIndices.popover,

  // Notifications
  toast: zIndices.toast,
  tooltip: zIndices.tooltip,

  // Accessibility
  skipLink: zIndices.skipLink,
} as const;

/**
 * Shadow utility tokens
 */
export const shadowTokens = {
  // Neutral shadows
  none: shadows.none,
  xs: shadows.xs,
  sm: shadows.sm,
  md: shadows.md,
  lg: shadows.lg,
  xl: shadows.xl,
  '2xl': shadows['2xl'],
  inner: shadows.inner,

  // Interactive state shadows
  hover: shadows.md,
  active: shadows.sm,
  focus: focusRings.default,
} as const;

// Types
export type SurfaceElevation = keyof typeof surfaceElevationTokens;
export type ComponentElevation = keyof typeof componentElevationTokens;
export type FocusToken = keyof typeof focusTokens;
export type ZIndexToken = keyof typeof zIndexTokens;
export type ShadowToken = keyof typeof shadowTokens;

// Combined export
export const elevationTokens = {
  surface: surfaceElevationTokens,
  component: componentElevationTokens,
  focus: focusTokens,
  zIndex: zIndexTokens,
  shadow: shadowTokens,
} as const;

export type ElevationTokens = typeof elevationTokens;
