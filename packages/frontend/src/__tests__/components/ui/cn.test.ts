import { describe, it, expect } from 'vitest';

import { cn } from '../../../components/ui/_utils';

/**
 * `cn()` now runs its result through tailwind-merge (swap from the old additive
 * `join(' ')`, CLAUDE.md §11 P2). These tests lock the two behaviours that make
 * §4 "extend a primitive by props" work: (1) a later class of the same Tailwind
 * family WINS over an earlier one (so a call-site className overrides a baked
 * class), and (2) non-conflicting classes are all preserved, falsy parts dropped.
 */
describe('cn (tailwind-merge)', () => {
  it('resolves a same-family conflict — the later class wins', () => {
    // The canonical Card case: a call-site `rounded-xl` overrides the baked `rounded-2xl`.
    expect(cn('rounded-2xl', 'rounded-xl')).toBe('rounded-xl');
  });

  it('keeps non-conflicting classes (different families compose)', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('filters falsy parts (same variadic contract as before)', () => {
    expect(cn('a', false, null, undefined, 0, 'b')).toBe('a b');
  });

  it('resolves the CatalogPage Select case — h/w override the baked values', () => {
    // Baked `h-11 w-full` + call-site `h-9 w-auto` → the call-site wins on both,
    // which is why the `!important` on `h-9` is no longer needed after the swap.
    expect(cn('h-11 w-full appearance-none rounded-xl', 'h-9 w-auto')).toBe(
      'appearance-none rounded-xl h-9 w-auto'
    );
  });
});
