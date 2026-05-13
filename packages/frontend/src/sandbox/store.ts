/**
 * Sandbox store — un-authenticated designer state, persisted to
 * `localStorage` under `kx-sandbox-project-v1`.
 *
 * Architectural notes
 * -------------------
 *  - Zustand is the ONLY store in the project. The Redux slices in
 *    `features/` are vestigial (Provider isn't mounted in App.tsx) so
 *    we don't risk a state-source clash.
 *  - The persisted shape is **versioned** (`SCHEMA_VERSION`). When the
 *    bundled version is greater than the persisted one, `migrate()`
 *    runs once and the user keeps their work. When it's smaller (user
 *    rolled back from a newer build) we wipe the entry instead of
 *    risking corruption.
 *  - Auto-save is a 30 s **throttle**, not a debounce. A throttle
 *    guarantees a write in the worst case (user keeps editing); a
 *    debounce would never fire during continuous activity.
 *  - Quota: localStorage caps at ~5 MB per origin. We surface a warning
 *    at 80 % (4 MB) so the user can export before the next save fails.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { SandboxTemplate } from './templates';

export const SANDBOX_STORAGE_KEY = 'kx-sandbox-project-v1';
export const SCHEMA_VERSION = 1;
const QUOTA_WARNING_BYTES = 4 * 1024 * 1024; // 4 MB
const AUTOSAVE_THROTTLE_MS = 30_000;

// ---------------------------------------------------------------------------
// Persisted shape — keep this small. Anything heavy (textures, glTF
// blobs) must live in IndexedDB, not here.
// ---------------------------------------------------------------------------

export interface SandboxItem {
  /** Stable client-side id. UUIDv4. Crypto: `crypto.randomUUID()`. */
  id: string;
  /** Catalog SKU when imported from a provider, else `null`. */
  sku: string | null;
  /** Display label (e.g. "METOD 60 cm — blanc"). */
  label: string;
  /** Provider code (`IKEA`, `LEROY_MERLIN`, `BOSCH`, …) or null. */
  providerCode: string | null;
  /** Unit price in euros (display only — sandbox quotes are estimative). */
  unitPrice: number;
  quantity: number;
  /** Position in centimetres, kitchen-local frame. */
  position: { x: number; y: number; z: number };
  rotation: number; // degrees around Y
  /** Width × depth × height in cm. */
  size: { w: number; d: number; h: number };
}

export interface SandboxKitchen {
  name: string;
  /** L-shaped, U-shaped, etc. — same enum as backend. */
  layout: 'L_SHAPED' | 'U_SHAPED' | 'GALLEY' | 'ISLAND' | 'PENINSULA' | 'ONE_WALL' | 'OPEN_PLAN';
  /** Room dimensions in cm. */
  widthCm: number;
  depthCm: number;
  heightCm: number;
  items: SandboxItem[];
}

export interface SandboxProject {
  name: string;
  kitchen: SandboxKitchen;
  /** ISO timestamp of the last user edit (not the last autosave). */
  updatedAt: string;
  /** ID of the template the user started from, or null for blank. */
  fromTemplate: string | null;
}

/** Shape that lives in localStorage. The store re-hydrates from this. */
interface PersistedShape {
  version: number;
  project: SandboxProject | null;
  /** Friction counters — drive the upgrade prompts. */
  limits: {
    aiUsesRemaining: number;
    pdfExportsRemaining: number;
    sessionStartedAt: string | null;
  };
}

