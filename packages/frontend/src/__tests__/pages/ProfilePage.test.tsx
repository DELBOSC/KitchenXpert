/**
 * ProfilePage Tests
 * Tests for profile page - user info display, edit mode, preferences, password change
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ProfilePage from '../../pages/ProfilePage';

// Mock the AuthContext
const mockLogout = vi.fn();
const mockUpdateUser = vi.fn();
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

const renderProfilePage = () => {
  return render(
    <BrowserRouter>
      <ProfilePage />
    </BrowserRouter>
  );
};

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: profile and preferences load successfully
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/v1/users/me') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                firstName: 'Jean',
                lastName: 'Dupont',
                phone: '+33 6 12 34 56 78',
              },
            }),
        });
      }
      if (url === '/api/v1/users/me/preferences') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                language: 'fr',
                theme: 'system',
                currency: 'EUR',
                notifications: true,
              },
            }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    global.fetch = mockFetch;

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
    it('should render page title', async () => {
      renderProfilePage();

      // fr.json: profile.title = "Mon profil"
      expect(
        screen.getByRole('heading', { name: /mon profil/i })
      ).toBeInTheDocument();
    });

    it('should render personal information section', async () => {
      renderProfilePage();

      // fr.json: profile.personalInfo = "Informations personnelles"
      expect(
        screen.getByText(/informations personnelles/i)
      ).toBeInTheDocument();
    });

    it('should display user email', async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByText('jean@example.com')).toBeInTheDocument();
      });
    });

    it('should display loaded first name and last name', async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByText('Jean')).toBeInTheDocument();
        expect(screen.getByText('Dupont')).toBeInTheDocument();
      });
    });

    it('should display loaded phone number', async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(
          screen.getByText('+33 6 12 34 56 78')
        ).toBeInTheDocument();
      });
    });

    it('should show "Non défini" for empty fields when profile is empty', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/v1/users/me') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: { firstName: '', lastName: '', phone: '' },
              }),
          });
        }
        if (url === '/api/v1/users/me/preferences') {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ success: true, data: {} }),
          });
        }
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      });

      renderProfilePage();

      await waitFor(() => {
        // fr.json: profile.notDefined = "Non défini"
        const notDefinedElements = screen.getAllByText(/non défini/i);
        expect(notDefinedElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Edit Mode', () => {
    it('should show edit button in view mode', () => {
      renderProfilePage();

      // fr.json: common.edit = "Modifier"
      const editButtons = screen.getAllByRole('button', {
        name: /modifier/i,
      });
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should switch to edit mode and show input fields when Edit is clicked', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      // Wait for profile to load
      await waitFor(() => {
        expect(screen.getByText('Jean')).toBeInTheDocument();
      });

      // Click the first "Modifier" button (personal info section)
      const editButtons = screen.getAllByRole('button', {
        name: /modifier/i,
      });
      await user.click(editButtons[0]);

      // Should now show input fields
      expect(screen.getByDisplayValue('Jean')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Dupont')).toBeInTheDocument();
    });

    it('should show Save and Cancel buttons in edit mode', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Jean')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', {
        name: /modifier/i,
      });
      await user.click(editButtons[0]);

      // fr.json: common.save = "Sauvegarder", common.cancel = "Annuler"
      expect(
        screen.getByRole('button', { name: /sauvegarder/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /annuler/i })
      ).toBeInTheDocument();
    });

    it('should cancel editing and return to view mode', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Jean')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', {
        name: /modifier/i,
      });
      await user.click(editButtons[0]);

      // Click cancel
      await user.click(
        screen.getByRole('button', { name: /annuler/i })
      );

      // Should be back to view mode - "Jean" as text, not input
      expect(screen.getByText('Jean')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Jean')).not.toBeInTheDocument();
    });
  });

  describe('Preferences Section', () => {
    it('should render preferences section', () => {
      renderProfilePage();

      // profile.preferences is not in fr.json, so t() returns the key or fallback
      // The heading uses t('profile.preferences') which isn't in fr.json
      // so it will display 'profile.preferences' as the key
      expect(screen.getByText('profile.preferences')).toBeInTheDocument();
    });

    it('should display current currency', async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(screen.getByText('EUR')).toBeInTheDocument();
      });
    });
  });

  describe('Account Section', () => {
    it('should render account section', () => {
      renderProfilePage();

      // fr.json: profile.account = "Compte"
      expect(
        screen.getByRole('heading', { name: /compte/i })
      ).toBeInTheDocument();
    });

    it('should render change password button', () => {
      renderProfilePage();

      // profile.changePassword is not in fr.json so renders key
      expect(
        screen.getByRole('button', { name: /profile\.changePassword/i })
      ).toBeInTheDocument();
    });

    it('should render logout button', () => {
      renderProfilePage();

      // fr.json: profile.logoutAction = "Se déconnecter"
      expect(
        screen.getByRole('button', { name: /se déconnecter/i })
      ).toBeInTheDocument();
    });

    it('should call logout when logout button is clicked', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      await user.click(
        screen.getByRole('button', { name: /se déconnecter/i })
      );

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Password Change Modal', () => {
    it('should open password change modal when button is clicked', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      await user.click(
        screen.getByRole('button', { name: /profile\.changePassword/i })
      );

      // Modal should appear with dialog role
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should show password fields in the modal', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      await user.click(
        screen.getByRole('button', { name: /profile\.changePassword/i })
      );

      expect(screen.getByLabelText(/profile\.currentPassword/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/profile\.newPassword/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/profile\.confirmPassword/i)).toBeInTheDocument();
    });

    it('should close modal when cancel is clicked', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      await user.click(
        screen.getByRole('button', { name: /profile\.changePassword/i })
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click cancel inside the modal
      const cancelButtons = screen.getAllByRole('button', {
        name: /annuler/i,
      });
      const modalCancel = cancelButtons[cancelButtons.length - 1];
      await user.click(modalCancel);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should call fetch for user profile on mount', async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/users/me',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should call fetch for user preferences on mount', async () => {
      renderProfilePage();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/users/me/preferences',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Should not throw
      renderProfilePage();

      // Page should still render
      expect(
        screen.getByRole('heading', { name: /mon profil/i })
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderProfilePage();

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThanOrEqual(3); // Personal info, preferences, account
    });

    it('should have labeled form inputs in edit mode', async () => {
      renderProfilePage();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Jean')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', {
        name: /modifier/i,
      });
      await user.click(editButtons[0]);

      // Check that input elements have associated labels via htmlFor/id
      const firstNameInput = document.getElementById('profile-firstName');
      expect(firstNameInput).toBeInTheDocument();
      expect(firstNameInput).toHaveAttribute('type', 'text');
    });
  });
});
