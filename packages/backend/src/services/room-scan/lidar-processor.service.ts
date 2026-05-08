/**
 * LiDAR Processor Service
 *
 * Processes raw depth frame data from LiDAR sensors into room dimensions.
 * Uses RANSAC plane detection on point clouds to identify walls, floor, and openings.
 *
 * Pipeline:
 * 1. Convert depth frames to a unified point cloud
 * 2. Run RANSAC to detect planes (floor + walls)
 * 3. Segment vertical planes as walls
 * 4. Detect openings (doors, windows) by finding gaps in wall geometry
 * 5. Return structured room scan result
 */

import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('lidar-processor');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DepthFrame {
  /** Raw depth values in meters. Length = width * height. */
  depthData: Float32Array;
  /** Width of the depth image in pixels. */
  width: number;
  /** Height of the depth image in pixels. */
  height: number;
  /** Camera intrinsics for converting pixel coordinates to 3D. */
  intrinsics: {
    fx: number; // focal length x
    fy: number; // focal length y
    cx: number; // principal point x
    cy: number; // principal point y
  };
  /** Camera pose in world space. */
  pose: {
    position: [number, number, number];
    rotation: [number, number, number, number]; // quaternion (x, y, z, w)
  };
}

export interface WallSegment {
  /** Start point of the wall segment in the horizontal (X-Z) plane. */
  start: { x: number; z: number };
  /** End point of the wall segment. */
  end: { x: number; z: number };
  /** Height of the wall in meters. */
  height: number;
  /** Outward-facing normal vector (in the X-Z plane). */
  normal: { x: number; z: number };
}

export interface Opening {
  /** Type of opening. */
  type: 'door' | 'window';
  /** Index of the wall this opening is on. */
  wallIndex: number;
  /** Position along the wall (0 = start, 1 = end). */
  positionAlongWall: number;
  /** Width of the opening in meters. */
  width: number;
  /** Height of the opening in meters. */
  height: number;
  /** Distance from floor to bottom of the opening in meters. */
  fromFloor: number;
}

export interface Plane {
  /** Normal vector of the plane. */
  normal: { x: number; y: number; z: number };
  /** Distance from origin along the normal. */
  distance: number;
  /** Inlier point indices. */
  inliers: number[];
}

export interface RoomScanResult {
  dimensions: {
    width: number;   // mm
    length: number;  // mm
    height: number;  // mm
  };
  walls: WallSegment[];
  openings: Opening[];
  floorLevel: number; // meters
  confidence: number; // 0-1
}

// ─── Service ────────────────────────────────────────────────────────────────

export class LiDARProcessorService {
  private readonly RANSAC_ITERATIONS = 100;
  private readonly INLIER_THRESHOLD = 0.05; // 5cm
  private readonly MIN_WALL_INLIERS = 50;
  private readonly VERTICAL_THRESHOLD = 0.3; // radians from vertical to be considered a wall
  private readonly HORIZONTAL_THRESHOLD = 0.3; // radians from horizontal to be floor/ceiling

  /**
   * Process raw depth frame data into room dimensions.
   *
   * @param frames - Array of depth frames captured from the LiDAR sensor
   * @returns Structured room scan result with dimensions, walls, and openings
   */
  processDepthFrames(frames: DepthFrame[]): RoomScanResult {
    logger.info(`[LiDAR] Processing ${frames.length} depth frames`);

    if (frames.length === 0) {
      throw new Error('No depth frames provided');
    }

    // Step 1: Convert all depth frames to a unified point cloud
    const pointCloud = this.depthFramesToPointCloud(frames);
    logger.info(`[LiDAR] Generated point cloud with ${pointCloud.length / 3} points`);

    // Step 2: Detect planes using RANSAC
    const planes = this.detectPlanes(pointCloud, 6); // Expect up to 6 planes (floor, ceiling, 4 walls)
    logger.info(`[LiDAR] Detected ${planes.length} planes`);

    // Step 3: Classify planes as floor, ceiling, or walls
    const { floor, walls: wallPlanes } = this.classifyPlanes(planes, pointCloud);

    // Step 4: Convert wall planes to wall segments
    const walls = this.planesToWallSegments(wallPlanes, pointCloud);
    logger.info(`[LiDAR] Extracted ${walls.length} wall segments`);

    // Step 5: Detect openings
    const openings = this.detectOpenings(walls, pointCloud);
    logger.info(`[LiDAR] Detected ${openings.length} openings`);

    // Step 6: Calculate room dimensions
    const dimensions = this.calculateRoomDimensions(walls, floor);

    // Step 7: Calculate confidence based on point cloud density and plane quality
    const confidence = this.calculateConfidence(frames.length, planes, walls);

    return {
      dimensions: {
        width: Math.round(dimensions.width * 1000),  // Convert to mm
        length: Math.round(dimensions.length * 1000),
        height: Math.round(dimensions.height * 1000),
      },
      walls,
      openings,
      floorLevel: floor?.distance ?? 0,
      confidence,
    };
  }

