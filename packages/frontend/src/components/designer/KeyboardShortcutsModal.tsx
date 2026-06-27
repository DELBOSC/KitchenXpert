import React, { useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  action: string;
  keys: string[];
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutEntry[];
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps): React.ReactElement | null {
  const { t } = useTranslation();

  const shortcutCategories: ShortcutCategory[] = useMemo(
    () => [
      {
        title: t('shortcuts.history', 'Historique'),
        shortcuts: [
          { action: t('shortcuts.undo', 'Annuler'), keys: ['Ctrl', 'Z'] },
          { action: t('shortcuts.redo', 'Retablir'), keys: ['Ctrl', 'Y'] },
        ],
      },
      {
        title: t('shortcuts.object', 'Objet'),
        shortcuts: [
          { action: t('shortcuts.delete', 'Supprimer'), keys: ['Delete'] },
          { action: t('shortcuts.duplicate', 'Dupliquer'), keys: ['Ctrl', 'D'] },
          { action: t('shortcuts.copy', 'Copier'), keys: ['Ctrl', 'C'] },
          { action: t('shortcuts.paste', 'Coller'), keys: ['Ctrl', 'V'] },
        ],
      },
      {
        title: t('shortcuts.transformation', 'Transformation'),
        shortcuts: [
          { action: t('shortcuts.move', 'Deplacer'), keys: ['T'] },
          { action: t('shortcuts.rotation', 'Rotation'), keys: ['R'] },
          { action: t('shortcuts.scale', 'Echelle'), keys: ['S'] },
          { action: t('shortcuts.deselect', 'Deselectionner'), keys: ['Escape'] },
        ],
      },
      {
        title: t('shortcuts.grid', 'Grille'),
        shortcuts: [
          {
            action: t('shortcuts.toggleSnapping', "Activer/Desactiver l'aimantation"),
            keys: ['G'],
          },
        ],
      },
      {
        title: t('shortcuts.camera', 'Camera'),
        shortcuts: [
          { action: t('shortcuts.topView', 'Vue dessus'), keys: ['1'] },
          { action: t('shortcuts.frontView', 'Vue face'), keys: ['2'] },
          { action: t('shortcuts.rightView', 'Vue droite'), keys: ['3'] },
          { action: t('shortcuts.leftView', 'Vue gauche'), keys: ['4'] },
          { action: t('shortcuts.backView', 'Vue arriere'), keys: ['5'] },
        ],
      },
      {
        title: t('shortcuts.fineMovement', 'Deplacement fin'),
        shortcuts: [
          { action: t('shortcuts.left', 'Gauche'), keys: ['\u2190'] },
          { action: t('shortcuts.right', 'Droite'), keys: ['\u2192'] },
          { action: t('shortcuts.forward', 'Avant'), keys: ['\u2191'] },
          { action: t('shortcuts.backward', 'Arriere'), keys: ['\u2193'] },
        ],
      },
    ],
    [t]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path strokeLinecap="round" d="M6 10h1M10 10h1M14 10h1M18 10h1M8 14h8" />
              </svg>
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                {t('designer.shortcuts.title', 'Raccourcis clavier')}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('common.close', 'Fermer')}
            >
              <svg
                className="w-5 h-5 text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 overflow-y-auto max-h-[calc(80vh-4rem)] space-y-5">
            {shortcutCategories.map((category) => (
              <div key={category.title}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  {category.title}
                </h3>
                <div className="grid grid-cols-1 gap-1.5">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.action}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.action}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">+</span>
                            )}
                            <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                              {key}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
