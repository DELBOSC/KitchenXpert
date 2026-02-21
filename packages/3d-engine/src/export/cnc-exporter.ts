import * as THREE from 'three';
import type { KitchenSceneData } from './dxf-exporter';

// ---------- Interfaces ----------

/**
 * A single panel/part to be cut from sheet material.
 */
export interface CutListItem {
  /** Unique identifier for this panel */
  id: string;
  /** Reference to the parent cabinet (name or ID) */
  cabinetRef: string;
  /** Part name describing the panel's role */
  partName: 'side_left' | 'side_right' | 'top' | 'bottom' | 'back' | 'shelf' | 'door' | 'drawer_front';
  /** Material description */
  material: string;
  /** Panel length in mm (along the longer dimension) */
  length: number;
  /** Panel width in mm (along the shorter dimension) */
  width: number;
  /** Panel thickness in mm (typically 16 or 18) */
  thickness: number;
  /** Number of identical panels */
  quantity: number;
  /** Edge banding specification per edge */
  edgeBanding: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
  /** Wood grain direction */
  grain: 'lengthwise' | 'none';
  /** Drilling operations for hardware */
  drilling?: Array<{
    x: number;
    y: number;
    diameter: number;
    depth: number;
    type: 'through' | 'blind';
    purpose: 'hinge' | 'shelf_pin' | 'cam_lock' | 'dowel';
  }>;
}

/**
 * Complete cut list for a kitchen design.
 */
export interface CutList {
  /** All panels to be cut */
  panels: CutListItem[];
  /** Estimated number of full sheets needed */
  totalSheets: number;
  /** Estimated waste percentage */
  wastePercentage: number;
  /** Material breakdown summary */
  materialBreakdown: Array<{
    material: string;
    area: number;      // total area in mm^2
    sheets: number;    // estimated sheets needed
  }>;
}

/**
 * Options for G-code generation.
 */
export interface GCodeOptions {
  /** Feed rate in mm/min (default: 3000) */
  feedRate?: number;
  /** Plunge rate in mm/min (default: 1500) */
  plungeRate?: number;
  /** Spindle speed in RPM (default: 18000) */
  spindleSpeed?: number;
  /** Tool diameter in mm (default: 6) */
  toolDiameter?: number;
  /** Safe height above material in mm (default: 5) */
  safeHeight?: number;
  /** Material thickness in mm (overrides panel thickness) */
  materialThickness?: number;
}

// ---------- Constants ----------

/** Standard full sheet size: 2800 x 2070 mm */
const STANDARD_SHEET_WIDTH = 2800;
const STANDARD_SHEET_HEIGHT = 2070;
const STANDARD_SHEET_AREA = STANDARD_SHEET_WIDTH * STANDARD_SHEET_HEIGHT;

/** Standard panel thicknesses */
const CARCASS_THICKNESS = 16; // mm
const DOOR_THICKNESS = 18;   // mm
const BACK_THICKNESS = 3;    // mm

/** Standard cabinet dimensions (in mm) */
export const BASE_CABINET_HEIGHT = 720;
export const BASE_CABINET_DEPTH = 560;   // 600mm total - 40mm for door gap
export const WALL_CABINET_HEIGHT = 720;
export const WALL_CABINET_DEPTH = 300;   // 320mm - adjustments
export const TALL_CABINET_HEIGHT = 2100;
export const TALL_CABINET_DEPTH = 560;

/** Hinge boring: 35mm cup, 5mm from edge */
const HINGE_CUP_DIAMETER = 35;
const HINGE_CUP_DEPTH = 12;
const HINGE_EDGE_OFFSET = 22.5; // center of 35mm cup, 5mm from edge

/** Shelf pin holes: 5mm diameter, 12.5mm deep */
export const SHELF_PIN_DIAMETER = 5;
export const SHELF_PIN_DEPTH = 12.5;
export const SHELF_PIN_INSET = 37; // from front/back edges

/** Cam lock boring */
const CAM_LOCK_DIAMETER = 15;
const CAM_LOCK_DEPTH = 12;

/** Dowel boring */
export const DOWEL_DIAMETER = 8;
export const DOWEL_DEPTH = 12;

// ---------- Internal types ----------

/**
 * Cabinet classification for decomposition.
 */
type CabinetType = 'base' | 'wall' | 'tall' | 'unknown';

