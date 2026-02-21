import * as THREE from 'three';
import type { KitchenSceneData } from './dxf-exporter';

/**
 * Options for IFC export.
 */
export interface IFCExportOptions {
  /** Project name (default: 'Kitchen Design') */
  projectName?: string;
  /** Author name */
  author?: string;
  /** Organization name */
  organization?: string;
  /** Add property sets with catalog data (default: true) */
  includeProperties?: boolean;
  /** Add water/electric/gas connection data (default: true) */
  includeMEP?: boolean;
}

/**
 * Mapping of IFC entity type string to its classification.
 */
type IFCEntityType =
  | 'wall'
  | 'cabinet'
  | 'appliance'
  | 'sink'
  | 'faucet'
  | 'door'
  | 'window'
  | 'countertop'
  | 'technical_point'
  | 'unknown';

/**
 * Internal representation of a scene object for IFC export.
 */
interface IFCObjectData {
  name: string;
  ifcType: IFCEntityType;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  properties: Record<string, string | number | boolean>;
}

/**
 * Sequential ID allocator for IFC STEP file entity IDs.
 */
class EntityIdAllocator {
  private nextId = 1;

  next(): number {
    return this.nextId++;
  }

  current(): number {
    return this.nextId - 1;
  }

  peek(): number {
    return this.nextId;
  }
}

/**
 * Exports a kitchen design as an IFC 2x3 STEP file string.
 *
 * IFC (Industry Foundation Classes) is an open standard for Building Information
 * Modeling (BIM) data. This exporter generates IFC 2x3 format (the most widely
 * compatible version) as plain text STEP file format.
 *
 * The generated file can be opened in:
 * - Autodesk Revit
 * - ArchiCAD
 * - BIMcollab
 * - Solibri
 * - BlenderBIM
 * - FreeCAD
 * - xBIM Xplorer
 *
 * No npm dependencies required -- the IFC STEP format is plain text.
 */
export class IFCExporter {
  /**
   * Export kitchen design as IFC 2x3 STEP file string.
   */
  export(scene: KitchenSceneData, metadata?: IFCExportOptions): string {
    const opts: Required<IFCExportOptions> = {
      projectName: metadata?.projectName ?? 'Kitchen Design',
      author: metadata?.author ?? 'User',
      organization: metadata?.organization ?? 'KitchenXpert',
      includeProperties: metadata?.includeProperties ?? true,
      includeMEP: metadata?.includeMEP ?? true,
    };

    const ids = new EntityIdAllocator();
    const lines: string[] = [];

    // Collect object data from the scene
    const objects = this.collectObjectData(scene);

    // Write HEADER section
    this.writeHeader(lines, opts);

    // Write DATA section
    lines.push('DATA;');

    // Core IFC hierarchy: Organization -> Application -> Project -> Site -> Building -> Storey -> Space
    const hierarchyIds = this.writeProjectHierarchy(lines, ids, opts, scene);

    // Write geometric entities for each object
    for (const obj of objects) {
      this.writeObjectEntity(lines, ids, obj, hierarchyIds, opts);
    }

    // Write MEP entities if enabled
    if (opts.includeMEP) {
      this.writeMEPEntities(lines, ids, scene, hierarchyIds);
    }

    // Close DATA section
    lines.push('ENDSEC;');
    lines.push('END-ISO-10303-21;');

    return lines.join('\n');
  }

