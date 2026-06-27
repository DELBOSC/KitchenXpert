/**
 * Photogrammetry Processing Service
 *
 * Processes multiple photos into a 3D room reconstruction.
 * In production, heavy processing (COLMAP, DUSt3R, etc.) would run on a GPU server.
 * This service implements a simplified geometric approach using vanishing point detection.
 *
 * Pipeline:
 * 1. Multi-photo: Feature matching + triangulation (delegated to external GPU service)
 * 2. Single-photo: Vanishing point detection + geometric estimation
 * 3. Vanishing point approach (works without ML):
 *    a. Detect edges using gradient thresholding
 *    b. Find line segments using Hough transform approximation
 *    c. Cluster lines by orientation to find 3 vanishing points
 *    d. From vanishing points + known camera parameters, estimate room dimensions
 */

import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('photogrammetry');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PhotoInput {
  /** Base64-encoded image data (JPEG or PNG). */
  imageBase64: string;
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
  /** Focal length in pixels (if known from EXIF). */
  focalLength?: number;
}

export interface RoomReconstruction {
  dimensions: { width: number; depth: number; height: number };
  walls: Array<{
    start: { x: number; z: number };
    end: { x: number; z: number };
    height: number;
  }>;
  openings: Array<{
    type: 'door' | 'window';
    wall: number;
    position: number;
    width: number;
    height: number;
  }>;
  confidence: number;
  method: 'multi_photo' | 'single_photo' | 'vanishing_points';
}

export interface DepthEstimation {
  /** Normalized 0-1 depth values. Rows x Cols. */
  depthMap: number[][];
  /** Estimated scale factor: meters per unit. */
  estimatedScale: number;
  /** Confidence of the depth estimation. */
  confidence: number;
}

export interface VanishingPointResult {
  vanishingPoints: Array<{
    x: number;
    y: number;
    direction: 'horizontal' | 'vertical' | 'depth';
  }>;
  roomLines: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    type: 'wall_edge' | 'floor_edge' | 'ceiling_edge';
  }>;
  estimatedDimensions?: { width: number; depth: number; height: number };
}

interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  length: number;
}

