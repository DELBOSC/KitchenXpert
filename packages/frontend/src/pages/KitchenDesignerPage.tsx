import { AlertTriangle, RotateCcw } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import * as THREE from 'three';

import {
  BRAND_PROFILES,
  getAllBrandIds,
  getBrandProfile,
  recomputeWithThickness,
  mmToM,
} from '@kitchenxpert/3d-engine';

import AssistantIntro from '../components/assistant/AssistantIntro';
import AssistantSurface from '../components/assistant/AssistantSurface';
import AIAssistantPanel from '../components/designer/AIAssistantPanel';
import { applyChatStyleSuggestion } from '../components/designer/apply-chat-style';
import BudgetBar from '../components/designer/BudgetBar';
import CatalogPanel from '../components/designer/CatalogPanel';
import CollaboratorCursors from '../components/designer/CollaboratorCursors';
import DesignDiffOverlay from '../components/designer/DesignDiffOverlay';
import DimensionWizard from '../components/designer/DimensionWizard';
import EcoScorePanel from '../components/designer/EcoScorePanel';
import ExportPanel from '../components/designer/ExportPanel';
import KeyboardShortcutsModal from '../components/designer/KeyboardShortcutsModal';
import LayoutProposalsDialog from '../components/designer/LayoutProposalsDialog';
import {
  doubleLeaves,
  openingsToSpans,
  openingWorldTransform,
  toWallOpening,
  type Opening,
} from '../components/designer/openings';
import OpeningsPanel from '../components/designer/OpeningsPanel';
import PlanView2DOverlay from '../components/designer/PlanView2DOverlay';
import PresenceBar from '../components/designer/PresenceBar';
import PricingPanel from '../components/designer/PricingPanel';
import ProductPairingsPanel from '../components/designer/ProductPairingsPanel';
import PropertiesPanel from '../components/designer/PropertiesPanel';
import QuoteToPartnerModal from '../components/designer/QuoteToPartnerModal';
import {
  serializeScene,
  restoreScene,
  normalizePersistedItem,
} from '../components/designer/scene-persistence';
import ShoppingListPanel from '../components/designer/ShoppingListPanel';
import StyleTransferModal from '../components/designer/StyleTransferModal';
import Toolbar from '../components/designer/Toolbar';
import VersionHistoryPanel from '../components/designer/VersionHistoryPanel';
import {
  buildWallGeometry,
  wallPlacement,
  type WallPlacement,
} from '../components/designer/wall-geometry';
import LiDARScanner from '../components/scanner/LiDARScanner';
import { useToast } from '../components/ui/Toast';
import { useCollaboration } from '../hooks/useCollaboration';
import { useKitchenEngine } from '../hooks/useKitchenEngine';
import { api } from '../services/api/api';
import { API_ENDPOINTS } from '../services/api/endpoints';

import type { BrandId } from '@kitchenxpert/3d-engine';

// ─── Types ────────────────────────────────────────────────────
interface Project {
  id: string;
  name: string;
}

interface Kitchen {
  id: string;
  projectId: string;
  name: string;
  style: string;
  layout: string;
  width: number;
  length: number;
  height: number;
  score: number | null;
  metadata: Record<string, unknown> | null;
}

// ─── Constants ────────────────────────────────────────────────
const STYLES = [
  { value: 'modern', labelKey: 'designer.styles.modern', color: '#3b82f6' },
  { value: 'traditional', labelKey: 'designer.styles.traditional', color: '#a16207' },
  { value: 'farmhouse', labelKey: 'designer.styles.farmhouse', color: '#65a30d' },
  { value: 'industrial', labelKey: 'designer.styles.industrial', color: '#71717a' },
  { value: 'transitional', labelKey: 'designer.styles.transitional', color: '#8b5cf6' },
  { value: 'coastal', labelKey: 'designer.styles.coastal', color: '#06b6d4' },
  { value: 'contemporary', labelKey: 'designer.styles.contemporary', color: '#ec4899' },
  { value: 'scandinavian', labelKey: 'designer.styles.scandinavian', color: '#f5f5f4' },
  { value: 'mediterranean', labelKey: 'designer.styles.mediterranean', color: '#ea580c' },
  { value: 'rustic', labelKey: 'designer.styles.rustic', color: '#92400e' },
];

const LAYOUTS = [
  { value: 'l_shaped', labelKey: 'designer.layouts.l_shaped' },
  { value: 'u_shaped', labelKey: 'designer.layouts.u_shaped' },
  { value: 'galley', labelKey: 'designer.layouts.galley' },
  { value: 'island', labelKey: 'designer.layouts.island' },
  { value: 'peninsula', labelKey: 'designer.layouts.peninsula' },
  { value: 'one_wall', labelKey: 'designer.layouts.one_wall' },
  { value: 'open_plan', labelKey: 'designer.layouts.open_plan' },
];

const WALL_THICKNESS = 0.15;
const WALL_COLOR = 0xeeeeee;
const FLOOR_COLOR = 0xd4c4a8;

// ─── Main Component ────────────────────────────────────────────
export default function KitchenDesignerPage(): React.ReactElement {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  if (!id) {
    return <KitchenCreateForm />;
  }

  return <KitchenDesigner kitchenId={id} navigate={navigate} toast={toast} />;
}