interface CabinetData {
  name: string;
  type: CabinetType;
  width: number;   // mm
  height: number;  // mm
  depth: number;   // mm
  material: string;
  doorCount: number;
  drawerCount: number;
  shelfCount: number;
}

// ---------- CNC Exporter ----------

/**
 * CNC-oriented exporter that generates cut lists and basic G-code
 * compatible output for cabinet manufacturing.
 *
 * Features:
 * - Decompose each cabinet into individual panels (sides, top, bottom, back, shelves, doors)
 * - Generate cut lists with edge banding and grain direction info
 * - Export as CSV for import into CNC optimization software (e.g., CutList Plus, Ardis)
 * - Generate basic G-code for CNC router panel cutting
 * - Calculate material requirements and waste estimates
 *
 * No npm dependencies required.
 */
export class CNCExporter {
  private cncIdCounter: number = 0;

  private generatePanelId(): string {
    this.cncIdCounter++;
    return `PNL-${String(this.cncIdCounter).padStart(4, '0')}`;
  }

  /**
   * Generate a complete cut list for all cabinet panels in the scene.
   */
  generateCutList(scene: KitchenSceneData): CutList {
    this.cncIdCounter = 0;
    const cabinets = this.collectCabinetData(scene);
    const panels: CutListItem[] = [];

    for (const cabinet of cabinets) {
      const cabinetPanels = this.decomposeCabinet(cabinet);
      panels.push(...cabinetPanels);
    }

    // Calculate material breakdown
    const materialBreakdown = this.calculateMaterialBreakdown(panels);

    // Calculate totals
    const totalArea = panels.reduce((sum, p) => sum + (p.length * p.width * p.quantity), 0);
    const totalSheets = Math.ceil(totalArea / STANDARD_SHEET_AREA);
    const actualSheetArea = totalSheets * STANDARD_SHEET_AREA;
    const wastePercentage = actualSheetArea > 0
      ? ((actualSheetArea - totalArea) / actualSheetArea) * 100
      : 0;

    return {
      panels,
      totalSheets: materialBreakdown.reduce((sum, m) => sum + m.sheets, 0),
      wastePercentage: Math.round(wastePercentage * 10) / 10,
      materialBreakdown,
    };
  }

  /**
   * Export a cut list as CSV for import into CNC optimization software.
   * CSV columns: ID, Cabinet, Part, Material, Length(mm), Width(mm), Thickness(mm),
   *              Qty, EdgeTop, EdgeBottom, EdgeLeft, EdgeRight, Grain
   */
  exportAsCSV(cutList: CutList): string {
    const header = [
      'ID',
      'Cabinet',
      'Part',
      'Material',
      'Length (mm)',
      'Width (mm)',
      'Thickness (mm)',
      'Qty',
      'Edge Top',
      'Edge Bottom',
      'Edge Left',
      'Edge Right',
      'Grain',
    ].join(',');

    const rows = cutList.panels.map(panel => {
      return [
        panel.id,
        `"${panel.cabinetRef.replace(/"/g, '""')}"`,
        panel.partName,
        `"${panel.material.replace(/"/g, '""')}"`,
        panel.length.toFixed(1),
        panel.width.toFixed(1),
        panel.thickness.toFixed(1),
        panel.quantity,
        panel.edgeBanding.top ? '1' : '0',
        panel.edgeBanding.bottom ? '1' : '0',
        panel.edgeBanding.left ? '1' : '0',
        panel.edgeBanding.right ? '1' : '0',
        panel.grain,
      ].join(',');
    });

    // Add summary section
    const summaryRows = [
      '',
      'Material Summary',
      'Material,Total Area (m2),Estimated Sheets',
      ...cutList.materialBreakdown.map(m =>
        `"${m.material}",${(m.area / 1_000_000).toFixed(2)},${m.sheets}`
      ),
      '',
      `Total Sheets,${cutList.totalSheets}`,
      `Waste %,${cutList.wastePercentage.toFixed(1)}`,
    ];

    return [header, ...rows, ...summaryRows].join('\n');
  }

