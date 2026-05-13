/**
 * CarbonAdmin Tests
 * Tests for the admin carbon footprint dashboard.
 *
 * Updated 2026-05-12 to match the redesigned dashboard:
 * - the page now fetches /carbon/stats + /carbon/reports on mount and
 *   shows a spinner until both resolve — tests must mock fetch and wait
 * - the heading copy is "Carbon Reports" (not "Carbon Footprint
 *   Dashboard"); description was reworded
 * - layout uses an outer <div class="min-h-screen..."> wrapping an inner
 *   "max-w-7xl mx-auto" container (so container-level assertions must
 *   target the inner element)
 * - the page exposes Refresh + Recalculate All buttons and a reports table
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CarbonAdmin from '../../pages/Admin/CarbonAdmin';

// Use the real i18n but pin t() to the English fallback so assertions
// are language-stable.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

const mockFetch = vi.fn();

const mockStats = {
  data: { totalReports: 3, averageCo2: 250, totalCo2Saved: 120 },
};
const mockReports = {
  data: [
    {
      id: 'r1',
      kitchenName: 'Test Kitchen 1',
      ownerEmail: 'jean@example.com',
      totalCo2: 180,
      furnitureCo2: 80,
      appliancesCo2: 60,
      deliveryCo2: 40,
      createdAt: '2026-04-01T10:00:00Z',
    },
  ],
};

const renderCarbonAdmin = () => {
  return render(
    <MemoryRouter>
      <CarbonAdmin />
    </MemoryRouter>
  );
};

async function renderAndLoad(): Promise<HTMLElement> {
  const { container } = renderCarbonAdmin();
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  return container;
}

describe('CarbonAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/carbon/stats')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
      }
      if (url.includes('/carbon/reports')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockReports) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
  });

  describe('Rendering', () => {
    it('should render an h1 heading once the data has loaded', async () => {
      await renderAndLoad();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render the carbon reports title fallback', async () => {
      await renderAndLoad();
      // English fallbacks: "Carbon Reports" used in title + table h2.
      const matches = screen.getAllByText(/carbon reports/i);
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should render a description paragraph', async () => {
      await renderAndLoad();
      // English fallback: "Monitor and recalculate carbon footprint data..."
      expect(screen.getByText(/monitor and recalculate/i)).toBeInTheDocument();
    });

    it('should render the top-level page container', async () => {
      const container = await renderAndLoad();
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toBeInTheDocument();
      expect(outerDiv.tagName).toBe('DIV');
    });

    it('should render at least one content card with bg-white', async () => {
      const container = await renderAndLoad();
      const cards = container.querySelectorAll('.bg-white');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Dark Mode', () => {
    it('should mark the heading text white in dark mode', async () => {
      await renderAndLoad();
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('dark:text-white');
    });

    it('should mark the reports card dark-mode background', async () => {
      const container = await renderAndLoad();
      const card = container.querySelector('.bg-white');
      expect(card?.className).toContain('dark:bg-gray-800');
    });
  });

  describe('Layout and Styling', () => {
    it('should use a centered max-w-7xl container', async () => {
      const container = await renderAndLoad();
      // The max-w container is the inner wrapper, not container.firstChild.
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
      // Heading size is text-3xl in the new design.
      expect(heading.className).toMatch(/text-(2|3)xl/);
    });
  });

  describe('Data table', () => {
    it('should render a reports table with column headers once loaded', async () => {
      await renderAndLoad();
      const table = await screen.findByRole('table');
      expect(table).toBeInTheDocument();
      expect(table.querySelectorAll('th').length).toBeGreaterThanOrEqual(5);
    });

    it('should render the loaded report rows', async () => {
      await renderAndLoad();
      expect(await screen.findByText('Test Kitchen 1')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should expose Refresh + Recalculate All buttons', async () => {
      await renderAndLoad();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /recalculate all/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should expose a single h1', async () => {
      await renderAndLoad();
      const h1s = screen.getAllByRole('heading', { level: 1 });
      expect(h1s).toHaveLength(1);
    });

    it('should mark the table with aria-label', async () => {
      await renderAndLoad();
      const table = await screen.findByRole('table');
      expect(table).toHaveAttribute('aria-label');
    });
  });

  describe('Data Loading', () => {
    it('should call /carbon/stats and /carbon/reports on mount', async () => {
      await renderAndLoad();
      const calls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(calls.some((u) => u.includes('/carbon/stats'))).toBe(true);
      expect(calls.some((u) => u.includes('/carbon/reports'))).toBe(true);
    });
  });
});
