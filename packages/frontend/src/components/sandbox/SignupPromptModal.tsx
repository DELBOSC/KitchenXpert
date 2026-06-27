import { ArrowRight } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { tagConversion } from '../../hooks/useABVariant';
import { trackSandbox } from '../../sandbox/useSandboxAnalytics';
import { Dialog } from '../ui';

import type { FrictionTrigger } from '../../sandbox/useSandboxLimits';

/**
 * Modal shown when the user hits a sandbox limit. The copy adapts to
 * the trigger so the value-prop matches the moment (e.g. "Téléchargez
 * votre devis sans filigrane" beats a generic "Créez un compte").
 *
 * Designed as a controlled component — the parent owns open/close
 * state via `useSandboxLimits()`.
 */

const COPY: Record<FrictionTrigger, { title: string; body: string; cta: string }> = {
  pdf_export: {
    title: 'Téléchargez votre devis sans filigrane',
    body: 'Le PDF preview est filigrané. Créez un compte gratuit pour exporter une version propre, partageable avec vos artisans.',
    cta: 'Créer mon compte gratuit',
  },
  ai_use: {
    title: "Continuez avec l'assistant IA",
    body: "Vous avez utilisé vos 3 essais gratuits. Avec un compte, vous bénéficiez de 20 utilisations IA par heure et de l'historique de vos conversations.",
    cta: "Débloquer l'IA",
  },
  quote_compare: {
    title: 'Comparez les devis des fournisseurs',
    body: 'Le comparateur multi-fournisseurs est une fonctionnalité réservée aux comptes — il interroge les API IKEA, Leroy Merlin, Castorama, Bosch et Schmidt en temps réel.',
    cta: 'Comparer les prix',
  },
  pathtracer: {
    title: 'Rendu photo-réaliste haute définition',
    body: 'Le path-tracer haute résolution (4K, 16 samples/pixel) consomme beaucoup de calcul GPU. Réservé aux comptes pour préserver une expérience fluide pour tous.',
    cta: 'Activer la HD',
  },
  session_15min: {
    title: 'Sauvegardez votre travail',
    body: "Vous concevez depuis 15 minutes. Créez un compte (15 secondes, sans CB) pour ne jamais perdre votre projet et y accéder depuis n'importe quel appareil.",
    cta: 'Sauvegarder mon projet',
  },
};

export interface SignupPromptModalProps {
  open: boolean;
  trigger: FrictionTrigger | null;
  onClose: () => void;
}

export function SignupPromptModal({
  open,
  trigger,
  onClose,
}: SignupPromptModalProps): React.ReactElement | null {
  if (!trigger) {
    return null;
  }

  const copy = COPY[trigger];

  const handleCtaClick = (): void => {
    trackSandbox({ type: 'sandbox_signup_intent', props: { from: 'modal', trigger } });
    tagConversion('hero', 'sandbox_signup_intent_ab');
  };

  return (
    <Dialog open={open} onClose={onClose} headerless size="md">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        Mode démo
      </div>

      <h2
        id="sandbox-prompt-title"
        data-testid="signup-prompt-title"
        className="text-xl font-semibold text-white"
      >
        {copy.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-white/65">{copy.body}</p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          to={`/register?from=${trigger}`}
          onClick={handleCtaClick}
          data-testid="signup-prompt-cta-primary"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-white/90"
        >
          {copy.cta}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          data-testid="signup-prompt-cta-secondary"
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Continuer en démo
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-white/40">Sans CB · 15 secondes · RGPD</p>
    </Dialog>
  );
}

export default SignupPromptModal;
