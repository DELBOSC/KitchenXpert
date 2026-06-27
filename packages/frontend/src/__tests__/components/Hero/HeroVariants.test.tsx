/**
 * Tests for HeroA/B/C — focus on the conversion tracking wired to the
 * two CTAs. The visual layout differences are out of scope (covered
 * by visual-regression Playwright). What we lock down here is that
 * a click on the "Essayer le designer" / "Créer un compte" links
 * fires the correct Plausible event with the variant joined in.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { HeroA, HeroB, HeroC } from '../../../components/Hero/HeroVariants';

// HeroVideo pulls in IntersectionObserver / Network Information API plumbing
// — irrelevant for a CTA-tracking unit test.
vi.mock('../../../components/Hero/HeroVideo', () => ({
  HeroVideo: () => <div data-testid="hero-video-stub" />,
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('HeroVariants — CTA tracking', () => {
  let plausibleSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    plausibleSpy = vi.fn();
    window.plausible = plausibleSpy;
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'kx-ab-hero') {
        return 'B';
      }
      return null;
    });
  });

  afterEach(() => {
    delete window.plausible;
  });

  it.each([
    ['HeroA', HeroA],
    ['HeroB', HeroB],
    ['HeroC', HeroC],
  ])('%s renders both CTAs', (_name, Component) => {
    renderWithRouter(<Component />);
    expect(screen.getByRole('link', { name: /essayer le designer/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /créer un compte/i })).toBeInTheDocument();
  });

  it('fires hero_cta_primary_click on "Essayer le designer" with current variant', () => {
    renderWithRouter(<HeroA />);

    const primary = screen.getByRole('link', { name: /essayer le designer/i });
    fireEvent.click(primary);

    expect(plausibleSpy).toHaveBeenCalledWith('hero_cta_primary_click', {
      props: { experiment: 'hero', variant: 'B' },
    });
  });

  it('fires hero_cta_secondary_click on "Créer un compte" with current variant', () => {
    renderWithRouter(<HeroA />);

    const secondary = screen.getByRole('link', { name: /créer un compte/i });
    fireEvent.click(secondary);

    expect(plausibleSpy).toHaveBeenCalledWith('hero_cta_secondary_click', {
      props: { experiment: 'hero', variant: 'B' },
    });
  });

  it('still navigates if plausible is unavailable (no-op)', () => {
    delete window.plausible;
    renderWithRouter(<HeroA />);

    const primary = screen.getByRole('link', { name: /essayer le designer/i });
    expect(() => fireEvent.click(primary)).not.toThrow();
  });
});
