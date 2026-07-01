import { Palette, Check, Sparkles, RotateCw } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Skeleton } from '../ui';
import { CATALOG_COLOR_PALETTE } from './catalog-color-palette';

/**
 * Premium catalog color-picker (Palier 2, Option B). Presentational: the parent
 * (PropertiesPanel) owns the /colors fetch + status and the apply/selection
 * (userData.materialId is the single source of truth, cf R2). This renders the
 * grid (photo `imageUrl` or flat palette tint, unified frame), the color/material
 * subgroups, the states, the trend badge and the contextual price line (R1).
 */

/** One purchasable color choice, from GET /catalog/products/:sku/colors. */
export interface ColorOption {
  key: string;
  label: string;
  kind: 'color' | 'material';
  priceFrom: number;
  representativeSku: string;
  imageUrl?: string;
  score: number;
  skuCount: number;
}

/** The states in which the section is rendered (empty/404/no-sku → parent hides it). */
export type CatalogColorStatus = 'loading' | 'loaded' | 'error';

interface CatalogColorSectionProps {
  colors: ColorOption[];
  status: CatalogColorStatus;
  /** Show skeleton only past the anti-flash delay (parent-gated, >150ms). */
  showSkeleton: boolean;
  /** userData.materialId — a `catalog-<key>` when a catalog color is active. */
  selectedMaterialId: string | null;
  onApply: (key: string) => void;
  onRetry: () => void;
}

const NEUTRAL_SCORE = 50;

