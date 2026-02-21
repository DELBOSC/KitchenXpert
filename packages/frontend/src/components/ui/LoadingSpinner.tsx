import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps): React.ReactElement {
  const { t } = useTranslation();
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div
      className={`${sizeClasses[size]} border-gray-300 border-t-blue-600 rounded-full animate-spin ${className}`}
      role="status"
      aria-label={t('common.loading', 'Loading')}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
