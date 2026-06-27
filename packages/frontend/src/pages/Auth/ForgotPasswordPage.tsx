import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { useToast } from '../../components/ui/Toast';

export default function ForgotPasswordPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: boolean }>({});
  const toast = useToast();
  const { t } = useTranslation();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: true });
      return;
    }

    // Abort any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        throw new Error(t('auth.forgotPasswordError', 'Failed to send reset link'));
      }

      setIsSubmitted(true);
      toast.success(
        t(
          'auth.forgotPasswordSuccess',
          'If an account exists with this email, you will receive a reset link'
        )
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : t('auth.forgotPasswordError', 'Failed to send reset link');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
          {t('auth.forgotPasswordTitle', 'Forgot your password?')}
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8 text-sm">
          {t(
            'auth.forgotPasswordDescription',
            'Enter your email address and we will send you a link to reset your password.'
          )}
        </p>

        {error && (
          <div
            id="forgot-password-error"
            role="alert"
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {isSubmitted ? (
          <div className="text-center">
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                {t(
                  'auth.forgotPasswordSuccess',
                  'If an account exists with this email, you will receive a reset link'
                )}
              </p>
            </div>
            <Link
              to="/login"
              className="text-sm text-kx-brand-strong hover:underline dark:text-kx-brand-from"
            >
              {t('auth.backToLogin', 'Back to login')}
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t('common.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors({});
                  }}
                  required
                  aria-required="true"
                  aria-invalid={fieldErrors.email || false}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('auth.emailPlaceholder')}
                />
                {fieldErrors.email && (
                  <p
                    id="email-error"
                    className="mt-1 text-sm text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    {t('auth.emailRequired', 'Email is required')}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                aria-label={t('auth.sendResetLink', 'Send reset link')}
                aria-busy={isLoading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading
                  ? t('auth.sendingResetLink', 'Sending...')
                  : t('auth.sendResetLink', 'Send reset link')}
              </button>
            </form>

            <p className="mt-6 text-center">
              <Link
                to="/login"
                className="text-sm text-kx-brand-strong hover:underline dark:text-kx-brand-from"
              >
                {t('auth.backToLogin', 'Back to login')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
