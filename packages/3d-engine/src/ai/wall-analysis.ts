import type { RoomConfig, PlacedItem3D } from './ai-assistant';

export type WallSide = 'back' | 'left' | 'right' | 'front';

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
  analyzeRoom(room: RoomConfig, existingItems: PlacedItem3D[]): WallAnalysis {
    const wallLengths: Record<WallSide, number> = {
      back: room.width,
      front: room.width,
      left: room.depth,
      right: room.depth,
    };

    const segments: WallSegment[] = [];
    const sides: WallSide[] = ['back', 'left', 'right', 'front'];

    for (const side of sides) {
      const wallSegs = this.findUsableSegments(side, room, existingItems);
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
  findUsableSegments(wallSide: WallSide, room: RoomConfig, obstacles: PlacedItem3D[]): WallSegment[] {
    const wallLength = this.calculateWallLength(wallSide, room);
    const margin = 0.05; // 5cm de marge

    // Trouver les items colles a ce mur
    const wallItems = obstacles.filter((item) => {
      const pos = item.position;
      const halfD = item.dimensions.depth / 2;

      switch (wallSide) {
        case 'back': return pos.z - halfD < 0.5;
        case 'front': return pos.z + halfD > room.depth - 0.5;
        case 'left': return pos.x - halfD < 0.5;
        case 'right': return pos.x + halfD > room.width - 0.5;
      }
    });

    if (wallItems.length === 0) {
      return [{
        wallSide,
        startX: margin,
        endX: wallLength - margin,
        length: wallLength - margin * 2,
        usable: true,
      }];
    }

    // Trier les items par position le long du mur
    const sorted = wallItems
      .map((item) => {
        const pos = (wallSide === 'left' || wallSide === 'right')
          ? item.position.z
          : item.position.x;
        const halfW = item.dimensions.width / 2;
        return { start: pos - halfW, end: pos + halfW, id: item.id };
      })
      .sort((a, b) => a.start - b.start);

    const segments: WallSegment[] = [];
    let current = margin;

    for (const item of sorted) {
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

      current = item.end;
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
    return (wallSide === 'left' || wallSide === 'right') ? room.depth : room.width;
  }
}
