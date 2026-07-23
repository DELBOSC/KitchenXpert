import { LayoutGenerator } from '@kitchenxpert/3d-engine';

import type {
  KitchenEngine,
  LayoutProposal,
  RoomConfig,
  WallOpeningSpan,
} from '@kitchenxpert/3d-engine';
import type * as THREE from 'three';

export interface ProposalOptions {
  budget?: { min: number; max: number };
  mustHave?: string[];
  priority?: 'ergonomics' | 'storage' | 'budget' | 'aesthetics';
  /** Door/window footprints the generator must keep clear (Slice 3). */
  openings?: WallOpeningSpan[];
}

/**
 * Build the AI RoomConfig from the LIVE engine: the room box (roomWidth/Depth/Height, in
 * metres) plus the wall meshes currently in the scene. Mirrors AIAssistantPanel.extractRoomConfig.
 */
export function buildRoomConfig(engine: KitchenEngine): RoomConfig {
  const walls: THREE.Object3D[] = [];
  engine.scene.getThreeScene().traverse((child) => {
    if ((child.userData as { type?: string }).type === 'wall') {
      walls.push(child);
    }
  });
  return {
    width: engine.roomWidth,
    depth: engine.roomDepth,
    height: engine.roomHeight,
    walls,
  };
}

/**
 * Generate up to 5 DISTINCT, principled layout proposals from the room's wall dimensions,
 * using the engine's brand profile. 100% deterministic — no LLM. The generator encodes the
 * kitchen design principles itself: work triangle (NF DTU 36.2), clearances (≥900 mm),
 * typologies (linéaire/L/U/couloir/îlot) filtered by room size, and ergonomic scoring
 * (see LayoutGenerator + AIAssistant + SmartPlacement). Proposals come sorted by overall score.
 *
 * Defaults: mustHave = [] → the generator uses évier/plaque/frigo; budget uncapped;
 * priority = ergonomics. The room must be set up (walls built) before calling.
 */
export function generateLayoutProposals(
  engine: KitchenEngine,
  opts: ProposalOptions = {}
): LayoutProposal[] {
  const generator = new LayoutGenerator(engine.brandProfile);
  return generator.generateProposals({
    room: buildRoomConfig(engine),
    budget: opts.budget ?? { min: 0, max: Number.MAX_SAFE_INTEGER },
    mustHave: opts.mustHave ?? [],
    priority: opts.priority ?? 'ergonomics',
    ...(opts.openings ? { openings: opts.openings } : {}),
  });
}
