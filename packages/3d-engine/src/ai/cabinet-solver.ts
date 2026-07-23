import * as THREE from 'three';
import type { BrandProfile } from '../config/brand-profiles';
import { mmToM } from '../config/brand-profiles';
import type { PlacedItem3D } from './ai-assistant';
import type { WallSegment, WallSide, WallOpeningSpan } from './wall-analysis';

interface PlacementConstraints {
  budget?: { min: number; max: number };
  mustHave: string[];
}

/**
 * Solveur de placement de caissons le long d'un segment de mur
 */
export class CabinetSolver {
  private brandProfile: BrandProfile;

  constructor(brandProfile: BrandProfile) {
    this.brandProfile = brandProfile;
  }

  /**
   * Remplit un segment de mur avec des caissons optimaux
   */
  fillWallSegment(
    segment: WallSegment,
    constraints: PlacementConstraints,
    budget: number
  ): PlacedItem3D[] {
    const items: PlacedItem3D[] = [];
    const availableWidths = [...this.brandProfile.base.availableWidths].sort((a, b) => b - a);
    const depthM = mmToM(this.brandProfile.base.defaultDepth);
    const heightM = mmToM(this.brandProfile.base.totalHeight);

    // Filter available widths based on budget constraints if present
    const budgetMax = constraints.budget?.max ?? budget;
    let runningCost = 0;

    let remainingLength = segment.length;
    let currentPos = segment.startX;

    while (remainingLength > 0.2) {
      const bestWidth = this.selectOptimalWidth(remainingLength, availableWidths);
      if (!bestWidth) break;

      const itemPrice = this.estimatePrice('base_cabinet', bestWidth);

      // Stop placing cabinets if the next one would exceed the budget cap
      if (budgetMax > 0 && runningCost + itemPrice > budgetMax) {
        // Try a smaller width that fits the remaining budget
        const affordableWidth = this.selectAffordableWidth(
          remainingLength,
          availableWidths,
          budgetMax - runningCost
        );
        if (!affordableWidth) break;

        const affordablePrice = this.estimatePrice('base_cabinet', affordableWidth);
        const widthM = mmToM(affordableWidth);
        const position = this.segmentToWorldPosition(
          segment.wallSide,
          currentPos + widthM / 2,
          depthM
        );

        items.push({
          id: `gen-base-${segment.wallSide}-${currentPos.toFixed(2)}`,
          type: 'base_cabinet',
          position,
          rotation: this.getWallRotation(segment.wallSide),
          dimensions: { width: widthM, height: heightM, depth: depthM },
          price: affordablePrice,
        });

        runningCost += affordablePrice;
        currentPos += widthM;
        remainingLength -= widthM;
        continue;
      }

      const widthM = mmToM(bestWidth);
      const position = this.segmentToWorldPosition(
        segment.wallSide,
        currentPos + widthM / 2,
        depthM
      );

      items.push({
        id: `gen-base-${segment.wallSide}-${currentPos.toFixed(2)}`,
        type: 'base_cabinet',
        position,
        rotation: this.getWallRotation(segment.wallSide),
        dimensions: { width: widthM, height: heightM, depth: depthM },
        price: itemPrice,
      });

      runningCost += itemPrice;
      currentPos += widthM;
      remainingLength -= widthM;
    }

    return items;
  }

  /**
   * Select the largest width that fits both the available space and the remaining budget.
   */
  private selectAffordableWidth(
    availableSpaceM: number,
    widths: number[],
    remainingBudget: number
  ): number | null {
    const spaceMm = Math.round(availableSpaceM * 1000);
    for (const w of widths) {
      if (w <= spaceMm && this.estimatePrice('base_cabinet', w) <= remainingBudget) {
        return w;
      }
    }
    return null;
  }

