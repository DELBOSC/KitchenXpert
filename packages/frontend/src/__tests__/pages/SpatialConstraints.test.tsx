/**
 * SpatialConstraints Tests
 * Tests for the questionnaire spatial constraints page - loading, rendering,
 * dimension inputs, layout selection, validation, form submission, and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import SpatialConstraints from '../../pages/Questionnaire/SpatialConstraints/SpatialConstraints';

// Mock logger
vi.mock('../../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockFetch = vi.fn();

const renderSpatialConstraints = () => {
  return render(
    <BrowserRouter>
      <SpatialConstraints />
    </BrowserRouter>
  );
};

describe('SpatialConstraints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    // Default: API returns no existing data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderSpatialConstraints();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should hide loading spinner once data is loaded', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('should render page heading', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /room dimensions/i })).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText(/enter your kitchen room dimensions/i)).toBeInTheDocument();
      });
    });

    it('should render progress indicator showing step 2 of 4', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
      });
    });

    it('should render progressbar with correct aria attributes', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '2');
        expect(progressbar).toHaveAttribute('aria-valuemax', '4');
      });
    });

    it('should render unit selection with meters and feet', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText('Meters (m)')).toBeInTheDocument();
        expect(screen.getByText('Feet (ft)')).toBeInTheDocument();
      });
    });

    it('should render width, length, and ceiling height inputs', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/length/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ceiling height/i)).toBeInTheDocument();
      });
    });

    it('should render all 6 layout options', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText('Galley')).toBeInTheDocument();
      });

      expect(screen.getByText('L-Shaped')).toBeInTheDocument();
      expect(screen.getByText('U-Shaped')).toBeInTheDocument();
      expect(screen.getByText('Island')).toBeInTheDocument();
      expect(screen.getByText('Peninsula')).toBeInTheDocument();
      expect(screen.getByText('Open Plan')).toBeInTheDocument();
    });

    it('should render window checkbox', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText(/kitchen has window/i)).toBeInTheDocument();
      });
    });

    it('should render window direction select when hasWindow is true', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        // Default hasWindow is true
        expect(screen.getByLabelText(/window direction/i)).toBeInTheDocument();
      });
    });

    it('should render door count select', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/number of doors/i)).toBeInTheDocument();
      });
    });

    it('should render plumbing location select', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/plumbing location/i)).toBeInTheDocument();
      });
    });

    it('should render electrical panel checkbox', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText(/electrical panel in kitchen/i)).toBeInTheDocument();
      });
    });

    it('should render gas line checkbox', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText(/gas line available/i)).toBeInTheDocument();
      });
    });

    it('should render existing feature options', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText('Load-Bearing Wall')).toBeInTheDocument();
      });

      expect(screen.getByText('Structural Column')).toBeInTheDocument();
      expect(screen.getByText('Floor Drain')).toBeInTheDocument();
      expect(screen.getByText('Skylight')).toBeInTheDocument();
      expect(screen.getByText('Built-in Pantry')).toBeInTheDocument();
    });

    it('should render back link to questionnaire page', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/questionnaire');
      });
    });

    it('should render continue submit button', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should display area calculation when width and length are entered', async () => {
      renderSpatialConstraints();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      const widthInput = screen.getByLabelText(/width/i);
      const lengthInput = screen.getByLabelText(/length/i);

      fireEvent.change(widthInput, { target: { value: '4' } });
      fireEvent.change(lengthInput, { target: { value: '5' } });

      await waitFor(() => {
        expect(screen.getByText(/total floor area/i)).toBeInTheDocument();
        expect(screen.getByText(/20.0/)).toBeInTheDocument();
      });
    });

    it('should hide window direction select when hasWindow is unchecked', async () => {
      renderSpatialConstraints();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText(/kitchen has window/i)).toBeInTheDocument();
      });

      // The checkbox is inside the label text
      const windowCheckbox = screen.getByText(/kitchen has window/i).closest('label')!.querySelector('input[type="checkbox"]')!;
      fireEvent.click(windowCheckbox);

      await waitFor(() => {
        expect(screen.queryByLabelText(/window direction/i)).not.toBeInTheDocument();
      });
    });

    it('should toggle existing features when clicked', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByText('Skylight')).toBeInTheDocument();
      });

      const skylightLabel = screen.getByText('Skylight').closest('label')!;
      fireEvent.click(skylightLabel);

      // After clicking, border should change to indicate selected state
      await waitFor(() => {
        expect(skylightLabel.className).toContain('border-blue-500');
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when width is below minimum (meters)', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      const widthInput = screen.getByLabelText(/width/i);
      const lengthInput = screen.getByLabelText(/length/i);
      const heightInput = screen.getByLabelText(/ceiling height/i);

      // Set valid length and height, but invalid width
      fireEvent.change(widthInput, { target: { value: '0.5' } });
      fireEvent.change(lengthInput, { target: { value: '5' } });
      fireEvent.change(heightInput, { target: { value: '2.7' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText(/width must be between/i)).toBeInTheDocument();
      });
    });

    it('should show error when length is below minimum (meters)', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/length/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '0.5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '2.7' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText(/length must be between/i)).toBeInTheDocument();
      });
    });

    it('should show error when ceiling height is below minimum (meters)', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/ceiling height/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '1' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText(/height must be between/i)).toBeInTheDocument();
      });
    });

    it('should not submit form when validation fails', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      // Submit with zero width (default)
      fireEvent.submit(document.querySelector('form')!);

      // Only initial GET fetch, no POST
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear error when user changes value in errored field', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      // Trigger validation error
      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '0.5' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '2.7' } });
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText(/width must be between/i)).toBeInTheDocument();
      });

      // Fix the value
      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });

      expect(screen.queryByText(/width must be between/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should submit form with POST when validation passes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      // AI tips call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { tips: [], warnings: [], suggestions: [] } }),
      });

      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '2.7' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        const postCall = mockFetch.mock.calls.find(
          (call: unknown[]) => (call[1] as RequestInit)?.method === 'POST'
        );
        expect(postCall).toBeDefined();
        expect(postCall![0]).toBe('/api/v1/questionnaire/spatial-constraints');
      });
    });

    it('should navigate to style page on successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { tips: [], warnings: [], suggestions: [] } }),
      });

      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '2.7' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/questionnaire/style');
      });
    });

    it('should show error alert when save fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '2.7' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to save spatial constraints/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while saving', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000))
      );

      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '2.7' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        const savingBtn = screen.getByRole('button', { name: /enregistrement/i });
        expect(savingBtn).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should have a form element', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(document.querySelector('form')).toBeInTheDocument();
      });
    });

    it('should mark dimension fields as required', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toHaveAttribute('aria-required', 'true');
        expect(screen.getByLabelText(/length/i)).toHaveAttribute('aria-required', 'true');
        expect(screen.getByLabelText(/ceiling height/i)).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should set aria-invalid on errored fields', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      // Submit with invalid values
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have role=alert on validation error messages', async () => {
      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    it('should have aria-busy on submit button while saving', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000))
      );

      renderSpatialConstraints();

      await waitFor(() => {
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '4' } });
      fireEvent.change(screen.getByLabelText(/length/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/ceiling height/i), { target: { value: '2.7' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        const savingBtn = screen.getByRole('button', { name: /enregistrement/i });
        expect(savingBtn).toHaveAttribute('aria-busy', 'true');
      });
    });
  });
});
