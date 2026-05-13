import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';


import { ModelLoader, mmToM } from '@kitchenxpert/3d-engine';

import { api } from '../../services/api/api';
import { API_ENDPOINTS } from '../../services/api/endpoints';

import type { BrandProfile } from '@kitchenxpert/3d-engine';
import type * as THREE from 'three';

interface CatalogPanelProps {
  addObject: (id: string, obj: THREE.Object3D) => void;
  brandProfile: BrandProfile;
}

interface CatalogItem {
  id: string;
  type: string;
  name: string;
  width: number;   // mm
  height: number;   // mm
  depth: number;    // mm
  color: number;
  category: CatalogCategory;
  price: number;
}

type CatalogCategory =
  | 'base_cabinets'
  | 'wall_cabinets'
  | 'tall_cabinets'
  | 'appliances'
  | 'worktops'
  | 'sinks';

const CATEGORY_CONFIG: Record<CatalogCategory, { labelKey: string; defaultLabel: string; icon: React.ReactNode }> = {
  base_cabinets: {
    labelKey: 'designer.catalog.base_cabinets',
    defaultLabel: 'Meubles bas',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="10" width="18" height="10" rx="1" />
        <line x1="12" y1="10" x2="12" y2="20" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  wall_cabinets: {
    labelKey: 'designer.catalog.wall_cabinets',
    defaultLabel: 'Meubles hauts',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="10" rx="1" />
        <line x1="12" y1="3" x2="12" y2="13" />
      </svg>
    ),
  },
  tall_cabinets: {
    labelKey: 'designer.catalog.tall_cabinets',
    defaultLabel: 'Colonnes',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="6" y="2" width="12" height="20" rx="1" />
        <line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    ),
  },
  appliances: {
    labelKey: 'designer.catalog.appliances',
    defaultLabel: 'Electromenager',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="8" r="3" />
        <line x1="8" y1="16" x2="16" y2="16" />
      </svg>
    ),
  },
  worktops: {
    labelKey: 'designer.catalog.worktops',
    defaultLabel: 'Plans de travail',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="10" width="20" height="4" rx="1" />
      </svg>
    ),
  },
  sinks: {
    labelKey: 'designer.catalog.sinks',
    defaultLabel: 'Eviers',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M4 14h16v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4z" />
        <path d="M12 4v6" />
        <path d="M12 10c-2 0-4 2-4 4" />
        <path d="M12 10c2 0 4 2 4 4" />
      </svg>
    ),
  },
};

const CATEGORIES: CatalogCategory[] = [
  'base_cabinets',
  'wall_cabinets',
  'tall_cabinets',
  'appliances',
  'worktops',
  'sinks',
];

function mapCategory(cat: string): CatalogCategory {
  const mapping: Record<string, CatalogCategory> = {
    base: 'base_cabinets',
    base_cabinet: 'base_cabinets',
    wall: 'wall_cabinets',
    wall_cabinet: 'wall_cabinets',
    tall: 'tall_cabinets',
    tall_cabinet: 'tall_cabinets',
    appliance: 'appliances',
    refrigerator: 'appliances',
    dishwasher: 'appliances',
    cooktop: 'appliances',
    oven: 'appliances',
    hood: 'appliances',
    worktop: 'worktops',
    sink: 'sinks',
  };
  return mapping[cat] || 'base_cabinets';
}

