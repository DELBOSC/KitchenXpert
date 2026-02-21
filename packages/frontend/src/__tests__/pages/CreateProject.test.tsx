/**
 * CreateProject Tests
 * Tests for the create project page - form rendering, validation, submission, and navigation
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CreateProject from '../../pages/Projects/CreateProject/CreateProject';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockFetch = vi.fn();

const renderCreateProject = () => {
  return render(
    <BrowserRouter>
      <CreateProject />
    </BrowserRouter>
  );
};

describe('CreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe('Rendering', () => {
    it('should render the page heading', () => {
      renderCreateProject();

      // t('projects.createNew', 'Create New Project') — key not in fr.json, fallback used
      expect(
        screen.getByRole('heading', { level: 1, name: /create new project/i })
      ).toBeInTheDocument();
    });

    it('should render the description text', () => {
      renderCreateProject();

      expect(
        screen.getByText(/start a new kitchen design project/i)
      ).toBeInTheDocument();
    });

    it('should render the project name input', () => {
      renderCreateProject();

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    });

    it('should render the description textarea', () => {
      renderCreateProject();

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should render the budget input', () => {
      renderCreateProject();

      expect(screen.getByText(/budget \(optional\)/i)).toBeInTheDocument();
    });

    it('should render the target completion date input', () => {
      renderCreateProject();

      expect(screen.getByLabelText(/target completion date/i)).toBeInTheDocument();
    });

    it('should render currency selector with default USD', () => {
      renderCreateProject();

      const currencySelect = screen.getByDisplayValue('$ USD');
      expect(currencySelect).toBeInTheDocument();
    });

    it('should render breadcrumb navigation', () => {
      renderCreateProject();

      // fr.json: nav.projects = "Mes Projets"
      const projectsLink = screen.getByRole('link', { name: /mes projets/i });
      expect(projectsLink).toBeInTheDocument();
      expect(projectsLink).toHaveAttribute('href', '/projects');
    });

    it('should render the submit button', () => {
      renderCreateProject();

      expect(
        screen.getByRole('button', { name: /create project/i })
      ).toBeInTheDocument();
    });

    it('should render the cancel button', () => {
      renderCreateProject();

      // fr.json: common.cancel = "Annuler"
      expect(
        screen.getByRole('button', { name: /annuler/i })
      ).toBeInTheDocument();
    });

    it('should render tips section', () => {
      renderCreateProject();

      expect(screen.getByText(/tips for a great project/i)).toBeInTheDocument();
    });

    it('should render character counter for description', () => {
      renderCreateProject();

      expect(screen.getByText('0/500')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when name is empty and form is submitted', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when name is too short', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), 'AB');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error when budget is negative', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      // Fill in a valid name first
      await user.type(screen.getByLabelText(/project name/i), 'Test Kitchen');

      // For type="number" with min="0", jsdom may sanitize negative values.
      // Remove the min attribute so fireEvent.change can set -100 properly.
      const budgetInput = screen.getByPlaceholderText(/montant du budget/i) as HTMLInputElement;
      budgetInput.removeAttribute('min');
      fireEvent.change(budgetInput, { target: { value: '-100' } });

      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByText(/budget cannot be negative/i)).toBeInTheDocument();
      });
    });

    it('should show error when target date is in the past', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), 'Test Kitchen');

      const dateInput = screen.getByLabelText(/target completion date/i);
      await user.type(dateInput, '2020-01-01');

      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByText(/cannot be in the past/i)).toBeInTheDocument();
      });
    });

    it('should not submit form when validation fails', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /create project/i }));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should clear error when user starts typing in errored field', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      // Trigger error
      await user.click(screen.getByRole('button', { name: /create project/i }));
      await waitFor(() => {
        expect(screen.getByText(/project name is required/i)).toBeInTheDocument();
      });

      // Start typing in the name field
      await user.type(screen.getByLabelText(/project name/i), 'T');

      // Error should be cleared
      expect(screen.queryByText(/project name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data and navigate on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-project-123' }),
      });

      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), 'Modern Kitchen Renovation');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/projects',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects/new-project-123');
      });
    });

    it('should send trimmed name and description in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'proj-1' }),
      });

      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), '  My Kitchen  ');
      await user.type(screen.getByLabelText(/description/i), '  A nice kitchen  ');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.name).toBe('My Kitchen');
        expect(body.description).toBe('A nice kitchen');
      });
    });

    it('should show error alert when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Server validation failed' }),
      });

      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Server validation failed')).toBeInTheDocument();
      });
    });

    it('should show generic error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ id: '1' }) }), 1000))
      );

      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
      });
    });

    it('should show loading text while submitting', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ id: '1' }) }), 1000))
      );

      renderCreateProject();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');
      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to projects list when cancel button is clicked', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /annuler/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/projects');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderCreateProject();

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('should have a form element', () => {
      renderCreateProject();

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should mark name field as required', () => {
      renderCreateProject();

      const nameInput = screen.getByLabelText(/project name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });

    it('should set aria-invalid on errored name field', async () => {
      renderCreateProject();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /create project/i }));

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/project name/i);
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
