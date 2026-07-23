/**
 * Applies a design-assistant "style suggestion" to the live scene.
 *
 * The assistant's `suggest_style_improvement` tool only carries {aspect, reason} — no
 * structured color — so the "Appliquer" button was wired to nothing (onToolAction was
 * never passed down from KitchenDesignerPage → AssistantSurface → ChatPanel, and even if
 * it had been, there was no handler). This turns "je veux la couleur noire pour les
 * meubles" into a real repaint: extract a palette color from the free-text reason, then
 * apply it to the furniture façades via the SAME primitive the color-picker uses
 * (buildCatalogMaterial + MaterialLibrary.applyMaterial).
 *
 * Limitation (honest): color is parsed from free text because the tool has no color field.
 * A structured color on the tool (backend) would be more robust — tracked separately.
 */
import { MaterialLibrary } from '@kitchenxpert/3d-engine';

import { buildCatalogMaterial } from './build-catalog-material';
import { CATALOG_COLOR_PALETTE } from './catalog-color-palette';

import type { KitchenEngine } from '@kitchenxpert/3d-engine';

const materialLibrary = new MaterialLibrary();

/**
 * Should this scene object be repainted by a "furniture color" request? We use the same
 * EXCLUSION convention the rest of the designer uses (ChatPanel scene filter): everything
 * placed EXCEPT structure (walls, floor) and appliances (a fridge/oven has its own finish,
 * not a cabinet façade). This is more robust than whitelisting cabinet type strings, which
 * differ across the add paths (catalog drop, auto-complete, AI).
 */
function isFurniture(ud: { type?: string; isKitchenStructure?: boolean }): boolean {
  if (ud.isKitchenStructure) {
    return false;
  }
  return ud.type !== 'wall' && ud.type !== 'floor' && ud.type !== 'appliance';
}

/**
 * Extract a known palette color KEY from free French text. Keys are French color words
 * (noir, blanc, anthracite…); we match at a word start (`\bnoir` also catches "noire",
 * "blanc" catches "blanche") and skip 1-2 char keys to avoid mid-word false positives.
 * Longest key first so "anthracite" wins over any shorter partial.
 */
export function extractColorKey(text: string): string | null {
  const keys = Object.keys(CATALOG_COLOR_PALETTE)
    .filter((k) => k.length >= 3)
    .sort((a, b) => b.length - a.length);
  return keys.find((k) => new RegExp(`\\b${k}`, 'i').test(text)) ?? null;
}

export interface ChatStyleResult {
  applied: boolean;
  colorKey?: string;
  count?: number;
}

/**
 * Apply a design-assistant style suggestion. Today: color/material changes only
 * (aspect ~ "couleurs"/"materiaux") → repaint furniture façades. Returns whether anything
 * was applied so the caller can toast success vs "couldn't apply automatically".
 */
export function applyChatStyleSuggestion(
  engine: KitchenEngine,
  toolName: string,
  toolInput: Record<string, unknown>
): ChatStyleResult {
  if (toolName !== 'suggest_style_improvement') {
    return { applied: false };
  }
  const aspect = String(toolInput.aspect ?? '').toLowerCase();
  const reason = String(toolInput.reason ?? '');
  if (!aspect.includes('couleur') && !aspect.includes('materi')) {
    return { applied: false };
  }
  const colorKey = extractColorKey(`${aspect} ${reason}`);
  if (!colorKey) {
    return { applied: false };
  }

  const material = buildCatalogMaterial(colorKey);
  let count = 0;
  // getAllObjects() is a Map<id, Object3D> (one entry per placed item) — iterate values().
  for (const obj of engine.scene.getAllObjects().values()) {
    const ud = obj.userData as { type?: string; isKitchenStructure?: boolean };
    if (isFurniture(ud)) {
      materialLibrary.applyMaterial(obj, material);
      obj.userData.materialId = material.id;
      count += 1;
    }
  }
  return { applied: count > 0, colorKey, count };
}
