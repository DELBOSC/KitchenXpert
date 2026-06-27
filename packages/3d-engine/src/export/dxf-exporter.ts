import * as THREE from 'three';

/**
 * DXF export options
 */
export interface DXFExportOptions {
  /** Scale factor: 1 DXF unit = 1mm (default 1) */
  scale?: number;
  /** Include dimension annotations (default true) */
  includeAnnotations?: boolean;
  /** Include furniture outlines (default true) */
  includeFurniture?: boolean;
  /** Include technical points (water/electric/gas symbols) (default true) */
  includeTechnicalPoints?: boolean;
  /** Paper size for layout (default 'A4') */
  paperSize?: 'A4' | 'A3' | 'A2' | 'A1';
  /** Include material hatch patterns (default true) */
  includeHatchPatterns?: boolean;
  /** Include title block (default true) */
  includeTitleBlock?: boolean;
  /** Include north arrow (default true) */
  includeNorthArrow?: boolean;
  /** Project name for title block */
  projectName?: string;
  /** Drawing scale text for title block (e.g. '1:50') */
  drawingScale?: string;
}

/**
 * Represents a kitchen scene with the data needed for DXF export.
 * Mirrors KitchenScene from engine/scene.ts without a hard coupling.
 */
export interface KitchenSceneData {
  /** The Three.js scene */
  threeScene: THREE.Scene;
  /** All tracked objects in the scene */
  objects: Map<string, THREE.Object3D>;
  /** Room width in meters */
  roomWidth: number;
  /** Room depth in meters */
  roomDepth: number;
  /** Room height in meters */
  roomHeight: number;
}

// --- DXF layer definitions ---

interface DXFLayerDef {
  name: string;
  color: number; // ACI color index
  lineweight: number; // in hundredths of mm
}

const LAYERS: DXFLayerDef[] = [
  { name: 'WALLS', color: 7, lineweight: 50 },
  { name: 'CABINETS', color: 3, lineweight: 25 },
  { name: 'APPLIANCES', color: 1, lineweight: 25 },
  { name: 'DIMENSIONS', color: 5, lineweight: 13 },
  { name: 'TECHNICAL', color: 6, lineweight: 13 },
  { name: 'TEXT', color: 7, lineweight: -1 },
  { name: 'HATCH', color: 8, lineweight: 5 },
  { name: 'TITLEBLOCK', color: 7, lineweight: 30 },
  { name: 'NORTH_ARROW', color: 7, lineweight: 20 },
];

// ACI color indices for technical point types
const TECHNICAL_COLORS: Record<string, number> = {
  water: 5, // blue
  electric: 1, // red
  gas: 2, // yellow
  ventilation: 8, // gray
};

// Technical symbol letters for normalized symbols
const TECHNICAL_SYMBOL_LETTERS: Record<string, string> = {
  water: 'W',
  electric: 'E',
  gas: 'G',
  ventilation: 'V',
};

/**
 * Internal representation of a furniture bounding box for dimension calculation.
 */
interface FurnitureBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  type: string;
  label: string;
  material: string;
}

/**
 * Exports a kitchen layout as a DXF string.
 * Generates valid ASCII DXF (version R12 / AC1009) compatible with
 * AutoCAD, LibreCAD, DraftSight, and other CAD software.
 *
 * Enhanced features:
 * - Auto-dimensioning between walls, cabinets, and overall room
 * - Material hatch patterns (diagonal lines for wood, dots for stone, cross-hatch for appliances)
 * - Normalized technical symbols (circle + letter for water/electric/gas/ventilation)
 * - Title block with project info, date, scale, and border
 * - North arrow indicator
 *
 * No npm dependencies required -- the DXF format is plain text with group codes.
 */
export class DXFExporter {
  /**
   * Exports the kitchen layout as a DXF string.
   */
  export(scene: KitchenSceneData, options?: DXFExportOptions): string {
    if (scene.roomWidth <= 0 || scene.roomDepth <= 0) {
      throw new Error(
        `DXFExporter: invalid room dimensions — roomWidth (${scene.roomWidth}) and roomDepth (${scene.roomDepth}) must both be greater than 0`
      );
    }

    const opts: Required<DXFExportOptions> = {
      scale: options?.scale ?? 1,
      includeAnnotations: options?.includeAnnotations ?? true,
      includeFurniture: options?.includeFurniture ?? true,
      includeTechnicalPoints: options?.includeTechnicalPoints ?? true,
      paperSize: options?.paperSize ?? 'A4',
      includeHatchPatterns: options?.includeHatchPatterns ?? true,
      includeTitleBlock: options?.includeTitleBlock ?? true,
      includeNorthArrow: options?.includeNorthArrow ?? true,
      projectName: options?.projectName ?? 'Kitchen Design',
      drawingScale: options?.drawingScale ?? '1:1',
    };

    const lines: string[] = [];

    // Collect entities first so we know what to write
    const entities = this.collectEntities(scene, opts);

    // HEADER section
    this.writeHeader(lines, scene, opts);

    // TABLES section
    this.writeTables(lines);

    // BLOCKS section (empty, but required)
    this.writeBlocks(lines);

    // ENTITIES section
    this.writeEntities(lines, entities);

    // EOF
    lines.push('0', 'EOF');

    return lines.join('\n');
  }