  /**
   * Generate basic G-code for a CNC router to cut a single panel.
   *
   * The generated G-code:
   * 1. Sets absolute mode and mm units
   * 2. Moves to safe height
   * 3. Starts spindle
   * 4. Cuts the panel outline with tool radius compensation
   * 5. Adds drilling operations if specified
   * 6. Retracts and stops spindle
   *
   * This is simplified G-code for basic contour cutting.
   * Production-ready code would need nesting optimization and
   * proper tool path strategies.
   */
  generateGCode(panel: CutListItem, options?: GCodeOptions): string {
    const opts: Required<GCodeOptions> = {
      feedRate: options?.feedRate ?? 3000,
      plungeRate: options?.plungeRate ?? 1500,
      spindleSpeed: options?.spindleSpeed ?? 18000,
      toolDiameter: options?.toolDiameter ?? 6,
      safeHeight: options?.safeHeight ?? 5,
      materialThickness: options?.materialThickness ?? panel.thickness,
    };

    const toolRadius = opts.toolDiameter / 2;
    const lines: string[] = [];

    // Header comment
    lines.push(`; CNC Cut Program - Generated by KitchenXpert`);
    lines.push(`; Panel: ${panel.id} - ${panel.partName}`);
    lines.push(`; Cabinet: ${panel.cabinetRef}`);
    lines.push(`; Material: ${panel.material}`);
    lines.push(`; Dimensions: ${panel.length} x ${panel.width} x ${opts.materialThickness} mm`);
    lines.push(`; Tool: ${opts.toolDiameter}mm end mill`);
    lines.push(`; Feed: ${opts.feedRate} mm/min, Plunge: ${opts.plungeRate} mm/min`);
    lines.push(`; Spindle: ${opts.spindleSpeed} RPM`);
    lines.push('');

    // Setup
    lines.push('G90 G21 ; Absolute mode, millimeters');
    lines.push(`G0 Z${opts.safeHeight.toFixed(1)} ; Move to safe height`);
    lines.push(`M3 S${opts.spindleSpeed} ; Spindle on, CW`);
    lines.push('G4 P2 ; Dwell 2 seconds for spindle to reach speed');
    lines.push('');

    // Panel outline cut with tool radius compensation
    // Cut slightly outside the panel dimensions to account for tool radius
    const cutLength = panel.length + toolRadius;
    const cutWidth = panel.width + toolRadius;
    const startX = -toolRadius;
    const startY = -toolRadius;

    // Cut depth - single pass for thin material, multiple passes for thick
    const maxDepthPerPass = 8; // mm per pass
    const totalDepth = opts.materialThickness + 1; // cut 1mm below for full separation
    const passes = Math.ceil(totalDepth / maxDepthPerPass);

    lines.push('; --- Panel outline cut ---');
    lines.push(`G0 X${startX.toFixed(1)} Y${startY.toFixed(1)} ; Move to start position`);

    for (let pass = 1; pass <= passes; pass++) {
      const depth = Math.min(pass * maxDepthPerPass, totalDepth);

      lines.push(`; Pass ${pass}/${passes} - depth ${depth.toFixed(1)}mm`);
      lines.push(`G1 Z-${depth.toFixed(1)} F${opts.plungeRate} ; Plunge to depth`);
      lines.push(`G1 X${cutLength.toFixed(1)} F${opts.feedRate} ; Cut along length`);
      lines.push(`G1 Y${cutWidth.toFixed(1)} ; Cut along width`);
      lines.push(`G1 X${startX.toFixed(1)} ; Return along length`);
      lines.push(`G1 Y${startY.toFixed(1)} ; Complete rectangle`);

      if (pass < passes) {
        // Don't retract between passes
        lines.push('');
      }
    }

    lines.push(`G0 Z${opts.safeHeight.toFixed(1)} ; Retract to safe height`);
    lines.push('');

    // Drilling operations
    if (panel.drilling && panel.drilling.length > 0) {
      lines.push('; --- Drilling operations ---');
      lines.push('; Note: Change to appropriate drill bit before running this section');
      lines.push('');

      for (let i = 0; i < panel.drilling.length; i++) {
        const drill = panel.drilling[i]!;
        lines.push(`; Drill ${i + 1}: ${drill.purpose} (D${drill.diameter}mm, ${drill.type})`);
        lines.push(`G0 X${drill.x.toFixed(1)} Y${drill.y.toFixed(1)} ; Position`);

        if (drill.type === 'through') {
          lines.push(`G1 Z-${(opts.materialThickness + 1).toFixed(1)} F${opts.plungeRate} ; Drill through`);
        } else {
          lines.push(`G1 Z-${drill.depth.toFixed(1)} F${opts.plungeRate} ; Drill blind`);
        }

        lines.push(`G0 Z${opts.safeHeight.toFixed(1)} ; Retract`);
        lines.push('');
      }
    }

    // End program
    lines.push('; --- End program ---');
    lines.push(`G0 Z${opts.safeHeight.toFixed(1)} ; Safe height`);
    lines.push('G0 X0 Y0 ; Return to origin');
    lines.push('M5 ; Spindle off');
    lines.push('M2 ; End program');

    return lines.join('\n');
  }

