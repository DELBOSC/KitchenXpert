/**
 * AuditLogs Tests
 * Tests for the admin audit logs page - loading, rendering, filtering,
 * pagination, export, detail modal, error handling, and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AuditLogs from '../../pages/Admin/AuditLogs/AuditLogs';

// Mock react-router-dom useSearchParams
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

const mockFetch = vi.fn();

const mockLogs = [
  {
    id: 'log-1',
    timestamp: '2025-03-15T10:30:00Z',
    action: 'user.login',
    category: 'auth' as const,
    severity: 'info' as const,
    userId: 'user-1',
    userName: 'Jean Dupont',
    userEmail: 'jean@example.com',
    resourceType: undefined,
    resourceId: undefined,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    details: { method: 'password' },
    success: true,
  },
  {
    id: 'log-2',
    timestamp: '2025-03-15T11:00:00Z',
    action: 'project.delete',
    category: 'project' as const,
    severity: 'warning' as const,
    userId: 'user-2',
    userName: 'Marie Martin',
    userEmail: 'marie@example.com',
    resourceType: 'project',
    resourceId: 'proj-456',
    ipAddress: '10.0.0.5',
    userAgent: 'Chrome/120',
    details: { projectName: 'Old Kitchen' },
    success: true,
  },
  {
    id: 'log-3',
    timestamp: '2025-03-15T12:00:00Z',
    action: 'admin.config.change',
    category: 'admin' as const,
    severity: 'error' as const,
    userId: undefined,
    userName: undefined,
    userEmail: undefined,
    resourceType: undefined,
    resourceId: undefined,
    ipAddress: undefined,
    userAgent: undefined,
    details: { error: 'Permission denied' },
    success: false,
  },
];

const mockPagination = {
  currentPage: 1,
  totalPages: 3,
  totalItems: 150,
  itemsPerPage: 50,
};

const mockApiResponse = {
  logs: mockLogs,
  pagination: mockPagination,
};

const renderAuditLogs = () => {
  return render(
    <MemoryRouter>
      <AuditLogs />
    </MemoryRouter>
  );
};

describe('AuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching initial data', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderAuditLogs();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('should render page heading', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /audit logs/i })).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText(/view and analyze system activity logs/i)).toBeInTheDocument();
      });
    });

    it('should render export button', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });
    });

    it('should render search input', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('should render category filter select', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByDisplayValue(/toutes les categories/i)).toBeInTheDocument();
      });
    });

    it('should render severity filter select', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByDisplayValue(/toutes les severites/i)).toBeInTheDocument();
      });
    });

    it('should render start and end date inputs', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      });
    });

    it('should render apply filters button', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /appliquer les filtres/i })).toBeInTheDocument();
      });
    });

    it('should render severity stats cards', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText('Info')).toBeInTheDocument();
        expect(screen.getByText('Avertissement')).toBeInTheDocument();
      });
    });
  });

  describe('Table Rendering', () => {
    it('should render table headers', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText(/date/i, { selector: 'th' })).toBeInTheDocument();
        expect(screen.getByText(/action/i, { selector: 'th' })).toBeInTheDocument();
      });
    });

    it('should render log entries in the table', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText('user.login')).toBeInTheDocument();
        expect(screen.getByText('project.delete')).toBeInTheDocument();
        expect(screen.getByText('admin.config.change')).toBeInTheDocument();
      });
    });

    it('should display user names in log entries', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
        expect(screen.getByText('Marie Martin')).toBeInTheDocument();
      });
    });

    it('should display user emails in log entries', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText('jean@example.com')).toBeInTheDocument();
        expect(screen.getByText('marie@example.com')).toBeInTheDocument();
      });
    });

    it('should display success/failed status for each log', async () => {
      renderAuditLogs();

      await waitFor(() => {
        const successElements = screen.getAllByText(/succes/i);
        expect(successElements.length).toBeGreaterThan(0);

        const failedElements = screen.getAllByText(/echoue/i);
        expect(failedElements.length).toBeGreaterThan(0);
      });
    });

    it('should show system label for logs without userName', async () => {
      renderAuditLogs();

      await waitFor(() => {
        // The third log has no userName, should show "Systeme"
        const systemElements = screen.getAllByText(/systeme/i);
        expect(systemElements.length).toBeGreaterThan(0);
      });
    });

    it('should render view details buttons for each log', async () => {
      renderAuditLogs();

      await waitFor(() => {
        const detailButtons = screen.getAllByText(/voir le detail/i);
        expect(detailButtons).toHaveLength(3);
      });
    });
  });

  describe('Detail Modal', () => {
    it('should open detail modal when view details is clicked', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText(/voir le detail/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByText(/voir le detail/i)[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/detail du log/i)).toBeInTheDocument();
      });
    });

    it('should display log ID in the modal', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText(/voir le detail/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByText(/voir le detail/i)[0]);

      await waitFor(() => {
        expect(screen.getByText('log-1')).toBeInTheDocument();
      });
    });

    it('should display user info section in modal', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText(/voir le detail/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByText(/voir le detail/i)[0]);

      await waitFor(() => {
        expect(screen.getByText(/informations utilisateur/i)).toBeInTheDocument();
      });
    });

    it('should display IP address in modal', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText(/voir le detail/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByText(/voir le detail/i)[0]);

      await waitFor(() => {
        expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
      });
    });

    it('should display additional details JSON in modal', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText(/voir le detail/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByText(/voir le detail/i)[0]);

      await waitFor(() => {
        expect(screen.getByText(/details supplementaires/i)).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText(/voir le detail/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByText(/voir le detail/i)[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /fermer/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should have aria-modal and aria-labelledby on the detail dialog', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText(/voir le detail/i)).toHaveLength(3);
      });

      await user.click(screen.getAllByText(/voir le detail/i)[0]);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'auditDetailTitle');
      });
    });
  });

  describe('Pagination', () => {
    it('should render pagination when totalPages > 1', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText(/precedent/i)).toBeInTheDocument();
        expect(screen.getByText(/suivant/i)).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      renderAuditLogs();

      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /precedent/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should call setSearchParams when next page is clicked', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /suivant/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /suivant/i }));

      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });

  describe('Filtering', () => {
    it('should call setSearchParams when apply filters is clicked', async () => {
      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /appliquer les filtres/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /appliquer les filtres/i }));

      expect(mockSetSearchParams).toHaveBeenCalled();
    });

    it('should show date range error when start date is after end date', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2025-06-15' } });
      fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2025-06-10' } });

      await waitFor(() => {
        expect(screen.getByText(/la date de debut/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch audit logs/i)).toBeInTheDocument();
      });
    });

    it('should have dismiss error button', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByLabelText(/dismiss error/i)).toBeInTheDocument();
      });
    });

    it('should dismiss error when dismiss button is clicked', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch audit logs/i)).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText(/dismiss error/i));

      expect(screen.queryByText(/failed to fetch audit logs/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show no results message when logs array is empty', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          logs: [],
          pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 50 },
        }),
      });

      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByText(/aucun log ne correspond/i)).toBeInTheDocument();
      });
    });
  });

  describe('Export', () => {
    it('should call export API when export button is clicked', async () => {
      const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      renderAuditLogs();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /export/i }));

      await waitFor(() => {
        const exportCall = mockFetch.mock.calls.find(
          (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('export')
        );
        expect(exportCall).toBeDefined();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should have search input with aria-label', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByLabelText(/search audit logs/i)).toBeInTheDocument();
      });
    });

    it('should have table element for logs', async () => {
      renderAuditLogs();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });
});
