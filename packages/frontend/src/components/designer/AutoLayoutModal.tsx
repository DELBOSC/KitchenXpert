import { ChefHat, X } from 'lucide-react';
import React, { useState } from 'react';

import { useSandboxStore, type SandboxItem } from '../../sandbox/store';

/**
 * AutoLayoutModal — la feature IA d'entrée. Textarea + 3 cards de
 * proposition rendues côte à côte avec preview Gemini.
 *
 * Loading narré (étape 1/3 / 2/3 / 3/3) au lieu d'un spinner muet —
 * la requête prend 5–15 secondes, l'utilisateur doit voir qu'il se
 * passe quelque chose de précis.
 *
 * Quand l'user clique « Charger », on importe le layout dans le
 * sandbox store : les composants designer existants prennent le relai.
 */

const API = (import.meta.env?.VITE_API_URL as string) || '/api/v1';

const SUGGESTED_PROMPTS = [
  '12 m² en L, style scandinave, budget 8 000 € avec coin petit-déjeuner',
  'Petite cuisine 6 m² parallèle ouverte sur séjour, style minimaliste',
  'Grande cuisine 18 m² avec îlot central, style industriel, budget 25 000 €',
  'Cuisine en U fonctionnelle pour famille avec 2 enfants, lave-vaisselle 60 cm',
];

const LOADING_STEPS = [
  'Analyse de votre demande...',
  'Génération du layout 3D...',
  'Sélection du catalogue + budget...',
  'Rendu photoréaliste...',
];

interface Proposal {
  name: string;
  rationale: string;
  score: number;
  layout: SandboxItem extends never ? never : 'L_SHAPED' | 'U_SHAPED' | 'GALLEY' | 'ISLAND' | 'PENINSULA' | 'ONE_WALL' | 'OPEN_PLAN';
  room: { widthCm: number; depthCm: number; heightCm: number };
  totalEur: number;
  items: Array<{
    sku: string;
    label: string;
    brand: string;
    position: { x: number; y: number; z: number };
    size: { w: number; d: number; h: number };
    rotation: number;
    unitPriceEur: number;
    category: string;
  }>;
}

interface ApiResponse {
  success: boolean;
  data?: {
    layouts: { proposals: Proposal[] };
    previewUrls?: string[];
    usage: { monthlyUsdAfter: number; monthlyUsdLimit: number | null };
  };
  error?: { code?: string; message?: string };
}

export interface AutoLayoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AutoLayoutModal({ open, onClose }: AutoLayoutModalProps): React.ReactElement | null {
  const [prompt, setPrompt] = useState('');
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[] | undefined>();
  const [error, setError] = useState<string | null>(null);

  const loadFromTemplate = useSandboxStore((s) => s.loadFromTemplate);

  if (!open) {return null;}

  const submit = async (): Promise<void> => {
    if (prompt.trim().length < 20) {
      setError('Décris ton projet en au moins 20 caractères.');
      return;
    }
    setError(null);
    setProposals(null);

    // Narrated loading — fakes progress between API call start and end.
    let stepIdx = 0;
    setLoadingStep(stepIdx);
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, LOADING_STEPS.length - 1);
      setLoadingStep(stepIdx);
    }, 3000);

    try {
      const res = await fetch(`${API}/ai/auto-layout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, generatePreviews: true }),
      });
      const json = (await res.json()) as ApiResponse;

      if (res.status === 402) {
        setError('Quota IA atteint pour ce mois. Passe Premium pour des layouts illimités.');
        return;
      }
      if (!res.ok || !json.success || !json.data) {
        setError(json.error?.message || 'Le service IA est indisponible, réessaie dans un instant.');
        return;
      }
      setProposals(json.data.layouts.proposals);
      setPreviewUrls(json.data.previewUrls);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      clearInterval(stepInterval);
      setLoadingStep(null);
    }
  };

  const loadProposal = (p: Proposal): void => {
    // Cast minimal : the use case returns positions in cm + items already typed
    // close enough to SandboxItem. Use the existing newProject + addItem helpers.
    const project = useSandboxStore.getState().project;
    if (project) {
      // Fresh start — overwrite the current project (sandbox = single project).
      // The store's loadFromTemplate API expects a SandboxTemplate but we have
      // the same shape; we synthesize a one-off template.
      loadFromTemplate({
        id: `ai-${Date.now()}`,
        name: p.name,
        blurb: p.rationale,
        layout: p.layout,
        widthCm: p.room.widthCm,
        depthCm: p.room.depthCm,
        heightCm: p.room.heightCm,
        coverUrl: '',
        items: p.items.map((it) => ({
          sku: it.sku,
          label: it.label,
          providerCode: it.brand as never,
          unitPrice: it.unitPriceEur,
          quantity: 1,
          position: it.position,
          rotation: it.rotation,
          size: it.size,
        })),
      });
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-layout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) {onClose();} }}
    >
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-[#13131a] p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 rounded-full p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        <h2 id="auto-layout-title" className="text-2xl font-semibold text-white">
          Décris ta cuisine idéale
        </h2>
        <p className="mt-2 text-sm text-white/65">
          L'IA propose 3 layouts complets en moins de 15 secondes — dimensions, meubles, budget.
        </p>

        {/* ── Input ──────────────────────────────────────────────────── */}
        {!proposals && (
          <>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Ex. : 12 m² en L, style scandinave, budget 8 000 €, avec coin petit-déjeuner"
              disabled={loadingStep !== null}
              className="mt-6 w-full rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none disabled:opacity-50"
            />

            {loadingStep === null && (
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/70 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

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

            {error && (
              <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loadingStep !== null}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={loadingStep !== null || prompt.trim().length < 20}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
              >
                {loadingStep !== null ? 'Génération…' : 'Générer 3 propositions'}
              </button>
            </div>
          </>
        )}

        {/* ── Results — 3 cards ─────────────────────────────────────── */}
        {proposals && (
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {proposals.map((p, i) => (
              <article key={i} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900">
                  {previewUrls?.[i] ? (
                    <img src={previewUrls[i]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl"><ChefHat className="w-12 h-12 text-white/40" aria-hidden="true" /></div>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-semibold text-white">{p.name}</h3>
                  <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    Score {p.score}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-white/60">{p.rationale}</p>
                <div className="mt-auto flex items-baseline justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-white/50">{p.items.length} meubles · {p.layout}</span>
                  <span className="text-base font-semibold text-white tabular-nums">
                    {p.totalEur.toLocaleString('fr-FR')} €
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => loadProposal(p)}
                  className="mt-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-white/90"
                >
                  Charger dans le designer
                </button>
              </article>
            ))}
          </div>
        )}

        {proposals && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setProposals(null); setPreviewUrls(undefined); }}
              className="text-xs text-white/55 underline-offset-4 hover:text-white/70 hover:underline"
            >
              Reformuler ma demande
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AutoLayoutModal;
