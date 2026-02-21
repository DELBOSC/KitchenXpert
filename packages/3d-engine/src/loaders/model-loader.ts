import * as THREE from 'three';

/**
 * Chargeur de modeles 3D avec cache et fallback procedural
 */
export class ModelLoader {
  private cache: Map<string, THREE.Group> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Group>> = new Map();

  /**
   * Charge un modele GLTF/GLB depuis une URL
   */
  async load(url: string): Promise<THREE.Group> {
    // Return from cache
    const cached = this.cache.get(url);
    if (cached) {
      return cached.clone();
    }

    // Deduplicate concurrent loads
    const existing = this.loadingPromises.get(url);
    if (existing) {
      const result = await existing;
      return result.clone();
    }

    const promise = this.loadModel(url);
    this.loadingPromises.set(url, promise);

    try {
      const model = await promise;
      this.cache.set(url, model);
      return model.clone();
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * Charge le modele via GLTFLoader
   */
  private async loadModel(url: string): Promise<THREE.Group> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // Enable shadows
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          resolve(model);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  /**
   * Cree un fallback procedural quand le modele GLTF n'est pas disponible
   */
  createProceduralFallback(
    type: string,
    dimensions: { width: number; height: number; depth: number },
    color: number = 0x888888
  ): THREE.Group {
    const group = new THREE.Group();
    const { width, height, depth } = dimensions;

    switch (type) {
      case 'base_cabinet':
      case 'base': {
        // Plinth (recessed base)
        const plinth = this.createBox(width - 0.06, 0.1, depth - 0.03, this.darkenColor(color, 0.3));
        plinth.position.set(0, 0.05, 0.015);
        group.add(plinth);

        // Cabinet body (sits on plinth)
        const cabinet = this.createCabinetBody(width, height - 0.1, depth, color);
        cabinet.position.y = 0.1;
        group.add(cabinet);

        // Worktop
        const worktopMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.1 });
        const worktop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.025, 0.038, depth + 0.025), worktopMat);
        worktop.position.set(0, height + 0.019, 0.0125);
        worktop.castShadow = true;
        worktop.receiveShadow = true;
        group.add(worktop);
        break;
      }

      case 'wall_cabinet':
      case 'wall': {
        const cabinet = this.createCabinetBody(width, height, depth, color);
        group.add(cabinet);
        break;
      }

      case 'tall_cabinet':
      case 'tall': {
        // Plinth
        const plinth = this.createBox(width - 0.06, 0.1, depth - 0.03, this.darkenColor(color, 0.3));
        plinth.position.set(0, 0.05, 0.015);
        group.add(plinth);

        // Lower section with drawers
        const lowerH = Math.min(0.72, height * 0.35);
        const lower = this.createCabinetBody(width, lowerH, depth, color, { hasDrawers: true, drawerCount: 3 });
        lower.position.y = 0.1;
        group.add(lower);

        // Upper section with doors
        const upperH = height - lowerH - 0.1;
        const upper = this.createCabinetBody(width, upperH, depth, color);
        upper.position.y = 0.1 + lowerH;
        group.add(upper);
        break;
      }

