import './i18n/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import CookieConsent from './components/common/CookieConsent';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import ReviewPromptModal from './components/Reviews/ReviewPromptModal';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './i18n/LanguageProvider';
import { AppRouter } from './router';
import { store } from './store';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/* LanguageProvider must live INSIDE BrowserRouter because it
              reads useLocation/useNavigate. It owns i18n.changeLanguage
              + document.documentElement.lang + the `kx-lang` cookie. */}
            <LanguageProvider>
              <ThemeProvider>
                <AuthProvider>
                  <ToastProvider>
                    {/* Skip-link target for keyboard users (matches index.html) */}
                    <main id="main" tabIndex={-1}>
                      <AppRouter />
                    </main>
                    <CookieConsent />
                    <ReviewPromptModal />
                  </ToastProvider>
                </AuthProvider>
              </ThemeProvider>
            </LanguageProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
