/**
 * Kitchen Service
 * Handles kitchen design logic, layouts, and 3D scene management
 */

import crypto from 'crypto';

export interface KitchenLayout {
  id: string;
  projectId: string;
  name: string;
  type: LayoutType;
  dimensions: LayoutDimensions;
  walls: Wall[];
  openings: Opening[];
  zones: KitchenZone[];
  workTriangle?: WorkTriangle;
  metadata: LayoutMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type LayoutType = 'L' | 'U' | 'G' | 'I' | 'parallel' | 'island' | 'peninsula' | 'custom';

export interface LayoutDimensions {
  width: number;
  depth: number;
  height: number;
  unit: 'cm' | 'mm' | 'inch';
}

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  height: number;
  thickness: number;
  material?: string;
  color?: string;
  hasBacksplash?: boolean;
  openings: string[]; // Opening IDs
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface Opening {
  id: string;
  wallId: string;
  type: 'door' | 'window' | 'archway' | 'pass-through';
  position: Point2D;
  width: number;
  height: number;
  fromFloor: number;
  style?: string;
}

export interface KitchenZone {
  id: string;
  type: ZoneType;
  area: ZoneArea;
  items: string[]; // Item IDs
  priority: number;
}

export type ZoneType =
  | 'cooking'
  | 'preparation'
  | 'cleaning'
  | 'storage'
  | 'refrigeration'
  | 'serving'
  | 'dining';

export interface ZoneArea {
  points: Point2D[];
  center: Point2D;
  area: number; // square units
}

export interface WorkTriangle {
  sink: Point2D;
  stove: Point2D;
  refrigerator: Point2D;
  totalDistance: number;
  isOptimal: boolean;
  recommendations?: string[];
}

export interface LayoutMetadata {
  version: string;
  lastEditedBy?: string;
  tags?: string[];
  notes?: string;
}

export interface CabinetPlacement {
  id: string;
  cabinetId: string;
  position: Point3D;
  rotation: number; // degrees
  wallId?: string;
  isCorner: boolean;
  connectedTo?: string[];
  customizations?: CabinetCustomization;
}

export interface CabinetCustomization {
  handleStyle?: string;
  handlePosition?: 'left' | 'right' | 'center' | 'top' | 'bottom';
  doorStyle?: string;
  interiorAccessories?: string[];
  color?: string;
  material?: string;
}

export interface AppliancePlacement {
  id: string;
  applianceId: string;
  position: Point3D;
  rotation: number;
  isBuiltIn: boolean;
  cabinetId?: string;
  electricalConnection?: Point2D;
  plumbingConnection?: Point2D;
  ventilationRequired: boolean;
}

export interface CountertopSection {
  id: string;
  points: Point2D[];
  material: string;
  color: string;
  thickness: number;
  edgeProfile: EdgeProfile;
  cutouts: Cutout[];
  backsplash?: BacksplashConfig;
}

export type EdgeProfile = 'square' | 'beveled' | 'bullnose' | 'ogee' | 'waterfall';

export interface Cutout {
  id: string;
  type: 'sink' | 'cooktop' | 'outlet' | 'custom';
  position: Point2D;
  width: number;
  depth: number;
  cornerRadius?: number;
}

export interface BacksplashConfig {
  height: number;
  material: string;
  color: string;
  pattern?: string;
}

export interface DesignValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  score: number;
}

export interface ValidationError {
  code: string;
  message: string;
  itemId?: string;
  position?: Point3D;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  code: string;
  message: string;
  itemId?: string;
  recommendation: string;
}

export interface KitchenRepository {
  findLayoutById(id: string): Promise<KitchenLayout | null>;
  findLayoutsByProject(projectId: string): Promise<KitchenLayout[]>;
  createLayout(data: Omit<KitchenLayout, 'id' | 'createdAt' | 'updatedAt'>): Promise<KitchenLayout>;
  updateLayout(id: string, data: Partial<KitchenLayout>): Promise<KitchenLayout | null>;
  deleteLayout(id: string): Promise<boolean>;
  savePlacements(layoutId: string, placements: CabinetPlacement[]): Promise<boolean>;
  getPlacementsByLayout(layoutId: string): Promise<CabinetPlacement[]>;
}

export class KitchenService {
  constructor(private repository: KitchenRepository) {}

  /**
   * Create a new kitchen layout
   */
  async createLayout(
    projectId: string,
    data: {
      name: string;
      type: LayoutType;
      dimensions: LayoutDimensions;
    }
  ): Promise<KitchenLayout> {
    const layout = await this.repository.createLayout({
      projectId,
      name: data.name,
      type: data.type,
      dimensions: data.dimensions,
      walls: this.generateDefaultWalls(data.type, data.dimensions),
      openings: [],
      zones: [],
      metadata: { version: '1.0' },
    });

    return layout;
  }

