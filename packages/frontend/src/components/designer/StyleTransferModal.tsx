import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL, API_ENDPOINTS } from '../../services/api/endpoints';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { getErrorMessage } from '../../utils/error-handling';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface StyleExtraction {
  style: string;
  confidence: number;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  materials: {
    cabinetMaterial: string;
    cabinetFinish: string;
    countertopMaterial: string;
    backsplashMaterial: string;
    flooringMaterial: string;
  };
  doorStyle: string;
  handleStyle: string;
  layoutFeatures: string[];
  mood: string;
  suggestedBrands: string[];
}

export interface StyleTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStyle: (extraction: StyleExtraction) => void;
}

type Step = 'upload' | 'analyzing' | 'results';
type InputMode = 'file' | 'url';

// ----------------------------------------------------------------
// Color helpers
// ----------------------------------------------------------------

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hexToColorName(hex: string): string {
  if (!hex || hex.length < 4) return '';
  try {
    const { h, s, l } = hexToHSL(hex);
    if (l > 90) return 'Blanc';
    if (l < 10) return 'Noir';
    if (s < 20) return 'Gris';
    if (h < 30 || h >= 330) return 'Rouge / Rose';
    if (h < 60) return 'Orange / Beige';
    if (h < 90) return 'Jaune';
    if (h < 150) return 'Vert';
    if (h < 210) return 'Cyan / Turquoise';
    if (h < 270) return 'Bleu';
    return 'Violet / Mauve';
  } catch {
    return '';
  }
}

// ----------------------------------------------------------------
// Material preview helpers
// ----------------------------------------------------------------

function getMaterialStyle(materialName: string, primaryColor?: string): React.CSSProperties {
  const name = materialName.toLowerCase();

  if (['oak', 'walnut', 'cherry', 'pine', 'maple', 'wood'].some((k) => name.includes(k))) {
    return {
      background:
        'linear-gradient(135deg, #D4A574 25%, #C49464 25%, #C49464 50%, #D4A574 50%, #D4A574 75%, #C49464 75%)',
      backgroundSize: '8px 8px',
    };
  }

  if (['marble', 'quartz'].some((k) => name.includes(k))) {
    return {
      background:
        'radial-gradient(ellipse at 30% 40%, #e8e8e8 0%, #f5f5f5 40%, #d8d8d8 70%, #f0f0f0 100%)',
    };
  }

  if (['concrete', 'slate', 'stone'].some((k) => name.includes(k))) {
    return { background: '#8B9090' };
  }

  if (
    ['stainless-steel', 'stainless', 'chrome', 'metal'].some((k) => name.includes(k))
  ) {
    return {
      background:
        'linear-gradient(180deg, #e8e8e8 0%, #c0c0c0 40%, #d8d8d8 60%, #e8e8e8 100%)',
    };
  }

  if (name.includes('gloss')) {
    const color = primaryColor ?? '#E5E7EB';
    return {
      background: `linear-gradient(135deg, ${color} 0%, white 40%, ${color} 100%)`,
    };
  }

  if (name.includes('matte') || name.includes('lacquer')) {
    return { backgroundColor: primaryColor ?? '#E5E7EB' };
  }

  return { background: '#E5E7EB' };
}

// ----------------------------------------------------------------
// Other helpers
// ----------------------------------------------------------------

function confidenceLabel(confidence: number, t: (key: string, fallback: string) => string): string {
  if (confidence >= 0.85) return t('styleTransfer.confidenceHigh', 'High confidence');
  if (confidence >= 0.6) return t('styleTransfer.confidenceMedium', 'Medium confidence');
  return t('styleTransfer.confidenceLow', 'Low confidence');
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-emerald-600 dark:text-emerald-400';
  if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
}

