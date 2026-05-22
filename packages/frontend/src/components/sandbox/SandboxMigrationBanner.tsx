import React from 'react';
import { useNavigate } from 'react-router-dom';

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

  if (!snapshot || dismissed) {return null;}

  const itemCount = snapshot.kitchen.items.length;
  const updated = new Date(snapshot.updatedAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long',
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
      setError(e instanceof Error ? e.message : 'Échec de l\'import. Réessayez.');
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
    <div
      role="region"
      aria-label="Projet en mode démo détecté"
      className="mb-6 rounded-xl border border-indigo-400/20 bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-transparent p-4 backdrop-blur-sm"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium text-white">
            Un projet démo en cours sur ce navigateur
          </div>
          <div className="mt-1 text-xs text-white/60">
            « {snapshot.name} » · {itemCount} meuble{itemCount > 1 ? 's' : ''} · modifié le {updated}
          </div>
          {error && (
            <div className="mt-2 text-xs text-rose-300" role="alert">{error}</div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
          >
            {busy ? 'Import…' : 'Importer dans mon compte'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
          >
            Ignorer
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg px-3 py-1.5 text-xs text-white/50 transition hover:text-rose-300"
          >
            Supprimer la démo
          </button>
        </div>
      </div>
    </div>
  );
}

export default SandboxMigrationBanner;
