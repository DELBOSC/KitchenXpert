import React from 'react';
import { useTranslation } from 'react-i18next';

import type { TFunction } from 'i18next';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'backordered' | 'discontinued' | 'checking';

export interface StockIndicatorProps {
  status: StockStatus;
  quantity?: number;
  estimatedDelivery?: string;
  onSeeAlternatives?: () => void;
  compact?: boolean; // Smaller version for inline use
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function getStatusConfig(
  status: StockStatus,
  t: TFunction,
  quantity?: number,
): {
  dotColor: string;
  darkDotColor: string;
  label: string;
  textColor: string;
  darkTextColor: string;
} {
  switch (status) {
    case 'in_stock':
      return {
        dotColor: 'bg-emerald-500',
        darkDotColor: 'dark:bg-emerald-400',
        label: t('stock.inStock', 'In stock'),
        textColor: 'text-emerald-700',
        darkTextColor: 'dark:text-emerald-300',
      };
    case 'low_stock':
      return {
        dotColor: 'bg-yellow-500',
        darkDotColor: 'dark:bg-yellow-400',
        label: quantity != null
          ? t('stock.lowStockQty', { count: quantity, defaultValue: 'Low stock ({{count}} left)' })
          : t('stock.lowStock', 'Low stock'),
        textColor: 'text-yellow-700',
        darkTextColor: 'dark:text-yellow-300',
      };
    case 'out_of_stock':
      return {
        dotColor: 'bg-red-500',
        darkDotColor: 'dark:bg-red-400',
        label: t('stock.outOfStock', 'Out of stock'),
        textColor: 'text-red-700',
        darkTextColor: 'dark:text-red-300',
      };
    case 'backordered':
      return {
        dotColor: 'bg-orange-500',
        darkDotColor: 'dark:bg-orange-400',
        label: t('stock.backordered', 'Backordered'),
        textColor: 'text-orange-700',
        darkTextColor: 'dark:text-orange-300',
      };
    case 'discontinued':
      return {
        dotColor: 'bg-gray-500',
        darkDotColor: 'dark:bg-gray-400',
        label: t('stock.discontinued', 'Discontinued'),
        textColor: 'text-gray-700',
        darkTextColor: 'dark:text-gray-300',
      };
    case 'checking':
    default:
      return {
        dotColor: 'bg-gray-400',
        darkDotColor: 'dark:bg-gray-500',
        label: t('stock.checking', 'Checking...'),
        textColor: 'text-gray-500',
        darkTextColor: 'dark:text-gray-400',
      };
  }
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function StockIndicator({
  status,
  quantity,
  estimatedDelivery,
  onSeeAlternatives,
  compact = false,
}: StockIndicatorProps): React.ReactElement {
  const { t } = useTranslation();
  const config = getStatusConfig(status, t, quantity);

  const showAlternativesLink =
    onSeeAlternatives && (status === 'out_of_stock' || status === 'discontinued');

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotColor} ${config.darkDotColor} ${status === 'checking' ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        />
        <span className={`text-[10px] ${config.textColor} ${config.darkTextColor}`}>
          {config.label}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Status line */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dotColor} ${config.darkDotColor} ${status === 'checking' ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        />
        <span
          className={`text-xs font-medium ${config.textColor} ${config.darkTextColor}`}
          role="status"
          aria-live="polite"
        >
          {config.label}
        </span>
      </div>

      {/* Delivery estimate */}
      {estimatedDelivery && status !== 'checking' && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400 ml-4">
          {t('stock.delivery', 'Delivery:')} {estimatedDelivery}
        </p>
      )}

      {/* See alternatives link */}
      {showAlternativesLink && (
        <button
          onClick={onSeeAlternatives}
          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline ml-4 text-left"
        >
          {t('stock.seeAlternatives', 'See alternatives')}
        </button>
      )}
    </div>
  );
}
