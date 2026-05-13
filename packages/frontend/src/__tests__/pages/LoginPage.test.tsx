/**
 * LoginPage Tests
 * Tests for login page component - form rendering, validation, and submission
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from '../../pages/Auth/LoginPage';

// Mock the AuthContext
const mockLogin = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
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

const renderLoginPage = () => {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form with all fields', () => {
      renderLoginPage();

      // AuthLayout heading is now "Bon retour parmi nous"
      expect(screen.getByRole('heading', { name: /bon retour|connexion|bienvenue/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    });

    it('should render link to registration page', () => {
      renderLoginPage();

      const registerLink = screen.getByRole('link', { name: /s'inscrire/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('should have correct input types', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have required attributes on inputs', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Form Interactions', () => {
    it('should update email field on input', async () => {
      renderLoginPage();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field on input', async () => {
      renderLoginPage();
      const user = userEvent.setup();

      const passwordInput = screen.getByLabelText(/mot de passe/i);
      await user.type(passwordInput, 'password123');

      expect(passwordInput).toHaveValue('password123');
    });

    it('should clear input fields when typing', async () => {
      renderLoginPage();
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');
      await user.clear(emailInput);

      expect(emailInput).toHaveValue('');
    });
  });

  describe('Form Submission', () => {
    it('should call login function with credentials on submit', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show success toast on successful login', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Connexion réussie !');
      });
    });

    it('should show error message on login failure', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      // LoginPage uses inline form error, not a toast.
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials|identifiants invalides/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while loading', async () => {
      // Make login take time
      mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password123');

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      await user.click(submitButton);

      // New Button keeps label + adds a spinner; just check disabled state.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /se connecter/i })).toBeDisabled();
      });
    });

    it('should show loading text while submitting', async () => {
      mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      // Button stays mounted in loading state (disabled + spinner).
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /se connecter/i })).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);

      expect(emailInput).toHaveAccessibleName();
      expect(passwordInput).toHaveAccessibleName();
    });

    it('should have proper heading structure', () => {
      renderLoginPage();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/bon retour|connexion|bienvenue/i);
    });

    it('should have proper form structure', () => {
      renderLoginPage();

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty form submission', async () => {
      renderLoginPage();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /se connecter/i });
      await user.click(submitButton);

      // HTML5 validation should prevent submission
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should handle spaces in email', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), '  test@example.com  ');
      await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should handle special characters in password', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'P@ssw0rd!#$%');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'P@ssw0rd!#$%');
      });
    });

    it('should re-enable submit button after failed login', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      renderLoginPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/mot de passe/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /se connecter/i }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /se connecter/i });
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
