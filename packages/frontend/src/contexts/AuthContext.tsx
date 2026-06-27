import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  userId: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  clearError: () => void;
}

interface ApiErrorEnvelope {
  error?: { message?: string };
  message?: string;
}

interface UserEnvelope {
  success?: boolean;
  data?: User;
}

interface AuthEnvelope {
  data?: { user?: User };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount using httpOnly cookies
  useEffect(() => {
    const controller = new AbortController();

    const checkAuth = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/auth/me', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        if (response.ok) {
          const data = (await response.json()) as UserEnvelope;
          if (data.success && data.data) {
            setUser(data.data);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();
    return () => controller.abort();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
        const message = data?.error?.message || data?.message || 'Login failed';
        setError(message);
        throw new Error(message);
      }

      const data = (await response.json()) as AuthEnvelope;
      if (data.data?.user) {
        setUser(data.data.user);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
          const message = data?.error?.message || data?.message || 'Registration failed';
          setError(message);
          throw new Error(message);
        }

        const data = (await response.json()) as AuthEnvelope;
        if (data.data?.user) {
          setUser(data.data.user);
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      setUser(null);
    }
  }, []);

  const updateUser = useCallback(async (userData: Partial<User>): Promise<void> => {
    const response = await fetch('/api/v1/users/me', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
      throw new Error(data?.error?.message || data?.message || 'Profile update failed');
    }

    const data = (await response.json()) as UserEnvelope;
    if (data.success && data.data) {
      setUser(data.data);
    } else {
      setUser((prev) => {
        if (!prev) {
          return null;
        }
        return { ...prev, ...userData };
      });
    }
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
