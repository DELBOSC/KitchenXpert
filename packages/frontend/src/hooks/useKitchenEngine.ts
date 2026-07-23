import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

import {
  KitchenEngine,
  MoveObjectCommand,
  RotateObjectCommand,
  ScaleObjectCommand,
  AddObjectCommand,
  RemoveObjectCommand,
  BatchCommand,
  ModelLoader,
  LightingPresets,
  mmToM,
} from '@kitchenxpert/3d-engine';

import type {
  TransformMode,
  SelectionEvent,
  TransformEvent,
  Command,
  ElevationWall,
  LightingPresetName,
  BrandProfile,
  BrandId,
} from '@kitchenxpert/3d-engine';

export interface UseKitchenEngineOptions {
  width?: number; // room width in meters
  depth?: number; // room depth in meters
  height?: number; // room height in meters
  shadowsEnabled?: boolean;
  brandId?: BrandId;
}

export interface UseKitchenEngineReturn {
  engine: KitchenEngine | null;
  isReady: boolean;
  /** Callback ref to attach to the canvas container div; init fires on attachment. */
  setContainer: (node: HTMLDivElement | null) => void;
  /** Live ref to the container node (for children that need the DOM element). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Non-null when init failed or timed out (drives the error overlay). */
  initError: 'failed' | 'timeout' | null;
  /** Re-attempt engine init after a failure/timeout. */
  retry: () => void;
  brandProfile: BrandProfile | null;
  // Selection
  selectedObjects: THREE.Object3D[];
  selectedObject: THREE.Object3D | null;
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Objects
  addObject: (id: string, object: THREE.Object3D) => void;
  removeObject: (id: string) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  // Transform
  setTransformMode: (mode: TransformMode) => void;
  transformMode: TransformMode;
  // View
  setViewPreset: (preset: 'perspective' | 'top' | 'front' | 'isometric') => void;
  takeScreenshot: (width?: number, height?: number) => string | null;
  // Snap
  toggleSnap: (enabled: boolean) => void;
  snapEnabled: boolean;
  // Dimensions
  toggleDimensions: (enabled: boolean) => void;
  dimensionsVisible: boolean;
  // Plan View 2D
  togglePlanView: () => void;
  isPlanView: boolean;
  // Elevation View
  toggleElevation: (wall: ElevationWall) => void;
  isElevation: boolean;
  // Walkthrough
  toggleWalkthrough: () => void;
  isWalkthrough: boolean;
  // Measurement
  toggleMeasure: () => void;
  isMeasuring: boolean;
  clearMeasurements: () => void;
  // Lighting
  setLightingPreset: (preset: LightingPresetName) => void;
  currentLightingPreset: LightingPresetName;
  // Drag & drop
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
}