  /**
   * Export and trigger a browser download of the IFC file.
   */
  download(scene: KitchenSceneData, filename: string = 'kitchen-design', metadata?: IFCExportOptions): void {
    const ifcContent = this.export(scene, metadata);
    const blob = new Blob([ifcContent], { type: 'application/x-step' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.ifc`;
    link.click();
    // Delayed revocation for download to complete
    requestAnimationFrame(() => { setTimeout(() => URL.revokeObjectURL(url), 0); });
  }

  // ---------- HEADER section ----------

  private writeHeader(lines: string[], opts: Required<IFCExportOptions>): void {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0] || '';

    lines.push('ISO-10303-21;');
    lines.push('HEADER;');
    lines.push(`FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');`);
    lines.push(`FILE_NAME('kitchen.ifc','${dateStr}T00:00:00',('${this.escapeString(opts.author)}'),('${this.escapeString(opts.organization)}'),'','KitchenXpert','');`);
    lines.push(`FILE_SCHEMA(('IFC2X3'));`);
    lines.push('ENDSEC;');
  }

  // ---------- Project hierarchy ----------

  /**
   * Writes the core IFC project hierarchy and returns the entity IDs
   * needed for placing objects.
   */
  private writeProjectHierarchy(
    lines: string[],
    ids: EntityIdAllocator,
    opts: Required<IFCExportOptions>,
    _scene: KitchenSceneData
  ): {
    projectId: number;
    siteId: number;
    buildingId: number;
    storeyId: number;
    spaceId: number;
    storeyPlacementId: number;
    contextId: number;
  } {
    const guid = () => this.generateIFCGuid();

    // #1 Organization
    const orgId = ids.next();
    lines.push(`#${orgId}=IFCORGANIZATION($,'${this.escapeString(opts.organization)}',$,$,$);`);

    // #2 Application
    const appId = ids.next();
    lines.push(`#${appId}=IFCAPPLICATION(#${orgId},'1.0','KitchenXpert','KitchenXpert');`);

    // #3 Owner history
    const personId = ids.next();
    lines.push(`#${personId}=IFCPERSON($,'${this.escapeString(opts.author)}','',$,$,$,$,$);`);

    const personOrgId = ids.next();
    lines.push(`#${personOrgId}=IFCPERSONANDORGANIZATION(#${personId},#${orgId},$);`);

    const ownerHistoryId = ids.next();
    const timestamp = Math.floor(Date.now() / 1000);
    lines.push(`#${ownerHistoryId}=IFCOWNERHISTORY(#${personOrgId},#${appId},$,.NOCHANGE.,$,$,$,${timestamp});`);

    // #6 Units: SI units with mm for length
    const siUnitLengthId = ids.next();
    lines.push(`#${siUnitLengthId}=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);`);

    const siUnitAreaId = ids.next();
    lines.push(`#${siUnitAreaId}=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);`);

    const siUnitVolumeId = ids.next();
    lines.push(`#${siUnitVolumeId}=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);`);

    const siUnitAngleId = ids.next();
    lines.push(`#${siUnitAngleId}=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);`);

    const unitAssignmentId = ids.next();
    lines.push(`#${unitAssignmentId}=IFCUNITASSIGNMENT((#${siUnitLengthId},#${siUnitAreaId},#${siUnitVolumeId},#${siUnitAngleId}));`);

    // Geometric representation context
    const originId = ids.next();
    lines.push(`#${originId}=IFCCARTESIANPOINT((0.0,0.0,0.0));`);

    const dirZId = ids.next();
    lines.push(`#${dirZId}=IFCDIRECTION((0.0,0.0,1.0));`);

    const dirXId = ids.next();
    lines.push(`#${dirXId}=IFCDIRECTION((1.0,0.0,0.0));`);

    const worldCSId = ids.next();
    lines.push(`#${worldCSId}=IFCAXIS2PLACEMENT3D(#${originId},#${dirZId},#${dirXId});`);

    const contextId = ids.next();
    lines.push(`#${contextId}=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,#${worldCSId},$);`);

    const subContextId = ids.next();
    lines.push(`#${subContextId}=IFCGEOMETRICREPRESENTATIONSUBCONTEXT('Body','Model',*,*,*,*,#${contextId},$,.MODEL_VIEW.,$);`);

    // Project
    const projectId = ids.next();
    lines.push(`#${projectId}=IFCPROJECT('${guid()}',#${ownerHistoryId},'${this.escapeString(opts.projectName)}',$,$,$,$,(#${contextId}),#${unitAssignmentId});`);

    // Site placement
    const sitePlacementId = ids.next();
    lines.push(`#${sitePlacementId}=IFCLOCALPLACEMENT($,#${worldCSId});`);

    // Site
    const siteId = ids.next();
    lines.push(`#${siteId}=IFCSITE('${guid()}',#${ownerHistoryId},'Site',$,$,#${sitePlacementId},$,$,.ELEMENT.,$,$,$,$,$);`);

    // Building placement
    const buildingPlacementId = ids.next();
    lines.push(`#${buildingPlacementId}=IFCLOCALPLACEMENT(#${sitePlacementId},#${worldCSId});`);

    // Building
    const buildingId = ids.next();
    lines.push(`#${buildingId}=IFCBUILDING('${guid()}',#${ownerHistoryId},'Building',$,$,#${buildingPlacementId},$,$,.ELEMENT.,$,$,$);`);

    // Storey placement
    const storeyPlacementId = ids.next();
    lines.push(`#${storeyPlacementId}=IFCLOCALPLACEMENT(#${buildingPlacementId},#${worldCSId});`);

    // Building storey
    const storeyId = ids.next();
    lines.push(`#${storeyId}=IFCBUILDINGSTOREY('${guid()}',#${ownerHistoryId},'Ground Floor',$,$,#${storeyPlacementId},$,$,.ELEMENT.,0.0);`);

    // Space (the kitchen room)
    const spacePlacementId = ids.next();
    lines.push(`#${spacePlacementId}=IFCLOCALPLACEMENT(#${storeyPlacementId},#${worldCSId});`);

    const spaceId = ids.next();
    lines.push(`#${spaceId}=IFCSPACE('${guid()}',#${ownerHistoryId},'Kitchen','Kitchen Room','Kitchen',#${spacePlacementId},$,$,.ELEMENT.,.INTERNAL.,$);`);

    // Spatial hierarchy relationships
    const relSiteId = ids.next();
    lines.push(`#${relSiteId}=IFCRELAGGREGATES('${guid()}',#${ownerHistoryId},$,$,#${projectId},(#${siteId}));`);

    const relBuildingId = ids.next();
    lines.push(`#${relBuildingId}=IFCRELAGGREGATES('${guid()}',#${ownerHistoryId},$,$,#${siteId},(#${buildingId}));`);

    const relStoreyId = ids.next();
    lines.push(`#${relStoreyId}=IFCRELAGGREGATES('${guid()}',#${ownerHistoryId},$,$,#${buildingId},(#${storeyId}));`);

    const relSpaceId = ids.next();
    lines.push(`#${relSpaceId}=IFCRELAGGREGATES('${guid()}',#${ownerHistoryId},$,$,#${storeyId},(#${spaceId}));`);

    return {
      projectId,
      siteId,
      buildingId,
      storeyId,
      spaceId,
      storeyPlacementId,
      contextId: subContextId,
    };
  }

  // ---------- Object entities ----------

  /**
   * Writes an IFC entity for a single scene object.
   */
  private writeObjectEntity(
    lines: string[],
    ids: EntityIdAllocator,
    obj: IFCObjectData,
    hierarchy: {
      storeyId: number;
      storeyPlacementId: number;
      contextId: number;
    },
    opts: Required<IFCExportOptions>
  ): void {
    const guid = () => this.generateIFCGuid();

    // Owner history reference (always #5 in our hierarchy)
    const ownerHistoryRef = 5;

    // Create local placement for this object
    const pointId = ids.next();
    lines.push(`#${pointId}=IFCCARTESIANPOINT((${obj.position.x.toFixed(1)},${obj.position.y.toFixed(1)},${obj.position.z.toFixed(1)}));`);

    const dirZId = ids.next();
    lines.push(`#${dirZId}=IFCDIRECTION((0.0,0.0,1.0));`);

    const dirXId = ids.next();
    lines.push(`#${dirXId}=IFCDIRECTION((1.0,0.0,0.0));`);

    const axisPlacementId = ids.next();
    lines.push(`#${axisPlacementId}=IFCAXIS2PLACEMENT3D(#${pointId},#${dirZId},#${dirXId});`);

    const placementId = ids.next();
    lines.push(`#${placementId}=IFCLOCALPLACEMENT(#${hierarchy.storeyPlacementId},#${axisPlacementId});`);

    // Create bounding box geometry
    const bbOriginId = ids.next();
    lines.push(`#${bbOriginId}=IFCCARTESIANPOINT((0.0,0.0,0.0));`);

    const bbId = ids.next();
    lines.push(`#${bbId}=IFCBOUNDINGBOX(#${bbOriginId},${obj.dimensions.width.toFixed(1)},${obj.dimensions.depth.toFixed(1)},${obj.dimensions.height.toFixed(1)});`);

    // Create extruded area solid for more detailed geometry
    const profilePointId = ids.next();
    lines.push(`#${profilePointId}=IFCCARTESIANPOINT((0.0,0.0));`);

    const profileDirId = ids.next();
    lines.push(`#${profileDirId}=IFCDIRECTION((1.0,0.0));`);

    const profilePlacementId = ids.next();
    lines.push(`#${profilePlacementId}=IFCAXIS2PLACEMENT2D(#${profilePointId},#${profileDirId});`);

    const rectProfileId = ids.next();
    lines.push(`#${rectProfileId}=IFCRECTANGLEPROFILEDEF(.AREA.,'${this.escapeString(obj.name)}',#${profilePlacementId},${obj.dimensions.width.toFixed(1)},${obj.dimensions.depth.toFixed(1)});`);

    const extrudeDirId = ids.next();
    lines.push(`#${extrudeDirId}=IFCDIRECTION((0.0,0.0,1.0));`);

    const extrudeOriginId = ids.next();
    lines.push(`#${extrudeOriginId}=IFCCARTESIANPOINT((0.0,0.0,0.0));`);

    const extrudePlaceDirZId = ids.next();
    lines.push(`#${extrudePlaceDirZId}=IFCDIRECTION((0.0,0.0,1.0));`);

    const extrudePlaceDirXId = ids.next();
    lines.push(`#${extrudePlaceDirXId}=IFCDIRECTION((1.0,0.0,0.0));`);

    const extrudePlacementId = ids.next();
    lines.push(`#${extrudePlacementId}=IFCAXIS2PLACEMENT3D(#${extrudeOriginId},#${extrudePlaceDirZId},#${extrudePlaceDirXId});`);

    const extrudedSolidId = ids.next();
    lines.push(`#${extrudedSolidId}=IFCEXTRUDEDAREASOLID(#${rectProfileId},#${extrudePlacementId},#${extrudeDirId},${obj.dimensions.height.toFixed(1)});`);

    // Shape representation
    const shapeRepId = ids.next();
    lines.push(`#${shapeRepId}=IFCSHAPEREPRESENTATION(#${hierarchy.contextId},'Body','SweptSolid',(#${extrudedSolidId}));`);

    const productShapeId = ids.next();
    lines.push(`#${productShapeId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`);

    // Create the IFC entity based on type
    const entityId = ids.next();
    const entityName = this.escapeString(obj.name);

    switch (obj.ifcType) {
      case 'wall':
        lines.push(`#${entityId}=IFCWALLSTANDARDCASE('${guid()}',#${ownerHistoryRef},'${entityName}','Wall element',$,#${placementId},#${productShapeId},$);`);
        break;

      case 'cabinet':
        lines.push(`#${entityId}=IFCFURNISHINGELEMENT('${guid()}',#${ownerHistoryRef},'${entityName}','Kitchen cabinet',$,#${placementId},#${productShapeId},$);`);
        break;

      case 'appliance':
        lines.push(`#${entityId}=IFCFLOWTERMINALELEMENT('${guid()}',#${ownerHistoryRef},'${entityName}','Kitchen appliance',$,#${placementId},#${productShapeId},$);`);
        break;

      case 'sink':
      case 'faucet':
        lines.push(`#${entityId}=IFCFLOWTERMINAL('${guid()}',#${ownerHistoryRef},'${entityName}','Plumbing fixture',$,#${placementId},#${productShapeId},$);`);
        break;

      case 'door':
        lines.push(`#${entityId}=IFCDOOR('${guid()}',#${ownerHistoryRef},'${entityName}','Door',$,#${placementId},#${productShapeId},$,${obj.dimensions.height.toFixed(1)},${obj.dimensions.width.toFixed(1)});`);
        break;

      case 'window':
        lines.push(`#${entityId}=IFCWINDOW('${guid()}',#${ownerHistoryRef},'${entityName}','Window',$,#${placementId},#${productShapeId},$,${obj.dimensions.height.toFixed(1)},${obj.dimensions.width.toFixed(1)});`);
        break;

      case 'countertop':
        lines.push(`#${entityId}=IFCFURNISHINGELEMENT('${guid()}',#${ownerHistoryRef},'${entityName}','Countertop',$,#${placementId},#${productShapeId},$);`);
        break;

      default:
        lines.push(`#${entityId}=IFCBUILDINGELEMENTPROXY('${guid()}',#${ownerHistoryRef},'${entityName}','Building element',$,#${placementId},#${productShapeId},$,$);`);
        break;
    }

    // Containment relationship: element contained in storey
    const relContainedId = ids.next();
    lines.push(`#${relContainedId}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',#${ownerHistoryRef},$,$,(#${entityId}),#${hierarchy.storeyId});`);

    // Property set if enabled
    if (opts.includeProperties && Object.keys(obj.properties).length > 0) {
      this.writePropertySet(lines, ids, entityId, obj, ownerHistoryRef);
    }
  }

  /**
   * Writes an IfcPropertySet for an element with catalog/dimension data.
   */
  private writePropertySet(
    lines: string[],
    ids: EntityIdAllocator,
    entityId: number,
    obj: IFCObjectData,
    ownerHistoryRef: number
  ): void {
    const guid = () => this.generateIFCGuid();
    const propertyIds: number[] = [];

    for (const [key, value] of Object.entries(obj.properties)) {
      const propId = ids.next();

      if (typeof value === 'number') {
        lines.push(`#${propId}=IFCPROPERTYSINGLEVALUE('${this.escapeString(key)}',$,IFCREAL(${value.toFixed(2)}),$);`);
      } else if (typeof value === 'boolean') {
        lines.push(`#${propId}=IFCPROPERTYSINGLEVALUE('${this.escapeString(key)}',$,IFCBOOLEAN(.${value ? 'TRUE' : 'FALSE'}.),$);`);
      } else {
        lines.push(`#${propId}=IFCPROPERTYSINGLEVALUE('${this.escapeString(key)}',$,IFCTEXT('${this.escapeString(String(value))}'),$);`);
      }

      propertyIds.push(propId);
    }

    // Always add dimensions as properties
    const widthPropId = ids.next();
    lines.push(`#${widthPropId}=IFCPROPERTYSINGLEVALUE('Width',$,IFCLENGTHMEASURE(${obj.dimensions.width.toFixed(1)}),$);`);
    propertyIds.push(widthPropId);

    const heightPropId = ids.next();
    lines.push(`#${heightPropId}=IFCPROPERTYSINGLEVALUE('Height',$,IFCLENGTHMEASURE(${obj.dimensions.height.toFixed(1)}),$);`);
    propertyIds.push(heightPropId);

    const depthPropId = ids.next();
    lines.push(`#${depthPropId}=IFCPROPERTYSINGLEVALUE('Depth',$,IFCLENGTHMEASURE(${obj.dimensions.depth.toFixed(1)}),$);`);
    propertyIds.push(depthPropId);

    // Property set
    const propSetId = ids.next();
    const propRefs = propertyIds.map(id => `#${id}`).join(',');
    lines.push(`#${propSetId}=IFCPROPERTYSET('${guid()}',#${ownerHistoryRef},'KitchenXpert_Properties',$,(${propRefs}));`);

    // Relationship: property set to element
    const relDefId = ids.next();
    lines.push(`#${relDefId}=IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistoryRef},$,$,(#${entityId}),#${propSetId});`);
  }

  // ---------- MEP entities ----------

  /**
   * Writes MEP (Mechanical, Electrical, Plumbing) entities for technical points.
   */
  private writeMEPEntities(
    lines: string[],
    ids: EntityIdAllocator,
    scene: KitchenSceneData,
    hierarchy: {
      storeyId: number;
      storeyPlacementId: number;
      contextId: number;
    }
  ): void {
    const guid = () => this.generateIFCGuid();
    const ownerHistoryRef = 5;

    // Traverse scene for technical points
    const processedPositions = new Set<string>();

    const processTechnicalPoint = (
      x: number, y: number, z: number,
      tpType: string, subtype: string
    ) => {
      const posKey = `${x.toFixed(0)}_${y.toFixed(0)}_${z.toFixed(0)}_${tpType}`;
      if (processedPositions.has(posKey)) return;
      processedPositions.add(posKey);

      // Position in mm
      const xMm = x * 1000;
      const yMm = y * 1000;
      const zMm = z * 1000;

      // Create placement
      const pointId = ids.next();
      lines.push(`#${pointId}=IFCCARTESIANPOINT((${xMm.toFixed(1)},${yMm.toFixed(1)},${zMm.toFixed(1)}));`);

      const dirZId = ids.next();
      lines.push(`#${dirZId}=IFCDIRECTION((0.0,0.0,1.0));`);

      const dirXId = ids.next();
      lines.push(`#${dirXId}=IFCDIRECTION((1.0,0.0,0.0));`);

      const axisPlacementId = ids.next();
      lines.push(`#${axisPlacementId}=IFCAXIS2PLACEMENT3D(#${pointId},#${dirZId},#${dirXId});`);

      const placementId = ids.next();
      lines.push(`#${placementId}=IFCLOCALPLACEMENT(#${hierarchy.storeyPlacementId},#${axisPlacementId});`);

      // Simple bounding box geometry for the connection point
      const bbOriginId = ids.next();
      lines.push(`#${bbOriginId}=IFCCARTESIANPOINT((0.0,0.0,0.0));`);

      const connectionSize = 100; // 100mm bounding box
      const bbId = ids.next();
      lines.push(`#${bbId}=IFCBOUNDINGBOX(#${bbOriginId},${connectionSize}.0,${connectionSize}.0,${connectionSize}.0);`);

      const shapeRepId = ids.next();
      lines.push(`#${shapeRepId}=IFCSHAPEREPRESENTATION(#${hierarchy.contextId},'Body','BoundingBox',(#${bbId}));`);

      const productShapeId = ids.next();
      lines.push(`#${productShapeId}=IFCPRODUCTDEFINITIONSHAPE($,$,(#${shapeRepId}));`);

      // Write MEP entity based on type
      const entityId = ids.next();
      const entityName = `${tpType}${subtype ? '_' + subtype : ''}_connection`;

      switch (tpType) {
        case 'water':
          lines.push(`#${entityId}=IFCFLOWTERMINAL('${guid()}',#${ownerHistoryRef},'${entityName}','Water connection point',$,#${placementId},#${productShapeId},$);`);
          break;
        case 'electric':
          lines.push(`#${entityId}=IFCFLOWTERMINAL('${guid()}',#${ownerHistoryRef},'${entityName}','Electrical connection point',$,#${placementId},#${productShapeId},$);`);
          break;
        case 'gas':
          lines.push(`#${entityId}=IFCFLOWTERMINAL('${guid()}',#${ownerHistoryRef},'${entityName}','Gas connection point',$,#${placementId},#${productShapeId},$);`);
          break;
        case 'ventilation':
          lines.push(`#${entityId}=IFCFLOWTERMINAL('${guid()}',#${ownerHistoryRef},'${entityName}','Ventilation point',$,#${placementId},#${productShapeId},$);`);
          break;
        default:
          lines.push(`#${entityId}=IFCFLOWTERMINAL('${guid()}',#${ownerHistoryRef},'${entityName}','Connection point',$,#${placementId},#${productShapeId},$);`);
          break;
      }

      // Containment
      const relContainedId = ids.next();
      lines.push(`#${relContainedId}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${guid()}',#${ownerHistoryRef},$,$,(#${entityId}),#${hierarchy.storeyId});`);

      // Property set for the MEP point
      const typePropId = ids.next();
      lines.push(`#${typePropId}=IFCPROPERTYSINGLEVALUE('ConnectionType',$,IFCTEXT('${tpType}'),$);`);

      const subtypePropId = ids.next();
      lines.push(`#${subtypePropId}=IFCPROPERTYSINGLEVALUE('ConnectionSubtype',$,IFCTEXT('${subtype || tpType}'),$);`);

      const systemPropId = ids.next();
      const systemName = tpType === 'water' ? 'Plumbing' :
                         tpType === 'electric' ? 'Electrical' :
                         tpType === 'gas' ? 'Gas' : 'HVAC';
      lines.push(`#${systemPropId}=IFCPROPERTYSINGLEVALUE('System',$,IFCTEXT('${systemName}'),$);`);

      const propSetId = ids.next();
      lines.push(`#${propSetId}=IFCPROPERTYSET('${guid()}',#${ownerHistoryRef},'KitchenXpert_MEP',$,(#${typePropId},#${subtypePropId},#${systemPropId}));`);

      const relDefId = ids.next();
      lines.push(`#${relDefId}=IFCRELDEFINESBYPROPERTIES('${guid()}',#${ownerHistoryRef},$,$,(#${entityId}),#${propSetId});`);
    };

    // Traverse scene for technicalPoint userData
    scene.threeScene.traverse((obj) => {
      if (obj.userData.technicalPoint) {
        const tp = obj.userData.technicalPoint as { type?: string; subtype?: string };
        processTechnicalPoint(
          obj.position.x, obj.position.y, obj.position.z,
          tp.type || 'electric', tp.subtype || ''
        );
      }
    });

    // Also check objects map
    for (const [, obj] of scene.objects) {
      if (obj.userData.type === 'technical_point') {
        processTechnicalPoint(
          obj.position.x, obj.position.y, obj.position.z,
          (obj.userData.technicalType as string) || 'electric',
          (obj.userData.technicalSubtype as string) || ''
        );
      }
    }
  }

  // ---------- Data collection ----------

  /**
   * Collects scene objects and converts them to IFC-compatible data.
   */
  private collectObjectData(scene: KitchenSceneData): IFCObjectData[] {
    const objects: IFCObjectData[] = [];

    for (const [, obj] of scene.objects) {
      const objType = obj.userData.type as string | undefined;
      if (!objType) continue;
      if (objType === 'floor' || objType === 'ceiling') continue;
      if (objType === 'technical_point') continue;
      if (obj.name.startsWith('__')) continue;

      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) continue;

      const size = new THREE.Vector3();
      box.getSize(size);

      // Convert to mm
      const width = size.x * 1000;
      const height = size.y * 1000;
      const depth = size.z * 1000;

      // Position in mm (center of bounding box bottom)
      const center = new THREE.Vector3();
      box.getCenter(center);
      const posX = center.x * 1000;
      const posY = center.z * 1000; // Three.js Z -> IFC Y
      const posZ = box.min.y * 1000; // Bottom of object

      const ifcType = this.classifyObjectType(objType);
      const name = (obj.userData.name as string) || obj.name || objType;

      // Collect properties from userData
      const properties: Record<string, string | number | boolean> = {};

      if (obj.userData.manufacturer) properties['Manufacturer'] = String(obj.userData.manufacturer);
      if (obj.userData.sku) properties['SKU'] = String(obj.userData.sku);
      if (obj.userData.brand) properties['Brand'] = String(obj.userData.brand);
      if (obj.userData.material) properties['Material'] = String(obj.userData.material);
      if (obj.userData.price) properties['Price'] = Number(obj.userData.price);
      if (obj.userData.catalogItem) {
        const catalog = obj.userData.catalogItem as Record<string, unknown>;
        if (catalog.manufacturer) properties['Manufacturer'] = String(catalog.manufacturer);
        if (catalog.sku) properties['SKU'] = String(catalog.sku);
        if (catalog.price) properties['Price'] = Number(catalog.price);
        if (catalog.material) properties['Material'] = String(catalog.material);
      }

      objects.push({
        name,
        ifcType,
        position: { x: posX, y: posY, z: posZ },
        dimensions: { width, height, depth },
        properties,
      });
    }

    return objects;
  }

  // ---------- Utility ----------

  /**
   * Classifies a Three.js object type string into an IFC entity type.
   */
  private classifyObjectType(type: string): IFCEntityType {
    const lower = type.toLowerCase();

    if (lower === 'wall') return 'wall';
    if (lower === 'door') return 'door';
    if (lower === 'window') return 'window';
    if (lower === 'countertop' || lower === 'worktop') return 'countertop';
    if (lower === 'sink') return 'sink';
    if (lower === 'faucet' || lower === 'tap') return 'faucet';

    // Appliances
    const applianceTypes = [
      'appliance', 'oven', 'dishwasher', 'refrigerator', 'fridge',
      'fridge_freezer', 'microwave', 'cooktop', 'stove', 'hob',
      'hood', 'washer', 'dryer', 'freezer', 'induction',
    ];
    if (applianceTypes.includes(lower)) return 'appliance';

    // Cabinets and furniture
    if (lower === 'cabinet' || lower === 'furniture' ||
        lower.includes('cabinet') || lower.includes('shelf') ||
        lower.includes('drawer')) {
      return 'cabinet';
    }

    return 'unknown';
  }

  /**
   * Generates a simplified IFC GloballyUniqueId (22 characters, base64 encoded).
   * This is a simplified version -- in production, use proper UUID-to-IFC encoding.
   */
  private generateIFCGuid(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
    let result = '';
    const bytes = new Uint8Array(22);

    // Use crypto.getRandomValues — require crypto API for secure GUID generation
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      throw new Error(
        'IFCExporter: crypto.getRandomValues is not available. ' +
        'A secure random source is required for IFC GUID generation.',
      );
    }

    for (let i = 0; i < 22; i++) {
      result += chars[bytes[i]! % 64];
    }

    return result;
  }

  /**
   * Escapes a string for use in IFC STEP file format.
   * Replaces single quotes with double single quotes.
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
  }
}
