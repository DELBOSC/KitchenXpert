/**
 * UserManagement Tests
 * Tests for admin user management page - user list, filters, bulk actions, modals
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import UserManagement from '../../pages/Admin/UserManagement/UserManagement';

// Mock the Toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

const mockFetch = vi.fn();

const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    role: 'admin' as const,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLoginAt: '2024-06-15T10:00:00.000Z',
    projectCount: 5,
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Dupont',
    role: 'user' as const,
    status: 'active' as const,
    createdAt: '2024-02-15T00:00:00.000Z',
    lastLoginAt: '2024-06-10T08:00:00.000Z',
    projectCount: 3,
  },
  {
    id: 'user-3',
    email: 'charlie@example.com',
    firstName: 'Charlie',
    lastName: 'Bernard',
    role: 'designer' as const,
    status: 'suspended' as const,
    createdAt: '2024-03-20T00:00:00.000Z',
    projectCount: 0,
  },
];

const mockPaginatedResponse = {
  users: mockUsers,
  pagination: {
    currentPage: 1,
    totalPages: 2,
    totalItems: 30,
    itemsPerPage: 20,
  },
};

const renderUserManagement = (initialRoute = '/admin/users') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <UserManagement />
    </MemoryRouter>
  );
};

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPaginatedResponse),
    });

    global.fetch = mockFetch;
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderUserManagement();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Page Header', () => {
    it('should render page title after loading', async () => {
      renderUserManagement();

      await waitFor(() => {
        // t('admin.userManagement', 'User Management') - not in fr.json, uses fallback
        expect(screen.getByRole('heading', { name: /user management/i })).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(
          screen.getByText(/manage user accounts, roles, and permissions/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Filter Controls', () => {
    it('should render search input', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
      });
    });

    it('should render role and status filter dropdowns', async () => {
      renderUserManagement();

      await waitFor(() => {
        // Role filter should have "All Roles" option displayed
        expect(screen.getByText(/all roles/i)).toBeInTheDocument();
      });

      // There should be at least 2 select dropdowns (role + status)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('should render status filter dropdown', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText(/all status/i)).toBeInTheDocument();
      });
    });

    it('should render search button', async () => {
      renderUserManagement();

      await waitFor(() => {
        // fr.json: common.search = "Rechercher"
        expect(screen.getByRole('button', { name: /rechercher/i })).toBeInTheDocument();
      });
    });

    it('should update search input on typing', async () => {
      renderUserManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search users/i);
      await user.type(searchInput, 'alice');

      expect(searchInput).toHaveValue('alice');
    });
  });

  describe('User Table', () => {
    it('should render user table with column headers', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      });

      // Table should exist with proper column headers
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThanOrEqual(7);
    });

    it('should render user rows with correct data', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText('Alice Martin')).toBeInTheDocument();
        expect(screen.getByText('admin@example.com')).toBeInTheDocument();
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
        expect(screen.getByText('Charlie Bernard')).toBeInTheDocument();
        expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
      });
    });

    it('should display user roles', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('designer')).toBeInTheDocument();
      });

      // "user" role text for Bob
      const userRoleBadges = screen.getAllByText('user');
      expect(userRoleBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('should display user statuses', async () => {
      renderUserManagement();

      await waitFor(() => {
        const activeStatuses = screen.getAllByText('active');
        expect(activeStatuses.length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('suspended')).toBeInTheDocument();
      });
    });

    it('should display project counts', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('should display user initials when no avatar', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText('AM')).toBeInTheDocument(); // Alice Martin
        expect(screen.getByText('BD')).toBeInTheDocument(); // Bob Dupont
        expect(screen.getByText('CB')).toBeInTheDocument(); // Charlie Bernard
      });
    });

    it('should show "Never" for users without last login', async () => {
      renderUserManagement();

      await waitFor(() => {
        // Charlie has no lastLoginAt, so it shows t('common.never', 'Never')
        expect(screen.getByText(/never/i)).toBeInTheDocument();
      });
    });

    it('should render View links for each user', async () => {
      renderUserManagement();

      await waitFor(() => {
        // t('common.view', 'View')
        const viewLinks = screen.getAllByText(/view/i);
        expect(viewLinks.length).toBe(3);
      });

      const viewLink = screen
        .getAllByRole('link')
        .find((link) => link.getAttribute('href') === '/admin/users/user-1');
      expect(viewLink).toBeInTheDocument();
    });

    it('should render Edit buttons for each user', async () => {
      renderUserManagement();

      await waitFor(() => {
        // t('common.edit', 'Edit') in the table actions
        // Note: "Modifier" from fr.json matches, but the table uses the fallback "Edit"
        // fr.json: common.edit = "Modifier"
        const editButtons = screen.getAllByText(/modifier/i);
        expect(editButtons.length).toBe(3);
      });
    });

    it('should show Suspend button for active users', async () => {
      renderUserManagement();

      await waitFor(() => {
        // t('admin.suspend', 'Suspend') - not in fr.json, renders "Suspend"
        // Use exact text to avoid matching "suspended" status badge
        const suspendButtons = screen.getAllByRole('button', { name: /^suspend$/i });
        expect(suspendButtons.length).toBe(2); // 2 active users (Alice, Bob)
      });
    });

    it('should show Activate button for suspended users', async () => {
      renderUserManagement();

      await waitFor(() => {
        // t('admin.activate', 'Activate') - not in fr.json
        const activateButtons = screen.getAllByRole('button', { name: /^activate$/i });
        expect(activateButtons.length).toBe(1); // Charlie is suspended
      });
    });
  });

  describe('User Selection', () => {
    it('should render select-all checkbox', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      });

      // t('admin.selectAll', 'Selectionner tout')
      const selectAll = screen.getByLabelText(/selectionner tout/i);
      expect(selectAll).toBeInTheDocument();
    });

    it('should show bulk actions bar when users are selected', async () => {
      renderUserManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      });

      // Check the select-all checkbox
      const selectAll = screen.getByLabelText(/selectionner tout/i);
      await user.click(selectAll);

      await waitFor(() => {
        // Bulk action buttons should appear
        expect(screen.getByText(/activate selected/i)).toBeInTheDocument();
        expect(screen.getByText(/suspend selected/i)).toBeInTheDocument();
        expect(screen.getByText(/change role/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no users match', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            users: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: 20,
            },
          }),
      });

      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText(/no users found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination when multiple pages exist', async () => {
      renderUserManagement();

      await waitFor(() => {
        // fr.json: common.previous = "Précédent", common.next = "Suivant"
        expect(screen.getByRole('button', { name: /précédent/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /suivant/i })).toBeInTheDocument();
      });
    });

    it('should disable Previous button on first page', async () => {
      renderUserManagement();

      await waitFor(() => {
        const prevButton = screen.getByRole('button', {
          name: /précédent/i,
        });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should not show pagination when single page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            users: mockUsers,
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 3,
              itemsPerPage: 20,
            },
          }),
      });

      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText('Alice Martin')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /précédent/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch users/i)).toBeInTheDocument();
      });
    });

    it('should display error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderUserManagement();

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should show dismiss button on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderUserManagement();

      await waitFor(() => {
        // t('common.dismiss', 'Dismiss')
        expect(screen.getByText(/dismiss/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('should fetch users from admin endpoint on mount', async () => {
      renderUserManagement();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/admin/users'),
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible table with aria-label', async () => {
      renderUserManagement();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        expect(table).toHaveAttribute('aria-label');
      });
    });

    it('should have proper heading structure', async () => {
      renderUserManagement();

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      });
    });
  });
});