export function useKitchenEngine(options: UseKitchenEngineOptions = {}): UseKitchenEngineReturn {
  const engineRef = useRef<KitchenEngine | null>(null);
  // State-backed callback ref: the init effect is keyed on the DOM node ATTACHING,
  // not on an arbitrary effect flush. `containerRef` mirrors the node for the sync
  // handlers; `containerNode` (state) drives the init effect so it (re)runs the moment
  // the canvas attaches — even if it mounts after a loading branch (the real bug).
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const setContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainerNode(node);
  }, []);
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<'failed' | 'timeout' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const retry = useCallback(() => {
    setInitError(null);
    setIsReady(false);
    setRetryCount((n) => n + 1);
  }, []);
  const [selectedObjects, setSelectedObjects] = useState<THREE.Object3D[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [transformMode, setTransformModeState] = useState<TransformMode>('translate');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [dimensionsVisible, setDimensionsVisible] = useState(true);
  const [isPlanView, setIsPlanView] = useState(false);
  const [isElevation, setIsElevation] = useState(false);
  const [isWalkthrough, setIsWalkthrough] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentLightingPreset, setCurrentLightingPreset] = useState<LightingPresetName>('day');

  const ghostRef = useRef<THREE.Mesh | null>(null);
  const modelLoaderRef = useRef<ModelLoader>(new ModelLoader());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize engine — keyed on containerNode (the ATTACHED node) + retryCount.
  useEffect(() => {
    const container = containerNode;
    if (!container) {
      return;
    }

    // Robustness: never let the loading overlay spin forever in silence. If controls
    // don't resolve within the budget (missing asset, stalled import, refused WebGL…),
    // surface an error instead. Cleared when init resolves or the effect tears down.
    const initTimeout = setTimeout(() => {
      setInitError((prev) => prev ?? 'timeout');
    }, 15000);

    const engine = new KitchenEngine(
      container,
      { backgroundColor: 0xf0f0f0, gridEnabled: true },
      { fov: 50, position: [5, 5, 5] },
      {
        antialias: true,
        shadowsEnabled: options.shadowsEnabled ?? true,
        shadowMapType: THREE.PCFSoftShadowMap,
      },
      undefined, // lightingConfig
      options.brandId
    );

    engineRef.current = engine;

    // Debounced worktop/accessories update
    const updateGenerators = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        const objects = engine.scene.getAllObjects();
        engine.worktopGenerator.updateWorktops(objects);
        engine.accessoriesGenerator.update(objects);
      }, 200);
    };

    // Initialize async controls
    void engine
      .initializeControls()
      .then(() => {
        clearTimeout(initTimeout);
        // Selection callback
        engine.selection.onSelectionChanged((event: SelectionEvent) => {
          setSelectedObjects(event.objects);

          // Attach/detach TransformControls
          if (event.objects.length === 1 && event.objects[0]) {
            engine.controls.attach(event.objects[0]);
            engine.dimensionLabels.showObjectDimensions(event.objects[0]);
          } else {
            engine.controls.detach();
            engine.dimensionLabels.clear();
          }
        });

        // Transform end callback (create undo command)
        engine.controls.onTransform((event: TransformEvent) => {
          if (event.type === 'end') {
            const start = engine.controls.getTransformStart();

            if (event.mode === 'translate' && start.position) {
              const cmd = new MoveObjectCommand(event.object, start.position, event.position);
              engine.history.execute(cmd);
            } else if (event.mode === 'rotate' && start.rotation) {
              const cmd = new RotateObjectCommand(event.object, start.rotation, event.rotation);
              engine.history.execute(cmd);
            } else if (event.mode === 'scale' && start.scale) {
              const cmd = new ScaleObjectCommand(event.object, start.scale, event.scale);
              engine.history.execute(cmd);
            }
          }

          // Update dimensions during transform
          if (event.type === 'change' && dimensionsVisible) {
            engine.dimensionLabels.clear();
            engine.dimensionLabels.showObjectDimensions(event.object);
            // Show distances to walls
            const walls: THREE.Object3D[] = [];
            engine.scene.getThreeScene().traverse((child: THREE.Object3D) => {
              if (child.userData.type === 'wall') {
                walls.push(child);
              }
            });
            engine.dimensionLabels.showDistancesToWalls(event.object, walls);
            engine.dimensionLabels.showDistancesToNeighbors(
              event.object,
              engine.scene.getAllObjects()
            );
          }
        });

        // History change callback — auto-update generators
        engine.history.onChangeCallback(() => {
          setCanUndo(engine.history.canUndo);
          setCanRedo(engine.history.canRedo);
          updateGenerators();
        });

        setIsReady(true);
      })
      .catch((err: unknown) => {
        // No .catch used to exist here — any init failure produced an eternal silent
        // spinner. Now it surfaces as a retryable error overlay.
        clearTimeout(initTimeout);
        console.error('[useKitchenEngine] engine init failed', err);
        setInitError('failed');
      });

    // Start render loop
    engine.start();

    // Handle resize
    const handleResize = () => {
      if (!container) {
        return;
      }
      engine.renderer.resize();
      engine.camera.updateAspect(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Handle mouse events
    const handlePointerDown = (e: PointerEvent) => {
      if (engine.controls.isDragging()) {
        return;
      }
      if (engine.walkthroughCamera.isActive()) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      // Measurement tool intercept
      if (engine.measurementTool.isActive()) {
        engine.measurementTool.handleClick(ndc);
        return;
      }

      engine.selection.selectAtPoint(ndc, e.shiftKey);
    };
    container.addEventListener('pointerdown', handlePointerDown);

    // Mouse move for measurement preview
    const handlePointerMove = (e: PointerEvent) => {
      if (!engine.measurementTool.isActive()) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      engine.measurementTool.handleMouseMove(ndc);
    };
    container.addEventListener('pointermove', handlePointerMove);

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts during walkthrough
      if (engine.walkthroughCamera.isActive()) {
        return;
      }

      // Ctrl+Z = undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        engine.history.undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z = redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        engine.history.redo();
      }
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = engine.selection.getSelection();
        if (selected.length > 0) {
          e.preventDefault();
          const cmds: Command[] = selected.map(
            (obj: THREE.Object3D) =>
              new RemoveObjectCommand(
                engine.scene.getThreeScene(),
                obj,
                engine.scene.getAllObjects(),
                (o: THREE.Object3D) => engine.collisionSystem.addCollisionObject(o),
                (o: THREE.Object3D) => engine.collisionSystem.removeCollisionObject(o)
              )
          );
          engine.history.execute(new BatchCommand(cmds, 'Supprimer'));
          engine.selection.clearSelection();
          engine.controls.detach();
        }
      }
      // W = translate, E = rotate, R = scale
      if (e.key === 'w') {
        engine.controls.setMode('translate');
      }
      if (e.key === 'e') {
        engine.controls.setMode('rotate');
      }
      if (e.key === 'r') {
        engine.controls.setMode('scale');
      }
      // Escape = deselect or cancel measurement
      if (e.key === 'Escape') {
        engine.selection.clearSelection();
        engine.controls.detach();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(initTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerNode, retryCount]);

  const undo = useCallback(() => {
    engineRef.current?.history.undo();
  }, []);

  const redo = useCallback(() => {
    engineRef.current?.history.redo();
  }, []);

  const addObject = useCallback((id: string, object: THREE.Object3D) => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    object.userData.id = id;
    const cmd = new AddObjectCommand(
      engine.scene.getThreeScene(),
      object,
      engine.scene.getAllObjects(),
      (o: THREE.Object3D) => engine.collisionSystem.addCollisionObject(o),
      (o: THREE.Object3D) => engine.collisionSystem.removeCollisionObject(o)
    );
    engine.history.execute(cmd);
  }, []);

  const removeObject = useCallback((id: string) => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const obj = engine.scene.getObject(id);
    if (obj) {
      const cmd = new RemoveObjectCommand(
        engine.scene.getThreeScene(),
        obj,
        engine.scene.getAllObjects(),
        (o: THREE.Object3D) => engine.collisionSystem.addCollisionObject(o),
        (o: THREE.Object3D) => engine.collisionSystem.removeCollisionObject(o)
      );
      engine.history.execute(cmd);
    }
  }, []);

  const removeSelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const selected = engine.selection.getSelection();
    if (selected.length === 0) {
      return;
    }

    const cmds: Command[] = selected.map(
      (obj: THREE.Object3D) =>
        new RemoveObjectCommand(
          engine.scene.getThreeScene(),
          obj,
          engine.scene.getAllObjects(),
          (o: THREE.Object3D) => engine.collisionSystem.addCollisionObject(o),
          (o: THREE.Object3D) => engine.collisionSystem.removeCollisionObject(o)
        )
    );
    engine.history.execute(new BatchCommand(cmds, 'Supprimer'));
    engine.selection.clearSelection();
    engine.controls.detach();
  }, []);

  const duplicateSelected = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const selected = engine.selection.getSelection();
    if (selected.length === 0) {
      return;
    }

    const cmds: Command[] = [];
    for (const obj of selected) {
      const clone = obj.clone();
      clone.position.add(new THREE.Vector3(0.5, 0, 0.5));
      const newId = `${obj.userData.id}-copy-${Date.now()}`;
      clone.userData = { ...obj.userData, id: newId };

      cmds.push(
        new AddObjectCommand(
          engine.scene.getThreeScene(),
          clone,
          engine.scene.getAllObjects(),
          (o: THREE.Object3D) => engine.collisionSystem.addCollisionObject(o),
          (o: THREE.Object3D) => engine.collisionSystem.removeCollisionObject(o)
        )
      );
    }
    engine.history.execute(new BatchCommand(cmds, 'Dupliquer'));
  }, []);

  const setTransformMode = useCallback((mode: TransformMode) => {
    engineRef.current?.controls.setMode(mode);
    setTransformModeState(mode);
  }, []);

  const setViewPreset = useCallback(
    (preset: 'perspective' | 'top' | 'front' | 'isometric') => {
      const engine = engineRef.current;
      if (!engine) {
        return;
      }

      const presetMap: Record<string, import('@kitchenxpert/3d-engine').CameraPreset> = {
        perspective: 'perspective' as import('@kitchenxpert/3d-engine').CameraPreset,
        top: 'top' as import('@kitchenxpert/3d-engine').CameraPreset,
        front: 'front' as import('@kitchenxpert/3d-engine').CameraPreset,
        isometric: 'isometric' as import('@kitchenxpert/3d-engine').CameraPreset,
      };

      engine.camera.applyPreset(presetMap[preset]!, {
        width: options.width || 4,
        depth: options.depth || 3,
      });
    },
    [options.width, options.depth]
  );

  const takeScreenshot = useCallback((_w?: number, _h?: number) => {
    const engine = engineRef.current;
    if (!engine) {
      return null;
    }

    return engine.renderer.takeScreenshot();
  }, []);

  const toggleSnap = useCallback((enabled: boolean) => {
    setSnapEnabled(enabled);
    if (engineRef.current) {
      engineRef.current.controls.setTranslationSnap(enabled ? 0.001 : null);
      engineRef.current.controls.setRotationSnap(enabled ? Math.PI / 12 : null);
    }
  }, []);

  const toggleDimensions = useCallback((visible: boolean) => {
    setDimensionsVisible(visible);
    engineRef.current?.dimensionLabels.setVisible(visible);
  }, []);

  // Plan View 2D
  const togglePlanView = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    if (isPlanView) {
      // Deactivate: restore 3D view
      const savedState = engine.planView2D.deactivate();
      if (savedState) {
        engine.camera.setPosition(
          savedState.position.x,
          savedState.position.y,
          savedState.position.z
        );
        engine.camera.setTarget(savedState.target.x, savedState.target.y, savedState.target.z);
      }
      engine.renderer.setActiveCamera(engine.camera.getThreeCamera());
      engine.controls.setEnabled(true);
      setIsPlanView(false);
    } else {
      // Deactivate other views first
      if (isElevation) {
        engine.elevationView.deactivate();
        setIsElevation(false);
      }
      if (isWalkthrough) {
        engine.walkthroughCamera.deactivate();
        setIsWalkthrough(false);
      }

      // Activate 2D plan view
      engine.camera.saveState();
      const orthoCam = engine.planView2D.activate(
        options.width || 4,
        options.depth || 3,
        engine.scene.getAllObjects()
      );
      engine.renderer.setActiveCamera(orthoCam);
      engine.controls.setEnabled(false);
      setIsPlanView(true);
    }
  }, [isPlanView, isElevation, isWalkthrough, options.width, options.depth]);

  // Elevation View
  const toggleElevation = useCallback(
    (wall: ElevationWall) => {
      const engine = engineRef.current;
      if (!engine) {
        return;
      }

      if (isElevation) {
        // Deactivate
        const savedState = engine.elevationView.deactivate();
        if (savedState) {
          engine.camera.setPosition(
            savedState.position.x,
            savedState.position.y,
            savedState.position.z
          );
          engine.camera.setTarget(savedState.target.x, savedState.target.y, savedState.target.z);
        }
        engine.renderer.setActiveCamera(engine.camera.getThreeCamera());
        engine.controls.setEnabled(true);
        setIsElevation(false);
      } else {
        // Deactivate other views
        if (isPlanView) {
          engine.planView2D.deactivate();
          setIsPlanView(false);
        }
        if (isWalkthrough) {
          engine.walkthroughCamera.deactivate();
          setIsWalkthrough(false);
        }

        engine.camera.saveState();
        const orthoCam = engine.elevationView.activate(
          wall,
          options.width || 4,
          options.depth || 3,
          options.height || 2.5,
          engine.scene.getAllObjects()
        );
        engine.renderer.setActiveCamera(orthoCam);
        engine.controls.setEnabled(false);
        setIsElevation(true);
      }
    },
    [isElevation, isPlanView, isWalkthrough, options.width, options.depth, options.height]
  );

  // Walkthrough
  const toggleWalkthrough = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    if (isWalkthrough) {
      engine.walkthroughCamera.deactivate();
      engine.camera.restoreState();
      engine.renderer.setActiveCamera(engine.camera.getThreeCamera());
      engine.controls.setEnabled(true);
      setIsWalkthrough(false);
    } else {
      // Deactivate other views
      if (isPlanView) {
        engine.planView2D.deactivate();
        setIsPlanView(false);
      }
      if (isElevation) {
        engine.elevationView.deactivate();
        setIsElevation(false);
      }

      // Set walls for collision
      const walls: THREE.Object3D[] = [];
      engine.scene.getThreeScene().traverse((child: THREE.Object3D) => {
        if (child.userData.type === 'wall') {
          walls.push(child);
        }
      });
      engine.walkthroughCamera.setWalls(walls);

      engine.camera.saveState();
      engine.controls.setEnabled(false);
      engine.walkthroughCamera.activate(
        new THREE.Vector3((options.width || 4) / 2, 1.65, (options.depth || 3) / 2)
      );
      setIsWalkthrough(true);
    }
  }, [isWalkthrough, isPlanView, isElevation, options.width, options.depth]);

  // Measurement tool
  const toggleMeasure = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const newState = !isMeasuring;
    engine.measurementTool.setActive(newState);
    setIsMeasuring(newState);
  }, [isMeasuring]);

  const clearMeasurements = useCallback(() => {
    engineRef.current?.measurementTool.clearAll();
  }, []);

  // Lighting presets
  const setLightingPreset = useCallback((preset: LightingPresetName) => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    LightingPresets.apply(engine.lighting, engine.renderer, preset);
    setCurrentLightingPreset(preset);
  }, []);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const data = e.dataTransfer.types.includes('application/json')
      ? null // Can't read during dragover, only on drop
      : null;

    // Get mouse position in NDC
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Raycast to floor plane
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, engine.camera.getThreeCamera());
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(floorPlane, intersection);

    // Create or update ghost
    if (!ghostRef.current) {
      const geometry = new THREE.BoxGeometry(0.6, 0.88, 0.6);
      const material = new THREE.MeshStandardMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.4,
      });
      ghostRef.current = new THREE.Mesh(geometry, material);
      ghostRef.current.name = '__drag_ghost__';
      engine.scene.getThreeScene().add(ghostRef.current);
    }

    if (intersection && data === null) {
      ghostRef.current.position.copy(intersection);
      ghostRef.current.position.y = mmToM(engineRef.current!.brandProfile.base.totalHeight) / 2;
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const engine = engineRef.current;
      if (!engine) {
        return;
      }

      // Remove ghost
      if (ghostRef.current) {
        engine.scene.getThreeScene().remove(ghostRef.current);
        ghostRef.current.geometry.dispose();
        (ghostRef.current.material as THREE.Material).dispose();
        ghostRef.current = null;
      }

      // Parse catalog item data
      const jsonData = e.dataTransfer.getData('application/json');
      if (!jsonData) {
        return;
      }

      let itemData: {
        id: string;
        type: string;
        name: string;
        width: number;
        height: number;
        depth: number;
        color: number;
        price?: number;
      };

      try {
        itemData = JSON.parse(jsonData) as typeof itemData;
      } catch {
        return;
      }

      // Calculate drop position via raycast
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, engine.camera.getThreeCamera());
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(floorPlane, intersection);

      if (!hit) {
        return;
      }

      // Create the mesh
      const loader = modelLoaderRef.current;
      const dimensions = {
        width: itemData.width / 1000,
        height: itemData.height / 1000,
        depth: itemData.depth / 1000,
      };

      const mesh = loader.createProceduralFallback(itemData.type, dimensions, itemData.color);
      const uniqueId = `${itemData.id}-${Date.now()}`;

      mesh.userData = {
        id: uniqueId,
        type: itemData.type,
        catalogId: itemData.id,
        name: itemData.name,
        dimensions,
        price: itemData.price,
      };

      // Position at drop point
      mesh.position.copy(intersection);
      mesh.position.y =
        itemData.type === 'wall_cabinet' ? mmToM(engineRef.current!.brandProfile.wall.bottomY) : 0;

      // Add via command for undo support
      addObject(uniqueId, mesh);
    },
    [addObject]
  );

  const handleDragLeave = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    if (ghostRef.current) {
      engine.scene.getThreeScene().remove(ghostRef.current);
      ghostRef.current.geometry.dispose();
      (ghostRef.current.material as THREE.Material).dispose();
      ghostRef.current = null;
    }
  }, []);

  return {
    engine: engineRef.current,
    isReady,
    setContainer,
    containerRef,
    initError,
    retry,
    brandProfile: engineRef.current?.brandProfile ?? null,
    selectedObjects,
    selectedObject: selectedObjects[0] || null,
    undo,
    redo,
    canUndo,
    canRedo,
    addObject,
    removeObject,
    removeSelected,
    duplicateSelected,
    setTransformMode,
    transformMode,
    setViewPreset,
    takeScreenshot,
    toggleSnap,
    snapEnabled,
    toggleDimensions,
    dimensionsVisible,
    // New features
    togglePlanView,
    isPlanView,
    toggleElevation,
    isElevation,
    toggleWalkthrough,
    isWalkthrough,
    toggleMeasure,
    isMeasuring,
    clearMeasurements,
    setLightingPreset,
    currentLightingPreset,
    handleDragOver,
    handleDrop,
    handleDragLeave,
  };
}
