import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { logger } from '../../services/logger';

import type { ARLiveOverlay } from '@kitchenxpert/3d-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ARViewButtonProps {
  /** Three.js Group representing the current kitchen model. */
  kitchenGroup?: THREE.Group;
  /** Optional "before" photo URL for split-view comparison. */
  beforePhotoUrl?: string;
  /** Additional CSS classes for the button. */
  className?: string;
}

type ARState = 'idle' | 'loading' | 'active' | 'placed' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ARViewButton -- Button component for the designer toolbar.
 *
 * On mount, checks AR support. If supported, renders a "Voir en AR" button.
 * On click, launches the AR overlay with the kitchen model.
 * Provides controls for: placing, rotating, screenshot, split-view, share, close.
 */
const ARViewButton: React.FC<ARViewButtonProps> = ({
  kitchenGroup,
  beforePhotoUrl,
  className = '',
}) => {
  const { t } = useTranslation();

  const [arSupported, setArSupported] = useState<boolean>(false);
  const [arState, setArState] = useState<ARState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [splitViewEnabled, setSplitViewEnabled] = useState(false);

  const arOverlayRef = useRef<ARLiveOverlay | null>(null);
  const arContainerRef = useRef<HTMLDivElement | null>(null);

  // Check AR support on mount
  useEffect(() => {
    const checkSupport = async () => {
      try {
        if (navigator?.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setArSupported(supported);
        }
      } catch {
        setArSupported(false);
      }
    };
    void checkSupport();
  }, []);

  // Launch AR overlay
  const handleStartAR = useCallback(async () => {
    setArState('loading');
    setErrorMessage('');

    try {
      // Dynamically import ARLiveOverlay to avoid bundling Three.js in non-AR pages
      const { ARLiveOverlay } = await import('@kitchenxpert/3d-engine');

      // Create container for AR
      const container = document.createElement('div');
      container.id = 'ar-live-container';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
      arContainerRef.current = container;

      // Create the overlay
      const overlay = new ARLiveOverlay(container);
      arOverlayRef.current = overlay;

      // Set kitchen model if available
      if (kitchenGroup) {
        overlay.placeKitchenModel(kitchenGroup.clone());
      }

      // Listen for session end
      overlay.onSessionEnd(() => {
        handleStopAR();
      });

      // Listen for placement
      overlay.onModelPlaced(() => {
        setArState('placed');
      });

      // Start AR session
      await overlay.startAR();
      setArState('active');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start AR session';

      if (msg.includes('denied') || msg.includes('permission') || msg.includes('NotAllowedError')) {
        setErrorMessage(
          t(
            'arView.cameraPermissionDenied',
            'Camera access denied. Please allow camera permissions to use AR.'
          )
        );
      } else {
        setErrorMessage(msg);
      }

      setArState('error');
      logger.error('AR start failed', err instanceof Error ? err : { error: err });
    }
  }, [kitchenGroup, t]);

  // Stop AR
  const handleStopAR = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.dispose();
      arOverlayRef.current = null;
    }
    if (arContainerRef.current) {
      if (arContainerRef.current.parentNode) {
        arContainerRef.current.parentNode.removeChild(arContainerRef.current);
      }
      arContainerRef.current = null;
    }
    setArState('idle');
    setSplitViewEnabled(false);
  }, []);

  // Place model at reticle
  const handlePlace = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.confirmPlacement();
    }
  }, []);

  // Rotate model
  const handleRotate = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.rotateModel(Math.PI / 4); // 45 degrees
    }
  }, []);

  // Take screenshot
  const handleScreenshot = useCallback(async () => {
    if (!arOverlayRef.current) {
      return;
    }
    try {
      const blob = await arOverlayRef.current.captureScreenshot();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kitchen-ar-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      logger.error('AR screenshot failed', err instanceof Error ? err : { error: err });
    }
  }, []);

  // Toggle split view
  const handleToggleSplitView = useCallback(() => {
    if (!arOverlayRef.current) {
      return;
    }

    if (splitViewEnabled) {
      arOverlayRef.current.disableSplitView();
      setSplitViewEnabled(false);
    } else if (beforePhotoUrl) {
      arOverlayRef.current.enableSplitView({ beforePhotoUrl });
      setSplitViewEnabled(true);
    }
  }, [splitViewEnabled, beforePhotoUrl]);

  // Share AR view
  const handleShare = useCallback(async () => {
    if (!arOverlayRef.current) {
      return;
    }
    try {
      await arOverlayRef.current.shareARView();
    } catch (err) {
      logger.error('AR share failed', err instanceof Error ? err : { error: err });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (arOverlayRef.current) {
        arOverlayRef.current.dispose();
      }
      if (arContainerRef.current?.parentNode) {
        arContainerRef.current.parentNode.removeChild(arContainerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Disabled state tooltip
  if (!arSupported) {
    return (
      <div className="relative group">
        <button
          disabled
          className={`flex items-center gap-2 px-3 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded-lg cursor-not-allowed text-sm ${className}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          AR
        </button>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {t('arView.notSupported', 'AR non supporte sur cet appareil')}
        </div>
      </div>
    );
  }

  // AR active -- show overlay controls
  if (arState === 'active' || arState === 'placed') {
    return (
      <>
        {/* Floating AR controls overlay */}
        <div id="ar-overlay" className="fixed inset-0 z-[10000] pointer-events-none">
          {/* Top instruction */}
          {arState === 'active' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
              <div className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm text-center">
                {t(
                  'arView.pointToFloor',
                  'Point your device at the floor, then tap to place the kitchen.'
                )}
              </div>
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3">
            {/* Place button (only before placement) */}
            {arState === 'active' && (
              <button
                onClick={handlePlace}
                className="w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                title={t('arView.place', 'Place')}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
            )}

            {/* Controls after placement */}
            {arState === 'placed' && (
              <>
                <button
                  onClick={handleRotate}
                  className="w-12 h-12 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                  title={t('arView.rotate', 'Rotate')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>

                <button
                  onClick={handleScreenshot}
                  className="w-12 h-12 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                  title={t('arView.screenshot', 'Screenshot')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>

                {beforePhotoUrl && (
                  <button
                    onClick={handleToggleSplitView}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                      splitViewEnabled
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                    title={t('arView.splitView', 'Split View')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                      />
                    </svg>
                  </button>
                )}

                <button
                  onClick={handleShare}
                  className="w-12 h-12 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                  title={t('arView.share', 'Share')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Close button (always visible) */}
            <button
              onClick={handleStopAR}
              className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors"
              title={t('arView.close', 'Close AR')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (arState === 'error') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleStartAR}
          className={`flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm ${className}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {t('common.tryAgain', 'Try Again')}
        </button>
        {errorMessage && (
          <span
            className="text-xs text-red-500 dark:text-red-400 max-w-[200px] truncate"
            title={errorMessage}
          >
            {errorMessage}
          </span>
        )}
      </div>
    );
  }

  // Default (idle / loading) -- show the "Voir en AR" button
  return (
    <button
      onClick={handleStartAR}
      disabled={arState === 'loading'}
      className={`flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium ${className}`}
    >
      {arState === 'loading' ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {t('arView.loading', 'Loading...')}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {t('arView.viewInAR', 'Voir en AR')}
        </>
      )}
    </button>
  );
};

export default ARViewButton;
