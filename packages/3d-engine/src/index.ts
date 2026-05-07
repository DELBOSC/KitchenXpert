/**
 * KitchenXpert 3D Engine
 * Moteur de visualisation 3D pour la conception de cuisines
 */

// Internal imports for KitchenEngine class
import { KitchenScene as KitchenSceneClass } from './engine/scene';
import type { SceneConfig as SceneConfigType } from './engine/scene';
import { KitchenCamera as KitchenCameraClass } from './engine/camera';
import type { CameraConfig as CameraConfigType } from './engine/camera';
import { KitchenRenderer as KitchenRendererClass } from './engine/renderer';
import type { RendererConfig as RendererConfigType } from './engine/renderer';
import { KitchenLighting as KitchenLightingClass } from './engine/lighting';
import type { LightingConfig as LightingConfigType } from './engine/lighting';
import { KitchenLayoutGenerator as KitchenLayoutGeneratorClass } from './kitchen-layout';
import { CollisionSystem as CollisionSystemClass } from './physics/collision';
import { ObjectManipulator as ObjectManipulatorClass } from './interaction/manipulation';
import { CommandHistory as CommandHistoryClass } from './history/command-history';
import { SelectionSystem as SelectionSystemClass } from './interaction/selection';
import { ControlsManager as ControlsManagerClass } from './interaction/controls';
import { SnapSystem as SnapSystemClass } from './interaction/snap-system';
import type { SnapType as SnapTypeInternal } from './interaction/snap-system';
import { DimensionLabels as DimensionLabelsClass } from './interaction/dimension-labels';
import { WorktopGenerator as WorktopGeneratorClass } from './generators/worktop-generator';
import { AccessoriesGenerator as AccessoriesGeneratorClass } from './generators/accessories-generator';
import { PlanView2D as PlanView2DClass } from './views/plan-view-2d';
import { ElevationView as ElevationViewClass } from './views/elevation-view';
import { WalkthroughCamera as WalkthroughCameraClass } from './engine/walkthrough-camera';
import { MeasurementTool as MeasurementToolClass } from './interaction/measurement-tool';
import { AccessibilityChecker as AccessibilityCheckerClass } from './ai/accessibility-checker';
import { AccessibilityOverlay as AccessibilityOverlayClass } from './visualization/accessibility-overlay';
import { TechnicalConstraints as TechnicalConstraintsClass } from './technical/technical-constraints';
import { RealisticLighting as RealisticLightingClass } from './engine/realistic-lighting';
import type { RealisticLightingConfig as RealisticLightingConfigType } from './engine/realistic-lighting';
import { LODManager as LODManagerClass } from './engine/lod-manager';
import { InstancedMeshManager as InstancedMeshManagerClass } from './engine/instanced-mesh-manager';
import { FrustumCuller as FrustumCullerClass } from './engine/frustum-culler';
import { KeyboardManager as KeyboardManagerClass } from './engine/keyboard-manager';
import { ArchitecturalElements as ArchitecturalElementsClass } from './objects/architectural-elements';
import { GroupManager as GroupManagerClass } from './engine/group-manager';
import { ClipboardManager as ClipboardManagerClass } from './engine/clipboard-manager';
import { CollisionDetector as CollisionDetectorClass } from './engine/collision-detector';
import { MirrorTool as MirrorToolClass } from './engine/mirror-tool';
import { MeasurementTools as MeasurementToolsClass } from './visualization/measurement-tools';
import { AnimationSystem as AnimationSystemClass } from './interaction/animation-system';
import { PathTracerPreview as PathTracerPreviewClass } from './engine/path-tracer';
import { getBrandProfile } from './config/brand-profiles';
import type { BrandId as BrandIdType, BrandProfile as BrandProfileType } from './config/brand-profiles';

