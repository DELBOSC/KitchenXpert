import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';

import { logger } from '../../services/logger';

import type { ARLiveOverlay } from '@kitchenxpert/3d-engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = 'loading' | 'ar' | '3d-fallback' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a simple placeholder kitchen group from boxes
 * (used when no model URL is available).
 */
function createPlaceholderKitchenGroup(): THREE.Group {
  const group = new THREE.Group();
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.7 });
  const counterMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Base cabinets
  for (let i = -2; i <= 2; i++) {
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.56), cabinetMat);
    cabinet.position.set(i * 0.6, 0.36, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    group.add(cabinet);
  }

  // Countertop
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.04, 0.62), counterMat);
  counter.position.set(0, 0.74, 0);
  counter.castShadow = true;
  group.add(counter);

  return group;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ARViewerPage -- Standalone AR page for viewing a kitchen in AR.
 *
 * Loaded via shareable URL with kitchenId/projectId params.
 * If the device supports AR, launches WebXR AR session.
 * Otherwise, falls back to a 3D model viewer.
 */
const ARViewerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const kitchenId = searchParams.get('kitchenId');
  const projectId = searchParams.get('projectId');

  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [arSupported, setArSupported] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [arPlaced, setArPlaced] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for Three.js 3D fallback
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number>(0);
  const kitchenGroupRef = useRef<THREE.Group | null>(null);

  // Ref for AR overlay
  const arOverlayRef = useRef<ARLiveOverlay | null>(null);
  const arContainerRef = useRef<HTMLDivElement | null>(null);

  // Check AR support
  useEffect(() => {
    const check = async () => {
      try {
        if (navigator.xr) {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          setArSupported(supported);
        }
      } catch {
        setArSupported(false);
      }
    };
    void check();
  }, []);

  // Load kitchen data
  useEffect(() => {
    if (!kitchenId && !projectId) {
      setViewMode('error');
      setErrorMessage(
        t('arViewer.noKitchenId', 'No kitchen ID provided. Please provide a kitchenId parameter.')
      );
      return;
    }

    const controller = new AbortController();

    const loadKitchen = async () => {
      setViewMode('loading');
      try {
        // Try to load kitchen model data
        const endpoint = kitchenId
          ? `/api/v1/kitchens/${kitchenId}`
          : `/api/v1/projects/${projectId}`;

        const res = await fetch(endpoint, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!res.ok) {
          // Even if the API fails, we can still show a placeholder in AR/3D
          logger.warn('Failed to load kitchen data, using placeholder');
        }

        // Build the kitchen group (placeholder for now; real implementation
        // would parse the API response into a Three.js group)
        kitchenGroupRef.current = createPlaceholderKitchenGroup();

        // Decide view mode based on AR support
        if (arSupported) {
          await startAR();
        } else {
          setViewMode('3d-fallback');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const msg = err instanceof Error ? err.message : 'Failed to load kitchen';
        setErrorMessage(msg);

        // Still try 3D fallback
        kitchenGroupRef.current = createPlaceholderKitchenGroup();
        setViewMode('3d-fallback');
      }
    };

    void loadKitchen();
    return () => controller.abort();
  }, [kitchenId, projectId, arSupported, retryCount]);

  // Initialize 3D fallback viewer
  useEffect(() => {
    if (viewMode !== '3d-fallback' || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 2, 4);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);
    scene.add(new THREE.HemisphereLight(0xddeeff, 0x665544, 0.4));

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(8, 16, 0x888888, 0x444444);
    grid.position.y = 0.001;
    scene.add(grid);

    // Add kitchen model
    if (kitchenGroupRef.current) {
      scene.add(kitchenGroupRef.current);
    }

    // Simple orbit rotation with mouse
    let isDragging = false;
    let prevX = 0;
    let angle = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) {
        return;
      }
      const dx = e.clientX - prevX;
      angle += dx * 0.005;
      camera.position.x = 4 * Math.sin(angle);
      camera.position.z = 4 * Math.cos(angle);
      camera.lookAt(0, 0.5, 0);
      prevX = e.clientX;
    };
    const onPointerUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [viewMode]);

  // AR helpers
  const startAR = async () => {
    try {
      const { ARLiveOverlay } = await import('@kitchenxpert/3d-engine');

      const container = document.createElement('div');
      container.id = 'ar-viewer-container';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
      arContainerRef.current = container;

      const overlay = new ARLiveOverlay(container);
      arOverlayRef.current = overlay;

      if (kitchenGroupRef.current) {
        overlay.placeKitchenModel(kitchenGroupRef.current.clone());
      }

      overlay.onSessionEnd(() => {
        cleanupAR();
        setViewMode('3d-fallback');
      });

      overlay.onModelPlaced(() => {
        setArPlaced(true);
      });

      await overlay.startAR();
      setViewMode('ar');
    } catch (err) {
      logger.error('AR start failed in viewer', err instanceof Error ? err : { error: err });
      setViewMode('3d-fallback');
    }
  };

  const cleanupAR = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.dispose();
      arOverlayRef.current = null;
    }
    if (arContainerRef.current?.parentNode) {
      arContainerRef.current.parentNode.removeChild(arContainerRef.current);
      arContainerRef.current = null;
    }
    setArPlaced(false);
  }, []);

  const handlePlaceModel = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.confirmPlacement();
    }
  }, []);

  const handleRotateModel = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.rotateModel(Math.PI / 4);
    }
  }, []);

  const handleScaleUp = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.scaleModel(1.1);
    }
  }, []);

  const handleScaleDown = useCallback(() => {
    if (arOverlayRef.current) {
      arOverlayRef.current.scaleModel(0.9);
    }
  }, []);

  const handleScreenshot = useCallback(async () => {
    // Works for both AR and 3D fallback
    if (arOverlayRef.current) {
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
        logger.error('Screenshot failed', err instanceof Error ? err : { error: err });
      }
    } else if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const link = document.createElement('a');
      link.download = `kitchen-3d-${Date.now()}.png`;
      link.href = rendererRef.current.domElement.toDataURL('image/png');
      link.click();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAR();
    };
  }, [cleanupAR]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Loading state
  if (viewMode === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">{t('arViewer.loading', 'Loading AR Experience...')}</p>
          <p className="text-gray-400 text-sm mt-2">
            {arSupported
              ? t('arViewer.preparingAR', 'Preparing augmented reality...')
              : t('arViewer.preparing3D', 'Preparing 3D viewer...')}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (viewMode === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full text-center">
          <svg
            className="w-16 h-16 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-white text-xl font-semibold mb-2">
            {t('arViewer.error', 'Unable to Load AR')}
          </h2>
          <p className="text-gray-400 mb-6">{errorMessage}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('common.goBack', 'Go Back')}
            </button>
            <button
              onClick={() => {
                setErrorMessage('');
                setRetryCount((c) => c + 1);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AR mode -- overlay controls
  if (viewMode === 'ar') {
    return (
      <div id="ar-overlay" className="fixed inset-0 z-[10000] pointer-events-none">
        {/* Top instruction */}
        {!arPlaced && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm text-center">
              {t(
                'arViewer.pointToFloor',
                'Point your device at the floor to detect a surface, then tap to place.'
              )}
            </div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3">
          {!arPlaced && (
            <button
              onClick={handlePlaceModel}
              className="w-14 h-14 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
              title={t('arViewer.place', 'Place')}
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

          {arPlaced && (
            <>
              <button
                onClick={handleRotateModel}
                className="w-12 h-12 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                title={t('arViewer.rotate', 'Rotate')}
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
                onClick={handleScaleUp}
                className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors text-lg font-bold"
                title={t('arViewer.scaleUp', 'Scale Up')}
              >
                +
              </button>

              <button
                onClick={handleScaleDown}
                className="w-10 h-10 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors text-lg font-bold"
                title={t('arViewer.scaleDown', 'Scale Down')}
              >
                -
              </button>

              <button
                onClick={handleScreenshot}
                className="w-12 h-12 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
                title={t('arViewer.screenshot', 'Screenshot')}
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
            </>
          )}

          <button
            onClick={() => {
              cleanupAR();
              setViewMode('3d-fallback');
            }}
            className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors"
            title={t('arViewer.exitAR', 'Exit AR')}
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
    );
  }

  // 3D fallback viewer
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1 className="text-white font-semibold">{t('arViewer.title', 'Kitchen AR Viewer')}</h1>
        </div>

        <div className="flex items-center gap-2">
          {arSupported && (
            <button
              onClick={() => startAR()}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {t('arViewer.launchAR', 'Launch AR')}
            </button>
          )}

          <button
            onClick={handleScreenshot}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title={t('arViewer.screenshot', 'Screenshot')}
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
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
        />

        {/* Instruction overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded">
          <p>{t('arViewer.dragToRotate', 'Drag to rotate the view')}</p>
        </div>

        {!arSupported && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className="bg-yellow-900/60 text-yellow-200 px-4 py-2 rounded-lg text-sm text-center">
              {t(
                'arViewer.arNotAvailable',
                'AR is not available on this device. Showing 3D preview instead.'
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-400">
          <span
            className={`flex items-center gap-1 ${arSupported ? 'text-green-400' : 'text-gray-500'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${arSupported ? 'bg-green-400' : 'bg-gray-500'}`}
            />
            AR{' '}
            {arSupported
              ? t('arViewer.ready', 'Ready')
              : t('arViewer.notAvailable', 'Not Available')}
          </span>
        </div>
        <div className="text-gray-500">
          {t('arViewer.mode', 'Mode')}: {(viewMode as string) === 'ar' ? 'AR' : '3D'}
        </div>
      </div>
    </div>
  );
};

export default ARViewerPage;
