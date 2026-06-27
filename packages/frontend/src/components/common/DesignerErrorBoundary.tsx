import React from 'react';
import { useTranslation } from 'react-i18next';

import type { TFunction } from 'i18next';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
  t: TFunction;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class DesignerErrorBoundaryInner extends React.Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render() {
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8">
          <svg
            className="w-16 h-16 text-red-400 mb-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            {t('designer.error.title', 'Erreur dans le designer 3D')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 text-center max-w-md">
            {t(
              'designer.error.description',
              'Le moteur 3D a rencontré une erreur. Cela peut arriver lors du chargement de modèles complexes.'
            )}
          </p>
          {this.state.error && (
            <p className="text-xs text-red-400 font-mono mb-4 max-w-md truncate">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('common.retry', 'Réessayer')}
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.back', 'Retour')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const DesignerErrorBoundary: React.FC<{ children: React.ReactNode; onReset?: () => void }> = ({
  children,
  onReset,
}) => {
  const { t } = useTranslation();
  return (
    <DesignerErrorBoundaryInner t={t} onReset={onReset}>
      {children}
    </DesignerErrorBoundaryInner>
  );
};

export default DesignerErrorBoundary;
