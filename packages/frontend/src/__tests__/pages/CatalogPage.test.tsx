/**
 * CatalogPage Tests
 * Tests for catalog page component - categories, search, and product display
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CatalogPage from '../../pages/CatalogPage';

// Mock Redux store hooks
const mockDispatch = vi.fn();
const mockCatalogState = {
  catalog: {
    catalogs: [],
    products: [],
    providers: [],
    currentCatalog: null,
    currentProduct: null,
    categories: [],
    isLoading: false,
    error: null,
    filters: {},
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  },
};

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: Function) => selector(mockCatalogState),
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
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      renderCatalogPage();

      expect(screen.getByRole('heading', { name: /catalogue/i })).toBeInTheDocument();
    });

    it('should render search input', () => {
      renderCatalogPage();

      expect(screen.getByPlaceholderText(/rechercher un produit/i)).toBeInTheDocument();
    });

    it('should render search button', () => {
      renderCatalogPage();

      expect(screen.getByRole('button', { name: /rechercher/i })).toBeInTheDocument();
    });

    it('should render categories section', () => {
      renderCatalogPage();

      expect(screen.getByRole('heading', { name: /catégories/i })).toBeInTheDocument();
    });
  });

  describe('Categories', () => {
    it('should render all category buttons', () => {
      renderCatalogPage();

      expect(screen.getByRole('button', { name: /meubles/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /électroménager/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /plans de travail/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /éviers & robinets/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /éclairage/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /accessoires/i })).toBeInTheDocument();
    });

    it('should display category icons', () => {
      renderCatalogPage();

      const container = document.body;
      expect(container.textContent).toContain('🗄️'); // cabinets
      expect(container.textContent).toContain('🍳'); // appliances
      expect(container.textContent).toContain('⬜'); // countertops
      expect(container.textContent).toContain('🚰'); // sinks
      expect(container.textContent).toContain('💡'); // lighting
      expect(container.textContent).toContain('🔧'); // accessories
    });

    it('should select category on click', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });
      await user.click(cabinetButton);

      expect(cabinetButton).toHaveClass('bg-blue-600');
    });

    it('should deselect category on second click', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });
      await user.click(cabinetButton);
      await user.click(cabinetButton);

      expect(cabinetButton).not.toHaveClass('bg-blue-600');
    });

    it('should switch between categories', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });
      const applianceButton = screen.getByRole('button', { name: /électroménager/i });

      await user.click(cabinetButton);
      expect(cabinetButton).toHaveClass('bg-blue-600');

      await user.click(applianceButton);
      expect(applianceButton).toHaveClass('bg-blue-600');
      expect(cabinetButton).not.toHaveClass('bg-blue-600');
    });

    it('should update products section title based on selected category', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      expect(screen.getByText(/tous les produits/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /meubles/i }));

      expect(screen.getByRole('heading', { name: /meubles/i })).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should update search input value', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      await user.type(searchInput, 'modern cabinet');

      expect(searchInput).toHaveValue('modern cabinet');
    });

    it('should clear search input', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      await user.type(searchInput, 'modern cabinet');
      await user.clear(searchInput);

      expect(searchInput).toHaveValue('');
    });

    it('should have correct input type', () => {
      renderCatalogPage();

      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      expect(searchInput).toHaveAttribute('type', 'search');
    });
  });

  describe('Sort Functionality', () => {
    it('should render sort dropdown', () => {
      renderCatalogPage();

      const sortSelect = screen.getByRole('combobox');
      expect(sortSelect).toBeInTheDocument();
    });

    it('should have sort options', () => {
      renderCatalogPage();

      expect(screen.getByRole('option', { name: /trier par pertinence/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /prix croissant/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /prix décroissant/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /nouveautés/i })).toBeInTheDocument();
    });

    it('should change sort option', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const sortSelect = screen.getByRole('combobox');
      await user.selectOptions(sortSelect, 'price_asc');

      expect(sortSelect).toHaveValue('price_asc');
    });
  });

  describe('Empty State', () => {
    it('should display empty state message', () => {
      renderCatalogPage();

      expect(screen.getByText(/les produits seront affichés ici/i)).toBeInTheDocument();
    });

    it('should display empty state icon', () => {
      renderCatalogPage();

      const container = document.body;
      expect(container.textContent).toContain('📦');
    });
  });

  describe('Layout and Structure', () => {
    it('should have header section', () => {
      renderCatalogPage();

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have proper section structure', () => {
      renderCatalogPage();

      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should render grid layout for categories', () => {
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

    it('should have accessible search input', () => {
      renderCatalogPage();

      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have accessible category buttons', () => {
      renderCatalogPage();

      const categoryButtons = screen.getAllByRole('button').filter(
        (button) => !button.textContent?.toLowerCase().includes('rechercher')
      );

      categoryButtons.forEach((button) => {
        expect(button).toBeEnabled();
      });
    });
  });

  describe('Interaction States', () => {
    it('should show hover state on category buttons', async () => {
      renderCatalogPage();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });
      expect(cabinetButton).toHaveClass('hover:shadow-lg');
    });

    it('should maintain category selection state', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const cabinetButton = screen.getByRole('button', { name: /meubles/i });

      await user.click(cabinetButton);
      expect(cabinetButton).toHaveClass('bg-blue-600');

      const lightingButton = screen.getByRole('button', { name: /éclairage/i });
      await user.click(lightingButton);
      expect(lightingButton).toHaveClass('bg-blue-600');
      expect(cabinetButton).not.toHaveClass('bg-blue-600');
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

    it('should handle long search queries', async () => {
      renderCatalogPage();
      const user = userEvent.setup();

      const longQuery = 'a'.repeat(200);
      const searchInput = screen.getByPlaceholderText(/rechercher un produit/i);
      await user.type(searchInput, longQuery);

      expect(searchInput).toHaveValue(longQuery);
    });
  });

  describe('Redux Integration', () => {
    it('should dispatch fetchProducts on mount', () => {
      renderCatalogPage();

      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
