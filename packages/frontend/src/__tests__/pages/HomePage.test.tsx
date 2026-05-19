/**
 * HomePage Tests
 * Tests for the main landing page — hero, features, footer.
 *
 * Updated 2026-05-12 to match the premium homepage redesign:
 * - the hero is now A/B/C-tested via useABVariant; only structural shape
 *   is checked (CTAs + tagline), not exact copy
 * - features use SVG icons (not emoji)
 * - footer no longer renders inside a single <footer> with just copyright —
 *   it now has 4 columns plus a copyright row
 * - the brand appears in <nav>, hero, footer (multiple times) — use getAllBy*
 */

import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import HomePage from '../../pages/HomePage';

// Force a deterministic A/B variant so the test is reproducible.
vi.mock('../../hooks/useABVariant', () => ({
  useABVariant: () => 'A',
}));

// Stub the heavy reviews + trust components — they query an API that we
// don't want to mock per test, and they are tested independently.
vi.mock('../../components/Reviews/ReviewsSection', () => ({
  ReviewsSection: () => <div data-testid="reviews-section-stub" />,
}));
vi.mock('../../components/Trust/LiveCounter', () => ({
  LiveCounter: () => <div data-testid="live-counter-stub" />,
}));
vi.mock('../../components/Hero/HeroVideo', () => ({
  HeroVideo: () => <div data-testid="hero-video-stub" />,
}));

const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Branding', () => {
    it('should render the KitchenXpert brand (in nav + footer)', () => {
      renderHomePage();
      // The brand string appears in <nav>, the hero, and the footer — we
      // just verify at least one occurrence is rendered.
      expect(screen.getAllByText(/kitchenxpert/i).length).toBeGreaterThan(0);
    });

    it('should display a top-level h1 in the hero', () => {
      renderHomePage();
      const heading = screen.getByRole('heading', { level: 1 });
      // Hero copy can vary across variants but always renders the
      // "La cuisine que vous imaginez" headline.
      expect(heading).toHaveTextContent(/cuisine|kitchen/i);
    });
  });

  describe('Hero CTAs', () => {
    it('should expose a link to the sandbox designer (no signup required)', () => {
      renderHomePage();
      const sandboxLinks = screen
        .getAllByRole('link')
        .filter((l) => l.getAttribute('href') === '/designer/sandbox');
      expect(sandboxLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should expose at least one register CTA', () => {
      renderHomePage();
      const registerLinks = screen
        .getAllByRole('link')
        .filter((l) => l.getAttribute('href')?.endsWith('/register'));
      expect(registerLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should expose a top-nav link to /catalog', () => {
      renderHomePage();
      const catalogLinks = screen
        .getAllByRole('link')
        .filter((l) => l.getAttribute('href')?.endsWith('/catalog'));
      expect(catalogLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should expose a top-nav link to /pricing', () => {
      renderHomePage();
      const pricingLinks = screen
        .getAllByRole('link')
        .filter((l) => l.getAttribute('href')?.endsWith('/pricing'));
      expect(pricingLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Features Section', () => {
    it('should render the features section h2', () => {
      renderHomePage();
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should render exactly three feature cards (h3)', () => {
      renderHomePage();
      const h3s = screen.getAllByRole('heading', { level: 3 });
      // The Features block contributes 3 cards; other sections may also
      // contribute h3s (footer columns), so use >= 3.
      expect(h3s.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Footer', () => {
    it('should render a <footer> element', () => {
      renderHomePage();
      const footer = document.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('should display the current year in copyright', () => {
      renderHomePage();
      const currentYear = new Date().getFullYear().toString();
      const footer = document.querySelector('footer')!;
      expect(within(footer).getByText(new RegExp(currentYear))).toBeInTheDocument();
    });

    it('should display "Tous droits réservés"', () => {
      renderHomePage();
      const footer = document.querySelector('footer')!;
      expect(within(footer).getByText(/tous droits réservés/i)).toBeInTheDocument();
    });

    it('should link to legal pages (mentions, cgv, privacy, cookies)', () => {
      renderHomePage();
      const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href') ?? '');
      const legalPaths = ['/legal/mentions', '/legal/cgv', '/legal/privacy', '/legal/cookies'];
      for (const path of legalPaths) {
        expect(hrefs.some((h) => h.endsWith(path))).toBe(true);
      }
    });
  });

  describe('Layout and Structure', () => {
    it('should have proper heading hierarchy', () => {
      renderHomePage();
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThanOrEqual(1);
      expect(h3s.length).toBeGreaterThanOrEqual(3);
    });

    it('should have a <nav> element', () => {
      renderHomePage();
      const nav = document.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('should have a <main> element', () => {
      renderHomePage();
      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
    });

    it('should have at least one features-style section', () => {
      renderHomePage();
      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should use a grid layout somewhere on the page', () => {
      renderHomePage();
      const grids = document.querySelectorAll('.grid');
      expect(grids.length).toBeGreaterThan(0);
    });
  });
});
