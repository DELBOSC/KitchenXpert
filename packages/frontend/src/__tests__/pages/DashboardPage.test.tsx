/**
 * DashboardPage Tests
 * Tests for dashboard page component — rendering, user info, and navigation.
 *
 * Updated 2026-05-12 to match the redesigned dashboard:
 * - greeting uses just the first name segment (split(' ')[0]) — falls back
 *   to "chez vous" when name is missing
 * - subtitle is "Voici où vous en êtes aujourd'hui."
 * - "Accès rapides" (not "Actions rapides")
 * - icons are Lucide SVGs (not emoji)
 * - empty state copy is "Aucun projet pour l'instant"
 * - empty-state CTA is "Créer un projet" → /projects/new
 *
 * The page now dispatches a thunk that returns a promise — the mock
 * dispatch must return something `.unwrap()`-able.
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DashboardPage from '../../pages/DashboardPage';

// ---- AuthContext --------------------------------------------------------
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Jean Dupont',
  role: 'user',
};
const mockUseAuth = vi.fn(() => ({
  user: mockUser as { id: string; email: string; name?: string; role?: string } | null,
  isAuthenticated: true,
  isLoading: false,
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ---- Sandbox migration banner: stubbed so it doesn't render anything ----
vi.mock('../../components/sandbox/SandboxMigrationBanner', () => ({
  SandboxMigrationBanner: () => null,
}));

// ---- Redux store hooks ---------------------------------------------------
const mockProjectState = {
  project: {
    projects: [] as unknown[],
    currentProject: null,
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  },
};

const mockDispatch = vi.fn(() => {
  const p: Promise<unknown> & { unwrap?: () => Promise<unknown>; abort?: () => void } =
    Promise.resolve({}) as Promise<unknown> & {
      unwrap?: () => Promise<unknown>;
      abort?: () => void;
    };
  p.unwrap = () => Promise.resolve({});
  p.abort = () => {};
  return p;
});

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (s: typeof mockProjectState) => unknown) => selector(mockProjectState),
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
    mockProjectState.project.projects = [];
    mockProjectState.project.isLoading = false;
    mockProjectState.project.error = null;
  });

  describe('Rendering', () => {
    it('should render welcome message with first name only', () => {
      renderDashboardPage();
      // Title is "Bonjour, <span>Jean</span>" — text is split across nodes,
      // so query both halves.
      expect(screen.getByText(/bonjour/i)).toBeInTheDocument();
      expect(screen.getByText('Jean')).toBeInTheDocument();
    });

    it('should fall back to a generic salutation when no name is available', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
      });
      renderDashboardPage();
      // Generic salutation copy is "chez vous".
      expect(screen.getByText(/chez vous/i)).toBeInTheDocument();
    });

    it('should render welcome subtitle', () => {
      renderDashboardPage();
      expect(screen.getByText(/voici où vous en êtes aujourd'hui/i)).toBeInTheDocument();
    });

    it('should render the quick-actions section heading', () => {
      renderDashboardPage();
      expect(screen.getByText(/accès rapides/i)).toBeInTheDocument();
    });

    it('should render recent projects section heading', () => {
      renderDashboardPage();
      expect(screen.getByText(/projets récents/i)).toBeInTheDocument();
    });
  });

  describe('Quick Action Cards', () => {
    it('should render a "Nouveau design" link to /designer', () => {
      renderDashboardPage();
      const newDesignLinks = screen
        .getAllByRole('link')
        .filter((l) => l.getAttribute('href') === '/designer');
      // There are two: the header CTA + the quick action card.
      expect(newDesignLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('should render a "Mes projets" card linking to /projects', () => {
      renderDashboardPage();
      const link = screen.getByRole('link', { name: /mes projets/i });
      expect(link).toHaveAttribute('href', '/projects');
    });

    it('should render a "Catalogue" card linking to /catalog', () => {
      renderDashboardPage();
      const link = screen.getByRole('link', { name: /catalogue/i });
      expect(link).toHaveAttribute('href', '/catalog');
    });

    it('should render a "Profil" card linking to /profile', () => {
      renderDashboardPage();
      const link = screen.getByRole('link', { name: /profil/i });
      expect(link).toHaveAttribute('href', '/profile');
    });

    it('should render at least four quick-action links', () => {
      renderDashboardPage();
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(4);
    });

    it('should display the correct descriptions for each quick action', () => {
      renderDashboardPage();
      expect(screen.getByText(/créez une cuisine de zéro/i)).toBeInTheDocument();
      expect(screen.getByText(/reprendre où j'en étais/i)).toBeInTheDocument();
      expect(screen.getByText(/produits & marques/i)).toBeInTheDocument();
      expect(screen.getByText(/paramètres & compte/i)).toBeInTheDocument();
    });
  });

  describe('Recent Projects Section', () => {
    it('should show the empty state when no projects are returned', () => {
      renderDashboardPage();
      expect(screen.getByText(/aucun projet pour l'instant/i)).toBeInTheDocument();
    });

    it('should render an empty-state CTA linking to /projects/new', () => {
      renderDashboardPage();
      const createLink = screen.getByRole('link', { name: /créer un projet/i });
      expect(createLink).toHaveAttribute('href', '/projects/new');
    });
  });

  describe('Layout and Styling', () => {
    it('should render an h1 and at least two section headings', () => {
      renderDashboardPage();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      // The page exposes 2 section h2-equivalent headings ("Accès rapides"
      // + "Projets récents"); they are rendered as <h2>.
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2);
    });

    it('should render the quick-action grid', () => {
      renderDashboardPage();
      expect(document.querySelector('.grid')).toBeInTheDocument();
    });
  });

  describe('User Context', () => {
    it('should handle a null user gracefully', () => {
      mockUseAuth.mockReturnValueOnce({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      renderDashboardPage();
      expect(screen.getByText(/chez vous/i)).toBeInTheDocument();
    });

    it('should handle a user with an empty name', () => {
      mockUseAuth.mockReturnValueOnce({
        user: { id: 'user-123', email: 'test@example.com', name: '' },
        isAuthenticated: true,
        isLoading: false,
      });
      renderDashboardPage();
      expect(screen.getByText(/chez vous/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderDashboardPage();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    });

    it('should have accessible links (all carry an href)', () => {
      renderDashboardPage();
      screen.getAllByRole('link').forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });

    it('should render at least two <section> regions', () => {
      renderDashboardPage();
      const sections = document.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });
  });
});