  /**
   * Detect walls from a point cloud using RANSAC plane fitting.
   *
   * @param pointCloud - Interleaved x,y,z coordinates as Float32Array
   * @returns Array of wall segments
   */
  detectWalls(pointCloud: Float32Array): WallSegment[] {
    const planes = this.detectPlanes(pointCloud, 6);
    const { walls: wallPlanes } = this.classifyPlanes(planes, pointCloud);
    return this.planesToWallSegments(wallPlanes, pointCloud);
  }

  /**
   * Detect openings (doors, windows) in walls by analyzing point density gaps.
   *
   * @param walls - Array of wall segments
   * @param pointCloud - Interleaved x,y,z coordinates as Float32Array
   * @returns Array of detected openings
   */
  detectOpenings(walls: WallSegment[], pointCloud: Float32Array): Opening[] {
    const openings: Opening[] = [];

    walls.forEach((wall, wallIndex) => {
      // Project wall-adjacent points onto the wall plane
      const wallDir = {
        x: wall.end.x - wall.start.x,
        z: wall.end.z - wall.start.z,
      };
      const wallLength = Math.sqrt(wallDir.x * wallDir.x + wallDir.z * wallDir.z);
      if (wallLength < 0.1) {return;}

      const wallDirNorm = {
        x: wallDir.x / wallLength,
        z: wallDir.z / wallLength,
      };

      // Create a height histogram along the wall to find gaps
      const BINS_ALONG = 50;
      const BINS_HEIGHT = 20;
      const occupancy = new Array(BINS_ALONG)
        .fill(null)
        .map(() => new Array(BINS_HEIGHT).fill(0));

      const numPoints = pointCloud.length / 3;
      for (let i = 0; i < numPoints; i++) {
        const px = pointCloud[i * 3]!;
        const py = pointCloud[i * 3 + 1]!;
        const pz = pointCloud[i * 3 + 2]!;

        // Check if point is near this wall
        const dx = px - wall.start.x;
        const dz = pz - wall.start.z;
        const projAlong = dx * wallDirNorm.x + dz * wallDirNorm.z;
        const projPerp = Math.abs(dx * (-wallDirNorm.z) + dz * wallDirNorm.x);

        if (projPerp < 0.15 && projAlong >= 0 && projAlong <= wallLength) {
          const binAlong = Math.floor((projAlong / wallLength) * BINS_ALONG);
          const binHeight = Math.floor((py / wall.height) * BINS_HEIGHT);

          if (
            binAlong >= 0 && binAlong < BINS_ALONG &&
            binHeight >= 0 && binHeight < BINS_HEIGHT
          ) {
            occupancy[binAlong]![binHeight]! += 1;
          }
        }
      }

      // Find empty rectangular regions (potential openings)
      const emptyRegions = this.findEmptyRegions(occupancy, BINS_ALONG, BINS_HEIGHT);

      for (const region of emptyRegions) {
        const positionAlongWall = (region.startX + region.endX) / 2 / BINS_ALONG;
        const width = ((region.endX - region.startX) / BINS_ALONG) * wallLength;
        const fromFloor = (region.startY / BINS_HEIGHT) * wall.height;
        const height = ((region.endY - region.startY) / BINS_HEIGHT) * wall.height;

        // Classify: door if from floor, window otherwise
        const isDoor = fromFloor < 0.1 && height > 1.5;
        openings.push({
          type: isDoor ? 'door' : 'window',
          wallIndex,
          positionAlongWall,
          width,
          height,
          fromFloor,
        });
      }
    });

    return openings;
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  /**
   * Convert depth frames to a unified point cloud in world coordinates.
   */
  private depthFramesToPointCloud(frames: DepthFrame[]): Float32Array {
    // Estimate total points (subsample for performance)
    const SUBSAMPLE = 4; // Take every 4th pixel
    let totalPoints = 0;
    for (const frame of frames) {
      totalPoints += Math.ceil(frame.width / SUBSAMPLE) * Math.ceil(frame.height / SUBSAMPLE);
    }

    const points = new Float32Array(totalPoints * 3);
    let offset = 0;

    for (const frame of frames) {
      const { depthData, width, height, intrinsics, pose } = frame;
      const { fx, fy, cx, cy } = intrinsics;

      // Simple quaternion to rotation matrix conversion
      const rotMatrix = this.quaternionToMatrix(pose.rotation);

      for (let v = 0; v < height; v += SUBSAMPLE) {
        for (let u = 0; u < width; u += SUBSAMPLE) {
          const depth = depthData[v * width + u];
          if (depth === undefined || depth <= 0 || depth > 10) {continue;} // Filter invalid / far points

          // Back-project pixel to camera space
          const camX = ((u - cx) / fx) * depth;
          const camY = ((v - cy) / fy) * depth;
          const camZ = depth;

          // Transform to world space using pose
          const worldX =
            rotMatrix[0]! * camX + rotMatrix[1]! * camY + rotMatrix[2]! * camZ + pose.position[0];
          const worldY =
            rotMatrix[3]! * camX + rotMatrix[4]! * camY + rotMatrix[5]! * camZ + pose.position[1];
          const worldZ =
            rotMatrix[6]! * camX + rotMatrix[7]! * camY + rotMatrix[8]! * camZ + pose.position[2];

          points[offset++] = worldX;
          points[offset++] = worldY;
          points[offset++] = worldZ;
        }
      }
    }

    // Return trimmed array
    return points.slice(0, offset);
  }

  /**
   * Detect multiple planes in the point cloud using iterative RANSAC.
   *
   * Algorithm:
   * 1. Sample 3 random points
   * 2. Fit a plane through them
   * 3. Count inliers within INLIER_THRESHOLD of the plane
   * 4. Keep the best plane after RANSAC_ITERATIONS iterations
   * 5. Remove inliers and repeat for the next plane
   */
  private detectPlanes(pointCloud: Float32Array, maxPlanes: number): Plane[] {
    const planes: Plane[] = [];
    const numPoints = pointCloud.length / 3;

    // Track which points are still available (not assigned to a plane)
    const available = new Uint8Array(numPoints).fill(1);

    for (let planeIdx = 0; planeIdx < maxPlanes; planeIdx++) {
      const availableIndices: number[] = [];
      for (let i = 0; i < numPoints; i++) {
        if (available[i]) {availableIndices.push(i);}
      }

      if (availableIndices.length < this.MIN_WALL_INLIERS) {break;}

      let bestPlane: Plane | null = null;
      let bestInlierCount = 0;

      for (let iter = 0; iter < this.RANSAC_ITERATIONS; iter++) {
        // Sample 3 random points
        const idx0 = availableIndices[Math.floor(Math.random() * availableIndices.length)]!;
        const idx1 = availableIndices[Math.floor(Math.random() * availableIndices.length)]!;
        const idx2 = availableIndices[Math.floor(Math.random() * availableIndices.length)]!;

        if (idx0 === idx1 || idx1 === idx2 || idx0 === idx2) {continue;}

        // Get points
        const p0 = this.getPoint(pointCloud, idx0);
        const p1 = this.getPoint(pointCloud, idx1);
        const p2 = this.getPoint(pointCloud, idx2);

        // Compute plane normal via cross product of two edge vectors
        const v1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
        const v2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: p2.z - p0.z };
        const normal = {
          x: v1.y * v2.z - v1.z * v2.y,
          y: v1.z * v2.x - v1.x * v2.z,
          z: v1.x * v2.y - v1.y * v2.x,
        };

        const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        if (len < 1e-6) {continue;}

        normal.x /= len;
        normal.y /= len;
        normal.z /= len;

        const distance = normal.x * p0.x + normal.y * p0.y + normal.z * p0.z;

        // Count inliers
        const inliers: number[] = [];
        for (const i of availableIndices) {
          const p = this.getPoint(pointCloud, i);
          const d = Math.abs(normal.x * p.x + normal.y * p.y + normal.z * p.z - distance);
          if (d < this.INLIER_THRESHOLD) {
            inliers.push(i);
          }
        }

        if (inliers.length > bestInlierCount) {
          bestInlierCount = inliers.length;
          bestPlane = { normal, distance, inliers };
        }
      }

      if (bestPlane && bestInlierCount >= this.MIN_WALL_INLIERS) {
        planes.push(bestPlane);
        // Remove inliers from available set
        for (const i of bestPlane.inliers) {
          available[i] = 0;
        }
      } else {
        break; // No more planes found
      }
    }

    return planes;
  }

