import { ArrowLeft, Palette, Ruler, Sparkles } from 'lucide-react';
import React from 'react';

import { SANDBOX_TEMPLATES, type SandboxTemplate } from '../../sandbox/templates';
import { Dialog } from '../ui';

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

  return (
    <Dialog
      open={open}
      onClose={onSkip}
      title="Comment souhaitez-vous démarrer ?"
      description="Vous êtes en mode démo. Aucun compte requis. Votre projet est sauvegardé dans ce navigateur."
      titleClassName="text-2xl font-semibold tracking-tight text-white"
      size="xl"
    >
      {tab === 'choose' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <ChoiceCard
            icon={<Sparkles className="w-8 h-8" aria-hidden="true" />}
            title="Cuisine vide"
            body="Partez d'une pièce vide aux dimensions par défaut (4 × 3,5 m)."
            onClick={onPickEmpty}
          />
          <ChoiceCard
            icon={<Ruler className="w-8 h-8" aria-hidden="true" />}
            title="Importer un plan"
            body="Glissez votre PDF, DXF ou photo de plan annoté."
            onClick={onImportPlan}
            comingSoon
          />
          <ChoiceCard
            icon={<Palette className="w-8 h-8" aria-hidden="true" />}
            title="Choisir un template"
            body="6 layouts pré-configurés : L, U, parallèle, îlot, ouverte, atypique."
            onClick={() => setTab('templates')}
          />
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <button
            type="button"
            onClick={() => setTab('choose')}
            className="mb-4 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Retour
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
    </Dialog>
  );
}

function ChoiceCard({
  icon, title, body, onClick, comingSoon = false,
}: {
  icon: React.ReactNode; title: string; body: string; onClick: () => void; comingSoon?: boolean;
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
