import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

export default function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const { login } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: { email?: boolean; password?: boolean } = {};
    if (!email) errors.email = true;
    if (!password) errors.password = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      toast.success(t('auth.loginSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.loginError');
      setError(message);
      toast.error(t('auth.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
          {t('auth.login')}
        </h1>

        {error && (
          <div id="login-error" role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('common.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: false })); }}
              required
              aria-required="true"
              aria-invalid={fieldErrors.email || false}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('auth.emailPlaceholder')}
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {t('auth.emailRequired', 'Email is required')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('common.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: false })); }}
              required
              aria-required="true"
              aria-invalid={fieldErrors.password || false}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('auth.passwordPlaceholder')}
            />
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {t('auth.passwordRequired', 'Password is required')}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-label={t('auth.loginAction')}
            aria-busy={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t('auth.loginLoading') : t('auth.loginAction')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
            {t('auth.registerAction')}
          </Link>
        </p>
      </div>
    </div>
  );
}
