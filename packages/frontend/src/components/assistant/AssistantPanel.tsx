import { Lock, ShoppingBag, Sparkles } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import ChatShell, { type ChatShellMessage } from './ChatShell';
import { useAssistant } from '../../hooks/useAssistant';
import { CATALOG_COLOR_PALETTE } from '../designer/catalog-color-palette';
import { Button } from '../ui/Button';

import type {
  AssistantColor,
  AssistantContext,
  AssistantProduct,
  AssistantToolCall,
} from '../../hooks/useAssistant';

/**
 * The "Choisir & acheter" face of the assistant — /ai-chat/assistant (#239).
 *
 * Everything it shows comes from a tool: colours from resolve_colors, products
 * from searchCatalog. It renders those results as first-class UI (swatches, price
 * rows) rather than as text, because the point of this assistant is that its facts
 * are REAL — showing them as data is showing the proof.
 *
 * Free plan: the rule is stated ONCE (never a permanent counter — it would gamify a
 * conversation), a warning appears near the end, and the wall is a STATE CHANGE in
 * this panel, never a modal over the 3D canvas (§8.1). The last free answer is
 * never truncated: value first, door after (§2).
 */

const euro = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const hexOf = (key: string): string =>
  (CATALOG_COLOR_PALETTE as Record<string, { hex: string }>)[key]?.hex ?? '#8A8D91';

/** Below this, we tell the user where they stand. Above it, we stay quiet. */
const LOW_ALLOWANCE = 2;

function ColorResults({ colors }: { colors: AssistantColor[] }): React.ReactElement | null {
  if (colors.length === 0) {
    return null;
  }
  return (
    <ul className="mt-2 space-y-1.5" aria-label="Couleurs disponibles">
      {colors.map((c) => (
        <li
          key={c.key}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700/60"
        >
          <span
            aria-hidden
            className="h-5 w-5 flex-shrink-0 rounded-md shadow-sm ring-1 ring-inset ring-black/10 dark:ring-white/10"
            style={{ backgroundColor: hexOf(c.key) }}
          />
          <span className="min-w-0 flex-1 truncate text-xs text-gray-800 dark:text-gray-200">
            {c.label}
          </span>
          <span className="flex-shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
            {euro(c.priceFrom)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ProductResults({ products }: { products: AssistantProduct[] }): React.ReactElement | null {
  if (products.length === 0) {
    return null;
  }
  return (
    <ul className="mt-2 space-y-1.5" aria-label="Produits du catalogue">
      {products.map((p) => (
        <li
          key={p.sku}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-600 dark:bg-gray-700/60"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-xs font-medium text-gray-800 dark:text-gray-200">
              {p.name}
            </span>
            <span className="flex-shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-100">
              {euro(p.priceEur)}
            </span>
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-gray-500 dark:text-gray-400">
            {p.sku}
            {p.brand ? ` · ${p.brand}` : ''}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Render what the tools actually returned — the proof, not a paraphrase. */
function ToolResults({ toolCalls }: { toolCalls: AssistantToolCall[] }): React.ReactElement | null {
  const blocks: React.ReactNode[] = [];

  toolCalls.forEach((call, i) => {
    const out = call.output as Record<string, unknown> | null;
    if (!out) {
      return;
    }
    if (call.name === 'resolve_colors' && Array.isArray(out.colors)) {
      blocks.push(<ColorResults key={`c-${i}`} colors={out.colors as AssistantColor[]} />);
    }
    if (call.name === 'searchCatalog' && Array.isArray(out.results)) {
      blocks.push(<ProductResults key={`p-${i}`} products={out.results as AssistantProduct[]} />);
    }
  });

  return blocks.length > 0 ? <>{blocks}</> : null;
}

interface AssistantPanelProps {
  context: AssistantContext;
  /** Built by the mount point (scene items for the designer). */
  buildPayload?: () => unknown;
  title: string;
  suggestions: string[];
  emptyHint: string;
  headerSlot?: React.ReactNode;
  headerActions?: React.ReactNode;
  onUpgrade?: () => void;
}

export default function AssistantPanel({
  context,
  buildPayload,
  title,
  suggestions,
  emptyHint,
  headerSlot,
  headerActions,
  onUpgrade,
}: AssistantPanelProps): React.ReactElement {
  const { messages, busy, error, quota, limit, send, clearError } = useAssistant();
  const [input, setInput] = useState('');

  const submit = useCallback(
    (text: string) => {
      if (limit) {
        return;
      }
      void send(text, context, buildPayload?.());
      setInput('');
    },
    [send, context, buildPayload, limit]
  );

  const shellMessages: ChatShellMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // The rule of the game, stated ONCE (first exchange) — then silence, then a
  // warning near the end. Never a permanent counter.
  let footer: React.ReactNode = null;
  if (limit) {
    footer = (
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/40">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
              Tu as utilisé tes échanges du mois.
            </p>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              Avec Pro, l&apos;assistant reste ouvert.
            </p>
            {onUpgrade && (
              <Button variant="primary" size="sm" className="mt-2" onClick={onUpgrade}>
                Découvrir Pro
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  } else if (quota && !quota.unlimited && quota.remaining !== null) {
    if (messages.length <= 2) {
      // First exchange: announce the rule. A known rule, not an ambush.
      footer = (
        <p className="flex-shrink-0 border-t border-gray-200 px-4 py-2 text-[11px] text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Plan Gratuit : {quota.remaining} échanges restants ce mois-ci. Avec Pro,
          l&apos;assistant reste ouvert.
        </p>
      );
    } else if (quota.remaining <= LOW_ALLOWANCE) {
      footer = (
        <p className="flex-shrink-0 border-t border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          Il te reste {quota.remaining} échange{quota.remaining > 1 ? 's' : ''} ce mois-ci.
        </p>
      );
    }
  }

  const emptyState = (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-6">
      <div className="text-center">
        <ShoppingBag
          className="mx-auto mb-2 h-9 w-9 text-gray-300 dark:text-gray-600"
          aria-hidden
        />
        <p className="px-2 text-sm text-gray-500 dark:text-gray-400">{emptyHint}</p>
      </div>
      <div className="flex max-w-xs flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => submit(s)}
            disabled={busy || !!limit}
            className="kx-focus rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <ChatShell
      title={title}
      icon={<Sparkles className="h-5 w-5 text-kx-brand-strong dark:text-kx-brand-from" aria-hidden />}
      headerSlot={headerSlot}
      headerActions={headerActions}
      messages={shellMessages}
      renderMessageExtra={(_m, idx) => {
        const source = messages[idx];
        return source?.role === 'assistant' && source.toolCalls?.length ? (
          <ToolResults toolCalls={source.toolCalls} />
        ) : null;
      }}
      emptyState={emptyState}
      busy={busy}
      busyLabel="Recherche…"
      error={error}
      onDismissError={clearError}
      footer={footer}
      value={input}
      onChange={setInput}
      onSend={() => submit(input)}
      inputDisabled={busy || !!limit}
      inputPlaceholder={
        limit ? 'Passe à Pro pour continuer' : 'Une couleur, un produit, un prix…'
      }
    />
  );
}
