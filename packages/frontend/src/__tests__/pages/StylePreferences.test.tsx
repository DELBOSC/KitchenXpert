/**
 * StylePreferences Tests
 * Tests for the questionnaire style preferences page - loading, rendering,
 * style selection, form submission, AI tips, validation, and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import StylePreferences from '../../pages/Questionnaire/StylePreferences/StylePreferences';

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

const renderStylePreferences = () => {
  return render(
    <BrowserRouter>
      <StylePreferences />
    </BrowserRouter>
  );
};

describe('StylePreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    // Default: API returns no existing data, so form uses defaults
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderStylePreferences();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have loading aria-label on spinner', () => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderStylePreferences();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('should render page heading', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /style preferences/i })).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText(/choose your design aesthetic/i)).toBeInTheDocument();
      });
    });

    it('should render progress indicator showing step 3 of 4', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument();
      });
    });

    it('should render progressbar with aria attributes', async () => {
      renderStylePreferences();

      await waitFor(() => {
        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '3');
        expect(progressbar).toHaveAttribute('aria-valuemax', '4');
      });
    });

    it('should render all 8 style options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      expect(screen.getByText('Traditional')).toBeInTheDocument();
      expect(screen.getByText('Contemporary')).toBeInTheDocument();
      expect(screen.getByText('Transitional')).toBeInTheDocument();
      expect(screen.getByText('Farmhouse')).toBeInTheDocument();
      expect(screen.getByText('Industrial')).toBeInTheDocument();
      expect(screen.getByText('Scandinavian')).toBeInTheDocument();
      expect(screen.getByText('Mediterranean')).toBeInTheDocument();
    });

    it('should render all 6 color scheme options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('Neutral')).toBeInTheDocument();
      });

      expect(screen.getByText('Warm')).toBeInTheDocument();
      expect(screen.getByText('Cool')).toBeInTheDocument();
      expect(screen.getByText('Monochrome')).toBeInTheDocument();
      expect(screen.getByText('Earth Tones')).toBeInTheDocument();
      expect(screen.getByText('Bold')).toBeInTheDocument();
    });

    it('should render cabinet finish options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('High Gloss White')).toBeInTheDocument();
      });

      expect(screen.getByText('Matte Gray')).toBeInTheDocument();
      expect(screen.getByText('Natural Oak')).toBeInTheDocument();
    });

    it('should render countertop material options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('Granite')).toBeInTheDocument();
      });

      expect(screen.getByText('Quartz')).toBeInTheDocument();
      expect(screen.getByText('Marble')).toBeInTheDocument();
    });

    it('should render backsplash style options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('Subway Tile')).toBeInTheDocument();
      });

      expect(screen.getByText('Mosaic')).toBeInTheDocument();
      expect(screen.getByText('Herringbone')).toBeInTheDocument();
    });

    it('should render flooring type options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('Hardwood')).toBeInTheDocument();
      });

      expect(screen.getByText('Tile')).toBeInTheDocument();
      expect(screen.getByText('Vinyl Plank')).toBeInTheDocument();
    });

    it('should render hardware style options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('Bar Pulls')).toBeInTheDocument();
      });

      expect(screen.getByText('Knobs')).toBeInTheDocument();
      expect(screen.getByText('Brushed Nickel')).toBeInTheDocument();
    });

    it('should render lighting preference options', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText('Recessed Lighting')).toBeInTheDocument();
      });

      expect(screen.getByText('Pendant Lights')).toBeInTheDocument();
      expect(screen.getByText('Under Cabinet')).toBeInTheDocument();
    });

    it('should render additional notes textarea', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/exigences de design/i)).toBeInTheDocument();
      });
    });

    it('should render character counter for notes (0/500)', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByText(/0\/500/)).toBeInTheDocument();
      });
    });

    it('should render back link to spatial page', async () => {
      renderStylePreferences();

      await waitFor(() => {
        const backLink = screen.getByRole('link', { name: /back/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/questionnaire/spatial');
      });
    });

    it('should render continue submit button', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });
    });
  });

  describe('Style Selection', () => {
    it('should mark style as selected when clicked', async () => {
      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      const modernButton = screen.getByText('Modern').closest('button')!;
      await user.click(modernButton);

      expect(modernButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should mark color scheme as selected when clicked', async () => {
      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Warm')).toBeInTheDocument();
      });

      const warmButton = screen.getByText('Warm').closest('button')!;
      await user.click(warmButton);

      expect(warmButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should mark cabinet finish as selected when clicked', async () => {
      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Natural Oak')).toBeInTheDocument();
      });

      const oakButton = screen.getByText('Natural Oak').closest('button')!;
      await user.click(oakButton);

      expect(oakButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Form Validation', () => {
    it('should show error when no primary style is selected and form is submitted', async () => {
      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should not call fetch POST when validation fails', async () => {
      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Only the initial GET fetch, no POST
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with POST method when a style is selected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      // AI tips call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { tips: [], warnings: [], suggestions: [] } }),
      });

      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Modern').closest('button')!);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        const postCall = mockFetch.mock.calls.find(
          (call: unknown[]) => (call[1] as RequestInit)?.method === 'POST'
        );
        expect(postCall).toBeDefined();
        expect(postCall![0]).toBe('/api/v1/questionnaire/style-preferences');
      });
    });

    it('should navigate to budget page on successful save', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { tips: [], warnings: [], suggestions: [] } }),
      });

      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Modern').closest('button')!);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/questionnaire/budget');
      });
    });

    it('should show error alert when save fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Modern').closest('button')!);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should disable submit button while saving', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000))
      );

      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Modern').closest('button')!);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        const savingButton = screen.getByRole('button', { name: /enregistrement/i });
        expect(savingButton).toBeDisabled();
      });
    });

    it('should show saving text on submit button while saving', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000))
      );

      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Modern').closest('button')!);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/enregistrement/i)).toBeInTheDocument();
      });
    });

    it('should have aria-busy on submit button while saving', async () => {
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 1000))
      );

      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Modern').closest('button')!);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        const savingBtn = screen.getByRole('button', { name: /enregistrement/i });
        expect(savingBtn).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('Additional Notes', () => {
    it('should update character counter when typing notes', async () => {
      renderStylePreferences();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/exigences de design/i)).toBeInTheDocument();
      });

      await user.type(screen.getByPlaceholderText(/exigences de design/i), 'Hello');

      expect(screen.getByText(/5\/500/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy (h1, h2s)', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it('should have a form element', async () => {
      renderStylePreferences();

      await waitFor(() => {
        expect(document.querySelector('form')).toBeInTheDocument();
      });
    });

    it('should have aria-pressed attributes on style buttons', async () => {
      renderStylePreferences();

      await waitFor(() => {
        const modernButton = screen.getByText('Modern').closest('button')!;
        expect(modernButton).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });
});
