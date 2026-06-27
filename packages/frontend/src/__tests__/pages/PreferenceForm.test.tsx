/**
 * PreferenceForm (AI Generator) Tests
 * Tests for the AI kitchen generator preference form page - loading,
 * rendering form sections, style/color/layout selection, checkboxes,
 * validation, submission, questionnaire banner, dark mode, and accessibility
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import PreferenceForm from '../../pages/AIGenerator/PreferenceForm/PreferenceForm';

// ---------- Router mock ----------

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('projectId=proj-123')],
  };
});

// ---------- i18n mock ----------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: string | Record<string, unknown>) => {
      if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
      if (fallbackOrOpts && typeof fallbackOrOpts === 'object' && 'defaultValue' in fallbackOrOpts)
        return fallbackOrOpts.defaultValue as string;
      return key;
    },
    i18n: { language: 'fr' },
  }),
}));

// ---------- Logger mock ----------

vi.mock('../../../services/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------- Fetch mock ----------

const mockFetch = vi.fn();

const renderPreferenceForm = () => {
  return render(
    <MemoryRouter>
      <PreferenceForm />
    </MemoryRouter>
  );
};

describe('PreferenceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;

    // Default: preferences fetch returns 404 (no existing prefs), questionnaire returns ok
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/preferences/')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (typeof url === 'string' && url.includes('/questionnaire/progress')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { completedSections: ['style'] } }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  // ---------- Loading State ----------

  describe('Loading State', () => {
    it('should show loading spinner while fetching initial data', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderPreferenceForm();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should have role="status" on the loading spinner', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderPreferenceForm();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label on the loading spinner', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      renderPreferenceForm();

      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    });
  });

  // ---------- Page Rendering ----------

  describe('Page Rendering', () => {
    it('should render the page heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /ai kitchen generator/i })
        ).toBeInTheDocument();
      });
    });

    it('should render the page description', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(
          screen.getByText(
            /configure your preferences and let our ai create stunning kitchen designs/i
          )
        ).toBeInTheDocument();
      });
    });

    it('should render Dashboard breadcrumb link', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
      });
    });

    it('should render AI Kitchen Generator breadcrumb text', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const breadcrumbTexts = screen.getAllByText('AI Kitchen Generator');
        expect(breadcrumbTexts.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // ---------- Questionnaire Banner ----------

  describe('Questionnaire Banner', () => {
    it('should show questionnaire-used banner when questionnaire exists', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(
          screen.getByText(/vos reponses au questionnaire seront utilisees/i)
        ).toBeInTheDocument();
      });
    });

    it('should show complete-questionnaire banner when no questionnaire data exists', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/preferences/')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (typeof url === 'string' && url.includes('/questionnaire/progress')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { completedSections: [] } }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      renderPreferenceForm();

      await waitFor(() => {
        expect(
          screen.getByText(/completez le questionnaire pour des designs plus personnalises/i)
        ).toBeInTheDocument();
      });
    });

    it('should render link to start questionnaire when no questionnaire data', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('/preferences/')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (typeof url === 'string' && url.includes('/questionnaire/progress')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { completedSections: [] } }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Commencer le questionnaire')).toBeInTheDocument();
      });
    });
  });

  // ---------- Kitchen Style Section ----------

  describe('Kitchen Style Section', () => {
    it('should render kitchen style section heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Style de cuisine')).toBeInTheDocument();
      });
    });

    it('should render all 6 style options', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Modern')).toBeInTheDocument();
        expect(screen.getByText('Traditional')).toBeInTheDocument();
        expect(screen.getByText('Transitional')).toBeInTheDocument();
        expect(screen.getByText('Farmhouse')).toBeInTheDocument();
        expect(screen.getByText('Industrial')).toBeInTheDocument();
        expect(screen.getByText('Scandinavian')).toBeInTheDocument();
      });
    });

    it('should have Modern selected by default (aria-pressed)', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const modernBtn = screen.getByText('Modern').closest('button');
        expect(modernBtn).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should change selection when a different style is clicked', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Industrial')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Industrial').closest('button')!);

      await waitFor(() => {
        const industrialBtn = screen.getByText('Industrial').closest('button');
        expect(industrialBtn).toHaveAttribute('aria-pressed', 'true');

        const modernBtn = screen.getByText('Modern').closest('button');
        expect(modernBtn).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });

  // ---------- Color Palette Section ----------

  describe('Color Palette Section', () => {
    it('should render color palette heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Palette de couleurs')).toBeInTheDocument();
      });
    });

    it('should render max-4-colors instruction', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText(/selectionnez jusqu'a 4 couleurs/i)).toBeInTheDocument();
      });
    });

    it('should render all 8 color buttons with aria-labels', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByLabelText('White')).toBeInTheDocument();
        expect(screen.getByLabelText('Gray')).toBeInTheDocument();
        expect(screen.getByLabelText('Black')).toBeInTheDocument();
        expect(screen.getByLabelText('Navy')).toBeInTheDocument();
        expect(screen.getByLabelText('Sage')).toBeInTheDocument();
        expect(screen.getByLabelText('Terracotta')).toBeInTheDocument();
        expect(screen.getByLabelText('Natural Wood')).toBeInTheDocument();
        expect(screen.getByLabelText('Cream')).toBeInTheDocument();
      });
    });

    it('should toggle color selection on click', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText('White')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('White'));

      await waitFor(() => {
        expect(screen.getByLabelText('White')).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should show selected color names after selecting', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText('Navy')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Navy'));

      await waitFor(() => {
        // "Selection :" label + the color chip both contain "selection".
        expect(screen.getAllByText(/selection/i).length).toBeGreaterThan(0);
      });
    });
  });

  // ---------- Layout Preference Section ----------

  describe('Layout Preference Section', () => {
    it('should render layout preference heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Disposition preferee')).toBeInTheDocument();
      });
    });

    it('should render all 4 layout options', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Galley')).toBeInTheDocument();
        expect(screen.getByText('L-Shaped')).toBeInTheDocument();
        expect(screen.getByText('U-Shaped')).toBeInTheDocument();
        expect(screen.getByText('Open Plan')).toBeInTheDocument();
      });
    });

    it('should have Open Plan selected by default', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const openBtn = screen.getByText('Open Plan').closest('button');
        expect(openBtn).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should change layout selection on click', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Galley')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Galley').closest('button')!);

      await waitFor(() => {
        expect(screen.getByText('Galley').closest('button')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        expect(screen.getByText('Open Plan').closest('button')).toHaveAttribute(
          'aria-pressed',
          'false'
        );
      });
    });
  });

  // ---------- Additional Options Section ----------

  describe('Additional Options Section', () => {
    it('should render additional options heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Options supplementaires')).toBeInTheDocument();
      });
    });

    it('should render appliance grade select', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/gamme d'appareils/i)).toBeInTheDocument();
      });
    });

    it('should render storage emphasis select', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/accent sur le rangement/i)).toBeInTheDocument();
      });
    });

    it('should render lighting mood select', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/ambiance lumineuse/i)).toBeInTheDocument();
      });
    });

    it('should render number of designs select', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/nombre de designs/i)).toBeInTheDocument();
      });
    });
  });

  // ---------- Features Checkboxes Section ----------

  describe('Features Checkboxes Section', () => {
    it('should render features section heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Fonctionnalites a inclure')).toBeInTheDocument();
      });
    });

    it('should render all 5 feature options', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Ilot central')).toBeInTheDocument();
        expect(screen.getByText('Coin petit-dejeuner')).toBeInTheDocument();
        expect(screen.getByText('Cellier')).toBeInTheDocument();
        expect(screen.getByText('Eco-responsable')).toBeInTheDocument();
        expect(screen.getByText('Maison connectee')).toBeInTheDocument();
      });
    });

    it('should have Island and Pantry checked by default', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        // The Island label should have a checked visual indicator (blue bg)
        const islandLabel = screen.getByText('Ilot central').closest('label');
        expect(islandLabel?.className).toContain('border-blue-500');

        const pantryLabel = screen.getByText('Cellier').closest('label');
        expect(pantryLabel?.className).toContain('border-blue-500');
      });
    });

    it('should have Breakfast Nook unchecked by default', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const nookLabel = screen.getByText('Coin petit-dejeuner').closest('label');
        expect(nookLabel?.className).not.toContain('border-blue-500');
      });
    });
  });

  // ---------- Additional Requirements Section ----------

  describe('Additional Requirements Section', () => {
    it('should render additional requirements heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Exigences supplementaires')).toBeInTheDocument();
      });
    });

    it('should render a textarea for additional requirements', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const textarea = document.querySelector('textarea[name="additionalRequirements"]');
        expect(textarea).toBeInTheDocument();
      });
    });

    it('should allow typing in the additional requirements textarea', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          document.querySelector('textarea[name="additionalRequirements"]')
        ).toBeInTheDocument();
      });

      const textarea = document.querySelector(
        'textarea[name="additionalRequirements"]'
      ) as HTMLTextAreaElement;
      await user.type(textarea, 'I need extra lighting');

      expect(textarea.value).toBe('I need extra lighting');
    });
  });

  // ---------- Form Submission ----------

  describe('Form Submission', () => {
    it('should render Generate Designs submit button', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate designs/i })).toBeInTheDocument();
      });
    });

    it('should render Cancel link', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should show error when submitting without selecting colors', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate designs/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate designs/i }));

      await waitFor(() => {
        expect(screen.getByText(/veuillez selectionner au moins une couleur/i)).toBeInTheDocument();
      });
    });

    it('should call generate API on valid submission', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText('White')).toBeInTheDocument();
      });

      // Select a color first
      await user.click(screen.getByLabelText('White'));

      // Mock the generate API response
      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (
          typeof url === 'string' &&
          url.includes('/ai-generator/generate') &&
          options?.method === 'POST'
        ) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { generationId: 'gen-new-123' } }),
          });
        }
        if (typeof url === 'string' && url.includes('/preferences/')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (typeof url === 'string' && url.includes('/questionnaire/progress')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { completedSections: ['style'] } }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      await user.click(screen.getByRole('button', { name: /generate designs/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/ai-generator/results/gen-new-123');
      });
    });

    it('should show error when generate API fails', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText('Gray')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Gray'));

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (
          typeof url === 'string' &&
          url.includes('/ai-generator/generate') &&
          options?.method === 'POST'
        ) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ message: 'Server overloaded' }),
          });
        }
        if (typeof url === 'string' && url.includes('/preferences/')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (typeof url === 'string' && url.includes('/questionnaire/progress')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { completedSections: ['style'] } }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      await user.click(screen.getByRole('button', { name: /generate designs/i }));

      await waitFor(() => {
        expect(screen.getByText('Server overloaded')).toBeInTheDocument();
      });
    });

    it('should dismiss error when close button is clicked', async () => {
      renderPreferenceForm();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate designs/i })).toBeInTheDocument();
      });

      // Trigger validation error (no colors selected)
      await user.click(screen.getByRole('button', { name: /generate designs/i }));

      await waitFor(() => {
        expect(screen.getByText(/veuillez selectionner au moins une couleur/i)).toBeInTheDocument();
      });

      // Find and click the dismiss button (aria-label "Fermer")
      await user.click(screen.getByLabelText('Fermer'));

      await waitFor(() => {
        expect(
          screen.queryByText(/veuillez selectionner au moins une couleur/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  // ---------- Info Panel ----------

  describe('Info Panel', () => {
    it('should render the info panel with how-it-works title', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText('Comment fonctionne la generation IA')).toBeInTheDocument();
      });
    });

    it('should render the info panel description', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByText(/notre ia analyse vos preferences/i)).toBeInTheDocument();
      });
    });
  });

  // ---------- Dark Mode Classes ----------

  describe('Dark Mode Classes', () => {
    it('should have dark:bg-gray-900 on the page container', async () => {
      const { container } = renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      const pageContainer = container.firstChild as HTMLElement;
      expect(pageContainer.className).toContain('dark:bg-gray-900');
    });

    it('should have dark:text-white on the heading', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading.className).toContain('dark:text-white');
      });
    });

    it('should have dark:bg-gray-800 on the form card', async () => {
      const { container } = renderPreferenceForm();

      await waitFor(() => {
        const formCard = container.querySelector('.bg-white.dark\\:bg-gray-800');
        expect(formCard).toBeInTheDocument();
      });
    });
  });

  // ---------- Accessibility ----------

  describe('Accessibility', () => {
    it('should have a proper heading hierarchy', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        const h2Elements = screen.getAllByRole('heading', { level: 2 });
        expect(h2Elements.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('should have aria-pressed attributes on style buttons', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const modernBtn = screen.getByText('Modern').closest('button');
        expect(modernBtn).toHaveAttribute('aria-pressed');
      });
    });

    it('should have aria-pressed attributes on color buttons', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const whiteBtn = screen.getByLabelText('White');
        expect(whiteBtn).toHaveAttribute('aria-pressed');
      });
    });

    it('should have aria-pressed attributes on layout buttons', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        const openBtn = screen.getByText('Open Plan').closest('button');
        expect(openBtn).toHaveAttribute('aria-pressed');
      });
    });

    it('should have proper label associations for select elements', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByLabelText(/gamme d'appareils/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/accent sur le rangement/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ambiance lumineuse/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/nombre de designs/i)).toBeInTheDocument();
      });
    });

    it('should have navigation element for breadcrumbs', async () => {
      renderPreferenceForm();

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument();
      });
    });

    it('should have form element wrapping the inputs', async () => {
      const { container } = renderPreferenceForm();

      await waitFor(() => {
        expect(container.querySelector('form')).toBeInTheDocument();
      });
    });
  });
});
