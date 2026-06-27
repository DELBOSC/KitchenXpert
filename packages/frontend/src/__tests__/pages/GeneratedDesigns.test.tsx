/**
 * GeneratedDesigns Tests
 * Tests for the AI-generated designs results page - loading, polling,
 * rendering designs, star ratings, save/BOM actions, detail modal,
 * error/failed/processing states, breadcrumb navigation, and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import GeneratedDesigns from '../../pages/AIGenerator/GeneratedDesigns/GeneratedDesigns';

// ---------- Router mock ----------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ generationId: 'gen-123' }),
  };
});

// ---------- i18n mock ----------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallbackOrOpts?: string | Record<string, unknown>,
      opts?: Record<string, unknown>
    ) => {
      if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
      if (fallbackOrOpts && typeof fallbackOrOpts === 'object' && 'defaultValue' in fallbackOrOpts)
        return fallbackOrOpts.defaultValue as string;
      return key;
    },
    i18n: { language: 'fr' },
  }),
}));

// ---------- Fetch mock ----------

const mockFetch = vi.fn();

// ---------- Mock data ----------

const mockDesign = {
  id: 'design-1',
  name: 'Modern Kitchen',
  description: 'A sleek modern kitchen design with clean lines.',
  thumbnailUrl: '/images/thumb-1.jpg',
  fullImageUrl: '/images/full-1.jpg',
  style: 'Modern',
  estimatedCost: { min: 8000, max: 15000, currency: 'EUR' },
  features: ['Island', 'Soft-close drawers', 'LED lighting'],
  materials: {
    cabinets: 'White lacquer',
    countertops: 'Quartz',
    backsplash: 'Glass tile',
    flooring: 'Oak hardwood',
  },
  layout: 'L-Shaped',
  score: 92,
  createdAt: '2025-03-15T10:00:00Z',
  isAIGenerated: true,
  materialRationale: 'Selected for durability and aesthetics.',
  layoutExplanation: 'L-shape maximizes counter space.',
  tradeoffs: 'Higher cost due to premium materials.',
  costBreakdown: {
    cabinets: { min: 3000, max: 5000 },
    countertops: { min: 2000, max: 4000 },
    appliances: { min: 1500, max: 3000 },
    installation: { min: 1500, max: 3000 },
    total: { min: 8000, max: 15000 },
  },
};

const mockDesign2 = {
  id: 'design-2',
  name: 'Farmhouse Kitchen',
  description: 'Rustic farmhouse charm with warm wood tones.',
  thumbnailUrl: '',
  fullImageUrl: '',
  style: 'Farmhouse',
  estimatedCost: { min: 6000, max: 10000, currency: 'EUR' },
  features: ['Pantry', 'Apron sink'],
  materials: {
    cabinets: 'Shaker-style oak',
    countertops: 'Butcher block',
    backsplash: 'Subway tile',
    flooring: 'Reclaimed wood',
  },
  layout: 'U-Shaped',
  score: 85,
  createdAt: '2025-03-15T10:00:00Z',
  isAIGenerated: false,
};

const mockCompletedResult = {
  data: {
    id: 'gen-123',
    status: 'completed',
    projectId: 'proj-456',
    designs: [mockDesign, mockDesign2],
    preferences: {
      kitchenStyle: 'modern',
      colorPalette: ['white', 'gray'],
      layoutPreference: 'l-shaped',
    },
    createdAt: '2025-03-15T09:00:00Z',
    completedAt: '2025-03-15T09:02:30Z',
    isAIGenerated: true,
  },
};

const mockPendingResult = {
  data: {
    id: 'gen-123',
    status: 'pending',
    projectId: 'proj-456',
    designs: [],
    preferences: {
      kitchenStyle: 'modern',
      colorPalette: ['white'],
      layoutPreference: 'open',
    },
    createdAt: '2025-03-15T09:00:00Z',
    isAIGenerated: true,
  },
};

const mockFailedResult = {
  data: {
    id: 'gen-123',
    status: 'failed',
    projectId: 'proj-456',
    designs: [],
    preferences: {
      kitchenStyle: 'modern',
      colorPalette: [],
      layoutPreference: 'galley',
    },
    createdAt: '2025-03-15T09:00:00Z',
    errorMessage: 'Generation engine timed out',
    isAIGenerated: true,
  },
};

const renderGeneratedDesigns = () => {
  return render(
    <MemoryRouter>
      <GeneratedDesigns />
    </MemoryRouter>
  );
};

describe('GeneratedDesigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  // ---------- Loading State ----------

  describe('Loading State', () => {
    it('should show loading spinner while fetching initial data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderGeneratedDesigns();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not render designs while loading', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderGeneratedDesigns();

      expect(screen.queryByText('Modern Kitchen')).not.toBeInTheDocument();
    });
  });

  // ---------- Completed State Rendering ----------

  describe('Completed State Rendering', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should render the page heading', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /generated designs/i })
        ).toBeInTheDocument();
      });
    });

    it('should render design count text', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(
          screen.getByText(/design\(s\) generated based on your preferences/i)
        ).toBeInTheDocument();
      });
    });

    it('should render IA badge when AI generated', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        const iaBadges = screen.getAllByText('IA');
        expect(iaBadges.length).toBeGreaterThan(0);
      });
    });

    it('should render Generate More button', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate more/i })).toBeInTheDocument();
      });
    });

    it('should render design names', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Modern Kitchen')).toBeInTheDocument();
        expect(screen.getByText('Farmhouse Kitchen')).toBeInTheDocument();
      });
    });

    it('should render design descriptions', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText(/a sleek modern kitchen design/i)).toBeInTheDocument();
        expect(screen.getByText(/rustic farmhouse charm/i)).toBeInTheDocument();
      });
    });

    it('should render design scores', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText(/Score.*92%/)).toBeInTheDocument();
        expect(screen.getByText(/Score.*85%/)).toBeInTheDocument();
      });
    });

    it('should render style badges', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
        expect(screen.getByText('Farmhouse')).toBeInTheDocument();
      });
    });

    it('should render layout badges', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('L-Shaped')).toBeInTheDocument();
        expect(screen.getByText('U-Shaped')).toBeInTheDocument();
      });
    });

    it('should render estimated cost for each design', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        const estCostElements = screen.getAllByText(/Est\. Cost/);
        expect(estCostElements.length).toBe(2);
      });
    });

    it('should render View Details buttons for each design', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: /view details/i });
        expect(viewButtons).toHaveLength(2);
      });
    });

    it('should render Save Design buttons for each design', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        const saveButtons = screen.getAllByRole('button', { name: /save design/i });
        expect(saveButtons).toHaveLength(2);
      });
    });

    it('should render Generate Bill of Materials buttons', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        const bomButtons = screen.getAllByRole('button', { name: /generate bill of materials/i });
        expect(bomButtons).toHaveLength(2);
      });
    });

    it('should render design image when thumbnailUrl is provided', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
        expect(images[0]).toHaveAttribute('src', '/images/thumb-1.jpg');
      });
    });

    it('should render placeholder when thumbnailUrl is empty', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        // The second design has no thumbnail, so a placeholder SVG is rendered (no img)
        const allImages = screen.getAllByRole('img');
        // Only the first design has an actual img tag
        expect(allImages).toHaveLength(1);
      });
    });
  });

  // ---------- Breadcrumb Navigation ----------

  describe('Breadcrumb Navigation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should render Dashboard breadcrumb link', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should render AI Generator breadcrumb link', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('AI Generator')).toBeInTheDocument();
      });
    });

    it('should render Results breadcrumb text', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Results')).toBeInTheDocument();
      });
    });
  });

  // ---------- Quick Actions ----------

  describe('Quick Actions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should render Compare Designs link', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Compare Designs')).toBeInTheDocument();
      });
    });

    it('should render View in VR link when projectId exists', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('View in VR')).toBeInTheDocument();
      });
    });
  });

  // ---------- Star Rating ----------

  describe('Star Rating', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should render star rating buttons for each design', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        // 5 stars per design x 2 designs = 10 star buttons in the grid
        const starButtons = screen.getAllByLabelText(/rate \d star/i);
        expect(starButtons.length).toBe(10);
      });
    });

    it('should call fetch when a star is clicked', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByLabelText(/rate 4 star/i).length).toBeGreaterThan(0);
      });

      // Mock the rating POST response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await user.click(screen.getAllByLabelText(/rate 4 star/i)[0]);

      await waitFor(() => {
        const ratingCall = mockFetch.mock.calls.find(
          (call: unknown[]) =>
            typeof call[0] === 'string' && (call[0] as string).includes('design-ratings')
        );
        expect(ratingCall).toBeDefined();
      });
    });
  });

  // ---------- Cost Breakdown ----------

  describe('Cost Breakdown', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should render cost breakdown section when costBreakdown exists', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Ventilation des couts')).toBeInTheDocument();
      });
    });

    it('should render cost category labels', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Caissons')).toBeInTheDocument();
        expect(screen.getByText('Plans de travail')).toBeInTheDocument();
        expect(screen.getByText('Electromenager')).toBeInTheDocument();
        expect(screen.getByText('Installation')).toBeInTheDocument();
      });
    });
  });

  // ---------- Design Explanation (Expandable) ----------

  describe('Design Explanation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should render "Pourquoi ce design ?" button when explanation exists', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getAllByText('Pourquoi ce design ?')[0]).toBeInTheDocument();
      });
    });

    it('should expand explanation when button is clicked', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText('Pourquoi ce design ?')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Pourquoi ce design ?')[0]);

      await waitFor(() => {
        expect(screen.getByText(/selected for durability and aesthetics/i)).toBeInTheDocument();
        expect(screen.getByText(/l-shape maximizes counter space/i)).toBeInTheDocument();
        expect(screen.getByText(/higher cost due to premium materials/i)).toBeInTheDocument();
      });
    });

    it('should collapse explanation when button is clicked again', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText('Pourquoi ce design ?')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Pourquoi ce design ?')[0]);

      await waitFor(() => {
        expect(screen.getByText(/selected for durability/i)).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Pourquoi ce design ?')[0]);

      await waitFor(() => {
        expect(screen.queryByText(/selected for durability/i)).not.toBeInTheDocument();
      });
    });
  });

  // ---------- Detail Modal ----------

  describe('Detail Modal', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should open detail modal when View Details is clicked', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(2);
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should display design name in the modal', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(2);
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        // The modal heading also shows the design name
        const headings = screen.getAllByText('Modern Kitchen');
        expect(headings.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should display materials section in the modal', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(2);
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        expect(screen.getByText('Materials')).toBeInTheDocument();
        expect(screen.getByText('White lacquer')).toBeInTheDocument();
        expect(screen.getByText('Quartz')).toBeInTheDocument();
      });
    });

    it('should display features section in the modal', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(2);
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        expect(screen.getByText('Features')).toBeInTheDocument();
        expect(screen.getByText('Island')).toBeInTheDocument();
        expect(screen.getByText('Soft-close drawers')).toBeInTheDocument();
        expect(screen.getByText('LED lighting')).toBeInTheDocument();
      });
    });

    it('should close modal when Close button is clicked', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(2);
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^close$/i }));

      await waitFor(() => {
        // Only the BOM modal uses a different pattern; the design detail dialog should be gone
        expect(screen.queryByText('Materials')).not.toBeInTheDocument();
      });
    });

    it('should have aria-modal="true" on the detail dialog', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(2);
      });

      await user.click(screen.getAllByRole('button', { name: /view details/i })[0]);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });
  });

  // ---------- Save Design ----------

  describe('Save Design', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should call save API when Save Design is clicked', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /save design/i })).toHaveLength(2);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { projectId: 'proj-456', kitchenId: 'kitchen-789' } }),
      });

      await user.click(screen.getAllByRole('button', { name: /save design/i })[0]);

      await waitFor(() => {
        const saveCall = mockFetch.mock.calls.find(
          (call: unknown[]) =>
            typeof call[0] === 'string' && (call[0] as string).includes('save-design')
        );
        expect(saveCall).toBeDefined();
      });
    });

    it('should navigate after successful save', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /save design/i })).toHaveLength(2);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { projectId: 'proj-456', kitchenId: 'kitchen-789' } }),
      });

      await user.click(screen.getAllByRole('button', { name: /save design/i })[0]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-456/kitchens/kitchen-789');
      });
    });
  });

  // ---------- Generate More Navigation ----------

  describe('Generate More Navigation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should navigate to /ai-generator when Generate More is clicked', async () => {
      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate more/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate more/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/ai-generator');
    });
  });

  // ---------- Error State ----------

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch generation results')).toBeInTheDocument();
      });
    });

    it('should display 404 error for not-found generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Generation result not found')).toBeInTheDocument();
      });
    });

    it('should render Try Again button on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should render New Generation button on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new generation/i })).toBeInTheDocument();
      });
    });

    it('should retry fetch when Try Again is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      // Set up a successful response for the retry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Modern Kitchen')).toBeInTheDocument();
      });
    });

    it('should navigate to /ai-generator when New Generation is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new generation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /new generation/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/ai-generator');
    });
  });

  // ---------- Pending / Processing State ----------

  describe('Processing State', () => {
    it('should show generating message for pending status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingResult),
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Generating Your Designs')).toBeInTheDocument();
      });
    });

    it('should show status text for pending result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingResult),
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText(/Queued/)).toBeInTheDocument();
      });
    });

    it('should show description text during generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingResult),
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(
          screen.getByText(/our ai is crafting personalized kitchen designs/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ---------- Failed Generation State ----------

  describe('Failed Generation State', () => {
    it('should display Generation Failed heading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFailedResult),
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      });
    });

    it('should display the error message from the result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFailedResult),
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByText('Generation engine timed out')).toBeInTheDocument();
      });
    });

    it('should render Try Again button for failed generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFailedResult),
      });

      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should navigate to /ai-generator on Try Again click from failed state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFailedResult),
      });

      renderGeneratedDesigns();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/ai-generator');
    });
  });

  // ---------- Accessibility ----------

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCompletedResult),
      });
    });

    it('should have proper heading hierarchy', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should have navigation element for breadcrumbs', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });

    it('should have aria-label on star rating buttons', async () => {
      renderGeneratedDesigns();

      await waitFor(() => {
        // Star rating buttons appear once per generated design — use
        // getAllByLabelText to tolerate multiple matches.
        expect(screen.getAllByLabelText('Rate 1 star').length).toBeGreaterThan(0);
        expect(screen.getAllByLabelText('Rate 5 stars').length).toBeGreaterThan(0);
      });
    });
  });
});
