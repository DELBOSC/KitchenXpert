import { twMerge } from 'tailwind-merge';

/**
 * Class-joining helper with Tailwind conflict resolution. Filters falsy parts,
 * then runs the result through `twMerge` so a later class WINS over an earlier
 * one of the same family (e.g. `cn('rounded-2xl', 'rounded-xl') → 'rounded-xl'`)
 * — this is what makes §4 "extend a primitive by props" actually work: a
 * call-site `className` now overrides the primitive's baked classes instead of
 * merely being appended (the old `join(' ')` left both and let CSS source-order
 * decide). Same signature as before; `clsx` is unnecessary — the variadic
 * falsy-filter already covers it. Blast radius audited in #233 (1 intended
 * change: CatalogPage sort Select) and netted by `primitives-visual` (#234).
 */
export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return twMerge(parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' '));
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
