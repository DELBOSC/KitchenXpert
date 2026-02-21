/**
 * RegisterPage Tests
 * Tests for registration page component - form rendering, validation, and submission
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RegisterPage from '../../pages/Auth/RegisterPage';

// Mock the AuthContext
const mockRegister = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
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

const renderRegisterPage = () => {
  return render(
    <BrowserRouter>
      <RegisterPage />
    </BrowserRouter>
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render registration form with all fields', () => {
      renderRegisterPage();

      expect(screen.getByRole('heading', { name: /créer un compte/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^nom$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /s'inscrire/i })).toBeInTheDocument();
    });

    it('should render link to login page', () => {
      renderRegisterPage();

      const loginLink = screen.getByRole('link', { name: /se connecter/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should have correct input types', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/prénom/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/^nom$/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/^mot de passe$/i)).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toHaveAttribute('type', 'password');
    });

    it('should have required attributes on all inputs', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/prénom/i)).toBeRequired();
      expect(screen.getByLabelText(/^nom$/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/^mot de passe$/i)).toBeRequired();
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeRequired();
    });

    it('should have minLength on password field', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      expect(passwordInput).toHaveAttribute('minLength', '8');
    });
  });

  describe('Form Interactions', () => {
    it('should update all fields on input', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');

      expect(screen.getByLabelText(/prénom/i)).toHaveValue('Jean');
      expect(screen.getByLabelText(/^nom$/i)).toHaveValue('Dupont');
      expect(screen.getByLabelText(/email/i)).toHaveValue('jean@example.com');
      expect(screen.getByLabelText(/^mot de passe$/i)).toHaveValue('password123');
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toHaveValue('password123');
    });
  });

  describe('Form Validation', () => {
    it('should show error when passwords do not match', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'differentpassword');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Les mots de passe ne correspondent pas');
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should show error when password is too short', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'short');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'short');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Le mot de passe doit contenir au moins 8 caractères');
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should not call register when passwords are mismatched', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password456');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockRegister).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call register function with user data on valid submit', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('jean@example.com', 'password123', 'Jean', 'Dupont');
      });
    });

    it('should show success toast on successful registration', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Inscription réussie !');
      });
    });

    it('should show error toast on registration failure', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Email already exists');
      });
    });

    it('should disable submit button while loading', async () => {
      mockRegister.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /inscription\.\.\./i })).toBeDisabled();
      });
    });

    it('should show loading text while submitting', async () => {
      mockRegister.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /inscription\.\.\./i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/prénom/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/^nom$/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/email/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/^mot de passe$/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toHaveAccessibleName();
    });

    it('should have proper heading structure', () => {
      renderRegisterPage();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/créer un compte/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle names with special characters', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean-Pierre');
      await user.type(screen.getByLabelText(/^nom$/i), "O'Brien");
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('jean@example.com', 'password123', 'Jean-Pierre', "O'Brien");
      });
    });

    it('should handle exactly 8 character password', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), '12345678');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), '12345678');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });
    });

    it('should re-enable submit button after failed registration', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Registration failed'));
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /s'inscrire/i });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should handle 7 character password (boundary test)', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/prénom/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), '1234567');
      await user.type(screen.getByLabelText(/confirmer le mot de passe/i), '1234567');
      await user.click(screen.getByRole('button', { name: /s'inscrire/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Le mot de passe doit contenir au moins 8 caractères');
      });
    });
  });
});
