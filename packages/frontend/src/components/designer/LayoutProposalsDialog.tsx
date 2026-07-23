import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { applyProposalToScene } from './apply-proposal';
import { generateLayoutProposals } from './layout-proposals';
import ProposalCard from './ProposalCard';
import { Dialog } from '../ui/Dialog';
import { useToast } from '../ui/Toast';

import type { KitchenEngine, LayoutProposal } from '@kitchenxpert/3d-engine';

interface LayoutProposalsDialogProps {
  engine: KitchenEngine | null;
  open: boolean;
  onClose: () => void;
  /** Called after a proposal is applied to the scene (e.g. to mark the design dirty). */
  onApplied?: () => void;
}

/**
 * The "3 implantations idéales" surface. On open it runs the DETERMINISTIC LayoutGenerator
 * off the room's wall dimensions (no LLM) and shows the top 3 principled proposals; applying
 * one replaces the scene furniture in a single undoable batch.
 */
export default function LayoutProposalsDialog({
  engine,
  open,
  onClose,
  onApplied,
}: LayoutProposalsDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const toast = useToast();
  const [proposals, setProposals] = useState<LayoutProposal[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !engine) {
      return;
    }
    try {
      setProposals(generateLayoutProposals(engine).slice(0, 3));
    } catch {
      setProposals([]);
    }
  }, [open, engine]);

  const handleApply = (proposal: LayoutProposal): void => {
    if (!engine) {
      return;
    }
    setApplyingId(proposal.id);
    try {
      const res = applyProposalToScene(engine, proposal);
      toast.success(
        t('designer.gen.applied', {
          defaultValue: 'Implantation « {{name}} » appliquée ({{count}} éléments)',
          name: proposal.name,
          count: res.added,
        })
      );
      onApplied?.();
      onClose();
    } catch {
      toast.error(t('designer.gen.applyError', "Impossible d'appliquer cette implantation"));
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={t('designer.gen.title', '3 implantations idéales')}
      description={t(
        'designer.gen.subtitle',
        "Générées depuis les dimensions de tes murs, en respectant les principes d'ergonomie (triangle d'activité, dégagements)."
      )}
    >
      {proposals.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/60">
          {t(
            'designer.gen.empty',
            'Aucune implantation générée — vérifie que les dimensions de la pièce sont renseignées.'
          )}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {proposals.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              isApplying={applyingId === p.id}
              onApply={handleApply}
            />
          ))}
        </div>
      )}
    </Dialog>
  );
}
