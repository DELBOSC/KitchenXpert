import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { KitchenEngine } from '@kitchenxpert/3d-engine';
import type * as THREE from 'three';

interface PricingPanelProps {
  engine: KitchenEngine | null;
  budget?: number;
}

interface PriceItem {
  id: string;
  name: string;
  type: string;
  price: number;
}

interface CategoryTotal {
  label: string;
  total: number;
  count: number;
}

const DEFAULT_PRICES: Record<string, number> = {
  base_cabinet: 250,
  base: 250,
  wall_cabinet: 180,
  tall_cabinet: 450,
  sink: 200,
  sink_base: 300,
  cooktop: 350,
  stove: 500,
  hood: 280,
  range_hood: 280,
  refrigerator: 600,
  fridge: 600,
  dishwasher: 450,
  oven: 400,
  worktop: 150,
};

const CATEGORY_KEY_MAP: Record<string, string> = {
  base_cabinet: 'pricing.baseCabinets',
  base: 'pricing.baseCabinets',
  wall_cabinet: 'pricing.wallCabinets',
  tall_cabinet: 'pricing.tallCabinets',
  sink: 'pricing.sinks',
  sink_base: 'pricing.sinks',
  cooktop: 'pricing.appliances',
  stove: 'pricing.appliances',
  hood: 'pricing.appliances',
  range_hood: 'pricing.appliances',
  refrigerator: 'pricing.appliances',
  fridge: 'pricing.appliances',
  dishwasher: 'pricing.appliances',
  oven: 'pricing.appliances',
  worktop: 'pricing.countertops',
};

function extractPriceItems(engine: KitchenEngine): PriceItem[] {
  const items: PriceItem[] = [];
  engine.scene.getThreeScene().traverse((child: THREE.Object3D) => {
    const ud = child.userData as {
      id?: string;
      type?: string;
      isGenerated?: boolean;
      price?: number;
      name?: string;
    };
    if (!ud.id || ud.type === 'wall' || ud.type === 'floor') {
      return;
    }
    if (ud.isGenerated) {
      return;
    } // Skip auto-generated worktops/plinths

    const type = ud.type || 'unknown';
    const price = ud.price || DEFAULT_PRICES[type] || 0;

    items.push({
      id: ud.id,
      name: ud.name || type,
      type,
      price,
    });
  });
  return items;
}

function groupByCategory(
  items: PriceItem[],
  t: (key: string, defaultValue: string) => string
): CategoryTotal[] {
  const categoryMap = new Map<string, CategoryTotal>();

  for (const item of items) {
    const categoryKey = CATEGORY_KEY_MAP[item.type] || 'pricing.other';
    const categoryLabel = t(categoryKey, categoryKey);
    const existing = categoryMap.get(categoryKey);
    if (existing) {
      existing.total += item.price;
      existing.count += 1;
    } else {
      categoryMap.set(categoryKey, { label: categoryLabel, total: item.price, count: 1 });
    }
  }

  return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
}

export default function PricingPanel({ engine, budget }: PricingPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [items, setItems] = useState<PriceItem[]>([]);
  const [categories, setCategories] = useState<CategoryTotal[]>([]);
  const [total, setTotal] = useState(0);

  const updatePricing = useCallback(() => {
    if (!engine) {
      return;
    }
    const priceItems = extractPriceItems(engine);
    const grouped = groupByCategory(priceItems, t);
    const totalPrice = priceItems.reduce((sum, item) => sum + item.price, 0);
    setItems(priceItems);
    setCategories(grouped);
    setTotal(totalPrice);
  }, [engine, t]);

  useEffect(() => {
    if (!engine) {
      return;
    }

    // Initial calculation
    updatePricing();

    // Update on history changes (item add/remove/etc)
    engine.history.onChangeCallback(() => {
      updatePricing();
    });
  }, [engine, updatePricing]);

  const budgetPercentage = budget && budget > 0 ? Math.min(100, (total / budget) * 100) : null;
  const isOverBudget = budget ? total > budget : false;

  return (
    <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 w-64 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t('designer.pricing.title', 'Prix estimatif')}
          </h2>
        </div>
      </div>

      {/* Total */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="text-center">
          <span
            className={`text-2xl font-bold ${isOverBudget ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}
          >
            {total.toLocaleString('fr-FR')} €
          </span>
          <p className="text-xs text-gray-400 mt-1">
            {items.length} {t('designer.pricing.items', 'element(s)')}
          </p>
        </div>

        {/* Budget bar */}
        {budgetPercentage !== null && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('designer.pricing.budget', 'Budget')}</span>
              <span>{Math.round(budgetPercentage)}%</span>
            </div>
            <div
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(budgetPercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverBudget
                    ? 'bg-red-500'
                    : budgetPercentage > 80
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, budgetPercentage)}%` }}
              />
            </div>
            {isOverBudget && (
              <p className="text-xs text-red-500 mt-1">
                {t('designer.pricing.overBudget', 'Depassement')}: +
                {(total - budget!).toLocaleString('fr-FR')} €
              </p>
            )}
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {t('designer.pricing.breakdown', 'Detail par categorie')}
        </h3>
        {categories.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {t('designer.pricing.empty', 'Ajoutez des elements pour voir les prix.')}
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-gray-50 dark:bg-gray-750"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">({cat.count})</span>
                </div>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {cat.total.toLocaleString('fr-FR')} €
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
