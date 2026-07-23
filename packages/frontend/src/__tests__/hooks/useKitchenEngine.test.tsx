/**
 * Proof for the deterministic-init fix.
 *
 * IMPORTANT: this test does NOT mock useKitchenEngine — it exercises the REAL hook's
 * attachment logic. Only the WebGL-heavy KitchenEngine is mocked (jsdom has no WebGL).
 * Mocking the hook itself is exactly what the page test does, which is why that test
 * passed on the broken code. Here we drive the actual callback-ref/attachment path.
 *
 * The bug: the old useEffect([canvasRef]) read canvasRef.current once. When the canvas
 * mounted AFTER first render (loading branch → designer branch), the ref was null on
 * that single pass and the effect never re-ran → isReady stuck false forever.
 * The fix keys init on the container node attaching (state-backed callback ref).
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useKitchenEngine } from '../../hooks/useKitchenEngine';

// Toggles the mocked engine's async init outcome.
let initBehavior: 'resolve' | 'reject' = 'resolve';

vi.mock('@kitchenxpert/3d-engine', () => {
  class KitchenEngine {
    scene = {
      getThreeScene: () => ({ traverse: () => {}, add: () => {}, remove: () => {} }),
      getAllObjects: () => [],
      getObject: () => null,
    };
    selection = {
      onSelectionChanged: vi.fn(),
      getSelection: () => [],
      clearSelection: vi.fn(),
      selectAtPoint: vi.fn(),
    };
    controls = {
      onTransform: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
      isDragging: () => false,
      setMode: vi.fn(),
      getTransformStart: () => ({}),
    };
    history = {
      onChangeCallback: vi.fn(),
      canUndo: false,
      canRedo: false,
      execute: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
    };
    dimensionLabels = { showObjectDimensions: vi.fn(), clear: vi.fn(), setVisible: vi.fn() };
    worktopGenerator = { updateWorktops: vi.fn() };
    accessoriesGenerator = { update: vi.fn() };
    collisionSystem = { addCollisionObject: vi.fn(), removeCollisionObject: vi.fn() };
    measurementTool = { isActive: () => false, handleClick: vi.fn(), handleMouseMove: vi.fn() };
    walkthroughCamera = { isActive: () => false };
    renderer = { resize: vi.fn() };
    camera = { updateAspect: vi.fn(), getThreeCamera: () => ({}) };
    brandProfile = { base: { totalHeight: 800 }, wall: { bottomY: 1400 } };
    initializeControls = vi.fn(() =>
      initBehavior === 'resolve' ? Promise.resolve() : Promise.reject(new Error('boom'))
    );
    start = vi.fn();
    dispose = vi.fn();
  }
  const Cmd = class {};
  return {
    KitchenEngine,
    ModelLoader: class {
      createProceduralFallback() {
        return {};
      }
    },
    LightingPresets: { apply: vi.fn() },
    mmToM: (n: number) => n / 1000,
    MoveObjectCommand: Cmd,
    RotateObjectCommand: Cmd,
    ScaleObjectCommand: Cmd,
    AddObjectCommand: Cmd,
    RemoveObjectCommand: Cmd,
    BatchCommand: Cmd,
  };
});

function Harness({ attach }: { attach: boolean }) {
  const { setContainer, isReady, initError } = useKitchenEngine({});
  return (
    <div>
      <span data-testid="ready">{isReady ? 'ready' : 'not-ready'}</span>
      <span data-testid="error">{initError ?? 'none'}</span>
      {attach ? <div ref={setContainer} data-testid="canvas" /> : null}
    </div>
  );
}

describe('useKitchenEngine — init is keyed on DOM attachment, not an effect flush', () => {
  beforeEach(() => {
    initBehavior = 'resolve';
  });

  it('🔒 inits when the canvas attaches AFTER first render (container null on first pass)', async () => {
    // First render WITHOUT the canvas node — the exact loading-branch case that broke the
    // old useEffect([canvasRef]) (ran once with null, deps stable, never re-ran).
    const { rerender } = render(<Harness attach={false} />);
    expect(screen.getByTestId('ready').textContent).toBe('not-ready');

    // Canvas attaches now (loading → designer branch). The callback ref must fire init.
    rerender(<Harness attach={true} />);
    await waitFor(() => expect(screen.getByTestId('ready').textContent).toBe('ready'));
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('🔒 surfaces initError (no eternal silent spinner) when init fails', async () => {
    initBehavior = 'reject';
    render(<Harness attach={true} />);
    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('failed'));
    // Not ready, but not spinning silently — the page shows the error overlay + Retry.
    expect(screen.getByTestId('ready').textContent).toBe('not-ready');
  });
});
