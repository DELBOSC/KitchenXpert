import { CabinetSolver } from '../ai/cabinet-solver';
import { WallAnalyzer } from '../ai/wall-analysis';
import { getBrandProfile } from '../config/brand-profiles';

import type { RoomConfig } from '../ai/ai-assistant';
import type { WallSegment, WallOpeningSpan } from '../ai/wall-analysis';

const room: RoomConfig = { width: 4, depth: 3, height: 2.4, walls: [] };

describe('WallAnalyzer — openings (Slice 3)', () => {
  const wa = new WallAnalyzer();

  it('marks an opening span as UNUSABLE, with usable gaps on both sides', () => {
    const back = wa
      .analyzeRoom(room, [], [{ wallSide: 'back', start: 1.0, end: 1.9 }])
      .segments.filter((s) => s.wallSide === 'back');

    const blocked = back.find((s) => !s.usable);
    expect(blocked).toBeDefined();
    expect(blocked!.startX).toBeCloseTo(1.0);
    expect(blocked!.endX).toBeCloseTo(1.9);
    // a usable gap before the opening and after it
    expect(back.some((s) => s.usable && s.endX <= 1.0 + 1e-6)).toBe(true);
    expect(back.some((s) => s.usable && s.startX >= 1.9 - 1e-6)).toBe(true);
  });

  it('negative control: WITHOUT the opening, the back wall is fully usable', () => {
    const back = wa.analyzeRoom(room, [], []).segments.filter((s) => s.wallSide === 'back');
    expect(back.every((s) => s.usable)).toBe(true);
    expect(back.some((s) => !s.usable)).toBe(false);
  });

  it('an opening only blocks its own wall side (left opening leaves the back clear)', () => {
    const segs = wa.analyzeRoom(room, [], [{ wallSide: 'left', start: 0.5, end: 1.4 }]).segments;
    expect(segs.filter((s) => s.wallSide === 'back').every((s) => s.usable)).toBe(true);
    expect(segs.some((s) => s.wallSide === 'left' && !s.usable)).toBe(true);
  });

  it('a WINDOW does NOT block base segments; a DOOR does (Slice 3b)', () => {
    const win = wa
      .analyzeRoom(room, [], [{ wallSide: 'back', start: 1.0, end: 1.9, kind: 'window' }])
      .segments.filter((s) => s.wallSide === 'back');
    expect(win.every((s) => s.usable)).toBe(true); // base can go under a window

    const door = wa
      .analyzeRoom(room, [], [{ wallSide: 'back', start: 1.0, end: 1.9, kind: 'door' }])
      .segments.filter((s) => s.wallSide === 'back');
    expect(door.some((s) => !s.usable)).toBe(true); // door stays clear
  });
});

describe('CabinetSolver — sink under window (Slice 3b)', () => {
  const solver = new CabinetSolver(getBrandProfile());
  const backWall: WallSegment = {
    wallSide: 'back',
    startX: 0.05,
    endX: 3.95,
    length: 3.9,
    usable: true,
  };

  it('places the sink UNDER the window when one exists', () => {
    const windowSpan: WallOpeningSpan = { wallSide: 'back', start: 2.0, end: 2.8, kind: 'window' };
    const items = solver.placeEssentialAppliances([backWall], { mustHave: ['sink'] }, [], [
      windowSpan,
    ]);
    const sink = items.find((i) => i.type === 'sink');
    expect(sink).toBeDefined();
    // Window centre = 2.4 → on the back wall, world x ≈ 2.4 (not the default 0.35).
    expect(sink!.position.x).toBeCloseTo(2.4, 1);
  });

  it('negative control: no window → sink at the segment start (not 2.4)', () => {
    const items = solver.placeEssentialAppliances([backWall], { mustHave: ['sink'] }, [], []);
    const sink = items.find((i) => i.type === 'sink');
    expect(sink!.position.x).toBeCloseTo(0.35, 1);
  });
});
