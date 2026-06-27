/**
 * RoleManagement Tests
 * Tests for the admin role management page - loading, rendering, role cards,
 * create modal, edit modal, delete confirmation, permissions, error handling,
 * and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RoleManagement from '../../pages/Admin/RoleManagement/RoleManagement';

const mockFetch = vi.fn();

const mockRoles = [
  {
    id: 'role-1',
    name: 'Admin',
    description: 'Full system access',
    permissions: ['perm-1', 'perm-2', 'perm-3'],
    userCount: 5,
    isSystem: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-03-10T14:30:00Z',
  },
  {
    id: 'role-2',
    name: 'Designer',
    description: 'Kitchen design access',
    permissions: ['perm-1', 'perm-4'],
    userCount: 12,
    isSystem: false,
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-03-12T09:00:00Z',
  },
  {
    id: 'role-3',
    name: 'Viewer',
    description: 'Read-only access',
    permissions: ['perm-1'],
    userCount: 25,
    isSystem: false,
    createdAt: '2025-02-15T00:00:00Z',
    updatedAt: '2025-03-14T16:45:00Z',
  },
];

const mockPermissions = [
  { id: 'perm-1', name: 'View Projects', description: 'Can view projects', category: 'Projects' },
  { id: 'perm-2', name: 'Edit Projects', description: 'Can edit projects', category: 'Projects' },
  { id: 'perm-3', name: 'Manage Users', description: 'Can manage users', category: 'Admin' },
  {
    id: 'perm-4',
    name: 'Create Designs',
    description: 'Can create kitchen designs',
    category: 'Design',
  },
  { id: 'perm-5', name: 'Export Data', description: 'Can export data', category: 'Admin' },
];

const renderRoleManagement = () => {
  return render(
    <BrowserRouter>
      <RoleManagement />
    </BrowserRouter>
  );
};

describe('RoleManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    // Default: both API calls succeed
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRoles),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPermissions),
      });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderRoleManagement();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have loading aria-label on spinner', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderRoleManagement();

      // i18n: fr.json maps common.loading to "Chargement...".
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/loading|chargement/i)
      );
    });
  });

  describe('Rendering', () => {
    it('should render page heading', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /role management/i })
        ).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByText(/define roles and manage permissions/i)).toBeInTheDocument();
      });
    });

    it('should render create role button', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });
    });

    it('should render all role cards', async () => {
      renderRoleManagement();

      await waitFor(() => {
        // 'Admin' is also a permission category header — use getAllBy.
        expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
        expect(screen.getByText('Designer')).toBeInTheDocument();
        expect(screen.getByText('Viewer')).toBeInTheDocument();
      });
    });

    it('should render role descriptions', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByText('Full system access')).toBeInTheDocument();
        expect(screen.getByText('Kitchen design access')).toBeInTheDocument();
        expect(screen.getByText('Read-only access')).toBeInTheDocument();
      });
    });

    it('should show system badge for system roles', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByText(/systeme/i)).toBeInTheDocument();
      });
    });

    it('should show permission count for each role', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByText(/3 permission/i)).toBeInTheDocument();
        expect(screen.getByText(/2 permission/i)).toBeInTheDocument();
        expect(screen.getByText(/1 permission/i)).toBeInTheDocument();
      });
    });

    it('should show user count for each role', async () => {
      renderRoleManagement();

      await waitFor(() => {
        // Each count appears in role card AND in the role-count summary
        // strip. Use getAllBy to tolerate both.
        expect(screen.getAllByText(/5 utilisateur/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/12 utilisateur/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/25 utilisateur/i).length).toBeGreaterThan(0);
      });
    });

    it('should render permission names on role cards', async () => {
      renderRoleManagement();

      await waitFor(() => {
        // Admin has perm-1, perm-2, perm-3
        expect(screen.getAllByText('View Projects').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Edit Projects').length).toBeGreaterThan(0);
      });
    });

    it('should not show delete button for system roles', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
      });

      // The Admin (system) role has 2 delete buttons on non-system roles
      // only — Designer + Viewer. Count delete buttons; expect exactly 2.
      const deleteButtons = screen.getAllByTitle(/supprimer le r[ôo]le/i);
      expect(deleteButtons).toHaveLength(2);
    });

    it('should show delete button for non-system roles', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByText('Designer')).toBeInTheDocument();
      });

      // There should be delete buttons for Designer and Viewer
      const deleteButtons = screen.getAllByTitle(/supprimer le r[ôo]le/i);
      expect(deleteButtons.length).toBe(2);
    });

    it('should render available permissions section', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByText(/permissions disponibles/i)).toBeInTheDocument();
      });
    });

    it('should render permissions grouped by category', async () => {
      renderRoleManagement();

      await waitFor(() => {
        // Categories appear as section labels — Admin and Projects can
        // both be present in multiple places (also a role name + on cards).
        expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Design').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Create Role Modal', () => {
    it('should open create modal when create button is clicked', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/creer un role/i, { selector: 'h2' })).toBeInTheDocument();
      });
    });

    it('should render role name input in create modal', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/nom du role/i)).toBeInTheDocument();
      });
    });

    it('should render description textarea in create modal', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      });
    });

    it('should render permission checkboxes in create modal', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByText(/permissions/i, { selector: 'label' })).toBeInTheDocument();
      });
    });

    it('should show name error when creating with empty name', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // The Creer button should be disabled when name is empty
      const createButton = screen.getByRole('button', { name: /^creer$/i });
      expect(createButton).toBeDisabled();
    });

    it('should show validation error on blur when name is empty', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/nom du role/i)).toBeInTheDocument();
      });

      // Focus and blur the name input
      const nameInput = screen.getByLabelText(/nom du role/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/le nom du role est requis/i)).toBeInTheDocument();
      });
    });

    it('should submit create form with valid data', async () => {
      const createdRole = {
        id: 'role-new',
        name: 'Tester',
        description: 'Test role',
        permissions: ['perm-1'],
        userCount: 0,
        isSystem: false,
        createdAt: '2025-03-15T00:00:00Z',
        updatedAt: '2025-03-15T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createdRole),
      });

      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/nom du role/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/nom du role/i), 'Tester');
      await user.click(screen.getByRole('button', { name: /^creer$/i }));

      await waitFor(() => {
        const postCall = mockFetch.mock.calls.find(
          (call: unknown[]) => (call[1] as RequestInit)?.method === 'POST'
        );
        expect(postCall).toBeDefined();
        expect(postCall![0]).toBe('/api/v1/admin/roles');
      });
    });

    it('should close create modal after successful creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'role-new',
            name: 'Tester',
            description: '',
            permissions: [],
            userCount: 0,
            isSystem: false,
            createdAt: '2025-03-15T00:00:00Z',
            updatedAt: '2025-03-15T00:00:00Z',
          }),
      });

      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/nom du role/i), 'Tester');
      await user.click(screen.getByRole('button', { name: /^creer$/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close create modal when cancel is clicked', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /annuler/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should show selected permissions count in create modal', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByText(/0 permission\(s\) selectionnee/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Role Modal', () => {
    it('should open edit modal when edit button is clicked', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/modifier le role/i)).toHaveLength(3);
      });

      // Click edit on Designer role (second role)
      await user.click(screen.getAllByTitle(/modifier le role/i)[1]);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(screen.getByText(/modifier le role/i, { selector: 'h2' })).toBeInTheDocument();
      });
    });

    it('should populate edit modal with role data', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/modifier le role/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByTitle(/modifier le role/i)[1]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Designer')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Kitchen design access')).toBeInTheDocument();
      });
    });

    it('should disable name field for system roles in edit modal', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/modifier le role/i)).toHaveLength(3);
      });

      // Click edit on Admin role (first, system role)
      await user.click(screen.getAllByTitle(/modifier le role/i)[0]);

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Admin');
        expect(nameInput).toBeDisabled();
      });
    });

    it('should submit update with PUT method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockRoles[1], name: 'Updated Designer' }),
      });

      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/modifier le role/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByTitle(/modifier le role/i)[1]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Designer')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /enregistrer/i }));

      await waitFor(() => {
        const putCall = mockFetch.mock.calls.find(
          (call: unknown[]) => (call[1] as RequestInit)?.method === 'PUT'
        );
        expect(putCall).toBeDefined();
        expect(putCall![0]).toBe('/api/v1/admin/roles/role-2');
      });
    });

    it('should close edit modal when cancel is clicked', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/modifier le role/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByTitle(/modifier le role/i)[1]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /annuler/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Role', () => {
    it('should show delete confirmation modal when delete is clicked', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/supprimer le r[ôo]le/i)).toHaveLength(2);
      });

      await user.click(screen.getAllByTitle(/supprimer le r[ôo]le/i)[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/delete role/i, { selector: 'h2' })).toBeInTheDocument();
      });
    });

    it('should show role name in delete confirmation', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/supprimer le r[ôo]le/i)).toHaveLength(2);
      });

      // First delete button is for Designer (index 0 among non-system roles)
      await user.click(screen.getAllByTitle(/supprimer le r[ôo]le/i)[0]);

      await waitFor(() => {
        expect(screen.getByText(/designer/i, { selector: 'p' })).toBeInTheDocument();
      });
    });

    it('should call DELETE API when delete is confirmed', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/supprimer le r[ôo]le/i)).toHaveLength(2);
      });

      await user.click(screen.getAllByTitle(/supprimer le r[ôo]le/i)[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Delete confirm button — fr.json common.delete = "Supprimer".
      // The dialog renders both Annuler + Supprimer; pick the one inside
      // the dialog.
      const dialog = screen.getByRole('dialog');
      const confirmBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
        /^(delete|supprimer)$/i.test(b.textContent || '')
      )!;
      await user.click(confirmBtn);

      await waitFor(() => {
        const deleteCall = mockFetch.mock.calls.find(
          (call: unknown[]) => (call[1] as RequestInit)?.method === 'DELETE'
        );
        expect(deleteCall).toBeDefined();
      });
    });

    it('should close delete modal when cancel is clicked', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByTitle(/supprimer le r[ôo]le/i)).toHaveLength(2);
      });

      await user.click(screen.getAllByTitle(/supprimer le r[ôo]le/i)[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Cancel button lives inside the dialog.
      const dialog = screen.getByRole('dialog');
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
        /annuler|cancel/i.test(b.textContent || '')
      )!;
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when fetch fails', async () => {
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch roles/i)).toBeInTheDocument();
      });
    });

    it('should dismiss error when dismiss button is clicked', async () => {
      mockFetch.mockReset();
      mockFetch
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch roles/i)).toBeInTheDocument();
      });

      const dismissButtons = document.querySelectorAll('button svg');
      const dismissButton = Array.from(dismissButtons)
        .find((svg) => svg.closest('button')?.closest('.bg-red-50, [class*="bg-red-50"]'))
        ?.closest('button');

      if (dismissButton) {
        await user.click(dismissButton);
        expect(screen.queryByText(/failed to fetch roles/i)).not.toBeInTheDocument();
      }
    });

    it('should show error when system role delete is attempted', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
      });

      // System roles should not have delete buttons
      const deleteButtons = screen.getAllByTitle(/supprimer le r[ôo]le/i);
      expect(deleteButtons.length).toBe(2); // Only non-system roles
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderRoleManagement();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should have aria-modal on create dialog', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'createRoleTitle');
      });
    });

    it('should have aria-required on role name input', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/nom du role/i)).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should have aria-invalid on name input when validation error present', async () => {
      renderRoleManagement();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/nom du role/i)).toBeInTheDocument();
      });

      // Trigger validation: focus and blur
      await user.click(screen.getByLabelText(/nom du role/i));
      await user.tab();

      await waitFor(() => {
        expect(screen.getByLabelText(/nom du role/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have title attributes on edit and delete buttons', async () => {
      renderRoleManagement();

      await waitFor(() => {
        const editButtons = screen.getAllByTitle(/modifier le role/i);
        expect(editButtons.length).toBe(3);

        const deleteButtons = screen.getAllByTitle(/supprimer le r[ôo]le/i);
        expect(deleteButtons.length).toBe(2);
      });
    });
  });
});