  /**
   * Classify detected planes as floor, ceiling, or walls based on normal direction.
   */
  private classifyPlanes(
    planes: Plane[],
    pointCloud: Float32Array
  ): { floor: Plane | null; ceiling: Plane | null; walls: Plane[] } {
    let floor: Plane | null = null;
    let ceiling: Plane | null = null;
    const walls: Plane[] = [];

    // The floor has an upward-pointing normal (Y+) and is at the lowest level
    // The ceiling has a downward-pointing normal (Y-) and is at the highest level
    // Walls have nearly horizontal normals

    for (const plane of planes) {
      const normalY = Math.abs(plane.normal.y);
      const angleFromVertical = Math.acos(Math.min(1, normalY));
      const angleFromHorizontal = Math.PI / 2 - angleFromVertical;

      if (angleFromHorizontal < this.HORIZONTAL_THRESHOLD) {
        // Horizontal plane - floor or ceiling
        // Calculate average height of inlier points
        let avgY = 0;
        for (const idx of plane.inliers) {
          avgY += pointCloud[idx * 3 + 1]!;
        }
        avgY /= plane.inliers.length;

        if (plane.normal.y > 0) {
          // Upward-facing = floor candidate
          if (!floor || avgY < (floor.distance / Math.abs(floor.normal.y))) {
            floor = plane;
          }
        } else {
          // Downward-facing = ceiling candidate
          if (!ceiling || avgY > (ceiling.distance / Math.abs(ceiling.normal.y))) {
            ceiling = plane;
          }
        }
      } else if (angleFromVertical < this.VERTICAL_THRESHOLD) {
        // Vertical plane - wall
        walls.push(plane);
      }
    }

    return { floor, ceiling, walls };
  }

