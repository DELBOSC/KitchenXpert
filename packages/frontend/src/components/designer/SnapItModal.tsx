import { Camera, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

/**
 * SnapItModal — upload a photo (kitchen or inspiration) and Gemini
 * Vision identifies items + matches them to the catalog.
 *
 * UX, same shape as AutoLayoutModal :
 *   - Drag-drop OR click-to-pick OR camera capture (mobile)
 *   - Narrated loading while the image is uploaded + analysed
 *   - Result : the user's photo with clickable markers on each
 *     detected item, side panel with the top-3 catalog matches
 *
 * Backend : `POST /api/v1/ai/snapit` — requires the image to already
 * be uploaded to S3 (or our /uploads endpoint). For the prototype the
 * frontend reads the file as a data URL and uploads via FormData ;
 * production should switch to a pre-signed S3 URL pattern.
 */

const API = (import.meta.env?.VITE_API_URL as string) || '/api/v1';

const LOADING_STEPS = [
  'Préparation de l\'image...',
  'Analyse Gemini Vision...',
  'Recherche dans le catalogue...',
  'Calcul des correspondances...',
];

interface DetectedItem {
  description: string;
  category: string;
  confidence: number;
  estimatedSize?: { w: number; d: number; h: number };
  bbox?: { x: number; y: number; w: number; h: number };
  matches?: Array<{
    sku: string;
    brand: string;
    label: string;
    unitPriceEur: number;
    score: number;
    thumbnailUrl?: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  data?: {
    recognition: {
      detectedItems: DetectedItem[];
      sceneSummary: { inferredStyle?: string; palette: string[]; moodKeywords: string[] };
    };
  };
  error?: { code?: string; message?: string };
}

export interface SnapItModalProps {
  open: boolean;
  onClose: () => void;
}

export function SnapItModal({ open, onClose }: SnapItModalProps): React.ReactElement | null {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [contextNote, setContextNote] = useState('');
  const [source, setSource] = useState<'user-kitchen' | 'inspiration-pinterest' | 'inspiration-magazine'>('user-kitchen');
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [result, setResult] = useState<ApiResponse['data'] | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {return;}
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') {onClose();} };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {return null;}

  const onPickFile = (file: File | null): void => {
    setError(null);
    if (!file) {return;}
    if (!file.type.startsWith('image/')) {
      setError('Format non supporté — JPG, PNG ou WebP uniquement.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image trop lourde — 8 MB max.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const submit = async (): Promise<void> => {
    if (!imageFile) { setError('Choisis une image.'); return; }
    setError(null);
    setResult(null);

    let stepIdx = 0;
    setLoadingStep(stepIdx);
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, LOADING_STEPS.length - 1);
      setLoadingStep(stepIdx);
    }, 2500);

    try {
      // Step 1 — upload to /uploads (assumes the endpoint returns { data: { url } })
      const fd = new FormData();
      fd.append('file', imageFile);
      const up = await fetch(`${API}/uploads`, {
        method: 'POST', credentials: 'include', body: fd,
      });
      if (!up.ok) {
        setError('Échec de l\'upload — réessaie.');
        return;
      }
      const upJson = (await up.json()) as { data?: { url: string } };
      const imageUrl = upJson?.data?.url;
      if (!imageUrl) {
        setError('URL d\'upload manquante côté serveur.');
        return;
      }

      // Step 2 — call SnapIt
      const res = await fetch(`${API}/ai/snapit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, contextNote: contextNote || undefined, source }),
      });
      const json = (await res.json()) as ApiResponse;
      if (res.status === 402) {
        setError('Quota IA atteint pour ce mois. Passe Premium pour des analyses illimitées.');
        return;
      }
      if (!res.ok || !json.success || !json.data) {
        setError(json.error?.message || 'Le service de reconnaissance est indisponible.');
        return;
      }
      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      clearInterval(stepInterval);
      setLoadingStep(null);
    }
  };

  const reset = (): void => {
    setImageFile(null); setImagePreview(null); setResult(null);
    setContextNote(''); setSelectedItem(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="snapit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        tabIndex={-1}
      />
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-[#13131a] p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 rounded-full p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <h2 id="snapit-title" className="text-2xl font-semibold text-white">
          SnapIt — identifie depuis une photo
        </h2>
        <p className="mt-2 text-sm text-white/65">
          Uploade une photo (cuisine actuelle ou inspiration) — l&apos;IA détecte les meubles + propose
          les équivalents dans nos catalogues.
        </p>

        {/* ── Pre-result : upload ──────────────────────────────────────── */}
        {!result && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Left : drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                onPickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`relative flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${imagePreview ? 'border-indigo-400/40 bg-white/[0.02]' : 'border-white/15 bg-white/[0.02] hover:border-white/25'}`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Aperçu" className="absolute inset-0 h-full w-full rounded-xl object-cover opacity-90" />
                  <button
                    type="button"
                    onClick={reset}
                    className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur"
                  >
                    Changer
                  </button>
                </>
              ) : (
                <>
                  <div><Camera className="w-10 h-10 text-white/40" aria-hidden="true" /></div>
                  <div className="mt-3 text-sm font-medium text-white/85">Glisse une photo ici</div>
                  <div className="mt-1 text-xs text-white/40">JPG / PNG / WebP · 8 MB max</div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                  >
                    Choisir un fichier
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Right : context + options */}
            <div className="flex flex-col gap-4">
              <div>
                <span id="snapit-source-label" className="text-xs font-medium uppercase tracking-widest text-white/40">Type d&apos;image</span>
                <div className="mt-2 grid grid-cols-1 gap-2" role="group" aria-labelledby="snapit-source-label">
                  {[
                    { val: 'user-kitchen',          label: 'Ma cuisine actuelle' },
                    { val: 'inspiration-pinterest', label: 'Inspiration Pinterest' },
                    { val: 'inspiration-magazine',  label: 'Inspiration magazine / web' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setSource(opt.val as typeof source)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${source === opt.val ? 'border-indigo-400/40 bg-indigo-500/[0.08] text-white' : 'border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/5'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="snapit-context-note" className="text-xs font-medium uppercase tracking-widest text-white/40">Note (optionnel)</label>
                <textarea
                  id="snapit-context-note"
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex. : je cherche surtout l'équivalent du frigo et du plan de travail"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-white/35">
                La reconnaissance dépend de la qualité de la photo. Les correspondances sont des suggestions à valider.
              </p>
            </div>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────── */}
        {loadingStep !== null && (
          <div className="mt-6 rounded-lg border border-indigo-500/20 bg-indigo-500/[0.08] p-4">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300/30 border-t-indigo-300" />
              <div className="text-sm font-medium text-white">{LOADING_STEPS[loadingStep]}</div>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400 transition-all duration-1000"
                style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}

        {/* ── Result : annotated image + matches ─────────────────────── */}
        {result && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
              {imagePreview && (
                <img src={imagePreview} alt="" className="block h-auto w-full" />
              )}
              {/* Markers overlaid via percentage positioning */}
              {result.recognition.detectedItems.map((item, i) => item.bbox && (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedItem(i)}
                  aria-label={item.description}
                  className={`absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 text-xs font-bold transition ${selectedItem === i ? 'border-amber-400 bg-amber-400/30 text-white scale-125' : 'border-white/80 bg-black/60 text-white hover:scale-110'}`}
                  style={{
                    left:  `${(item.bbox.x + item.bbox.w / 2) * 100}%`,
                    top:   `${(item.bbox.y + item.bbox.h / 2) * 100}%`,
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto">
              {result.recognition.sceneSummary.inferredStyle && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Style détecté</div>
                  <div className="text-sm font-medium text-white">{result.recognition.sceneSummary.inferredStyle}</div>
                </div>
              )}

              {result.recognition.detectedItems.map((item, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  className={`rounded-lg border p-3 transition ${selectedItem === i ? 'border-amber-400/40 bg-amber-500/[0.05]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'}`}
                  onClick={() => setSelectedItem(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedItem(i); } }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm text-white">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                        {i + 1}
                      </span>
                      {item.description}
                    </div>
                    <span className="text-[11px] text-white/40">{Math.round(item.confidence * 100)} %</span>
                  </div>
                  {item.matches && item.matches.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {item.matches.map((m) => (
                        <li key={m.sku} className="flex items-baseline justify-between text-xs">
                          <span className="text-white/75">{m.brand} · {m.label}</span>
                          <span className="font-medium tabular-nums text-white">{m.unitPriceEur} €</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-[11px] text-white/40 italic">Aucune correspondance — élargis ta cuisine ou tente une autre photo.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {result ? (
            <>
              <button type="button" onClick={reset} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                Nouvelle photo
              </button>
              <button type="button" onClick={onClose} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-white/90">
                Fermer
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={loadingStep !== null} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={loadingStep !== null || !imageFile}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
              >
                {loadingStep !== null ? 'Analyse...' : 'Analyser la photo'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SnapItModal;
