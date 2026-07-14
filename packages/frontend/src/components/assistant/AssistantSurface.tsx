import React, { useCallback, useMemo, useRef, useState } from 'react';


import AssistantPanel from './AssistantPanel';
import ChatPanel from '../designer/ChatPanel';

import type { DesignerPayload } from '../../hooks/useAssistant';
import type { KitchenEngine } from '@kitchenxpert/3d-engine';
import type * as THREE from 'three';

/**
 * ONE assistant, two faces (Decision 2).
 *
 * "Concevoir" (layout, /ai-chat/stream) and "Choisir & acheter" (/ai-chat/assistant)
 * live in the SAME surface, under the same header, switched by an explicit control.
 *
 * The mode is not a compromise between merging and coexisting — it IS the product's
 * thesis rendered in UI: the assistant says what it can do instead of pretending to
 * do everything. A single omniscient box would trade a visible friction for an
 * invisible unpredictability: the user could no longer guess what to ask.
 *
 * The mode is PRESELECTED by the scene (an object is selected → you are looking at a
 * piece → "Choisir & acheter"; nothing selected → you are arranging → "Concevoir"),
 * and never re-forced once the user has chosen for themselves.
 */

type Mode = 'design' | 'shop';

/** Scene → the payload the server will RE-VERIFY (prices come from the DB, not us). */
function buildDesignerPayload(
  engine: KitchenEngine | null,
  layout: string,
  kitchenId?: string
): DesignerPayload {
  const items: DesignerPayload['items'] = [];

  if (engine) {
    engine.scene.getThreeScene().traverse((child: THREE.Object3D) => {
      const ud = child.userData as { id?: string; sku?: string; name?: string };
      // Only real catalog items can be talked about — an item with no SKU has no
      // colours and no price to fetch. Sending it would only invite a question the
      // assistant cannot answer.
      if (ud.id && ud.sku) {
        items.push({ id: ud.id, sku: ud.sku, ...(ud.name ? { label: ud.name } : {}) });
      }
    });
  }

  return { ...(kitchenId ? { kitchenId } : {}), layout, items };
}

interface ModeSwitchProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

function ModeSwitch({ mode, onChange }: ModeSwitchProps): React.ReactElement {
  const base =
    'kx-focus flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none';
  const on = 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white';
  const off = 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200';

  return (
    <div
      className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-700/60"
      role="group"
      aria-label="Mode de l'assistant"
    >
      <button
        type="button"
        aria-pressed={mode === 'design'}
        onClick={() => onChange('design')}
        className={`${base} ${mode === 'design' ? on : off}`}
      >
        Concevoir
      </button>
      <button
        type="button"
        aria-pressed={mode === 'shop'}
        onClick={() => onChange('shop')}
        className={`${base} ${mode === 'shop' ? on : off}`}
      >
        Choisir &amp; acheter
      </button>
    </div>
  );
}

interface AssistantSurfaceProps {
  engine: KitchenEngine | null;
  /**
   * The saved kitchen (route /designer/:id). Sent so get_quote has something to
   * quote — the SERVER re-checks it belongs to the caller, so a forged one is
   * simply dropped. Absent in the sandbox: no saved kitchen, no quote.
   */
  kitchenId?: string;
  selectedObject: THREE.Object3D | null;
  /** The kitchen's real layout — never invented. */
  layout: string;
  onClose?: () => void;
  onToolAction?: (toolName: string, toolInput: Record<string, unknown>) => void;
  onUpgrade?: () => void;
}

export default function AssistantSurface({
  engine,
  selectedObject,
  layout,
  kitchenId,
  onClose,
  onToolAction,
  onUpgrade,
}: AssistantSurfaceProps): React.ReactElement {
  // Preselected by the scene, then owned by the user: once they pick a mode, we
  // never take it back from them.
  const userPicked = useRef(false);
  const [picked, setPicked] = useState<Mode | null>(null);

  const mode: Mode = picked ?? (selectedObject ? 'shop' : 'design');

  const handleMode = useCallback((next: Mode) => {
    userPicked.current = true;
    setPicked(next);
  }, []);

  const upperLayout = useMemo(() => (layout || 'open_plan').toUpperCase(), [layout]);
  const payload = useCallback(
    () => buildDesignerPayload(engine, upperLayout, kitchenId),
    [engine, upperLayout, kitchenId]
  );

  const switchEl = <ModeSwitch mode={mode} onChange={handleMode} />;

  if (mode === 'shop') {
    return (
      <AssistantPanel
        context="designer"
        buildPayload={payload}
        title="Assistant"
        emptyHint="Je vois ta cuisine. Je ne parle que de couleurs et de prix réels."
        suggestions={[
          'Quelles couleurs existent pour ce meuble ?',
          'Où en est mon budget ?',
          'Quelque chose de plus chaleureux ?',
        ]}
        headerSlot={switchEl}
        headerActions={
          onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="kx-focus rounded p-1.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Fermer"
              title="Fermer"
            >
              ×
            </button>
          ) : null
        }
        {...(onUpgrade ? { onUpgrade } : {})}
      />
    );
  }

  return (
    <ChatPanel
      engine={engine}
      title="Assistant"
      headerSlot={switchEl}
      {...(onClose ? { onClose } : {})}
      {...(onToolAction ? { onToolAction } : {})}
    />
  );
}
