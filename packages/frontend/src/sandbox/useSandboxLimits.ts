/**
 * useSandboxLimits — friction-trigger orchestrator.
 *
 * Encapsulates the "did the user hit the wall?" logic so designer
 * components don't have to know which limit applies. Returns:
 *
 *   - `tryConsumeAi()`     — returns false + opens signup modal if quota exhausted
 *   - `tryExportPdfClean()` — returns false + opens signup modal (always)
 *   - `tryUseQuoteCompare()` — returns false + opens signup modal (always)
 *   - `signupPrompt`         — current state of the signup modal
 *
 * Components consume these returns as gates:
 *
 *   const limits = useSandboxLimits();
 *   const onExport = () => limits.tryExportPdfClean() && download();
 */
import { useState, useCallback } from 'react';

import { useSandboxStore } from './store';
import { trackSandbox } from './useSandboxAnalytics';

export type FrictionTrigger =
  | 'pdf_export'
  | 'ai_use'
  | 'quote_compare'
  | 'pathtracer'
  | 'session_15min';

export interface SandboxLimits {
  aiUsesRemaining: number;
  signupPrompt: { open: boolean; trigger: FrictionTrigger | null };
  closeSignupPrompt: () => void;

  tryConsumeAi: () => boolean;
  tryExportPdfClean: () => boolean;
  tryUseQuoteCompare: () => boolean;
  tryUsePathtracerHQ: () => boolean;

  /** Manual trigger — used by the 15-minute timer in SandboxDesignerPage. */
  forceTrigger: (trigger: FrictionTrigger) => void;
}

export function useSandboxLimits(): SandboxLimits {
  const consumeAi = useSandboxStore((s) => s.consumeAiUse);
  const aiUsesRemaining = useSandboxStore((s) => s.limits.aiUsesRemaining);

  const [signupPrompt, setSignupPrompt] = useState<{
    open: boolean;
    trigger: FrictionTrigger | null;
  }>({
    open: false,
    trigger: null,
  });

  const openPrompt = useCallback((trigger: FrictionTrigger) => {
    trackSandbox({ type: 'sandbox_friction_hit', props: { trigger } });
    setSignupPrompt({ open: true, trigger });
  }, []);

  const closeSignupPrompt = useCallback(() => {
    setSignupPrompt({ open: false, trigger: null });
  }, []);

  const tryConsumeAi = useCallback((): boolean => {
    if (consumeAi()) {
      return true;
    }
    openPrompt('ai_use');
    return false;
  }, [consumeAi, openPrompt]);

  // PDF export: always gated (preview is watermarked, the clean
  // version requires an account no matter what).
  const tryExportPdfClean = useCallback((): boolean => {
    openPrompt('pdf_export');
    return false;
  }, [openPrompt]);

  // Quote comparator: always gated (sandbox shows estimative, comparator is account-only).
  const tryUseQuoteCompare = useCallback((): boolean => {
    openPrompt('quote_compare');
    return false;
  }, [openPrompt]);

  // High-resolution path-tracer: always gated.
  const tryUsePathtracerHQ = useCallback((): boolean => {
    openPrompt('pathtracer');
    return false;
  }, [openPrompt]);

  const forceTrigger = useCallback(
    (trigger: FrictionTrigger) => {
      openPrompt(trigger);
    },
    [openPrompt]
  );

  return {
    aiUsesRemaining,
    signupPrompt,
    closeSignupPrompt,
    tryConsumeAi,
    tryExportPdfClean,
    tryUseQuoteCompare,
    tryUsePathtracerHQ,
    forceTrigger,
  };
}
