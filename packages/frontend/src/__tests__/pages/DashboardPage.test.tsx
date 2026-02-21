/**
 * DashboardPage Tests
 * Tests for dashboard page component - rendering, user info, and navigation
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DashboardPage from '../../pages/DashboardPage';

// Mock the AuthContext
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Jean Dupont',
  role: 'user',
};

const mockUseAuth = vi.fn(() => ({
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Redux store hooks
const mockDispatch = vi.fn();
const mockProjectState = {
  project: {
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  },
};

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: Function) => selector(mockProjectState),
}));

const renderDashboardPage = () => {
  return render(
    <BrowserRouter>
      <DashboardPage />
    </BrowserRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('Rendering', () => {
    it('should render welcome message with user name', () => {
      renderDashboardPage();

      expect(screen.getByText(/bonjour, jean dupont/i)).toBeInTheDocument();
    });

    it('should render default username when user name is not available', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
      });

      renderDashboardPage();

      expect(screen.getByText(/bonjour, utilisateur/i)).toBeInTheDocument();
    });

    it('should render welcome subtitle', () => {
      renderDashboardPage();

      expect(screen.getByText(/bienvenue sur votre tableau de bord kitchenxpert/i)).toBeInTheDocument();
    });

    it('should render quick actions section', () => {
      renderDashboardPage();

      expect(screen.getByText(/actions rapides/i)).toBeInTheDocument();
    });

    it('should render recent projects section', () => {
      renderDashboardPage();

      expect(screen.getByText(/projets récents/i)).toBeInTheDocument();
    });
  });

  describe('Quick Action Cards', () => {
    it('should render New Design card with correct link', () => {
      renderDashboardPage();

      const newDesignLink = screen.getByRole('link', { name: /nouveau design/i });
      expect(newDesignLink).toBeInTheDocument();
      expect(newDesignLink).toHaveAttribute('href', '/designer');
    });

    it('should render My Projects card with correct link', () => {
      renderDashboardPage();

      const projectsLink = screen.getByRole('link', { name: /mes projets/i });
      expect(projectsLink).toBeInTheDocument();
      expect(projectsLink).toHaveAttribute('href', '/projects');
    });

    it('should render Catalog card with correct link', () => {
      renderDashboardPage();

      const catalogLink = screen.getByRole('link', { name: /catalogue/i });
      expect(catalogLink).toBeInTheDocument();
      expect(catalogLink).toHaveAttribute('href', '/catalog');
    });

    it('should render Profile card with correct link', () => {
      renderDashboardPage();

      const profileLink = screen.getByRole('link', { name: /profil/i });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute('href', '/profile');
    });

    it('should render all four quick action cards', () => {
      renderDashboardPage();

      const cards = screen.getAllByRole('link');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    it('should display correct descriptions for quick actions', () => {
      renderDashboardPage();

      expect(screen.getByText(/créer une nouvelle cuisine/i)).toBeInTheDocument();
      expect(screen.getByText(/voir tous mes designs/i)).toBeInTheDocument();
      expect(screen.getByText(/explorer les produits/i)).toBeInTheDocument();
      expect(screen.getByText(/gérer mon compte/i)).toBeInTheDocument();
    });
  });

  describe('Recent Projects Section', () => {
    it('should show empty state when no projects', () => {
      renderDashboardPage();

      expect(screen.getByText(/aucun projet pour le moment/i)).toBeInTheDocument();
    });

    it('should render link to create first design', () => {
      renderDashboardPage();

      const createLink = screen.getByRole('link', { name: /créez votre premier design/i });
      expect(createLink).toBeInTheDocument();
      expect(createLink).toHaveAttribute('href', '/projects/new');
    });
  });

  describe('Layout and Styling', () => {
    it('should have main container with proper structure', () => {
      renderDashboardPage();

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
    });

    it('should render icons in quick action cards', () => {
      renderDashboardPage();

      const container = document.body;
      expect(container.textContent).toContain('➕');
      expect(container.textContent).toContain('📁');
      expect(container.textContent).toContain('📚');
      expect(container.textContent).toContain('👤');
    });
  });

  describe('User Context', () => {
    it('should handle null user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      renderDashboardPage();

      expect(screen.getByText(/bonjour, utilisateur/i)).toBeInTheDocument();
    });

    it('should handle user with empty name', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com', name: '' },
        isAuthenticated: true,
        isLoading: false,
      });

      renderDashboardPage();

      expect(screen.getByText(/bonjour, utilisateur/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderDashboardPage();

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should have accessible links', () => {
      renderDashboardPage();

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should have proper semantic structure', () => {
      renderDashboardPage();

      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Responsive Design', () => {
    it('should render grid layout for quick actions', () => {
      renderDashboardPage();

      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });
  });
});
