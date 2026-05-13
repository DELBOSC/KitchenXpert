/**
 * Promote a sandbox project (in localStorage) to a real, persisted
 * project owned by the currently-authenticated user.
 *
 * The backend endpoint validates the payload with Zod (see
 * packages/backend/src/api/routes/project-routes.ts) so the shape we
 * send here is the one the validator expects — keep them in sync.
 *
 * Returns the fresh project's id on success. Throws a descriptive
 * Error on failure so the banner can show it.
 */
import type { SandboxProject } from './store';

const API_BASE = (import.meta.env?.VITE_API_URL as string) || '/api/v1';

interface ImportSandboxResponse {
  success: boolean;
  data?: { projectId: string; kitchenId: string };
  error?: { message: string };
}

export async function migrateSandboxToAccount(
  sandbox: SandboxProject,
): Promise<string> {
  // Cookies (httpOnly access + refresh) are sent automatically by
  // the browser when the request is same-origin OR when CORS is set
  // up with credentials. The backend's CORS middleware allows it.
  const res = await fetch(`${API_BASE}/projects/import-sandbox`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: {
        name: sandbox.name,
        fromTemplate: sandbox.fromTemplate,
        kitchen: {
          name: sandbox.kitchen.name,
          layout: sandbox.kitchen.layout,
          widthCm: sandbox.kitchen.widthCm,
          depthCm: sandbox.kitchen.depthCm,
          heightCm: sandbox.kitchen.heightCm,
          items: sandbox.kitchen.items.map((it) => ({
            sku: it.sku,
            label: it.label,
            providerCode: it.providerCode,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            position: it.position,
            rotation: it.rotation,
            size: it.size,
          })),
        },
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Import failed (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as ImportSandboxResponse;
  if (!json.success || !json.data?.projectId) {
    throw new Error(json.error?.message || 'Import failed');
  }
  return json.data.projectId;
}