  /**
   * Export and trigger a browser download of the DXF file.
   */
  download(
    scene: KitchenSceneData,
    filename: string = 'kitchen-plan',
    options?: DXFExportOptions
  ): void {
    const dxfContent = this.export(scene, options);
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.dxf`;
    link.click();
    // Delayed revocation for download to complete
    requestAnimationFrame(() => {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });
  }

  // ---------- HEADER section ----------

  private writeHeader(
    lines: string[],
    scene: KitchenSceneData,
    opts: Required<DXFExportOptions>
  ): void {
    const scale = opts.scale;
    const roomW = scene.roomWidth * 1000 * scale; // meters -> mm -> scaled
    const roomD = scene.roomDepth * 1000 * scale;

    // Add margin for dimensions and title block
    const margin = 500;
    const titleBlockHeight = 300;

    lines.push(
      '0',
      'SECTION',
      '2',
      'HEADER',
      // AutoCAD version AC1009 = R12
      '9',
      '$ACADVER',
      '1',
      'AC1009',
      // Insert units: 4 = millimeters
      '9',
      '$INSUNITS',
      '70',
      '4',
      // Drawing extents (expanded to include title block and margins)
      '9',
      '$EXTMIN',
      '10',
      (-margin).toFixed(1),
      '20',
      (-margin - titleBlockHeight).toFixed(1),
      '30',
      '0.0',
      '9',
      '$EXTMAX',
      '10',
      (roomW + margin).toFixed(1),
      '20',
      (roomD + margin).toFixed(1),
      '30',
      '0.0',
      // Limits
      '9',
      '$LIMMIN',
      '10',
      (-margin).toFixed(1),
      '20',
      (-margin - titleBlockHeight).toFixed(1),
      '9',
      '$LIMMAX',
      '10',
      (roomW + margin).toFixed(1),
      '20',
      (roomD + margin).toFixed(1),
      '0',
      'ENDSEC'
    );
  }

  // ---------- TABLES section ----------

  private writeTables(lines: string[]): void {
    lines.push('0', 'SECTION', '2', 'TABLES');

    // LTYPE table (required for R12)
    lines.push('0', 'TABLE', '2', 'LTYPE', '70', String(LAYERS.length + 1));
    // CONTINUOUS line type
    lines.push(
      '0',
      'LTYPE',
      '2',
      'CONTINUOUS',
      '70',
      '0',
      '3',
      'Solid line',
      '72',
      '65',
      '73',
      '0',
      '40',
      '0.0'
    );
    lines.push('0', 'ENDTAB');

    // LAYER table
    lines.push('0', 'TABLE', '2', 'LAYER', '70', String(LAYERS.length));

    for (const layer of LAYERS) {
      lines.push(
        '0',
        'LAYER',
        '2',
        layer.name,
        '70',
        '0', // not frozen, not locked
        '62',
        String(layer.color),
        '6',
        'CONTINUOUS'
      );
    }

    lines.push('0', 'ENDTAB');

    // STYLE table (text style)
    lines.push('0', 'TABLE', '2', 'STYLE', '70', '1');
    lines.push(
      '0',
      'STYLE',
      '2',
      'STANDARD',
      '70',
      '0',
      '40',
      '0.0', // text height (0 = variable)
      '41',
      '1.0', // width factor
      '50',
      '0.0', // oblique angle
      '71',
      '0',
      '42',
      '2.5', // last used text height
      '3',
      'txt', // font file
      '4',
      ''
    );
    lines.push('0', 'ENDTAB');

    lines.push('0', 'ENDSEC');
  }

  // ---------- BLOCKS section ----------

  private writeBlocks(lines: string[]): void {
    lines.push('0', 'SECTION', '2', 'BLOCKS', '0', 'ENDSEC');
  }

  // ---------- ENTITIES section ----------

  private writeEntities(lines: string[], entities: string[]): void {
    lines.push('0', 'SECTION', '2', 'ENTITIES');
    lines.push(...entities);
    lines.push('0', 'ENDSEC');
  }

  // ---------- Entity collection ----------

  private collectEntities(scene: KitchenSceneData, opts: Required<DXFExportOptions>): string[] {
    const entities: string[] = [];
    const scale = opts.scale;
    const toMm = (meters: number) => meters * 1000 * scale;

    const roomW = toMm(scene.roomWidth);
    const roomD = toMm(scene.roomDepth);

    // --- Draw walls ---
    const wallEntities = this.collectWallEntities(scene, toMm);
    if (wallEntities.length === 0) {
      // No wall objects found, draw default room outline
      this.addLine(entities, 'WALLS', 0, 0, roomW, 0);
      this.addLine(entities, 'WALLS', roomW, 0, roomW, roomD);
      this.addLine(entities, 'WALLS', roomW, roomD, 0, roomD);
      this.addLine(entities, 'WALLS', 0, roomD, 0, 0);
    } else {
      entities.push(...wallEntities);
    }

    // --- Collect furniture bounding boxes for dimensions and hatch ---
    const furnitureBoxes: FurnitureBox[] = [];

    // --- Draw furniture (cabinets and appliances) ---
    if (opts.includeFurniture) {
      this.collectFurnitureEntities(scene, entities, toMm, furnitureBoxes);
    }

    // --- Draw material hatch patterns ---
    if (opts.includeHatchPatterns && opts.includeFurniture) {
      this.addMaterialHatchPatterns(entities, furnitureBoxes);
    }

    // --- Draw technical points with normalized symbols ---
    if (opts.includeTechnicalPoints) {
      this.collectTechnicalPointEntities(scene, entities, toMm);
    }

    // --- Draw dimension annotations ---
    if (opts.includeAnnotations) {
      this.addRoomDimensions(entities, roomW, roomD);
      this.addCabinetDimensions(entities, furnitureBoxes, roomW, roomD);
      this.addOverallDimensions(entities, roomW, roomD);
    }

    // --- Draw title block ---
    if (opts.includeTitleBlock) {
      this.addTitleBlock(entities, roomW, roomD, opts);
    }

    // --- Draw north arrow ---
    if (opts.includeNorthArrow) {
      this.addNorthArrow(entities, roomW, roomD);
    }

    return entities;
  }

  /**
   * Collects wall LINE entities from wall objects in the scene.
   */
  private collectWallEntities(scene: KitchenSceneData, toMm: (m: number) => number): string[] {
    const entities: string[] = [];

    for (const [, obj] of scene.objects) {
      if (obj.userData.type !== 'wall') continue;

      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) continue;

      // Transform from Three.js Y-up to DXF 2D X/Y:
      // Three.js X -> DXF X, Three.js Z -> DXF Y
      const minX = toMm(box.min.x);
      const minY = toMm(box.min.z);
      const maxX = toMm(box.max.x);
      const maxY = toMm(box.max.z);

      // Draw rectangle for each wall footprint
      this.addLine(entities, 'WALLS', minX, minY, maxX, minY);
      this.addLine(entities, 'WALLS', maxX, minY, maxX, maxY);
      this.addLine(entities, 'WALLS', maxX, maxY, minX, maxY);
      this.addLine(entities, 'WALLS', minX, maxY, minX, minY);
    }

    return entities;
  }

  /**
   * Collects cabinet and appliance LWPOLYLINE entities.
   * Also populates the furnitureBoxes array for dimension and hatch calculation.
   */
  private collectFurnitureEntities(
    scene: KitchenSceneData,
    entities: string[],
    toMm: (m: number) => number,
    furnitureBoxes: FurnitureBox[]
  ): void {
    for (const [, obj] of scene.objects) {
      const objType = obj.userData.type as string | undefined;

      // Skip walls, floors, ceilings, and internal objects
      if (!objType || objType === 'wall' || objType === 'floor' || objType === 'ceiling') continue;
      if (objType === 'technical_point') continue;
      if (obj.name.startsWith('__')) continue;

      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) continue;

      // Transform from Three.js Y-up to DXF 2D X/Y
      const minX = toMm(box.min.x);
      const minY = toMm(box.min.z);
      const maxX = toMm(box.max.x);
      const maxY = toMm(box.max.z);

      // Choose layer based on object type
      const isAppliance = this.isAppliance(objType);
      const layer = isAppliance ? 'APPLIANCES' : 'CABINETS';

      // Determine material category
      const material = this.getMaterialCategory(obj, objType);

      // Draw as LWPOLYLINE rectangle
      this.addLwpolylineRect(entities, layer, minX, minY, maxX, maxY);

      // Add label
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const label = obj.userData.name || obj.name || objType;
      if (label) {
        this.addText(entities, layer, centerX, centerY, label, 40);
      }

      // Store bounding box for dimension and hatch calculation
      furnitureBoxes.push({
        minX,
        minY,
        maxX,
        maxY,
        type: objType,
        label: label || objType,
        material,
      });
    }
  }

  /**
   * Collects technical point entities from the scene.
   * Uses normalized symbols: circle with letter inside (W, E, G, V).
   */
  private collectTechnicalPointEntities(
    scene: KitchenSceneData,
    entities: string[],
    toMm: (m: number) => number
  ): void {
    const processedPositions = new Set<string>();

    scene.threeScene.traverse((obj) => {
      if (!obj.userData.technicalPoint) return;

      const tp = obj.userData.technicalPoint as {
        type?: string;
        subtype?: string;
      };

      const tpType = tp.type || 'electric';

      // Transform from Three.js Y-up to DXF 2D X/Y
      const x = toMm(obj.position.x);
      const y = toMm(obj.position.z);

      const posKey = `${x.toFixed(0)}_${y.toFixed(0)}_${tpType}`;
      if (processedPositions.has(posKey)) return;
      processedPositions.add(posKey);

      const color = TECHNICAL_COLORS[tpType] ?? 6;
      this.addTechnicalSymbol(entities, x, y, tpType, color);

      // Label for the technical point subtype
      const label = tp.subtype || tpType;
      this.addText(entities, 'TECHNICAL', x, y - 80, label, 25);
    });

    // Also look for technical points stored on the objects map
    for (const [, obj] of scene.objects) {
      if (obj.userData.type !== 'technical_point') continue;

      const tpType = (obj.userData.technicalType as string) || 'electric';
      const x = toMm(obj.position.x);
      const y = toMm(obj.position.z);

      const posKey = `${x.toFixed(0)}_${y.toFixed(0)}_${tpType}`;
      if (processedPositions.has(posKey)) continue;
      processedPositions.add(posKey);

      const color = TECHNICAL_COLORS[tpType] ?? 6;
      this.addTechnicalSymbol(entities, x, y, tpType, color);

      const label = (obj.userData.technicalSubtype as string) || tpType;
      this.addText(entities, 'TECHNICAL', x, y - 80, label, 25);
    }
  }

  // ---------- Auto-dimensioning ----------

  /**
   * Adds room dimension lines and text annotations on the DIMENSIONS layer.
   * Draws proper dimension lines with extension lines and ticks.
   */
  private addRoomDimensions(entities: string[], roomW: number, roomD: number): void {
    const offset = -200; // mm below/left of the room outline

    // Width dimension (along X axis, below)
    this.addLinearDimension(entities, 0, 0, roomW, 0, offset, 'horizontal');

    // Depth dimension (along Y axis, left)
    this.addLinearDimension(entities, 0, 0, 0, roomD, offset, 'vertical');
  }

  /**
   * Adds dimension annotations between adjacent cabinets along each wall.
   * Also adds dimensions from wall corners to first/last cabinet.
   */
  private addCabinetDimensions(
    entities: string[],
    furnitureBoxes: FurnitureBox[],
    roomW: number,
    roomD: number
  ): void {
    if (furnitureBoxes.length === 0) return;

    // Categorize cabinets by wall proximity
    const bottomWall: FurnitureBox[] = []; // near Y=0
    const topWall: FurnitureBox[] = []; // near Y=roomD
    const leftWall: FurnitureBox[] = []; // near X=0
    const rightWall: FurnitureBox[] = []; // near X=roomW

    const wallThreshold = 150; // mm tolerance for "near wall"

    for (const fb of furnitureBoxes) {
      if (fb.minY < wallThreshold) bottomWall.push(fb);
      else if (fb.maxY > roomD - wallThreshold) topWall.push(fb);

      if (fb.minX < wallThreshold) leftWall.push(fb);
      else if (fb.maxX > roomW - wallThreshold) rightWall.push(fb);
    }

    // Dimension cabinets along bottom wall (sorted by X)
    if (bottomWall.length > 0) {
      const sorted = [...bottomWall].sort((a, b) => a.minX - b.minX);
      const dimY = -350; // below room dimension line

      // Individual cabinet widths
      for (const fb of sorted) {
        this.addLinearDimension(entities, fb.minX, fb.minY, fb.maxX, fb.minY, dimY, 'horizontal');
      }

      // Gap from wall start to first cabinet
      if (sorted[0] && sorted[0].minX > 10) {
        this.addLinearDimension(entities, 0, 0, sorted[0].minX, 0, dimY - 120, 'horizontal');
      }

      // Gaps between adjacent cabinets
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i]!;
        const next = sorted[i + 1]!;
        const gap = next.minX - current.maxX;
        if (gap > 10) {
          this.addLinearDimension(
            entities,
            current.maxX,
            0,
            next.minX,
            0,
            dimY - 120,
            'horizontal'
          );
        }
      }

      // Gap from last cabinet to wall end
      const last = sorted[sorted.length - 1]!;
      if (roomW - last.maxX > 10) {
        this.addLinearDimension(entities, last.maxX, 0, roomW, 0, dimY - 120, 'horizontal');
      }
    }

    // Dimension cabinets along left wall (sorted by Y)
    if (leftWall.length > 0) {
      const sorted = [...leftWall].sort((a, b) => a.minY - b.minY);
      const dimX = -350; // left of room dimension line

      for (const fb of sorted) {
        this.addLinearDimension(entities, fb.minX, fb.minY, fb.minX, fb.maxY, dimX, 'vertical');
      }
    }

    // Dimension cabinets along top wall (sorted by X)
    if (topWall.length > 0) {
      const sorted = [...topWall].sort((a, b) => a.minX - b.minX);
      const dimY = roomD + 150;

      for (const fb of sorted) {
        this.addLinearDimension(entities, fb.minX, fb.maxY, fb.maxX, fb.maxY, dimY, 'horizontal');
      }
    }

    // Dimension cabinets along right wall (sorted by Y)
    if (rightWall.length > 0) {
      const sorted = [...rightWall].sort((a, b) => a.minY - b.minY);
      const dimX = roomW + 150;

      for (const fb of sorted) {
        this.addLinearDimension(entities, fb.maxX, fb.minY, fb.maxX, fb.maxY, dimX, 'vertical');
      }
    }
  }

  /**
   * Adds overall room dimensions at a further offset from the wall dimensions.
   */
  private addOverallDimensions(entities: string[], roomW: number, roomD: number): void {
    const outerOffset = -400;

    // Overall width dimension at the very bottom
    this.addLinearDimension(entities, 0, 0, roomW, 0, outerOffset - 150, 'horizontal');

    // Overall depth dimension at the very left
    this.addLinearDimension(entities, 0, 0, 0, roomD, outerOffset - 150, 'vertical');
  }

  /**
   * Draws a linear dimension as LINE + TEXT entities.
   * Includes dimension line, extension lines, and ticks (arrow substitutes).
   */
  private addLinearDimension(
    entities: string[],
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    offset: number,
    direction: 'horizontal' | 'vertical'
  ): void {
    const tickSize = 30;
    const textHeight = 40;

    if (direction === 'horizontal') {
      const dimY = y1 + offset;
      const length = Math.abs(x2 - x1);
      if (length < 1) return;

      const startX = Math.min(x1, x2);
      const endX = Math.max(x1, x2);

      // Extension lines (from object to dimension line)
      this.addLine(entities, 'DIMENSIONS', startX, y1, startX, dimY - tickSize);
      this.addLine(entities, 'DIMENSIONS', endX, y2, endX, dimY - tickSize);

      // Dimension line
      this.addLine(entities, 'DIMENSIONS', startX, dimY, endX, dimY);

      // Tick marks at both ends (oblique slash style)
      this.addLine(
        entities,
        'DIMENSIONS',
        startX - tickSize / 2,
        dimY - tickSize / 2,
        startX + tickSize / 2,
        dimY + tickSize / 2
      );
      this.addLine(
        entities,
        'DIMENSIONS',
        endX - tickSize / 2,
        dimY - tickSize / 2,
        endX + tickSize / 2,
        dimY + tickSize / 2
      );

      // Dimension text
      const midX = (startX + endX) / 2;
      this.addText(
        entities,
        'DIMENSIONS',
        midX,
        dimY + textHeight / 2 + 5,
        `${Math.round(length)}`,
        textHeight
      );
    } else {
      const dimX = x1 + offset;
      const length = Math.abs(y2 - y1);
      if (length < 1) return;

      const startY = Math.min(y1, y2);
      const endY = Math.max(y1, y2);

      // Extension lines
      this.addLine(entities, 'DIMENSIONS', x1, startY, dimX - tickSize, startY);
      this.addLine(entities, 'DIMENSIONS', x2, endY, dimX - tickSize, endY);

      // Dimension line
      this.addLine(entities, 'DIMENSIONS', dimX, startY, dimX, endY);

      // Tick marks
      this.addLine(
        entities,
        'DIMENSIONS',
        dimX - tickSize / 2,
        startY - tickSize / 2,
        dimX + tickSize / 2,
        startY + tickSize / 2
      );
      this.addLine(
        entities,
        'DIMENSIONS',
        dimX - tickSize / 2,
        endY - tickSize / 2,
        dimX + tickSize / 2,
        endY + tickSize / 2
      );

      // Dimension text (rotated 90 degrees)
      const midY = (startY + endY) / 2;
      this.addText(
        entities,
        'DIMENSIONS',
        dimX - textHeight / 2 - 5,
        midY,
        `${Math.round(length)}`,
        textHeight,
        90
      );
    }
  }

  // ---------- Material hatch patterns ----------

  /**
   * Adds material hatch patterns inside furniture rectangles.
   * Uses LINE entities to simulate hatch patterns since R12 DXF has limited HATCH support.
   *
   * Patterns:
   * - Wood (cabinets): diagonal lines (ANSI31 pattern)
   * - Stone (countertops): dot pattern (DOTS pattern) using small circles
   * - Appliances: cross-hatch (ANSI37 pattern)
   */
  private addMaterialHatchPatterns(entities: string[], furnitureBoxes: FurnitureBox[]): void {
    for (const fb of furnitureBoxes) {
      const width = fb.maxX - fb.minX;
      const height = fb.maxY - fb.minY;

      // Skip very small objects
      if (width < 20 || height < 20) continue;

      switch (fb.material) {
        case 'wood':
          this.addDiagonalHatch(entities, fb.minX, fb.minY, fb.maxX, fb.maxY, 30);
          break;
        case 'stone':
          this.addDotHatch(entities, fb.minX, fb.minY, fb.maxX, fb.maxY, 40);
          break;
        case 'appliance':
          this.addCrossHatch(entities, fb.minX, fb.minY, fb.maxX, fb.maxY, 30);
          break;
        default:
          // No hatch for unknown materials
          break;
      }
    }
  }

  /**
   * Draws diagonal lines (ANSI31-style hatch) for wood materials.
   * Lines go from bottom-left to top-right at 45 degrees.
   */
  private addDiagonalHatch(
    entities: string[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    spacing: number
  ): void {
    const width = maxX - minX;
    const height = maxY - minY;
    const totalDiag = width + height;

    for (let d = spacing; d < totalDiag; d += spacing) {
      // Line from bottom edge or left edge to top edge or right edge
      let x1: number, y1: number, x2: number, y2: number;

      if (d <= height) {
        x1 = minX;
        y1 = minY + d;
      } else {
        x1 = minX + (d - height);
        y1 = maxY;
      }

      if (d <= width) {
        x2 = minX + d;
        y2 = minY;
      } else {
        x2 = maxX;
        y2 = minY + (d - width);
      }

      // Clip to bounding box
      if (
        x1 >= minX &&
        x1 <= maxX &&
        y1 >= minY &&
        y1 <= maxY &&
        x2 >= minX &&
        x2 <= maxX &&
        y2 >= minY &&
        y2 <= maxY
      ) {
        this.addLine(entities, 'HATCH', x1, y1, x2, y2);
      }
    }
  }

  /**
   * Draws small circles in a grid pattern (DOTS-style hatch) for stone/countertop materials.
   */
  private addDotHatch(
    entities: string[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    spacing: number
  ): void {
    const dotRadius = 3;
    const inset = spacing / 2;

    for (let x = minX + inset; x < maxX; x += spacing) {
      for (let y = minY + inset; y < maxY; y += spacing) {
        this.addCircle(entities, 'HATCH', x, y, dotRadius);
      }
    }
  }

  /**
   * Draws cross-hatch lines (ANSI37-style) for appliance materials.
   * Combines diagonal lines in both directions.
   */
  private addCrossHatch(
    entities: string[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    spacing: number
  ): void {
    // Forward diagonal lines (bottom-left to top-right)
    this.addDiagonalHatch(entities, minX, minY, maxX, maxY, spacing);

    // Reverse diagonal lines (top-left to bottom-right)
    const width = maxX - minX;
    const height = maxY - minY;
    const totalDiag = width + height;

    for (let d = spacing; d < totalDiag; d += spacing) {
      let x1: number, y1: number, x2: number, y2: number;

      // Lines going from top-left toward bottom-right
      if (d <= width) {
        x1 = minX + d;
        y1 = maxY;
      } else {
        x1 = maxX;
        y1 = maxY - (d - width);
      }

      if (d <= height) {
        x2 = minX;
        y2 = maxY - d;
      } else {
        x2 = minX + (d - height);
        y2 = minY;
      }

      if (
        x1 >= minX &&
        x1 <= maxX &&
        y1 >= minY &&
        y1 <= maxY &&
        x2 >= minX &&
        x2 <= maxX &&
        y2 >= minY &&
        y2 <= maxY
      ) {
        this.addLine(entities, 'HATCH', x1, y1, x2, y2);
      }
    }
  }

  // ---------- Normalized technical symbols ----------

  /**
   * Draws a normalized technical symbol: circle with a letter inside.
   * - Water: circle + "W"
   * - Electric: circle + "E"
   * - Gas: circle + "G"
   * - Ventilation: circle + "V"
   */
  private addTechnicalSymbol(
    entities: string[],
    x: number,
    y: number,
    tpType: string,
    color: number
  ): void {
    const radius = tpType === 'gas' ? 60 : 50;

    // Outer circle
    this.addCircle(entities, 'TECHNICAL', x, y, radius, color);

    // Inner circle (slightly smaller for double-circle effect)
    this.addCircle(entities, 'TECHNICAL', x, y, radius * 0.75, color);

    // Letter symbol inside the circle
    const letter = TECHNICAL_SYMBOL_LETTERS[tpType] || tpType.charAt(0).toUpperCase();
    const textHeight = radius * 0.8;
    this.addText(entities, 'TECHNICAL', x, y - textHeight / 4, letter, textHeight);
  }

  // ---------- Title block ----------

  /**
   * Adds a title block in the bottom-right area below the drawing.
   * Includes: project name, date, scale, "Generated by KitchenXpert", and a drawing border.
   */
  private addTitleBlock(
    entities: string[],
    roomW: number,
    roomD: number,
    opts: Required<DXFExportOptions>
  ): void {
    const layer = 'TITLEBLOCK';

    // Title block dimensions
    const tbWidth = 400;
    const tbHeight = 200;
    const margin = 100;

    // Position: bottom-right of drawing area
    const tbX = roomW - tbWidth + margin;
    const tbY = -300;

    // Drawing border (rectangle around the entire drawing with margins)
    const borderMargin = 50;
    this.addLine(
      entities,
      layer,
      -borderMargin,
      -250 - borderMargin,
      roomW + borderMargin,
      -250 - borderMargin
    );
    this.addLine(
      entities,
      layer,
      roomW + borderMargin,
      -250 - borderMargin,
      roomW + borderMargin,
      roomD + borderMargin
    );
    this.addLine(
      entities,
      layer,
      roomW + borderMargin,
      roomD + borderMargin,
      -borderMargin,
      roomD + borderMargin
    );
    this.addLine(
      entities,
      layer,
      -borderMargin,
      roomD + borderMargin,
      -borderMargin,
      -250 - borderMargin
    );

    // Title block rectangle
    this.addLine(entities, layer, tbX, tbY, tbX + tbWidth, tbY);
    this.addLine(entities, layer, tbX + tbWidth, tbY, tbX + tbWidth, tbY + tbHeight);
    this.addLine(entities, layer, tbX + tbWidth, tbY + tbHeight, tbX, tbY + tbHeight);
    this.addLine(entities, layer, tbX, tbY + tbHeight, tbX, tbY);

    // Horizontal divider lines inside title block
    const rowHeight = tbHeight / 5;
    for (let i = 1; i < 5; i++) {
      this.addLine(entities, layer, tbX, tbY + rowHeight * i, tbX + tbWidth, tbY + rowHeight * i);
    }

    // Text entries
    const textH = 25;
    const textX = tbX + 10;
    const date = new Date().toISOString().split('T')[0] || '';

    // Row 1: Project name
    this.addText(
      entities,
      layer,
      textX + tbWidth / 2 - 10,
      tbY + rowHeight * 0.5,
      opts.projectName,
      textH + 5
    );

    // Row 2: Date
    this.addText(entities, layer, textX + 30, tbY + rowHeight * 1.5, `Date: ${date}`, textH);

    // Row 3: Scale
    this.addText(
      entities,
      layer,
      textX + 30,
      tbY + rowHeight * 2.5,
      `Scale: ${opts.drawingScale}`,
      textH
    );

    // Row 4: Room dimensions
    this.addText(
      entities,
      layer,
      textX + 30,
      tbY + rowHeight * 3.5,
      `Room: ${Math.round(roomW)} x ${Math.round(roomD)} mm`,
      textH
    );

    // Row 5: Generated by
    this.addText(
      entities,
      layer,
      textX + tbWidth / 2 - 10,
      tbY + rowHeight * 4.5,
      'Generated by KitchenXpert',
      textH - 5
    );
  }

  // ---------- North arrow ----------

  /**
   * Adds a simple north arrow indicator in the top-right corner.
   * An arrow pointing upward (north = +Y in DXF) with an "N" label.
   */
  private addNorthArrow(entities: string[], roomW: number, roomD: number): void {
    const layer = 'NORTH_ARROW';

    // Position: top-right corner of the drawing
    const cx = roomW + 100;
    const cy = roomD - 100;
    const arrowLength = 120;
    const arrowHeadSize = 30;

    // Arrow shaft (line pointing up)
    this.addLine(entities, layer, cx, cy - arrowLength / 2, cx, cy + arrowLength / 2);

    // Arrow head (two lines forming a triangle)
    this.addLine(
      entities,
      layer,
      cx,
      cy + arrowLength / 2,
      cx - arrowHeadSize / 2,
      cy + arrowLength / 2 - arrowHeadSize
    );
    this.addLine(
      entities,
      layer,
      cx,
      cy + arrowLength / 2,
      cx + arrowHeadSize / 2,
      cy + arrowLength / 2 - arrowHeadSize
    );

    // Fill the arrowhead with a line connecting the two sides
    this.addLine(
      entities,
      layer,
      cx - arrowHeadSize / 2,
      cy + arrowLength / 2 - arrowHeadSize,
      cx + arrowHeadSize / 2,
      cy + arrowLength / 2 - arrowHeadSize
    );

    // "N" label above the arrow
    this.addText(entities, layer, cx, cy + arrowLength / 2 + 30, 'N', 40);

    // Small circle at the base
    this.addCircle(entities, layer, cx, cy - arrowLength / 2, 8);
  }

  // ---------- DXF entity primitives ----------

  /**
   * Adds a LINE entity.
   */
  private addLine(
    entities: string[],
    layer: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    entities.push(
      '0',
      'LINE',
      '8',
      layer,
      '10',
      x1.toFixed(1),
      '20',
      y1.toFixed(1),
      '30',
      '0.0',
      '11',
      x2.toFixed(1),
      '21',
      y2.toFixed(1),
      '31',
      '0.0'
    );
  }

  /**
   * Adds an LWPOLYLINE rectangle entity (closed).
   * In R12 DXF, LWPOLYLINE is not natively supported, so we use POLYLINE + VERTEX + SEQEND.
   */
  private addLwpolylineRect(
    entities: string[],
    layer: string,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): void {
    // R12 uses POLYLINE entity with VERTEX sub-entities
    entities.push(
      '0',
      'POLYLINE',
      '8',
      layer,
      '66',
      '1', // vertices follow
      '70',
      '1', // closed polyline
      '40',
      '0.0', // default start width
      '41',
      '0.0' // default end width
    );

    // Four corners of the rectangle
    const corners = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ];

    for (const [x, y] of corners) {
      entities.push(
        '0',
        'VERTEX',
        '8',
        layer,
        '10',
        x!.toFixed(1),
        '20',
        y!.toFixed(1),
        '30',
        '0.0'
      );
    }

    entities.push('0', 'SEQEND', '8', layer);
  }

  /**
   * Adds a CIRCLE entity.
   */
  private addCircle(
    entities: string[],
    layer: string,
    x: number,
    y: number,
    radius: number,
    color?: number
  ): void {
    entities.push(
      '0',
      'CIRCLE',
      '8',
      layer,
      '10',
      x.toFixed(1),
      '20',
      y.toFixed(1),
      '30',
      '0.0',
      '40',
      radius.toFixed(1)
    );
    if (color !== undefined) {
      // Insert color override before the entity closes
      // Actually, we need to insert it right after layer.
      // For R12, we re-emit with color embedded:
      // Remove last entries and re-add with color
      const len = entities.length;
      // Find the index of layer group code '8'
      // Simpler approach: just splice the color in after the layer name
      entities.splice(len - 4, 0, '62', String(color));
    }
  }

  /**
   * Adds a TEXT entity.
   */
  private addText(
    entities: string[],
    layer: string,
    x: number,
    y: number,
    text: string,
    height: number = 50,
    rotation: number = 0
  ): void {
    entities.push(
      '0',
      'TEXT',
      '8',
      layer,
      '10',
      x.toFixed(1),
      '20',
      y.toFixed(1),
      '30',
      '0.0',
      '40',
      height.toFixed(1), // text height
      '1',
      text,
      '50',
      rotation.toFixed(1), // rotation angle in degrees
      '72',
      '1' // horizontal justification = center
    );

    // Second alignment point for center justification
    entities.push('11', x.toFixed(1), '21', y.toFixed(1), '31', '0.0');
  }

  // ---------- Utility ----------

  /**
   * Determines if a given object type string represents an appliance.
   */
  private isAppliance(type: string): boolean {
    const applianceTypes = [
      'appliance',
      'oven',
      'dishwasher',
      'refrigerator',
      'fridge',
      'fridge_freezer',
      'microwave',
      'cooktop',
      'stove',
      'hob',
      'hood',
      'washer',
      'dryer',
      'freezer',
      'induction',
    ];
    return applianceTypes.includes(type);
  }

  /**
   * Determines the material category for hatch pattern selection.
   * Returns 'wood', 'stone', or 'appliance'.
   */
  private getMaterialCategory(obj: THREE.Object3D, objType: string): string {
    // Check userData for explicit material info
    const material = (obj.userData.material as string)?.toLowerCase() || '';
    const subtype = (obj.userData.subtype as string)?.toLowerCase() || '';

    if (
      material.includes('stone') ||
      material.includes('granite') ||
      material.includes('marble') ||
      material.includes('quartz') ||
      subtype.includes('countertop') ||
      subtype.includes('worktop') ||
      objType === 'countertop' ||
      objType === 'worktop'
    ) {
      return 'stone';
    }

    if (this.isAppliance(objType)) {
      return 'appliance';
    }

    // Default to wood for cabinets and furniture
    if (
      objType === 'cabinet' ||
      objType === 'furniture' ||
      objType.includes('cabinet') ||
      objType.includes('shelf') ||
      objType.includes('drawer')
    ) {
      return 'wood';
    }

    return 'unknown';
  }
}
