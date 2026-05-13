import React from 'react';
import { useTranslation } from 'react-i18next';

import type { LayoutProposal } from '@kitchenxpert/3d-engine';

interface ProposalCardProps {
  proposal: LayoutProposal;
  onApply: (proposal: LayoutProposal) => void;
  isApplying?: boolean;
}

function ScoreBar({ label, value }: { label: string; value: number }): React.ReactElement {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : value >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 w-7 text-right">{value}</span>
    </div>
  );
}

export default function ProposalCard({ proposal, onApply, isApplying }: ProposalCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
      {/* Header with strategy name */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {proposal.name}
          </h3>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {proposal.score.overall}
            <span className="text-[10px] text-gray-400">/100</span>
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          {proposal.description}
        </p>
      </div>

      {/* Scores */}
      <div className="px-4 py-3 space-y-1.5">
        <ScoreBar label={t('designer.gen.ergonomics', 'Ergonomie')} value={proposal.score.ergonomics} />
        <ScoreBar label={t('designer.gen.storage', 'Rangement')} value={proposal.score.storage} />
        <ScoreBar label={t('designer.gen.aesthetics', 'Esthetique')} value={proposal.score.aesthetics} />
        <ScoreBar label={t('designer.gen.space', 'Espace')} value={proposal.score.spaceUtilization} />
      </div>

      {/* Stats */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px]">
        <span className="text-gray-500 dark:text-gray-400">
          {proposal.items.length} {t('designer.gen.elements', 'elements')}
        </span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {proposal.budget} €
        </span>
      </div>

      {/* Apply button */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => onApply(proposal)}
          disabled={isApplying}
          className="w-full py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isApplying ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('designer.gen.applying', 'Application...')}
            </span>
          ) : (
            t('designer.gen.apply', 'Appliquer ce layout')
          )}
        </button>
      </div>
    </div>
  );
}
