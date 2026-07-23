import { WallAnalyzer } from '../ai/wall-analysis';

import type { RoomConfig } from '../ai/ai-assistant';

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
});