  /**
   * Convert RANSAC wall planes to wall segments with start/end points and height.
   */
  private planesToWallSegments(wallPlanes: Plane[], pointCloud: Float32Array): WallSegment[] {
    return wallPlanes.map((plane) => {
      // Project inlier points onto the wall plane to find extents
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      for (const idx of plane.inliers) {
        const x = pointCloud[idx * 3]!;
        const y = pointCloud[idx * 3 + 1]!;
        const z = pointCloud[idx * 3 + 2]!;
        if (x < minX) {minX = x;}
        if (x > maxX) {maxX = x;}
        if (z < minZ) {minZ = z;}
        if (z > maxZ) {maxZ = z;}
        if (y < minY) {minY = y;}
        if (y > maxY) {maxY = y;}
      }

      // Determine wall orientation: primarily along X or Z axis
      const xSpan = maxX - minX;
      const zSpan = maxZ - minZ;

      let start: { x: number; z: number };
      let end: { x: number; z: number };

      if (xSpan > zSpan) {
        // Wall runs along X
        start = { x: minX, z: (minZ + maxZ) / 2 };
        end = { x: maxX, z: (minZ + maxZ) / 2 };
      } else {
        // Wall runs along Z
        start = { x: (minX + maxX) / 2, z: minZ };
        end = { x: (minX + maxX) / 2, z: maxZ };
      }

      return {
        start,
        end,
        height: maxY - minY,
        normal: { x: plane.normal.x, z: plane.normal.z },
      };
    });
  }

  /**
   * Calculate room dimensions from detected walls and floor.
   */
  private calculateRoomDimensions(
    walls: WallSegment[],
    _floor: Plane | null
  ): { width: number; length: number; height: number } {
    if (walls.length === 0) {
      return { width: 3.0, length: 3.0, height: 2.5 }; // Default
    }

    // Find bounding box of all wall endpoints
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let maxHeight = 0;

    for (const wall of walls) {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      minZ = Math.min(minZ, wall.start.z, wall.end.z);
      maxZ = Math.max(maxZ, wall.start.z, wall.end.z);
      maxHeight = Math.max(maxHeight, wall.height);
    }

    return {
      width: maxX - minX,
      length: maxZ - minZ,
      height: maxHeight > 0 ? maxHeight : 2.5,
    };
  }

