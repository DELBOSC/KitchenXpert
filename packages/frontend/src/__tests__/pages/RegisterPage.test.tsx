/**
 * RegisterPage Tests
 * Tests for registration page component - form rendering, validation, and submission
 *
 * Updated 2026-05-12 to match the premium AuthLayout redesign:
 * - h1 heading is now "Créez votre espace"
 * - second password field is labeled "Confirmation"
 * - submit button label is "Créer mon compte"
 * - terms checkbox must be ticked before submission goes through
 * - client-side validation surfaces inline errors (no toast)
 * - the Button component keeps its label and only adds a spinner while loading
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RegisterPage from '../../pages/Auth/RegisterPage';

const mockRegister = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

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

/** Helper: fill the whole form with valid credentials and tick the CGV box. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
  await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
  await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
  await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
  await user.type(screen.getByLabelText(/^confirmation$/i), 'password123');
  await user.click(screen.getByLabelText(/j'accepte/i));
}

const submitButtonName = /créer mon compte/i;

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render registration form with all fields', () => {
      renderRegisterPage();

      expect(
        screen.getByRole('heading', { name: /créez votre espace|créer un compte/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/^prénom$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^nom$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^confirmation$/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: submitButtonName })).toBeInTheDocument();
    });

    it('should render link to login page', () => {
      renderRegisterPage();

      const loginLink = screen.getByRole('link', { name: /se connecter/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should have correct input types', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^prénom$/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/^nom$/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/^mot de passe$/i)).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(/^confirmation$/i)).toHaveAttribute('type', 'password');
    });

    it('should have required attributes on all inputs', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^prénom$/i)).toBeRequired();
      expect(screen.getByLabelText(/^nom$/i)).toBeRequired();
      expect(screen.getByLabelText(/email/i)).toBeRequired();
      expect(screen.getByLabelText(/^mot de passe$/i)).toBeRequired();
      expect(screen.getByLabelText(/^confirmation$/i)).toBeRequired();
    });

    it('should expose a CGV / privacy consent checkbox', () => {
      renderRegisterPage();
      expect(screen.getByLabelText(/j'accepte/i)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update all fields on input', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/^confirmation$/i), 'password123');

      expect(screen.getByLabelText(/^prénom$/i)).toHaveValue('Jean');
      expect(screen.getByLabelText(/^nom$/i)).toHaveValue('Dupont');
      expect(screen.getByLabelText(/email/i)).toHaveValue('jean@example.com');
      expect(screen.getByLabelText(/^mot de passe$/i)).toHaveValue('password123');
      expect(screen.getByLabelText(/^confirmation$/i)).toHaveValue('password123');
    });

    it('should display a password strength meter once the user starts typing a password', async () => {
      renderRegisterPage();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'abc');
      expect(screen.getByText(/force\s*:/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show inline error when passwords do not match', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/^confirmation$/i), 'differentpassword');
      await user.click(screen.getByLabelText(/j'accepte/i));
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(screen.getByText(/ne correspondent pas/i)).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should show inline error when password is too short', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'short');
      await user.type(screen.getByLabelText(/^confirmation$/i), 'short');
      await user.click(screen.getByLabelText(/j'accepte/i));
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(screen.getByText(/8 caractères/i)).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should block submission when CGV are not accepted', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/^confirmation$/i), 'password123');
      // intentionally do NOT tick the CGV checkbox
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(screen.getByText(/accepter les cgv/i)).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should call register function with user data on valid submit', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          'jean@example.com',
          'password123',
          'Jean',
          'Dupont'
        );
      });
    });

    it('should show success toast on successful registration', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });

    it('should surface the API error message inline and via toast on registration failure', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Email already exists'));
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/^confirmation$/i), 'password123');
      await user.click(screen.getByLabelText(/j'accepte/i));
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
      expect(mockToast.error).toHaveBeenCalledWith('Email already exists');
    });

    it('should disable submit button while loading', async () => {
      mockRegister.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      renderRegisterPage();
      const user = userEvent.setup();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: submitButtonName })).toBeDisabled();
      });
    });

    it('should keep the button mounted (with spinner) while submitting', async () => {
      mockRegister.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      renderRegisterPage();
      const user = userEvent.setup();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      // New Button keeps label and adds a spinner — assert disabled state.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: submitButtonName })).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^prénom$/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/^nom$/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/email/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/^mot de passe$/i)).toHaveAccessibleName();
      expect(screen.getByLabelText(/^confirmation$/i)).toHaveAccessibleName();
    });

    it('should have proper heading structure', () => {
      renderRegisterPage();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/créez votre espace|créer un compte/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle names with special characters', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean-Pierre');
      await user.type(screen.getByLabelText(/^nom$/i), "O'Brien");
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), 'password123');
      await user.type(screen.getByLabelText(/^confirmation$/i), 'password123');
      await user.click(screen.getByLabelText(/j'accepte/i));
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          'jean@example.com',
          'password123',
          'Jean-Pierre',
          "O'Brien"
        );
      });
    });

    it('should accept an exactly 8-character password', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), '12345678');
      await user.type(screen.getByLabelText(/^confirmation$/i), '12345678');
      await user.click(screen.getByLabelText(/j'accepte/i));
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });
    });

    it('should re-enable submit button after failed registration', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Registration failed'));
      renderRegisterPage();
      const user = userEvent.setup();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: submitButtonName });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should reject a 7-character password (boundary test)', async () => {
      renderRegisterPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^prénom$/i), 'Jean');
      await user.type(screen.getByLabelText(/^nom$/i), 'Dupont');
      await user.type(screen.getByLabelText(/email/i), 'jean@example.com');
      await user.type(screen.getByLabelText(/^mot de passe$/i), '1234567');
      await user.type(screen.getByLabelText(/^confirmation$/i), '1234567');
      await user.click(screen.getByLabelText(/j'accepte/i));
      await user.click(screen.getByRole('button', { name: submitButtonName }));

      await waitFor(() => {
        expect(screen.getByText(/8 caractères/i)).toBeInTheDocument();
      });
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });
});