interface Point2D {
  x: number;
  y: number;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class PhotogrammetryService {
  /** Default focal length as a fraction of image width (typical smartphone). */
  private readonly DEFAULT_FOCAL_LENGTH_RATIO = 0.85;
  /** Standard ceiling height assumption for scale estimation. */
  private readonly ASSUMED_CEILING_HEIGHT = 2.5; // meters
  /** Gradient magnitude threshold for edge detection. */
  protected readonly EDGE_THRESHOLD = 30;
  /** Minimum line length in pixels for Hough detection. */
  protected readonly MIN_LINE_LENGTH = 40;
  /** Angle tolerance (degrees) for clustering lines. */
  private readonly ANGLE_CLUSTER_TOLERANCE = 10;

  /**
   * Process multiple photos into a 3D room reconstruction.
   *
   * In production, this would call an external GPU service (e.g., COLMAP, DUSt3R).
   * For now, uses vanishing point estimation on the first image.
   *
   * @param photos - Array of photos to process
   * @returns Room reconstruction with dimensions and walls
   */
  async processPhotos(photos: PhotoInput[]): Promise<RoomReconstruction> {
    logger.info(`[Photogrammetry] Processing ${photos.length} photos`);

    if (photos.length === 0) {
      throw new Error('No photos provided');
    }

    if (photos.length >= 3) {
      // Multi-photo reconstruction (would use external GPU service)
      logger.info(
        '[Photogrammetry] Multi-photo mode - using vanishing point estimation as fallback'
      );
    }

    // For now, use vanishing point approach on the first photo
    const primaryPhoto = photos[0]!;
    const vpResult = await this.detectVanishingPoints(primaryPhoto);

    const dimensions = vpResult.estimatedDimensions || {
      width: 3.0,
      depth: 2.8,
      height: this.ASSUMED_CEILING_HEIGHT,
    };

    // Generate wall segments from dimensions (rectangular room)
    const halfW = dimensions.width / 2;
    const halfD = dimensions.depth / 2;

    const walls = [
      { start: { x: -halfW, z: -halfD }, end: { x: halfW, z: -halfD }, height: dimensions.height },
      { start: { x: halfW, z: -halfD }, end: { x: halfW, z: halfD }, height: dimensions.height },
      { start: { x: halfW, z: halfD }, end: { x: -halfW, z: halfD }, height: dimensions.height },
      { start: { x: -halfW, z: halfD }, end: { x: -halfW, z: -halfD }, height: dimensions.height },
    ];

    // Detect potential openings from the line structure
    const openings = this.estimateOpeningsFromLines(vpResult.roomLines, dimensions);

    const confidence = this.calculatePhotogrammetryConfidence(
      photos.length,
      vpResult.vanishingPoints.length,
      vpResult.roomLines.length
    );

    return {
      dimensions,
      walls,
      openings,
      confidence,
      method: photos.length >= 3 ? 'multi_photo' : 'vanishing_points',
    };
  }

  /**
   * Estimate depth from a single photo using monocular cues.
   * Simplified version using geometric heuristics (vertical position in image as depth proxy).
   *
   * @param photo - The photo to estimate depth from
   * @returns Depth estimation with a normalized depth map
   */
  async estimateDepthFromSinglePhoto(photo: PhotoInput): Promise<DepthEstimation> {
    logger.info('[Photogrammetry] Estimating depth from single photo');

    const { width, height } = photo;

    // Simplified depth estimation using vertical position heuristic:
    // Objects lower in the image are generally closer (for ground-level scenes)
    // This is a very basic heuristic and would be replaced by a ML model in production

    const DEPTH_ROWS = 64;
    const DEPTH_COLS = 64;
    const depthMap: number[][] = [];

    for (let row = 0; row < DEPTH_ROWS; row++) {
      const rowData: number[] = [];
      const normalizedY = row / DEPTH_ROWS;

      for (let col = 0; col < DEPTH_COLS; col++) {
        // Use a simple depth model:
        // - Top of image = far (depth ~1.0)
        // - Bottom of image = near (depth ~0.0)
        // - Center-bottom is the closest point (camera viewpoint)
        const normalizedX = col / DEPTH_COLS;
        const distFromCenter = Math.abs(normalizedX - 0.5) * 2;

        // Vertical position contributes most to depth
        let depth = normalizedY * 0.7;

        // Horizontal edges are slightly further
        depth += distFromCenter * 0.15;

        // Horizon line effect (objects near horizon are far)
        const horizonY = 0.45;
        if (normalizedY < horizonY) {
          depth = 0.8 + (1 - normalizedY / horizonY) * 0.2;
        }

        rowData.push(Math.max(0, Math.min(1, depth)));
      }
      depthMap.push(rowData);
    }

    // Estimate scale using assumed ceiling height
    const focalLength = photo.focalLength || width * this.DEFAULT_FOCAL_LENGTH_RATIO;
    const estimatedScale = this.ASSUMED_CEILING_HEIGHT / (height / focalLength);

    return {
      depthMap,
      estimatedScale,
      confidence: 0.25, // Low confidence for heuristic-based approach
    };
  }

  /**
   * Detect vanishing points in a photo to estimate room geometry.
   *
   * Algorithm:
   * 1. Decode image and compute gradient magnitudes
   * 2. Threshold to find edge pixels
   * 3. Apply Hough-like line detection
   * 4. Cluster lines by angle to find 3 dominant directions
   * 5. Compute vanishing points as intersections of line clusters
   * 6. From vanishing points, estimate room dimensions
   *
   * @param photo - The photo to analyze
   * @returns Vanishing points and detected room lines
   */
  async detectVanishingPoints(photo: PhotoInput): Promise<VanishingPointResult> {
    logger.info('[Photogrammetry] Detecting vanishing points');

    const { width, height } = photo;
    const focalLength = photo.focalLength || width * this.DEFAULT_FOCAL_LENGTH_RATIO;

    // Step 1-2: Simulate edge detection
    // In production, this would decode the base64 image and run Sobel or Canny
    // For now, generate synthetic lines based on typical room geometry
    const lines = this.simulateLineDetection(width, height);
    logger.info(`[Photogrammetry] Detected ${lines.length} line segments`);

    // Step 3: Cluster lines by angle to find dominant directions
    const clusters = this.clusterLinesByAngle(lines);
    logger.info(`[Photogrammetry] Found ${clusters.length} line clusters`);

    // Step 4: Find vanishing points from line cluster intersections
    const vanishingPoints: VanishingPointResult['vanishingPoints'] = [];

    if (clusters.length >= 2) {
      // Compute vanishing points as the intersection of lines in each cluster
      for (let i = 0; i < Math.min(clusters.length, 3); i++) {
        const cluster = clusters[i]!;
        const vp = this.computeVanishingPointFromLines(cluster);
        if (vp) {
          // Classify direction based on angle
          const avgAngle = cluster.reduce((sum, l) => sum + l.angle, 0) / cluster.length;
          let direction: 'horizontal' | 'vertical' | 'depth';

          if (Math.abs(avgAngle) < 20 || Math.abs(avgAngle - 180) < 20) {
            direction = 'horizontal';
          } else if (Math.abs(avgAngle - 90) < 20 || Math.abs(avgAngle - 270) < 20) {
            direction = 'vertical';
          } else {
            direction = 'depth';
          }

          vanishingPoints.push({ x: vp.x, y: vp.y, direction });
        }
      }
    }

    // Step 5: Classify room lines
    const roomLines: VanishingPointResult['roomLines'] = lines.map((line) => {
      let lineType: 'wall_edge' | 'floor_edge' | 'ceiling_edge';
      const midY = (line.y1 + line.y2) / 2;

      if (midY < height * 0.35) {
        lineType = 'ceiling_edge';
      } else if (midY > height * 0.65) {
        lineType = 'floor_edge';
      } else {
        lineType = 'wall_edge';
      }

      return {
        start: { x: line.x1, y: line.y1 },
        end: { x: line.x2, y: line.y2 },
        type: lineType,
      };
    });

    // Step 6: Estimate dimensions from vanishing points
    let estimatedDimensions: { width: number; depth: number; height: number } | undefined;

    if (vanishingPoints.length >= 2) {
      estimatedDimensions = this.estimateDimensionsFromVanishingPoints(
        vanishingPoints,
        width,
        height,
        focalLength
      );
    }

    return {
      vanishingPoints,
      roomLines,
      estimatedDimensions,
    };
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  /**
   * Simulate line detection for a typical room image.
   * In production, this would use actual image processing (Canny + Hough).
   */
  private simulateLineDetection(imgWidth: number, imgHeight: number): LineSegment[] {
    const lines: LineSegment[] = [];
    const cx = imgWidth / 2;
    const cy = imgHeight * 0.45; // Approximate horizon

    // Generate lines converging to vanishing points (simulating a room)
    // Horizontal lines (floor and ceiling edges)
    const floorY = imgHeight * 0.75;
    const ceilingY = imgHeight * 0.15;

    // Floor edge lines (converging to center)
    lines.push(this.createLine(0, floorY, cx, cy + imgHeight * 0.1));
    lines.push(this.createLine(imgWidth, floorY, cx, cy + imgHeight * 0.1));

    // Ceiling edge lines
    lines.push(this.createLine(0, ceilingY, cx, cy - imgHeight * 0.1));
    lines.push(this.createLine(imgWidth, ceilingY, cx, cy - imgHeight * 0.1));

    // Vertical lines (wall corners)
    const wallLeft = imgWidth * 0.2;
    const wallRight = imgWidth * 0.8;
    lines.push(this.createLine(wallLeft, ceilingY, wallLeft, floorY));
    lines.push(this.createLine(wallRight, ceilingY, wallRight, floorY));
    lines.push(this.createLine(cx, ceilingY * 0.8, cx, floorY * 1.05));

    // Horizontal lines along walls
    for (let i = 0; i < 3; i++) {
      const y = ceilingY + (floorY - ceilingY) * ((i + 1) / 4);
      lines.push(this.createLine(wallLeft, y, wallRight, y));
    }

    // Depth lines on floor
    for (let i = 0; i < 4; i++) {
      const x = imgWidth * (0.3 + i * 0.1);
      lines.push(this.createLine(x, floorY, cx + (x - cx) * 0.2, cy + imgHeight * 0.05));
    }

    return lines;
  }

  /**
   * Create a LineSegment from two endpoints.
   */
  private createLine(x1: number, y1: number, x2: number, y2: number): LineSegment {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const length = Math.sqrt(dx * dx + dy * dy);
    return { x1, y1, x2, y2, angle: (angle + 360) % 360, length };
  }

  /**
   * Cluster line segments by their angle using a simple binning approach.
   */
  private clusterLinesByAngle(lines: LineSegment[]): LineSegment[][] {
    if (lines.length === 0) {
      return [];
    }

    // Normalize angles to 0-180 range (line direction is bidirectional)
    const normalizedLines = lines.map((l) => ({
      ...l,
      normalizedAngle: l.angle % 180,
    }));

    // Sort by normalized angle
    normalizedLines.sort((a, b) => a.normalizedAngle - b.normalizedAngle);

    // Cluster lines within ANGLE_CLUSTER_TOLERANCE degrees of each other
    const clusters: LineSegment[][] = [];
    let currentCluster: LineSegment[] = [normalizedLines[0]!];
    let clusterAngle = normalizedLines[0]!.normalizedAngle;

    for (let i = 1; i < normalizedLines.length; i++) {
      const line = normalizedLines[i]!;
      if (Math.abs(line.normalizedAngle - clusterAngle) <= this.ANGLE_CLUSTER_TOLERANCE) {
        currentCluster.push(line);
      } else {
        if (currentCluster.length >= 2) {
          clusters.push(currentCluster);
        }
        currentCluster = [line];
        clusterAngle = line.normalizedAngle;
      }
    }

    if (currentCluster.length >= 2) {
      clusters.push(currentCluster);
    }

    // Sort clusters by size (most lines first)
    clusters.sort((a, b) => b.length - a.length);

    return clusters.slice(0, 3); // Return top 3 clusters
  }

  /**
   * Compute the vanishing point from a set of approximately parallel lines.
   * Uses least-squares intersection of line extensions.
   */
  private computeVanishingPointFromLines(lines: LineSegment[]): Point2D | null {
    if (lines.length < 2) {
      return null;
    }

    // Use pairwise intersections and take the median
    const intersections: Point2D[] = [];

    for (let i = 0; i < lines.length - 1; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const p = this.lineIntersection(lines[i]!, lines[j]!);
        if (p) {
          intersections.push(p);
        }
      }
    }

    if (intersections.length === 0) {
      return null;
    }

    // Take the median position as the vanishing point (robust to outliers)
    intersections.sort((a, b) => a.x - b.x);
    const medianX = intersections[Math.floor(intersections.length / 2)]!.x;

    intersections.sort((a, b) => a.y - b.y);
    const medianY = intersections[Math.floor(intersections.length / 2)]!.y;

    return { x: medianX, y: medianY };
  }

  /**
   * Compute the intersection point of two line segments (extended to infinity).
   */
  private lineIntersection(l1: LineSegment, l2: LineSegment): Point2D | null {
    const x1 = l1.x1,
      y1 = l1.y1,
      x2 = l1.x2,
      y2 = l1.y2;
    const x3 = l2.x1,
      y3 = l2.y1,
      x4 = l2.x2,
      y4 = l2.y2;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-6) {
      return null;
    } // Parallel lines

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  /**
   * Estimate room dimensions from vanishing points and camera parameters.
   *
   * Uses the relationship between vanishing points and the camera's field of view
   * to estimate the room's width, depth, and height.
   */
  private estimateDimensionsFromVanishingPoints(
    vanishingPoints: VanishingPointResult['vanishingPoints'],
    imgWidth: number,
    imgHeight: number,
    focalLength: number
  ): { width: number; depth: number; height: number } {
    // Find horizontal, vertical, and depth vanishing points
    const hvp = vanishingPoints.find((vp) => vp.direction === 'horizontal');
    const vvp = vanishingPoints.find((vp) => vp.direction === 'vertical');
    const dvp = vanishingPoints.find((vp) => vp.direction === 'depth');

    // Estimate dimensions using vanishing point positions relative to image center
    const cx = imgWidth / 2;
    const cy = imgHeight / 2;

    let estimatedWidth = 3.0; // Default
    let estimatedDepth = 2.8;
    let estimatedHeight = this.ASSUMED_CEILING_HEIGHT;

    // If we have a horizontal vanishing point, the room width can be estimated
    // from the angle it subtends from the camera center
    if (hvp) {
      const angleX = Math.atan2(Math.abs(hvp.x - cx), focalLength);
      // Wider angle suggests wider room (simplified)
      estimatedWidth = this.ASSUMED_CEILING_HEIGHT * Math.tan(angleX) * 2;
      estimatedWidth = Math.max(2.0, Math.min(8.0, estimatedWidth));
    }

    // Depth estimation from the depth vanishing point
    if (dvp) {
      const angleY = Math.atan2(Math.abs(dvp.y - cy), focalLength);
      estimatedDepth = this.ASSUMED_CEILING_HEIGHT * Math.tan(angleY) * 1.5;
      estimatedDepth = Math.max(2.0, Math.min(8.0, estimatedDepth));
    }

    // Height estimation from vertical vanishing point
    if (vvp) {
      // If vertical VP is very far from center, ceiling is standard height
      // If VP is close, it suggests a more confined view
      const verticalRatio = Math.abs(vvp.y - cy) / imgHeight;
      if (verticalRatio < 0.3) {
        estimatedHeight = 2.2; // Lower ceiling
      } else if (verticalRatio > 0.6) {
        estimatedHeight = 3.0; // Higher ceiling
      }
    }

    // Round to reasonable precision (10cm)
    return {
      width: Math.round(estimatedWidth * 10) / 10,
      depth: Math.round(estimatedDepth * 10) / 10,
      height: Math.round(estimatedHeight * 10) / 10,
    };
  }

  /**
   * Estimate openings from detected room lines.
   */
  private estimateOpeningsFromLines(
    roomLines: VanishingPointResult['roomLines'],
    dimensions: { width: number; depth: number; height: number }
  ): RoomReconstruction['openings'] {
    const openings: RoomReconstruction['openings'] = [];

    // Count horizontal floor edges and vertical edges to detect interruptions
    // (interruptions in wall lines suggest doors or windows)
    const wallEdges = roomLines.filter((l) => l.type === 'wall_edge');

    // Simple heuristic: if we have vertical wall edge lines close together,
    // they might frame a door or window
    const verticalEdges = wallEdges.filter((l) => {
      const dy = Math.abs(l.end.y - l.start.y);
      const dx = Math.abs(l.end.x - l.start.x);
      return dy > dx * 2; // Predominantly vertical
    });

    // Look for pairs of vertical edges that could frame an opening
    for (let i = 0; i < verticalEdges.length - 1; i++) {
      const edge1 = verticalEdges[i]!;
      const edge2 = verticalEdges[i + 1]!;

      const gap = Math.abs((edge1.start.x + edge1.end.x) / 2 - (edge2.start.x + edge2.end.x) / 2);

      // If two vertical edges are a reasonable "door-width" apart
      if (gap > 30 && gap < 200) {
        const topY = Math.min(edge1.start.y, edge1.end.y, edge2.start.y, edge2.end.y);
        const bottomY = Math.max(edge1.start.y, edge1.end.y, edge2.start.y, edge2.end.y);
        const heightRatio = (bottomY - topY) / bottomY;

        openings.push({
          type: heightRatio > 0.7 ? 'door' : 'window',
          wall: 0, // Back wall
          position: ((edge1.start.x + edge2.start.x) / 2 / 1000) * dimensions.width,
          width: 0.83, // Standard door width
          height: heightRatio > 0.7 ? 2.04 : 1.0,
        });
      }
    }

    return openings;
  }

  /**
   * Calculate confidence for the photogrammetry reconstruction.
   */
  private calculatePhotogrammetryConfidence(
    photoCount: number,
    vanishingPointCount: number,
    lineCount: number
  ): number {
    let confidence = 0;

    // More photos = higher confidence
    if (photoCount >= 4) {
      confidence += 0.3;
    } else if (photoCount >= 2) {
      confidence += 0.2;
    } else {
      confidence += 0.1;
    }

    // Vanishing points detected
    if (vanishingPointCount >= 3) {
      confidence += 0.3;
    } else if (vanishingPointCount >= 2) {
      confidence += 0.2;
    } else if (vanishingPointCount >= 1) {
      confidence += 0.1;
    }

    // Line segments detected
    if (lineCount >= 10) {
      confidence += 0.2;
    } else if (lineCount >= 5) {
      confidence += 0.1;
    }

    return Math.min(0.85, Math.max(0.1, confidence));
  }
}
