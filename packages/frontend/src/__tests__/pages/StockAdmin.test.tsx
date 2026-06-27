/**
 * StockAdmin Tests
 * Tests for the admin stock management dashboard.
 *
 * Updated 2026-05-12 to match the redesigned dashboard:
 * - the page now fetches /catalog/stock/* on mount and shows a spinner
 *   until the data resolves — tests must mock fetch and waitFor
 * - the heading is "Stock Management"; no description paragraph (replaced
 *   by a "Last check" subtitle)
 * - layout uses an outer <div class="min-h-screen..."> wrapping an inner
 *   "max-w-7xl mx-auto" container
 * - the page exposes Refresh + Check All Stock buttons
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import StockAdmin from '../../pages/Admin/StockAdmin';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

const mockFetch = vi.fn();

const mockStats = {
  data: {
    total: 100,
    inStock: 80,
    lowStock: 15,
    outOfStock: 5,
    lastCheckAt: '2026-04-01T10:00:00Z',
  },
};
const mockResults = {
  data: [
    {
      id: 's1',
      productName: 'Test Product',
      brand: 'IKEA',
      category: 'cabinets',
      quantity: 10,
      status: 'in_stock',
      lastCheckedAt: '2026-04-01T10:00:00Z',
    },
  ],
  meta: { brands: ['IKEA'] },
};

const renderStockAdmin = () => {
  return render(
    <MemoryRouter>
      <StockAdmin />
    </MemoryRouter>
  );
};

async function renderAndLoad(): Promise<HTMLElement> {
  const { container } = renderStockAdmin();
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  return container;
}

describe('StockAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/stock')) {
        if (url.includes('stats')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockResults) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
  });

  describe('Rendering', () => {
    it('should render an h1 heading once the data has loaded', async () => {
      await renderAndLoad();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render the Stock Management title', async () => {
      await renderAndLoad();
      expect(screen.getByText(/stock management/i)).toBeInTheDocument();
    });

    it('should render the top-level page container', async () => {
      const container = await renderAndLoad();
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toBeInTheDocument();
      expect(outerDiv.tagName).toBe('DIV');
    });

    it('should render at least one card-style block', async () => {
      const container = await renderAndLoad();
      const cards = container.querySelectorAll('.bg-white, .bg-gray-50');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Dark Mode', () => {
    it('should mark the heading text white in dark mode', async () => {
      await renderAndLoad();
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('dark:text-white');
    });

    it('should mark the outermost background dark', async () => {
      const container = await renderAndLoad();
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('dark:bg-gray-900');
    });
  });

  describe('Layout and Styling', () => {
    it('should use a centered max-w-7xl container', async () => {
      const container = await renderAndLoad();
      const inner = container.querySelector('.max-w-7xl');
      expect(inner).not.toBeNull();
      expect(inner!.className).toContain('mx-auto');
    });

    it('should apply responsive horizontal padding', async () => {
      const container = await renderAndLoad();
      const inner = container.querySelector('.max-w-7xl')!;
      expect(inner.className).toContain('px-4');
      expect(inner.className).toContain('sm:px-6');
      expect(inner.className).toContain('lg:px-8');
    });

    it('should render the h1 in a bold-font, large variant', async () => {
      await renderAndLoad();
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('font-bold');
      expect(heading.className).toMatch(/text-(2|3)xl/);
    });
  });

  describe('Actions', () => {
    it('should expose Refresh + Check All Stock buttons', async () => {
      await renderAndLoad();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check all stock/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should expose a single h1', async () => {
      await renderAndLoad();
      const h1s = screen.getAllByRole('heading', { level: 1 });
      expect(h1s).toHaveLength(1);
    });
  });
});