      case 'sink': {
        const plinthSink = this.createBox(width - 0.06, 0.1, depth - 0.03, this.darkenColor(color, 0.3));
        plinthSink.position.set(0, 0.05, 0.015);
        group.add(plinthSink);

        const cabinetSink = this.createCabinetBody(width, height - 0.1, depth, color);
        cabinetSink.position.y = 0.1;
        group.add(cabinetSink);

        // Worktop
        const worktopSink = this.createBox(width + 0.025, 0.038, depth + 0.025, 0x555555);
        worktopSink.position.set(0, height + 0.019, 0.0125);
        group.add(worktopSink);

        // Basin recess (darker indentation)
        const basin = this.createBox(width * 0.65, 0.005, depth * 0.45, 0x888888);
        basin.position.set(0, height + 0.038, 0);
        group.add(basin);

        // Faucet base
        const faucetBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.025, 0.04, 12),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })
        );
        faucetBase.position.set(0, height + 0.058, -depth / 2 + 0.1);
        faucetBase.castShadow = true;
        group.add(faucetBase);

        // Faucet stem
        const faucetStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })
        );
        faucetStem.position.set(0, height + 0.148, -depth / 2 + 0.1);
        faucetStem.castShadow = true;
        group.add(faucetStem);

        // Faucet spout (angled)
        const spout = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.01, 0.12, 8),
          new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })
        );
        spout.position.set(0, height + 0.24, -depth / 2 + 0.15);
        spout.rotation.x = Math.PI / 4;
        spout.castShadow = true;
        group.add(spout);
        break;
      }

      case 'cooktop':
      case 'stove': {
        // Glass surface
        const surface = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.1, metalness: 0.3 })
        );
        surface.position.y = height / 2;
        surface.castShadow = true;
        surface.receiveShadow = true;
        group.add(surface);

        // Burner rings (4 burners, 2 sizes)
        const burnerConfigs: { x: number; z: number; r: number }[] = [
          { x: -width / 4, z: -depth / 4, r: 0.09 },  // large
          { x: width / 4, z: -depth / 4, r: 0.07 },   // small
          { x: -width / 4, z: depth / 4, r: 0.07 },   // small
          { x: width / 4, z: depth / 4, r: 0.09 },    // large
        ];
        for (const bc of burnerConfigs) {
          // Outer ring
          const outer = new THREE.Mesh(
            new THREE.TorusGeometry(bc.r, 0.006, 8, 24),
            new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 })
          );
          outer.position.set(bc.x, height + 0.004, bc.z);
          outer.rotation.x = -Math.PI / 2;
          group.add(outer);
          // Center dot
          const dot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.003, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
          );
          dot.position.set(bc.x, height + 0.002, bc.z);
          group.add(dot);
        }
        break;
      }

      case 'refrigerator':
      case 'fridge': {
        const body = this.createBox(width, height, depth, 0xe0e0e0);
        body.position.y = height / 2;
        group.add(body);

        // Door seam line (fridge/freezer separation at ~65% height)
        const seam = this.createBox(width - 0.01, 0.003, 0.003, 0xbbbbbb);
        seam.position.set(0, height * 0.65, depth / 2 + 0.001);
        group.add(seam);

        // Upper handle (fridge)
        const handleUpper = this.createBox(0.02, height * 0.28, 0.025, 0xcccccc);
        handleUpper.position.set(width / 2 - 0.04, height * 0.82, depth / 2 + 0.02);
        group.add(handleUpper);

        // Lower handle (freezer)
        const handleLower = this.createBox(0.02, height * 0.18, 0.025, 0xcccccc);
        handleLower.position.set(width / 2 - 0.04, height * 0.35, depth / 2 + 0.02);
        group.add(handleLower);
        break;
      }

      case 'dishwasher': {
        const body = this.createBox(width, height, depth, 0xd5d5d5);
        body.position.y = height / 2;
        group.add(body);

        // Control panel strip at top
        const panel = this.createBox(width - 0.02, 0.04, 0.003, 0x888888);
        panel.position.set(0, height - 0.03, depth / 2 + 0.002);
        group.add(panel);

        // Handle bar
        const handle = this.createBox(width * 0.6, 0.015, 0.02, 0xaaaaaa);
        handle.position.set(0, height * 0.82, depth / 2 + 0.015);
        group.add(handle);

        // Bottom door line
        const doorLine = this.createBox(width - 0.01, 0.003, 0.003, 0xbbbbbb);
        doorLine.position.set(0, height * 0.08, depth / 2 + 0.001);
        group.add(doorLine);
        break;
      }

      case 'hood': {
        // Chimney section
        const chimney = this.createBox(width * 0.35, height * 0.55, depth * 0.35, 0xcccccc);
        chimney.position.set(0, height * 0.725, 0);
        group.add(chimney);

        // Canopy (wider base)
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(width, height * 0.25, depth),
          new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.3, metalness: 0.4 })
        );
        canopy.position.y = height * 0.325;
        canopy.castShadow = true;
        canopy.receiveShadow = true;
        group.add(canopy);

        // Filter grid lines
        const gridColor = 0x999999;
        for (let i = -3; i <= 3; i++) {
          const gridLine = this.createBox(0.003, 0.003, depth - 0.04, gridColor);
          gridLine.position.set(i * (width / 8), height * 0.2, 0);
          group.add(gridLine);
        }

        // LED strip at bottom front
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.6, 0.005, 0.01),
          new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.3 })
        );
        led.position.set(0, height * 0.2, depth / 2 - 0.01);
        group.add(led);
        break;
      }

      default: {
        const body = this.createBox(width, height, depth, color);
        body.position.y = height / 2;
        group.add(body);
      }
    }

    group.userData.procedural = true;
    return group;
  }

  /**
   * Precharge un lot de modeles
   */
  async preload(urls: string[]): Promise<void> {
    await Promise.allSettled(urls.map((url) => this.load(url)));
  }

  /**
   * Libere un modele du cache
   */
  dispose(url: string): void {
    const model = this.cache.get(url);
    if (model) {
      this.disposeGroup(model);
      this.cache.delete(url);
    }
  }

  /**
   * Vide tout le cache
   */
  disposeAll(): void {
    for (const model of this.cache.values()) {
      this.disposeGroup(model);
    }
    this.cache.clear();
  }

  /**
   * Dispose all cached models and clear both cache and loadingPromises maps.
   * Use this to fully release all memory held by the loader.
   */
  clearCache(): void {
    for (const model of this.cache.values()) {
      this.disposeGroup(model);
    }
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Taille du cache
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  private createCabinetBody(w: number, h: number, d: number, color: number, options?: {
    panelCount?: number;
    hasDrawers?: boolean;
    drawerCount?: number;
  }): THREE.Group {
    const group = new THREE.Group();

    // Main body with slight bevel
    const body = this.createBox(w, h, d, color);
    body.position.y = h / 2;
    group.add(body);

    // Front panel lines (door separation)
    const panelCount = options?.panelCount ?? (w > 0.5 ? 2 : 1);
    const lineColor = this.darkenColor(color, 0.15);
    const lineThickness = 0.003;

    if (options?.hasDrawers) {
      // Drawer lines
      const drawers = options?.drawerCount ?? 3;
      for (let i = 1; i < drawers; i++) {
        const y = (h / drawers) * i;
        const line = this.createBox(w - 0.01, lineThickness, lineThickness, lineColor);
        line.position.set(0, y, d / 2 + 0.001);
        group.add(line);
      }
      // Drawer handles
      for (let i = 0; i < drawers; i++) {
        const y = (h / drawers) * (i + 0.5);
        const handle = this.createBox(0.08, 0.012, 0.015, 0xaaaaaa);
        handle.position.set(0, y, d / 2 + 0.015);
        group.add(handle);
      }
    } else if (panelCount >= 2) {
      // Vertical door separation
      const sep = this.createBox(lineThickness, h - 0.01, lineThickness, lineColor);
      sep.position.set(0, h / 2, d / 2 + 0.001);
      group.add(sep);
      // Two handles
      for (const xOff of [-0.03, 0.03]) {
        const handle = this.createBox(0.015, 0.12, 0.015, 0xaaaaaa);
        handle.position.set(xOff, h * 0.65, d / 2 + 0.015);
        group.add(handle);
      }
    } else {
      // Single door handle
      const handle = this.createBox(0.015, 0.12, 0.015, 0xaaaaaa);
      handle.position.set(w / 2 - 0.04, h * 0.65, d / 2 + 0.015);
      group.add(handle);
    }

    return group;
  }

  private darkenColor(color: number, amount: number): number {
    const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (color & 0xff) * (1 - amount));
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }

  private createBox(w: number, h: number, d: number, color: number): THREE.Mesh {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
}