// Core engine
export { KitchenScene } from './engine/scene';
export type { SceneConfig } from './engine/scene';
export { KitchenCamera } from './engine/camera';
export type { CameraPreset, CameraConfig } from './engine/camera';
export { KitchenRenderer } from './engine/renderer';
export type { RendererConfig, RenderQuality } from './engine/renderer';
export { KitchenLighting } from './engine/lighting';
export type { LightingConfig } from './engine/lighting';

// Kitchen layout
export { KitchenLayoutGenerator } from './kitchen-layout';
export type { AnchorPoint, KitchenLayoutResult } from './kitchen-layout';

// Physics & Collision
export { CollisionSystem } from './physics/collision';
export type { CollisionResult, PlacementConstraints } from './physics/collision';

// Interaction
export { ObjectManipulator } from './interaction/manipulation';
export type { ManipulationMode, ManipulationEvent } from './interaction/manipulation';
export { SelectionSystem } from './interaction/selection';
export type { SelectionEvent } from './interaction/selection';
export { ControlsManager } from './interaction/controls';
export type { TransformMode, TransformEvent } from './interaction/controls';
export { SnapSystem, snapAngle, snapAngle90, snapAngle45 } from './interaction/snap-system';
export type { SnapType, SnapResult, SnapGuide, SnapConfig } from './interaction/snap-system';
export { DimensionLabels } from './interaction/dimension-labels';
export { MeasurementTool } from './interaction/measurement-tool';
export type { Measurement } from './interaction/measurement-tool';
export { AnimationSystem } from './interaction/animation-system';
export type { AnimationConfig } from './interaction/animation-system';

// Path Tracer Preview
export { PathTracerPreview } from './engine/path-tracer';
export type { PathTracerOptions, PathTracerQuality } from './engine/path-tracer';

// History (Undo/Redo)
export {
  CommandHistory,
  AddObjectCommand,
  RemoveObjectCommand,
  MoveObjectCommand,
  RotateObjectCommand,
  ScaleObjectCommand,
  ChangePropertyCommand,
  BatchCommand,
  AddTechnicalPointCommand,
  RemoveTechnicalPointCommand,
  MoveTechnicalPointCommand,
} from './history/command-history';
export type { Command } from './history/command-history';

// Additional History Commands
export {
  DuplicateCommand,
  MaterialChangeCommand,
  DeleteMultipleCommand,
  AlignCommand,
} from './history/additional-commands';
export type { SerializedObjectData, MaterialProperties } from './history/additional-commands';

// Technical constraints
export { TechnicalConstraints } from './technical/technical-constraints';
export type {
  TechnicalPoint,
  TechnicalPointType,
  TechnicalPointSubtype,
  TechnicalPointJSON,
  DisplacementCost,
  ItemDisplacementDetail,
  ItemDisplacementCostResult,
} from './technical/technical-constraints';

// Loaders
export { ModelLoader } from './loaders/model-loader';
export {
  VisualMaterialFactory,
  pickTextureUrl,
  matchKitchenMaterial,
  applyFinish,
  cssColorOrFallback,
} from './loaders/visual-material-factory';
export type { VisualsPayload } from './loaders/visual-material-factory';

// Materials
export { MaterialLibrary, KITCHEN_MATERIALS } from './models/material-model';
export type { KitchenMaterial } from './models/material-model';

// Generators
export { WorktopGenerator } from './generators/worktop-generator';
export type { WorktopConfig, WorktopSegment } from './generators/worktop-generator';
export { AccessoriesGenerator } from './generators/accessories-generator';
export type { PlinthConfig, BacksplashConfig } from './generators/accessories-generator';

// Views
export { PlanView2D } from './views/plan-view-2d';
export { ElevationView } from './views/elevation-view';
export type { ElevationWall } from './views/elevation-view';

// Walkthrough
export { WalkthroughCamera } from './engine/walkthrough-camera';
export type { WalkthroughConfig } from './engine/walkthrough-camera';

// Lighting presets
export { LightingPresets } from './engine/lighting-presets';
export type { LightingPresetName, LightingPresetConfig } from './engine/lighting-presets';

