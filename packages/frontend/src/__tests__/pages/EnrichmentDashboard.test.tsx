/**
 * EnrichmentDashboard Tests
 * Tests for the admin AI catalog enrichment dashboard - loading, stat cards,
 * confidence bar, action buttons, cross-match form, breakdown tables,
 * recent enrichments, message banners, dark mode, and accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import EnrichmentDashboard from '../../pages/Admin/EnrichmentDashboard';

// ---------- i18n mock ----------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: string | Record<string, unknown>) => {
      if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
      if (fallbackOrOpts && typeof fallbackOrOpts === 'object' && 'defaultValue' in fallbackOrOpts)
        return fallbackOrOpts.defaultValue as string;
      return key;
    },
    i18n: { language: 'fr' },
  }),
}));

// ---------- Endpoints mock ----------

vi.mock('../../services/api/endpoints', () => ({
  API_BASE_URL: '',
  API_ENDPOINTS: {
    ENRICHMENT: {
      STATUS: '/enrichment/status',
      ENRICH_ALL: '/enrichment/enrich-all',
      COMPATIBILITY_GENERATE: '/enrichment/compatibility/generate',
      MATCH_BRANDS: (brandA: string, brandB: string) => `/enrichment/match/${brandA}/${brandB}`,
    },
  },
}));

// ---------- Fetch mock ----------

const mockFetch = vi.fn();

// ---------- Mock data ----------

const mockStats = {
  data: {
    pending: 45,
    enriched: 320,
    failed: 12,
    skipped: 8,
    averageConfidence: 0.87,
    byType: [
      { name: 'Cabinets', count: 150, enriched: 130, pending: 15, failed: 5 },
      { name: 'Countertops', count: 80, enriched: 70, pending: 8, failed: 2 },
    ],
    byBrand: [
      { name: 'IKEA', count: 200, enriched: 180, pending: 15, failed: 5 },
      { name: 'Leroy Merlin', count: 100, enriched: 85, pending: 10, failed: 5 },
    ],
    recentEnrichments: [
      {
        id: 'enr-1',
        productName: 'METOD Base Cabinet',
        productType: 'cabinet',
        brand: 'IKEA',
        status: 'enriched' as const,
        confidence: 0.95,
        enrichedAt: '2025-03-15T10:30:00Z',
      },
      {
        id: 'enr-2',
        productName: 'Granite Worktop',
        productType: 'countertop',
        brand: 'Leroy Merlin',
        status: 'failed' as const,
        confidence: 0.3,
        enrichedAt: '2025-03-15T09:45:00Z',
      },
      {
        id: 'enr-3',
        productName: 'Subway Tile 10x20',
        productType: 'backsplash',
        brand: 'Castorama',
        status: 'pending' as const,
        confidence: 0.0,
        enrichedAt: '2025-03-15T08:00:00Z',
      },
    ],
  },
};

const mockEmptyStats = {
  data: {
    pending: 0,
    enriched: 0,
    failed: 0,
    skipped: 0,
    averageConfidence: 0,
    byType: [],
    byBrand: [],
    recentEnrichments: [],
  },
};

const renderEnrichmentDashboard = () => {
  return render(
    <MemoryRouter>
      <EnrichmentDashboard />
    </MemoryRouter>
  );
};

describe('EnrichmentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStats),
    });
  });

  // ---------- Loading State ----------

  describe('Loading State', () => {
    it('should show loading spinner while fetching initial data', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderEnrichmentDashboard();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not render stat cards while loading', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderEnrichmentDashboard();

      expect(screen.queryByText('En attente')).not.toBeInTheDocument();
    });
  });

  // ---------- Page Rendering ----------

  describe('Page Rendering', () => {
    it('should render the page heading', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /enrichissement ia du catalogue/i })
        ).toBeInTheDocument();
      });
    });

    it('should render the page description', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(
          screen.getByText(/tableau de bord de l'enrichissement automatique/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ---------- Stat Cards ----------

  describe('Stat Cards', () => {
    it('should render 4 stat cards', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        // Labels appear as card titles and as filter pills — use getAllBy.
        expect(screen.getAllByText('En attente').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Enrichis').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Echoues').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Ignores').length).toBeGreaterThan(0);
      });
    });

    it('should render correct pending count', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument();
      });
    });

    it('should render correct enriched count', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('320')).toBeInTheDocument();
      });
    });

    it('should render correct failed count', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
      });
    });

    it('should render correct skipped count', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        // '8' may appear in multiple cells (stat value + brand counts).
        expect(screen.getAllByText('8').length).toBeGreaterThan(0);
      });
    });

    it('should render percentage for each stat card', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        // Total = 45 + 320 + 12 + 8 = 385
        // enriched pct = (320/385)*100 = 83.1%
        const percentages = screen.getAllByText(/du total/);
        expect(percentages.length).toBe(4);
      });
    });
  });

  // ---------- Confidence Bar ----------

  describe('Confidence Bar', () => {
    it('should render average confidence label', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('Confiance moyenne')).toBeInTheDocument();
      });
    });

    it('should render average confidence percentage', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('87.0 %')).toBeInTheDocument();
      });
    });

    it('should render the progress bar element', async () => {
      const { container } = renderEnrichmentDashboard();

      await waitFor(() => {
        const progressBar = container.querySelector('.bg-indigo-600');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  // ---------- Action Buttons ----------

  describe('Action Buttons', () => {
    it('should render Enrichir tout button', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enrichir tout/i })).toBeInTheDocument();
      });
    });

    it('should render compatibility matrix button', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generer matrice compatibilite/i })
        ).toBeInTheDocument();
      });
    });

    it('should render refresh button', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /rafraichir/i })).toBeInTheDocument();
      });
    });

    it('should call fetch when Enrichir tout is clicked', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enrichir tout/i })).toBeInTheDocument();
      });

      // Mock the action POST response + subsequent stats refresh
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) });

      await user.click(screen.getByRole('button', { name: /enrichir tout/i }));

      await waitFor(() => {
        const enrichCall = mockFetch.mock.calls.find(
          (call: unknown[]) =>
            typeof call[0] === 'string' && (call[0] as string).includes('enrich-all')
        );
        expect(enrichCall).toBeDefined();
      });
    });

    it('should show success message after successful action', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enrichir tout/i })).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) });

      await user.click(screen.getByRole('button', { name: /enrichir tout/i }));

      await waitFor(() => {
        expect(screen.getByText('Enrichissement lance avec succes')).toBeInTheDocument();
      });
    });

    it('should show error message when action fails', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enrichir tout/i })).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Service unavailable' }),
      });

      await user.click(screen.getByRole('button', { name: /enrichir tout/i }));

      await waitFor(() => {
        expect(screen.getByText('Service unavailable')).toBeInTheDocument();
      });
    });

    it('should dismiss message when dismiss button is clicked', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enrichir tout/i })).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) });

      await user.click(screen.getByRole('button', { name: /enrichir tout/i }));

      await waitFor(() => {
        expect(screen.getByText('Enrichissement lance avec succes')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/dismiss message/i));

      await waitFor(() => {
        expect(screen.queryByText('Enrichissement lance avec succes')).not.toBeInTheDocument();
      });
    });

    it('should call generate compatibility when button is clicked', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /generer matrice compatibilite/i })
        ).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) });

      await user.click(screen.getByRole('button', { name: /generer matrice compatibilite/i }));

      await waitFor(() => {
        const compatCall = mockFetch.mock.calls.find(
          (call: unknown[]) =>
            typeof call[0] === 'string' && (call[0] as string).includes('compatibility/generate')
        );
        expect(compatCall).toBeDefined();
      });
    });

    it('should refresh stats when refresh button is clicked', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /rafraichir/i })).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) });

      await user.click(screen.getByRole('button', { name: /rafraichir/i }));

      await waitFor(() => {
        // Should have called fetch again for stats
        const statusCalls = mockFetch.mock.calls.filter(
          (call: unknown[]) =>
            typeof call[0] === 'string' && (call[0] as string).includes('/enrichment/status')
        );
        expect(statusCalls.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  // ---------- Cross-Match Section ----------

  describe('Cross-Match Section', () => {
    it('should render cross-match heading', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        // "Cross-match marques" appears as a section heading and again
        // as a button label.
        expect(screen.getAllByText('Cross-match marques').length).toBeGreaterThan(0);
      });
    });

    it('should render brand A input', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/marque a/i)).toBeInTheDocument();
      });
    });

    it('should render brand B input', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/marque b/i)).toBeInTheDocument();
      });
    });

    it('should render cross-match action button', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        // The last "Cross-match marques" is the button text
        const buttons = screen.getAllByRole('button');
        const crossMatchBtn = buttons.find((btn) =>
          btn.textContent?.includes('Cross-match marques')
        );
        expect(crossMatchBtn).toBeDefined();
      });
    });

    it('should show error when submitting cross-match without brands', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/marque a/i)).toBeInTheDocument();
      });

      // Click cross-match button without filling in brands
      const buttons = screen.getAllByRole('button');
      const crossMatchBtn = buttons.find((btn) => btn.textContent?.includes('Cross-match marques'));
      await user.click(crossMatchBtn!);

      await waitFor(() => {
        expect(
          screen.getByText(/veuillez renseigner les deux identifiants de marque/i)
        ).toBeInTheDocument();
      });
    });

    it('should call cross-match API when brands are provided', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/marque a/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/marque a/i), 'brand-ikea');
      await user.type(screen.getByLabelText(/marque b/i), 'brand-leroy');

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) });

      const buttons = screen.getAllByRole('button');
      const crossMatchBtn = buttons.find((btn) => btn.textContent?.includes('Cross-match marques'));
      await user.click(crossMatchBtn!);

      await waitFor(() => {
        const matchCall = mockFetch.mock.calls.find(
          (call: unknown[]) =>
            typeof call[0] === 'string' && (call[0] as string).includes('/enrichment/match/')
        );
        expect(matchCall).toBeDefined();
      });
    });
  });

  // ---------- Breakdown by Product Type ----------

  describe('Breakdown by Product Type', () => {
    it('should render product type section heading', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('Repartition par type de produit')).toBeInTheDocument();
      });
    });

    it('should render product type table with aria-label', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        const table = screen.getByLabelText('Breakdown by product type');
        expect(table).toBeInTheDocument();
      });
    });

    it('should render product type rows', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('Cabinets')).toBeInTheDocument();
        expect(screen.getByText('Countertops')).toBeInTheDocument();
      });
    });

    it('should render table column headers', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        const typeTable = screen.getByLabelText('Breakdown by product type');
        const headers = typeTable.querySelectorAll('th');
        expect(headers.length).toBe(5);
      });
    });
  });

  // ---------- Breakdown by Brand ----------

  describe('Breakdown by Brand', () => {
    it('should render brand section heading', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('Repartition par marque')).toBeInTheDocument();
      });
    });

    it('should render brand table with aria-label', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        const table = screen.getByLabelText('Breakdown by brand');
        expect(table).toBeInTheDocument();
      });
    });

    it('should render brand rows', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        // Brand names appear in the breakdown table AND in the cross-match
        // form options — use getAllBy to be tolerant of duplicates.
        expect(screen.getAllByText('IKEA').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Leroy Merlin').length).toBeGreaterThan(0);
      });
    });
  });

  // ---------- Recent Enrichments ----------

  describe('Recent Enrichments', () => {
    it('should render recent enrichments heading', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('Enrichissements recents')).toBeInTheDocument();
      });
    });

    it('should render recent enrichments subtitle', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('Les 20 derniers enrichissements')).toBeInTheDocument();
      });
    });

    it('should render recent enrichments table with aria-label', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        const table = screen.getByLabelText('Recent enrichments');
        expect(table).toBeInTheDocument();
      });
    });

    it('should render product names in the recent table', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('METOD Base Cabinet')).toBeInTheDocument();
        expect(screen.getByText('Granite Worktop')).toBeInTheDocument();
        expect(screen.getByText('Subway Tile 10x20')).toBeInTheDocument();
      });
    });

    it('should render status badges in the recent table', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('enriched')).toBeInTheDocument();
        expect(screen.getByText('failed')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });

    it('should render confidence percentages in the recent table', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText('95 %')).toBeInTheDocument();
        expect(screen.getByText('30 %')).toBeInTheDocument();
        expect(screen.getByText('0 %')).toBeInTheDocument();
      });
    });
  });

  // ---------- Empty State ----------

  describe('Empty State', () => {
    it('should render empty state message when all counts are zero', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEmptyStats),
      });

      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText(/aucune donnee d'enrichissement disponible/i)).toBeInTheDocument();
      });
    });
  });

  // ---------- Error Handling ----------

  describe('Error Handling', () => {
    it('should show error message when initial fetch fails', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByText(/erreur de chargement des statistiques/i)).toBeInTheDocument();
      });
    });
  });

  // ---------- Dark Mode Classes ----------

  describe('Dark Mode Classes', () => {
    it('should have dark:bg-gray-900 on the page container', async () => {
      const { container } = renderEnrichmentDashboard();

      await waitFor(() => {
        const pageContainer = container.firstChild as HTMLElement;
        expect(pageContainer.className).toContain('dark:bg-gray-900');
      });
    });

    it('should have dark:text-white on the heading', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading.className).toContain('dark:text-white');
      });
    });

    it('should have dark mode classes on stat cards', async () => {
      const { container } = renderEnrichmentDashboard();

      await waitFor(() => {
        const darkCards = container.querySelectorAll('[class*="dark:bg"]');
        expect(darkCards.length).toBeGreaterThan(0);
      });
    });
  });

  // ---------- Accessibility ----------

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        const h2Elements = screen.getAllByRole('heading', { level: 2 });
        expect(h2Elements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have aria-labels on breakdown tables', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText('Breakdown by product type')).toBeInTheDocument();
        expect(screen.getByLabelText('Breakdown by brand')).toBeInTheDocument();
        expect(screen.getByLabelText('Recent enrichments')).toBeInTheDocument();
      });
    });

    it('should have aria-label on dismiss message button', async () => {
      renderEnrichmentDashboard();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enrichir tout/i })).toBeInTheDocument();
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockStats) });

      await user.click(screen.getByRole('button', { name: /enrichir tout/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/dismiss message/i)).toBeInTheDocument();
      });
    });

    it('should have proper label associations for brand inputs', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        expect(screen.getByLabelText(/marque a/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/marque b/i)).toBeInTheDocument();
      });
    });

    it('should have table elements for data display', async () => {
      renderEnrichmentDashboard();

      await waitFor(() => {
        const tables = screen.getAllByRole('table');
        expect(tables.length).toBe(3);
      });
    });
  });
});
