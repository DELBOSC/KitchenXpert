/**
 * DigitalTwinAdmin Tests
 * Tests for the admin Digital Twin management page.
 *
 * Updated 2026-05-12 to match the redesigned page:
 * - the page fetches /digital-twin/* on mount and shows a spinner until
 *   data resolves — tests must mock fetch and waitFor
 * - heading is "Digital Twin Admin"; description was removed
 * - layout uses an outer <div class="min-h-screen..."> wrapping an inner
 *   "max-w-7xl mx-auto" container
 * - exposes Refresh + Sync All buttons
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DigitalTwinAdmin from '../../pages/Admin/DigitalTwinAdmin';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: 'en' },
  }),
}));

const mockFetch = vi.fn();

const mockStats = {
  data: { total: 5, active: 3, syncing: 1, error: 1, lastGlobalSync: '2026-04-01T10:00:00Z' },
};
const mockTwins = {
  data: [
    {
      id: 'dt1',
      kitchenId: 'k1',
      kitchenName: 'Kitchen One',
      ownerEmail: 'user@example.com',
      status: 'active',
      lastSync: '2026-04-01T10:00:00Z',
    },
  ],
};

const renderDigitalTwinAdmin = () => {
  return render(
    <MemoryRouter>
      <DigitalTwinAdmin />
    </MemoryRouter>
  );
};

async function renderAndLoad(): Promise<HTMLElement> {
  const { container } = renderDigitalTwinAdmin();
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  return container;
}

describe('DigitalTwinAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/digital-twin')) {
        if (url.includes('stats')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStats) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTwins) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
  });

  describe('Rendering', () => {
    it('should render an h1 heading once the data has loaded', async () => {
      await renderAndLoad();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render the Digital Twin Admin title', async () => {
      await renderAndLoad();
      expect(screen.getByText(/digital twin admin/i)).toBeInTheDocument();
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
    it('should expose Refresh + Sync All buttons', async () => {
      await renderAndLoad();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sync all/i })).toBeInTheDocument();
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
