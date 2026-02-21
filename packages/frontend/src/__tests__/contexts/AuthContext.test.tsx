/**
 * AuthContext Tests
 * Tests for authentication context provider - login, register, logout, and session management.
 * Auth is managed via httpOnly cookies with credentials: 'include' (no localStorage tokens).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test component that uses the auth context
function TestAuthConsumer() {
  const { user, isAuthenticated, isLoading, error, login, register, logout, updateUser } = useAuth();

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'No User'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <button onClick={() => login('test@example.com', 'password123').catch(() => {})}>Login</button>
      <button onClick={() => register('test@example.com', 'password123', 'Test', 'User').catch(() => {})}>Register</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => updateUser({ name: 'Updated Name' }).catch(() => {})}>Update User</button>
    </div>
  );
}

const renderWithAuthProvider = () => {
  return render(
    <AuthProvider>
      <TestAuthConsumer />
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should check for existing session on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();

      // Initially loading while checking auth
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
    });

    it('should be unauthenticated when session check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
    });

    it('should restore session from cookie on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        }),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
    });

    it('should call auth/me with credentials include', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/me', expect.objectContaining({
          credentials: 'include',
        }));
      });
    });

    it('should be unauthenticated when session response has no data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      // Initial session check fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Login call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          },
        }),
      });

      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
    });

    it('should call login API with correct credentials and include cookies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: { id: 'user-1', email: 'test@example.com' },
          },
        }),
      });

      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        }));
      });
    });

    it('should set error on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid credentials' } }),
      });

      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });
    });

    it('should show loading state during login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });

      mockFetch.mockImplementation(() =>
        loginPromise.then(() => ({
          ok: true,
          json: () => Promise.resolve({
            data: {
              user: { id: 'user-1', email: 'test@example.com' },
            },
          }),
        }))
      );

      // Start login
      const clickPromise = user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
      });

      // Resolve login
      resolveLogin!();
      await clickPromise;

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          },
        }),
      });

      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });
    });

    it('should call register API with correct data and include cookies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: {
            user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
          },
        }),
      });

      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/register', expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
          }),
        }));
      });
    });

    it('should set error on registration failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Email already exists' } }),
      });

      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
      });
    });
  });

  describe('Logout', () => {
    it('should logout and clear user', async () => {
      // Initial session check succeeds (user is authenticated)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        }),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });

      // Mock logout API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
      });
    });

    it('should call logout API with credentials include', async () => {
      // Authenticated session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'user-1', email: 'test@example.com' },
        }),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
      });

      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }));
      });
    });
  });

  describe('Update User', () => {
    it('should update user via API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        }),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        const userText = screen.getByTestId('user').textContent;
        expect(userText).toContain('"name":"Test User"');
      });

      // Mock updateUser API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'user-1', email: 'test@example.com', name: 'Updated Name' },
        }),
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /update user/i }));

      await waitFor(() => {
        const userText = screen.getByTestId('user').textContent;
        expect(userText).toContain('"name":"Updated Name"');
      });
    });

    it('should not update if no user is logged in', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Mock updateUser API - returns error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Not authenticated' } }),
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /update user/i }));

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
      });
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestAuthConsumer />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = consoleError;
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid session response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }), // Invalid response format
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
    });

    it('should handle network errors during auth check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
      });
    });

    it('should handle missing data in login response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      });

      renderWithAuthProvider();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }), // Missing data.user
      });

      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
      });

      // Should remain unauthenticated since no user was in response
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    });
  });
});