// AI
export { AIAssistant } from './ai/ai-assistant';
export type { WorkTriangleResult, ConfigurationScore, Suggestion, PlacedItem3D, RoomConfig, AutoCompleteResult } from './ai/ai-assistant';
export { SmartPlacement } from './ai/smart-placement';
export type { SuggestedPosition, PlacementValidation, UserBiometrics, PersonalizedRecommendations } from './ai/smart-placement';
export { AccessibilityChecker, AccessibilityStandard } from './ai/accessibility-checker';
export type {
  AccessibilityConfig,
  AccessibilityScore,
  AccessibilityViolation,
  AccessibilityOverlayData,
  AccessibilityZone,
  ViolationSeverity,
} from './ai/accessibility-checker';

// Workflow simulation
export { WorkflowSimulator } from './ai/workflow-simulator';
export type { WorkflowResult } from './ai/workflow-simulator';

// Acoustic planning
export { AcousticPlanner } from './ai/acoustic-planner';
export type { AcousticResult, OpenPlanConfig } from './ai/acoustic-planner';

// Generative design
export { LayoutGenerator } from './ai/layout-generator';
export type { LayoutProposal, GenerationConstraints, LayoutStrategy, LayoutStrategyType } from './ai/layout-generator';
export { WallAnalyzer } from './ai/wall-analysis';
export type { WallSide, WallSegment, WallAnalysis } from './ai/wall-analysis';
export { CabinetSolver } from './ai/cabinet-solver';

// Realistic lighting
export { SolarCalculator, CITY_LOCATIONS, CITY_ENTRIES, CITY_REGIONS } from './engine/solar-position';
export type { GeoLocation, TimeOfDay, SolarPosition, CityRegion, CityEntry } from './engine/solar-position';
export { RealisticLighting } from './engine/realistic-lighting';
export type { RealisticLightingConfig, WindowDefinition, LightingPresetId, SolarLocation, ShadowWindowPosition, ShadowAnalysis } from './engine/realistic-lighting';

// Performance optimizations
export { LODManager } from './engine/lod-manager';
export type { LODConfig } from './engine/lod-manager';
export { InstancedMeshManager } from './engine/instanced-mesh-manager';
export type { InstanceGroup } from './engine/instanced-mesh-manager';
export { FrustumCuller } from './engine/frustum-culler';

// Group operations & Multi-select
export { GroupManager } from './engine/group-manager';
export type { SelectionGroup } from './engine/group-manager';

// Alignment & Distribution
export { AlignmentTools } from './engine/alignment-tools';
export type { AlignAxis, DistributeAxis } from './engine/alignment-tools';

// Clipboard (Copy/Paste)
export { ClipboardManager } from './engine/clipboard-manager';
export type { ClipboardItem } from './engine/clipboard-manager';

// Collision detection (rotation/scale)
export { CollisionDetector } from './engine/collision-detector';
export type { CollisionCheckResult } from './engine/collision-detector';

// Mirror / Flip
export { MirrorTool } from './engine/mirror-tool';
export type { MirrorAxis } from './engine/mirror-tool';

// Keyboard shortcuts
export { KeyboardManager, shortcutToTransformMode } from './engine/keyboard-manager';
export type { ShortcutAction, KeyBinding } from './engine/keyboard-manager';

// Architectural elements (doors & windows)
export { ArchitecturalElements } from './objects/architectural-elements';
export type {
  DoorConfig,
  WindowConfig,
  DoorConfigJSON,
  WindowConfigJSON,
} from './objects/architectural-elements';

// Visualization
export { AccessibilityOverlay } from './visualization/accessibility-overlay';
export { MeasurementTools } from './visualization/measurement-tools';
export type { MeasurementData } from './visualization/measurement-tools';

// VR/AR
export { VRARRenderer } from './vr/vr-renderer';
export type { ARHitTestResult, ARSessionConfig } from './vr/vr-renderer';

