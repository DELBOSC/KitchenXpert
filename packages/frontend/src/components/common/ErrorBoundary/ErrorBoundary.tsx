import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type FallbackRender = (props: { error: Error | null; resetErrorBoundary: () => void }) => React.ReactNode;

interface ErrorBoundaryInnerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  fallbackRender?: FallbackRender;
  t: TFunction;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  fallbackRender?: FallbackRender;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends React.Component<ErrorBoundaryInnerProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    const { t } = this.props;

    if (this.state.hasError) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900 font-sans">
          <div className="max-w-md w-full text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('error.title', 'Something went wrong')}
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {t('error.description', 'An unexpected error occurred. Please try again.')}
            </p>
            {(process.env.NODE_ENV === 'development' || import.meta.env.DEV) && this.state.error && (
              <pre className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded mb-6 text-left overflow-auto max-h-32 whitespace-pre-wrap break-words">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border-none rounded-md cursor-pointer transition-colors"
            >
              {t('common.retry', 'Retry')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, fallback, fallbackRender }) => {
  const { t } = useTranslation();
  return (
    <ErrorBoundaryInner t={t} fallback={fallback} fallbackRender={fallbackRender}>
      {children}
    </ErrorBoundaryInner>
  );
};

export default ErrorBoundary;