function formatStyleName(style: string): string {
  return style.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFeature(feature: string): string {
  return feature.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMaterialLabel(mat: string): string {
  return mat.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

interface ColorSwatchProps {
  name: string;
  hex: string;
  size: 'large' | 'small';
}

function ColorSwatch({ name, hex, size }: ColorSwatchProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const colorName = hexToColorName(hex);
  const dimension = size === 'large' ? 80 : 60;
  const radius = size === 'large' ? 12 : 10;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [hex]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="button"
        tabIndex={0}
        title={colorName}
        aria-label={`Copier ${hex}`}
        onClick={handleCopy}
        onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative cursor-pointer shadow-md transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          width: dimension,
          height: dimension,
          borderRadius: radius,
          backgroundColor: hex,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.1)',
        }}
      >
        {copied && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/40">
            <span className="text-white text-[10px] font-semibold">Copié!</span>
          </div>
        )}
      </div>
      <p className="font-mono text-[10px] text-gray-500 dark:text-gray-400 text-center">{hex}</p>
      <p
        className={`text-[9px] text-gray-400 dark:text-gray-500 text-center transition-opacity ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={!hovered}
      >
        {colorName}
      </p>
      <p className="text-[10px] text-gray-600 dark:text-gray-400 capitalize text-center">{name}</p>
    </div>
  );
}

interface MaterialThumbnailProps {
  matKey: string;
  label: string;
  value: string;
  primaryColor?: string;
}

function MaterialThumbnail({ label, value, primaryColor }: MaterialThumbnailProps): React.ReactElement {
  const style = getMaterialStyle(value, primaryColor);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-md border border-gray-200 dark:border-gray-600"
        style={{ width: 64, height: 40, ...style }}
        title={formatMaterialLabel(value)}
        aria-label={`Aperçu matériau : ${value}`}
      />
      <div className="text-center">
        <p className="text-[9px] text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 max-w-[72px] truncate">
          {formatMaterialLabel(value)}
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function StyleTransferModal({
  isOpen,
  onClose,
  onApplyStyle,
}: StyleTransferModalProps): React.ReactElement | null {
  const { t } = useTranslation();

  // Core state
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<StyleExtraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [imageUrl, setImageUrl] = useState('');
  const [urlPreviewError, setUrlPreviewError] = useState<string | null>(null);
  const [urlPreviewing, setUrlPreviewing] = useState(false);
  const [urlPreviewReady, setUrlPreviewReady] = useState(false);

  // Apply selections state
  const [applySelections, setApplySelections] = useState({
    colors: true,
    cabinetMaterial: true,
    countertop: true,
    backsplash: true,
    flooring: true,
    doorStyle: false,
    handleStyle: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const dialogRef = useFocusTrap(isOpen);

  // ── Reset on close ──
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setFile(null);
      setResult(null);
      setError(null);
      setProgress(0);
      setInputMode('file');
      setImageUrl('');
      setUrlPreviewError(null);
      setUrlPreviewing(false);
      setUrlPreviewReady(false);
      setApplySelections({
        colors: true,
        cabinetMaterial: true,
        countertop: true,
        backsplash: true,
        flooring: true,
        doorStyle: false,
        handleStyle: false,
      });
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape key to close ──
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // ── Cleanup preview URL on unmount ──
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // ── Handlers: file mode ──
  const handleFileChange = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
        setError(
          t('styleTransfer.invalidFileType', 'Please upload a JPEG, PNG, or WebP image.'),
        );
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError(t('styleTransfer.fileTooLarge', 'Image must be under 10MB.'));
        return;
      }

      setFile(selectedFile);
      setError(null);

      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(selectedFile));
    },
    [preview, t],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0] || null;
      handleFileChange(droppedFile);
    },
    [handleFileChange],
  );

  // ── Handlers: URL mode ──
  const handleUrlPreview = useCallback(async () => {
    if (!imageUrl.trim()) return;

    setUrlPreviewError(null);
    setUrlPreviewReady(false);
    setUrlPreviewing(true);

    const controller = new AbortController();

    try {
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        mode: 'cors',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setUrlPreviewReady(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setUrlPreviewError(
        t(
          'styleTransfer.urlInaccessible',
          'URL inaccessible — essayez d\'uploader le fichier directement',
        ),
      );
    } finally {
      setUrlPreviewing(false);
    }
  }, [imageUrl, t]);

  const handleUrlChange = useCallback((value: string) => {
    setImageUrl(value);
    setUrlPreviewReady(false);
    setUrlPreviewError(null);
  }, []);

  // ── Handler: switch input mode ──
  const handleModeSwitch = useCallback((mode: InputMode) => {
    setInputMode(mode);
    setError(null);
    setUrlPreviewError(null);
    setUrlPreviewReady(false);
  }, []);

  // ── Handler: analyze ──
  const handleAnalyze = useCallback(async () => {
    const isFileMode = inputMode === 'file';
    if (isFileMode && !file) return;
    if (!isFileMode && !imageUrl.trim()) return;

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
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      let body: Record<string, string>;

      if (isFileMode && file) {
        const base64 = await fileToBase64(file);
        body = { image: base64, mediaType: file.type };
      } else {
        body = { imageUrl: imageUrl.trim() };
      }

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.STYLE_TRANSFER.ANALYZE}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'include',
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({}));
        throw new Error(getErrorMessage(errorData, `HTTP ${response.status}`));
      }

      const data: unknown = await response.json();
      clearInterval(progressInterval);
      setProgress(100);

      const extraction =
        data !== null &&
        typeof data === 'object' &&
        'data' in data
          ? (data as { data: StyleExtraction }).data
          : (data as StyleExtraction);

      setResult(extraction);
      setStep('results');
    } catch (err) {
      clearInterval(progressInterval);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStep('upload');
        return;
      }
      setError(
        getErrorMessage(
          err,
          t('styleTransfer.analyzeError', 'An error occurred during analysis. Please try again.'),
        ),
      );
      setStep('upload');
    }
  }, [file, imageUrl, inputMode, t]);

  // ── Handler: apply (selective) ──
  const buildFilteredResult = useCallback((): StyleExtraction => {
    if (!result) throw new Error('No result');
    const filtered: Partial<StyleExtraction> = { ...result };

    if (!applySelections.colors) delete filtered.colorPalette;
    if (!applySelections.doorStyle) delete filtered.doorStyle;
    if (!applySelections.handleStyle) delete filtered.handleStyle;

    if (!applySelections.cabinetMaterial || !applySelections.countertop || !applySelections.backsplash || !applySelections.flooring) {
      const originalMaterials = result.materials;
      const filteredMaterials: Partial<StyleExtraction['materials']> = { ...originalMaterials };

      if (!applySelections.cabinetMaterial) {
        delete filteredMaterials.cabinetMaterial;
        delete filteredMaterials.cabinetFinish;
      }
      if (!applySelections.countertop) delete filteredMaterials.countertopMaterial;
      if (!applySelections.backsplash) delete filteredMaterials.backsplashMaterial;
      if (!applySelections.flooring) delete filteredMaterials.flooringMaterial;

      filtered.materials = filteredMaterials as StyleExtraction['materials'];
    }

    return filtered as StyleExtraction;
  }, [result, applySelections]);

  const handleApply = useCallback(() => {
    if (!result) return;
    const filtered = buildFilteredResult();
    onApplyStyle(filtered);
    onClose();
  }, [result, buildFilteredResult, onApplyStyle, onClose]);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    onClose();
  }, [onClose]);

  const handleToggleSelection = useCallback(
    (key: keyof typeof applySelections) => {
      setApplySelections((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [],
  );

  if (!isOpen) return null;

  const canAnalyze =
    (inputMode === 'file' && file !== null) ||
    (inputMode === 'url' && imageUrl.trim().length > 0);

  const primaryColor = result?.colorPalette.primary;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-transfer-title"
    >
      <div
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="style-transfer-title"
            className="text-lg font-semibold text-gray-800 dark:text-gray-200"
          >
            {t('styleTransfer.title', 'Style Transfer from Photo')}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ════════════════ Upload Step ════════════════ */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  'styleTransfer.description',
                  'Upload a kitchen photo and our AI will analyze the style, colors, and materials to apply to your design.',
                )}
              </p>

              {/* ── Tab switcher ── */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => handleModeSwitch('file')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    inputMode === 'file'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('styleTransfer.tabFile', 'Importer une photo')}
                </button>
                <button
                  onClick={() => handleModeSwitch('url')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-600 ${
                    inputMode === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('styleTransfer.tabUrl', 'Coller une URL')}
                </button>
              </div>

              {/* ── File mode ── */}
              {inputMode === 'file' && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    preview
                      ? 'border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  {preview ? (
                    <div className="space-y-3">
                      <img
                        src={preview}
                        alt={t('styleTransfer.uploadedImage', 'Uploaded kitchen photo')}
                        className="max-h-48 mx-auto rounded-lg object-cover"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {file?.name} ({((file?.size || 0) / 1024 / 1024).toFixed(1)} MB)
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {t('styleTransfer.clickToChange', 'Click to change photo')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg
                        className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto"
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
                        {t('styleTransfer.dropZone', 'Drop a kitchen photo here')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('styleTransfer.orClick', 'or click to browse')}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        JPEG, PNG, WebP — {t('styleTransfer.maxSize', 'Max 10MB')}
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                </div>
              )}

              {/* ── URL mode ── */}
              {inputMode === 'url' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={t('styleTransfer.urlInputLabel', 'URL de l\'image')}
                    />
                    <button
                      onClick={handleUrlPreview}
                      disabled={!imageUrl.trim() || urlPreviewing}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {urlPreviewing
                        ? t('styleTransfer.urlPreviewing', 'Vérification...')
                        : t('styleTransfer.urlPreview', 'Prévisualiser')}
                    </button>
                  </div>

                  {urlPreviewError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-700 dark:text-red-300">{urlPreviewError}</p>
                    </div>
                  )}

                  {urlPreviewReady && imageUrl && (
                    <div className="text-center space-y-2">
                      <img
                        src={imageUrl}
                        alt={t('styleTransfer.urlPreviewAlt', 'Aperçu de l\'image')}
                        className="max-h-48 mx-auto rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                        onError={() => {
                          setUrlPreviewReady(false);
                          setUrlPreviewError(
                            t(
                              'styleTransfer.urlInaccessible',
                              'URL inaccessible — essayez d\'uploader le fichier directement',
                            ),
                          );
                        }}
                      />
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {t('styleTransfer.urlReady', 'Image accessible')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {t('styleTransfer.analyze', 'Analyser le style')}
              </button>
            </div>
          )}

          {/* ════════════════ Analyzing Step ════════════════ */}
          {step === 'analyzing' && (
            <div className="space-y-4 py-4">
              {/* Show preview depending on mode */}
              {inputMode === 'file' && preview && (
                <img
                  src={preview}
                  alt={t('styleTransfer.analyzingImage', 'Analyzing kitchen photo')}
                  className="max-h-40 mx-auto rounded-lg object-cover opacity-70"
                />
              )}
              {inputMode === 'url' && imageUrl && (
                <img
                  src={imageUrl}
                  alt={t('styleTransfer.analyzingImage', 'Analyzing kitchen photo')}
                  className="max-h-40 mx-auto rounded-lg object-cover opacity-70"
                />
              )}

              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('styleTransfer.analyzingTitle', 'Analyzing your kitchen photo...')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(
                    'styleTransfer.analyzingDesc',
                    'Our AI is identifying style, colors, and materials',
                  )}
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
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
          )}

          {/* ════════════════ Results Step ════════════════ */}
          {step === 'results' && result && (
            <div className="space-y-5">
              {/* Style & Confidence */}
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('styleTransfer.detectedStyle', 'Detected Style')}
                  </p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {formatStyleName(result.style)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${confidenceColor(result.confidence)}`}>
                    {Math.round(result.confidence * 100)}%
                  </p>
                  <p className={`text-[10px] ${confidenceColor(result.confidence)}`}>
                    {confidenceLabel(result.confidence, t)}
                  </p>
                </div>
              </div>

              {/* ── Color Palette — grand format ── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('styleTransfer.colorPalette', 'Color Palette')}
                </h3>
                <div className="flex flex-wrap justify-center gap-4">
                  <ColorSwatch name={t('styleTransfer.color.primary', 'Primary')} hex={result.colorPalette.primary} size="large" />
                  <ColorSwatch name={t('styleTransfer.color.secondary', 'Secondary')} hex={result.colorPalette.secondary} size="large" />
                  <ColorSwatch name={t('styleTransfer.color.accent', 'Accent')} hex={result.colorPalette.accent} size="small" />
                  <ColorSwatch name={t('styleTransfer.color.neutral', 'Neutral')} hex={result.colorPalette.neutral} size="small" />
                </div>
              </div>

              {/* ── Materials — vignettes CSS ── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('styleTransfer.materials', 'Materials')}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <MaterialThumbnail
                    matKey="cabinetMaterial"
                    label={t('styleTransfer.mat.cabinet', 'Cabinet')}
                    value={result.materials.cabinetMaterial}
                    primaryColor={primaryColor}
                  />
                  <MaterialThumbnail
                    matKey="cabinetFinish"
                    label={t('styleTransfer.mat.finish', 'Finish')}
                    value={result.materials.cabinetFinish}
                    primaryColor={primaryColor}
                  />
                  <MaterialThumbnail
                    matKey="countertopMaterial"
                    label={t('styleTransfer.mat.countertop', 'Countertop')}
                    value={result.materials.countertopMaterial}
                    primaryColor={primaryColor}
                  />
                  <MaterialThumbnail
                    matKey="backsplashMaterial"
                    label={t('styleTransfer.mat.backsplash', 'Backsplash')}
                    value={result.materials.backsplashMaterial}
                    primaryColor={primaryColor}
                  />
                  <MaterialThumbnail
                    matKey="flooringMaterial"
                    label={t('styleTransfer.mat.flooring', 'Flooring')}
                    value={result.materials.flooringMaterial}
                    primaryColor={primaryColor}
                  />
                </div>
              </div>

              {/* Door, Handle & Mood */}
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {t('styleTransfer.doorStyle', 'Door Style')}
                  </p>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {formatFeature(result.doorStyle)}
                  </p>
                </div>
                <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {t('styleTransfer.handleStyle', 'Handle Style')}
                  </p>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {formatFeature(result.handleStyle)}
                  </p>
                </div>
                <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {t('styleTransfer.mood', 'Mood')}
                  </p>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                    {formatFeature(result.mood)}
                  </p>
                </div>
              </div>

              {/* Layout Features */}
              {result.layoutFeatures.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('styleTransfer.layoutFeatures', 'Layout Features')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.layoutFeatures.map((feature) => (
                      <span
                        key={feature}
                        className="text-[10px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        {formatFeature(feature)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Brands */}
              {result.suggestedBrands.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('styleTransfer.suggestedBrands', 'Suggested Brands')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.suggestedBrands.map((brand) => (
                      <span
                        key={brand}
                        className="text-[10px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Apply Selections ── */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t('styleTransfer.applySelectTitle', 'Choisir ce que vous souhaitez appliquer :')}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { key: 'colors', label: t('styleTransfer.sel.colors', 'Palette de couleurs') },
                      { key: 'cabinetMaterial', label: t('styleTransfer.sel.cabinet', 'Matériau façades') },
                      { key: 'countertop', label: t('styleTransfer.sel.countertop', 'Plan de travail') },
                      { key: 'backsplash', label: t('styleTransfer.sel.backsplash', 'Crédence') },
                      { key: 'flooring', label: t('styleTransfer.sel.flooring', 'Sol') },
                      { key: 'doorStyle', label: t('styleTransfer.sel.doorStyle', 'Style de porte') },
                      { key: 'handleStyle', label: t('styleTransfer.sel.handleStyle', 'Style de poignée') },
                    ] as { key: keyof typeof applySelections; label: string }[]
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={applySelections[key]}
                        onChange={() => handleToggleSelection(key)}
                        className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                      />
                      <span className="text-xs text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {step === 'results' && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setStep('upload');
                setResult(null);
              }}
              className="flex-1 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              {t('styleTransfer.tryAnother', 'Try Another Photo')}
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {t('styleTransfer.applyToDesign', 'Appliquer la sélection')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Utility
// ----------------------------------------------------------------

/** Convert a File to a base64 string (without the data URI prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const readerResult = reader.result as string;
      const base64 = readerResult.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