// Guided VR Walkthrough (F15)
export { GuidedWalkthrough } from './vr/GuidedWalkthrough';
export type {
  Waypoint,
  KitchenItem as WalkthroughKitchenItem,
  RoomDimensions as WalkthroughRoomDimensions,
  WalkthroughState,
  WalkthroughEventMap,
} from './vr/GuidedWalkthrough';

// AR Live Overlay
export { ARLiveOverlay } from './ar/ARLiveOverlay';
export type { AROverlayConfig, SplitViewConfig } from './ar/ARLiveOverlay';

// Export
export { GLTFExporterUtil } from './export/gltf-exporter';
export { DXFExporter } from './export/dxf-exporter';
export type { DXFExportOptions, KitchenSceneData } from './export/dxf-exporter';
export { IFCExporter } from './export/ifc-exporter';
export type { IFCExportOptions } from './export/ifc-exporter';
export { CNCExporter } from './export/cnc-exporter';
export type { CutList, CutListItem, GCodeOptions } from './export/cnc-exporter';

// Brand profiles
export { getBrandProfile, BRAND_PROFILES, mmToM, mToMm, getAllBrandIds, recomputeWithThickness } from './config/brand-profiles';
export type { BrandProfile, BrandId } from './config/brand-profiles';

/**
 * Classe principale du moteur 3D
 * Intègre tous les composants pour une utilisation simplifiée
 */
export class KitchenEngine {
  public scene: KitchenSceneClass;
  public camera: KitchenCameraClass;
  public renderer: KitchenRendererClass;
  public lighting: KitchenLightingClass;
  public layoutGenerator: KitchenLayoutGeneratorClass;
  public collisionSystem: CollisionSystemClass;
  public manipulator: ObjectManipulatorClass;
  public history: CommandHistoryClass;
  public selection: SelectionSystemClass;
  public controls: ControlsManagerClass;
  public snapSystem: SnapSystemClass;
  public dimensionLabels: DimensionLabelsClass;
  public worktopGenerator: WorktopGeneratorClass;
  public accessoriesGenerator: AccessoriesGeneratorClass;
  public planView2D: PlanView2DClass;
  public elevationView: ElevationViewClass;
  public walkthroughCamera: WalkthroughCameraClass;
  public measurementTool: MeasurementToolClass;
  public accessibilityChecker: AccessibilityCheckerClass;
  public accessibilityOverlay: AccessibilityOverlayClass;
  public technicalConstraints: TechnicalConstraintsClass;
  public realisticLighting: RealisticLightingClass | null = null;
  public lodManager: LODManagerClass;
  public instancedMeshManager: InstancedMeshManagerClass;
  public frustumCuller: FrustumCullerClass;
  public keyboardManager: KeyboardManagerClass;
  public architecturalElements: ArchitecturalElementsClass;
  public groupManager: GroupManagerClass;
  public clipboardManager: ClipboardManagerClass;
  public collisionDetector: CollisionDetectorClass;
  public mirrorTool: MirrorToolClass;
  public measurementTools: MeasurementToolsClass;
  public animationSystem: AnimationSystemClass;
  public pathTracerPreview: PathTracerPreviewClass | null = null;
  public brandProfile: BrandProfileType;
  public roomWidth: number;
  public roomDepth: number;
  public roomHeight: number;

  private container: HTMLElement;
  private _lastEnabledSnaps: Set<SnapTypeInternal> | null = null;

