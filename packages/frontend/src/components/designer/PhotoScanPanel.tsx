/**
 * PhotoScanPanel (F3)
 *
 * Panel in the 3D designer for photo-based room scanning.
 * Upload 1-3 photos, analyze via AI, and apply detected dimensions to the design.
 * Supports dark mode, drag-and-drop, camera capture on mobile, and AbortController pattern.
 *
 * Steps:
 *   guide     → Photography instructions and tips
 *   upload    → Drop zone + file selection
 *   analyzing → Progress bar while AI processes photos
 *   results   → Editable dimensions, interactive SVG floor plan, walls/openings lists
 */

import { ArrowLeft, ArrowRight } from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { API_BASE_URL } from '../../services/api/endpoints';
import { getErrorMessage } from '../../utils/error-handling';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface RoomScanDimensions {
  widthM: number;
  depthM: number;
  heightM: number;
  confidence: number;
}

interface Wall {
  id: string;
  lengthM: number;
  angle: number;
  hasWindow: boolean;
  hasDoor: boolean;
}

interface Opening {
  type: 'door' | 'window';
  wallId: string;
  positionM: number;
  widthM: number;
  heightM?: number;
}

interface TechnicalPoint {
  type: 'outlet' | 'switch' | 'water_inlet' | 'water_drain' | 'gas';
  position: { x: number; y: number; z: number };
}

interface Obstacle {
  type: string;
  position: { x: number; y: number };
  widthM: number;
  depthM: number;
}

interface RoomScanResult {
  dimensions: RoomScanDimensions;
  walls: Wall[];
  openings: Opening[];
  technicalPoints: TechnicalPoint[];
  obstacles: Obstacle[];
  orientation?: string;
}

// FloorPlanData as used by the SVG renderer — matches the API response shape
interface FloorPlanWall {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  [key: string]: unknown;
}

interface FloorPlanOpening {
  type: 'door' | 'window';
  position: number;
  wall: string;
  width: number;
  height: number;
  fromFloor: number;
}

interface FloorPlanTechPoint {
  type: string;
  position: { x: number; z: number } | number;
  wall?: string;
}

interface FloorPlanObstacle {
  x: number;
  z: number;
  width: number;
  depth: number;
}

interface FloorPlanData {
  walls: FloorPlanWall[];
  openings: FloorPlanOpening[];
  technicalPoints: FloorPlanTechPoint[];
  obstacles: FloorPlanObstacle[];
}

// Editable dimensions (in mm, integers)
interface EditedDimensions {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface PhotoScanPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDimensions: (
    dimensions: RoomScanDimensions,
    floorPlan: FloorPlanData,
  ) => void;
}

type Step = 'guide' | 'upload' | 'analyzing' | 'results';

