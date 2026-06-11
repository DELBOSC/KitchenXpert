import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'kx.cookie-consent.v1';

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

function loadConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {return null;}
    const parsed = JSON.parse(raw) as ConsentState;
    if (!parsed.decidedAt) {return null;}
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(state: Omit<ConsentState, 'necessary' | 'decidedAt'>): void {
  const full: ConsentState = {
    necessary: true,
    analytics: state.analytics,
    marketing: state.marketing,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  window.dispatchEvent(new CustomEvent('kx:consent-changed', { detail: full }));
}

export function getConsent(): ConsentState | null {
  return loadConsent();
}

export default function CookieConsent(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!loadConsent()) {setVisible(true);}
  }, []);

  if (!visible) {return null;}

  const acceptAll = (): void => {
    saveConsent({ analytics: true, marketing: true });
    setVisible(false);
  };
  const rejectAll = (): void => {
    saveConsent({ analytics: false, marketing: false });
    setVisible(false);
  };
  const saveChoices = (): void => {
    saveConsent({ analytics, marketing });
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#0a0a0f]/95 p-5 text-white shadow-2xl backdrop-blur-xl sm:p-6">
        <h2 id="cookie-consent-title" className="text-base font-semibold">
          Votre vie privée, votre choix
        </h2>
        <p id="cookie-consent-desc" className="mt-2 text-sm text-white/70">
          Nous utilisons des cookies strictement nécessaires pour faire fonctionner le site.
          Avec votre accord, nous utilisons aussi des cookies de mesure d'audience et marketing.
          Vous pouvez accepter, refuser ou personnaliser à tout moment.{' '}
          <a href="/legal/cookies" className="underline underline-offset-2 hover:text-white">
            En savoir plus
          </a>
          .
        </p>

        {expanded && (
          <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
            <Row
              label="Strictement nécessaires"
              desc="Requis pour la connexion et la sécurité. Toujours actifs."
              checked
              disabled
            />
            <Row
              label="Mesure d'audience"
              desc="Nous aide à comprendre l'usage et améliorer le service."
              checked={analytics}
              onChange={setAnalytics}
            />
            <Row
              label="Marketing"
              desc="Publicités personnalisées sur d'autres sites."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!expanded ? (
            <>
              <button
                onClick={() => setExpanded(true)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
              >
                Personnaliser
              </button>
              <button
                onClick={rejectAll}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
              >
                Tout refuser
              </button>
              <button
                onClick={acceptAll}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
              >
                Tout accepter
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setExpanded(false)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
              >
                Retour
              </button>
              <button
                onClick={saveChoices}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
              >
                Enregistrer mes choix
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}): React.ReactElement {
  const inputId = React.useId();
  return (
    <div className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition hover:bg-white/5">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10 accent-fuchsia-400"
      />
      <label htmlFor={inputId} className="cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-white/60">{desc}</span>
      </label>
    </div>
  );
}
