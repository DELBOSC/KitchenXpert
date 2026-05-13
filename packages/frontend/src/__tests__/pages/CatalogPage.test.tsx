/**
 * CatalogPage Tests
 * Tests for catalog page component — categories, search, and product display.
 *
 * Updated 2026-05-12 to match the redesigned catalog:
 * - icons are Lucide SVGs (no emoji)
 * - selected state uses aria-pressed (not a specific Tailwind class)
 * - sort widget is a native <select> rendered by the Select primitive
 * - search placeholder is "Rechercher un produit, une marque, une référence…"
 * - empty state title is "Catalogue en cours de chargement" when no
 *   filters are active, "Aucun résultat" when filters narrow to zero
 * - the page no longer renders a <header>; sections only
 * - there is now an AI search panel with its own "Rechercher" button
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CatalogPage from '../../pages/CatalogPage';

// ---- Redux store hooks ---------------------------------------------------
const mockDispatch = vi.fn();
const mockCatalogState = {
  catalog: {
    catalogs: [],
    products: [] as unknown[],
    providers: [],
    currentCatalog: null,
    currentProduct: null,
    categories: [],
    isLoading: false,
    error: null as string | null,
    filters: {},
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  },
};

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: typeof mockCatalogState) => unknown) =>
    selector(mockCatalogState),
}));

const renderCatalogPage = () => {
  return render(
    <BrowserRouter>
      <CatalogPage />
    </BrowserRouter>
  );
};

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCatalogState.catalog.products = [];
    mockCatalogState.catalog.isLoading = false;
    mockCatalogState.catalog.error = null;
  });

  describe('Rendering', () => {
    it('should render the page title', () => {
      renderCatalogPage();
      // "Catalogue" appears as the page h1 (PageHeader) and may also
      // appear as the empty-state title — assert at least one heading.
      expect(screen.getByRole('heading', { level: 1, name: /catalogue/i })).toBeInTheDocument();
    });

    it('should render the search input', () => {
      renderCatalogPage();
      expect(
        screen.getByPlaceholderText(/rechercher un produit/i),
      ).toBeInTheDocument();
    });

    it('should render an AI search button', () => {
      renderCatalogPage();
      // Inside the AI search panel — the only "Rechercher" button on the page.
      expect(
        screen.getByRole('button', { name: /rechercher/i }),
      ).toBeInTheDocument();
    });

    it('should render the categories section', () => {
      renderCatalogPage();
      expect(
        screen.getByRole('heading', { name: /catégories/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Categories', () => {
    it('should render all six category buttons', () => {
      renderCatalogPage();
      expect(screen.getByRole('button', { name: /meubles/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /électroménager/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /plans de travail/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /éviers & robinets/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /éclairage/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /accessoires/i })).toBeInTheDocument();
    });

    it('should mark a category as pressed when clicked', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });
      expect(cabinetButton).toHaveAttribute('aria-pressed', 'false');

      await user.click(cabinetButton);
      expect(cabinetButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should deselect a category when clicked twice', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });
      await user.click(cabinetButton);
      await user.click(cabinetButton);
      expect(cabinetButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should switch the pressed state between categories', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });
      const applianceButton = screen.getByRole('button', { name: /électroménager/i });

      await user.click(cabinetButton);
      expect(cabinetButton).toHaveAttribute('aria-pressed', 'true');

      await user.click(applianceButton);
      expect(applianceButton).toHaveAttribute('aria-pressed', 'true');
      expect(cabinetButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should show "Tous les produits" when no category is selected', () => {
      renderCatalogPage();
      expect(screen.getByText(/tous les produits/i)).toBeInTheDocument();
    });

    it('should update the products section title once a category is selected', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /meubles/i }));

      // Once Meubles is selected, the products-section h2 reflects that label.
      // Use getAllByText since "Meubles" also appears in the category button.
      expect(screen.getAllByText(/meubles/i).length).toBeGreaterThan(1);
    });
  });

  describe('Search Functionality', () => {
    it('should update the search input value', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      await user.type(searchInput, 'modern cabinet');

      expect(searchInput).toHaveValue('modern cabinet');
    });

    it('should clear the search input', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      await user.type(searchInput, 'modern cabinet');
      await user.clear(searchInput);

      expect(searchInput).toHaveValue('');
    });

    it('should have type="search" on the search input', () => {
      renderCatalogPage();
      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      expect(searchInput).toHaveAttribute('type', 'search');
    });
  });

  describe('Sort Functionality', () => {
    it('should render the sort dropdown', () => {
      renderCatalogPage();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should expose sort options', () => {
      renderCatalogPage();
      expect(screen.getByRole('option', { name: /pertinence/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /prix croissant/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /prix décroissant/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /nouveautés/i })).toBeInTheDocument();
    });

    it('should change the sort option', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const sortSelect = screen.getByRole('combobox');
      await user.selectOptions(sortSelect, 'price_asc');

      expect(sortSelect).toHaveValue('price_asc');
    });
  });

  describe('Empty State', () => {
    it('should display an empty-state title when there are no products and no filters', () => {
      renderCatalogPage();
      expect(
        screen.getByText(/catalogue en cours de chargement/i),
      ).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('should render at least two <section> regions', () => {
      renderCatalogPage();
      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should render the categories grid', () => {
      renderCatalogPage();
      const grid = document.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderCatalogPage();

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should expose an accessible search input', () => {
      renderCatalogPage();
      expect(
        screen.getByPlaceholderText(/rechercher un produit/i),
      ).toBeInTheDocument();
    });

    it('should expose enabled category buttons', () => {
      renderCatalogPage();
      const categoryButtons = [
        'meubles',
        'électroménager',
        'plans de travail',
        'éviers & robinets',
        'éclairage',
        'accessoires',
      ].map((name) => screen.getByRole('button', { name: new RegExp(name, 'i') }));

      categoryButtons.forEach((button) => {
        expect(button).toBeEnabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in search', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      await user.type(searchInput, 'évier & robinet');

      expect(searchInput).toHaveValue('évier & robinet');
    });

    it('should handle a long search query', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const longQuery = 'a'.repeat(200);
      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      await user.type(searchInput, longQuery);

      expect(searchInput).toHaveValue(longQuery);
    });
  });

  describe('Redux Integration', () => {
    it('should dispatch a fetch action on mount', () => {
      renderCatalogPage();
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
