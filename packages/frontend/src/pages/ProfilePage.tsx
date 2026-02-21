import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface Preferences {
  language?: string;
  theme?: string;
  currency?: string;
  notifications?: boolean;
}

export default function ProfilePage(): React.ReactElement {
  const { user, logout, updateUser } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const mountedRef = useRef(true);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Profile form state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({});
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{password?: string; confirm?: string}>({});

  // Load user profile data
  useEffect(() => {
    mountedRef.current = true;

    const controller = new AbortController();

    const loadProfile = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/users/me', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (mountedRef.current && data.success && data.data) {
            setFirstName(data.data.firstName || '');
            setLastName(data.data.lastName || '');
            setPhone(data.data.phone || '');
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    };

    const loadPreferences = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/users/me/preferences', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (mountedRef.current && data.success && data.data) {
            setPreferences(data.data);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    };

    Promise.allSettled([loadProfile(), loadPreferences()]).finally(() => {
      if (mountedRef.current) setIsLoading(false);
    });

    return () => {
      mountedRef.current = false;
      controller.abort();
    };
  }, []);

  const handleSaveProfile = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await updateUser({ name: `${firstName} ${lastName}`.trim() });
      // Also send firstName/lastName separately to the backend
      const response = await fetch('/api/v1/users/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || t('profile.profileUpdateFailed', 'Profile update failed'));
      }
      setIsEditing(false);
      toast.success(t('profile.profileUpdated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profile.updateFailed'));
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const handleSavePreferences = async (): Promise<void> => {
    setIsSavingPrefs(true);
    try {
      const response = await fetch('/api/v1/users/me/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || t('profile.preferencesUpdateFailed', 'Preferences update failed'));
      }
      setIsEditingPrefs(false);
      toast.success(t('profile.preferencesUpdated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profile.updateFailed'));
    } finally {
      if (mountedRef.current) setIsSavingPrefs(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('profile.passwordTooShort'));
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch('/api/v1/auth/password/change', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.message || data?.message || t('profile.passwordChangeFailed', 'Password change failed'));
      }

      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
      toast.success(t('profile.passwordChanged'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profile.passwordChangeFailed'));
    } finally {
      if (mountedRef.current) setIsChangingPassword(false);
    }
  };

  const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {t('profile.title')}
        </h1>

        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.personalInfo')}
          </h2>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-firstName" className={labelClass}>{t('profile.firstName')}</label>
                {isEditing ? (
                  <input id="profile-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                ) : (
                  <p id="profile-firstName-display" className="text-gray-900 dark:text-white">{firstName || t('profile.notDefined')}</p>
                )}
              </div>
              <div>
                <label htmlFor="profile-lastName" className={labelClass}>{t('profile.lastName')}</label>
                {isEditing ? (
                  <input id="profile-lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                ) : (
                  <p id="profile-lastName-display" className="text-gray-900 dark:text-white">{lastName || t('profile.notDefined')}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="profile-email" className={labelClass}>{t('common.email')}</label>
              <p id="profile-email" className="text-gray-900 dark:text-white">{user?.email}</p>
            </div>

            <div>
              <label htmlFor="profile-phone" className={labelClass}>{t('profile.phone')}</label>
              {isEditing ? (
                <input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+33 6 12 34 56 78" />
              ) : (
                <p id="profile-phone-display" className="text-gray-900 dark:text-white">{phone || t('profile.notDefined')}</p>
              )}
            </div>

            <div className="pt-4">
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? t('common.saving') : t('common.save')}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {t('common.edit')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.preferences')}
          </h2>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pref-language" className={labelClass}>{t('profile.language')}</label>
                {isEditingPrefs ? (
                  <select
                    id="pref-language"
                    value={preferences.language || 'fr'}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className={inputClass}
                  >
                    <option value="fr">{t('profile.lang.fr', 'Français')}</option>
                    <option value="en">{t('profile.lang.en', 'English')}</option>
                    <option value="es">{t('profile.lang.es', 'Español')}</option>
                    <option value="de">{t('profile.lang.de', 'Deutsch')}</option>
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {{ fr: t('profile.lang.fr', 'Français'), en: t('profile.lang.en', 'English'), es: t('profile.lang.es', 'Español'), de: t('profile.lang.de', 'Deutsch') }[preferences.language || 'fr'] || preferences.language}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="pref-theme" className={labelClass}>{t('profile.theme')}</label>
                {isEditingPrefs ? (
                  <select
                    id="pref-theme"
                    value={preferences.theme || 'system'}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                    className={inputClass}
                  >
                    <option value="light">{t('profile.themeLight')}</option>
                    <option value="dark">{t('profile.themeDark')}</option>
                    <option value="system">{t('profile.themeSystem')}</option>
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {{ light: t('profile.themeLight'), dark: t('profile.themeDark'), system: t('profile.themeSystem') }[preferences.theme || 'system']}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="pref-currency" className={labelClass}>{t('profile.currency')}</label>
              {isEditingPrefs ? (
                <select
                  id="pref-currency"
                  value={preferences.currency || 'EUR'}
                  onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                  className={inputClass}
                >
                  <option value="EUR">{t('profile.currency.eur', 'EUR (Euro)')}</option>
                  <option value="USD">{t('profile.currency.usd', 'USD (Dollar)')}</option>
                  <option value="GBP">{t('profile.currency.gbp', 'GBP (Pound)')}</option>
                </select>
              ) : (
                <p className="text-gray-900 dark:text-white">{preferences.currency || 'EUR'}</p>
              )}
            </div>

            <div className="pt-4">
              {isEditingPrefs ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePreferences}
                    disabled={isSavingPrefs}
                    aria-busy={isSavingPrefs}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSavingPrefs ? t('common.saving') : t('common.save')}
                  </button>
                  <button
                    onClick={() => setIsEditingPrefs(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingPrefs(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {t('common.edit')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Security / Account */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('profile.account')}
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {t('profile.changePassword')}
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {t('profile.logoutAction')}
            </button>
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowPasswordModal(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowPasswordModal(false); }}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-modal-title"
              aria-describedby="password-modal-desc"
            >
              <h3 id="password-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('profile.changePassword')}
              </h3>
              <p id="password-modal-desc" className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('profile.changePasswordDesc', 'Enter your current password then choose a new password (minimum 8 characters).')}
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="current-password" className={labelClass}>{t('profile.currentPassword')}</label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                    aria-required="true"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className={labelClass}>{t('profile.newPassword')}</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordErrors.password) setPasswordErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    onBlur={() => {
                      if (newPassword.length > 0 && newPassword.length < 8) {
                        setPasswordErrors((prev) => ({ ...prev, password: t('profile.passwordMinLength', 'Password must be at least 8 characters') }));
                      }
                    }}
                    className={`${inputClass}${passwordErrors.password ? ' border-red-500 dark:border-red-500' : ''}`}
                    aria-required="true"
                    aria-invalid={!!passwordErrors.password}
                    aria-describedby={passwordErrors.password ? 'new-password-error' : undefined}
                    autoComplete="new-password"
                  />
                  {passwordErrors.password && (
                    <p id="new-password-error" className="text-xs text-red-500 mt-1" role="alert">{passwordErrors.password}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="confirm-password" className={labelClass}>{t('profile.confirmPassword')}</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordErrors.confirm) setPasswordErrors((prev) => ({ ...prev, confirm: undefined }));
                    }}
                    onBlur={() => {
                      if (confirmPassword.length > 0 && confirmPassword !== newPassword) {
                        setPasswordErrors((prev) => ({ ...prev, confirm: t('profile.passwordMismatch', 'Passwords do not match') }));
                      }
                    }}
                    className={`${inputClass}${passwordErrors.confirm ? ' border-red-500 dark:border-red-500' : ''}`}
                    aria-required="true"
                    aria-invalid={!!passwordErrors.confirm}
                    aria-describedby={passwordErrors.confirm ? 'confirm-password-error' : undefined}
                    autoComplete="new-password"
                  />
                  {passwordErrors.confirm && (
                    <p id="confirm-password-error" className="text-xs text-red-500 mt-1" role="alert">{passwordErrors.confirm}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  aria-busy={isChangingPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isChangingPassword ? t('common.saving') : t('profile.changePassword')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
