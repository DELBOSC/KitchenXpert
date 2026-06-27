/**
 * ProjectsList Tests
 * Tests for projects list page component - fetching, display, pagination, and search
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectsList from '../../pages/Projects/ProjectsList/ProjectsList';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockProjects = [
  {
    id: 'project-1',
    name: 'Modern Kitchen Renovation',
    description: 'Complete kitchen redesign with modern appliances',
    status: 'in_progress' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    kitchenCount: 2,
    thumbnailUrl: 'https://example.com/thumb1.jpg',
  },
  {
    id: 'project-2',
    name: 'Classic French Kitchen',
    description: 'Traditional French-style kitchen with custom cabinetry',
    status: 'completed' as const,
    createdAt: '2023-12-01T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z',
    kitchenCount: 1,
  },
  {
    id: 'project-3',
    name: 'Minimalist Design',
    description: '',
    status: 'draft' as const,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-01-12T00:00:00.000Z',
    kitchenCount: 0,
  },
];

const mockPaginatedResponse = {
  projects: mockProjects,
  pagination: {
    currentPage: 1,
    totalPages: 3,
    totalItems: 25,
    itemsPerPage: 10,
  },
};

const renderProjectsList = () => {
  return render(
    <BrowserRouter>
      <ProjectsList />
    </BrowserRouter>
  );
};

describe('ProjectsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPaginatedResponse),
    });
  });

  describe('Initial Render', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderProjectsList();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render page title after loading', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /mes projets/i })).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/gérez et consultez tous vos projets/i)).toBeInTheDocument();
      });
    });

    it('should render New Project button', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nouveau projet/i })).toBeInTheDocument();
      });
    });
  });

  describe('Projects Display', () => {
    it('should render project cards after loading', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText('Modern Kitchen Renovation')).toBeInTheDocument();
        expect(screen.getByText('Classic French Kitchen')).toBeInTheDocument();
        expect(screen.getByText('Minimalist Design')).toBeInTheDocument();
      });
    });

    it('should display project descriptions', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(
          screen.getByText(/complete kitchen redesign with modern appliances/i)
        ).toBeInTheDocument();
      });
    });

    it('should show "Aucune description" for projects without description', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/aucune description/i)).toBeInTheDocument();
      });
    });

    it('should display kitchen count for each project', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/2 cuisine/i)).toBeInTheDocument();
        expect(screen.getByText(/1 cuisine/i)).toBeInTheDocument();
        expect(screen.getByText(/0 cuisine/i)).toBeInTheDocument();
      });
    });

    it('should display status badges', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/en cours/i)).toBeInTheDocument();
        expect(screen.getByText(/terminé/i)).toBeInTheDocument();
        expect(screen.getByText(/brouillon/i)).toBeInTheDocument();
      });
    });

    it('should link project cards to detail pages', async () => {
      renderProjectsList();

      await waitFor(() => {
        const projectLinks = screen.getAllByRole('link');
        const projectDetailLink = projectLinks.find((link) =>
          link.getAttribute('href')?.includes('/projects/project-1')
        );
        expect(projectDetailLink).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should render search input', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/rechercher un projet/i)).toBeInTheDocument();
      });
    });

    it('should render search button', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /rechercher/i })).toBeInTheDocument();
      });
    });

    it('should update search query on input', async () => {
      renderProjectsList();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/rechercher un projet/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/rechercher un projet/i);
      await user.type(searchInput, 'modern kitchen');

      expect(searchInput).toHaveValue('modern kitchen');
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/erreur de chargement des projets/i)).toBeInTheDocument();
      });
    });

    it('should display error details', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no projects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            projects: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: 10,
            },
          }),
      });

      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/aucun projet/i)).toBeInTheDocument();
      });
    });

    it('should show create first project prompt in empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            projects: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: 10,
            },
          }),
      });

      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/commencez par créer/i)).toBeInTheDocument();
      });
    });

    it('should have create project button in empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            projects: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: 10,
            },
          }),
      });

      renderProjectsList();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /créer votre premier projet/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when multiple pages exist', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /précédent/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /suivant/i })).toBeInTheDocument();
      });
    });

    it('should display page numbers', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      renderProjectsList();

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /précédent/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should highlight current page', async () => {
      renderProjectsList();

      await waitFor(() => {
        const currentPageButton = screen.getByRole('button', { name: '1' });
        expect(currentPageButton).toHaveClass('bg-blue-600');
      });
    });

    it('should display total count', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/affichage de 3 sur 25/i)).toBeInTheDocument();
      });
    });

    it('should not show pagination when single page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            projects: mockProjects.slice(0, 2),
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 2,
              itemsPerPage: 10,
            },
          }),
      });

      renderProjectsList();

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /précédent/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to create project page on New Project click', async () => {
      renderProjectsList();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /nouveau projet/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /nouveau projet/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/projects/create');
    });
  });

  describe('Status Colors', () => {
    it('should apply correct color for draft status', async () => {
      renderProjectsList();

      await waitFor(() => {
        const draftBadge = screen.getByText(/brouillon/i);
        expect(draftBadge).toHaveClass('bg-gray-100');
      });
    });

    it('should apply correct color for in_progress status', async () => {
      renderProjectsList();

      await waitFor(() => {
        const inProgressBadge = screen.getByText(/en cours/i);
        expect(inProgressBadge).toHaveClass('bg-blue-100');
      });
    });

    it('should apply correct color for completed status', async () => {
      renderProjectsList();

      await waitFor(() => {
        const completedBadge = screen.getByText(/terminé/i);
        expect(completedBadge).toHaveClass('bg-green-100');
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format updated date correctly', async () => {
      renderProjectsList();

      await waitFor(() => {
        expect(screen.getByText(/mis à jour.*15/i)).toBeInTheDocument();
      });
    });
  });
});