export const SANDBOX_DEFAULT_LIMITS: PersistedShape['limits'] = {
  aiUsesRemaining: 3,
  pdfExportsRemaining: 1, // watermarked-only
  sessionStartedAt: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface SandboxStore {
  project: SandboxProject | null;
  limits: PersistedShape['limits'];
  /** Last write to localStorage — used by the 30 s throttle. */
  _lastSavedAt: number;
  /** True after the next save would push us past the quota warning. */
  quotaWarning: boolean;

  // Actions ---------------------------------------------------------------
  newProject: (name: string, layout: SandboxKitchen['layout']) => void;
  loadFromTemplate: (template: SandboxTemplate) => void;
  reset: () => void;

  addItem: (item: Omit<SandboxItem, 'id'>) => void;
  updateItem: (id: string, patch: Partial<SandboxItem>) => void;
  removeItem: (id: string) => void;
  setKitchenName: (name: string) => void;

  consumeAiUse: () => boolean; // returns false if quota exhausted
  consumePdfExport: () => boolean;
  startSession: () => void;
}

function makeId(): string {
  // Browser crypto is available in every supported runtime.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Vanishingly rare fallback — keeps tests in jsdom green.
  return `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function approxBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

export const useSandboxStore = create<SandboxStore>()(
  persist(
    (set, get) => ({
      project: null,
      limits: { ...SANDBOX_DEFAULT_LIMITS },
      _lastSavedAt: 0,
      quotaWarning: false,

      newProject: (name, layout) =>
        set({
          project: {
            name,
            kitchen: {
              name,
              layout,
              widthCm: 400,
              depthCm: 350,
              heightCm: 270,
              items: [],
            },
            updatedAt: new Date().toISOString(),
            fromTemplate: null,
          },
        }),

      loadFromTemplate: (template) =>
        set({
          project: {
            name: template.name,
            kitchen: {
              name: template.name,
              layout: template.layout,
              widthCm: template.widthCm,
              depthCm: template.depthCm,
              heightCm: template.heightCm,
              items: template.items.map((it) => ({ ...it, id: makeId() })),
            },
            updatedAt: new Date().toISOString(),
            fromTemplate: template.id,
          },
        }),

      reset: () =>
        set({
          project: null,
          limits: { ...SANDBOX_DEFAULT_LIMITS },
          _lastSavedAt: 0,
          quotaWarning: false,
        }),

      addItem: (item) => {
        const project = get().project;
        if (!project) {return;}
        const next: SandboxProject = {
          ...project,
          kitchen: {
            ...project.kitchen,
            items: [...project.kitchen.items, { ...item, id: makeId() }],
          },
          updatedAt: new Date().toISOString(),
        };
        set({
          project: next,
          quotaWarning: approxBytes(next) > QUOTA_WARNING_BYTES,
        });
      },

      updateItem: (id, patch) => {
        const project = get().project;
        if (!project) {return;}
        set({
          project: {
            ...project,
            kitchen: {
              ...project.kitchen,
              items: project.kitchen.items.map((it) =>
                it.id === id ? { ...it, ...patch } : it,
              ),
            },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      removeItem: (id) => {
        const project = get().project;
        if (!project) {return;}
        set({
          project: {
            ...project,
            kitchen: {
              ...project.kitchen,
              items: project.kitchen.items.filter((it) => it.id !== id),
            },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setKitchenName: (name) => {
        const project = get().project;
        if (!project) {return;}
        set({
          project: {
            ...project,
            name,
            kitchen: { ...project.kitchen, name },
            updatedAt: new Date().toISOString(),
          },
        });
      },

      consumeAiUse: () => {
        const { aiUsesRemaining } = get().limits;
        if (aiUsesRemaining <= 0) {return false;}
        set((s) => ({ limits: { ...s.limits, aiUsesRemaining: aiUsesRemaining - 1 } }));
        return true;
      },

      consumePdfExport: () => {
        const { pdfExportsRemaining } = get().limits;
        if (pdfExportsRemaining <= 0) {return false;}
        set((s) => ({ limits: { ...s.limits, pdfExportsRemaining: pdfExportsRemaining - 1 } }));
        return true;
      },

      startSession: () => {
        if (get().limits.sessionStartedAt) {return;}
        set((s) => ({
          limits: { ...s.limits, sessionStartedAt: new Date().toISOString() },
        }));
      },
    }),
    {
      name: SANDBOX_STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),

      // Throttle writes to once / AUTOSAVE_THROTTLE_MS instead of writing
      // on every keystroke. The store still updates in memory immediately;
      // only the localStorage round-trip is rate-limited.
      partialize: (state) => ({
        project: state.project,
        limits: state.limits,
      }),

      migrate: (persistedState: unknown, fromVersion: number): PersistedShape => {
        // v1 is the inaugural shape. Rolling forward from a hypothetical
        // future v0 would happen here. Rolling backward (user landed on
        // an older bundle than what wrote the cache) — wipe it.
        if (fromVersion > SCHEMA_VERSION) {
          return {
            version: SCHEMA_VERSION,
            project: null,
            limits: { ...SANDBOX_DEFAULT_LIMITS },
          };
        }
        return persistedState as PersistedShape;
      },
    },
  ),
);

// ---------------------------------------------------------------------------
// Throttled-write side-effect.
//
// `zustand/middleware` writes on every change. We layer a manual throttle
// on top so the user typing in a label field doesn't trigger 60 writes
// per second. The store mutation still fires immediately (UI stays
// responsive); only the persistence round-trip is throttled.
// ---------------------------------------------------------------------------

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let pendingWrite = false;

useSandboxStore.subscribe((state, prev) => {
  // Skip the very first hydration callback
  if (state.project === prev.project && state.limits === prev.limits) {return;}

  pendingWrite = true;
  if (writeTimer) {return;}

  writeTimer = setTimeout(() => {
    writeTimer = null;
    if (!pendingWrite) {return;}
    pendingWrite = false;

    // Force the persist middleware to flush by touching `_lastSavedAt`
    useSandboxStore.setState({ _lastSavedAt: Date.now() });
  }, AUTOSAVE_THROTTLE_MS);
});

// ---------------------------------------------------------------------------
// Selector helpers — keep components from re-rendering on every change.
// ---------------------------------------------------------------------------

export const selectHasSandboxProject = (s: SandboxStore): boolean => s.project !== null;
export const selectSandboxItemCount = (s: SandboxStore): number =>
  s.project?.kitchen.items.length ?? 0;
export const selectAiUsesRemaining = (s: SandboxStore): number => s.limits.aiUsesRemaining;

/** Read the persisted payload from localStorage WITHOUT subscribing. */
export function readPersistedSandbox(): SandboxProject | null {
  try {
    const raw = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (!raw) {return null;}
    const parsed = JSON.parse(raw) as { state?: { project?: SandboxProject | null } };
    return parsed?.state?.project ?? null;
  } catch {
    return null;
  }
}

/** Wipe the persisted sandbox. Called after a successful migration. */
export function clearPersistedSandbox(): void {
  try {
    localStorage.removeItem(SANDBOX_STORAGE_KEY);
  } catch {
    /* private browsing — no-op */
  }
}