  constructor(
    container: HTMLElement,
    sceneConfig?: SceneConfigType,
    cameraConfig?: CameraConfigType,
    rendererConfig?: RendererConfigType,
    lightingConfig?: LightingConfigType,
    brandId?: BrandIdType
  ) {
    this.container = container;
    this.brandProfile = getBrandProfile(brandId);
    this.roomWidth = 4;
    this.roomDepth = 3;
    this.roomHeight = 2.5;

    // Initialiser les composants de base
    this.scene = new KitchenSceneClass(sceneConfig);
    this.camera = new KitchenCameraClass(container, cameraConfig);
    this.renderer = new KitchenRendererClass(container, rendererConfig);
    this.lighting = new KitchenLightingClass(this.scene.getThreeScene(), lightingConfig);

    // Initialiser les systèmes avancés
    this.layoutGenerator = new KitchenLayoutGeneratorClass();
    this.collisionSystem = new CollisionSystemClass();
    this.manipulator = new ObjectManipulatorClass(
      this.scene.getThreeScene(),
      this.camera.getThreeCamera(),
      this.collisionSystem
    );

    // Systemes pro
    this.history = new CommandHistoryClass();
    this.selection = new SelectionSystemClass(
      this.scene.getThreeScene(),
      this.camera.getThreeCamera()
    );
    this.controls = new ControlsManagerClass(
      this.camera.getThreeCamera(),
      container,
      this.scene.getThreeScene()
    );
    this.snapSystem = new SnapSystemClass(this.scene.getThreeScene());
    this.dimensionLabels = new DimensionLabelsClass(this.scene.getThreeScene());

    // Generators (with brand profile)
    this.worktopGenerator = new WorktopGeneratorClass(this.scene.getThreeScene(), this.brandProfile);
    this.accessoriesGenerator = new AccessoriesGeneratorClass(this.scene.getThreeScene(), this.brandProfile);

    // Views
    this.planView2D = new PlanView2DClass(this.scene.getThreeScene());
    this.elevationView = new ElevationViewClass(this.scene.getThreeScene());

    // Walkthrough
    this.walkthroughCamera = new WalkthroughCameraClass(
      this.camera.getThreeCamera(),
      container
    );

    // Measurement
    this.measurementTool = new MeasurementToolClass(
      this.scene.getThreeScene(),
      this.camera.getThreeCamera()
    );

    // Accessibility PMR
    this.accessibilityChecker = new AccessibilityCheckerClass();
    this.accessibilityOverlay = new AccessibilityOverlayClass(this.scene.getThreeScene());

    // Technical constraints
    this.technicalConstraints = new TechnicalConstraintsClass(this.scene.getThreeScene());

    // Keyboard shortcuts
    this.keyboardManager = new KeyboardManagerClass(container);
    this.wireKeyboardShortcuts();

    // Architectural elements (doors & windows)
    this.architecturalElements = new ArchitecturalElementsClass(this.scene.getThreeScene());

    // Group operations, clipboard, collision detection, measurement tools
    this.groupManager = new GroupManagerClass(this.scene.getThreeScene());
    this.clipboardManager = new ClipboardManagerClass();
    this.collisionDetector = new CollisionDetectorClass(this.scene.getThreeScene());
    this.mirrorTool = new MirrorToolClass(this.scene.getThreeScene());
    this.measurementTools = new MeasurementToolsClass(this.scene.getThreeScene());

    // Animation system for cabinet doors, drawers, and appliances
    this.animationSystem = new AnimationSystemClass();

    // Performance optimization managers
    this.lodManager = new LODManagerClass(this.camera.getThreeCamera());
    this.instancedMeshManager = new InstancedMeshManagerClass(this.scene.getThreeScene());
    this.frustumCuller = new FrustumCullerClass(this.camera.getThreeCamera());
  }

  /**
   * Change le profil marque et regenere les elements dependants
   */
  setBrandProfile(brandId: BrandIdType): void {
    this.brandProfile = getBrandProfile(brandId);
    this.worktopGenerator.updateBrandProfile(this.brandProfile);
    this.accessoriesGenerator.updateBrandProfile(this.brandProfile);
  }

  /**
   * Update room dimensions (in meters)
   */
  setRoomDimensions(width: number, depth: number, height: number): void {
    this.roomWidth = width;
    this.roomDepth = depth;
    this.roomHeight = height;
  }

  /**
   * Initialise les controles async (OrbitControls + TransformControls)
   */
  async initializeControls(): Promise<void> {
    await this.controls.initialize();
  }

