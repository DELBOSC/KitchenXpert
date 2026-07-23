import type { RoomConfig, PlacedItem3D } from './ai-assistant';

export type WallSide = 'back' | 'left' | 'right' | 'front';

/**
 * A door/window footprint along a wall, in the WallAnalyzer coordinate (start/end metres
 * from the wall origin, 0…wallLength). The layout generator treats this span as unusable so
 * it never places furniture across an opening (Slice 3).
 */
export interface WallOpeningSpan {
  wallSide: WallSide;
  start: number;
  end: number;
  /**
   * A door must be kept clear of ALL furniture (blocks base segments). A window only blocks
   * TALL items (fridge, wall cabinets) — base cabinets, sink and cooktop may go underneath.
   * Absent = treated as a door (block), for backward compatibility.
   */
  kind?: 'door' | 'window';
}

export interface WallSegment {
  wallSide: WallSide;
  startX: number; // metres (along wall)
  endX: number;
  length: number;
  usable: boolean;
  obstacleIds?: string[];
}

export interface WallAnalysis {
  segments: WallSegment[];
  wallLengths: Record<WallSide, number>;
  totalUsableLength: number;
}

/**
 * Analyse les murs de la piece pour identifier les segments utilisables
 */
export class WallAnalyzer {
  /**
   * Analyse complete de la piece
   */
  analyzeRoom(
    room: RoomConfig,
    existingItems: PlacedItem3D[],
    openings: WallOpeningSpan[] = []
  ): WallAnalysis {
    const wallLengths: Record<WallSide, number> = {
      back: room.width,
      front: room.width,
      left: room.depth,
      right: room.depth,
    };

    const segments: WallSegment[] = [];
    const sides: WallSide[] = ['back', 'left', 'right', 'front'];

    for (const side of sides) {
      const sideOpenings = openings.filter((o) => o.wallSide === side);
      const wallSegs = this.findUsableSegments(side, room, existingItems, sideOpenings);
      segments.push(...wallSegs);
    }

    const totalUsableLength = segments
      .filter((s) => s.usable)
      .reduce((sum, s) => sum + s.length, 0);

    return { segments, wallLengths, totalUsableLength };
  }

  /**
   * Trouve les segments utilisables d'un mur donne
   */
  findUsableSegments(
    wallSide: WallSide,
    room: RoomConfig,
    obstacles: PlacedItem3D[],
    openingSpans: WallOpeningSpan[] = []
  ): WallSegment[] {
    const wallLength = this.calculateWallLength(wallSide, room);
    const margin = 0.05; // 5cm de marge

    // Trouver les items colles a ce mur
    const wallItems = obstacles.filter((item) => {
      const pos = item.position;
      const halfD = item.dimensions.depth / 2;

      switch (wallSide) {
        case 'back':
          return pos.z - halfD < 0.5;
        case 'front':
          return pos.z + halfD > room.depth - 0.5;
        case 'left':
          return pos.x - halfD < 0.5;
        case 'right':
          return pos.x + halfD > room.width - 0.5;
      }
    });

    // Blocked spans = furniture footprints + openings (doors/windows). Both are unusable:
    // the generator must not place a cabinet across an opening (Slice 3).
    const blocked = [
      ...wallItems.map((item) => {
        const pos = wallSide === 'left' || wallSide === 'right' ? item.position.z : item.position.x;
        const halfW = item.dimensions.width / 2;
        return { start: pos - halfW, end: pos + halfW, id: item.id };
      }),
      // Only doors block base segments; windows let base cabinets pass underneath (Slice 3b).
      ...openingSpans
        .filter((s) => s.kind !== 'window')
        .map((s, i) => ({
          start: s.start,
          end: s.end,
          id: `opening-${wallSide}-${i}`,
        })),
    ].sort((a, b) => a.start - b.start);

    if (blocked.length === 0) {
      return [
        {
          wallSide,
          startX: margin,
          endX: wallLength - margin,
          length: wallLength - margin * 2,
          usable: true,
        },
      ];
    }

    const segments: WallSegment[] = [];
    let current = margin;

    for (const item of blocked) {
      if (item.start > current + 0.1) {
        segments.push({
          wallSide,
          startX: current,
          endX: item.start,
          length: item.start - current,
          usable: true,
        });
      }

      segments.push({
        wallSide,
        startX: item.start,
        endX: item.end,
        length: item.end - item.start,
        usable: false,
        obstacleIds: [item.id],
      });

      current = Math.max(current, item.end);
    }

    if (current < wallLength - margin - 0.1) {
      segments.push({
        wallSide,
        startX: current,
        endX: wallLength - margin,
        length: wallLength - margin - current,
        usable: true,
      });
    }

    return segments;
  }

  /**
   * Calcule la longueur d'un mur
   */
  calculateWallLength(wallSide: WallSide, room: RoomConfig): number {
    return wallSide === 'left' || wallSide === 'right' ? room.depth : room.width;
  }
}
