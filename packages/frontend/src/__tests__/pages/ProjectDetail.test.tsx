/**
 * ProjectDetail Tests
 * Tests for project detail page - loading state, data display, kitchen list, actions, error handling
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectDetail from '../../pages/Projects/ProjectDetail/ProjectDetail';

// Mock AuthContext (required by CommentThread child component)
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      userId: 'user-123',
      email: 'jean@example.com',
      name: 'Jean Dupont',
      role: 'user',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock react-router-dom navigate and useParams
const mockNavigate = vi.fn();
const mockProjectId = 'project-abc-123';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: mockProjectId }),
  };
});

const mockFetch = vi.fn();

const sampleProject = {
  id: 'project-abc-123',
  name: 'Ma Cuisine Moderne',
  description: 'Renovation complète de la cuisine principale',
  status: 'in_progress',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-02-20T14:30:00Z',
  kitchens: [
    {
      id: 'kitchen-1',
      name: 'Cuisine Principale',
      style: 'Modern',
      dimensions: { width: 5, height: 2.7, depth: 4 },
      status: 'designing',
      thumbnailUrl: null,
      createdAt: '2025-01-16T08:00:00Z',
      updatedAt: '2025-01-17T09:00:00Z',
    },
    {
      id: 'kitchen-2',
      name: 'Kitchenette Invités',
      style: 'Scandinavian',
      dimensions: { width: 3, height: 2.5, depth: 2.5 },
      status: 'draft',
      thumbnailUrl: null,
      createdAt: '2025-01-18T08:00:00Z',
      updatedAt: '2025-01-19T09:00:00Z',
    },
  ],
  budget: {
    total: 25000,
    spent: 12500,
    currency: 'EUR',
  },
  owner: {
    id: 'user-123',
    name: 'Jean Dupont',
    email: 'jean@example.com',
  },
};

const renderProjectDetail = () => {
  return render(
    <BrowserRouter>
      <ProjectDetail />
    </BrowserRouter>
  );
};

describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe('Loading State', () => {
    it('should display loading skeleton on initial render', () => {
      // Fetch never resolves so component stays in loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderProjectDetail();

      // fr.json: common.loading = "Chargement..."
      expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
    });

    it('should show pulse animation placeholders while loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderProjectDetail();

      const pulseElements = document.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Project Data Display', () => {
    it('should display project name after loading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /ma cuisine moderne/i })
        ).toBeInTheDocument();
      });
    });

    it('should display project description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(
          screen.getByText('Renovation complète de la cuisine principale')
        ).toBeInTheDocument();
      });
    });

    it('should display project status badge', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.status.in_progress = "En cours"
        expect(screen.getByText('En cours')).toBeInTheDocument();
      });
    });

    it('should display budget information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.budgetOverview = "Aperçu du budget"
        expect(screen.getByText(/aperçu du budget/i)).toBeInTheDocument();
      });
    });

    it('should display budget progress bar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should display owner name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(screen.getByText(/jean dupont/i)).toBeInTheDocument();
      });
    });

    it('should display breadcrumb with project name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        const breadcrumbLink = screen.getByRole('link', { name: /mes projets/i });
        expect(breadcrumbLink).toHaveAttribute('href', '/projects');
      });
    });
  });

  describe('Kitchen List', () => {
    it('should display kitchen cards when kitchens exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(screen.getByText('Cuisine Principale')).toBeInTheDocument();
        expect(screen.getByText('Kitchenette Invités')).toBeInTheDocument();
      });
    });

    it('should display kitchen count in section heading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.kitchensSection = "Cuisines ({{count}})"
        expect(screen.getByText('Cuisines (2)')).toBeInTheDocument();
      });
    });

    it('should display kitchen styles', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
        expect(screen.getByText('Scandinavian')).toBeInTheDocument();
      });
    });

    it('should show empty state when project has no kitchens', async () => {
      const projectNoKitchens = { ...sampleProject, kitchens: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(projectNoKitchens),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.noKitchens = "Aucune cuisine"
        expect(screen.getByText(/aucune cuisine/i)).toBeInTheDocument();
      });
    });

    it('should render links to kitchen detail pages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        const kitchenLinks = screen
          .getAllByRole('link')
          .filter((link) => link.getAttribute('href')?.includes('/kitchens/'));
        expect(kitchenLinks).toHaveLength(2);
      });
    });
  });

  describe('Action Buttons', () => {
    it('should display the edit project button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.editProject = "Modifier le projet"
        expect(screen.getByRole('button', { name: /modifier le projet/i })).toBeInTheDocument();
      });
    });

    it('should display the delete button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: common.delete = "Supprimer"
        expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument();
      });
    });

    it('should display the add kitchen button', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.addKitchen = "Ajouter une cuisine"
        expect(screen.getByRole('button', { name: /ajouter une cuisine/i })).toBeInTheDocument();
      });
    });

    it('should navigate to edit page when edit button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /modifier le projet/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /modifier le projet/i }));
      expect(mockNavigate).toHaveBeenCalledWith(`/projects/${mockProjectId}/edit`);
    });

    it('should open delete modal when delete button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^supprimer$/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^supprimer$/i }));

      // fr.json: projects.deleteConfirmTitle = "Supprimer le projet"
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(document.getElementById('delete-modal-title')).toHaveTextContent(
        /supprimer le projet/i
      );
    });
  });

  describe('Error Handling', () => {
    it('should display error state when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: common.error = "Erreur" — use heading role to disambiguate from error message text
        expect(screen.getByRole('heading', { name: /^erreur$/i })).toBeInTheDocument();
      });
    });

    it('should display 404 state when project is not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: common.tryAgain = "Réessayer"
        expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
      });
    });

    it('should display back to projects button on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.backToProjects = "Retour aux projets"
        expect(screen.getByRole('button', { name: /retour aux projets/i })).toBeInTheDocument();
      });
    });

    it('should retry fetch when retry button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
      });

      const callsBefore = mockFetch.mock.calls.filter(
        (call) => call[0] === `/api/v1/projects/${mockProjectId}`
      ).length;

      await user.click(screen.getByRole('button', { name: /réessayer/i }));

      await waitFor(() => {
        const callsAfter = mockFetch.mock.calls.filter(
          (call) => call[0] === `/api/v1/projects/${mockProjectId}`
        ).length;
        expect(callsAfter).toBeGreaterThan(callsBefore);
      });
    });
  });

  describe('Quick Actions', () => {
    it('should display AI generator action card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.aiGenerator = "Générateur IA"
        expect(screen.getByText(/générateur ia/i)).toBeInTheDocument();
      });
    });

    it('should display VR viewer action card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.vrViewer = "Visionneuse VR"
        expect(screen.getByText(/visionneuse vr/i)).toBeInTheDocument();
      });
    });

    it('should display export action card', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        // fr.json: projects.export = "Exporter"
        expect(screen.getByText(/exporter/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should call fetch for project data with credentials on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sampleProject),
      });

      renderProjectDetail();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/v1/projects/${mockProjectId}`,
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });
  });
});
