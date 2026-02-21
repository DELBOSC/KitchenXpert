import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

export default function RegisterPage(): React.ReactElement {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});
  const { register } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: typeof fieldErrors = {};
    if (!firstName) errors.firstName = true;
    if (!lastName) errors.lastName = true;
    if (!email) errors.email = true;
    if (!password) errors.password = true;
    if (!confirmPassword) errors.confirmPassword = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      setFieldErrors({ confirmPassword: true });
      toast.error(t('auth.passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      setFieldErrors({ password: true });
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, firstName, lastName);
      toast.success(t('auth.registerSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.registerError');
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
          {t('auth.createAccount')}
        </h1>

        {error && (
          <div id="register-error" role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.firstName')}
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setFieldErrors((prev) => ({ ...prev, firstName: false })); }}
              required
              autoComplete="given-name"
              aria-required="true"
              aria-invalid={fieldErrors.firstName || false}
              aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('auth.firstNamePlaceholder')}
            />
            {fieldErrors.firstName && (
              <p id="firstName-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {t('auth.firstNameRequired', 'First name is required')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.lastName')}
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setFieldErrors((prev) => ({ ...prev, lastName: false })); }}
              required
              autoComplete="family-name"
              aria-required="true"
              aria-invalid={fieldErrors.lastName || false}
              aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('auth.lastNamePlaceholder')}
            />
            {fieldErrors.lastName && (
              <p id="lastName-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {t('auth.lastNameRequired', 'Last name is required')}
              </p>
            )}
          </div>

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
              autoComplete="email"
              aria-required="true"
              aria-invalid={fieldErrors.email || false}
              aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('auth.emailPlaceholder')}
            />
            {fieldErrors.email && (
              <p id="reg-email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
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
              minLength={8}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={fieldErrors.password || false}
              aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('auth.passwordPlaceholder')}
            />
            {fieldErrors.password && (
              <p id="reg-password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {t('auth.passwordRequired', 'Password is required')}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: false })); }}
              required
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={fieldErrors.confirmPassword || false}
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('auth.passwordPlaceholder')}
            />
            {fieldErrors.confirmPassword && (
              <p id="confirmPassword-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {t('auth.confirmPasswordRequired', 'Password confirmation is required')}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-label={t('auth.registerAction')}
            aria-busy={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t('auth.registerLoading') : t('auth.registerAction')}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 dark:text-gray-400">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            {t('auth.loginAction')}
          </Link>
        </p>
      </div>
    </div>
  );
}