  /**
   * Export cut list as CSV and trigger a browser download.
   */
  downloadCSV(cutList: CutList, filename: string = 'kitchen-cut-list'): void {
    const csvContent = this.exportAsCSV(cutList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    requestAnimationFrame(() => { setTimeout(() => URL.revokeObjectURL(url), 0); });
  }

  /**
   * Export G-code for all panels and trigger a browser download as a ZIP-like combined file.
   * Each panel's G-code is separated by a header comment.
   */
  downloadGCode(cutList: CutList, filename: string = 'kitchen-gcode', options?: GCodeOptions): void {
    const allGCode: string[] = [];

    allGCode.push('; ========================================');
    allGCode.push('; KitchenXpert CNC Cut Programs');
    allGCode.push(`; Total panels: ${cutList.panels.length}`);
    allGCode.push(`; Total sheets: ${cutList.totalSheets}`);
    allGCode.push(`; Generated: ${new Date().toISOString()}`);
    allGCode.push('; ========================================');
    allGCode.push('');

    for (let i = 0; i < cutList.panels.length; i++) {
      const panel = cutList.panels[i]!;
      allGCode.push(`; ======== PANEL ${i + 1}/${cutList.panels.length} ========`);
      allGCode.push(this.generateGCode(panel, options));
      allGCode.push('');
      allGCode.push('');
    }

    const blob = new Blob([allGCode.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.nc`;
    link.click();
    requestAnimationFrame(() => { setTimeout(() => URL.revokeObjectURL(url), 0); });
  }

  // ---------- Cabinet data collection ----------

  /**
   * Collects cabinet data from the scene for decomposition.
   */
  private collectCabinetData(scene: KitchenSceneData): CabinetData[] {
    const cabinets: CabinetData[] = [];

    for (const [, obj] of scene.objects) {
      const objType = obj.userData.type as string | undefined;
      if (!objType) continue;

      // Skip non-cabinet types
      if (objType === 'wall' || objType === 'floor' || objType === 'ceiling' ||
          objType === 'technical_point' || objType === 'countertop' || objType === 'worktop') {
        continue;
      }
      if (obj.name.startsWith('__')) continue;

      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) continue;

      const size = new THREE.Vector3();
      box.getSize(size);

      // Convert to mm
      const width = Math.round(size.x * 1000);
      const height = Math.round(size.y * 1000);
      const depth = Math.round(size.z * 1000);

      // Classify cabinet type
      const cabinetType = this.classifyCabinetType(objType, height, depth);

      // Determine material
      const material = (obj.userData.material as string) || 'Melamine 16mm White';

      // Estimate door and drawer counts based on width
      const doorCount = this.estimateDoorCount(cabinetType, width);
      const drawerCount = this.estimateDrawerCount(objType, width);
      const shelfCount = this.estimateShelfCount(cabinetType, height);

      const name = (obj.userData.name as string) || obj.name || `${cabinetType}_cabinet_${width}`;

      cabinets.push({
        name,
        type: cabinetType,
        width,
        height,
        depth,
        material,
        doorCount,
        drawerCount,
        shelfCount,
      });
    }

    return cabinets;
  }

  // ---------- Cabinet decomposition ----------

  /**
   * Decomposes a cabinet into individual cut panels.
   */
  private decomposeCabinet(cabinet: CabinetData): CutListItem[] {
    switch (cabinet.type) {
      case 'base':
        return this.decomposeBaseCabinet(cabinet);
      case 'wall':
        return this.decomposeWallCabinet(cabinet);
      case 'tall':
        return this.decomposeTallCabinet(cabinet);
      default:
        return this.decomposeGenericCabinet(cabinet);
    }
  }

  /**
   * Decomposes a base cabinet (typically 720mm high, 560mm deep).
   * Parts: 2 sides, 1 bottom, 1 back, 0-2 shelves, 1-2 doors or drawer fronts
   */
  private decomposeBaseCabinet(cabinet: CabinetData): CutListItem[] {
    const panels: CutListItem[] = [];
    const innerWidth = cabinet.width - (2 * CARCASS_THICKNESS);
    const innerDepth = cabinet.depth - BACK_THICKNESS;

    // Left side panel
    panels.push(this.createPanel(
      cabinet.name, 'side_left', cabinet.material,
      cabinet.height, cabinet.depth - BACK_THICKNESS,
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: true, right: false },
      'lengthwise',
      this.generateSideHingeHoles(cabinet.height, cabinet.doorCount > 0),
    ));

    // Right side panel
    panels.push(this.createPanel(
      cabinet.name, 'side_right', cabinet.material,
      cabinet.height, cabinet.depth - BACK_THICKNESS,
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: true },
      'lengthwise',
      this.generateSideHingeHoles(cabinet.height, cabinet.doorCount > 0),
    ));

    // Bottom panel
    panels.push(this.createPanel(
      cabinet.name, 'bottom', cabinet.material,
      innerWidth, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: false },
      'none',
      this.generateCamLockHoles(innerWidth),
    ));

    // Back panel (thin)
    panels.push(this.createPanel(
      cabinet.name, 'back', cabinet.material.includes('White') ? 'HDF 3mm White' : 'HDF 3mm',
      cabinet.width - 6, cabinet.height - 6, // inset 3mm each side
      BACK_THICKNESS, 1,
      { top: false, bottom: false, left: false, right: false },
      'none',
    ));

    // Shelves
    for (let i = 0; i < cabinet.shelfCount; i++) {
      panels.push(this.createPanel(
        cabinet.name, 'shelf', cabinet.material,
        innerWidth - 2, innerDepth - 20, // slightly smaller for clearance
        CARCASS_THICKNESS, 1,
        { top: true, bottom: false, left: false, right: false },
        'none',
      ));
    }

    // Doors or drawer fronts
    if (cabinet.drawerCount > 0) {
      const drawerFrontHeight = Math.round((cabinet.height - 4) / cabinet.drawerCount);
      for (let i = 0; i < cabinet.drawerCount; i++) {
        panels.push(this.createPanel(
          cabinet.name, 'drawer_front', cabinet.material,
          cabinet.width - 4, drawerFrontHeight - 2,
          DOOR_THICKNESS, 1,
          { top: true, bottom: true, left: true, right: true },
          'lengthwise',
        ));
      }
    } else if (cabinet.doorCount > 0) {
      const doorWidth = Math.round((cabinet.width - 4) / cabinet.doorCount);
      for (let i = 0; i < cabinet.doorCount; i++) {
        panels.push(this.createPanel(
          cabinet.name, 'door', cabinet.material,
          cabinet.height - 4, doorWidth - 2,
          DOOR_THICKNESS, 1,
          { top: true, bottom: true, left: true, right: true },
          'lengthwise',
          this.generateDoorHingeHoles(cabinet.height - 4),
        ));
      }
    }

    return panels;
  }

  /**
   * Decomposes a wall cabinet (typically 720mm high, 300mm deep).
   * Parts: 2 sides, 1 top, 1 bottom, 1 back, 1-2 doors
   */
  private decomposeWallCabinet(cabinet: CabinetData): CutListItem[] {
    const panels: CutListItem[] = [];
    const innerWidth = cabinet.width - (2 * CARCASS_THICKNESS);
    const innerDepth = cabinet.depth - BACK_THICKNESS;

    // Left side
    panels.push(this.createPanel(
      cabinet.name, 'side_left', cabinet.material,
      cabinet.height, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: false, bottom: false, left: true, right: false },
      'lengthwise',
      this.generateSideHingeHoles(cabinet.height, cabinet.doorCount > 0),
    ));

    // Right side
    panels.push(this.createPanel(
      cabinet.name, 'side_right', cabinet.material,
      cabinet.height, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: false, bottom: false, left: false, right: true },
      'lengthwise',
      this.generateSideHingeHoles(cabinet.height, cabinet.doorCount > 0),
    ));

    // Top panel
    panels.push(this.createPanel(
      cabinet.name, 'top', cabinet.material,
      innerWidth, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: false },
      'none',
      this.generateCamLockHoles(innerWidth),
    ));

    // Bottom panel
    panels.push(this.createPanel(
      cabinet.name, 'bottom', cabinet.material,
      innerWidth, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: false },
      'none',
      this.generateCamLockHoles(innerWidth),
    ));

    // Back panel
    panels.push(this.createPanel(
      cabinet.name, 'back', cabinet.material.includes('White') ? 'HDF 3mm White' : 'HDF 3mm',
      cabinet.width - 6, cabinet.height - 6,
      BACK_THICKNESS, 1,
      { top: false, bottom: false, left: false, right: false },
      'none',
    ));

    // Doors
    if (cabinet.doorCount > 0) {
      const doorWidth = Math.round((cabinet.width - 4) / cabinet.doorCount);
      for (let i = 0; i < cabinet.doorCount; i++) {
        panels.push(this.createPanel(
          cabinet.name, 'door', cabinet.material,
          cabinet.height - 4, doorWidth - 2,
          DOOR_THICKNESS, 1,
          { top: true, bottom: true, left: true, right: true },
          'lengthwise',
          this.generateDoorHingeHoles(cabinet.height - 4),
        ));
      }
    }

    return panels;
  }

  /**
   * Decomposes a tall cabinet (typically 2100mm high, 560mm deep).
   * Parts: 2 sides, 1 top, 1 bottom, 1 back, 2-4 shelves, 1-2 doors
   */
  private decomposeTallCabinet(cabinet: CabinetData): CutListItem[] {
    const panels: CutListItem[] = [];
    const innerWidth = cabinet.width - (2 * CARCASS_THICKNESS);
    const innerDepth = cabinet.depth - BACK_THICKNESS;

    // Left side
    panels.push(this.createPanel(
      cabinet.name, 'side_left', cabinet.material,
      cabinet.height, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: false, bottom: false, left: true, right: false },
      'lengthwise',
      this.generateSideHingeHoles(cabinet.height, cabinet.doorCount > 0),
    ));

    // Right side
    panels.push(this.createPanel(
      cabinet.name, 'side_right', cabinet.material,
      cabinet.height, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: false, bottom: false, left: false, right: true },
      'lengthwise',
      this.generateSideHingeHoles(cabinet.height, cabinet.doorCount > 0),
    ));

    // Top panel
    panels.push(this.createPanel(
      cabinet.name, 'top', cabinet.material,
      innerWidth, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: false },
      'none',
      this.generateCamLockHoles(innerWidth),
    ));

    // Bottom panel
    panels.push(this.createPanel(
      cabinet.name, 'bottom', cabinet.material,
      innerWidth, innerDepth,
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: false },
      'none',
      this.generateCamLockHoles(innerWidth),
    ));

    // Back panel (may be split for tall cabinets)
    panels.push(this.createPanel(
      cabinet.name, 'back', cabinet.material.includes('White') ? 'HDF 3mm White' : 'HDF 3mm',
      cabinet.width - 6, cabinet.height - 6,
      BACK_THICKNESS, 1,
      { top: false, bottom: false, left: false, right: false },
      'none',
    ));

    // Shelves
    for (let i = 0; i < cabinet.shelfCount; i++) {
      panels.push(this.createPanel(
        cabinet.name, 'shelf', cabinet.material,
        innerWidth - 2, innerDepth - 20,
        CARCASS_THICKNESS, 1,
        { top: true, bottom: false, left: false, right: false },
        'none',
      ));
    }

    // Doors
    if (cabinet.doorCount > 0) {
      const doorWidth = Math.round((cabinet.width - 4) / cabinet.doorCount);
      for (let i = 0; i < cabinet.doorCount; i++) {
        panels.push(this.createPanel(
          cabinet.name, 'door', cabinet.material,
          cabinet.height - 4, doorWidth - 2,
          DOOR_THICKNESS, 1,
          { top: true, bottom: true, left: true, right: true },
          'lengthwise',
          this.generateDoorHingeHoles(cabinet.height - 4),
        ));
      }
    }

    return panels;
  }

  /**
   * Decomposes a generic/unknown cabinet type using measured dimensions.
   */
  private decomposeGenericCabinet(cabinet: CabinetData): CutListItem[] {
    const panels: CutListItem[] = [];
    const innerWidth = cabinet.width - (2 * CARCASS_THICKNESS);
    const innerDepth = cabinet.depth - BACK_THICKNESS;

    // Two sides
    panels.push(this.createPanel(
      cabinet.name, 'side_left', cabinet.material,
      cabinet.height, Math.max(innerDepth, 100),
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: true, right: false },
      'lengthwise',
    ));
    panels.push(this.createPanel(
      cabinet.name, 'side_right', cabinet.material,
      cabinet.height, Math.max(innerDepth, 100),
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: true },
      'lengthwise',
    ));

    // Top and bottom
    panels.push(this.createPanel(
      cabinet.name, 'top', cabinet.material,
      Math.max(innerWidth, 100), Math.max(innerDepth, 100),
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: false },
      'none',
    ));
    panels.push(this.createPanel(
      cabinet.name, 'bottom', cabinet.material,
      Math.max(innerWidth, 100), Math.max(innerDepth, 100),
      CARCASS_THICKNESS, 1,
      { top: true, bottom: false, left: false, right: false },
      'none',
    ));

    // Back
    panels.push(this.createPanel(
      cabinet.name, 'back', 'HDF 3mm',
      Math.max(cabinet.width - 6, 100), Math.max(cabinet.height - 6, 100),
      BACK_THICKNESS, 1,
      { top: false, bottom: false, left: false, right: false },
      'none',
    ));

    return panels;
  }

  // ---------- Panel creation helpers ----------

  /**
   * Creates a CutListItem with the given parameters.
   */
  private createPanel(
    cabinetRef: string,
    partName: CutListItem['partName'],
    material: string,
    length: number,
    width: number,
    thickness: number,
    quantity: number,
    edgeBanding: CutListItem['edgeBanding'],
    grain: CutListItem['grain'],
    drilling?: CutListItem['drilling'],
  ): CutListItem {
    return {
      id: this.generatePanelId(),
      cabinetRef,
      partName,
      material,
      length: Math.max(length, 0),
      width: Math.max(width, 0),
      thickness,
      quantity,
      edgeBanding,
      grain,
      drilling: drilling && drilling.length > 0 ? drilling : undefined,
    };
  }

  // ---------- Drilling patterns ----------

  /**
   * Generates hinge bore holes for a side panel.
   * Standard 32mm system, hinges at ~100mm from top/bottom edges.
   */
  private generateSideHingeHoles(
    panelHeight: number,
    hasDoor: boolean
  ): CutListItem['drilling'] {
    if (!hasDoor) return [];

    const holes: NonNullable<CutListItem['drilling']> = [];
    const edgeOffset = HINGE_EDGE_OFFSET;

    // Top hinge: ~100mm from top
    holes.push({
      x: edgeOffset,
      y: panelHeight - 100,
      diameter: HINGE_CUP_DIAMETER,
      depth: HINGE_CUP_DEPTH,
      type: 'blind',
      purpose: 'hinge',
    });

    // Bottom hinge: ~100mm from bottom
    holes.push({
      x: edgeOffset,
      y: 100,
      diameter: HINGE_CUP_DIAMETER,
      depth: HINGE_CUP_DEPTH,
      type: 'blind',
      purpose: 'hinge',
    });

    // Middle hinge for tall panels (>1200mm)
    if (panelHeight > 1200) {
      holes.push({
        x: edgeOffset,
        y: panelHeight / 2,
        diameter: HINGE_CUP_DIAMETER,
        depth: HINGE_CUP_DEPTH,
        type: 'blind',
        purpose: 'hinge',
      });
    }

    return holes;
  }

  /**
   * Generates hinge bore holes for a door panel (cup side).
   */
  private generateDoorHingeHoles(doorHeight: number): CutListItem['drilling'] {
    const holes: NonNullable<CutListItem['drilling']> = [];

    // Top hinge mounting hole
    holes.push({
      x: HINGE_EDGE_OFFSET,
      y: doorHeight - 100,
      diameter: HINGE_CUP_DIAMETER,
      depth: HINGE_CUP_DEPTH,
      type: 'blind',
      purpose: 'hinge',
    });

    // Bottom hinge mounting hole
    holes.push({
      x: HINGE_EDGE_OFFSET,
      y: 100,
      diameter: HINGE_CUP_DIAMETER,
      depth: HINGE_CUP_DEPTH,
      type: 'blind',
      purpose: 'hinge',
    });

    // Middle hinge for tall doors (>1200mm)
    if (doorHeight > 1200) {
      holes.push({
        x: HINGE_EDGE_OFFSET,
        y: doorHeight / 2,
        diameter: HINGE_CUP_DIAMETER,
        depth: HINGE_CUP_DEPTH,
        type: 'blind',
        purpose: 'hinge',
      });
    }

    return holes;
  }

  /**
   * Generates cam lock bore holes for a horizontal panel (top/bottom).
   */
  private generateCamLockHoles(panelWidth: number): CutListItem['drilling'] {
    const holes: NonNullable<CutListItem['drilling']> = [];
    const inset = 37; // from edge

    // Two cam locks per end, 50mm from front and back edges
    for (const yOffset of [50, panelWidth - 50]) {
      // Left end
      holes.push({
        x: inset,
        y: yOffset,
        diameter: CAM_LOCK_DIAMETER,
        depth: CAM_LOCK_DEPTH,
        type: 'blind',
        purpose: 'cam_lock',
      });

      // Right end
      holes.push({
        x: panelWidth - inset,
        y: yOffset,
        diameter: CAM_LOCK_DIAMETER,
        depth: CAM_LOCK_DEPTH,
        type: 'blind',
        purpose: 'cam_lock',
      });
    }

    return holes;
  }

  // ---------- Material calculation ----------

  /**
   * Calculates material breakdown: total area and estimated sheets per material type.
   */
  private calculateMaterialBreakdown(panels: CutListItem[]): CutList['materialBreakdown'] {
    const materialMap = new Map<string, number>();

    for (const panel of panels) {
      const area = panel.length * panel.width * panel.quantity;
      const existing = materialMap.get(panel.material) || 0;
      materialMap.set(panel.material, existing + area);
    }

    const breakdown: CutList['materialBreakdown'] = [];

    for (const [material, area] of materialMap) {
      // Add ~15% waste factor for cutting and offcuts
      const adjustedArea = area * 1.15;
      const sheets = Math.ceil(adjustedArea / STANDARD_SHEET_AREA);

      breakdown.push({
        material,
        area,
        sheets: Math.max(1, sheets),
      });
    }

    return breakdown.sort((a, b) => b.area - a.area);
  }

  // ---------- Classification helpers ----------

  /**
   * Classifies a cabinet type based on its object type and dimensions.
   */
  private classifyCabinetType(objType: string, height: number, depth: number): CabinetType {
    const lower = objType.toLowerCase();

    // Explicit type names
    if (lower.includes('wall') && lower.includes('cabinet')) return 'wall';
    if (lower.includes('tall') || lower.includes('pantry') || lower.includes('column')) return 'tall';
    if (lower.includes('base') && lower.includes('cabinet')) return 'base';

    // Classify by dimensions
    if (height > 1500) return 'tall';
    if (depth < 350 && height < 1000) return 'wall';
    if (height < 1000) return 'base';

    // Appliances are treated like base cabinets for panel decomposition
    const applianceTypes = [
      'appliance', 'oven', 'dishwasher', 'refrigerator', 'fridge',
      'fridge_freezer', 'microwave', 'cooktop', 'stove', 'hob',
      'hood', 'washer', 'dryer', 'freezer', 'induction',
    ];
    if (applianceTypes.includes(lower)) return 'base';

    return 'unknown';
  }

  /**
   * Estimates the number of doors for a cabinet.
   * Narrow cabinets (<600mm) get 1 door, wider ones get 2.
   */
  private estimateDoorCount(type: CabinetType, width: number): number {
    if (type === 'unknown') return 0;
    if (width <= 600) return 1;
    return 2;
  }

  /**
   * Estimates drawer count based on object type.
   * Only specific types get drawers instead of doors.
   */
  private estimateDrawerCount(objType: string, _width: number): number {
    const lower = objType.toLowerCase();
    if (lower.includes('drawer')) {
      if (lower.includes('3')) return 3;
      if (lower.includes('4')) return 4;
      return 2; // default drawer unit has 2 drawers
    }
    return 0;
  }

  /**
   * Estimates shelf count based on cabinet type and height.
   */
  private estimateShelfCount(type: CabinetType, height: number): number {
    switch (type) {
      case 'base': return 1;
      case 'wall': return height > 600 ? 2 : 1;
      case 'tall': return Math.max(2, Math.floor(height / 500));
      default: return 1;
    }
  }
}
