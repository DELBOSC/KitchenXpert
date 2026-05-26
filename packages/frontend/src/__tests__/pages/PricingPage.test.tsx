/**
 * PricingPage Tests
 * Tests for the pricing page - rendering tiers, billing toggle, feature comparison table,
 * CTA links, annual pricing calculation, accessibility, dark mode
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PricingPage from '../../pages/PricingPage/PricingPage';

// Mock react-router-dom Link (keep BrowserRouter functional)
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
  };
});

const renderPricingPage = () => {
  return render(
    <BrowserRouter>
      <PricingPage />
    </BrowserRouter>
  );
};

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Structure', () => {
    it('should render the page title', () => {
      renderPricingPage();

      expect(
        screen.getByRole('heading', { level: 1 })
      ).toBeInTheDocument();
    });

    it('should render the subtitle text', () => {
      renderPricingPage();

      // Default fallback from t()
      expect(
        screen.getByText(/choisissez le plan|choose the plan/i)
      ).toBeInTheDocument();
    });

    it('should render the comparison section heading', () => {
      renderPricingPage();

      // The page exposes 2 h2 sections ("Comparaison détaillée" and the
      // trust signals title). At least one h2 must be rendered.
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThanOrEqual(1);
    });

    it('should render contact email at the bottom', () => {
      renderPricingPage();

      const emailLink = screen.getByRole('link', { name: /contact@kitchenxpert\.com/i });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:contact@kitchenxpert.com');
    });
  });

  describe('Pricing Cards', () => {
    it('should render three pricing tier cards', () => {
      renderPricingPage();

      // Tier names appear both as <h3> in the cards and as <th> in the
      // comparison table — use getAllBy* to assert presence.
      expect(screen.getAllByText(/gratuit/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/^pro$/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/entreprise/i).length).toBeGreaterThan(0);
    });

    it('should display the Free plan price as 0', () => {
      renderPricingPage();

      // Price is rendered as "<number>€" inside a single span. Use the
      // tag-name + textContent function matcher to find the price span.
      const free = screen.getAllByText((_, el) =>
        el?.tagName === 'SPAN' && el.textContent === '0€',
      );
      expect(free.length).toBeGreaterThan(0);
    });

    it('should display the Pro plan price as 29', () => {
      renderPricingPage();
      const pro = screen.getAllByText((_, el) =>
        el?.tagName === 'SPAN' && el.textContent === '29€',
      );
      expect(pro.length).toBeGreaterThan(0);
    });

    it('should display the Enterprise plan price as 99', () => {
      renderPricingPage();
      const ent = screen.getAllByText((_, el) =>
        el?.tagName === 'SPAN' && el.textContent === '99€',
      );
      expect(ent.length).toBeGreaterThan(0);
    });

    it('should show the Popular badge on the Pro tier', () => {
      renderPricingPage();

      expect(screen.getByText(/populaire/i)).toBeInTheDocument();
    });

    it('should render Free tier features', () => {
      renderPricingPage();

      expect(screen.getByText(/2 projets/i)).toBeInTheDocument();
      expect(screen.getByText(/5 generations ia/i)).toBeInTheDocument();
    });

    it('should render Pro tier features', () => {
      renderPricingPage();

      expect(screen.getByText(/projets illimites/i)).toBeInTheDocument();
      expect(screen.getByText(/50 generations ia/i)).toBeInTheDocument();
      expect(screen.getByText(/3 collaborateurs/i)).toBeInTheDocument();
    });

    it('should render Enterprise tier features', () => {
      renderPricingPage();

      expect(screen.getByText(/tout illimite/i)).toBeInTheDocument();
      expect(screen.getByText(/branding personnalise/i)).toBeInTheDocument();
      expect(screen.getByText(/support prioritaire/i)).toBeInTheDocument();
      expect(screen.getByText(/acces api/i)).toBeInTheDocument();
    });
  });

  describe('CTA Links', () => {
    it('should link Free plan CTA to /register', () => {
      renderPricingPage();

      const freeLink = screen.getByRole('link', { name: /commencer gratuitement/i });
      expect(freeLink).toHaveAttribute('href', '/register');
    });

    it('should link Pro plan CTA to /register?plan=pro', () => {
      renderPricingPage();

      const proLink = screen.getByRole('link', { name: /essai pro gratuit/i });
      expect(proLink).toHaveAttribute('href', '/register?plan=pro');
    });

    it('should link Enterprise CTA to mailto', () => {
      renderPricingPage();

      const enterpriseLink = screen.getByRole('link', { name: /contacter les ventes/i });
      expect(enterpriseLink).toHaveAttribute('href', 'mailto:contact@kitchenxpert.com');
    });
  });

  describe('Billing Toggle', () => {
    it('should render billing toggle switch', () => {
      renderPricingPage();

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should default to monthly billing', () => {
      renderPricingPage();

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('should show monthly and annual labels', () => {
      renderPricingPage();

      expect(screen.getByText(/mensuel/i)).toBeInTheDocument();
      expect(screen.getByText(/annuel/i)).toBeInTheDocument();
    });

    it('should show -20% discount badge', () => {
      renderPricingPage();

      expect(screen.getByText(/-20%/)).toBeInTheDocument();
    });

    it('should toggle to annual billing when clicked', async () => {
      renderPricingPage();
      const user = userEvent.setup();

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('should calculate discounted price for Pro plan in annual mode', async () => {
      renderPricingPage();
      const user = userEvent.setup();

      // Switch to annual
      await user.click(screen.getByRole('switch'));

      // Pro: 29 * 0.8 = 23.2 → rendered as "23.2€".
      await waitFor(() => {
        const matches = screen.getAllByText((_, el) =>
          el?.tagName === 'SPAN' && el.textContent === '23.2€',
        );
        expect(matches.length).toBeGreaterThan(0);
      });
    });

    it('should calculate discounted price for Enterprise plan in annual mode', async () => {
      renderPricingPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('switch'));

      // Enterprise: 99 * 0.8 = 79.2
      await waitFor(() => {
        const matches = screen.getAllByText((_, el) =>
          el?.tagName === 'SPAN' && el.textContent === '79.2€',
        );
        expect(matches.length).toBeGreaterThan(0);
      });
    });

    it('should keep Free plan price at 0 in annual mode', async () => {
      renderPricingPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('switch'));

      // Free stays "0€".
      const free = screen.getAllByText((_, el) =>
        el?.tagName === 'SPAN' && el.textContent === '0€',
      );
      expect(free.length).toBeGreaterThan(0);
    });

    it('should show billed annually text in annual mode', async () => {
      renderPricingPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('switch'));

      await waitFor(() => {
        expect(screen.getAllByText(/billed annually/i).length).toBeGreaterThan(0);
      });
    });

    it('should have accessible label on toggle', () => {
      renderPricingPage();

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-label');
    });
  });

  describe('Feature Comparison Table', () => {
    it('should render the feature comparison table', () => {
      renderPricingPage();

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should have accessible label on the table', () => {
      renderPricingPage();

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label');
    });

    it('should render plan column headers', () => {
      renderPricingPage();

      const table = screen.getByRole('table');
      const headers = within(table).getAllByRole('columnheader');
      // 4 columns: Feature, Free, Pro, Enterprise
      expect(headers.length).toBe(4);
    });

    it('should render feature rows', () => {
      renderPricingPage();

      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      // 1 header row + 9 feature rows = 10
      expect(rows.length).toBe(10);
    });

    it('should show check icons for boolean true values', () => {
      renderPricingPage();

      // VR / 3D Preview is boolean true for Pro and Enterprise.
      // CheckIcon renders an SVG with the brand-accent (cyan) token.
      const checks = document.querySelectorAll('svg.text-kx-brand-accent');
      expect(checks.length).toBeGreaterThan(0);
    });

    it('should show dashes for none/unavailable features', () => {
      renderPricingPage();

      // Many features show '--' for unavailable tiers
      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Tokens', () => {
    // PricingPage uses KitchenXpert design tokens (kx-base, kx-elevated)
    // that auto-adapt to light/dark via the .light override in tokens.css —
    // no dark: prefix needed.

    it('should apply the page background token on the container', () => {
      renderPricingPage();

      const container = document.querySelector('.bg-kx-base');
      expect(container).toBeInTheDocument();
    });

    it('should apply the elevated surface token on pricing cards', () => {
      renderPricingPage();

      const elevatedSurfaces = document.querySelectorAll('.bg-kx-elevated');
      expect(elevatedSurfaces.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderPricingPage();

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      // The page exposes multiple h2 sections (comparison + trust signals).
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(1);
      // h3 for each tier name — there may also be h3s in the trust block.
      const h3s = screen.getAllByRole('heading', { level: 3 });
      expect(h3s.length).toBeGreaterThanOrEqual(3);
    });

    it('should have link elements for CTA buttons', () => {
      renderPricingPage();

      // Free + Pro internal links, Enterprise mailto
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(3);
    });

    it('should have an accessible toggle switch', () => {
      renderPricingPage();

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked');
      expect(toggle).toHaveAttribute('aria-label');
    });
  });
});
