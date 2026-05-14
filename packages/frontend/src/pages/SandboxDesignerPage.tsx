import React, { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { AutoLayoutModal } from '../components/designer/AutoLayoutModal';
import { SandboxOnboardingModal } from '../components/sandbox/SandboxOnboardingModal';
import { SandboxPalette } from '../components/sandbox/SandboxPalette';
import { SandboxWatermark } from '../components/sandbox/SandboxWatermark';
import { SignupPromptModal } from '../components/sandbox/SignupPromptModal';
import { SeoHead } from '../components/seo/SeoHead';
import { Skeleton } from '../components/ui/Skeleton';

const SandboxCanvas = React.lazy(() => import('../components/sandbox/SandboxCanvas'));
import { useSandboxStore, selectHasSandboxProject } from '../sandbox/store';
import { findTemplate } from '../sandbox/templates';
import {
  trackSandbox,
  useSandboxSessionTracking,
} from '../sandbox/useSandboxAnalytics';
import { useSandboxLimits } from '../sandbox/useSandboxLimits';

/**
 * Sandbox designer entry. Two URL forms:
 *   - /designer/sandbox                       → onboarding modal first
 *   - /designer/sandbox/:templateId           → load template, skip modal
 *
 * The actual 3D canvas + side panels are NOT inlined here (the existing
 * `KitchenDesignerPage` is heavy and route-locked to /:projectId). This
 * wrapper sets up:
 *   - sandbox onboarding (template picker)
 *   - watermark overlay
 *   - friction-trigger modal
 *   - 15-minute "save your work" prompt
 *   - session-duration tracking
 *
 * Once the existing designer is refactored to consume `useDesignerStore()`
 * (the abstraction hook), drop the canvas in this `<DesignerCanvas />`
 * placeholder and the integration is done.
 */
export default function SandboxDesignerPage(): React.ReactElement {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();

  const hasProject = useSandboxStore(selectHasSandboxProject);
  const newProject = useSandboxStore((s) => s.newProject);
  const loadFromTemplate = useSandboxStore((s) => s.loadFromTemplate);
  const startSession = useSandboxStore((s) => s.startSession);

  const limits = useSandboxLimits();
  useSandboxSessionTracking();

  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showAutoLayout, setShowAutoLayout] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // ---- Initial load -----------------------------------------------------
  React.useEffect(() => {
    startSession();

    if (templateId) {
      const tpl = findTemplate(templateId);
      if (tpl) {
        loadFromTemplate(tpl);
        trackSandbox({ type: 'sandbox_session_start', props: { template: tpl.id } });
        return;
      }
      // Unknown template → bounce to clean URL
      navigate('/designer/sandbox', { replace: true });
      return;
    }

    if (!hasProject) {
      setShowOnboarding(true);
      trackSandbox({ type: 'sandbox_session_start', props: { template: null } });
    }
  }, [templateId, hasProject, loadFromTemplate, navigate, startSession]);

  // ---- 15-minute "save your work" prompt -------------------------------
  React.useEffect(() => {
    const timer = setTimeout(() => {
      limits.forceTrigger('session_15min');
    }, 15 * 60 * 1000);
    return () => clearTimeout(timer);
    // The friction trigger is one-shot per page mount; if the user
    // dismisses it we don't re-prompt this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SeoHead
        title="Designer 3D — Mode démo"
        description="Concevez votre cuisine en 3D sans créer de compte. 6 templates, catalogue IKEA, sauvegarde locale automatique."
        canonical="https://kitchenxpert.com/designer/sandbox"
        noindex // demo mode shouldn't compete with the real designer in SERP
      />

      <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0f] text-white">
        <Suspense fallback={<Skeleton className="absolute inset-0 rounded-none" />}>
          <SandboxCanvas selectedId={selectedId} onSelect={setSelectedId} />
        </Suspense>
        <SandboxPalette />

        {/* Floating "Auto-Layout IA" trigger — top-right, near the
            watermark but clearly distinct. Premium IP teaser. */}
        <button
          type="button"
          onClick={() => setShowAutoLayout(true)}
          className="absolute right-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/15 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition hover:border-indigo-300/50 hover:shadow-[0_0_30px_rgba(167,139,250,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
        >
          <span aria-hidden>✨</span>
          <span>Auto-Layout IA</span>
        </button>

        <SandboxWatermark />
        {selectedId && <SandboxItemHud itemId={selectedId} onClear={() => setSelectedId(null)} />}
      </div>

      <SandboxOnboardingModal
        open={showOnboarding}
        onPickEmpty={() => {
          newProject('Ma cuisine démo', 'L_SHAPED');
          setShowOnboarding(false);
          trackSandbox({ type: 'sandbox_first_action', props: { action: 'change_layout' } });
        }}
        onPickTemplate={(tpl) => {
          loadFromTemplate(tpl);
          setShowOnboarding(false);
          trackSandbox({ type: 'sandbox_session_start', props: { template: tpl.id } });
        }}
        onImportPlan={() => {
          // TODO: PDF / DXF / image upload pipeline
          setShowOnboarding(false);
        }}
        onSkip={() => setShowOnboarding(false)}
      />

      <SignupPromptModal
        open={limits.signupPrompt.open}
        trigger={limits.signupPrompt.trigger}
        onClose={limits.closeSignupPrompt}
      />

      <AutoLayoutModal
        open={showAutoLayout}
        onClose={() => setShowAutoLayout(false)}
      />
    </>
  );
}

/**
 * Floating HUD shown when an item is selected in the canvas.
 * Lets the user delete or rotate the selection — the full property
 * panel is account-only.
 */
function SandboxItemHud({
  itemId, onClear,
}: { itemId: string; onClear: () => void }): React.ReactElement {
  const item = useSandboxStore((s) =>
    s.project?.kitchen.items.find((i) => i.id === itemId) ?? null,
  );
  const updateItem = useSandboxStore((s) => s.updateItem);
  const removeItem = useSandboxStore((s) => s.removeItem);

  if (!item) {return <></>;}

  const rotate = (): void => {
    updateItem(itemId, { rotation: (item.rotation + 90) % 360 });
  };
  const remove = (): void => {
    removeItem(itemId);
    onClear();
  };

  return (
    <div
      role="toolbar"
      aria-label={`Outils pour ${item.label}`}
      className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-2 py-1.5 backdrop-blur-md"
    >
      <div className="flex items-center gap-1">
        <span className="px-3 text-xs text-white/80">
          {item.label} · <span className="text-white/50">{item.unitPrice}&nbsp;€</span>
        </span>
        <button
          type="button"
          onClick={rotate}
          className="rounded-full px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
        >
          Rotation 90°
        </button>
        <button
          type="button"
          onClick={remove}
          className="rounded-full px-3 py-1 text-xs text-rose-300 transition hover:bg-rose-500/15"
        >
          Supprimer
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Désélectionner"
          className="rounded-full px-2 py-1 text-xs text-white/40 transition hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
