import React, { useEffect, useState } from 'react';

import { Button, Dialog, Select } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';

import type { ImportTarget } from './ProviderCatalog';

interface KitchenSummary {
  id: string;
  name: string;
  projectName?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  target: ImportTarget;
}

/**
 * Modal that lets the user pick one of their existing kitchens and drops
 * the catalogue item into it as a new KitchenItem.
 *
 * For IKEA live items the target carries an `itemCode` instead of a database
 * id; the backend looks up the live IKEA API, upserts a `Product` row, and
 * then performs the standard import.
 */
export default function ImportToDesignDialog({ open, onClose, target }: Props): React.ReactElement {
  const toast = useToast();
  const [kitchens, setKitchens] = useState<KitchenSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kitchenId, setKitchenId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {return;}
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/v1/kitchens?limit=100', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
        const json = await res.json();
        const list: KitchenSummary[] = (json.data?.data ?? json.data ?? []).map((k: { id: string; name: string; project?: { name: string } }) => ({
          id: k.id, name: k.name, projectName: k.project?.name,
        }));
        setKitchens(list);
        if (list[0]) {setKitchenId(list[0].id);}
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {setError((err as Error).message);}
      }
    })();
    return () => controller.abort();
  }, [open]);

  const onSubmit = async (): Promise<void> => {
    if (!kitchenId) {return;}
    setSubmitting(true);
    try {
      const body =
        target.source === 'ikea'
          ? { source: 'ikea', itemCode: target.itemCode, kitchenId, quantity }
          : { source: target.source, sourceId: target.id, kitchenId, quantity };

      const res = await fetch('/api/v1/providers/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error?.message ?? `HTTP ${res.status}`);
      }
      toast.success(`${target.name} ajouté à votre cuisine`);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ajouter à un design"
      description={
        target.source === 'ikea'
          ? `${target.name} sera récupéré depuis IKEA et ajouté à votre cuisine.`
          : `${target.name} sera ajouté comme nouvel élément.`
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={onSubmit} disabled={!kitchenId || submitting} loading={submitting}>
            Ajouter
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}

      {!kitchens && !error && <p className="text-sm text-white/60">Chargement de vos cuisines…</p>}

      {kitchens && kitchens.length === 0 && (
        <p className="text-sm text-white/70">
          Vous n'avez encore aucune cuisine. Créez-en une depuis vos projets, puis revenez ici.
        </p>
      )}

      {kitchens && kitchens.length > 0 && (
        <div className="space-y-4">
          <Select
            label="Cuisine de destination"
            value={kitchenId}
            onChange={(e) => setKitchenId(e.target.value)}
          >
            {kitchens.map((k) => (
              <option key={k.id} value={k.id}>
                {k.projectName ? `${k.projectName} — ` : ''}{k.name}
              </option>
            ))}
          </Select>
          <Select
            label="Quantité"
            value={String(quantity)}
            onChange={(e) => setQuantity(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </Select>
        </div>
      )}
    </Dialog>
  );
}
