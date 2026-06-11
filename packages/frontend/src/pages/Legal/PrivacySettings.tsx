import React, { useEffect, useState } from 'react';

import LegalLayout from './LegalLayout';

type Summary = {
  account: { id: string; email: string; createdAt: string; status: string; emailVerified: boolean };
  holdings: { kitchens: number; projects: number; orders: number; auditEvents: number };
  retention: Record<string, string>;
};

export default function PrivacySettings(): React.ReactElement {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/v1/me/gdpr/summary', { credentials: 'include', signal: controller.signal });
        if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
        const json = (await res.json()) as { data: Summary };
        setSummary(json.data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {setError((err as Error).message);}
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const handleExport = async (): Promise<void> => {
    setBusy('export');
    try {
      const res = await fetch('/api/v1/me/gdpr/export', { credentials: 'include' });
      if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitchenxpert-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (): Promise<void> => {
    const confirmed = window.confirm(
      'Cette action anonymisera immédiatement votre compte. Les données non soumises à conservation légale seront purgées sous 30 jours. Continuer ?'
    );
    if (!confirmed) {return;}
    setBusy('delete');
    try {
      const res = await fetch('/api/v1/me/gdpr/account', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
      window.location.href = '/';
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <LegalLayout title="Mes données">
      {loading && <p className="text-white/60">Chargement…</p>}
      {error && <p className="text-red-400">Erreur : {error}</p>}

      {summary && (
        <>
          <div className="not-prose rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 text-xs uppercase tracking-widest text-white/55">Compte</div>
            <div className="space-y-1 text-sm">
              <div><span className="text-white/50">Email&nbsp;:</span> {summary.account.email}</div>
              <div><span className="text-white/50">Créé le&nbsp;:</span> {new Date(summary.account.createdAt).toLocaleDateString('fr-FR')}</div>
              <div><span className="text-white/50">Statut&nbsp;:</span> {summary.account.status}</div>
            </div>
          </div>

          <div className="not-prose mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(summary.holdings).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-widest text-white/40">{k}</div>
                <div className="mt-1 text-2xl font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Vos droits</h2>
      <ul>
        <li>
          <strong>Portabilité (Art. 20)</strong> — Téléchargez l&apos;intégralité de vos données au format JSON.
        </li>
        <li>
          <strong>Effacement (Art. 17)</strong> — Anonymisation immédiate et purge complète sous 30 jours.
        </li>
        <li>
          <strong>Rectification (Art. 16)</strong> — Modifiez vos informations depuis votre <a href="/profile">profil</a>.
        </li>
      </ul>

      <div className="not-prose mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleExport}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
        >
          {busy === 'export' ? 'Préparation…' : 'Exporter mes données (JSON)'}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {busy === 'delete' ? 'Suppression…' : 'Supprimer mon compte'}
        </button>
      </div>

      <p className="mt-6 text-xs text-white/40">
        Pour toute autre demande, contactez notre DPO&nbsp;:
        {' '}<a href="mailto:dpo@kitchenxpert.com">dpo@kitchenxpert.com</a>
      </p>
    </LegalLayout>
  );
}