type ImageQuality = 'low' | 'ok';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function confidenceBadge(
  confidence: number,
  t: (key: string, fallback: string) => string,
): { label: string; color: string } {
  if (confidence >= 0.85) {
    return {
      label: t('photoScan.confidenceHigh', 'Haute confiance'),
      color:
        'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    };
  }
  if (confidence >= 0.6) {
    return {
      label: t('photoScan.confidenceMedium', 'Confiance moyenne'),
      color:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    };
  }
  return {
    label: t('photoScan.confidenceLow', 'Confiance faible'),
    color:
      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  };
}

const techPointLabels: Record<string, string> = {
  outlet: 'Prise electrique',
  switch: 'Interrupteur',
  water_inlet: "Arrivee d'eau",
  water_drain: 'Evacuation',
  gas: 'Gaz',
};

const techPointSvgLetters: Record<string, string> = {
  outlet: 'P',
  switch: 'I',
  water_inlet: 'E',
  water_drain: 'D',
  gas: 'G',
};

// ----------------------------------------------------------------
// SVG Floor Plan Renderer
// ----------------------------------------------------------------

interface ScaleFn {
  scaleX: (x: number) => number;
  scaleZ: (z: number) => number;
}

function computeScale(walls: FloorPlanWall[]): ScaleFn {
  if (walls.length === 0) {
    return {
      scaleX: () => 150,
      scaleZ: () => 150,
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const w of walls) {
    minX = Math.min(minX, w.startX, w.endX);
    maxX = Math.max(maxX, w.startX, w.endX);
    minZ = Math.min(minZ, w.startZ, w.endZ);
    maxZ = Math.max(maxZ, w.startZ, w.endZ);
  }

  const padding = 10;
  const drawW = 300 - padding * 2;
  const drawH = 300 - padding * 2;

  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;

  const scaleX = (x: number): number =>
    padding + ((x - minX) / rangeX) * drawW;
  const scaleZ = (z: number): number =>
    padding + ((z - minZ) / rangeZ) * drawH;

  return { scaleX, scaleZ };
}

function wallLengthMeters(w: FloorPlanWall): number {
  const dx = w.endX - w.startX;
  const dz = w.endZ - w.startZ;
  return Math.sqrt(dx * dx + dz * dz);
}

function renderFloorPlan(floorPlan: FloorPlanData): React.ReactElement {
  const { walls, openings, technicalPoints, obstacles } = floorPlan;

  if (!walls || walls.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500 italic">
        Plan non disponible
      </div>
    );
  }

  const { scaleX, scaleZ } = computeScale(walls);

  // Build wall elements
  const wallElements = walls.map((w, idx) => {
    const x1 = scaleX(w.startX);
    const y1 = scaleZ(w.startZ);
    const x2 = scaleX(w.endX);
    const y2 = scaleZ(w.endZ);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const lenM = wallLengthMeters(w).toFixed(1);

    return (
      <g key={`wall-${idx}`}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#374151"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <text
          x={mx}
          y={my - 5}
          fontSize={10}
          fill="#6B7280"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          {lenM}m
        </text>
      </g>
    );
  });

  // Build opening elements (doors as arcs, windows as triple lines)
  const openingElements = openings.map((op, idx) => {
    // Find the wall by matching op.wall to wall index or id key
    const wallIdx = parseInt(op.wall, 10);
    const wall = isNaN(wallIdx) ? walls[0] : (walls[wallIdx] ?? walls[0]);
    if (!wall) {return null;}

    const wLen = wallLengthMeters(wall);
    if (wLen === 0) {return null;}

    const t = Math.min(Math.max(op.position / wLen, 0), 1);
    const cx = scaleX(wall.startX + t * (wall.endX - wall.startX));
    const cy = scaleZ(wall.startZ + t * (wall.endZ - wall.startZ));

    // Wall direction unit vector (in SVG space)
    const dx = scaleX(wall.endX) - scaleX(wall.startX);
    const dz = scaleZ(wall.endZ) - scaleZ(wall.startZ);
    const wallLen2d = Math.sqrt(dx * dx + dz * dz) || 1;
    const ux = dx / wallLen2d;
    const uz = dz / wallLen2d;

    // Perpendicular
    const px = -uz;
    const pz = ux;

    if (op.type === 'door') {
      const r = 16;
      const x1 = cx - ux * r;
      const y1 = cy - uz * r;
      const x2 = cx + px * r;
      const y2 = cy + pz * r;
      return (
        <g key={`opening-${idx}`}>
          <line
            x1={cx - ux * r}
            y1={cy - uz * r}
            x2={cx + ux * r}
            y2={cy + uz * r}
            stroke="#3B82F6"
            strokeWidth={2}
          />
          <path
            d={`M ${x1},${y1} A ${r},${r} 0 0,1 ${x2},${y2}`}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2}
          />
        </g>
      );
    }

    // Window: three parallel lines perpendicular to wall
    const hw = 12;
    const offsets = [-5, 0, 5];
    return (
      <g key={`opening-${idx}`}>
        {offsets.map((off, i) => {
          const ox = cx + px * off;
          const oy = cy + pz * off;
          return (
            <line
              key={i}
              x1={ox - ux * hw}
              y1={oy - uz * hw}
              x2={ox + ux * hw}
              y2={oy + uz * hw}
              stroke="#60A5FA"
              strokeWidth={2}
            />
          );
        })}
      </g>
    );
  });

  // Technical points
  const techElements = technicalPoints.map((tp, idx) => {
    let px = 150;
    let py = 150;

    if (typeof tp.position === 'object' && tp.position !== null) {
      px = scaleX(tp.position.x);
      py = scaleZ(tp.position.z);
    }

    const letter = techPointSvgLetters[tp.type] ?? tp.type.charAt(0).toUpperCase();

    return (
      <g key={`tech-${idx}`}>
        <circle cx={px} cy={py} r={8} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1.5} />
        <text
          x={px}
          y={py}
          fontSize={8}
          fill="#92400E"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight="bold"
        >
          {letter}
        </text>
      </g>
    );
  });

  // Obstacles
  const obstacleElements = obstacles.map((ob, idx) => {
    const x = scaleX(ob.x);
    const y = scaleZ(ob.z);
    // Map width/depth through the same scale functions
    const refX = scaleX(ob.x + ob.width) - scaleX(ob.x);
    const refY = scaleZ(ob.z + ob.depth) - scaleZ(ob.z);
    return (
      <rect
        key={`obs-${idx}`}
        x={x}
        y={y}
        width={Math.max(Math.abs(refX), 8)}
        height={Math.max(Math.abs(refY), 8)}
        fill="none"
        stroke="#9CA3AF"
        strokeWidth={1.5}
        strokeDasharray="4,2"
      />
    );
  });

  return (
    <div className="space-y-2">
      <svg
        width={300}
        height={300}
        viewBox="0 0 300 300"
        className="border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 mx-auto block"
        role="img"
        aria-label="Plan au sol de la pièce"
      >
        {obstacleElements}
        {wallElements}
        {openingElements}
        {techElements}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center text-[10px] text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <svg width={20} height={8} viewBox="0 0 20 8">
            <line x1={0} y1={4} x2={20} y2={4} stroke="#374151" strokeWidth={3} />
          </svg>
          Mur
        </span>
        <span className="flex items-center gap-1">
          <svg width={20} height={8} viewBox="0 0 20 8">
            <path d="M 2,6 A 8,8 0 0,1 10,2" fill="none" stroke="#3B82F6" strokeWidth={2} />
            <line x1={2} y1={6} x2={10} y2={6} stroke="#3B82F6" strokeWidth={2} />
          </svg>
          Porte
        </span>
        <span className="flex items-center gap-1">
          <svg width={20} height={8} viewBox="0 0 20 8">
            <line x1={0} y1={2} x2={20} y2={2} stroke="#60A5FA" strokeWidth={1.5} />
            <line x1={0} y1={4} x2={20} y2={4} stroke="#60A5FA" strokeWidth={1.5} />
            <line x1={0} y1={6} x2={20} y2={6} stroke="#60A5FA" strokeWidth={1.5} />
          </svg>
          Fenetre
        </span>
        <span className="flex items-center gap-1">
          <svg width={14} height={14} viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={6} fill="#FEF3C7" stroke="#F59E0B" strokeWidth={1.5} />
          </svg>
          Technique
        </span>
        <span className="flex items-center gap-1">
          <svg width={14} height={10} viewBox="0 0 14 10">
            <rect x={1} y={1} width={12} height={8} fill="none" stroke="#9CA3AF" strokeDasharray="3,2" strokeWidth={1.5} />
          </svg>
          Obstacle
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Guide Step Sub-component
// ----------------------------------------------------------------

function GuideStep({ onStart }: { onStart: () => void }): React.ReactElement {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-center">
        Comment photographier votre cuisine
      </h3>

      {/* Room diagram SVG — top-down view */}
      <div className="flex justify-center">
        <svg
          width={200}
          height={160}
          viewBox="0 0 200 160"
          className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
          role="img"
          aria-label="Vue de dessus d'une pièce avec positions de prise de vue"
        >
          {/* Room rectangle */}
          <rect x={20} y={15} width={160} height={125} fill="#F9FAFB" stroke="#6B7280" strokeWidth={2.5} />
          {/* Door gap on bottom wall */}
          <rect x={85} y={138} width={30} height={4} fill="#F9FAFB" />
          <text x={100} y={155} fontSize={9} fill="#9CA3AF" textAnchor="middle">entree</text>

          {/* Position 1 — rear-left corner */}
          <circle cx={32} cy={27} r={11} fill="#DBEAFE" stroke="#3B82F6" strokeWidth={2} />
          <text x={32} y={31} fontSize={11} fill="#1D4ED8" textAnchor="middle" fontWeight="bold">1</text>

          {/* Position 2 — doorway center (front wall) */}
          <circle cx={100} cy={140} r={11} fill="#DCFCE7" stroke="#16A34A" strokeWidth={2} />
          <text x={100} y={144} fontSize={11} fill="#15803D" textAnchor="middle" fontWeight="bold">2</text>

          {/* Position 3 — right side */}
          <circle cx={174} cy={78} r={11} fill="#FEF9C3" stroke="#CA8A04" strokeWidth={2} />
          <text x={174} y={82} fontSize={11} fill="#854D0E" textAnchor="middle" fontWeight="bold">3</text>

          {/* Arrow hints */}
          <line x1={43} y1={32} x2={80} y2={55} stroke="#3B82F6" strokeWidth={1} strokeDasharray="4,3" markerEnd="url(#arr)" opacity={0.5} />
          <line x1={100} y1={129} x2={100} y2={90} stroke="#16A34A" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />
          <line x1={163} y1={78} x2={130} y2={78} stroke="#CA8A04" strokeWidth={1} strokeDasharray="4,3" opacity={0.5} />

          <defs>
            <marker id="arr" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#3B82F6" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Instruction cards */}
      <div className="space-y-2">
        {[
          {
            num: 1,
            title: 'Coin arriere',
            desc: 'Positionnez-vous dans le coin arriere, incluez les 2 murs du fond et le plafond',
            bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
            numBg: 'bg-blue-600',
          },
          {
            num: 2,
            title: 'Depuis la porte',
            desc: 'Debout a l\'entree, capturez la piece entiere en paysage',
            bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
            numBg: 'bg-green-600',
          },
          {
            num: 3,
            title: 'Cote oppose',
            desc: 'Face aux equipements (evier, four), montrez tout le plan de travail',
            bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
            numBg: 'bg-yellow-500',
          },
        ].map(({ num, title, desc, bg, numBg }) => (
          <div
            key={num}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${bg}`}
          >
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${numBg}`}
            >
              {num}
            </span>
            <div>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {title}
              </p>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 italic">
        Lumiere naturelle de preference · Sol et plafond visibles · Pas de mouvement flou
      </p>

      {/* CTA */}
      <button
        onClick={onStart}
        className="w-full py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
      >
        Commencer l&apos;upload <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function PhotoScanPanel({
  isOpen,
  onClose,
  onApplyDimensions,
}: PhotoScanPanelProps): React.ReactElement | null {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('guide');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [qualityMap, setQualityMap] = useState<Map<string, ImageQuality>>(new Map());
  const [scanResult, setScanResult] = useState<RoomScanResult | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [editedDimensions, setEditedDimensions] = useState<EditedDimensions>({
    widthMm: 0,
    depthMm: 0,
    heightMm: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Sync editedDimensions when scanResult arrives
  useEffect(() => {
    if (scanResult) {
      setEditedDimensions({
        widthMm: Math.round(scanResult.dimensions.widthM * 1000),
        depthMm: Math.round(scanResult.dimensions.depthM * 1000),
        heightMm: Math.round(scanResult.dimensions.heightM * 1000),
      });
    }
  }, [scanResult]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setStep('guide');
      setFiles([]);
      setScanResult(null);
      setFloorPlan(null);
      setError(null);
      setProgress(0);
      setQualityMap(new Map());
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPreviews([]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) {return;}
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {onClose();}
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Check image quality (resolution) for a single file
  const checkImageQuality = useCallback(
    async (file: File): Promise<ImageQuality> => {
      try {
        const bitmap = await createImageBitmap(file);
        const quality: ImageQuality =
          bitmap.width < 800 || bitmap.height < 600 ? 'low' : 'ok';
        bitmap.close();
        return quality;
      } catch {
        return 'ok';
      }
    },
    [],
  );

  const handleFilesChange = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles) {return;}

      const newFiles = Array.from(selectedFiles);

      if (files.length + newFiles.length > 3) {
        setError('Maximum 3 photos autorisees.');
        return;
      }

      for (const file of newFiles) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          setError('Seuls les formats JPEG, PNG ou WebP sont acceptes.');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError('Chaque photo doit faire moins de 10 Mo.');
          return;
        }
      }

      setError(null);

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);

      // Generate previews
      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => [...prev, ...newPreviews]);

      // Check quality for each new file
      const newQualityEntries = await Promise.all(
        newFiles.map(async (f): Promise<[string, ImageQuality]> => {
          const q = await checkImageQuality(f);
          return [f.name + f.lastModified, q];
        }),
      );

      setQualityMap((prev) => {
        const next = new Map(prev);
        for (const [key, q] of newQualityEntries) {
          next.set(key, q);
        }
        return next;
      });
    },
    [files, checkImageQuality],
  );

  const removeFile = useCallback(
    (index: number) => {
      const removedFile = files[index];
      const newFiles = [...files];
      newFiles.splice(index, 1);
      setFiles(newFiles);

      const newPreviews = [...previews];
      const previewToRevoke = newPreviews[index];
      if (previewToRevoke) {
        URL.revokeObjectURL(previewToRevoke);
      }
      newPreviews.splice(index, 1);
      setPreviews(newPreviews);

      if (removedFile) {
        const key = removedFile.name + removedFile.lastModified;
        setQualityMap((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [files, previews],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      void handleFilesChange(e.dataTransfer.files);
    },
    [handleFilesChange],
  );

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) {return;}

    setStep('analyzing');
    setError(null);
    setProgress(0);

    const controller = new AbortController();
    controllerRef.current = controller;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return Math.min(prev + Math.random() * 12, 90);
      });
    }, 600);

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('photos', file);
      }

      const response = await fetch(`${API_BASE_URL}/room-scan/photo-scan`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData: unknown = await response.json().catch(() => null);
        throw new Error(
          getErrorMessage(errData, `HTTP ${response.status}`),
        );
      }

      const data: unknown = await response.json();
      const payload =
        typeof data === 'object' && data !== null
          ? (data as Record<string, unknown>)
          : {};
      const dataObj =
        typeof payload.data === 'object' && payload.data !== null
          ? (payload.data as Record<string, unknown>)
          : {};

      clearInterval(progressInterval);
      setProgress(100);

      setScanResult((dataObj.scan as RoomScanResult) ?? null);
      setFloorPlan((dataObj.floorPlan as FloorPlanData) ?? null);
      setStep('results');
    } catch (err) {
      clearInterval(progressInterval);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStep('upload');
        return;
      }
      setError(
        getErrorMessage(err, 'Une erreur est survenue lors de l\'analyse. Veuillez reessayer.'),
      );
      setStep('upload');
    }
  }, [files]);

  const handleApply = useCallback(() => {
    if (scanResult && floorPlan) {
      // Build the dimensions object merging AI confidence with edited values
      const appliedDimensions: RoomScanDimensions = {
        widthM: editedDimensions.widthMm / 1000,
        depthM: editedDimensions.depthMm / 1000,
        heightM: editedDimensions.heightMm / 1000,
        confidence: scanResult.dimensions.confidence,
      };
      onApplyDimensions(appliedDimensions, floorPlan);
      onClose();
    }
  }, [scanResult, floorPlan, editedDimensions, onApplyDimensions, onClose]);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    onClose();
  }, [onClose]);

  const handleDimensionChange = useCallback(
    (field: keyof EditedDimensions, value: string) => {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        setEditedDimensions((prev) => ({ ...prev, [field]: parsed }));
      }
    },
    [],
  );

  if (!isOpen) {return null;}

  const badge = scanResult
    ? confidenceBadge(scanResult.dimensions.confidence, t)
    : null;

  return (
    <div className="absolute inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl z-40 flex flex-col border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {t('photoScan.title', 'Scan Photo de la Piece')}
          </h2>
        </div>

        {/* Step indicator pills */}
        <div className="flex items-center gap-1 mr-2">
          {(['guide', 'upload', 'analyzing', 'results'] as Step[]).map(
            (s, i) => (
              <div
                key={s}
                className={`rounded-full transition-all ${
                  s === step
                    ? 'w-4 h-2 bg-blue-600 dark:bg-blue-400'
                    : i <
                        (['guide', 'upload', 'analyzing', 'results'] as Step[]).indexOf(step)
                      ? 'w-2 h-2 bg-blue-300 dark:bg-blue-600'
                      : 'w-2 h-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ),
          )}
        </div>

        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label={t('common.close', 'Fermer')}
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* ── Guide Step ── */}
        {step === 'guide' && (
          <GuideStep onStart={() => setStep('upload')} />
        )}

        {/* ── Upload Step ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Deposez 1 a 3 photos de votre piece. L&apos;IA detectera les murs, ouvertures, prises et estimera les dimensions.
            </p>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                files.length > 0
                  ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              {files.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex gap-2 justify-center flex-wrap">
                    {previews.map((url, idx) => {
                      const file = files[idx];
                      const qualityKey = file
                        ? file.name + file.lastModified
                        : '';
                      const quality = qualityMap.get(qualityKey);
                      const isLowRes = quality === 'low';

                      return (
                        <div key={idx} className="relative">
                          <img
                            src={url}
                            alt={`Pièce ${idx + 1}`}
                            className={`w-20 h-20 rounded-lg object-cover ${
                              isLowRes
                                ? 'ring-2 ring-red-400 dark:ring-red-500'
                                : ''
                            }`}
                          />
                          {isLowRes && (
                            <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 text-white text-[9px] font-semibold text-center rounded-b-lg py-0.5 leading-tight">
                              ⚠ Resolution faible
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(idx);
                            }}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                            aria-label="Supprimer la photo"
                          >
                            x
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {files.length}/3 photos
                  </p>
                  {files.length < 3 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Cliquez ou deposez pour ajouter d&apos;autres photos
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <svg
                    className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Deposez vos photos ici
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ou cliquez pour parcourir
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    JPEG, PNG, WebP — Max 10 Mo chacune, jusqu&apos;a 3 photos
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => void handleFilesChange(e.target.files)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            {/* Tip: go back to guide */}
            <button
              onClick={() => setStep('guide')}
              className="text-[11px] text-blue-500 dark:text-blue-400 hover:underline w-full text-center inline-flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" aria-hidden="true" /> Revoir les conseils photo
            </button>

            {/* Analyze Button */}
            <button
              onClick={() => void handleAnalyze()}
              disabled={files.length === 0}
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Scanner la piece
            </button>
          </div>
        )}

        {/* ── Analyzing Step ── */}
        {step === 'analyzing' && (
          <div className="space-y-4 py-8">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Analyse des photos en cours...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Detection des murs, ouvertures, prises et dimensions
              </p>

              {/* Progress bar */}
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400">
                {Math.round(Math.min(progress, 100))}%
              </p>
            </div>

            <button
              onClick={handleCancel}
              className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Annuler
            </button>
          </div>
        )}

        {/* ── Results Step ── */}
        {step === 'results' && scanResult && (
          <div className="space-y-5">
            {/* Dimensions & Confidence */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Dimensions detectees
                </h3>
                {badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.color}`}
                  >
                    {Math.round(scanResult.dimensions.confidence * 100)}%{' '}
                    {badge.label}
                  </span>
                )}
              </div>

              {/* Editable dimension inputs */}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { field: 'widthMm', label: 'Largeur' },
                    { field: 'depthMm', label: 'Profondeur' },
                    { field: 'heightMm', label: 'Hauteur' },
                  ] satisfies Array<{ field: keyof EditedDimensions; label: string }>
                ).map(({ field, label }) => (
                  <div key={field} className="text-center">
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      value={editedDimensions[field]}
                      min={100}
                      max={15000}
                      step={100}
                      onChange={(e) => handleDimensionChange(field, e.target.value)}
                      className="w-full text-center text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      aria-label={label}
                    />
                    <span className="block text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                      mm
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                Valeurs pre-remplies par l&apos;IA — modifiables avant application
              </p>
            </div>

            {/* SVG Floor Plan */}
            <div>
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Plan au sol
              </h3>
              {floorPlan ? (
                renderFloorPlan(floorPlan)
              ) : (
                <div className="flex items-center justify-center h-20 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 italic">
                  Plan non disponible
                </div>
              )}
            </div>

            {/* Walls */}
            {scanResult.walls.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Murs ({scanResult.walls.length})
                </h3>
                <div className="space-y-1">
                  {scanResult.walls.map((wall) => (
                    <div
                      key={wall.id}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-1.5"
                    >
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                        {wall.id}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {wall.lengthM.toFixed(1)}m
                        </span>
                        {wall.hasWindow && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                            Fenetre
                          </span>
                        )}
                        {wall.hasDoor && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            Porte
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Openings */}
            {scanResult.openings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Ouvertures ({scanResult.openings.length})
                </h3>
                <div className="space-y-1">
                  {scanResult.openings.map((opening, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-1.5"
                    >
                      <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
                        {opening.type === 'door' ? 'Porte' : 'Fenetre'}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {opening.widthM.toFixed(1)}m
                        {opening.heightM
                          ? ` x ${opening.heightM.toFixed(1)}m`
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Points */}
            {scanResult.technicalPoints.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Points techniques ({scanResult.technicalPoints.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {scanResult.technicalPoints.map((point, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    >
                      {techPointLabels[point.type] ?? point.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Obstacles */}
            {scanResult.obstacles.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Obstacles ({scanResult.obstacles.length})
                </h3>
                <div className="space-y-1">
                  {scanResult.obstacles.map((obstacle, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-1.5"
                    >
                      <span className="text-xs text-gray-700 dark:text-gray-300 capitalize">
                        {obstacle.type}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {obstacle.widthM.toFixed(1)}m x{' '}
                        {obstacle.depthM.toFixed(1)}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orientation */}
            {scanResult.orientation &&
              scanResult.orientation !== 'inconnue' && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Orientation
                  </p>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize">
                    {scanResult.orientation}
                  </p>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Footer */}
      {step === 'results' && (
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setStep('upload');
              setScanResult(null);
              setFloorPlan(null);
            }}
            className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            Re-scanner
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Appliquer au design
          </button>
        </div>
      )}
    </div>
  );
}