  /**
   * Get layout by ID
   */
  async getLayoutById(id: string): Promise<KitchenLayout | null> {
    return this.repository.findLayoutById(id);
  }

  /**
   * Get all layouts for a project
   */
  async getLayoutsByProject(projectId: string): Promise<KitchenLayout[]> {
    return this.repository.findLayoutsByProject(projectId);
  }

  /**
   * Update layout
   */
  async updateLayout(id: string, data: Partial<KitchenLayout>): Promise<KitchenLayout | null> {
    return this.repository.updateLayout(id, {
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete layout
   */
  async deleteLayout(id: string): Promise<boolean> {
    return this.repository.deleteLayout(id);
  }

  /**
   * Add wall to layout
   */
  async addWall(layoutId: string, wall: Omit<Wall, 'id'>): Promise<KitchenLayout | null> {
    const layout = await this.repository.findLayoutById(layoutId);
    if (!layout) {return null;}

    const newWall: Wall = {
      ...wall,
      id: this.generateId(),
    };

    return this.repository.updateLayout(layoutId, {
      walls: [...layout.walls, newWall],
    });
  }

  /**
   * Add opening (door/window) to wall
   */
  async addOpening(
    layoutId: string,
    wallId: string,
    opening: Omit<Opening, 'id' | 'wallId'>
  ): Promise<KitchenLayout | null> {
    const layout = await this.repository.findLayoutById(layoutId);
    if (!layout) {return null;}

    const wall = layout.walls.find(w => w.id === wallId);
    if (!wall) {
      throw new KitchenServiceError('WALL_NOT_FOUND', `Wall ${wallId} not found`);
    }

    const newOpening: Opening = {
      ...opening,
      id: this.generateId(),
      wallId,
    };

    return this.repository.updateLayout(layoutId, {
      openings: [...layout.openings, newOpening],
      walls: layout.walls.map(w =>
        w.id === wallId ? { ...w, openings: [...w.openings, newOpening.id] } : w
      ),
    });
  }

  /**
   * Calculate work triangle
   */
  calculateWorkTriangle(
    sinkPosition: Point2D,
    stovePosition: Point2D,
    fridgePosition: Point2D
  ): WorkTriangle {
    const sinkToStove = this.calculateDistance(sinkPosition, stovePosition);
    const stoveToFridge = this.calculateDistance(stovePosition, fridgePosition);
    const fridgeToSink = this.calculateDistance(fridgePosition, sinkPosition);

    const totalDistance = sinkToStove + stoveToFridge + fridgeToSink;

    // Optimal work triangle: 4-7.9m total, each leg 1.2-2.7m
    const isOptimal =
      totalDistance >= 400 &&
      totalDistance <= 790 &&
      sinkToStove >= 120 &&
      sinkToStove <= 270 &&
      stoveToFridge >= 120 &&
      stoveToFridge <= 270 &&
      fridgeToSink >= 120 &&
      fridgeToSink <= 270;

    const recommendations: string[] = [];

    if (totalDistance < 400) {
      recommendations.push('Le triangle de travail est trop petit. Considérez un agencement plus spacieux.');
    }
    if (totalDistance > 790) {
      recommendations.push('Le triangle de travail est trop grand. Rapprochez les éléments principaux.');
    }
    if (sinkToStove < 120) {
      recommendations.push('Éloignez l\'évier de la plaque de cuisson pour plus de confort.');
    }
    if (stoveToFridge < 120) {
      recommendations.push('Éloignez le réfrigérateur de la plaque de cuisson pour l\'efficacité énergétique.');
    }

    return {
      sink: sinkPosition,
      stove: stovePosition,
      refrigerator: fridgePosition,
      totalDistance,
      isOptimal,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  /**
   * Validate kitchen design
   */
  validateDesign(layout: KitchenLayout, placements: CabinetPlacement[]): DesignValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for overlapping placements
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        if (p1 && p2 && this.checkOverlap(p1, p2)) {
          errors.push({
            code: 'OVERLAP',
            message: `Les éléments ${p1.id} et ${p2.id} se chevauchent`,
            itemId: p1.id,
            position: p1.position,
            severity: 'error',
          });
        }
      }
    }

    // Check clearance for appliances
    for (const placement of placements) {
      const clearanceIssue = this.checkClearance(placement, layout);
      if (clearanceIssue) {
        warnings.push(clearanceIssue);
      }
    }

    // Check zone coverage
    const zoneWarnings = this.validateZoneCoverage(layout);
    warnings.push(...zoneWarnings);

    // Calculate score (0-100)
    const errorPenalty = errors.length * 15;
    const warningPenalty = warnings.length * 5;
    const score = Math.max(0, 100 - errorPenalty - warningPenalty);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * Generate cabinet recommendations based on layout
   */
  generateRecommendations(layout: KitchenLayout): CabinetRecommendation[] {
    const recommendations: CabinetRecommendation[] = [];

    // Recommend corner cabinets for L and U layouts
    if (['L', 'U', 'G'].includes(layout.type)) {
      recommendations.push({
        type: 'corner_cabinet',
        reason: 'Maximiser l\'espace dans les coins',
        position: this.findCornerPositions(layout)[0],
        priority: 'high',
      });
    }

    // Recommend pull-out drawers for base cabinets
    recommendations.push({
      type: 'pull_out_drawer',
      reason: 'Accès facile aux ustensiles et casseroles',
      position: undefined,
      priority: 'medium',
    });

    // Recommend lazy susan for deep corner cabinets
    if (layout.type === 'L' || layout.type === 'U') {
      recommendations.push({
        type: 'lazy_susan',
        reason: 'Optimiser l\'accès dans les meubles d\'angle profonds',
        position: undefined,
        priority: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Calculate countertop area
   */
  calculateCountertopArea(sections: CountertopSection[]): CountertopCalculation {
    let totalArea = 0;
    let totalPerimeter = 0;
    const cutoutsArea: { type: string; area: number }[] = [];

    for (const section of sections) {
      const sectionArea = this.calculatePolygonArea(section.points);
      const sectionPerimeter = this.calculatePolygonPerimeter(section.points);

      totalArea += sectionArea;
      totalPerimeter += sectionPerimeter;

      for (const cutout of section.cutouts) {
        const cutoutArea = cutout.width * cutout.depth;
        totalArea -= cutoutArea;
        cutoutsArea.push({ type: cutout.type, area: cutoutArea });
      }
    }

    return {
      grossArea: totalArea + cutoutsArea.reduce((sum, c) => sum + c.area, 0),
      netArea: totalArea,
      perimeter: totalPerimeter,
      cutouts: cutoutsArea,
      backsplashArea: this.calculateBacksplashArea(sections),
    };
  }

  /**
   * Export layout to various formats
   */
  async exportLayout(
    layoutId: string,
    format: 'json' | 'dxf' | 'pdf' | '3ds'
  ): Promise<ExportResult> {
    const layout = await this.repository.findLayoutById(layoutId);
    if (!layout) {
      throw new KitchenServiceError('LAYOUT_NOT_FOUND', 'Layout not found');
    }

    const placements = await this.repository.getPlacementsByLayout(layoutId);

    switch (format) {
      case 'json':
        return {
          format: 'json',
          data: JSON.stringify({ layout, placements }, null, 2),
          mimeType: 'application/json',
          filename: `${layout.name}.json`,
        };

      case 'dxf':
        return {
          format: 'dxf',
          data: this.generateDXF(layout, placements),
          mimeType: 'application/dxf',
          filename: `${layout.name}.dxf`,
        };

      case 'pdf':
        return {
          format: 'pdf',
          data: await this.generatePDF(layout, placements),
          mimeType: 'application/pdf',
          filename: `${layout.name}.pdf`,
        };

      case '3ds':
        return {
          format: '3ds',
          data: this.generate3DS(layout, placements),
          mimeType: 'application/x-3ds',
          filename: `${layout.name}.3ds`,
        };

      default:
        throw new KitchenServiceError('UNSUPPORTED_FORMAT', `Export format ${format} not supported`);
    }
  }

  // Private helper methods

  private generateDefaultWalls(type: LayoutType, dimensions: LayoutDimensions): Wall[] {
    const { width, depth, height } = dimensions;
    const walls: Wall[] = [];

    // Generate walls based on layout type
    switch (type) {
      case 'I':
        // Single wall kitchen
        walls.push({
          id: this.generateId(),
          start: { x: 0, y: 0 },
          end: { x: width, y: 0 },
          height,
          thickness: 15,
          openings: [],
        });
        break;

      case 'L':
        // L-shaped kitchen
        walls.push(
          {
            id: this.generateId(),
            start: { x: 0, y: 0 },
            end: { x: width, y: 0 },
            height,
            thickness: 15,
            openings: [],
          },
          {
            id: this.generateId(),
            start: { x: 0, y: 0 },
            end: { x: 0, y: depth },
            height,
            thickness: 15,
            openings: [],
          }
        );
        break;

      case 'U':
        // U-shaped kitchen
        walls.push(
          {
            id: this.generateId(),
            start: { x: 0, y: 0 },
            end: { x: width, y: 0 },
            height,
            thickness: 15,
            openings: [],
          },
          {
            id: this.generateId(),
            start: { x: 0, y: 0 },
            end: { x: 0, y: depth },
            height,
            thickness: 15,
            openings: [],
          },
          {
            id: this.generateId(),
            start: { x: width, y: 0 },
            end: { x: width, y: depth },
            height,
            thickness: 15,
            openings: [],
          }
        );
        break;

      case 'parallel':
        // Parallel (galley) kitchen
        walls.push(
          {
            id: this.generateId(),
            start: { x: 0, y: 0 },
            end: { x: width, y: 0 },
            height,
            thickness: 15,
            openings: [],
          },
          {
            id: this.generateId(),
            start: { x: 0, y: depth },
            end: { x: width, y: depth },
            height,
            thickness: 15,
            openings: [],
          }
        );
        break;

      default:
        // Default rectangular room
        walls.push(
          {
            id: this.generateId(),
            start: { x: 0, y: 0 },
            end: { x: width, y: 0 },
            height,
            thickness: 15,
            openings: [],
          },
          {
            id: this.generateId(),
            start: { x: width, y: 0 },
            end: { x: width, y: depth },
            height,
            thickness: 15,
            openings: [],
          },
          {
            id: this.generateId(),
            start: { x: width, y: depth },
            end: { x: 0, y: depth },
            height,
            thickness: 15,
            openings: [],
          },
          {
            id: this.generateId(),
            start: { x: 0, y: depth },
            end: { x: 0, y: 0 },
            height,
            thickness: 15,
            openings: [],
          }
        );
    }

    return walls;
  }

  private calculateDistance(p1: Point2D, p2: Point2D): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private checkOverlap(_p1: CabinetPlacement, _p2: CabinetPlacement): boolean {
    // Simplified overlap check - in real implementation would use actual dimensions
    return false;
  }

  private checkClearance(_placement: CabinetPlacement, _layout: KitchenLayout): ValidationWarning | null {
    // Check if there's enough clearance around appliances and cabinets
    return null;
  }

  private validateZoneCoverage(layout: KitchenLayout): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const requiredZones: ZoneType[] = ['cooking', 'preparation', 'cleaning', 'storage'];

    for (const requiredZone of requiredZones) {
      if (!layout.zones.some(z => z.type === requiredZone)) {
        warnings.push({
          code: 'MISSING_ZONE',
          message: `Zone ${requiredZone} manquante`,
          recommendation: `Ajoutez une zone de ${requiredZone} pour une cuisine fonctionnelle`,
        });
      }
    }

    return warnings;
  }

  private findCornerPositions(layout: KitchenLayout): (Point2D | undefined)[] {
    // Find corners where walls meet
    const corners: Point2D[] = [];

    for (const wall of layout.walls) {
      corners.push(wall.start, wall.end);
    }

    return corners.length > 0 ? [corners[0]] : [undefined];
  }

  private calculatePolygonArea(points: Point2D[]): number {
    let area = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      if (p1 && p2) {
        area += p1.x * p2.y;
        area -= p2.x * p1.y;
      }
    }

    return Math.abs(area) / 2;
  }

  private calculatePolygonPerimeter(points: Point2D[]): number {
    let perimeter = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      if (p1 && p2) {
        perimeter += this.calculateDistance(p1, p2);
      }
    }

    return perimeter;
  }

  private calculateBacksplashArea(sections: CountertopSection[]): number {
    let area = 0;

    for (const section of sections) {
      if (section.backsplash) {
        const perimeter = this.calculatePolygonPerimeter(section.points);
        area += perimeter * section.backsplash.height;
      }
    }

    return area;
  }

  private generateDXF(_layout: KitchenLayout, _placements: CabinetPlacement[]): string {
    // Generate DXF format for CAD software
    return '0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF';
  }

  private async generatePDF(_layout: KitchenLayout, _placements: CabinetPlacement[]): Promise<string> {
    // Generate PDF - would use a PDF library in real implementation
    return '%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\n0 2\n0000000000 65535 f\n0000000009 00000 n\ntrailer\n<<>>\nstartxref\n25\n%%EOF';
  }

  private generate3DS(_layout: KitchenLayout, _placements: CabinetPlacement[]): string {
    // Generate 3DS format - would use a 3D library in real implementation
    return '';
  }

  private generateId(): string {
    return crypto.randomBytes(12).toString('base64url');
  }
}

export interface CabinetRecommendation {
  type: string;
  reason: string;
  position: Point2D | undefined;
  priority: 'high' | 'medium' | 'low';
}

export interface CountertopCalculation {
  grossArea: number;
  netArea: number;
  perimeter: number;
  cutouts: { type: string; area: number }[];
  backsplashArea: number;
}

export interface ExportResult {
  format: string;
  data: string;
  mimeType: string;
  filename: string;
}

export class KitchenServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'KitchenServiceError';
  }
}

export function createKitchenService(repository: KitchenRepository): KitchenService {
  return new KitchenService(repository);
}

export default KitchenService;
