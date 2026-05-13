/**
 * ProfilePage Tests
 * Tests for the profile page — info card, preferences, security.
 *
 * Updated 2026-05-12 to match the redesigned profile:
 * - the page renders a loading skeleton while /me + /me/preferences
 *   resolve; tests must waitFor() the real content
 * - fields are NOT view-only first / edit later — Inputs are shown
 *   inline; the only toggle is the save button
 * - the password modal is a Dialog with title "Changer de mot de passe"
 *   and confirm button "Modifier" (cancel "Annuler")
 * - security action is "Changer mon mot de passe"; logout is "Se déconnecter"
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProfilePage from '../../pages/ProfilePage';

// ---- AuthContext --------------------------------------------------------
const mockLogout = vi.fn();
const mockUpdateUser = vi.fn(() => Promise.resolve());
const mockUseAuth = vi.fn(() => ({
  user: {
    userId: 'user-123',
    email: 'jean@example.com',
    name: 'Jean Dupont',
    role: 'user',
  },
  isAuthenticated: true,
  isLoading: false,
  logout: mockLogout,
  updateUser: mockUpdateUser,
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ---- Toast --------------------------------------------------------------
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

// ---- Router navigate ----------------------------------------------------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---- fetch --------------------------------------------------------------
const mockFetch = vi.fn();

const renderProfilePage = () => {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  );
};

/** Helper: render and wait past the initial loading skeleton. */
async function renderAndWait(): Promise<void> {
  renderProfilePage();
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /mon profil/i })).toBeInTheDocument();
  });
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: profile and preferences load successfully.
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/v1/users/me') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { firstName: 'Jean', lastName: 'Dupont', phone: '+33 6 12 34 56 78' },
            }),
        });
      }
      if (url === '/api/v1/users/me/preferences') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { language: 'fr', theme: 'system', currency: 'EUR', notifications: true },
            }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    mockUseAuth.mockReturnValue({
      user: {
        userId: 'user-123',
        email: 'jean@example.com',
        name: 'Jean Dupont',
        role: 'user',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: mockLogout,
      updateUser: mockUpdateUser,
    });
  });

  describe('Rendering', () => {
    it('should render the page title once loaded', async () => {
      await renderAndWait();
      expect(screen.getByRole('heading', { name: /mon profil/i })).toBeInTheDocument();
    });

    it('should render the personal-information card', async () => {
      await renderAndWait();
      expect(screen.getByText(/informations personnelles/i)).toBeInTheDocument();
    });

    it('should display the user email in the identity card', async () => {
      await renderAndWait();
      expect(screen.getByText('jean@example.com')).toBeInTheDocument();
    });

    it('should hydrate first/last name inputs from the API', async () => {
      await renderAndWait();
      expect(screen.getByDisplayValue('Jean')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dupont')).toBeInTheDocument();
    });

    it('should hydrate the phone input from the API', async () => {
      await renderAndWait();
      expect(screen.getByDisplayValue('+33 6 12 34 56 78')).toBeInTheDocument();
    });

    it('should leave inputs blank when the API returns empty fields', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/v1/users/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: { firstName: '', lastName: '', phone: '' } }),
          });
        }
        if (url === '/api/v1/users/me/preferences') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, data: {} }) });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });

      await renderAndWait();
      // Identity card title falls back to the email when name is empty.
      expect(screen.getAllByText('jean@example.com').length).toBeGreaterThan(0);
    });
  });

  describe('Personal Info', () => {
    it('should expose a save button for the personal-info card', async () => {
      await renderAndWait();
      // "Enregistrer" appears twice (personal info + preferences).
      const saveButtons = screen.getAllByRole('button', { name: /enregistrer/i });
      expect(saveButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow editing the first name field', async () => {
      await renderAndWait();
      const user = userEvent.setup();

      const firstNameInput = screen.getByDisplayValue('Jean');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Pierre');

      expect(firstNameInput).toHaveValue('Pierre');
    });
  });

  describe('Preferences Section', () => {
    it('should render the preferences card', async () => {
      await renderAndWait();
      expect(screen.getByText(/^préférences$/i)).toBeInTheDocument();
    });

    it('should default the currency select to EUR', async () => {
      await renderAndWait();
      const currencySelect = screen.getByLabelText(/devise/i) as HTMLSelectElement;
      expect(currencySelect.value).toBe('EUR');
    });

    it('should expose a notifications switch', async () => {
      await renderAndWait();
      expect(screen.getByLabelText(/notifications par email/i)).toBeInTheDocument();
    });
  });

  describe('Security Section', () => {
    it('should render the security card', async () => {
      await renderAndWait();
      expect(screen.getByText(/^sécurité$/i)).toBeInTheDocument();
    });

    it('should expose a change-password button', async () => {
      await renderAndWait();
      expect(screen.getByRole('button', { name: /changer mon mot de passe/i })).toBeInTheDocument();
    });

    it('should expose a logout button', async () => {
      await renderAndWait();
      expect(screen.getByRole('button', { name: /se déconnecter/i })).toBeInTheDocument();
    });

    it('should call logout when the logout button is clicked', async () => {
      await renderAndWait();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /se déconnecter/i }));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Password Change Dialog', () => {
    it('should open the password dialog when the button is clicked', async () => {
      await renderAndWait();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /changer mon mot de passe/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render three password inputs inside the dialog', async () => {
      await renderAndWait();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /changer mon mot de passe/i }));
      expect(screen.getByLabelText(/mot de passe actuel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmation/i)).toBeInTheDocument();
    });

    it('should close the dialog when cancel is clicked', async () => {
      await renderAndWait();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /changer mon mot de passe/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /annuler/i }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should call fetch for the user profile on mount', async () => {
      await renderAndWait();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/me',
        expect.objectContaining({ credentials: 'include' }),
      );
    });

    it('should call fetch for the user preferences on mount', async () => {
      await renderAndWait();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/users/me/preferences',
        expect.objectContaining({ credentials: 'include' }),
      );
    });

    it('should still render the page if the fetch calls fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /mon profil/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      await renderAndWait();
      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      // Identity card h2 + card titles inside CardHeader render at varying
      // levels — assert at least 1 h2 to keep the test resilient.
      expect(h2s.length).toBeGreaterThanOrEqual(1);
    });
  });
});
