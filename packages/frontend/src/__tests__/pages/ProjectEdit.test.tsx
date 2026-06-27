/**
 * ProjectEdit Tests
 * Tests for the project edit page - loading, form rendering, validation, submission,
 * error states, 404 handling, unsaved changes modal, and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProjectEdit from '../../pages/Projects/ProjectEdit/ProjectEdit';

// Mock useToast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

// Mock react-router-dom navigate and useParams
const mockNavigate = vi.fn();
const mockId = 'project-123';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: mockId }),
  };
});

const mockFetch = vi.fn();

const mockProjectData = {
  name: 'Modern Kitchen',
  description: 'A beautiful kitchen renovation',
  status: 'in_progress',
  address: '123 Main St',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  clientPhone: '+1 555 123 4567',
};

const renderProjectEdit = () => {
  return render(
    <BrowserRouter>
      <ProjectEdit />
    </BrowserRouter>
  );
};

describe('ProjectEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching project data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderProjectEdit();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should hide loading spinner once data is loaded', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });

      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    it('should fetch project data on mount with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });

      renderProjectEdit();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/v1/projects/${mockId}`,
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should populate form fields with fetched data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });

      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toHaveValue('Modern Kitchen');
      });

      expect(screen.getByLabelText(/description/i)).toHaveValue('A beautiful kitchen renovation');
      expect(screen.getByLabelText(/address/i)).toHaveValue('123 Main St');
      expect(screen.getByLabelText(/client name/i)).toHaveValue('John Doe');
      expect(screen.getByLabelText(/client email/i)).toHaveValue('john@example.com');
      expect(screen.getByLabelText(/client phone/i)).toHaveValue('+1 555 123 4567');
    });

    it('should set status select from fetched data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });

      renderProjectEdit();

      await waitFor(() => {
        const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
        expect(statusSelect.value).toBe('in_progress');
      });
    });
  });

  describe('404 Not Found', () => {
    it('should show 404 when API returns 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
      });
    });

    it('should show resource not found message on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByText(/resource not found/i)).toBeInTheDocument();
      });
    });

    it('should show back to projects button on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderProjectEdit();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /back to projects|retour aux projets/i })
        ).toBeInTheDocument();
      });
    });

    it('should navigate to projects list when back button on 404 is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /back to projects|retour aux projets/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole('button', { name: /back to projects|retour aux projets/i })
      );

      expect(mockNavigate).toHaveBeenCalledWith('/projects');
    });
  });

  describe('Load Error State', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderProjectEdit();

      await waitFor(() => {
        // fr.json: errors might be in french too
        expect(screen.getAllByText(/error|erreur/i).length).toBeGreaterThan(0);
      });
    });

    it('should show try again button on load error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again|réessayer/i })).toBeInTheDocument();
      });
    });

    it('should retry fetch when try again is clicked', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again|réessayer/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again|réessayer/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Rendering', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });
    });

    it('should render the page heading', async () => {
      renderProjectEdit();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /edit project|modifier le projet/i })
        ).toBeInTheDocument();
      });
    });

    it('should render breadcrumb navigation with project link', async () => {
      renderProjectEdit();

      await waitFor(() => {
        const projectLink = screen.getByRole('link', { name: /modern kitchen/i });
        expect(projectLink).toBeInTheDocument();
        expect(projectLink).toHaveAttribute('href', `/projects/${mockId}`);
      });
    });

    it('should render breadcrumb link to projects list', async () => {
      renderProjectEdit();

      await waitFor(() => {
        const projectsLink = screen.getByRole('link', { name: /mes projets/i });
        expect(projectsLink).toBeInTheDocument();
        expect(projectsLink).toHaveAttribute('href', '/projects');
      });
    });

    it('should render status options in select', async () => {
      renderProjectEdit();

      await waitFor(() => {
        const statusSelect = screen.getByLabelText(/status/i);
        expect(statusSelect).toBeInTheDocument();
      });

      // fr.json: projects.status.draft = "Brouillon", in_progress = "En cours".
      expect(screen.getByText(/draft|brouillon/i)).toBeInTheDocument();
      expect(screen.getByText(/in progress|en cours/i)).toBeInTheDocument();
      // fr.json: completed = "Terminé", archived = "Archivé".
      expect(screen.getByText(/completed|terminé/i)).toBeInTheDocument();
      expect(screen.getByText(/archived|archivé/i)).toBeInTheDocument();
    });

    it('should render client information section', async () => {
      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByText(/client information/i)).toBeInTheDocument();
      });
    });

    it('should render description character counter', async () => {
      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByText(`${mockProjectData.description.length}/500`)).toBeInTheDocument();
      });
    });

    it('should render save and cancel buttons', async () => {
      renderProjectEdit();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });
    });

    it('should show error when name is cleared and form is submitted', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toHaveValue('Modern Kitchen');
      });

      await user.clear(screen.getByLabelText(/project name/i));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when name is too short', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toHaveValue('Modern Kitchen');
      });

      await user.clear(screen.getByLabelText(/project name/i));
      await user.type(screen.getByLabelText(/project name/i), 'AB');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/client email/i)).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/client email/i));
      await user.type(screen.getByLabelText(/client email/i), 'not-an-email');
      // The Save button triggers a real <form> submit; HTML5 type="email"
      // would block bad values before our validator runs in jsdom. Submit
      // the form directly to exercise the JS-level validator.
      const form = screen.getByLabelText(/client email/i).closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid phone format', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/client phone/i)).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/client phone/i));
      await user.type(screen.getByLabelText(/client phone/i), 'abc');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
      });
    });

    it('should not submit form when validation fails', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/project name/i));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      // Only the initial fetch, no PUT call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear error when user starts typing in errored field', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/project name/i));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), 'T');

      expect(screen.queryByText(/project name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });
    });

    it('should submit form with PUT method on valid data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toHaveValue('Modern Kitchen');
      });

      // Modify the form to mark dirty
      await user.type(screen.getByLabelText(/project name/i), ' Updated');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/v1/projects/${mockId}`,
          expect.objectContaining({
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should send trimmed form data in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      // Submit with existing data
      await user.type(screen.getByLabelText(/project name/i), ' ');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        const callArgs = mockFetch.mock.calls.find(
          (call: unknown[]) => (call[1] as RequestInit)?.method === 'PUT'
        );
        expect(callArgs).toBeDefined();
        const body = JSON.parse((callArgs![1] as RequestInit).body as string);
        expect(body.name).toBe('Modern Kitchen');
      });
    });

    it('should call toast.success and navigate on successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' x');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/projects');
      });
    });

    it('should call toast.error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' x');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it('should disable submit button while saving', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000)
          )
      );

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' x');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
      });
    });
  });

  describe('Navigation and Unsaved Changes Modal', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });
    });

    it('should navigate directly when cancel is clicked and form is not dirty', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /annuler/i }));

      expect(mockNavigate).toHaveBeenCalledWith(`/projects/${mockId}`);
    });

    it('should show unsaved changes modal when cancel clicked on dirty form', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' change');
      await user.click(screen.getByRole('button', { name: /annuler/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // "Unsaved changes" appears as both the dialog title and inside the
        // description sentence — use getAllBy to be tolerant.
        expect(screen.getAllByText(/unsaved changes/i).length).toBeGreaterThan(0);
      });
    });

    it('should close modal when stay button is clicked', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' change');
      await user.click(screen.getByRole('button', { name: /annuler/i }));

      await waitFor(() => {
        // "Unsaved changes" appears as both the dialog title and inside the
        // description sentence — use getAllBy to be tolerant.
        expect(screen.getAllByText(/unsaved changes/i).length).toBeGreaterThan(0);
      });

      await user.click(screen.getByRole('button', { name: /stay/i }));

      expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
    });

    it('should navigate when leave button is clicked in modal', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' change');
      await user.click(screen.getByRole('button', { name: /annuler/i }));

      await waitFor(() => {
        // "Unsaved changes" appears as both the dialog title and inside the
        // description sentence — use getAllBy to be tolerant.
        expect(screen.getAllByText(/unsaved changes/i).length).toBeGreaterThan(0);
      });

      await user.click(screen.getByRole('button', { name: /leave/i }));

      expect(mockNavigate).toHaveBeenCalledWith(`/projects/${mockId}`);
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProjectData),
      });
    });

    it('should have proper heading hierarchy', async () => {
      renderProjectEdit();

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();
      });
    });

    it('should have a form element', async () => {
      renderProjectEdit();

      await waitFor(() => {
        expect(document.querySelector('form')).toBeInTheDocument();
      });
    });

    it('should mark name field as required', async () => {
      renderProjectEdit();

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/project name/i);
        expect(nameInput).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should set aria-invalid on errored name field', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/project name/i));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have aria-busy on submit button when saving', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000)
          )
      );

      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' x');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /saving/i })).toHaveAttribute(
          'aria-busy',
          'true'
        );
      });
    });

    it('should have validation error role=alert for name errors', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/project name/i));
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should have aria-modal on the unsaved changes dialog', async () => {
      renderProjectEdit();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/project name/i), ' change');
      await user.click(screen.getByRole('button', { name: /annuler/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });
  });
});
