/**
 * Motion Tokens
 * Semantic animation and transition tokens
 */

import { durations, durationValues, easings, animations } from '../foundations/motion';

/**
 * Transition tokens by interaction type
 */
export const transitionTokens = {
  // Micro-interactions (hover, focus)
  micro: {
    fast: {
      duration: durations.fast,
      easing: easings.smooth,
      css: `${durations.fast} ${easings.smooth}`,
    },
    normal: {
      duration: durations.normal,
      easing: easings.smooth,
      css: `${durations.normal} ${easings.smooth}`,
    },
  },
  // State changes (toggle, select)
  state: {
    enter: {
      duration: durations.normal,
      easing: easings.decelerate,
      css: `${durations.normal} ${easings.decelerate}`,
    },
    exit: {
      duration: durations.fast,
      easing: easings.accelerate,
      css: `${durations.fast} ${easings.accelerate}`,
    },
  },
  // Page/view transitions
  page: {
    enter: {
      duration: durations.slow,
      easing: easings.decelerate,
      css: `${durations.slow} ${easings.decelerate}`,
    },
    exit: {
      duration: durations.normal,
      easing: easings.accelerate,
      css: `${durations.normal} ${easings.accelerate}`,
    },
  },
  // Modal/overlay transitions
  overlay: {
    enter: {
      duration: durations.slow,
      easing: easings.decelerate,
      css: `${durations.slow} ${easings.decelerate}`,
    },
    exit: {
      duration: durations.normal,
      easing: easings.accelerate,
      css: `${durations.normal} ${easings.accelerate}`,
    },
  },
} as const;

/**
 * Animation tokens by component type
 */
export const animationTokens = {
  // Fade animations
  fade: {
    in: {
      name: 'fadeIn',
      duration: durationValues.normal,
      easing: easings.smooth,
      css: animations.fadeIn,
    },
    out: {
      name: 'fadeOut',
      duration: durationValues.normal,
      easing: easings.smooth,
      css: animations.fadeOut,
    },
  },
  // Slide animations
  slide: {
    inUp: {
      name: 'slideInUp',
      duration: durationValues.slow,
      easing: easings.decelerate,
      css: animations.slideInUp,
    },
    inDown: {
      name: 'slideInDown',
      duration: durationValues.slow,
      easing: easings.decelerate,
      css: animations.slideInDown,
    },
    inLeft: {
      name: 'slideInLeft',
      duration: durationValues.slow,
      easing: easings.decelerate,
      css: animations.slideInLeft,
    },
    inRight: {
      name: 'slideInRight',
      duration: durationValues.slow,
      easing: easings.decelerate,
      css: animations.slideInRight,
    },
  },
  // Scale animations
  scale: {
    in: {
      name: 'scaleIn',
      duration: durationValues.normal,
      easing: easings.smooth,
      css: animations.scaleIn,
    },
    out: {
      name: 'scaleOut',
      duration: durationValues.normal,
      easing: easings.smooth,
      css: animations.scaleOut,
    },
  },
  // Loading animations
  loading: {
    spin: {
      name: 'spin',
      duration: 1000,
      easing: easings.linear,
      css: animations.spin,
    },
    pulse: {
      name: 'pulse',
      duration: 2000,
      easing: easings.easeInOut,
      css: animations.pulse,
    },
    skeleton: {
      name: 'skeleton',
      duration: durationValues.skeleton,
      easing: easings.linear,
      css: animations.skeleton,
    },
  },
  // Feedback animations
  feedback: {
    bounce: {
      name: 'bounce',
      duration: 1000,
      easing: easings.bounce,
      css: animations.bounce,
    },
    shake: {
      name: 'shake',
      duration: durationValues.slower,
      easing: easings.easeInOut,
      css: animations.shake,
    },
  },
} as const;

/**
 * Component-specific motion tokens
 */
export const componentMotionTokens = {
  // Button motion
  button: {
    hover: {
      transform: 'translateY(-1px)',
      transition: `transform ${durations.fast} ${easings.smooth}`,
    },
    active: {
      transform: 'translateY(0) scale(0.98)',
      transition: `transform ${durations.fastest} ${easings.sharp}`,
    },
  },
  // Card motion
  card: {
    hover: {
      transform: 'translateY(-2px)',
      transition: `transform ${durations.normal} ${easings.smooth}, box-shadow ${durations.normal} ${easings.smooth}`,
    },
  },
  // Modal motion
  modal: {
    enter: {
      backdrop: `opacity ${durations.slow} ${easings.smooth}`,
      content: animations.scaleIn,
    },
    exit: {
      backdrop: `opacity ${durations.normal} ${easings.smooth}`,
      content: animations.scaleOut,
    },
  },
  // Dropdown motion
  dropdown: {
    enter: {
      animation: `scaleIn ${durations.fast} ${easings.decelerate}`,
      transformOrigin: 'top',
    },
    exit: {
      animation: `scaleOut ${durations.faster} ${easings.accelerate}`,
      transformOrigin: 'top',
    },
  },
  // Toast motion
  toast: {
    enter: {
      animation: animations.slideInRight,
    },
    exit: {
      animation: `fadeOut ${durations.fast} ${easings.accelerate}`,
    },
  },
  // Tooltip motion
  tooltip: {
    enter: {
      animation: `fadeIn ${durations.tooltip} ${easings.smooth}`,
    },
    exit: {
      animation: `fadeOut ${durations.faster} ${easings.smooth}`,
    },
  },
  // Sidebar motion
  sidebar: {
    expand: {
      transition: `width ${durations.slow} ${easings.smooth}`,
    },
    collapse: {
      transition: `width ${durations.normal} ${easings.smooth}`,
    },
  },
  // Accordion motion
  accordion: {
    expand: {
      transition: `height ${durations.slow} ${easings.smooth}, opacity ${durations.normal} ${easings.smooth}`,
    },
    collapse: {
      transition: `height ${durations.normal} ${easings.smooth}, opacity ${durations.fast} ${easings.smooth}`,
    },
  },
} as const;

/**
 * Reduced motion alternatives
 * For users who prefer reduced motion
 */
export const reducedMotionTokens = {
  transition: {
    duration: durations.instant,
    easing: easings.linear,
    css: 'none',
  },
  animation: {
    duration: 0,
    iterations: 1,
    css: 'none',
  },
} as const;

// Types
export type TransitionToken = keyof typeof transitionTokens;
export type AnimationToken = keyof typeof animationTokens;
export type ComponentMotionToken = keyof typeof componentMotionTokens;

// Combined export
export const motionTokens = {
  transition: transitionTokens,
  animation: animationTokens,
  component: componentMotionTokens,
  reducedMotion: reducedMotionTokens,
} as const;

export type MotionTokens = typeof motionTokens;