  /**
   * Démarre la boucle de rendu
   */
  start(): void {
    this.renderer.startRenderLoop(
      this.scene.getThreeScene(),
      this.camera.getThreeCamera(),
      () => {
        this.controls.update();
        // Update walkthrough camera if active
        if (this.walkthroughCamera.isActive()) {
          this.walkthroughCamera.update(1 / 60);
        }
        // Update cabinet/appliance animations
        this.animationSystem.update();
        // Update performance optimization managers
        this.lodManager.update();
        this.frustumCuller.update();
      }
    );
  }

  /**
   * Arrête la boucle de rendu
   */
  stop(): void {
    this.renderer.stopRenderLoop();
  }

  /**
   * Retourne le container DOM
   */
  getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * Active le mode accessibilite PMR (overlay visuel)
   */
  enableAccessibilityMode(items: import('./ai/ai-assistant').PlacedItem3D[], room: import('./ai/ai-assistant').RoomConfig): void {
    this.accessibilityOverlay.show(items, room, this.accessibilityChecker);
  }

  /**
   * Desactive le mode accessibilite PMR
   */
  disableAccessibilityMode(): void {
    this.accessibilityOverlay.hide();
  }

  /**
   * Active l'eclairage realiste
   */
  enableRealisticLighting(config: RealisticLightingConfigType): void {
    if (this.realisticLighting) {
      this.realisticLighting.dispose();
    }
    this.realisticLighting = new RealisticLightingClass(
      this.scene.getThreeScene(),
      this.renderer.getThreeRenderer(),
      config
    );
    this.realisticLighting.activate();
  }

  /**
   * Desactive l'eclairage realiste
   */
  disableRealisticLighting(): void {
    if (this.realisticLighting) {
      this.realisticLighting.dispose();
      this.realisticLighting = null;
    }
  }

  /**
   * Met a jour l'eclairage realiste
   */
  updateRealisticLighting(config: Partial<RealisticLightingConfigType>): void {
    if (this.realisticLighting) {
      this.realisticLighting.updateLighting(config);
    }
  }

  /**
   * Positionne la camera sur une vue nommee (top, front, right, left, back)
   * Utilise les dimensions de la piece pour calculer la position optimale
   */
  setCameraView(view: 'top' | 'front' | 'right' | 'left' | 'back'): void {
    this.camera.setCameraView(view, {
      width: this.roomWidth,
      depth: this.roomDepth,
      height: this.roomHeight,
    });
  }

  /**
   * Mirror the currently selected object(s) along the given axis.
   * Uses the room center as the pivot for a single object and the
   * collective center for multiple objects.
   */
  mirrorSelected(axis: 'x' | 'z'): void {
    const selected = this.selection.getSelection();
    const primary = this.selection.getPrimarySelection();

    if (selected.length > 1) {
      this.mirrorTool.mirrorObjects(selected, axis);
    } else if (primary) {
      this.mirrorTool.mirrorObject(primary, axis);
    }
  }

  /**
   * Start a progressive path-traced render preview.
   * Produces a high-quality anti-aliased image through sample accumulation.
   */
  startPathTracerPreview(options?: import('./engine/path-tracer').PathTracerOptions): void {
    if (this.pathTracerPreview) {
      this.pathTracerPreview.dispose();
    }
    this.pathTracerPreview = new PathTracerPreviewClass(
      this.renderer.getThreeRenderer(),
      options
    );
    this.pathTracerPreview.startRender(
      this.scene.getThreeScene(),
      this.camera.getThreeCamera()
    );
  }

  /**
   * Stop the path tracer preview and return the accumulated result as a data URL.
   */
  stopPathTracerPreview(): string {
    if (!this.pathTracerPreview) return '';
    const result = this.pathTracerPreview.stopRender();
    return result;
  }

