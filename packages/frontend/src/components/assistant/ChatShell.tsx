import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Presentational chat shell — the ONE surface, worn by both assistant modes.
 *
 * Extracted from ChatPanel (which now consumes it) so that "Concevoir" (layout,
 * /ai-chat/stream) and "Choisir & acheter" (/ai-chat/assistant) are visibly the
 * SAME assistant showing two faces — not two features that happen to look alike
 * (§4: extend, never duplicate).
 *
 * It owns the chrome (header, scrolling log, input bar) and nothing else. Every
 * mode-specific thing arrives through a slot: the mode switch (`headerSlot`), the
 * per-message extras (tool cards, colour swatches), the footer (quota / wall) and
 * the input adornments (voice).
 */

export interface ChatShellMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatShellProps {
  title: string;
  icon?: React.ReactNode;
  /** Injected from above (the mode switch) — keeps ONE header, not two bars. */
  headerSlot?: React.ReactNode;
  headerActions?: React.ReactNode;

  messages: ChatShellMessage[];
  /** Tool cards, colour swatches… rendered under the matching message. */
  renderMessageExtra?: (message: ChatShellMessage, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;

  busy?: boolean;
  busyLabel?: string;
  error?: string | null;
  onDismissError?: () => void;

  /** Quota line, or the wall. Never a modal — §8.1 forbids blocking the canvas. */
  footer?: React.ReactNode;

  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  inputDisabled?: boolean;
  inputPlaceholder?: string;
  inputActions?: React.ReactNode;
}

export default function ChatShell({
  title,
  icon,
  headerSlot,
  headerActions,
  messages,
  renderMessageExtra,
  emptyState,
  busy = false,
  busyLabel,
  error,
  onDismissError,
  footer,
  value,
  onChange,
  onSend,
  onStop,
  inputDisabled = false,
  inputPlaceholder,
  inputActions,
}: ChatShellProps): React.ReactElement {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div
      className="flex h-full flex-col bg-white dark:bg-gray-800"
      role="complementary"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <h2 className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h2>
          {busy && (
            <span className="flex items-center gap-1 text-xs text-kx-brand-strong dark:text-kx-brand-from">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-kx-brand-from opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-kx-brand-from" />
              </span>
              {busyLabel ?? t('designer.chat.thinking', 'Réflexion…')}
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">{headerActions}</div>
      </div>

      {/* Mode switch (or any above-the-log chrome) */}
      {headerSlot && (
        <div className="flex-shrink-0 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
          {headerSlot}
        </div>
      )}

      {/* Log */}
      <div
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
        aria-label={t('designer.chat.messages', 'Messages')}
      >
        {messages.length === 0
          ? emptyState
          : messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[85%]">
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-kx-brand-strong text-white dark:bg-kx-brand-from dark:text-gray-900'
                        : 'rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {msg.content ||
                      (busy && idx === messages.length - 1 ? (
                        <span className="flex gap-1" aria-label={busyLabel}>
                          {[0, 150, 300].map((d) => (
                            <span
                              key={d}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 motion-reduce:animate-none"
                              style={{ animationDelay: `${d}ms` }}
                            />
                          ))}
                        </span>
                      ) : null)}
                  </div>
                  {renderMessageExtra?.(msg, idx)}
                </div>
              </div>
            ))}
        <div ref={endRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-shrink-0 items-center justify-between border-t border-rose-200 bg-rose-50 px-4 py-2 dark:border-rose-800 dark:bg-rose-900/20">
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              className="ml-2 flex-shrink-0 text-rose-500 hover:text-rose-700"
              aria-label={t('common.close', 'Fermer')}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Footer slot — quota line, or the wall. A state change, never a modal. */}
      {footer}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder ?? t('designer.chat.inputPlaceholder', 'Écrivez…')}
            disabled={inputDisabled}
            rows={1}
            className="kx-focus flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            aria-label={inputPlaceholder ?? t('designer.chat.inputPlaceholder', 'Écrivez…')}
          />
          {inputActions}
          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className="kx-focus flex-shrink-0 rounded-xl bg-rose-500 p-2 text-white transition-colors hover:bg-rose-600"
              aria-label={t('designer.chat.stop', 'Arrêter')}
              title={t('designer.chat.stop', 'Arrêter')}
            >
              <span className="block h-5 w-5 rounded-sm bg-white" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() || inputDisabled}
              className="kx-focus flex-shrink-0 rounded-xl bg-kx-brand-strong p-2 text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-kx-brand-from dark:text-gray-900"
              aria-label={t('designer.chat.send', 'Envoyer')}
              title={t('designer.chat.send', 'Envoyer')}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
