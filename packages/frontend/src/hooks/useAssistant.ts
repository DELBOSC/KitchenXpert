import { useCallback, useState } from 'react';

import { API_BASE_URL } from '../services/api/endpoints';

/**
 * Client for POST /ai-chat/assistant — the context router (#239).
 *
 * The server picks the tools from the context: no tool ⇒ no fact source ⇒ the
 * assistant cannot cite a product, a SKU or a price. The client therefore never
 * needs to police what it says; it only has to send an honest context.
 *
 * It also never has to GUESS the quota: the server returns how many exchanges are
 * left, so the surface can state the rule once and warn near the end — instead of
 * ambushing the user with a wall (§2: friction at the moment of value, never before).
 */

export type AssistantContext = 'designer' | 'catalog';

/** Sent for the designer context. Prices are re-derived server-side from the DB. */
export interface DesignerPayload {
  /** The saved kitchen (route /designer/:id). The SERVER re-checks ownership. */
  kitchenId?: string;
  layout: string;
  items: Array<{ id: string; sku: string; label?: string }>;
  budgetLimitEur?: number;
}

export interface AssistantColor {
  key: string;
  label: string;
  kind: 'color' | 'material';
  priceFrom: number;
  representativeSku: string;
  imageUrl?: string;
  score: number;
  skuCount: number;
}

export interface AssistantProduct {
  sku: string;
  name: string;
  brand: string | null;
  priceEur: number;
  category: string | null;
}

export interface AssistantToolCall {
  name: string;
  input: unknown;
  output: unknown;
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: AssistantToolCall[];
}

export interface QuotaState {
  remaining: number | null;
  unlimited: boolean;
  resetAt: string;
}

interface AssistantResponse {
  success: boolean;
  data: {
    context: string;
    anchored: boolean;
    toolsAvailable: string[];
    reply: string;
    toolCalls: AssistantToolCall[];
    toolRounds: number;
    quota: QuotaState;
    unverifiedSkus?: string[];
  };
}

/** Raised by the wall — the user has spent their free allowance. */
export interface AssistantLimit {
  code: 'AI_QUOTA_EXCEEDED' | 'AI_DAILY_LIMIT';
  message: string;
  resetAt?: string;
}

interface UseAssistant {
  messages: AssistantMessage[];
  busy: boolean;
  error: string | null;
  /** null until the first exchange — that is when we state the rule. */
  quota: QuotaState | null;
  /** Non-null once the allowance is spent: the surface switches state (no modal). */
  limit: AssistantLimit | null;
  send: (message: string, context: AssistantContext, payload?: unknown) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export function useAssistant(): UseAssistant {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [limit, setLimit] = useState<AssistantLimit | null>(null);

  const send = useCallback(
    async (message: string, context: AssistantContext, payload?: unknown): Promise<void> => {
      const trimmed = message.trim();
      if (!trimmed || busy) {
        return;
      }

      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setBusy(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/ai-chat/assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ message: trimmed, context, ...(payload ? { payload } : {}) }),
        });

        if (res.status === 402 || res.status === 429) {
          const body = (await res.json()) as { error?: AssistantLimit };
          // The wall. The PREVIOUS answer was complete — we never truncate value.
          setLimit({
            code: res.status === 402 ? 'AI_QUOTA_EXCEEDED' : 'AI_DAILY_LIMIT',
            message: body.error?.message ?? '',
            ...(body.error?.resetAt ? { resetAt: body.error.resetAt } : {}),
          });
          // Drop the question we could not answer — leaving it hanging would read
          // as a failure rather than as a limit.
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const body = (await res.json()) as AssistantResponse;
        setQuota(body.data.quota);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: body.data.reply, toolCalls: body.data.toolCalls },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  const clearError = useCallback(() => setError(null), []);
  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setLimit(null);
  }, []);

  return { messages, busy, error, quota, limit, send, clearError, reset };
}

export default useAssistant;
