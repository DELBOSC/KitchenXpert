import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { cn } from './_utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  dismissOnBackdropClick?: boolean;
  /**
   * Classes Tailwind appliquées au `<h2>` du titre interne.
   *
   * - Si non fourni, classes par défaut : `text-base font-semibold tracking-tight text-white`.
   * - Si fourni, **remplace entièrement** les classes par défaut (pas de merge).
   *   L'appelant assume toute la cosmétique du titre (taille, poids, couleur).
   *
   * Sans effet si `headerless={true}`.
   */
  titleClassName?: string;
  /**
   * Si `true`, le bloc header (title + description + séparateur `border-b`)
   * n'est jamais rendu, même si `title` ou `description` sont fournis.
   *
   * Destiné aux modals au layout très custom (ex : SignupPromptModal) où le
   * header standard ne convient pas.
   *
   * ⚠️ Accessibilité : quand `headerless={true}`, le Dialog n'expose plus
   * `aria-labelledby` ni `aria-describedby`. L'appelant DOIT garantir
   * l'accessibilité du modal autrement — typiquement en rendant un titre
   * sémantique (`<h2>`, `<h3>`…) dans `children`. Les lecteurs d'écran
   * liront alors le contenu mais sans label structuré explicite au niveau
   * du dialog.
   */
  headerless?: boolean;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissOnBackdropClick = true,
  titleClassName,
  headerless = false,
}: DialogProps): React.ReactElement | null {
  const contentRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // focus the dialog for screen readers
    requestAnimationFrame(() => contentRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={dismissOnBackdropClick ? onClose : undefined}
            aria-hidden
          />
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title && !headerless ? 'kx-dialog-title' : undefined}
            aria-describedby={description && !headerless ? 'kx-dialog-desc' : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d14] shadow-2xl',
              sizes[size]
            )}
          >
            <button
              onClick={onClose}
              className="kx-focus absolute right-4 top-4 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            {!headerless && (title || description) && (
              <div className="border-b border-white/10 px-6 pb-4 pt-5">
                {title && (
                  <h2
                    id="kx-dialog-title"
                    className={
                      titleClassName ?? 'text-base font-semibold tracking-tight text-white'
                    }
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="kx-dialog-desc" className="mt-1 text-sm text-white/60">
                    {description}
                  </p>
                )}
              </div>
            )}
            {children && <div className="px-6 py-5">{children}</div>}
            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-white/10 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
