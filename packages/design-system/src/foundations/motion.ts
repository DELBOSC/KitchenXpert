/**
 * Motion Foundations
 * KitchenXpert Design System - Animation timing and easing
 */

// Duration values in milliseconds
export const durations = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
  // Specific use cases
  tooltip: '150ms',
  modal: '300ms',
  page: '400ms',
  skeleton: '1500ms',
} as const;

// Duration values as numbers (for JS animations)
export const durationValues = {
  instant: 0,
  fastest: 50,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
  tooltip: 150,
  modal: 300,
  page: 400,
  skeleton: 1500,
} as const;

// Easing functions (CSS timing functions)
export const easings = {
  // Standard easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom cubic-bezier easings
  // Smooth and natural
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Deceleration - elements entering screen
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',

  // Acceleration - elements leaving screen
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',

  // Sharp - quick transitions
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',

  // Spring-like bounce
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Elastic effect
  elastic: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',

  // Anticipation (slight pullback before motion)
  anticipate: 'cubic-bezier(0.38, -0.4, 0.88, 0.65)',
} as const;

// Pre-defined animation keyframes (as CSS strings)
export const keyframes = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  fadeOut: `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
  slideInUp: `
    @keyframes slideInUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  slideInDown: `
    @keyframes slideInDown {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  slideInLeft: `
    @keyframes slideInLeft {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
  slideInRight: `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `,
  scaleIn: `
    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
  scaleOut: `
    @keyframes scaleOut {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.95); opacity: 0; }
    }
  `,
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  bounce: `
    @keyframes bounce {
      0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
      50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
    }
  `,
  shake: `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
  `,
  skeleton: `
    @keyframes skeleton {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `,
} as const;

// Pre-composed animations
export const animations = {
  fadeIn: `fadeIn ${durations.normal} ${easings.smooth}`,
  fadeOut: `fadeOut ${durations.normal} ${easings.smooth}`,
  slideInUp: `slideInUp ${durations.slow} ${easings.decelerate}`,
  slideInDown: `slideInDown ${durations.slow} ${easings.decelerate}`,
  slideInLeft: `slideInLeft ${durations.slow} ${easings.decelerate}`,
  slideInRight: `slideInRight ${durations.slow} ${easings.decelerate}`,
  scaleIn: `scaleIn ${durations.normal} ${easings.smooth}`,
  scaleOut: `scaleOut ${durations.normal} ${easings.smooth}`,
  spin: `spin 1s ${easings.linear} infinite`,
  pulse: `pulse 2s ${easings.easeInOut} infinite`,
  bounce: `bounce 1s infinite`,
  shake: `shake ${durations.slower} ${easings.easeInOut}`,
  skeleton: `skeleton ${durations.skeleton} ${easings.linear} infinite`,
} as const;

// Transition presets
export const transitions = {
  none: 'none',
  all: `all ${durations.normal} ${easings.smooth}`,
  colors: `color ${durations.fast} ${easings.smooth}, background-color ${durations.fast} ${easings.smooth}, border-color ${durations.fast} ${easings.smooth}`,
  opacity: `opacity ${durations.normal} ${easings.smooth}`,
  shadow: `box-shadow ${durations.normal} ${easings.smooth}`,
  transform: `transform ${durations.normal} ${easings.smooth}`,
} as const;

// Types
export type Duration = keyof typeof durations;
export type DurationValue = (typeof durationValues)[Duration];
export type Easing = keyof typeof easings;
export type Animation = keyof typeof animations;
export type Transition = keyof typeof transitions;

// Utility function to create custom transition
export function createTransition(
  properties: string | string[],
  duration: Duration = 'normal',
  easing: Easing = 'smooth'
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  return props.map((prop) => `${prop} ${durations[duration]} ${easings[easing]}`).join(', ');
}

// Combined motion export
export const motion = {
  durations,
  durationValues,
  easings,
  keyframes,
  animations,
  transitions,
} as const;

export type Motion = typeof motion;
