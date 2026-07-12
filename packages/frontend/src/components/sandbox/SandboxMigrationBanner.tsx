import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { tagConversion } from '../../hooks/useABVariant';
import { migrateSandboxToAccount } from '../../sandbox/migrateSandbox';
import { clearPersistedSandbox, readPersistedSandbox } from '../../sandbox/store';
import { trackSandbox } from '../../sandbox/useSandboxAnalytics';

/**
 * Banner shown to a freshly authenticated user who left a sandbox
 * project behind. Three actions:
 *
 *   - Importer  → POSTs to /projects/import-sandbox, redirects to the
 *                 freshly-created project, clears localStorage.
 *   - Ignorer   → keeps the sandbox in localStorage for now (re-shown
 *                 on next dashboard visit until imported or deleted).
 *   - Supprimer → wipes localStorage + dismisses the banner.
 *
 * Mount it once at the top of the dashboard. Renders nothing if no
 * sandbox project is detected.
 */
export function SandboxMigrationBanner(): React.ReactElement | null {
  const navigate = useNavigate();
  const [snapshot] = React.useState(() => readPersistedSandbox());
  const [busy, setBusy] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!snapshot || dismissed) {
    return null;
  }

  const itemCount = snapshot.kitchen.items.length;
  const updated = new Date(snapshot.updatedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });

  const handleImport = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const projectId = await migrateSandboxToAccount(snapshot);
      clearPersistedSandbox();
      trackSandbox({ type: 'sandbox_signup_completed', props: { imported: 'yes' } });
      tagConversion('hero', 'sandbox_signup_completed_ab');
      navigate(`/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'import. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (): void => {
    clearPersistedSandbox();
    trackSandbox({ type: 'sandbox_signup_completed', props: { imported: 'no' } });
    tagConversion('hero', 'sandbox_signup_completed_ab');
    setDismissed(true);
  };

  return (
    // twMerge (#235) lets the call-site className override Card's baked look:
    // rounded-2xl→rounded-xl, border-white/10→indigo-400/20, and bg-transparent
    // strips Card's bg-white/[0.03] so only the aurora gradient paints (else the
    // 3% white bg-color would tint the gradient's transparent end). Pixel-identical
    // to the previous hand-rolled <div> — proven by the before/after screenshot.
    <Card
      role="region"
      aria-label="Projet en mode démo détecté"
      className="mb-6 rounded-xl border-indigo-400/20 bg-transparent bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-transparent p-4 backdrop-blur-sm"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-white">
            Un projet démo en cours sur ce navigateur
          </div>
          <div className="mt-1 text-xs text-white/60">
            « {snapshot.name} » · {itemCount} meuble{itemCount > 1 ? 's' : ''} · modifié le{' '}
            {updated}
          </div>
          {error && (
            <div className="mt-2 text-xs text-rose-300" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Button primitives; className overrides the pill look (rounded-full/halo/h-8)
              back to the banner's original flat rounded-lg — enabled by twMerge (#235). */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleImport}
            disabled={busy}
            className="h-auto rounded-lg py-1.5 shadow-none"
          >
            {busy ? 'Import…' : 'Importer dans mon compte'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-auto rounded-lg bg-white/5 py-1.5 text-white/80 hover:bg-white/10"
          >
            Ignorer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-auto rounded-lg py-1.5 text-white/50 hover:bg-transparent hover:text-rose-300"
          >
            Supprimer la démo
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default SandboxMigrationBanner;
