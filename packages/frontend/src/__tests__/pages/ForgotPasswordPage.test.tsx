/**
 * ForgotPasswordPage Tests
 * Tests for forgot password page - form rendering, email validation, submission, success state, error handling
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ForgotPasswordPage from '../../pages/Auth/ForgotPasswordPage';

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

const mockFetch = vi.fn();

const renderForgotPasswordPage = () => {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  );
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  describe('Rendering', () => {
    it('should render the page heading', () => {
      renderForgotPasswordPage();

      // t('auth.forgotPasswordTitle', 'Forgot your password?') — fallback used
      expect(
        screen.getByRole('heading', { level: 1, name: /forgot your password/i })
      ).toBeInTheDocument();
    });

    it('should render the description text', () => {
      renderForgotPasswordPage();

      expect(
        screen.getByText(/enter your email address and we will send you a link/i)
      ).toBeInTheDocument();
    });

    it('should render the email input', () => {
      renderForgotPasswordPage();

      // fr.json: common.email = "Email"
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should render the email input with correct type', () => {
      renderForgotPasswordPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should render the submit button', () => {
      renderForgotPasswordPage();

      expect(
        screen.getByRole('button', { name: /send reset link/i })
      ).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      renderForgotPasswordPage();

      // fr.json: auth.backToLogin = "Retour à la connexion"
      const loginLink = screen.getByRole('link', { name: /retour à la connexion/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should render a form element', () => {
      renderForgotPasswordPage();

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should mark email input as required', () => {
      renderForgotPasswordPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Email Validation', () => {
    it('should show error when submitting with empty email', async () => {
      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        // t('auth.emailRequired', 'Email is required') — fallback used
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should not call fetch when email is empty', async () => {
      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should set aria-invalid on email input when validation fails', async () => {
      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should clear validation error when user starts typing', async () => {
      renderForgotPasswordPage();
      const user = userEvent.setup();

      // Trigger error
      await user.click(screen.getByRole('button', { name: /send reset link/i }));
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Start typing
      await user.type(screen.getByLabelText(/email/i), 't');

      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Successful Submission', () => {
    it('should show success message after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/if an account exists with this email/i)
        ).toBeInTheDocument();
      });
    });

    it('should show success toast on successful submission', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringContaining('If an account exists')
        );
      });
    });

    it('should hide the form after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      });
    });

    it('should display back to login link in success state', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const loginLink = screen.getByRole('link', { name: /retour à la connexion/i });
        expect(loginLink).toHaveAttribute('href', '/login');
      });
    });

    it('should call fetch with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/auth/password/forgot',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.email).toBe('test@example.com');
    });

    it('should trim email before submission', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), '  test@example.com  ');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.email).toBe('test@example.com');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to send reset link/i)).toBeInTheDocument();
      });
    });

    it('should show error toast when API returns error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalled();
      });
    });

    it('should show error when fetch rejects', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should keep form visible after error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable submit button while loading', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 1000))
      );

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });
    });

    it('should show loading text while submitting', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 1000))
      );

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderForgotPasswordPage();

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('should have labeled email input', () => {
      renderForgotPasswordPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAccessibleName();
    });

    it('should have aria-busy on submit button when loading', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 1000))
      );

      renderForgotPasswordPage();
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /send reset link/i }));

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('aria-busy', 'true');
      });
    });
  });
});
