import { Sparkles, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';

/**
 * The one-time cue that makes the contextual presence READ as competence.
 *
 * This is the weak point of the whole design: the assistant is deliberately absent
 * from the pages where it knows nothing, so nothing ever "appears and disappears" —
 * but a user who never notices it never finds it at all. So we say, once, what it
 * knows HERE: "il voit ta cuisine", "il connaît ce catalogue".
 *
 * It is one line, not an onboarding. It states a capability, never sells. It is
 * dismissible and never comes back (localStorage), and it is a plain region — never
 * a modal over the 3D canvas (§8.1).
 */

const KEY_PREFIX = 'kx.assistant.intro.';

interface AssistantIntroProps {
  /** One dismissal per surface: the designer cue and the catalog cue are distinct. */
  surface: 'designer' | 'catalog';
  message: string;
  onOpen: () => void;
  ctaLabel: string;
  /**
   * 'row' for a wide container (the catalog search bar), 'stack' for a narrow one
   * (the 288px designer dock, where a single row squeezes the sentence to 4 lines).
   * The cue only works if it reads instantly — a cramped one is a cue nobody reads.
   */
  layout?: 'row' | 'stack';
}

function alreadySeen(surface: string): boolean {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${surface}`) === '1';
  } catch {
    return false; // private browsing — showing it once more is harmless
  }
}

export default function AssistantIntro({
  surface,
  message,
  onOpen,
  ctaLabel,
  layout = 'row',
}: AssistantIntroProps): React.ReactElement | null {
  const [seen, setSeen] = useState(() => alreadySeen(surface));

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(`${KEY_PREFIX}${surface}`, '1');
    } catch {
      /* private browsing — no-op */
    }
    setSeen(true);
  }, [surface]);

  const open = useCallback(() => {
    dismiss();
    onOpen();
  }, [dismiss, onOpen]);

  if (seen) {
    return null;
  }

  const cta = (
    <button
      type="button"
      onClick={open}
      className="kx-focus flex-shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-kx-brand-strong transition-colors hover:bg-kx-brand-from/10 dark:text-kx-brand-from"
    >
      {ctaLabel}
    </button>
  );
  const close = (
    <button
      type="button"
      onClick={dismiss}
      className="kx-focus flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
      aria-label="Ne plus afficher"
      title="Ne plus afficher"
    >
      <X className="h-3.5 w-3.5" aria-hidden />
    </button>
  );

  return (
    <div
      role="region"
      aria-label="Assistant disponible ici"
      className="rounded-xl border border-kx-brand-from/25 bg-kx-brand-from/[0.06] px-3 py-2"
    >
      {layout === 'stack' ? (
        <>
          <div className="flex items-start gap-2">
            <Sparkles
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-kx-brand-strong dark:text-kx-brand-from"
              aria-hidden
            />
            <p className="min-w-0 flex-1 text-xs leading-snug text-gray-700 dark:text-gray-200">
              {message}
            </p>
            {close}
          </div>
          <div className="mt-1 flex justify-end">{cta}</div>
        </>
      ) : (
        <div className="flex items-center gap-2.5">
          <Sparkles
            className="h-4 w-4 flex-shrink-0 text-kx-brand-strong dark:text-kx-brand-from"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-xs text-gray-700 dark:text-gray-200">{message}</p>
          {cta}
          {close}
        </div>
      )}
    </div>
  );
}
