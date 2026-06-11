import { ArrowUpRight, Heart, PartyPopper } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Dialog } from '../ui';

/**
 * ReviewPromptModal — modal de satisfaction in-app.
 *
 * Flux :
 *   1. À l'ouverture du dashboard / d'un projet, on appelle
 *      GET /me/reviews/pending. Si une demande est ouverte, ce composant
 *      se monte.
 *   2. L'utilisateur clique 1–5 étoiles.
 *   3. Branchement :
 *        - 4 ou 5 étoiles → écran "Partagez votre avis sur G2 /
 *          Capterra / Trustpilot" + bouton qui ouvre la plateforme.
 *        - 1 à 3 étoiles  → écran "Que pouvons-nous améliorer ?" avec
 *          un textarea + bouton Envoyer. Feedback INTERNE, jamais
 *          poussé sur les plateformes externes.
 *   4. POST /me/reviews/respond pour enregistrer.
 *   5. Le modal se ferme. Cooldown 90 jours côté backend.
 *
 * **Légalité :** la satisfaction-gate est conforme aux CGU G2 /
 * Capterra / Trustpilot car NOUS COLLECTONS le feedback négatif
 * (en interne) ; nous ne le supprimons pas. Voir docs/REVIEWS-PLAYBOOK.md.
 */

const API_BASE = (import.meta.env?.VITE_API_URL as string) || '/api/v1';

interface PendingRequest {
  id: string;
  trigger: string;
  projectId: string | null;
}

interface RespondResult {
  externalUrl: string | null;
  platform: 'g2' | 'capterra' | 'trustpilot' | 'avis_verifies' | 'google_business' | null;
}

type Step = 'rate' | 'thanks-external' | 'thanks-internal' | 'feedback-form';

export function ReviewPromptModal(): React.ReactElement | null {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('rate');
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [externalUrl, setExternalUrl] = useState<string | null>(null);

  // ─── Poll for pending request on mount ───────────────────────────────────
  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/me/reviews/pending`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!mounted || !json?.data) {return;}
        setRequest(json.data);
        setOpen(true);
      })
      .catch(() => { /* silent — non-critical */ });
    return () => { mounted = false; };
  }, []);

  const close = (): void => {
    setOpen(false);
    if (request?.id) {
      // Soft-dismiss so the cooldown kicks in even if they didn't rate.
      void fetch(`${API_BASE}/me/reviews/dismiss`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      }).catch(() => {});
    }
  };

  const pickRating = (n: number): void => {
    setRating(n);
    if (n >= 4) {
      // Submit immediately on high rating; we want the user to land on
      // the external platform with as little friction as possible.
      void submitResponse(n, undefined);
    } else {
      setStep('feedback-form');
    }
  };

  const submitResponse = async (r: number, msg: string | undefined): Promise<void> => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/me/reviews/respond`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request?.id,
          rating: r,
          message: msg,
          context: window.location.pathname,
        }),
      });
      if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
      const json = (await res.json()) as { data: RespondResult };
      if (json.data.externalUrl) {
        setExternalUrl(json.data.externalUrl);
        setStep('thanks-external');
      } else {
        setStep('thanks-internal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const titleByStep: Record<Step, React.ReactNode> = {
    'rate': <>Comment se passe votre expérience&nbsp;?</>,
    'feedback-form': <>Qu&apos;est-ce qui pourrait être mieux&nbsp;?</>,
    'thanks-external': (
      <>
        Merci&nbsp;! <PartyPopper className="inline-block w-6 h-6 align-text-bottom" aria-hidden="true" />
      </>
    ),
    'thanks-internal': (
      <>
        Bien reçu, merci. <Heart className="inline-block w-6 h-6 align-text-bottom" aria-hidden="true" />
      </>
    ),
  };

  const descriptionByStep: Record<Step, React.ReactNode> = {
    'rate': <>Votre retour nous aide à améliorer KitchenXpert. Ça prend 30 secondes.</>,
    'feedback-form': (
      <>
        Votre message va directement à l&apos;équipe produit — il n&apos;est PAS publié.
        Nous lisons et répondons généralement sous 48 h.
      </>
    ),
    'thanks-external': (
      <>
        Acceptez-vous de partager votre avis sur une plateforme publique&nbsp;?
        Ça nous aide énormément à exister face à la concurrence.
      </>
    ),
    'thanks-internal': <>On revient vers vous sous 48 h. En attendant, votre projet vous attend.</>,
  };

  return (
    <Dialog
      open={open}
      onClose={() => void close()}
      title={titleByStep[step]}
      description={descriptionByStep[step]}
      titleClassName="text-xl font-semibold text-white"
      size="md"
    >
      {step === 'rate' && (
        <>
          <div
            role="radiogroup"
            aria-label="Note de 1 à 5 étoiles"
            tabIndex={0}
            className="flex justify-center gap-2"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => pickRating(n)}
                className="rounded-full p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                disabled={submitting}
              >
                <Star filled={(hover || rating) >= n} />
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-white/40">
            4–5 étoiles → partage sur G2/Capterra/Trustpilot · 1–3 étoiles → feedback privé
          </p>
        </>
      )}

      {step === 'feedback-form' && (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Décrivez le souci ou la fonctionnalité manquante…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => void close()}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void submitResponse(rating, message || undefined)}
              disabled={submitting || message.trim().length < 5}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
            >
              {submitting ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </>
      )}

      {step === 'thanks-external' && externalUrl && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void close()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-white/90"
          >
            Partager mon avis
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => void close()}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10"
          >
            Une autre fois
          </button>
        </div>
      )}

      {step === 'thanks-internal' && (
        <button
          type="button"
          onClick={() => void close()}
          className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-white/90"
        >
          Fermer
        </button>
      )}
    </Dialog>
  );
}

function Star({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-8 w-8 transition ${filled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-white/30'}`}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.49 3.5l2.36 4.79 5.28.77-3.82 3.73.9 5.26-4.72-2.48-4.72 2.48.9-5.26L3.85 9.06l5.28-.77 2.36-4.79z"
      />
    </svg>
  );
}

export default ReviewPromptModal;
