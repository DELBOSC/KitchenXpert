/**
 * LiDAR Room Scanner Component
 *
 * Provides the UI infrastructure for LiDAR-based room scanning.
 * Uses WebXR Depth Sensing API when available, falls back to manual input.
 *
 * - Checks device LiDAR capability via WebXR depth-sensing feature
 * - Runs a real XR animation loop accumulating depth frames
 * - Computes room dimensions from sampled depth data via computeRoomDimensions
 * - Renders a live depth heatmap overlay during scanning
 * - Falls back to manual dimension input or photo upload otherwise
 * - Supports dark mode and i18n
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { API_BASE_URL } from '../../services/api/endpoints';
import { getErrorMessage } from '../../utils/error-handling';

// ─── WebXR Depth Sensing types (not in standard TS DOM lib) ─────────────────

interface XRDepthInformation {
  readonly width: number;
  readonly height: number;
  getDepthInMeters(x: number, y: number): number;
}

// Cast helper — XRFrame.getDepthInformation is not in standard TS DOM types
type XRFrameWithDepth = Omit<XRFrame, 'getDepthInformation'> & {
  getDepthInformation?: (view: XRView) => XRDepthInformation | null;
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoomScanResult {
  dimensions: {
    width: number;   // mm
    length: number;  // mm
    height: number;  // mm
  };
  walls: Array<{
    id: string;
    side: 'back' | 'left' | 'right' | 'front';
    length: number;
    hasWindow: boolean;
    hasDoor: boolean;
  }>;
  openings: Array<{
    type: 'door' | 'window' | 'arch';
    wall: string;
    width: number;
    height: number;
    fromFloor: number;
    position: number;
  }>;
  confidence: number;
  method: 'lidar' | 'manual' | 'photo';
}

export interface LiDARScannerProps {
  onScanComplete: (result: RoomScanResult) => void;
  onCancel: () => void;
}

type ScannerState =
  | 'checking'
  | 'lidar_ready'
  | 'scanning'
  | 'review'
  | 'fallback'
  | 'manual_input'
  | 'photo_upload';

interface ManualDimensions {
  width: string;
  length: string;
  height: string;
}

interface DepthSample {
  pitch: number;
  yaw: number;
  depth: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

const LiDARScanner: React.FC<LiDARScannerProps> = ({
  onScanComplete,
  onCancel,
}) => {
  const { t } = useTranslation();

  const [scannerState, setScannerState] = useState<ScannerState>('checking');
  const [hasLiDAR, setHasLiDAR] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanResult, setScanResult] = useState<RoomScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual input state
  const [manualDimensions, setManualDimensions] = useState<ManualDimensions>({
    width: '',
    length: '',
    height: '2500',
  });

  // Photo upload state
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // XR session and rendering refs
  const xrSessionRef = useRef<XRSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  // Depth accumulation refs
  const depthSamplesRef = useRef<DepthSample[]>([]);
  const frameCountRef = useRef<number>(0);
  const referenceSpaceRef = useRef<XRReferenceSpace | null>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ─── Check LiDAR / Depth Sensing Support ─────────────────────────────────

  useEffect(() => {
    const checkLiDARSupport = async (): Promise<void> => {
      try {
        if (!navigator.xr) {
          setScannerState('fallback');
          return;
        }

        // Check if immersive-ar with depth-sensing is supported
        const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!arSupported) {
          setScannerState('fallback');
          return;
        }

        // Try to detect depth-sensing capability
        // Devices with LiDAR (iPhone Pro, iPad Pro) support depth-sensing
        // We can't fully verify until session start, but this is a good heuristic
        try {
          const testSession = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['depth-sensing'],
            depthSensing: {
              usagePreference: ['cpu-optimized'],
              dataFormatPreference: ['luminance-alpha'],
            },
          } as XRSessionInit);
          // If we get here, depth sensing is supported
          await testSession.end();
          setHasLiDAR(true);
          setScannerState('lidar_ready');
        } catch {
          // depth-sensing not supported - likely no LiDAR
          setScannerState('fallback');
        }
      } catch {
        setScannerState('fallback');
      }
    };

    checkLiDARSupport();
  }, []);

  // ─── Cleanup XR session and upload controller on unmount ─────────────────

  useEffect(() => {
    return () => {
      if (xrSessionRef.current) {
        xrSessionRef.current.end().catch(() => { /* ignore */ });
      }
      uploadControllerRef.current?.abort();
    };
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const defaultWalls = (
    width: number,
    length: number
  ): RoomScanResult['walls'] => [
    { id: 'wall_back',  side: 'back',  length: width,  hasWindow: false, hasDoor: false },
    { id: 'wall_front', side: 'front', length: width,  hasWindow: false, hasDoor: true  },
    { id: 'wall_left',  side: 'left',  length, hasWindow: true,  hasDoor: false },
    { id: 'wall_right', side: 'right', length, hasWindow: false, hasDoor: false },
  ];

  // ─── computeRoomDimensions ────────────────────────────────────────────────

  const computeRoomDimensions = useCallback((): RoomScanResult => {
    const samples = depthSamplesRef.current;
    const frameCount = frameCountRef.current;

    if (samples.length < 20) {
      // Not enough depth data → fall back to safe defaults
      return {
        dimensions: { width: 3500, length: 3000, height: 2500 },
        walls: defaultWalls(3500, 3000),
        openings: [],
        confidence: 0.30,
        method: 'lidar',
      };
    }

    const median = (arr: number[]): number => {
      if (arr.length === 0) {return 3.0;}
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)]!;
    };

    // Classify samples by orientation (yaw / pitch):
    // yaw ≈ 0 or ≈ π  →  front / back wall  →  contributes to room length
    // yaw ≈ ±π/2      →  left / right wall   →  contributes to room width
    // pitch > 0.5     →  looking at ceiling  →  contributes to room height
    const frontBack = samples
      .filter(
        (s) =>
          Math.abs(s.pitch) < 0.4 &&
          (Math.abs(s.yaw) < Math.PI / 4 || Math.abs(s.yaw) > (3 * Math.PI) / 4)
      )
      .map((s) => s.depth);

    const sides = samples
      .filter(
        (s) =>
          Math.abs(s.pitch) < 0.4 &&
          Math.abs(Math.abs(s.yaw) - Math.PI / 2) < Math.PI / 4
      )
      .map((s) => s.depth);

    const ceiling = samples.filter((s) => s.pitch > 0.5).map((s) => s.depth);

    const fbDist   = median(frontBack.length > 5 ? frontBack : samples.map((s) => s.depth));
    const sideDist = median(sides.length   > 5 ? sides     : samples.map((s) => s.depth));
    const ceilDist = median(ceiling.length > 3 ? ceiling   : [2.5]);

    // Convert metres → mm and clamp to realistic kitchen ranges
    const clamp = (v: number, min: number, max: number): number =>
      Math.max(min, Math.min(max, v));

    const width  = clamp(Math.round(fbDist   * 1000), 1500, 10000);
    const length = clamp(Math.round(sideDist * 1000), 1500, 10000);
    const height = clamp(Math.round(ceilDist * 1000), 2000,  4000);

    // Confidence grows with the number of captured frames (target 600 = ~10 s @ 60 fps)
    const confidence = Math.min(0.45 + (frameCount / 600) * 0.45, 0.90);

    return {
      dimensions: { width, length, height },
      walls: defaultWalls(width, length),
      openings: [],
      confidence: Math.round(confidence * 100) / 100,
      method: 'lidar',
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Start LiDAR Scan ───────────────────────────────────────────────────

  const handleStartScan = useCallback(async (): Promise<void> => {
    if (!navigator.xr) {return;}

    setError(null);
    setScanProgress(0);
    setScannerState('scanning');

    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['depth-sensing', 'hit-test'],
        optionalFeatures: ['dom-overlay'],
        depthSensing: {
          usagePreference: ['cpu-optimized'],
          dataFormatPreference: ['luminance-alpha'],
        },
        domOverlay: { root: document.getElementById('lidar-overlay') || document.body },
      } as XRSessionInit);

      xrSessionRef.current = session;

      // Obtain a reference space for viewer-pose queries
      const refSpace = await session.requestReferenceSpace('local');
      referenceSpaceRef.current = refSpace;

      // Reset accumulators for this scan session
      depthSamplesRef.current = [];
      frameCountRef.current = 0;

      // ── Depth heatmap renderer ──────────────────────────────────────────
      const renderDepthHeatmap = (depthInfo: XRDepthInformation): void => {
        const canvas = heatmapCanvasRef.current;
        if (!canvas) {return;}
        const ctx = canvas.getContext('2d');
        if (!ctx) {return;}

        canvas.width  = depthInfo.width;
        canvas.height = depthInfo.height;
        const imageData = ctx.createImageData(depthInfo.width, depthInfo.height);

        for (let y = 0; y < depthInfo.height; y++) {
          for (let x = 0; x < depthInfo.width; x++) {
            const d = depthInfo.getDepthInMeters(
              x / depthInfo.width,
              y / depthInfo.height
            );
            const t = Math.min(d / 6, 1);
            const r = Math.round((1 - t) * 220);
            const g = Math.round(Math.sin(t * Math.PI) * 190);
            const b = Math.round(t * 220);
            const i = (y * depthInfo.width + x) * 4;
            imageData.data[i]     = r;
            imageData.data[i + 1] = g;
            imageData.data[i + 2] = b;
            imageData.data[i + 3] = 150;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      };

      // ── XR animation frame callback ─────────────────────────────────────
      const onXRFrame = (_time: number, frame: XRFrame): void => {
        const activeSession = xrSessionRef.current;
        if (!activeSession || !referenceSpaceRef.current) {return;}

        const viewerPose = frame.getViewerPose(referenceSpaceRef.current);
        if (viewerPose) {
          for (const view of viewerPose.views) {
            // Access depth data via the non-standard getDepthInformation method
            const depthInfo = (frame as XRFrameWithDepth).getDepthInformation?.(view) ?? null;

            if (depthInfo && depthInfo.width > 0) {
              // Derive approximate yaw / pitch from the view's quaternion orientation
              const orient = view.transform.orientation;
              const yaw = Math.atan2(
                2 * (orient.w * orient.y + orient.x * orient.z),
                1 - 2 * (orient.y * orient.y + orient.z * orient.z)
              );
              const pitch = Math.asin(
                Math.max(-1, Math.min(1, 2 * (orient.w * orient.x - orient.z * orient.y)))
              );

              // Sample a 3×3 grid of depth values per frame
              for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                  const d = depthInfo.getDepthInMeters(
                    (col + 0.5) / 3,
                    (row + 0.5) / 3
                  );
                  // Accept readings between 15 cm and 12 m
                  if (d > 0.15 && d < 12) {
                    depthSamplesRef.current.push({ pitch, yaw, depth: d });
                  }
                }
              }

              frameCountRef.current++;
              renderDepthHeatmap(depthInfo);
            }
          }
        }

        // Progress towards 300-frame target (~5 s at 60 fps), cap at 99 %
        const progress = Math.min((frameCountRef.current / 300) * 100, 99);
        setScanProgress(Math.round(progress));

        // Keep the loop alive while the session is active
        if (xrSessionRef.current) {
          xrSessionRef.current.requestAnimationFrame(onXRFrame);
        }
      };

      // Kick off the XR animation loop
      session.requestAnimationFrame(onXRFrame);

      // Auto-stop after 20 seconds maximum
      setTimeout(() => {
        if (xrSessionRef.current) {
          xrSessionRef.current.end().catch(() => { /* ignore */ });
        }
      }, 20000);

      // ── Session end handler ─────────────────────────────────────────────
      session.addEventListener('end', () => {
        xrSessionRef.current = null;

        const result = computeRoomDimensions();
        setScanResult(result);
        setScanProgress(100);
        setScannerState('review');
      });

    } catch (err) {
      setError(getErrorMessage(err, 'Failed to start LiDAR scan'));
      setScannerState('lidar_ready');
    }
  }, [computeRoomDimensions]);

  // ─── Manual Input Submit ─────────────────────────────────────────────────

  const handleManualSubmit = useCallback((): void => {
    const width  = parseInt(manualDimensions.width,  10);
    const length = parseInt(manualDimensions.length, 10);
    const height = parseInt(manualDimensions.height, 10);

    if (isNaN(width) || isNaN(length) || isNaN(height)) {
      setError(t('lidarScanner.invalidDimensions', 'Please enter valid dimensions in millimeters.'));
      return;
    }

    if (
      width  < 1000 || width  > 15000 ||
      length < 1000 || length > 15000 ||
      height < 2000 || height > 4000
    ) {
      setError(
        t(
          'lidarScanner.dimensionsOutOfRange',
          'Dimensions are out of valid range. Width/Length: 1000-15000mm, Height: 2000-4000mm.'
        )
      );
      return;
    }

    const result: RoomScanResult = {
      dimensions: { width, length, height },
      walls: [
        { id: 'wall_back',  side: 'back',  length: width,  hasWindow: false, hasDoor: false },
        { id: 'wall_left',  side: 'left',  length,         hasWindow: false, hasDoor: false },
        { id: 'wall_right', side: 'right', length,         hasWindow: false, hasDoor: false },
        { id: 'wall_front', side: 'front', length: width,  hasWindow: false, hasDoor: true  },
      ],
      openings: [],
      confidence: 0.5,
      method: 'manual',
    };

    setScanResult(result);
    setScannerState('review');
  }, [manualDimensions, t]);

  // ─── Photo Upload ────────────────────────────────────────────────────────

  const handlePhotoUpload = useCallback(async (): Promise<void> => {
    if (uploadedPhotos.length === 0) {
      setError(t('lidarScanner.noPhotos', 'Please upload at least one photo of your room.'));
      return;
    }

    setIsUploading(true);
    setError(null);

    const controller = new AbortController();
    uploadControllerRef.current = controller;

    try {
      const formData = new FormData();
      uploadedPhotos.forEach((photo) => {
        formData.append('photos', photo);
      });

      const response = await fetch(`${API_BASE_URL}/room-scan/photo-scan`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Photo analysis failed');
      }

      const data = await response.json();
      const result: RoomScanResult = {
        ...data,
        method: 'photo',
      };

      setScanResult(result);
      setScannerState('review');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {return;} // silently cancelled
      setError(getErrorMessage(err, "Erreur lors de l'analyse des photos"));
    } finally {
      uploadControllerRef.current = null;
      setIsUploading(false);
    }
  }, [uploadedPhotos, t]);

  // ─── Edit Dimensions in Review ───────────────────────────────────────────

  const handleDimensionEdit = useCallback(
    (field: 'width' | 'length' | 'height', value: string): void => {
      if (!scanResult) {return;}
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {return;}

      setScanResult({
        ...scanResult,
        dimensions: {
          ...scanResult.dimensions,
          [field]: numValue,
        },
      });
    },
    [scanResult]
  );

  // ─── Confirm Review ──────────────────────────────────────────────────────

  const handleConfirmScan = useCallback((): void => {
    if (scanResult) {
      onScanComplete(scanResult);
    }
  }, [scanResult, onScanComplete]);

  // ─── Render: Checking State ──────────────────────────────────────────────

  if (scannerState === 'checking') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">
            {t('lidarScanner.checkingDevice', 'Checking device capabilities...')}
          </p>
        </div>
      </div>
    );
  }

  // ─── Render: LiDAR Ready ─────────────────────────────────────────────────

  if (scannerState === 'lidar_ready') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4">
        <div className="bg-gray-800 dark:bg-gray-900 rounded-xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-600 bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-white text-2xl font-bold mb-3">
            {t('lidarScanner.lidarDetected', 'LiDAR Scanner Detected')}
          </h2>
          <p className="text-gray-400 mb-6">
            {t(
              'lidarScanner.lidarInstructions',
              'Your device supports LiDAR scanning. Slowly move your device around the room to capture its dimensions. Make sure the room is well-lit.'
            )}
          </p>

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleStartScan}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
            >
              {t('lidarScanner.startScan', 'Start Room Scan')}
            </button>
            <button
              onClick={() => setScannerState('manual_input')}
              className="w-full py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              {t('lidarScanner.enterManually', 'Enter dimensions manually instead')}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Scanning ────────────────────────────────────────────────────

  if (scannerState === 'scanning') {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div id="lidar-overlay" className="absolute inset-0" style={{ position: 'relative' }}>
          {/* Live depth heatmap overlay */}
          <canvas
            ref={heatmapCanvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              mixBlendMode: 'multiply',
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />

          {/* Colour legend */}
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '4px 12px',
              borderRadius: 8,
            }}
          >
            <div
              style={{
                width: 60,
                height: 12,
                background: 'linear-gradient(to right, rgb(220,0,0), rgb(0,190,0), rgb(0,0,220))',
                borderRadius: 4,
              }}
            />
            <span style={{ color: 'white', fontSize: 11 }}>
              {t('lidarScanner.heatmapLegend', 'Proche → Lointain')}
            </span>
          </div>

          {/* Scan progress overlay at the top */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent">
            <p className="text-white text-center text-lg font-medium mb-2">
              {t('lidarScanner.scanningRoom', 'Scanning room...')}
            </p>
            <p className="text-gray-300 text-center text-sm mb-4">
              {t('lidarScanner.moveDeviceSlowly', 'Move your device slowly around the room')}
            </p>

            {/* Progress bar */}
            <div className="max-w-xs mx-auto">
              <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <p className="text-white text-center text-sm mt-2">
                {Math.round(scanProgress)}%{' '}
                {t('lidarScanner.roomCovered', 'of room scanned')}
              </p>
            </div>
          </div>

          {/* Corner guides */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white opacity-60" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white opacity-60" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white opacity-60" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white opacity-60" />
          </div>

          {/* Frame counter (debug info) */}
          <div className="absolute top-4 right-4">
            <span className="text-gray-400 text-xs">
              {t('lidarScanner.frames', 'Frames')}: {frameCountRef.current}
            </span>
          </div>

          {/* Stop scan button */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <button
              onClick={() => {
                if (xrSessionRef.current) {
                  xrSessionRef.current.end().catch(() => { /* ignore */ });
                }
                setScannerState('lidar_ready');
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium"
            >
              {t('lidarScanner.stopScan', 'Stop Scan')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Review ──────────────────────────────────────────────────────

  if (scannerState === 'review' && scanResult) {
    const editedDimensions = scanResult.dimensions;
    const confidence = scanResult.confidence;
    const confColor =
      confidence >= 0.80
        ? 'text-green-600'
        : confidence >= 0.60
        ? 'text-yellow-600'
        : 'text-orange-600';

    return (
      <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-gray-800 dark:bg-gray-900 rounded-xl p-6 max-w-lg w-full border border-gray-700">

          {/* Title + method badge */}
          <h2 className="text-white text-xl font-bold mb-1">
            {t('lidarScanner.reviewResults', 'Review Scan Results')}
          </h2>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                scanResult.method === 'lidar'
                  ? 'bg-green-100 text-green-800'
                  : scanResult.method === 'photo'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {scanResult.method === 'lidar'
                ? 'LiDAR'
                : scanResult.method === 'photo'
                ? t('lidarScanner.methodPhoto', 'Analyse photo')
                : t('lidarScanner.methodManual', 'Saisie manuelle')}
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            {t('lidarScanner.reviewInstructions', 'Verify and adjust the detected dimensions if needed.')}{' '}
            <span className={`font-medium ${confColor}`}>
              ({t('lidarScanner.confidence', 'Confidence')}: {Math.round(confidence * 100)}%)
            </span>
          </p>

          {/* Mini SVG room plan */}
          <svg
            width="200"
            height="150"
            viewBox="0 0 200 150"
            className="mx-auto mb-4 border border-gray-300 rounded"
          >
            <rect
              x="10"
              y="10"
              width="180"
              height="130"
              fill="none"
              stroke="#374151"
              strokeWidth="3"
            />
            {/* Width label (top) */}
            <text x="100" y="8" textAnchor="middle" fontSize="11" fill="#6B7280">
              {(editedDimensions.width / 1000).toFixed(1)} m
            </text>
            {/* Length label (right side, rotated) */}
            <text
              x="196"
              y="78"
              textAnchor="middle"
              fontSize="11"
              fill="#6B7280"
              transform="rotate(90, 196, 78)"
            >
              {(editedDimensions.length / 1000).toFixed(1)} m
            </text>
            {/* Height indicator (centre) */}
            <text x="100" y="80" textAnchor="middle" fontSize="11" fill="#9CA3AF">
              H: {(editedDimensions.height / 1000).toFixed(2)} m
            </text>
          </svg>

          {/* Dimensions */}
          <div className="space-y-4 mb-6">
            <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wide">
              {t('lidarScanner.roomDimensions', 'Room Dimensions (mm)')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-500 text-xs mb-1">
                  {t('lidarScanner.width', 'Width')}
                </label>
                <input
                  type="number"
                  step={100}
                  value={editedDimensions.width}
                  onChange={(e) => handleDimensionEdit('width', e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-1">
                  {t('lidarScanner.length', 'Length')}
                </label>
                <input
                  type="number"
                  step={100}
                  value={editedDimensions.length}
                  onChange={(e) => handleDimensionEdit('length', e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-1">
                  {t('lidarScanner.height', 'Height')}
                </label>
                <input
                  type="number"
                  step={100}
                  value={editedDimensions.height}
                  onChange={(e) => handleDimensionEdit('height', e.target.value)}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Detected openings */}
          {scanResult.openings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wide mb-2">
                {t('lidarScanner.detectedOpenings', 'Detected Openings')}
              </h3>
              <div className="space-y-2">
                {scanResult.openings.map((opening, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 text-sm"
                  >
                    <span className="text-white capitalize">{opening.type}</span>
                    <span className="text-gray-400">
                      {opening.width}mm x {opening.height}mm ({opening.wall})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected walls */}
          <div className="mb-6">
            <h3 className="text-gray-300 font-medium text-sm uppercase tracking-wide mb-2">
              {t('lidarScanner.detectedWalls', 'Detected Walls')}
            </h3>
            <div className="space-y-2">
              {scanResult.walls.map((wall) => (
                <div
                  key={wall.id}
                  className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 text-sm"
                >
                  <span className="text-white capitalize">{wall.side}</span>
                  <span className="text-gray-400">
                    {wall.length}mm
                    {wall.hasWindow && ' | Window'}
                    {wall.hasDoor && ' | Door'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setScanResult(null);
                setScannerState(hasLiDAR ? 'lidar_ready' : 'fallback');
              }}
              className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              {t('lidarScanner.rescan', 'Re-scan')}
            </button>
            <button
              onClick={handleConfirmScan}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              {t('lidarScanner.confirmAndContinue', 'Confirm & Continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Fallback (No LiDAR) ────────────────────────────────────────

  if (scannerState === 'fallback') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4">
        <div className="bg-gray-800 dark:bg-gray-900 rounded-xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="w-20 h-20 mx-auto mb-6 bg-yellow-600 bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-white text-2xl font-bold mb-3">
            {t('lidarScanner.noLiDAR', 'LiDAR Not Available')}
          </h2>
          <p className="text-gray-400 mb-6">
            {t(
              'lidarScanner.fallbackInstructions',
              'Your device does not support LiDAR scanning. You can enter room dimensions manually or upload photos of your room for AI analysis.'
            )}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setScannerState('manual_input')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {t('lidarScanner.manualInput', 'Enter Dimensions Manually')}
            </button>
            <button
              onClick={() => setScannerState('photo_upload')}
              className="w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t('lidarScanner.uploadPhotos', 'Upload Room Photos')}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Manual Input ────────────────────────────────────────────────

  if (scannerState === 'manual_input') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4">
        <div className="bg-gray-800 dark:bg-gray-900 rounded-xl p-8 max-w-md w-full border border-gray-700">
          <h2 className="text-white text-xl font-bold mb-2">
            {t('lidarScanner.manualInputTitle', 'Enter Room Dimensions')}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {t(
              'lidarScanner.manualInputInstructions',
              'Enter your room dimensions in millimeters. Use a tape measure for the most accurate results.'
            )}
          </p>

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                {t('lidarScanner.roomWidth', 'Room Width (mm)')}
              </label>
              <input
                type="number"
                value={manualDimensions.width}
                onChange={(e) =>
                  setManualDimensions((prev) => ({ ...prev, width: e.target.value }))
                }
                placeholder="3000"
                min={1000}
                max={15000}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                {t('lidarScanner.roomLength', 'Room Length / Depth (mm)')}
              </label>
              <input
                type="number"
                value={manualDimensions.length}
                onChange={(e) =>
                  setManualDimensions((prev) => ({ ...prev, length: e.target.value }))
                }
                placeholder="3000"
                min={1000}
                max={15000}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                {t('lidarScanner.ceilingHeight', 'Ceiling Height (mm)')}
              </label>
              <input
                type="number"
                value={manualDimensions.height}
                onChange={(e) =>
                  setManualDimensions((prev) => ({ ...prev, height: e.target.value }))
                }
                placeholder="2500"
                min={2000}
                max={4000}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setError(null);
                setScannerState(hasLiDAR ? 'lidar_ready' : 'fallback');
              }}
              className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('common.back', 'Back')}
            </button>
            <button
              onClick={handleManualSubmit}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {t('common.continue', 'Continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Photo Upload ────────────────────────────────────────────────

  if (scannerState === 'photo_upload') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4">
        <div className="bg-gray-800 dark:bg-gray-900 rounded-xl p-8 max-w-md w-full border border-gray-700">
          <h2 className="text-white text-xl font-bold mb-2">
            {t('lidarScanner.photoUploadTitle', 'Upload Room Photos')}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {t(
              'lidarScanner.photoUploadInstructions',
              'Upload 2-4 photos of your kitchen from different angles. Our AI will estimate the room dimensions.'
            )}
          </p>

          {error && (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-blue-500 transition-colors"
          >
            <svg className="w-10 h-10 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 text-sm">
              {t('lidarScanner.clickToUpload', 'Click to upload photos')}
            </p>
            <p className="text-gray-500 text-xs mt-1">JPEG, PNG - Max 10MB each</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                setUploadedPhotos(Array.from(e.target.files));
              }
            }}
          />

          {/* Uploaded file list */}
          {uploadedPhotos.length > 0 && (
            <div className="mb-4 space-y-2">
              {uploadedPhotos.map((photo, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 text-sm"
                >
                  <span className="text-white truncate">{photo.name}</span>
                  <button
                    onClick={() =>
                      setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setError(null);
                setUploadedPhotos([]);
                uploadControllerRef.current?.abort();
                setScannerState(hasLiDAR ? 'lidar_ready' : 'fallback');
              }}
              className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('common.back', 'Back')}
            </button>
            <button
              onClick={handlePhotoUpload}
              disabled={uploadedPhotos.length === 0 || isUploading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {isUploading
                ? t('lidarScanner.analyzing', 'Analyzing...')
                : t('lidarScanner.analyzePhotos', 'Analyze Photos')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback return
  return null;
};

export default LiDARScanner;
