import React, { useEffect, useRef, useState } from 'react';

import { useLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from './LanguageProvider';

/**
 * LanguageSwitcher — dropdown sobre dans le header.
 *
 * UX :
 *   - Affiche le drapeau + code court (FR / EN) en mode replié
 *   - Ouvre en cliquant ou via clavier (Enter / Space)
 *   - Esc ferme + focus retourne au trigger
 *   - Fermeture si clic outside
 *
 * Persistance + redirection :
 *   - `LanguageProvider.setLanguage(next)` réécrit le cookie + le path
 *     (préfixe `/en` ↔ `/fr`) et i18next change de langue
 *   - Tu n'as pas besoin de penser à la cohérence URL/cookie/i18n
 */

const LABEL: Record<SupportedLanguage, { flag: string; full: string }> = {
  fr: { flag: '🇫🇷', full: 'Français' },
  en: { flag: '🇬🇧', full: 'English' },
};

export function LanguageSwitcher(): React.ReactElement {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {return;}
    const onClickOutside = (e: MouseEvent): void => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handlePick = (next: SupportedLanguage): void => {
    if (next !== language) {setLanguage(next);}
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Langue actuelle : ${LABEL[language].full}. Changer de langue.`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/85 transition hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <span aria-hidden>{LABEL[language].flag}</span>
        <span className="font-medium uppercase tracking-wide">{language}</span>
        <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Sélecteur de langue"
          className="absolute right-0 top-full z-40 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-white/10 bg-[#0f0f15] py-1 shadow-2xl backdrop-blur-md"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang === language;
            return (
              <button
                key={lang}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handlePick(lang)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span aria-hidden className="text-base">{LABEL[lang].flag}</span>
                <span>{LABEL[lang].full}</span>
                {active && (
                  <span aria-hidden className="ml-auto text-white/50">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