const euro = (n: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const hexOf = (key: string): string =>
  (CATALOG_COLOR_PALETTE as Record<string, { hex: string }>)[key]?.hex ?? '#8A8D91';

// ── Swatch ──────────────────────────────────────────────────────────────────

interface SwatchProps {
  option: ColorOption;
  selected: boolean;
  trend: boolean;
  tabIndex: number;
  buttonRef: (el: HTMLButtonElement | null) => void;
  onApply: () => void;
  onPreview: () => void;
  onPreviewEnd: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

function Swatch({
  option,
  selected,
  trend,
  tabIndex,
  buttonRef,
  onApply,
  onPreview,
  onPreviewEnd,
  onKeyDown,
}: SwatchProps): React.ReactElement {
  const isMaterial = option.kind === 'material';
  // Grain: subtle for colors, stronger + directional for materials (reads as a
  // finish sample, not a "bad brown color") — the mixed photo/flat harmoniser.
  const grain = isMaterial
    ? 'repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 4px)'
    : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 0.5px, transparent 0.5px 3px)';

  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${option.label} — à partir de ${euro(option.priceFrom)}`}
      tabIndex={tabIndex}
      onClick={() => {
        onApply();
        onPreview();
      }}
      onMouseEnter={onPreview}
      onFocus={onPreview}
      onMouseLeave={onPreviewEnd}
      onBlur={onPreviewEnd}
      onKeyDown={onKeyDown}
      className={`group relative aspect-square w-full overflow-hidden rounded-md shadow-sm outline-none transition-transform duration-150 ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-kx-brand-from focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 ${
        selected
          ? 'z-10 scale-[1.03] ring-2 ring-kx-brand-strong ring-offset-2 ring-offset-white dark:ring-kx-brand-from dark:ring-offset-gray-800'
          : 'ring-1 ring-inset ring-black/10 hover:-translate-y-px hover:ring-black/20 dark:ring-white/10 dark:hover:ring-white/20'
      }`}
    >
      {/* Media — photo (priority) OR flat palette tint (unified frame) */}
      {option.imageUrl ? (
        <img
          src={option.imageUrl}
          loading="lazy"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundColor: hexOf(option.key) }}
        />
      )}
      {/* Sheen — turns a flat pastille into a material chip; harmless over photos */}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10"
      />
      {!option.imageUrl && (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: grain, opacity: isMaterial ? 0.9 : 1 }}
        />
      )}

      {/* Selection double-stroke: outer brand ring (offset, pops on light tints) +
          this inner light liseré (pops on dark tints) → contrast on ANY swatch */}
      {selected && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[5px] ring-1 ring-inset ring-white/85"
        />
      )}

      {/* Trend medallion — single amber accent (§5.1 isolated warm) on a dark chip */}
      {trend && (
        <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-kx-accent-warm backdrop-blur-sm">
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
          <span className="sr-only">Tendance</span>
        </span>
      )}

      {/* Selected check medallion */}
      {selected && (
        <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-kx-brand-strong text-white shadow dark:bg-kx-brand-from">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      )}
    </button>
  );
}

// ── Subgroup ────────────────────────────────────────────────────────────────

interface SubgroupProps {
  title: string;
  options: ColorOption[];
  showTitle: boolean;
  selectedMaterialId: string | null;
  trendKey: string | null;
  rovingKey: string | null;
  registerRef: (key: string) => (el: HTMLButtonElement | null) => void;
  onApply: (key: string) => void;
  onPreview: (key: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, key: string) => void;
}

function Subgroup({
  title,
  options,
  showTitle,
  selectedMaterialId,
  trendKey,
  rovingKey,
  registerRef,
  onApply,
  onPreview,
  onKeyDown,
}: SubgroupProps): React.ReactElement | null {
  if (options.length === 0) {
    return null;
  }
  return (
    <div className="mb-2">
      {showTitle && (
        <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <Swatch
            key={o.key}
            option={o}
            selected={selectedMaterialId === `catalog-${o.key}`}
            trend={trendKey === o.key}
            tabIndex={rovingKey === o.key ? 0 : -1}
            buttonRef={registerRef(o.key)}
            onApply={() => onApply(o.key)}
            onPreview={() => onPreview(o.key)}
            onPreviewEnd={() => onPreview(null)}
            onKeyDown={(e) => onKeyDown(e, o.key)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────

export default function CatalogColorSection({
  colors,
  status,
  showSkeleton,
  selectedMaterialId,
  onApply,
  onRetry,
}: CatalogColorSectionProps): React.ReactElement {
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const refs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const colorOpts = useMemo(() => colors.filter((c) => c.kind === 'color'), [colors]);
  const materialOpts = useMemo(() => colors.filter((c) => c.kind === 'material'), [colors]);
  // Visual order for keyboard roving: colors, then materials.
  const ordered = useMemo(() => [...colorOpts, ...materialOpts], [colorOpts, materialOpts]);

  const trendKey = useMemo(() => {
    if (colors.length === 0) {
      return null;
    }
    const top = colors.reduce((a, b) => (b.score > a.score ? b : a));
    return top.score > NEUTRAL_SCORE ? top.key : null;
  }, [colors]);

  const minPrice = useMemo(
    () => (colors.length ? Math.min(...colors.map((c) => c.priceFrom)) : 0),
    [colors]
  );

  const activeOption = useMemo(
    () => colors.find((c) => selectedMaterialId === `catalog-${c.key}`) ?? null,
    [colors, selectedMaterialId]
  );

  // Price line (R1): preview (hover/focus/tap) → active selection → gamme min.
  const shown = previewKey ? (colors.find((c) => c.key === previewKey) ?? null) : activeOption;
  let priceText = '';
  if (shown) {
    priceText = `${shown.label} — à partir de ${euro(shown.priceFrom)} · ${shown.skuCount} réf.`;
  } else if (colors.length) {
    priceText = `À partir de ${euro(minPrice)}`;
  }

  // Subtle crossfade on price change (dependency-free, reduced-motion safe).
  const [faded, setFaded] = useState(true);
  useEffect(() => {
    setFaded(false);
    const id = requestAnimationFrame(() => setFaded(true));
    return () => cancelAnimationFrame(id);
  }, [priceText]);

  // Roving tabindex anchor: the active catalog color, else the first swatch.
  const rovingKey = activeOption?.key ?? ordered[0]?.key ?? null;

  const registerRef = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) {
      refs.current.set(key, el);
    } else {
      refs.current.delete(key);
    }
  };

  // Arrow-key navigation: move focus AND apply (radiogroup convention → live tint).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, key: string) => {
    const i = ordered.findIndex((o) => o.key === key);
    if (i < 0) {
      return;
    }
    let next = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (i + 1) % ordered.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (i - 1 + ordered.length) % ordered.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = ordered.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextOption = ordered[next];
    if (!nextOption) {
      return;
    }
    const nextKey = nextOption.key;
    onApply(nextKey);
    setPreviewKey(nextKey);
    refs.current.get(nextKey)?.focus();
  };

  return (
    <section aria-label="Couleurs catalogue" className="mb-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Palette className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Couleurs catalogue
        </h3>
      </div>

      {status === 'loading' && showSkeleton && (
        <div className="grid grid-cols-3 gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-square w-full bg-gray-200/70 dark:bg-white/[0.04]"
            />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600">
          <span className="text-xs text-gray-500 dark:text-gray-400">Couleurs indisponibles</span>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 text-xs font-medium text-kx-brand-strong hover:underline dark:text-kx-brand-from"
          >
            <RotateCw className="h-3 w-3" aria-hidden />
            Réessayer
          </button>
        </div>
      )}

      {status === 'loaded' && (
        <>
          <div role="radiogroup" aria-label="Couleurs catalogue">
            <Subgroup
              title="Couleurs"
              options={colorOpts}
              showTitle={colorOpts.length > 0 && materialOpts.length > 0}
              selectedMaterialId={selectedMaterialId}
              trendKey={trendKey}
              rovingKey={rovingKey}
              registerRef={registerRef}
              onApply={onApply}
              onPreview={setPreviewKey}
              onKeyDown={handleKeyDown}
            />
            <Subgroup
              title="Finitions"
              options={materialOpts}
              showTitle={colorOpts.length > 0 && materialOpts.length > 0}
              selectedMaterialId={selectedMaterialId}
              trendKey={trendKey}
              rovingKey={rovingKey}
              registerRef={registerRef}
              onApply={onApply}
              onPreview={setPreviewKey}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* R1 — contextual price line (fixed height, aria-hidden, tactile-safe) */}
          <div
            aria-hidden
            className={`mt-1 h-4 truncate text-[11px] leading-4 text-gray-600 transition-opacity duration-100 ease-out motion-reduce:transition-none dark:text-gray-300 ${
              faded ? 'opacity-100' : 'opacity-60'
            }`}
          >
            {priceText}
          </div>
        </>
      )}
    </section>
  );
}
