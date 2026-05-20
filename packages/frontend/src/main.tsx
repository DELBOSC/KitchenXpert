import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './index.css';
import { bootAnalyticsFromConsent, loadPlausible, unloadPlausible } from './analytics/plausible-loader';

// Returning visitors who already accepted analytics → load Plausible now.
bootAnalyticsFromConsent();

// Fresh visitors → react to the CookieConsent decision when they make it.
// CookieConsent dispatches `kx:consent-changed` with the new state.
window.addEventListener('kx:consent-changed', (e) => {
  const detail = (e as CustomEvent<{ analytics?: boolean }>).detail;
  if (detail?.analytics) {loadPlausible();}
  else {unloadPlausible();}
});

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found. Make sure there is a <div id="root"></div> in your HTML.');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ─── Service Worker Registration (F14: Full Offline Mode) ───
// Skipped in dev to avoid HMR interference and stale-cache page blanks.
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered with scope:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, notify user
                console.log('[SW] New version available. Refresh to update.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });
  });
}
