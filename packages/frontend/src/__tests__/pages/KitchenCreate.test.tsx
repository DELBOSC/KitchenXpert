/**
 * KitchenCreate Tests
 * Tests for kitchen creation page - form fields, unit toggle, style selection, validation, submission
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import KitchenCreate from '../../pages/Projects/KitchenCreate/KitchenCreate';

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

// Mock react-router-dom navigate and useParams
const mockNavigate = vi.fn();
const mockProjectId = 'project-xyz-456';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: mockProjectId }),
  };
});

const mockFetch = vi.fn();

const renderKitchenCreate = () => {
  return render(
    <BrowserRouter>
      <KitchenCreate />
    </BrowserRouter>
  );
};

describe('KitchenCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: project name fetch succeeds
    mockFetch.mockImplementation((url: string) => {
      if (url === `/api/v1/projects/${mockProjectId}`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: 'Mon Projet' }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    global.fetch = mockFetch;
  });

  describe('Rendering', () => {
    it('should render the page heading', async () => {
      renderKitchenCreate();

      // t('kitchens.createNew', 'Create New Kitchen') — fallback used
      expect(
        screen.getByRole('heading', { level: 1, name: /create new kitchen/i })
      ).toBeInTheDocument();
    });

    it('should render description text', () => {
      renderKitchenCreate();

      expect(screen.getByText(/define the kitchen space dimensions/i)).toBeInTheDocument();
    });

    it('should render kitchen name input', () => {
      renderKitchenCreate();

      expect(screen.getByLabelText(/kitchen name/i)).toBeInTheDocument();
    });

    it('should render width, depth, and height inputs', () => {
      renderKitchenCreate();

      expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/depth/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
    });

    it('should render unit selection with meters and feet', () => {
      renderKitchenCreate();

      expect(screen.getByText('Meters (m)')).toBeInTheDocument();
      expect(screen.getByText('Feet (ft)')).toBeInTheDocument();
    });

    it('should render design style section heading', () => {
      renderKitchenCreate();

      expect(screen.getByRole('heading', { level: 2, name: /design style/i })).toBeInTheDocument();
    });

    it('should render all 8 style options', () => {
      renderKitchenCreate();

      expect(screen.getByText('Modern')).toBeInTheDocument();
      expect(screen.getByText('Traditional')).toBeInTheDocument();
      expect(screen.getByText('Contemporary')).toBeInTheDocument();
      expect(screen.getByText('Transitional')).toBeInTheDocument();
      expect(screen.getByText('Farmhouse')).toBeInTheDocument();
      expect(screen.getByText('Industrial')).toBeInTheDocument();
      expect(screen.getByText('Scandinavian')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean')).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      renderKitchenCreate();

      expect(screen.getByRole('button', { name: /create & open designer/i })).toBeInTheDocument();
      // fr.json: common.cancel = "Annuler"
      expect(screen.getByRole('button', { name: /annuler/i })).toBeInTheDocument();
    });

    it('should render tips section', () => {
      renderKitchenCreate();

      expect(screen.getByText(/tips for kitchen setup/i)).toBeInTheDocument();
    });

    it('should have default height of 2.7', () => {
      renderKitchenCreate();

      const heightInput = screen.getByLabelText(/height/i);
      expect(heightInput).toHaveValue(2.7);
    });
  });

  describe('Breadcrumb', () => {
    it('should render breadcrumb with projects link', () => {
      renderKitchenCreate();

      // fr.json: nav.projects = "Mes Projets"
      const projectsLink = screen.getByRole('link', { name: /mes projets/i });
      expect(projectsLink).toHaveAttribute('href', '/projects');
    });

    it('should display project name in breadcrumb after loading', async () => {
      renderKitchenCreate();

      await waitFor(() => {
        const projectLink = screen.getByRole('link', { name: /mon projet/i });
        expect(projectLink).toHaveAttribute('href', `/projects/${mockProjectId}`);
      });
    });

    it('should display loading dots while project name is loading', () => {
      // Make project fetch never resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderKitchenCreate();

      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  describe('Unit Toggle', () => {
    it('should default to meters', () => {
      renderKitchenCreate();

      const metersRadio = screen.getByDisplayValue('meters');
      const feetRadio = screen.getByDisplayValue('feet');
      expect(metersRadio).toBeChecked();
      expect(feetRadio).not.toBeChecked();
    });

    it('should switch to feet when feet option is clicked', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.click(screen.getByText('Feet (ft)'));

      const feetRadio = screen.getByDisplayValue('feet');
      expect(feetRadio).toBeChecked();
    });
  });

  describe('Style Selection', () => {
    it('should select a style when clicked', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern'));

      // A checkmark svg should appear (the selected style gets a checkmark icon)
      const modernButton = screen.getByText('Modern').closest('button');
      expect(modernButton).toHaveClass('border-blue-500');
    });

    it('should change style when another option is clicked', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.click(screen.getByText('Modern'));
      await user.click(screen.getByText('Industrial'));

      const industrialButton = screen.getByText('Industrial').closest('button');
      expect(industrialButton).toHaveClass('border-blue-500');

      const modernButton = screen.getByText('Modern').closest('button');
      expect(modernButton).not.toHaveClass('border-blue-500');
    });
  });

  describe('Area Calculation', () => {
    it('should not display area when width and depth are zero', () => {
      renderKitchenCreate();

      expect(screen.queryByText(/total floor area/i)).not.toBeInTheDocument();
    });

    it('should display calculated area when width and depth are provided', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');

      await waitFor(() => {
        expect(screen.getByText(/total floor area/i)).toBeInTheDocument();
        expect(screen.getByText(/20\.0/)).toBeInTheDocument();
        expect(screen.getByText(/sq m/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      // Fill dimensions and style to isolate name validation
      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');
      await user.click(screen.getByText('Modern'));

      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      await waitFor(() => {
        expect(screen.getByText(/kitchen name is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when name is too short', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/kitchen name/i), 'A');
      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');
      await user.click(screen.getByText('Modern'));

      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      await waitFor(() => {
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should show error when style is not selected', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/kitchen name/i), 'Test Kitchen');
      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');
      // Deliberately not selecting a style

      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      await waitFor(() => {
        expect(screen.getByText(/please select a kitchen style/i)).toBeInTheDocument();
      });
    });

    it('should not submit form when validation fails', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      // Only the initial project name fetch should have been called
      const kitchenCreateCalls = mockFetch.mock.calls.filter((call) => call[1]?.method === 'POST');
      expect(kitchenCreateCalls).toHaveLength(0);
    });
  });

  describe('Form Submission', () => {
    it('should submit form and navigate to designer on success', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'kitchen-new-1' }),
          });
        }
        // Project name fetch
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: 'Mon Projet' }),
        });
      });

      renderKitchenCreate();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/kitchen name/i), 'Main Kitchen');
      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');
      await user.click(screen.getByText('Modern'));

      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/kitchens',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/designer/kitchen-new-1');
      });
    });

    it('should show success toast on successful creation', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'kitchen-new-1' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: 'Mon Projet' }),
        });
      });

      renderKitchenCreate();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/kitchen name/i), 'Main Kitchen');
      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');
      await user.click(screen.getByText('Modern'));
      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Kitchen created successfully');
      });
    });

    it('should show error toast when API returns error', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ message: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: 'Mon Projet' }),
        });
      });

      renderKitchenCreate();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/kitchen name/i), 'Main Kitchen');
      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');
      await user.click(screen.getByText('Modern'));
      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Server error');
      });
    });

    it('should show loading text while submitting', async () => {
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === 'POST') {
          return new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ id: '1' }) }), 1000)
          );
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: 'Mon Projet' }),
        });
      });

      renderKitchenCreate();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/kitchen name/i), 'Main Kitchen');
      await user.type(screen.getByLabelText(/width/i), '4');
      await user.type(screen.getByLabelText(/depth/i), '5');
      await user.click(screen.getByText('Modern'));
      await user.click(screen.getByRole('button', { name: /create & open designer/i }));

      await waitFor(() => {
        expect(screen.getByText(/creation en cours/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to project when cancel is clicked', async () => {
      renderKitchenCreate();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /annuler/i }));

      expect(mockNavigate).toHaveBeenCalledWith(`/projects/${mockProjectId}`);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderKitchenCreate();

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThanOrEqual(2); // Room Dimensions, Design Style
    });

    it('should have a form element', () => {
      renderKitchenCreate();

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should mark kitchen name as required', () => {
      renderKitchenCreate();

      const nameInput = screen.getByLabelText(/kitchen name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });
  });
});