export default function CatalogPanel({ addObject, brandProfile }: CatalogPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState<CatalogCategory | null>('base_cabinets');
  const [searchQuery, setSearchQuery] = useState('');
  const modelLoaderRef = useRef<ModelLoader>(new ModelLoader());

  const localCatalogItems = useMemo<CatalogItem[]>(() => {
    const items: CatalogItem[] = [];

    // --- Base cabinets ---
    for (const w of brandProfile.base.availableWidths) {
      items.push({
        id: `base-${w}`,
        type: 'base_cabinet',
        name: t('designer.catalog.baseCabinetName', { width: w, defaultValue: `Meuble bas ${w} mm` }),
        width: w,
        height: brandProfile.base.totalHeight,
        depth: brandProfile.base.defaultDepth,
        color: 0xD4A574,
        category: 'base_cabinets',
        price: Math.round(150 + w * 0.3),
      });
    }

    // --- Wall cabinets ---
    const availableBaseWidths = new Set(brandProfile.base.availableWidths);
    const commonWallWidths = [300, 400, 600, 800];

    for (const h of brandProfile.wall.availableHeights) {
      const isDefaultHeight = h === brandProfile.wall.defaultHeight;
      const widthsForThisHeight = isDefaultHeight
        ? brandProfile.base.availableWidths
        : [300, 600].filter((w) => availableBaseWidths.has(w));

      for (const w of widthsForThisHeight) {
        // For non-default heights, only use the common wall widths that exist in available widths
        if (!isDefaultHeight && !commonWallWidths.includes(w)) {continue;}

        items.push({
          id: `wall-${w}-${h}`,
          type: 'wall_cabinet',
          name: t('designer.catalog.wallCabinetName', { width: w, height: h, defaultValue: `Meuble haut ${w}x${h} mm` }),
          width: w,
          height: h,
          depth: brandProfile.wall.defaultDepth,
          color: 0xD4A574,
          category: 'wall_cabinets',
          price: Math.round(120 + w * 0.2 + h * 0.1),
        });
      }
    }

    // --- Tall cabinets ---
    for (const h of brandProfile.tall.availableHeights) {
      items.push({
        id: `tall-600-${h}`,
        type: 'tall_cabinet',
        name: t('designer.catalog.tallCabinetName', { height: h, defaultValue: `Colonne ${h} mm` }),
        width: 600,
        height: h,
        depth: brandProfile.tall.defaultDepth,
        color: 0xD4A574,
        category: 'tall_cabinets',
        price: Math.round(300 + h * 0.15),
      });
    }

    // --- Appliances (fixed dimensions in mm) ---
    items.push(
      { id: 'refrigerator', type: 'refrigerator', name: t('designer.catalog.refrigerator', 'Refrigerateur'), width: 600, height: 1800, depth: 650, color: 0xdddddd, category: 'appliances', price: 600 },
      { id: 'dishwasher', type: 'dishwasher', name: t('designer.catalog.dishwasher', 'Lave-vaisselle'), width: 600, height: 850, depth: 600, color: 0xcccccc, category: 'appliances', price: 450 },
      { id: 'oven', type: 'base_cabinet', name: t('designer.catalog.oven', 'Four'), width: 600, height: 600, depth: 550, color: 0x333333, category: 'appliances', price: 400 },
      { id: 'cooktop', type: 'cooktop', name: t('designer.catalog.cooktop', 'Plaque de cuisson'), width: 600, height: 50, depth: 520, color: 0x333333, category: 'appliances', price: 350 },
      { id: 'hood', type: 'hood', name: t('designer.catalog.hood', 'Hotte aspirante'), width: 600, height: 500, depth: 500, color: 0xbbbbbb, category: 'appliances', price: 280 },
    );

    // --- Worktops ---
    items.push({
      id: 'worktop-600',
      type: 'base_cabinet',
      name: t('designer.catalog.worktopName', { width: 600, defaultValue: 'Plan de travail 600 mm' }),
      width: 600,
      height: brandProfile.worktop.defaultThickness,
      depth: brandProfile.base.defaultDepth + brandProfile.worktop.overhangFront,
      color: 0x555555,
      category: 'worktops',
      price: 150,
    });

    // --- Sinks ---
    items.push(
      {
        id: 'sink-single',
        type: 'sink',
        name: t('designer.catalog.singleSink', 'Evier simple'),
        width: 600,
        height: brandProfile.base.totalHeight,
        depth: brandProfile.base.defaultDepth,
        color: 0x999999,
        category: 'sinks',
        price: 300,
      },
      {
        id: 'sink-double',
        type: 'sink',
        name: t('designer.catalog.doubleSink', 'Evier double'),
        width: 800,
        height: brandProfile.base.totalHeight,
        depth: brandProfile.base.defaultDepth,
        color: 0x999999,
        category: 'sinks',
        price: 400,
      },
    );

    return items;
  }, [brandProfile, t]);

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(localCatalogItems);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fetchCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const res = await api.get<{ data: any[] }>(API_ENDPOINTS.PRODUCTS?.BASE || '/products', {
          signal: controller.signal,
        });
        if (res.success && res.data?.data && res.data.data.length > 0) {
          const mapped: CatalogItem[] = res.data.data.map((p: any) => ({
            id: p.id,
            type: p.type || 'base_cabinet',
            name: p.name,
            width: p.width || 600,
            height: p.height || 720,
            depth: p.depth || 560,
            color: p.color || 0xD4A574,
            category: mapCategory(p.category || p.type),
            price: p.price || 0,
          }));
          if (mounted) {setCatalogItems(mapped);}
          return;
        }
      } catch {
        // API not available, use local fallback
      } finally {
        if (mounted) {setIsLoadingCatalog(false);}
      }
      if (mounted) {setCatalogItems(localCatalogItems);}
    };

    fetchCatalog();
    return () => { mounted = false; controller.abort(); };
  }, [localCatalogItems]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {return catalogItems;}
    const query = searchQuery.toLowerCase();
    return catalogItems.filter((item) =>
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  }, [searchQuery, catalogItems]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<CatalogCategory, CatalogItem[]>();
    for (const cat of CATEGORIES) {
      map.set(cat, filteredItems.filter((item) => item.category === cat));
    }
    return map;
  }, [filteredItems]);

  const handleAddItem = (item: CatalogItem) => {
    const loader = modelLoaderRef.current;

    // Convert mm to meters for Three.js
    const dimensions = {
      width: item.width / 1000,
      height: item.height / 1000,
      depth: item.depth / 1000,
    };

    const mesh = loader.createProceduralFallback(item.type, dimensions, item.color);

    // Attach metadata to the object
    mesh.userData = {
      id: `${item.id}-${Date.now()}`,
      type: item.type,
      catalogId: item.id,
      name: item.name,
      dimensions,
      price: item.price,
    };

    // Position wall cabinets at brand-specific height
    if (item.category === 'wall_cabinets') {
      mesh.position.y = mmToM(brandProfile.wall.bottomY);
    }

    addObject(mesh.userData.id, mesh);
  };

  const toggleCategory = (category: CatalogCategory) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const colorToHex = (color: number): string => {
    return `#${color.toString(16).padStart(6, '0')}`;
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {t('designer.catalog.title', 'Catalogue')}
        </h2>

        {/* Search */}
        <div className="mt-2 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('designer.catalog.search', 'Rechercher...')}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={t('designer.catalog.clearSearch', 'Effacer')}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingCatalog && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <span className="ml-2 text-xs text-gray-500">{t('designer.catalog.loading', 'Chargement...')}</span>
          </div>
        )}
        {CATEGORIES.map((category) => {
          const config = CATEGORY_CONFIG[category];
          const items = itemsByCategory.get(category) || [];
          const isExpanded = expandedCategory === category;

          if (searchQuery && items.length === 0) {return null;}

          return (
            <div key={category} className="border-b border-gray-100 dark:border-gray-700">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400">{config.icon}</span>
                <span className="flex-1 text-left">
                  {t(config.labelKey, config.defaultLabel)}
                </span>
                <span className="text-xs text-gray-400">{items.length}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Items grid */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          id: item.id,
                          type: item.type,
                          name: item.name,
                          width: item.width,
                          height: item.height,
                          depth: item.depth,
                          color: item.color,
                          price: item.price,
                        }));
                        e.dataTransfer.effectAllowed = 'copy';
                        // Create drag preview
                        const ghost = document.createElement('div');
                        ghost.className = 'bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg';
                        ghost.textContent = item.name;
                        ghost.style.position = 'absolute';
                        ghost.style.top = '-1000px';
                        document.body.appendChild(ghost);
                        e.dataTransfer.setDragImage(ghost, 0, 0);
                        setTimeout(() => document.body.removeChild(ghost), 0);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-150 group cursor-grab active:cursor-grabbing"
                      title={t('designer.catalog.dragOrClick', 'Glisser ou cliquer pour ajouter')}
                    >
                      {/* Color preview / thumbnail */}
                      <div
                        className="w-full h-14 rounded-md flex items-center justify-center border border-gray-100 dark:border-gray-600"
                        style={{ backgroundColor: colorToHex(item.color) }}
                      >
                        <span className="text-xs text-white/80 font-medium drop-shadow-sm">
                          {item.width}x{item.depth}
                        </span>
                      </div>

                      {/* Name */}
                      <span className="text-xs text-gray-700 dark:text-gray-300 text-center leading-tight font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.name}
                      </span>

                      {/* Dimensions */}
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {item.width} x {item.height} x {item.depth} mm
                      </span>

                      {/* Price */}
                      <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                        {item.price} €
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {searchQuery && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              <path strokeLinecap="round" d="M8 11h6" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('designer.catalog.noResults', 'Aucun produit trouve')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('designer.catalog.noResultsHint', 'Essayez avec un autre terme de recherche')}
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('designer.catalog.clearSearch', 'Effacer la recherche')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
