/**
 * Tests for tagConversion — the bridge that lets Plausible slice the
 * Hero A/B funnel by variant. Reads the variant from localStorage
 * (key `kx-ab-hero`) and emits a custom Plausible event with
 * `{ experiment, variant }` props.
 *
 * The variant assignment + sticky behavior of `useABVariant` itself is
 * not re-tested here — it's exercised indirectly via the HomePage
 * integration test.
 */

import { vi } from 'vitest';

import { tagConversion } from '../../hooks/useABVariant';

describe('tagConversion', () => {
  let plausibleSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    plausibleSpy = vi.fn();
    window.plausible = plausibleSpy;
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'kx-ab-hero') {return 'B';}
      return null;
    });
  });

  afterEach(() => {
    delete window.plausible;
  });

  it('emits the event with the variant read from localStorage', () => {
    tagConversion('hero', 'hero_cta_primary_click');

    expect(plausibleSpy).toHaveBeenCalledTimes(1);
    expect(plausibleSpy).toHaveBeenCalledWith('hero_cta_primary_click', {
      props: { experiment: 'hero', variant: 'B' },
    });
  });

  it("falls back to 'unknown' when no variant is stored", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    tagConversion('hero', 'sandbox_signup_intent_ab');

    expect(plausibleSpy).toHaveBeenCalledWith('sandbox_signup_intent_ab', {
      props: { experiment: 'hero', variant: 'unknown' },
    });
  });

  it('is a no-op when plausible is not loaded', () => {
    delete window.plausible;

    expect(() => tagConversion('hero', 'sandbox_signup_completed_ab')).not.toThrow();
  });

  it('swallows localStorage errors and still emits with unknown', () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error('private browsing');
    });

    tagConversion('hero', 'hero_cta_secondary_click');

    expect(plausibleSpy).toHaveBeenCalledWith('hero_cta_secondary_click', {
      props: { experiment: 'hero', variant: 'unknown' },
    });
  });
});