  /**
   * Find empty rectangular regions in a 2D occupancy grid.
   * Used for detecting openings in walls.
   */
  private findEmptyRegions(
    occupancy: number[][],
    binsAlong: number,
    binsHeight: number
  ): Array<{ startX: number; endX: number; startY: number; endY: number }> {
    const regions: Array<{ startX: number; endX: number; startY: number; endY: number }> = [];
    const MIN_REGION_WIDTH = 3; // Minimum bins for an opening
    const MIN_REGION_HEIGHT = 4;
    const EMPTY_THRESHOLD = 2; // Max points in bin to consider empty

    // Simple scan for contiguous empty columns
    let regionStart = -1;

    for (let x = 0; x < binsAlong; x++) {
      // Check if this column has empty bins in a vertical range
      let emptyBinsInColumn = 0;
      let emptyStart = -1;

      for (let y = 0; y < binsHeight; y++) {
        if ((occupancy[x]?.[y] ?? 0) <= EMPTY_THRESHOLD) {
          if (emptyStart === -1) {emptyStart = y;}
          emptyBinsInColumn++;
        }
      }

      if (emptyBinsInColumn >= MIN_REGION_HEIGHT && emptyStart !== -1) {
        if (regionStart === -1) {
          regionStart = x;
        }
      } else {
        if (regionStart !== -1 && (x - regionStart) >= MIN_REGION_WIDTH) {
          // Found a region
          // Determine the vertical extent across the entire region
          let minStartY = binsHeight;
          let maxEndY = 0;
          for (let rx = regionStart; rx < x; rx++) {
            for (let ry = 0; ry < binsHeight; ry++) {
              if ((occupancy[rx]?.[ry] ?? 0) <= EMPTY_THRESHOLD) {
                minStartY = Math.min(minStartY, ry);
                maxEndY = Math.max(maxEndY, ry);
              }
            }
          }

          if (maxEndY - minStartY >= MIN_REGION_HEIGHT) {
            regions.push({
              startX: regionStart,
              endX: x,
              startY: minStartY,
              endY: maxEndY,
            });
          }
        }
        regionStart = -1;
      }
    }

    // Handle region ending at the last bin
    if (regionStart !== -1 && (binsAlong - regionStart) >= MIN_REGION_WIDTH) {
      let minStartY = binsHeight;
      let maxEndY = 0;
      for (let rx = regionStart; rx < binsAlong; rx++) {
        for (let ry = 0; ry < binsHeight; ry++) {
          if ((occupancy[rx]?.[ry] ?? 0) <= EMPTY_THRESHOLD) {
            minStartY = Math.min(minStartY, ry);
            maxEndY = Math.max(maxEndY, ry);
          }
        }
      }
      if (maxEndY - minStartY >= MIN_REGION_HEIGHT) {
        regions.push({
          startX: regionStart,
          endX: binsAlong,
          startY: minStartY,
          endY: maxEndY,
        });
      }
    }

    return regions;
  }

  /**
   * Calculate confidence score based on scan quality indicators.
   */
  private calculateConfidence(
    frameCount: number,
    planes: Plane[],
    walls: WallSegment[]
  ): number {
    let confidence = 0;

    // More frames = more data = higher confidence
    if (frameCount >= 30) {confidence += 0.3;}
    else if (frameCount >= 10) {confidence += 0.2;}
    else {confidence += 0.1;}

    // Detecting floor + walls gives higher confidence
    if (planes.length >= 3) {confidence += 0.3;}
    else if (planes.length >= 2) {confidence += 0.2;}
    else {confidence += 0.1;}

    // Reasonable wall count
    if (walls.length >= 3 && walls.length <= 6) {confidence += 0.3;}
    else if (walls.length >= 2) {confidence += 0.2;}
    else {confidence += 0.1;}

    // Cap at 0.95 (never fully confident from LiDAR alone)
    return Math.min(0.95, Math.max(0.1, confidence));
  }

  /**
   * Get a point from the interleaved point cloud array.
   */
  private getPoint(
    pointCloud: Float32Array,
    index: number
  ): { x: number; y: number; z: number } {
    return {
      x: pointCloud[index * 3]!,
      y: pointCloud[index * 3 + 1]!,
      z: pointCloud[index * 3 + 2]!,
    };
  }

  /**
   * Convert a quaternion (x, y, z, w) to a 3x3 rotation matrix (column-major, flattened).
   */
  private quaternionToMatrix(q: [number, number, number, number]): number[] {
    const [x, y, z, w] = q;
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y),
      2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x),
      2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y),
    ];
  }
}
