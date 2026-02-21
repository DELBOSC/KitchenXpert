/**
 * VRViewer Tests
 * Tests for the VR/3D kitchen viewer page - loading, error states, toolbar,
 * settings panel, help panel, view mode buttons, fullscreen, accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import VRViewer from '../../pages/VirtualReality/VRViewer/VRViewer';

// Mock logger
vi.mock('../../../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Also mock with relative path from component
vi.mock('../../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Three.js entirely for jsdom
vi.mock('three', () => {
  const mockMesh = {
    position: { set: vi.fn() },
    rotation: { x: 0 },
    receiveShadow: false,
    castShadow: false,
    userData: {},
  };
  return {
    default: {},
    Scene: vi.fn(() => ({
      background: null,
      add: vi.fn(),
      traverse: vi.fn(),
    })),
    PerspectiveCamera: vi.fn(() => ({
      position: { set: vi.fn() },
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    })),
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      shadowMap: { enabled: false },
      xr: { enabled: false, setSession: vi.fn(), setReferenceSpaceType: vi.fn() },
      domElement: { toDataURL: vi.fn(() => 'data:image/png;base64,mock') },
    })),
    PlaneGeometry: vi.fn(),
    BoxGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    Mesh: vi.fn(() => ({ ...mockMesh })),
    AmbientLight: vi.fn(),
    DirectionalLight: vi.fn(() => ({ position: { set: vi.fn() }, castShadow: false })),
    HemisphereLight: vi.fn(),
    GridHelper: vi.fn(() => ({ position: { y: 0 } })),
    Color: vi.fn(),
    Object3D: vi.fn(),
    Vector3: vi.fn(),
  };
});

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

const mockFetch = vi.fn();

const mockVRScene = {
  id: 'scene-1',
  name: 'Test Kitchen VR',
  type: 'kitchen' as const,
  modelUrl: null,
  thumbnailUrl: null,
};

const renderVRViewer = () => {
  return render(
    <BrowserRouter>
      <VRViewer />
    </BrowserRouter>
  );
};

describe('VRViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    global.fetch = mockFetch;

    // Default: scene loads successfully
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockVRScene),
    });

    // Mock navigator.xr
    Object.defineProperty(navigator, 'xr', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderVRViewer();

      expect(screen.getByText(/loading vr experience/i)).toBeInTheDocument();
    });

    it('should show spinning animation during loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderVRViewer();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should have dark background during loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderVRViewer();

      expect(document.querySelector('.bg-gray-900')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByText(/unable to load vr scene/i)).toBeInTheDocument();
      });
    });

    it('should show specific 404 error message', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByText(/scene not found/i)).toBeInTheDocument();
      });
    });

    it('should render Go Back button in error state', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      });
    });

    it('should render Try Again button in error state', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should navigate back when Go Back is clicked', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /go back/i }));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should retry fetching when Try Again is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockVRScene) });

      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      // Should call fetch again (retryCount incremented)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Main UI', () => {
    it('should render scene name in the toolbar after loading', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });
    });

    it('should render back link', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByRole('link')).toBeInTheDocument();
      });
    });

    it('should link back to dashboard when no projectId', async () => {
      renderVRViewer();

      await waitFor(() => {
        const backLink = screen.getByRole('link');
        expect(backLink).toHaveAttribute('href', '/dashboard');
      });
    });

    it('should render canvas element', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(document.querySelector('canvas')).toBeInTheDocument();
      });
    });

    it('should render camera position info', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByText(/position:/i)).toBeInTheDocument();
        expect(screen.getByText(/rotation:/i)).toBeInTheDocument();
      });
    });

    it('should render VR/AR status bar at the bottom', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByText(/quality:/i)).toBeInTheDocument();
        expect(screen.getByText(/mode:/i)).toBeInTheDocument();
      });
    });

    it('should show VR Not Available by default in jsdom', async () => {
      renderVRViewer();

      await waitFor(() => {
        const vrStatus = screen.getAllByText(/not available/i);
        expect(vrStatus.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('View Mode Buttons', () => {
    it('should render 3D, VR, and AR view mode buttons', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '3D' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'VR' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'AR' })).toBeInTheDocument();
      });
    });

    it('should disable VR button when VR is not supported', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'VR' })).toBeDisabled();
      });
    });

    it('should disable AR button when AR is not supported', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'AR' })).toBeDisabled();
      });
    });
  });

  describe('Settings Panel', () => {
    it('should not show settings panel by default', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      expect(screen.queryByText(/display settings/i)).not.toBeInTheDocument();
    });

    it('should show settings panel when settings button is clicked', async () => {
      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Settings'));

      await waitFor(() => {
        expect(screen.getByText(/display settings/i)).toBeInTheDocument();
      });
    });

    it('should render quality dropdown in settings', async () => {
      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Settings'));

      await waitFor(() => {
        expect(screen.getByText(/quality/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue('high')).toBeInTheDocument();
      });
    });

    it('should render toggle options for shadows, anti-aliasing, etc.', async () => {
      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Settings'));

      await waitFor(() => {
        expect(screen.getByText('Show Measurements')).toBeInTheDocument();
        expect(screen.getByText('Show Labels')).toBeInTheDocument();
        expect(screen.getByText('Ambient Occlusion')).toBeInTheDocument();
        expect(screen.getByText('Shadows')).toBeInTheDocument();
        expect(screen.getByText('Anti-Aliasing')).toBeInTheDocument();
      });
    });

    it('should close settings panel when button is clicked again', async () => {
      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Settings'));
      await waitFor(() => {
        expect(screen.getByText(/display settings/i)).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Settings'));
      await waitFor(() => {
        expect(screen.queryByText(/display settings/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Help Panel', () => {
    it('should not show help panel by default', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      expect(screen.queryByText(/controls/i)).not.toBeInTheDocument();
    });

    it('should show help panel when help button is clicked', async () => {
      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Help'));

      await waitFor(() => {
        expect(screen.getByText(/controls/i)).toBeInTheDocument();
      });
    });

    it('should display keyboard control instructions', async () => {
      renderVRViewer();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Test Kitchen VR')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Help'));

      await waitFor(() => {
        expect(screen.getByText('W A S D')).toBeInTheDocument();
        expect(screen.getByText(/move camera/i)).toBeInTheDocument();
        expect(screen.getByText(/look around/i)).toBeInTheDocument();
        expect(screen.getByText(/zoom in\/out/i)).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    it('should render reset camera button', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByTitle('Reset Camera')).toBeInTheDocument();
      });
    });

    it('should render take screenshot button', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByTitle('Take Screenshot')).toBeInTheDocument();
      });
    });

    it('should render fullscreen toggle button', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByTitle('Toggle Fullscreen')).toBeInTheDocument();
      });
    });
  });

  describe('Search Params', () => {
    it('should pass kitchenId as query param when present', async () => {
      mockSearchParams = new URLSearchParams({ kitchenId: 'k-42' });
      renderVRViewer();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('kitchenId=k-42'),
          expect.any(Object)
        );
      });
    });

    it('should pass projectId as query param when present', async () => {
      mockSearchParams = new URLSearchParams({ projectId: 'proj-7' });
      renderVRViewer();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('projectId=proj-7'),
          expect.any(Object)
        );
      });
    });

    it('should pass generationId as query param when present', async () => {
      mockSearchParams = new URLSearchParams({ generationId: 'gen-9' });
      renderVRViewer();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('generationId=gen-9'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have a heading element for the scene name', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should have title attributes on action buttons', async () => {
      renderVRViewer();

      await waitFor(() => {
        expect(screen.getByTitle('Toggle Fullscreen')).toBeInTheDocument();
        expect(screen.getByTitle('Settings')).toBeInTheDocument();
        expect(screen.getByTitle('Help')).toBeInTheDocument();
        expect(screen.getByTitle('Reset Camera')).toBeInTheDocument();
        expect(screen.getByTitle('Take Screenshot')).toBeInTheDocument();
      });
    });
  });
});