// ─── Creation Form (unchanged) ─────────────────────────────────
function KitchenCreateForm(): React.ReactElement {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [createNewProject, setCreateNewProject] = useState(false);
  const [name, setName] = useState('');
  const [style, setStyle] = useState('modern');
  const [layout, setLayout] = useState('l_shaped');
  const [width, setWidth] = useState(4000);
  const [length, setLength] = useState(3000);
  const [height, setHeight] = useState(2500);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProjects = async () => {
      const res = await api.get<Project[]>(API_ENDPOINTS.PROJECTS.BASE, {
        signal: controller.signal,
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : [];
        setProjects(list);
        if (list.length > 0 && list[0]) {
          setProjectId(list[0].id);
        } else {
          setCreateNewProject(true);
        }
      } else {
        setCreateNewProject(true);
      }
      setLoadingProjects(false);
    };
    void fetchProjects();
    return () => controller.abort();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('designer.kitchenNameError'));
      return;
    }
    setSubmitting(true);

    try {
      let targetProjectId = projectId;

      if (createNewProject) {
        const projName =
          newProjectName.trim() || t('designer.defaultProjectName', 'Mon projet cuisine');
        const projRes = await api.post<{ id: string }>(API_ENDPOINTS.PROJECTS.BASE, {
          name: projName,
          description: t('designer.projectDescription', { defaultValue: 'Projet cuisine' }),
          status: 'draft',
        });
        if (!projRes.success || !projRes.data) {
          toast.error(projRes.error?.message || t('designer.projectCreateError'));
          setSubmitting(false);
          return;
        }
        targetProjectId = projRes.data.id;
      }

      const res = await api.post<Kitchen>(API_ENDPOINTS.KITCHENS.BASE, {
        projectId: targetProjectId,
        name: name.trim(),
        style,
        layout,
        width: width / 1000,
        length: length / 1000,
        height: height / 1000,
      });

      if (res.success && res.data) {
        toast.success(t('designer.kitchenCreated'));
        navigate(`/designer/${res.data.id}`);
      } else {
        toast.error(res.error?.message || t('designer.createError'));
      }
    } catch {
      toast.error(t('designer.serverError'));
    } finally {
      setSubmitting(false);
    }
  };

  const layoutSvg = (val: string) => {
    const paths: Record<string, string> = {
      l_shaped: 'M4 4h16v4H8v12H4V4z',
      u_shaped: 'M4 4h16v16h-4V8H8v12H4V4z',
      galley: 'M4 4h4v16H4V4zm12 0h4v16h-4V4z',
      island: 'M4 4h16v4H4V4zm6 8h4v4h-4v-4z',
      peninsula: 'M4 4h16v4H8v4h8v4H8v4H4V4z',
      one_wall: 'M4 4h16v4H4V4z',
      open_plan: 'M4 4h16v4H4V4zm0 8h8v8H4v-8z',
    };
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor" opacity={0.7}>
        <path d={paths[val] || paths.l_shaped} />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {t('designer.newKitchen')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t('designer.configureBase')}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('designer.project')}
            </label>
            {loadingProjects ? (
              <p className="text-sm text-gray-400">{t('designer.loadingProjects')}</p>
            ) : projects.length > 0 && !createNewProject ? (
              <div className="space-y-2">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCreateNewProject(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {t('designer.createNewProject')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={t('designer.newProjectPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
                {projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCreateNewProject(false)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t('designer.chooseExistingProject')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Kitchen name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('designer.kitchenNameRequired')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('designer.kitchenNamePlaceholder')}
              required
              aria-required="true"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            />
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('designer.style')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStyle(s.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                    style === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-gray-200"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate w-full text-center">{t(s.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('designer.layout')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLayout(l.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                    layout === l.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {layoutSvg(l.value)}
                  <span className="text-xs font-medium">{t(l.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('designer.dimensions')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('designer.width')} (mm)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min={500}
                  max={15000}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('designer.depth')} (mm)
                </label>
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  min={500}
                  max={15000}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('designer.height')} (mm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={2000}
                  max={4000}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center">
              <div
                className="border border-dashed border-blue-300 dark:border-blue-600 rounded bg-blue-50/50 dark:bg-blue-900/10 flex items-center justify-center text-xs text-blue-500"
                style={{
                  width: `${Math.min(width / 50, 200)}px`,
                  height: `${Math.min(length / 50, 120)}px`,
                }}
              >
                {width} x {length} mm
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('designer.creating') : t('designer.createAndOpen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Designer View (Refactored with 3D Engine) ────────────────
function KitchenDesigner({
  kitchenId,
  navigate,
  toast,
}: {
  kitchenId: string;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>;
}): React.ReactElement {
  const { t } = useTranslation();
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Warn about unsaved changes on page close/refresh
  useEffect(() => {
    if (!hasChanges) {
      return;
    }
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Editable state (in mm)
  const [width, setWidth] = useState(4000);
  const [length, setLength] = useState(3000);
  const [height, setHeight] = useState(2500);
  const [kitchenName, setKitchenName] = useState('');
  const [style, setStyle] = useState('modern');
  const [layout, setLayout] = useState('l_shaped');
  const [brandId, setBrandId] = useState<BrandId>('ikea_metod');
  const [worktopThickness, setWorktopThickness] = useState(38);

  // Budget tracking
  const [budgetTarget] = useState(25000);
  const [budgetSpent, setBudgetSpent] = useState(0);
  const [budgetBreakdown, setBudgetBreakdown] = useState<{ category: string; amount: number }[]>(
    []
  );

  // UI panels
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [showOpenings, setShowOpenings] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>([]);
  // How many walls the current layout builds (matches buildKitchenScene's switch) — drives
  // the Openings panel's wall picker.
  const wallCount = useMemo(() => {
    switch (layout) {
      case 'u_shaped':
        return 3;
      case 'one_wall':
      case 'open_plan':
      case 'island':
        return 1;
      default:
        return 2; // galley, l_shaped, peninsula
    }
  }, [layout]);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showEcoScore, setShowEcoScore] = useState(false);
  const [showProductPairings, setShowProductPairings] = useState(false);
  const [showDimensionWizard, setShowDimensionWizard] = useState(false);
  const [showDesignDiff, setShowDesignDiff] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showStyleTransfer, setShowStyleTransfer] = useState(false);
  const [showLiDARScanner, setShowLiDARScanner] = useState(false);

  // Responsive sidebar toggles (mobile only; desktop always shows)
  const [showCatalog, setShowCatalog] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  // 3D Engine — init is driven by the canvas node attaching (setContainer callback ref),
  // not by an effect flush, so it survives the loading→designer branch swap.
  const engineHook = useKitchenEngine({
    width: width / 1000,
    depth: length / 1000,
    height: height / 1000,
    shadowsEnabled: true,
    brandId,
  });

  const {
    engine,
    isReady,
    setContainer,
    containerRef: canvasContainerRef,
    initError,
    retry: retryEngineInit,
    brandProfile,
    selectedObject,
    addObject,
    removeSelected,
    duplicateSelected,
    isPlanView,
    togglePlanView,
    isElevation,
    toggleElevation,
    isWalkthrough,
    toggleWalkthrough,
    isMeasuring,
    toggleMeasure,
    clearMeasurements,
    setLightingPreset,
    currentLightingPreset,
    handleDragOver,
    handleDrop,
    handleDragLeave,
  } = engineHook;

  // Drag-over visual feedback wrappers
  const handleCanvasDragOver = useCallback(
    (e: React.DragEvent) => {
      handleDragOver(e);
      setIsDragOver(true);
    },
    [handleDragOver]
  );

  const handleCanvasDragLeave = useCallback(() => {
    handleDragLeave();
    setIsDragOver(false);
  }, [handleDragLeave]);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      handleDrop(e);
      setIsDragOver(false);
    },
    [handleDrop]
  );

  // ─── Budget computation from engine scene ──────
  const DEFAULT_PRICES: Record<string, number> = useMemo(
    () => ({
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
    }),
    []
  );

  const BUDGET_CATEGORY_MAP: Record<string, string> = useMemo(
    () => ({
      base_cabinet: t('designer.budgetCategory.baseCabinets', 'Meubles bas'),
      base: t('designer.budgetCategory.baseCabinets', 'Meubles bas'),
      wall_cabinet: t('designer.budgetCategory.wallCabinets', 'Meubles hauts'),
      tall_cabinet: t('designer.budgetCategory.tallCabinets', 'Colonnes'),
      sink: t('designer.budgetCategory.sinks', 'Eviers'),
      sink_base: t('designer.budgetCategory.sinks', 'Eviers'),
      cooktop: t('designer.budgetCategory.appliances', 'Electromenager'),
      stove: t('designer.budgetCategory.appliances', 'Electromenager'),
      hood: t('designer.budgetCategory.appliances', 'Electromenager'),
      range_hood: t('designer.budgetCategory.appliances', 'Electromenager'),
      refrigerator: t('designer.budgetCategory.appliances', 'Electromenager'),
      fridge: t('designer.budgetCategory.appliances', 'Electromenager'),
      dishwasher: t('designer.budgetCategory.appliances', 'Electromenager'),
      oven: t('designer.budgetCategory.appliances', 'Electromenager'),
      worktop: t('designer.budgetCategory.worktops', 'Plans de travail'),
    }),
    [t]
  );

  const updateBudgetData = useCallback(() => {
    if (!engine) {
      return;
    }
    const categoryMap = new Map<string, number>();
    let total = 0;
    engine.scene.getThreeScene().traverse((child: THREE.Object3D) => {
      const userData = child.userData as {
        id?: string;
        type?: string;
        isGenerated?: boolean;
        price?: number;
      };
      if (!userData.id || userData.type === 'wall' || userData.type === 'floor') {
        return;
      }
      if (userData.isGenerated) {
        return;
      }
      const itemType = userData.type ?? 'unknown';
      const price = userData.price ?? DEFAULT_PRICES[itemType] ?? 0;
      total += price;
      const category = BUDGET_CATEGORY_MAP[itemType] ?? t('designer.budgetCategory.other', 'Autre');
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + price);
    });
    setBudgetSpent(total);
    setBudgetBreakdown(
      Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
    );
  }, [engine, DEFAULT_PRICES, BUDGET_CATEGORY_MAP]);

  useEffect(() => {
    if (!engine) {
      return;
    }
    updateBudgetData();
    engine.history.onChangeCallback(() => {
      updateBudgetData();
    });
  }, [engine, updateBudgetData]);

  // Collaboration: cursor tracking + presence
  const {
    users: collabUsers,
    cursors: collabCursors,
    isConnected: collabConnected,
    error: collabError,
  } = useCollaboration(kitchenId, engine);

  // Build users map for CollaboratorCursors component
  const collabUsersMap = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; color: string }>();
    for (const user of collabUsers) {
      map.set(user.userId, {
        userId: user.userId,
        name: user.displayName,
        color: user.color,
      });
    }
    return map;
  }, [collabUsers]);

  // ─── Load Kitchen ─────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const fetchKitchen = async () => {
      const res = await api.get<Kitchen>(API_ENDPOINTS.KITCHENS.BY_ID(kitchenId), {
        signal: controller.signal,
      });
      if (res.success && res.data) {
        const k = res.data;
        setKitchen(k);
        setKitchenName(k.name);
        setStyle(k.style);
        setLayout(k.layout);
        setWidth(Math.round(Number(k.width) * 1000));
        setLength(Math.round(Number(k.length) * 1000));
        setHeight(Math.round(Number(k.height) * 1000));
        if (k.metadata?.brandId) {
          setBrandId(k.metadata.brandId as BrandId);
        }
        // Restore the wall openings (doors/windows) saved in metadata.
        if (Array.isArray(k.metadata?.openings)) {
          setOpenings(k.metadata.openings as Opening[]);
        }
      } else {
        toast.error(t('designer.kitchenNotFound'));
        navigate('/dashboard');
      }
      setLoading(false);
    };
    void fetchKitchen();
    return () => controller.abort();
    // kitchenId is the ONLY thing that should re-fetch the kitchen. navigate/toast/t were
    // in the deps but aren't stable — useToast() returns a NEW object every ToastProvider
    // render (its value isn't memoized), so showing any toast re-fired this effect →
    // duplicate GET /kitchens/<id>. They're only used on the error path and resolve to
    // stable useCallbacks underneath, so capturing them is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchenId]);

  // ─── Build Kitchen Scene ──────────────────────
  const buildKitchenScene = useCallback(() => {
    if (!engine) {
      return;
    }
    const scene = engine.scene.getThreeScene();

    // Remove old kitchen structure
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.userData.isKitchenStructure) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => scene.remove(obj));

    const w = width / 1000;
    const d = length / 1000;
    const h = height / 1000;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(w, d);
    const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(w / 2, 0, d / 2);
    floor.receiveShadow = true;
    floor.userData.isKitchenStructure = true;
    floor.userData.type = 'floor';
    scene.add(floor);

    // Clear the previously-rendered door/window frames so a rebuild (dims/layout/openings
    // change) doesn't accumulate duplicates — architecturalElements manages its own scene
    // objects, which are NOT tagged isKitchenStructure and so survive the removal above.
    engine.architecturalElements.clear();

    // Render one opening's door/window frame at its world position on the wall. The wall is
    // cut once (full width); a double french door fills that single hole with two half-width
    // leaves hinged on the outer edges (meeting in the middle).
    const renderOpening = (p: WallPlacement, o: Opening): void => {
      if (o.type === 'window') {
        const t = openingWorldTransform(p, o.offset, o.width);
        engine.architecturalElements.addWindow({
          id: o.id,
          width: o.width,
          height: o.height,
          sillHeight: o.sill,
          position: new THREE.Vector3(...t.position),
          rotation: t.rotationY,
          type: 'single',
        });
        return;
      }

      const doorType = o.type === 'door' ? 'standard' : 'french';
      const addLeaf = (id: string, offset: number, width: number, dir: 'left' | 'right'): void => {
        const t = openingWorldTransform(p, offset, width);
        engine.architecturalElements.addDoor({
          id,
          width,
          height: o.height,
          position: new THREE.Vector3(...t.position),
          rotation: t.rotationY,
          type: doorType,
          openDirection: dir,
          isOpen: false,
          openAngle: 0,
        });
      };

      if (o.type === 'french_door_double') {
        doubleLeaves(o).forEach((leaf, i) =>
          addLeaf(`${o.id}-${i === 0 ? 'L' : 'R'}`, leaf.offset, leaf.width, leaf.direction)
        );
      } else {
        addLeaf(o.id, o.offset, o.width, 'left');
      }
    };

    // Wall creation helper. Walls are indexed by creation order so an Opening can target a
    // specific wall by `wallIndex`. Each wall is cut (ExtrudeGeometry holes, native — no CSG)
    // and its openings are rendered. With no openings this is a zero-regression swap for the
    // old BoxGeometry (proven in wall-geometry.test.ts).
    let wallCount = 0;
    const createWall = (wx: number, wh: number, wd: number, px: number, py: number, pz: number) => {
      const wallIndex = wallCount;
      wallCount += 1;
      const wallOpenings = openings.filter((o) => o.wallIndex === wallIndex);
      const p = wallPlacement(wx, wh, wd, px, py, pz);
      const geo = buildWallGeometry(p.width, p.height, p.thickness, wallOpenings.map(toWallOpening));
      const mat = new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.5 });
      const wall = new THREE.Mesh(geo, mat);
      wall.position.set(...p.position);
      wall.rotation.y = p.rotationY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.isKitchenStructure = true;
      wall.userData.type = 'wall';
      scene.add(wall);
      wallOpenings.forEach((o) => renderOpening(p, o));
      return wall;
    };

    const walls: THREE.Object3D[] = [];

    switch (layout) {
      case 'one_wall':
      case 'open_plan':
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, 0));
        break;

      case 'galley':
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, 0));
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, d));
        break;

      case 'l_shaped':
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, 0));
        walls.push(createWall(WALL_THICKNESS, h, d, 0, h / 2, d / 2));
        break;

      case 'u_shaped':
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, 0));
        walls.push(createWall(WALL_THICKNESS, h, d, 0, h / 2, d / 2));
        walls.push(createWall(WALL_THICKNESS, h, d, w, h / 2, d / 2));
        break;

      case 'island':
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, 0));
        {
          const iw = Math.min(w * 0.4, 1.2);
          const id = Math.min(d * 0.3, 0.8);
          const geo = new THREE.BoxGeometry(iw, 0.9, id);
          const mat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.4 });
          const island = new THREE.Mesh(geo, mat);
          island.position.set(w / 2, 0.45, d * 0.6);
          island.castShadow = true;
          island.receiveShadow = true;
          island.userData.isKitchenStructure = true;
          island.userData.type = 'island';
          scene.add(island);
        }
        break;

      case 'peninsula':
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, 0));
        walls.push(createWall(WALL_THICKNESS, h, d, 0, h / 2, d / 2));
        {
          const pw = Math.min(w * 0.35, 1.0);
          const geo = new THREE.BoxGeometry(pw, 0.9, 0.6);
          const mat = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.4 });
          const pen = new THREE.Mesh(geo, mat);
          pen.position.set(pw / 2 + WALL_THICKNESS, 0.45, d * 0.6);
          pen.castShadow = true;
          pen.receiveShadow = true;
          pen.userData.isKitchenStructure = true;
          scene.add(pen);
        }
        break;

      default:
        walls.push(createWall(w, h, WALL_THICKNESS, w / 2, h / 2, 0));
        walls.push(createWall(WALL_THICKNESS, h, d, 0, h / 2, d / 2));
    }

    // Register walls in snap system
    engine.snapSystem.setWalls(walls);

    // Set camera to view the scene
    engine.camera.applyPreset('perspective' as import('@kitchenxpert/3d-engine').CameraPreset, {
      width: w,
      depth: d,
    });
    engine.controls.setOrbitTarget(new THREE.Vector3(w / 2, h * 0.3, d / 2));
  }, [engine, width, length, height, layout, openings]);

  // Rebuild scene when dimensions/layout change
  useEffect(() => {
    if (!isReady || loading) {
      return;
    }
    buildKitchenScene();
  }, [isReady, loading, buildKitchenScene]);

  // ─── Save ─────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    const res = await api.put(API_ENDPOINTS.KITCHENS.BY_ID(kitchenId), {
      name: kitchenName.trim() || t('designer.unnamedKitchen', 'Cuisine sans nom'),
      style,
      layout,
      width: width / 1000,
      length: length / 1000,
      height: height / 1000,
      metadata: { brandId, openings },
    });
    if (res.success) {
      // Persist the 3D arrangement (furniture) alongside the kitchen scalars, so it
      // survives a reload. Without this, everything placed in the scene is lost.
      if (engine) {
        const itemsRes = await api.put(API_ENDPOINTS.KITCHENS.ITEMS(kitchenId), {
          items: serializeScene(engine),
        });
        if (!itemsRes.success) {
          toast.error(
            itemsRes.error?.message ??
              t('designer.saveItemsError', "L'agencement n'a pas pu être sauvegardé")
          );
          setSaving(false);
          return;
        }
      }
      toast.success(t('designer.saved'));
      setHasChanges(false);
    } else {
      toast.error(res.error?.message || t('designer.saveError'));
    }
    setSaving(false);
  }, [kitchenId, kitchenName, style, layout, width, length, height, brandId, openings, engine, t, toast]);

  // ─── Restore the saved 3D arrangement on load (once per kitchen) ─────────────
  // Runs after the engine is ready and the kitchen has loaded. buildKitchenScene rebuilds
  // only the room shell (structure); it never removes furniture, so restored items survive
  // subsequent shell rebuilds. The ref guards against React StrictMode double-invoke and
  // dimension-change re-renders (set synchronously BEFORE the async fetch).
  const restoredForKitchenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!engine || !kitchenId || loading || restoredForKitchenRef.current === kitchenId) {
      return;
    }
    restoredForKitchenRef.current = kitchenId;
    void (async () => {
      const res = await api.get(API_ENDPOINTS.KITCHENS.ITEMS(kitchenId));
      if (res.success && Array.isArray(res.data)) {
        restoreScene(engine, (res.data as unknown[]).map(normalizePersistedItem));
      }
    })();
  }, [engine, kitchenId, loading]);

  // ─── Global Keyboard Shortcuts ──────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl+S → save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) {
          void handleSave();
        }
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowShortcutsModal((prev) => !prev);
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          engineHook.setTransformMode('translate');
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          engineHook.setTransformMode('rotate');
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          engineHook.setTransformMode('scale');
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          engineHook.toggleSnap(!engineHook.snapEnabled);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          togglePlanView();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (selectedObject) {
            removeSelected();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, saving, handleSave, engineHook, togglePlanView, selectedObject, removeSelected]);

  const handleChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    setter(value);
    setHasChanges(true);
  };

  // Assistant "Appliquer" on a style suggestion → apply it to the scene. Until now this
  // was wired to nothing (onToolAction never passed down), so the button did nothing.
  const handleAssistantToolAction = useCallback(
    (toolName: string, toolInput: Record<string, unknown>) => {
      if (!engine) {
        return;
      }
      const res = applyChatStyleSuggestion(engine, toolName, toolInput);
      if (res.applied) {
        setHasChanges(true);
        toast.success(
          t('designer.chat.colorApplied', {
            defaultValue: 'Couleur {{color}} appliquée à {{count}} meuble(s)',
            color: res.colorKey,
            count: res.count,
          })
        );
      } else {
        toast.error(
          t(
            'designer.chat.styleNotApplicable',
            "Cette suggestion n'a pas pu être appliquée automatiquement"
          )
        );
      }
    },
    [engine, toast, t]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
            role="status"
            aria-label={t('designer.loadingKitchen')}
          />
          <p className="text-gray-500 dark:text-gray-400">{t('designer.loadingKitchen')}</p>
        </div>
      </div>
    );
  }

  const layoutLabel = LAYOUTS.find((l) => l.value === layout)?.labelKey;

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Top Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              title={t('common.back')}
            >
              &larr;
            </button>
            <input
              type="text"
              value={kitchenName}
              onChange={(e) => handleChange(setKitchenName, e.target.value)}
              className="font-semibold text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none px-1 py-0.5"
            />
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded">
              {layoutLabel ? t(layoutLabel) : layout}
            </span>
            {hasChanges && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {t('designer.unsaved', 'Non enregistre')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile sidebar toggles */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                onClick={() => setShowCatalog((prev) => !prev)}
                className={`p-1.5 rounded transition-colors ${showCatalog ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                aria-label={t('designer.toggleCatalog', 'Catalogue')}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                onClick={() => setShowProperties((prev) => !prev)}
                className={`p-1.5 rounded transition-colors ${showProperties ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                aria-label={t('designer.toggleProperties', 'Proprietes')}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </button>
            </div>

            <button
              onClick={() => setShowAI(!showAI)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                showAI
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="IA"
            >
              IA
            </button>
            <button
              onClick={() => setShowVersionHistory(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.versions', 'Versions')}
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.export', 'Export')}
            </button>
            <button
              onClick={() => setShowEcoScore(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.ecoScore', 'Eco')}
            </button>
            <button
              onClick={() => setShowQuoteModal(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.quote', 'Devis')}
            </button>
            <button
              onClick={() => setShowStyleTransfer(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.styleTransfer', 'Style')}
            </button>
            <button
              onClick={() => setShowLiDARScanner(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.lidarScan', 'Scan')}
            </button>
            <button
              onClick={() => setShowDimensionWizard(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.dimensionWizard', 'Wizard')}
            </button>
            <button
              onClick={() => setShowOpenings(true)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              {t('designer.openings', 'Ouvertures')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? t('designer.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar
        {...engineHook}
        onTogglePlanView={togglePlanView}
        isPlanView={isPlanView}
        onToggleElevation={toggleElevation}
        isElevation={isElevation}
        onToggleWalkthrough={toggleWalkthrough}
        isWalkthrough={isWalkthrough}
        onToggleMeasure={toggleMeasure}
        isMeasuring={isMeasuring}
        onClearMeasurements={clearMeasurements}
        onSetLightingPreset={setLightingPreset}
        currentLightingPreset={currentLightingPreset}
        onToggleChatPanel={() => setShowChatPanel((prev) => !prev)}
        showChatPanel={showChatPanel}
        onShowShortcuts={() => setShowShortcutsModal(true)}
        onShowShoppingList={() => setShowShoppingList(true)}
      />

      {/* Presence Bar - shows connected collaborators */}
      <PresenceBar
        users={collabUsers.map((u) => ({
          userId: u.userId,
          email: u.email,
          displayName: u.displayName,
          color: u.color,
        }))}
        isConnected={collabConnected}
        error={collabError}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Catalog */}
        <div
          className={`${showCatalog ? 'block' : 'hidden'} lg:block ${showCatalog ? 'fixed left-0 top-28 bottom-0 z-20 shadow-lg lg:relative lg:top-0 lg:shadow-none' : ''}`}
        >
          <CatalogPanel
            addObject={addObject}
            brandProfile={brandProfile ?? getBrandProfile(brandId)}
          />
        </div>

        {/* 3D Canvas */}
        <main className="flex-1 relative">
          <div
            ref={setContainer}
            className={`absolute inset-0 transition-all duration-200 ${isDragOver ? 'ring-2 ring-blue-500 ring-inset bg-blue-500/5' : ''}`}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            onDragLeave={handleCanvasDragLeave}
          />

          {/* Collaborator cursors overlay */}
          <CollaboratorCursors
            users={collabUsersMap}
            cursors={collabCursors}
            camera={engine?.camera?.getThreeCamera() ?? null}
            containerRef={canvasContainerRef}
          />

          {/* Plan View 2D overlay */}
          {isPlanView && (
            <PlanView2DOverlay
              onExit={togglePlanView}
              snapEnabled={engineHook.snapEnabled}
              onToggleSnap={() => engineHook.toggleSnap(!engineHook.snapEnabled)}
            />
          )}

          {/* Walkthrough overlay */}
          {isWalkthrough && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white rounded-lg px-5 py-3 flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">
                    WASD
                  </kbd>
                  {t('designer.walkthrough.move', 'Deplacer')}
                </span>
                <span className="w-px h-4 bg-white/30" />
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">
                    Mouse
                  </kbd>
                  {t('designer.walkthrough.look', 'Regarder')}
                </span>
              </div>
              <button
                onClick={toggleWalkthrough}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors"
              >
                {t('designer.walkthrough.exit', 'Quitter')} (ESC)
              </button>
            </div>
          )}

          {/* Loading / error overlay — never spins forever in silence (init has a
              timeout + .catch that flip initError, surfacing this retryable state). */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-20">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-xs w-full mx-4">
                {initError ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('designer.initError.title', 'Le moteur 3D n’a pas pu démarrer')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {initError === 'timeout'
                        ? t(
                            'designer.initError.timeout',
                            'L’initialisation a expiré (assets ou WebGL). Réessayez.'
                          )
                        : t(
                            'designer.initError.failed',
                            'Une erreur est survenue au chargement de la scène.'
                          )}
                    </p>
                    <button
                      type="button"
                      onClick={retryEngineInit}
                      className="mt-1 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {t('designer.initError.retry', 'Réessayer')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"
                      role="status"
                      aria-label={t('designer.loading.engine', 'Initialisation du moteur 3D...')}
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('designer.loading.engine', 'Initialisation du moteur 3D...')}
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 animate-pulse"
                        style={{ width: '60%' }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t(
                        'designer.loading.hint',
                        'Preparation de la scene, chargement des assets...'
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Budget Bar - floating at bottom center */}
          {isReady && (
            <BudgetBar budget={budgetTarget} spent={budgetSpent} breakdown={budgetBreakdown} />
          )}
        </main>

        {/* Right Sidebar - Properties + Pricing */}
        <div
          className={`${showProperties ? 'flex' : 'hidden'} lg:flex ${showProperties ? 'fixed right-0 top-28 bottom-0 z-20 shadow-lg lg:relative lg:top-0 lg:shadow-none' : ''}`}
        >
          <div className="w-72 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
            {!showChatPanel && (
              <div className="px-3 pt-3">
                <AssistantIntro
                  surface="designer"
                  layout="stack"
                  message="L'assistant voit ta cuisine : couleurs réellement disponibles, budget réel."
                  ctaLabel="Ouvrir"
                  onOpen={() => setShowChatPanel(true)}
                />
              </div>
            )}

            <PropertiesPanel
              selectedObject={selectedObject}
              engine={engine}
              removeSelected={removeSelected}
              duplicateSelected={duplicateSelected}
            />

            {/* Room dimensions */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                {t('designer.roomDimensions', 'Dimensions')}
              </h2>
              <div className="space-y-2">
                <DimensionInput
                  label={t('designer.width', 'Largeur')}
                  value={width}
                  unit="mm"
                  onChange={(v) => handleChange(setWidth, v)}
                />
                <DimensionInput
                  label={t('designer.depth', 'Profondeur')}
                  value={length}
                  unit="mm"
                  onChange={(v) => handleChange(setLength, v)}
                />
                <DimensionInput
                  label={t('designer.height', 'Hauteur')}
                  value={height}
                  unit="mm"
                  onChange={(v) => handleChange(setHeight, v)}
                />
              </div>
            </div>

            {/* Brand selector */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
                {t('designer.brand', 'Marque')}
              </h2>
              <select
                value={brandId}
                onChange={(e) => {
                  const newBrandId = e.target.value as BrandId;
                  setBrandId(newBrandId);
                  engine?.setBrandProfile(newBrandId);
                  setHasChanges(true);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
              >
                {getAllBrandIds().map((bid) => (
                  <option key={bid} value={bid}>
                    {BRAND_PROFILES[bid].name}
                  </option>
                ))}
              </select>
            </div>

            {/* Worktop thickness */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
                {t('designer.worktopThickness', 'Epaisseur PDT')}
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={worktopThickness}
                  onChange={(e) => {
                    const thicknessMm = Number(e.target.value);
                    setWorktopThickness(thicknessMm);
                    if (engine) {
                      engine.worktopGenerator.setThickness(mmToM(thicknessMm));
                      const currentProfile = engine.brandProfile;
                      const updated = recomputeWithThickness(currentProfile, thicknessMm);
                      engine.accessoriesGenerator.updateWorktopSurface(updated.worktop.surfaceY);
                    }
                    setHasChanges(true);
                  }}
                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                >
                  {(brandProfile ?? getBrandProfile(brandId)).worktop.availableThicknesses.map(
                    (t_mm) => (
                      <option key={t_mm} value={t_mm}>
                        {t_mm} mm
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Style & Layout selectors */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
                {t('designer.style')}
              </h2>
              <select
                value={style}
                onChange={(e) => handleChange(setStyle, e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
                {t('designer.layout')}
              </h2>
              <select
                value={layout}
                onChange={(e) => handleChange(setLayout, e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
              >
                {LAYOUTS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {t(l.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Score */}
            {kitchen?.score != null && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
                  {t('designer.score')}
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 rounded-full h-2"
                      style={{ width: `${kitchen.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {kitchen.score}/100
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Panel */}
          <PricingPanel engine={engine} />
        </div>
      </div>

      {/* AI Panel (bottom) */}
      {showAI && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-64 overflow-y-auto">
          <AIAssistantPanel engine={engine} onOpenProposals={() => setShowProposals(true)} />
        </div>
      )}

      {/* The assistant — ONE surface, two modes (Concevoir / Choisir & acheter).
          Docked on the right, never an overlay on the canvas (§8.1). */}
      {showChatPanel && (
        <div className="fixed right-0 top-28 bottom-0 z-20 w-80 border-l border-gray-200 shadow-lg dark:border-gray-700">
          <AssistantSurface
            engine={engine}
            selectedObject={selectedObject}
            kitchenId={kitchenId}
            layout={kitchen?.layout ?? 'open_plan'}
            onClose={() => setShowChatPanel(false)}
            onUpgrade={() => navigate('/pricing')}
            onToolAction={handleAssistantToolAction}
          />
        </div>
      )}

      {/* Export Modal */}
      <ExportPanel engine={engine} isOpen={showExport} onClose={() => setShowExport(false)} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Shopping List Panel */}
      <ShoppingListPanel
        kitchenId={kitchenId}
        isOpen={showShoppingList}
        onClose={() => setShowShoppingList(false)}
      />

      {/* Version History Panel */}
      <VersionHistoryPanel
        kitchenId={kitchenId}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={() => {
          setShowVersionHistory(false);
          // Reload kitchen data after restore
          setLoading(true);
          const controller = new AbortController();
          void api
            .get<Kitchen>(API_ENDPOINTS.KITCHENS.BY_ID(kitchenId), { signal: controller.signal })
            .then((res) => {
              if (res.success && res.data) {
                const k = res.data;
                setKitchen(k);
                setKitchenName(k.name);
                setStyle(k.style);
                setLayout(k.layout);
                setWidth(Math.round(Number(k.width) * 1000));
                setLength(Math.round(Number(k.length) * 1000));
                setHeight(Math.round(Number(k.height) * 1000));
                if (k.metadata?.brandId) {
                  setBrandId(k.metadata.brandId as BrandId);
                }
              }
              setLoading(false);
            });
        }}
      />

      {/* Eco Score Panel (side panel) */}
      {showEcoScore && (
        <div className="fixed right-0 top-28 bottom-0 z-20 border-l border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="relative h-full">
            <button
              onClick={() => setShowEcoScore(false)}
              className="absolute top-2 right-2 z-10 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <EcoScorePanel items={[]} />
          </div>
        </div>
      )}

      {/* Product Pairings Panel (side panel) */}
      {showProductPairings && (
        <div className="fixed right-0 top-28 bottom-0 z-20 border-l border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="relative h-full">
            <button
              onClick={() => setShowProductPairings(false)}
              className="absolute top-2 right-2 z-10 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ProductPairingsPanel cabinetStyle={style} recommendations={[]} />
          </div>
        </div>
      )}

      {/* Dimension Wizard Modal */}
      {showDimensionWizard && (
        <DimensionWizard
          onComplete={(dimensions) => {
            // Apply first wall as width, second as depth, height directly
            if (dimensions.walls.length >= 2) {
              handleChange(setWidth, Math.round(dimensions.walls[0]!.length * 10));
              handleChange(setLength, Math.round(dimensions.walls[1]!.length * 10));
            }
            handleChange(setHeight, Math.round(dimensions.height * 10));
            setShowDimensionWizard(false);
          }}
          onCancel={() => setShowDimensionWizard(false)}
          initialDimensions={{
            shape:
              layout === 'l_shaped'
                ? 'l_shaped'
                : layout === 'u_shaped'
                  ? 'u_shaped'
                  : 'rectangular',
            height: height / 10,
          }}
        />
      )}

      {/* 3 implantations idéales (générateur algorithmique) */}
      <LayoutProposalsDialog
        engine={engine}
        open={showProposals}
        onClose={() => setShowProposals(false)}
        onApplied={() => setHasChanges(true)}
        openings={openingsToSpans(openings, layout, {
          width: width / 1000,
          depth: length / 1000,
        })}
      />

      {/* Ouvertures (portes / portes-fenêtres / fenêtres) */}
      <OpeningsPanel
        open={showOpenings}
        onClose={() => setShowOpenings(false)}
        openings={openings}
        wallCount={wallCount}
        onChange={(next) => {
          setOpenings(next);
          setHasChanges(true);
        }}
      />

      {/* Design Diff Overlay */}
      <DesignDiffOverlay
        currentItems={[]}
        comparedItems={[]}
        visible={showDesignDiff}
        onClose={() => setShowDesignDiff(false)}
      />

      {/* Quote to Partner Modal */}
      <QuoteToPartnerModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        kitchenId={kitchenId}
        projectName={kitchenName || t('designer.unnamedKitchen', 'Cuisine sans nom')}
        designData={{
          items: [],
          dimensions: {
            shape: 'rectangular',
            walls: [],
            height: height / 10,
            obstacles: [],
          },
          budget: budgetTarget,
          style,
        }}
      />

      {/* Style Transfer Modal */}
      <StyleTransferModal
        isOpen={showStyleTransfer}
        onClose={() => setShowStyleTransfer(false)}
        onApplyStyle={(extraction) => {
          handleChange(setStyle, extraction.style);
          setShowStyleTransfer(false);
        }}
      />

      {/* LiDAR Scanner */}
      {showLiDARScanner && (
        <LiDARScanner
          onScanComplete={(result) => {
            handleChange(setWidth, result.dimensions.width);
            handleChange(setLength, result.dimensions.length);
            handleChange(setHeight, result.dimensions.height);
            setShowLiDARScanner(false);
          }}
          onCancel={() => setShowLiDARScanner(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function DimensionInput({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}): React.ReactElement {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="flex">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={500}
          max={15000}
          className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-l text-sm bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none"
        />
        <span className="px-2 py-1.5 bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r text-sm text-gray-600 dark:text-gray-300">
          {unit}
        </span>
      </div>
    </div>
  );
}
