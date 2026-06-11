import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import * as THREE from 'three';

import { logger } from '../../../services/logger';


interface VRScene {
  id: string;
  name: string;
  type: 'kitchen' | 'design' | 'comparison';
  modelUrl?: string;
  thumbnailUrl?: string;
}

interface VRSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  viewMode: '3d' | 'vr' | 'ar';
  showMeasurements: boolean;
  showLabels: boolean;
  ambientOcclusion: boolean;
  shadows: boolean;
  antiAliasing: boolean;
}

interface CameraPosition {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
}

function addPlaceholderKitchen(scene: THREE.Scene): void {
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.7 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.1 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });

  // Back wall
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 0.15), wallMat);
  wall.position.set(0, 1.25, -1.5);
  wall.receiveShadow = true;
  scene.add(wall);

  // Base cabinets along back wall
  for (let i = -3; i <= 2; i++) {
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.56), cabinetMat);
    cabinet.position.set(i * 0.6, 0.46, -1.15);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    scene.add(cabinet);
  }

  // Countertop
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.038, 0.62), counterMat);
  counter.position.set(-0.3, 0.87, -1.13);
  counter.castShadow = true;
  scene.add(counter);
}

const VRViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number>(0);
  const xrSessionRef = useRef<XRSession | null>(null);

  const projectId = searchParams.get('projectId');
  const kitchenId = searchParams.get('kitchenId');
  const generationId = searchParams.get('generationId');

  const [scene, setScene] = useState<VRScene | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isVRSupported, setIsVRSupported] = useState<boolean>(false);
  const [isARSupported, setIsARSupported] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [settings, setSettings] = useState<VRSettings>({
    quality: 'high',
    viewMode: '3d',
    showMeasurements: true,
    showLabels: true,
    ambientOcclusion: true,
    shadows: true,
    antiAliasing: true,
  });

  const [cameraPosition, setCameraPosition] = useState<CameraPosition>({
    x: 0,
    y: 1.6,
    z: 5,
    rotationX: 0,
    rotationY: 0,
  });

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isARActive, setIsARActive] = useState<boolean>(false);
  const [arPlacementReady, setArPlacementReady] = useState<boolean>(false);
  const [usdzExporting, setUsdzExporting] = useState<boolean>(false);

  useEffect(() => {
    const checkVRSupport = async (): Promise<void> => {
      try {
        if ('xr' in navigator) {
          const xr = (navigator as Navigator & { xr: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr;
          const vrSupported = await xr.isSessionSupported('immersive-vr');
          const arSupported = await xr.isSessionSupported('immersive-ar');
          setIsVRSupported(vrSupported);
          setIsARSupported(arSupported);
        }
      } catch {
        // WebXR not supported on this browser/device
      }
    };

    void checkVRSupport();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadScene = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        let endpoint = '/api/v1/vr/scene';
        const params = new URLSearchParams();

        if (kitchenId) {
          params.append('kitchenId', kitchenId);
        } else if (generationId) {
          params.append('generationId', generationId);
        } else if (projectId) {
          params.append('projectId', projectId);
        }

        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }

        const response = await fetch(endpoint, { credentials: 'include', signal: controller.signal });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Scene not found. Please select a valid kitchen or design.');
          }
          throw new Error('Failed to load VR scene');
        }

        const data: VRScene = await response.json();
        setScene(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {return;}
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void loadScene();
    return () => controller.abort();
  }, [projectId, kitchenId, generationId, retryCount]);

  // Initialize Three.js renderer when scene is loaded
  useEffect(() => {
    if (!canvasRef.current || !scene) {return;}

    const canvas = canvasRef.current;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // Scene
    const threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = threeScene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: settings.antiAliasing, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = settings.shadows;
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    threeScene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = settings.shadows;
    threeScene.add(dirLight);
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x665544, 0.4);
    threeScene.add(hemiLight);

    // Floor
    const floorGeom = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    threeScene.add(floor);

    // Grid helper
    const grid = new THREE.GridHelper(8, 16, 0x888888, 0x444444);
    grid.position.y = 0.001;
    threeScene.add(grid);

    // If scene has a model URL, try to load it
    if (scene.modelUrl) {
      import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
        const loader = new GLTFLoader();
        loader.load(scene.modelUrl!, (gltf) => {
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).castShadow = true;
              (child as THREE.Mesh).receiveShadow = true;
            }
          });
          threeScene.add(gltf.scene);
        });
      }).catch(() => {
        // GLTFLoader not available, add placeholder cubes
        addPlaceholderKitchen(threeScene);
      });
    } else {
      // No model URL, render a basic kitchen preview
      addPlaceholderKitchen(threeScene);
    }

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(threeScene, camera);
    };
    animate();

    // Resize handler
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
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [scene]);

  const handleSettingChange = (key: keyof VRSettings, value: VRSettings[keyof VRSettings]): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleEnterVR = async (): Promise<void> => {
    if (!isVRSupported || !rendererRef.current) {
      setError('VR is not supported on this device');
      return;
    }

    try {
      const xr = (navigator as any).xr;
      const session = await xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking'],
      });
      xrSessionRef.current = session;
      await rendererRef.current.xr.setSession(session);
      setSettings((prev) => ({ ...prev, viewMode: 'vr' }));

      session.addEventListener('end', () => {
        xrSessionRef.current = null;
        setSettings((prev) => ({ ...prev, viewMode: '3d' }));
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enter VR mode';
      setError(errorMessage);
    }
  };

  const handleEnterAR = async (): Promise<void> => {
    if (!isARSupported || !rendererRef.current) {
      setError('AR is not supported on this device');
      return;
    }

    try {
      const xr = (navigator as any).xr;
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor', 'hit-test'],
        optionalFeatures: ['dom-overlay', 'light-estimation'],
        domOverlay: { root: document.getElementById('ar-overlay') || document.body },
      });
      xrSessionRef.current = session;

      // Configure renderer for XR
      rendererRef.current.xr.enabled = true;
      rendererRef.current.xr.setReferenceSpaceType('local-floor');
      await rendererRef.current.xr.setSession(session);

      setSettings((prev) => ({ ...prev, viewMode: 'ar' }));
      setIsARActive(true);
      setArPlacementReady(false);

      // Setup hit-testing for floor detection
      const viewerSpace = await session.requestReferenceSpace('viewer');
      await session.requestHitTestSource({ space: viewerSpace });
      setArPlacementReady(true);

      session.addEventListener('end', () => {
        xrSessionRef.current = null;
        setIsARActive(false);
        setArPlacementReady(false);
        setSettings((prev) => ({ ...prev, viewMode: '3d' }));
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enter AR mode';
      setError(errorMessage);
    }
  };

  const handleExportUSDZ = async (): Promise<void> => {
    if (!sceneRef.current || usdzExporting) {return;}

    setUsdzExporting(true);
    try {
      const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
      const exporter = new USDZExporter();
      const usdzBuffer = await exporter.parse(sceneRef.current);
      const blob = new Blob([usdzBuffer as unknown as BlobPart], { type: 'model/vnd.usdz+zip' });
      const url = URL.createObjectURL(blob);

      // Create an anchor element - on iOS, this will trigger Quick Look
      const link = document.createElement('a');
      link.rel = 'ar';
      link.href = url;
      link.download = `kitchen-${Date.now()}.usdz`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Delayed revocation for downloads
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      logger.error('USDZ export failed', err instanceof Error ? err : { error: err });
      setError(t('vrViewer.usdzExportFailed', 'Failed to export USDZ model. This feature requires a compatible browser.'));
    } finally {
      setUsdzExporting(false);
    }
  };

  const handleToggleFullscreen = async (): Promise<void> => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      logger.error('Fullscreen error', err instanceof Error ? err : { error: err });
      setError('Fullscreen mode is not available. Please check your browser permissions.');
    }
  };

  const handleResetCamera = (): void => {
    setCameraPosition({
      x: 0,
      y: 1.6,
      z: 5,
      rotationX: 0,
      rotationY: 0,
    });
  };

  const handleTakeScreenshot = (): void => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      const link = document.createElement('a');
      link.download = `kitchen-vr-${Date.now()}.png`;
      link.href = rendererRef.current.domElement.toDataURL('image/png');
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
      link.click();
    } else if (canvasRef.current) {
      try {
        const link = document.createElement('a');
        link.download = `kitchen-view-${Date.now()}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
      } catch {
        // Canvas may be tainted
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">{t('vrViewer.loading', 'Loading VR Experience...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-white text-xl font-semibold mb-2">{t('vrViewer.unableToLoad', 'Unable to Load VR Scene')}</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('common.goBack', 'Go Back')}
            </button>
            <button
              onClick={() => { setError(null); setRetryCount((c) => c + 1); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={projectId ? `/projects/${projectId}` : '/dashboard'}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-white font-semibold">{scene?.name || t('vrViewer.title', 'VR Kitchen Viewer')}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => handleSettingChange('viewMode', '3d')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                settings.viewMode === '3d' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              3D
            </button>
            <button
              onClick={handleEnterVR}
              disabled={!isVRSupported}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                settings.viewMode === 'vr' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white disabled:opacity-50'
              }`}
            >
              VR
            </button>
            <button
              onClick={handleEnterAR}
              disabled={!isARSupported}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                settings.viewMode === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white disabled:opacity-50'
              }`}
            >
              AR
            </button>
          </div>

          <button
            onClick={handleToggleFullscreen}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 transition-colors ${showSettings ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`p-2 transition-colors ${showHelp ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
            title="Help"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
        />

        {/* Loading overlay - only shown when no 3D content */}
        {!scene && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-white text-2xl font-semibold mb-2">{t('vrViewer.title', 'VR Kitchen Viewer')}</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                {t('vrViewer.noScene', 'Select a kitchen design to start the 3D/VR experience.')}
              </p>
            </div>
          </div>
        )}

        {/* Camera Info */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded">
          <p>Position: ({cameraPosition.x.toFixed(1)}, {cameraPosition.y.toFixed(1)}, {cameraPosition.z.toFixed(1)})</p>
          <p>Rotation: ({cameraPosition.rotationX.toFixed(1)}, {cameraPosition.rotationY.toFixed(1)})</p>
        </div>

        {/* AR Controls Overlay */}
        {isARActive && (
          <div id="ar-overlay" className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
              <div className="bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm text-center">
                {arPlacementReady
                  ? t('vrViewer.arPointToFloor', 'Point your device at the floor to place the kitchen')
                  : t('vrViewer.arInitializing', 'Initializing AR...')}
              </div>
            </div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
              <button
                onClick={() => {
                  if (xrSessionRef.current) {
                    void xrSessionRef.current.end();
                  }
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium"
              >
                {t('vrViewer.exitAR', 'Exit AR')}
              </button>
            </div>
          </div>
        )}

        {/* AR Quick Look / USDZ Buttons */}
        {isARSupported && !isARActive && scene && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2">
            <button
              onClick={handleEnterAR}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {t('vrViewer.viewInAR', 'View in AR')}
            </button>
            <button
              onClick={handleExportUSDZ}
              disabled={usdzExporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {usdzExporting
                ? t('vrViewer.exporting', 'Exporting...')
                : t('vrViewer.quickLookiOS', 'Quick Look (iOS)')}
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={handleResetCamera}
            className="p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Reset Camera"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleTakeScreenshot}
            className="p-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Take Screenshot"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-4 right-4 w-72 bg-gray-800 rounded-lg shadow-xl p-4">
            <h3 className="text-white font-semibold mb-4">{t('vrViewer.displaySettings', 'Display Settings')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">{t('vrViewer.quality', 'Quality')}</label>
                <select
                  value={settings.quality}
                  onChange={(e) => handleSettingChange('quality', e.target.value as VRSettings['quality'])}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              {[
                { key: 'showMeasurements', label: 'Show Measurements' },
                { key: 'showLabels', label: 'Show Labels' },
                { key: 'ambientOcclusion', label: 'Ambient Occlusion' },
                { key: 'shadows', label: 'Shadows' },
                { key: 'antiAliasing', label: 'Anti-Aliasing' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <div
                    onClick={() => handleSettingChange(key as keyof VRSettings, !settings[key as keyof VRSettings])}
                    className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${
                      settings[key as keyof VRSettings] ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                        settings[key as keyof VRSettings] ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Help Panel */}
        {showHelp && (
          <div className="absolute top-4 left-4 w-72 bg-gray-800 rounded-lg shadow-xl p-4">
            <h3 className="text-white font-semibold mb-4">{t('vrViewer.controls', 'Controls')}</h3>
            <ul className="text-gray-400 text-sm space-y-2">
              <li className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">W A S D</kbd>
                <span>{t('vrViewer.moveCamera', 'Move camera')}</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Mouse</kbd>
                <span>{t('vrViewer.lookAround', 'Look around')}</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Scroll</kbd>
                <span>{t('vrViewer.zoomInOut', 'Zoom in/out')}</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Space</kbd>
                <span>{t('vrViewer.moveUp', 'Move up')}</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Shift</kbd>
                <span>{t('vrViewer.moveDown', 'Move down')}</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">R</kbd>
                <span>{t('vrViewer.resetView', 'Reset view')}</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">F</kbd>
                <span>{t('vrViewer.toggleFullscreen', 'Toggle fullscreen')}</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* VR/AR Status Bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-400">
          <span className={`flex items-center gap-1 ${isVRSupported ? 'text-green-400' : 'text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isVRSupported ? 'bg-green-400' : 'bg-gray-500'}`} />
            VR {isVRSupported ? t('vrViewer.ready', 'Ready') : t('vrViewer.notAvailable', 'Not Available')}
          </span>
          <span className={`flex items-center gap-1 ${isARSupported ? 'text-green-400' : 'text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isARSupported ? 'bg-green-400' : 'bg-gray-500'}`} />
            AR {isARSupported ? t('vrViewer.ready', 'Ready') : t('vrViewer.notAvailable', 'Not Available')}
          </span>
        </div>
        <div className="text-gray-500">
          Quality: {settings.quality.charAt(0).toUpperCase() + settings.quality.slice(1)} | Mode: {settings.viewMode.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default VRViewer;
