/**
 * useDesignerStore — single hook every designer component reads from,
 * regardless of whether the user is in sandbox mode or signed in.
 *
 * The auth-backed branch is intentionally NOT a Zustand store — the
 * authenticated designer talks to the backend via REST + React Query
 * (see `hooks/useKitchenEngine.ts`). Wrapping the API result in a
 * Zustand-shaped facade lets us keep the call sites identical.
 *
 * If you need to read a piece of state that doesn't have a sandbox
 * equivalent (e.g. collaboration cursors), call the underlying
 * authenticated hook directly and gate it on `isSandbox`.
 */
import { useSandboxStore, type SandboxItem, type SandboxKitchen } from './store';
import { useAuth } from '../contexts/AuthContext';

export interface DesignerStoreView {
  /** True when the user is browsing /designer/sandbox/* */
  isSandbox: boolean;
  /** True for /designer/sandbox even if logged in (we keep showing sandbox until they import). */
  kitchen: SandboxKitchen | null;
  items: SandboxItem[];
  // Mutations — these are no-ops in the auth branch until the backend
  // adapter is wired (TODO: see useAuthDesignerStore below).
  addItem: (item: Omit<SandboxItem, 'id'>) => void;
  updateItem: (id: string, patch: Partial<SandboxItem>) => void;
  removeItem: (id: string) => void;
}

/** Detect sandbox-mode from the URL. SSR-safe. */
function isOnSandboxRoute(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.location.pathname.startsWith('/designer/sandbox');
}

/**
 * Main facade. Selects between the sandbox Zustand store and the
 * (TODO) authenticated React Query adapter.
 *
 * For now the auth branch returns an empty placeholder so the file
 * compiles and existing designer pages aren't broken. The sandbox
 * branch is fully functional.
 */
export function useDesignerStore(): DesignerStoreView {
  const auth = useAuth();
  const sandboxRoute = isOnSandboxRoute();
  const useSandbox = sandboxRoute || !auth.isAuthenticated;

  // Always call the hook (rules-of-hooks). We just pick which slice
  // we expose.
  const sandbox = useSandboxStore((s) => ({
    project: s.project,
    addItem: s.addItem,
    updateItem: s.updateItem,
    removeItem: s.removeItem,
  }));

  if (useSandbox) {
    return {
      isSandbox: true,
      kitchen: sandbox.project?.kitchen ?? null,
      items: sandbox.project?.kitchen.items ?? [],
      addItem: sandbox.addItem,
      updateItem: sandbox.updateItem,
      removeItem: sandbox.removeItem,
    };
  }

  // TODO: wire the authenticated adapter once the existing designer
  // hooks are refactored. The shape must match `DesignerStoreView`.
  // Example skeleton:
  //
  //   const { data: kitchen } = useKitchenQuery(kitchenId);
  //   const { mutate: addItemMut } = useAddItemMutation(kitchenId);
  //   return {
  //     isSandbox: false,
  //     kitchen: kitchen ?? null,
  //     items: kitchen?.items ?? [],
  //     addItem: (it) => addItemMut(it),
  //     ...
  //   };
  //
  // Until then we surface an empty view so the call sites still compile.
  return {
    isSandbox: false,
    kitchen: null,
    items: [],
    addItem: () => undefined,
    updateItem: () => undefined,
    removeItem: () => undefined,
  };
}