  /**
   * Place les appareils essentiels
   */
  placeEssentialAppliances(
    segments: WallSegment[],
    constraints: PlacementConstraints,
    existingItems: PlacedItem3D[],
    windowSpans: WallOpeningSpan[] = []
  ): PlacedItem3D[] {
    const items: PlacedItem3D[] = [];
    const usableSegments = segments.filter((s) => s.usable && s.length >= 0.6);

    if (usableSegments.length === 0) return items;

    const hasSink = existingItems.some((i) => ['sink', 'sink_base'].includes(i.type));
    const hasCooktop = existingItems.some((i) => ['cooktop', 'stove', 'hob'].includes(i.type));
    const hasFridge = existingItems.some((i) => ['refrigerator', 'fridge'].includes(i.type));

    const segIndex = 0;

    // Place sink — UNDER a window when one exists (classic kitchen principle), else the first
    // usable segment.
    if (!hasSink && constraints.mustHave.includes('sink') && usableSegments.length > 0) {
      const underWindow = this.findWindowSegment(usableSegments, windowSpans);
      const seg = underWindow?.segment ?? usableSegments[segIndex]!;
      const alongWall = underWindow ? underWindow.center : seg.startX + 0.3;
      const pos = this.segmentToWorldPosition(
        seg.wallSide,
        alongWall,
        mmToM(this.brandProfile.base.defaultDepth)
      );
      items.push({
        id: 'gen-sink',
        type: 'sink',
        position: pos,
        rotation: this.getWallRotation(seg.wallSide),
        dimensions: {
          width: 0.6,
          height: mmToM(this.brandProfile.base.totalHeight),
          depth: mmToM(this.brandProfile.base.defaultDepth),
        },
        price: this.estimatePrice('sink', 600),
      });
    }

    // Place cooktop
    if (!hasCooktop && constraints.mustHave.includes('cooktop')) {
      const seg = usableSegments[Math.min(segIndex, usableSegments.length - 1)]!;
      const xOff = seg.length > 1.5 ? seg.startX + seg.length / 2 : seg.startX + 0.9;
      const pos = this.segmentToWorldPosition(
        seg.wallSide,
        xOff,
        mmToM(this.brandProfile.base.defaultDepth)
      );
      items.push({
        id: 'gen-cooktop',
        type: 'cooktop',
        position: new THREE.Vector3(pos.x, mmToM(this.brandProfile.base.totalHeight), pos.z),
        rotation: this.getWallRotation(seg.wallSide),
        dimensions: { width: 0.6, height: 0.05, depth: 0.52 },
        price: this.estimatePrice('cooktop', 600),
      });
    }

    // Place fridge on a different wall if possible — and keep it OFF windows (it is tall).
    if (!hasFridge && constraints.mustHave.includes('refrigerator')) {
      const differentWall = usableSegments.filter(
        (s) => s.wallSide !== usableSegments[0]?.wallSide && s.length >= 0.6
      );
      const candidates = differentWall.length > 0 ? differentWall : usableSegments;
      const fridgeSeg =
        candidates.find((s) => !this.positionInWindow(s.wallSide, s.startX + 0.3, windowSpans)) ??
        candidates[candidates.length - 1]!;

      const pos = this.segmentToWorldPosition(fridgeSeg.wallSide, fridgeSeg.startX + 0.3, 0.325);
      items.push({
        id: 'gen-fridge',
        type: 'refrigerator',
        position: pos,
        rotation: this.getWallRotation(fridgeSeg.wallSide),
        dimensions: { width: 0.6, height: 1.8, depth: 0.65 },
        price: this.estimatePrice('refrigerator', 600),
      });
    }

    return items;
  }

  /**
   * Find a usable segment that spans a window's centre (with room for a ~0.6m sink), so the
   * sink can be placed directly under the window. Returns the segment and the along-wall
   * coordinate to place at (the window centre, clamped inside the segment).
   */
  private findWindowSegment(
    segments: WallSegment[],
    windowSpans: WallOpeningSpan[]
  ): { segment: WallSegment; center: number } | null {
    for (const w of windowSpans) {
      const center = (w.start + w.end) / 2;
      const seg = segments.find(
        (s) => s.wallSide === w.wallSide && center >= s.startX + 0.3 && center <= s.endX - 0.3
      );
      if (seg) {
        return { segment: seg, center };
      }
    }
    return null;
  }

  /** Whether an along-wall position on a given side falls within any window footprint. */
  private positionInWindow(
    wallSide: WallSide,
    alongWall: number,
    windowSpans: WallOpeningSpan[]
  ): boolean {
    return windowSpans.some(
      (w) => w.wallSide === wallSide && alongWall >= w.start && alongWall <= w.end
    );
  }

  /**
   * Selectionne la meilleure largeur de caisson pour l'espace disponible
   */
  selectOptimalWidth(availableSpaceM: number, widths: number[]): number | null {
    const spaceMm = Math.round(availableSpaceM * 1000);
    // Prefer larger widths first
    for (const w of widths) {
      if (w <= spaceMm) return w;
    }
    return null;
  }

  // --- Utilitaires ---

  private segmentToWorldPosition(
    wallSide: WallSide,
    alongWall: number,
    depthOffset: number
  ): THREE.Vector3 {
    switch (wallSide) {
      case 'back':
        return new THREE.Vector3(alongWall, 0, depthOffset / 2);
      case 'front':
        return new THREE.Vector3(alongWall, 0, -depthOffset / 2);
      case 'left':
        return new THREE.Vector3(depthOffset / 2, 0, alongWall);
      case 'right':
        return new THREE.Vector3(-depthOffset / 2, 0, alongWall);
    }
  }

  /**
   * Estimate price based on type and width (mm).
   * Uses realistic price ranges per category from French market data.
   */
  private estimatePrice(type: string, widthMm: number): number {
    const priceRanges: Record<string, { base: number; perMm: number }> = {
      base_cabinet: { base: 180, perMm: 0.35 },
      wall_cabinet: { base: 120, perMm: 0.25 },
      tall_cabinet: { base: 350, perMm: 0.4 },
      sink: { base: 250, perMm: 0.2 },
      cooktop: { base: 300, perMm: 0.15 },
      refrigerator: { base: 500, perMm: 0.25 },
      dishwasher: { base: 400, perMm: 0 },
      hood: { base: 200, perMm: 0.15 },
    };
    const range = priceRanges[type] || { base: 150, perMm: 0.3 };
    return Math.round(range.base + widthMm * range.perMm);
  }

  private getWallRotation(wallSide: WallSide): number {
    switch (wallSide) {
      case 'back':
        return 0;
      case 'front':
        return Math.PI;
      case 'left':
        return Math.PI / 2;
      case 'right':
        return -Math.PI / 2;
    }
  }
}
