/**
 * Minimal class-joining helper. Not as powerful as clsx+tailwind-merge but
 * zero-dependency — we keep the bundle slim. If later we need conflict
 * resolution, swap in tailwind-merge behind the same signature.
 */
export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}

/**
 * Framer Motion shared variants. Pages compose these rather than re-defining
 * durations and easings everywhere, so motion stays coherent.
 */
export const motionEase = [0.16, 1, 0.3, 1] as const;

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: motionEase },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: motionEase },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.2, ease: motionEase },
};

export const stagger = (children = 0.05): { staggerChildren: number } => ({
  staggerChildren: children,
});