  /**
   * Cable les raccourcis clavier par defaut aux methodes du moteur
   *
   * Les actions delete, duplicate, copy, paste et nudge ne sont pas cablees ici
   * car elles dependent de l'etat de la selection geree par le frontend (useKitchenEngine hook).
   * Le hook peut enregistrer des callbacks supplementaires via engine.keyboardManager.on().
   */
  private wireKeyboardShortcuts(): void {
    const kb = this.keyboardManager;

    // History
    kb.on('undo', () => this.history.undo());
    kb.on('redo', () => this.history.redo());

    // Transform modes
    kb.on('mode_translate', () => this.controls.setMode('translate'));
    kb.on('mode_rotate', () => this.controls.setMode('rotate'));
    kb.on('mode_scale', () => this.controls.setMode('scale'));

    // Deselect
    kb.on('deselect', () => {
      this.selection.clearSelection();
      this.controls.detach();
    });

    // Camera views
    kb.on('view_top', () => this.setCameraView('top'));
    kb.on('view_front', () => this.setCameraView('front'));
    kb.on('view_right', () => this.setCameraView('right'));
    kb.on('view_left', () => this.setCameraView('left'));
    kb.on('view_back', () => this.setCameraView('back'));

    // Snap toggle
    kb.on('snap_toggle', () => {
      const enabledSnaps = this.snapSystem.getConfig().enabledSnaps;
      if (enabledSnaps.size > 0) {
        // Store current enabled snaps before disabling
        this._lastEnabledSnaps = new Set(enabledSnaps);
        enabledSnaps.clear();
      } else {
        // Restore previously enabled snaps (or all by default)
        const restore = this._lastEnabledSnaps ?? new Set<SnapTypeInternal>(['grid', 'wall', 'corner', 'alignment', 'face', 'anchor']);
        this.snapSystem.updateConfig({ enabledSnaps: restore });
      }
    });

    // Nudge selected object
    const NUDGE_DISTANCE = 0.01; // 10mm
    kb.on('nudge_left', () => {
      const selected = this.selection.getPrimarySelection();
      if (selected) selected.position.x -= NUDGE_DISTANCE;
    });
    kb.on('nudge_right', () => {
      const selected = this.selection.getPrimarySelection();
      if (selected) selected.position.x += NUDGE_DISTANCE;
    });
    kb.on('nudge_forward', () => {
      const selected = this.selection.getPrimarySelection();
      if (selected) selected.position.z -= NUDGE_DISTANCE;
    });
    kb.on('nudge_backward', () => {
      const selected = this.selection.getPrimarySelection();
      if (selected) selected.position.z += NUDGE_DISTANCE;
    });
  }

  /**
   * Nettoie et dispose toutes les ressources
   */
  dispose(): void {
    this.stop();
    this.scene.dispose();
    this.renderer.dispose();
    this.lighting.dispose();
    this.collisionSystem.clear();
    if (this.selection && typeof (this.selection as any).dispose === 'function') {
      (this.selection as any).dispose();
    }
    if (this.manipulator && typeof (this.manipulator as any).dispose === 'function') {
      (this.manipulator as any).dispose();
    }
    this.controls.dispose();
    this.snapSystem.dispose();
    this.dimensionLabels.dispose();
    this.history.clear();
    this.worktopGenerator.dispose();
    this.accessoriesGenerator.dispose();
    this.planView2D.dispose();
    this.elevationView.dispose();
    this.walkthroughCamera.dispose();
    this.measurementTool.dispose();
    this.accessibilityOverlay.dispose();
    this.technicalConstraints.dispose();
    this.keyboardManager.dispose();
    this.architecturalElements.dispose();
    this.lodManager.dispose();
    this.instancedMeshManager.dispose();
    this.frustumCuller.dispose();
    this.groupManager.dispose();
    this.clipboardManager.clear();
    this.collisionDetector.dispose();
    this.mirrorTool.dispose();
    this.measurementTools.dispose();
    this.animationSystem.dispose();
    if (this.pathTracerPreview) {
      this.pathTracerPreview.dispose();
      this.pathTracerPreview = null;
    }
    if (this.realisticLighting) {
      this.realisticLighting.dispose();
      this.realisticLighting = null;
    }
  }
}
