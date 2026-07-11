/// <reference types="vite/client" />

// Explicitly type the VITE_* env vars the app reads. Without this, Vite's
// `ImportMetaEnv` index signature makes `import.meta.env.VITE_*` resolve to
// `any`, which propagates no-unsafe-* lint warnings to every consumer
// (e.g. `const API_URL = import.meta.env.VITE_API_URL || '/api/v1'`).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  /** Build-time flag: when set, registers the dev-only /dev/primitives visual gallery. */
  readonly VITE_DEV_GALLERY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
