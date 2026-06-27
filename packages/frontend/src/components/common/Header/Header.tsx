import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { LanguageSwitcher } from '../../../i18n/LanguageSwitcher';
import { LocalizedLink as Link } from '../../../i18n/LocalizedLink';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps): React.ReactElement {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resolvedTheme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        {/* Sidebar toggle */}
        {isAuthenticated && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('nav.toggleSidebar')}
          >
            <svg
              className="w-6 h-6 text-gray-600 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">KitchenXpert</span>
        </Link>
      </div>

      {/* Navigation publique */}
      <nav className="hidden md:flex items-center gap-6 mr-6">
        <Link
          to="/catalog"
          className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
        >
          {t('nav.catalog')}
        </Link>
        <Link
          to="/pricing"
          className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
        >
          {t('nav.pricing', 'Tarifs')}
        </Link>
        {isAuthenticated && (
          <>
            <Link
              to="/dashboard"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
            >
              {t('nav.dashboard')}
            </Link>
            <Link
              to="/projects"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
            >
              {t('nav.projects')}
            </Link>
            <Link
              to="/designer"
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium"
            >
              {t('nav.designer')}
            </Link>
          </>
        )}
      </nav>

      {/* User actions */}
      <div className="flex items-center gap-3">
        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={
            resolvedTheme === 'dark'
              ? t('theme.switchToLight', 'Switch to light mode')
              : t('theme.switchToDark', 'Switch to dark mode')
          }
        >
          {resolvedTheme === 'dark' ? (
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  'U'}
              </div>
              <span className="hidden md:block text-sm text-gray-700 dark:text-gray-300">
                {user?.name || user?.email}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              {t('auth.logout')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors"
            >
              {t('auth.login')}
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('auth.register')}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
