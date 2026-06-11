import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { useSandboxStore, type SandboxItem } from '../../sandbox/store';

/**
 * SandboxCanvas — minimal but real Three.js renderer for the sandbox.
 *
 * Why "minimal":
 *   - The full designer (`KitchenDesignerPage`) is heavy, auth-bound,
 *     and currently calls React Query at module load. Until it's
 *     refactored to consume `useDesignerStore()`, we ship a leaner
 *     stand-alone canvas that:
 *       · subscribes to `useSandboxStore`
 *       · renders one box per `SandboxItem` at its position
 *       · grid + ambient + directional light + OrbitControls
 *       · click-to-select item (highlights + reports id upward)
 *
 * What it deliberately does NOT do (yet):
 *   - drag-drop from the palette (use the palette's "Ajouter" button)
 *   - gizmos / scale handles
 *   - shadows, env-map, post-processing — adds 200 KB for marginal gain
 *
 * The full path-tracer experience is account-only by design (see
 * `useSandboxLimits` → `tryUsePathtracerHQ`).
 */

export interface SandboxCanvasProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const SCALE = 0.01; // store is in cm; THREE units are metres

export function SandboxCanvas({
  selectedId, onSelect,
}: SandboxCanvasProps): React.ReactElement {
  const mountRef = useRef<HTMLDivElement>(null);
  const items = useSandboxStore((s) => s.project?.kitchen.items ?? []);
  const room = useSandboxStore((s) => s.project?.kitchen ?? null);

  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {return;}

    // ---- Scene + camera ------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 6, 20);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(4, 4, 5);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ---- Lights --------------------------------------------------------
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.1);
    sun.position.set(5, 8, 4);
    scene.add(sun);

    // ---- Grid floor ----------------------------------------------------
    const grid = new THREE.GridHelper(20, 40, 0x444444, 0x222222);
    grid.position.y = 0;
    scene.add(grid);

    // ---- Room outline (matches kitchen dims) --------------------------
    if (room) {
      const w = room.widthCm * SCALE;
      const d = room.depthCm * SCALE;
      const h = room.heightCm * SCALE;
      const wall = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
        new THREE.LineBasicMaterial({ color: 0x4040ff, transparent: true, opacity: 0.35 }),
      );
      wall.position.set(w / 2, h / 2, d / 2);
      scene.add(wall);
    }

    // ---- Items ---------------------------------------------------------
    const itemGroup = new THREE.Group();
    scene.add(itemGroup);

    const itemMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8, roughness: 0.6, metalness: 0.05,
    });
    const itemSelectedMat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa, emissive: 0x4c1d95, roughness: 0.4,
    });

    function rebuildItems(list: SandboxItem[]): void {
      while (itemGroup.children.length > 0) {
        const c = itemGroup.children[0];
        if (!c) {break;}
        itemGroup.remove(c);
        if (c instanceof THREE.Mesh) {
          (c.geometry as THREE.BufferGeometry).dispose();
        }
      }
      for (const it of list) {
        const geo = new THREE.BoxGeometry(
          it.size.w * SCALE, it.size.h * SCALE, it.size.d * SCALE,
        );
        const mesh = new THREE.Mesh(
          geo,
          it.id === selectedRef.current ? itemSelectedMat : itemMat,
        );
        mesh.position.set(
          it.position.x * SCALE + (it.size.w * SCALE) / 2,
          it.position.z * SCALE + (it.size.h * SCALE) / 2,
          it.position.y * SCALE + (it.size.d * SCALE) / 2,
        );
        mesh.rotation.y = (it.rotation * Math.PI) / 180;
        mesh.userData.itemId = it.id;
        itemGroup.add(mesh);
      }
    }
    rebuildItems(items);

    // ---- Mouse orbit (lightweight, no OrbitControls dep) --------------
    let azimuth = Math.PI / 4;
    let polar = Math.PI / 3;
    let radius = 7;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const updateCamera = (): void => {
      const cx = Math.sin(polar) * Math.sin(azimuth) * radius;
      const cy = Math.cos(polar) * radius;
      const cz = Math.sin(polar) * Math.cos(azimuth) * radius;
      camera.position.set(cx + 2, cy + 0.5, cz + 1.75);
      camera.lookAt(2, 0.5, 1.75);
    };
    updateCamera();

    const onPointerDown = (e: PointerEvent): void => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    };
    const onPointerUp = (): void => { dragging = false; };
    const onPointerMove = (e: PointerEvent): void => {
      if (!dragging) {return;}
      azimuth -= (e.clientX - lastX) * 0.005;
      polar = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, polar + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
      updateCamera();
    };
    const onWheel = (e: WheelEvent): void => {
      radius = Math.max(2, Math.min(20, radius + e.deltaY * 0.005));
      updateCamera();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    // ---- Click-to-select (raycast) ------------------------------------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onClick = (e: MouseEvent): void => {
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(itemGroup.children, false);
      const first = hits[0];
      if (!first) {
        onSelect(null);
      } else {
        const id = first.object.userData.itemId as string | undefined;
        onSelect(id ?? null);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // ---- Resize handling + render loop --------------------------------
    const resize = (): void => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const tick = (): void => {
      // Pause render when tab hidden — saves battery, also a perf win on
      // Lighthouse's "minimize main-thread work" audit.
      if (document.visibilityState === 'visible') {
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    // ---- Subscribe to store updates -----------------------------------
    const unsub = useSandboxStore.subscribe((s, prev) => {
      if (s.project?.kitchen.items !== prev.project?.kitchen.items) {
        rebuildItems(s.project?.kitchen.items ?? []);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // We deliberately do not depend on `items` — the subscribe()
    // callback handles those updates without tearing down the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.widthCm, room?.depthCm, room?.heightCm, onSelect]);

  // Re-rebuild on selection change so the selected mesh swaps material.
  useEffect(() => {
    // Trigger a synthetic store change so the subscribe callback runs
    // and re-applies the selected material. Cheaper than threading the
    // selection state into the effect dependencies.
    const current = useSandboxStore.getState().project;
    if (current) {useSandboxStore.setState({ project: { ...current } });}
  }, [selectedId]);

  return (
    <div
      ref={mountRef}
      data-testid="sandbox-designer-canvas"
      className="absolute inset-0"
      role="img"
      aria-label="Vue 3D de la cuisine en cours de conception"
    />
  );
}

export default SandboxCanvas;
