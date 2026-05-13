import React from 'react';

import { SANDBOX_TEMPLATES, type SandboxTemplate } from '../../sandbox/templates';

/**
 * First-visit modal in the sandbox designer. Three branches:
 *   - "Cuisine vide"        — call onPickEmpty()
 *   - "Importer un plan"    — call onImportPlan()  (currently TODO — file picker stub)
 *   - "Choisir un template" — render the 6-template grid + onPickTemplate(t)
 *
 * Skippable by clicking the backdrop or pressing Escape (parent owns
 * open/close state). The modal is dismissed automatically by the
 * parent once a choice is made.
 *
 * Visual TODO: a richer template-card with cover image + item count
 * preview. The structure is here so the design pass is purely cosmetic.
 */
export interface SandboxOnboardingModalProps {
  open: boolean;
  onPickEmpty: () => void;
  onPickTemplate: (template: SandboxTemplate) => void;
  onImportPlan: () => void;
  onSkip: () => void;
}

export function SandboxOnboardingModal({
  open,
  onPickEmpty,
  onPickTemplate,
  onImportPlan,
  onSkip,
}: SandboxOnboardingModalProps): React.ReactElement | null {
  const [tab, setTab] = React.useState<'choose' | 'templates'>('choose');

  if (!open) {return null;}

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sandbox-onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {onSkip();}
      }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#13131a] p-8 shadow-2xl">
        <button
          type="button"
          onClick={onSkip}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-full p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <span aria-hidden>×</span>
        </button>

        <h2 id="sandbox-onboarding-title" className="text-2xl font-semibold text-white">
          Comment souhaitez-vous démarrer&nbsp;?
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Vous êtes en mode démo. Aucun compte requis. Votre projet est sauvegardé dans ce navigateur.
        </p>

        {tab === 'choose' && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ChoiceCard
              icon="✨"
              title="Cuisine vide"
              body="Partez d'une pièce vide aux dimensions par défaut (4 × 3,5 m)."
              onClick={onPickEmpty}
            />
            <ChoiceCard
              icon="📐"
              title="Importer un plan"
              body="Glissez votre PDF, DXF ou photo de plan annoté."
              onClick={onImportPlan}
              comingSoon
            />
            <ChoiceCard
              icon="🎨"
              title="Choisir un template"
              body="6 layouts pré-configurés : L, U, parallèle, îlot, ouverte, atypique."
              onClick={() => setTab('templates')}
            />
          </div>
        )}

        {tab === 'templates' && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setTab('choose')}
              className="mb-4 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
            >
              <span aria-hidden>←</span> Retour
            </button>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SANDBOX_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onPickTemplate(tpl)}
                  className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-slate-700 to-slate-900" aria-hidden />
                  <div className="text-sm font-medium text-white">{tpl.name}</div>
                  <div className="text-xs text-white/55">{tpl.blurb}</div>
                  <div className="mt-1 text-[11px] text-white/40">
                    {tpl.items.length} meubles · {tpl.widthCm}×{tpl.depthCm} cm
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
          >
            Passer cette étape
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  icon, title, body, onClick, comingSoon = false,
}: {
  icon: string; title: string; body: string; onClick: () => void; comingSoon?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={comingSoon}
      className="group relative flex h-full flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-white/25 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="text-3xl" aria-hidden>{icon}</div>
      <div className="text-base font-semibold text-white">{title}</div>
      <div className="text-xs leading-relaxed text-white/55">{body}</div>
      {comingSoon && (
        <span className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
          Bientôt
        </span>
      )}
    </button>
  );
}

export default SandboxOnboardingModal;
