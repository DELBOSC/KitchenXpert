/**
 * BudgetPlanning Tests
 * Tests for questionnaire budget planning page - form rendering, currency, breakdown,
 * validation, dark mode, error states, navigation, loading, accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import BudgetPlanning from '../../pages/Questionnaire/BudgetPlanning/BudgetPlanning';

// Mock the logger
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

const renderBudgetPlanning = () => {
  return render(
    <BrowserRouter>
      <BudgetPlanning />
    </BrowserRouter>
  );
};

describe('BudgetPlanning', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: budget-planning API returns no saved data, so component uses defaults
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    global.fetch = mockFetch;

    // localStorage is already mocked in setup.ts
    // Ensure getItem returns null so no saved state is restored
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderBudgetPlanning();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should have aria-label on loading spinner', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderBudgetPlanning();

      const spinner = document.querySelector('[role="status"]');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label');
    });

    it('should have dark mode background class on loading container', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderBudgetPlanning();

      const container = document.querySelector('.dark\\:bg-gray-900');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Page Structure', () => {
    it('should render page title after loading', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        // t('questionnaire.budget.title', 'Budget Planning') - fallback
        expect(
          screen.getByRole('heading', { name: /budget planning/i })
        ).toBeInTheDocument();
      });
    });

    it('should render subtitle/description', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(
          screen.getByText(/define your budget and spending priorities/i)
        ).toBeInTheDocument();
      });
    });

    it('should render progress indicator showing step 4 of 4', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should render form element', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const form = document.querySelector('form');
        expect(form).toBeInTheDocument();
      });
    });

    it('should render Back link to style page', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        // fr.json: common.back = "Retour"
        const backLink = screen.getByRole('link', { name: /retour/i });
        expect(backLink).toBeInTheDocument();
        expect(backLink).toHaveAttribute('href', '/questionnaire/style');
      });
    });

    it('should render submit button', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        // t('questionnaire.completeQuestionnaire', 'Complete Questionnaire')
        expect(
          screen.getByRole('button', { name: /complete questionnaire/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Currency Selection', () => {
    it('should default to EUR currency', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const currencySelect = screen.getByDisplayValue(/eur/i);
        expect(currencySelect).toBeInTheDocument();
      });
    });

    it('should have multiple currency options', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByText(/€ EUR/i)).toBeInTheDocument();
        expect(screen.getByText(/\$ USD/i)).toBeInTheDocument();
        expect(screen.getByText(/£ GBP/i)).toBeInTheDocument();
      });
    });

    it('should allow changing currency', async () => {
      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /budget planning/i })).toBeInTheDocument();
      });

      const currencySelect = screen.getByDisplayValue(/eur/i);
      await user.selectOptions(currencySelect, 'USD');

      expect(currencySelect).toHaveValue('USD');
    });
  });

  describe('Budget Input', () => {
    it('should render budget input field', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const budgetInput = screen.getByPlaceholderText(
          /enter your total budget/i
        );
        expect(budgetInput).toBeInTheDocument();
        expect(budgetInput).toHaveAttribute('type', 'number');
      });
    });

    it('should accept budget amount input', async () => {
      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      const budgetInput = screen.getByPlaceholderText(
        /enter your total budget/i
      );
      await user.type(budgetInput, '25000');

      expect(budgetInput).toHaveValue(25000);
    });

    it('should show budget range label when budget is entered', async () => {
      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      const budgetInput = screen.getByPlaceholderText(
        /enter your total budget/i
      );
      await user.type(budgetInput, '25000');

      await waitFor(() => {
        // Mid-Range: 15000-35000
        expect(screen.getByText(/mid-range/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for zero budget on submit', async () => {
      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /complete questionnaire/i })
        ).toBeInTheDocument();
      });

      // Submit without entering budget (default is 0)
      await user.click(
        screen.getByRole('button', { name: /complete questionnaire/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid budget amount/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Budget Flexibility', () => {
    it('should render three flexibility options', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByText(/budget flexibility/i)).toBeInTheDocument();
      });

      // Three buttons: strict, moderate, flexible
      expect(screen.getByText(/cannot exceed budget/i)).toBeInTheDocument();
      expect(screen.getByText(/10-15% over if needed/i)).toBeInTheDocument();
      expect(screen.getByText(/budget is a guideline/i)).toBeInTheDocument();
    });

    it('should default to moderate flexibility', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        // The moderate button should have the selected styling (blue border)
        const moderateButton = screen.getByText(
          /10-15% over if needed/i
        ).closest('button');
        expect(moderateButton).toHaveClass('border-blue-500');
      });
    });

    it('should allow changing flexibility', async () => {
      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText(/cannot exceed budget/i)).toBeInTheDocument();
      });

      const strictButton = screen.getByText(
        /cannot exceed budget/i
      ).closest('button')!;
      await user.click(strictButton);

      expect(strictButton).toHaveClass('border-blue-500');
    });
  });

  describe('Priority Areas', () => {
    it('should render priority area options', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByText(/priority areas/i)).toBeInTheDocument();
        expect(screen.getByText(/select up to 3 priorities/i)).toBeInTheDocument();
      });
    });

    it('should render all priority option buttons', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByText(/maximum storage/i)).toBeInTheDocument();
        expect(screen.getByText(/premium appliances/i)).toBeInTheDocument();
        expect(screen.getByText(/visual appeal/i)).toBeInTheDocument();
        expect(screen.getByText(/counter space/i)).toBeInTheDocument();
        expect(screen.getByText(/durability/i)).toBeInTheDocument();
        expect(screen.getByText(/eco-friendly/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting priorities', async () => {
      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText(/maximum storage/i)).toBeInTheDocument();
      });

      const storageButton = screen.getByText(/maximum storage/i).closest(
        'button'
      )!;
      await user.click(storageButton);

      expect(storageButton).toHaveClass('border-blue-500');
    });
  });

  describe('Budget Includes (Checkboxes)', () => {
    it('should render budget include checkboxes', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(
          screen.getByText(/professional design & installation fees/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/new appliances/i)).toBeInTheDocument();
        expect(screen.getByText(/lighting fixtures/i)).toBeInTheDocument();
        expect(
          screen.getByText(/flooring replacement/i)
        ).toBeInTheDocument();
      });
    });

    it('should have include checkboxes checked by default', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        // 5 total: 4 includes (all checked) + 1 financing (unchecked)
        expect(checkboxes.length).toBe(5);

        // Count checked checkboxes (should be 4 includes)
        const checkedCount = checkboxes.filter(
          (cb) => (cb as HTMLInputElement).checked
        ).length;
        expect(checkedCount).toBe(4);
      });
    });
  });

  describe('Budget Breakdown', () => {
    it('should render breakdown section with sliders', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByText(/budget breakdown/i)).toBeInTheDocument();
      });

      // Category labels (some may appear in multiple sections, use getAllByText)
      expect(screen.getByText(/cabinets & storage/i)).toBeInTheDocument();
      expect(screen.getAllByText(/countertops/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/appliances/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/labor & installation/i)).toBeInTheDocument();
      expect(screen.getByText(/other.*permits/i)).toBeInTheDocument();
    });

    it('should show default breakdown percentages', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByText('35%')).toBeInTheDocument(); // cabinets
        // 15% appears twice (countertops + labor), so use getAllByText
        expect(screen.getAllByText('15%').length).toBe(2); // countertops and labor
        expect(screen.getByText('25%')).toBeInTheDocument(); // appliances
        expect(screen.getByText('10%')).toBeInTheDocument(); // other
      });
    });

    it('should have range sliders with correct aria-labels', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const sliders = screen.getAllByRole('slider');
        expect(sliders.length).toBe(5); // 5 breakdown categories

        // Check that each has an aria-label
        sliders.forEach((slider) => {
          expect(slider).toHaveAttribute('aria-label');
        });
      });
    });
  });

  describe('Timeline Section', () => {
    it('should render timeline options', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByText(/project timeline/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/1-2 months/i)).toBeInTheDocument();
      expect(screen.getByText(/2-4 months/i)).toBeInTheDocument();
      expect(screen.getByText(/4\+ months/i)).toBeInTheDocument();
    });

    it('should default to standard timeline', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const standardButton = screen.getByText(/2-4 months/i).closest(
          'button'
        );
        expect(standardButton).toHaveClass('border-blue-500');
      });
    });
  });

  describe('Financing Section', () => {
    it('should render financing checkbox', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(
          screen.getByText(/interested in financing options/i)
        ).toBeInTheDocument();
      });
    });

    it('should have financing unchecked by default', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const financingCheckbox = screen.getAllByRole('checkbox').find(
          (cb) => (cb as HTMLInputElement).name === 'financingNeeded'
        );
        expect(financingCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call API on valid submission', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({}),
        }) // Initial load
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }) // POST submit
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { tips: [], warnings: [], suggestions: [] },
            }),
        }); // AI tips

      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      // Enter a valid budget
      const budgetInput = screen.getByPlaceholderText(
        /enter your total budget/i
      );
      await user.type(budgetInput, '20000');

      // Submit the form
      await user.click(
        screen.getByRole('button', { name: /complete questionnaire/i })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/questionnaire/budget-planning',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should show save error on API failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({}),
        }) // Initial load
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({}),
        }); // POST fails

      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      const budgetInput = screen.getByPlaceholderText(
        /enter your total budget/i
      );
      await user.type(budgetInput, '20000');

      await user.click(
        screen.getByRole('button', { name: /complete questionnaire/i })
      );

      await waitFor(() => {
        // Error alert should appear
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(
          screen.getByText(/failed to save budget plan/i)
        ).toBeInTheDocument();
      });
    });

    it('should disable submit button while saving', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({}),
        }) // Initial load
        .mockImplementationOnce(
          () => new Promise(() => {})
        ); // POST never resolves

      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      const budgetInput = screen.getByPlaceholderText(
        /enter your total budget/i
      );
      await user.type(budgetInput, '20000');

      await user.click(
        screen.getByRole('button', { name: /complete questionnaire/i })
      );

      await waitFor(() => {
        // fr.json: common.saving = not defined, fallback 'Saving...'
        const savingButton = screen.getByRole('button', {
          name: /saving/i,
        });
        expect(savingButton).toBeDisabled();
      });
    });
  });

  describe('localStorage', () => {
    it('should check localStorage for saved data on mount', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(window.localStorage.getItem).toHaveBeenCalledWith(
          'questionnaire_budgetPlanning'
        );
      });
    });

    it('should restore saved budget data from localStorage', async () => {
      const savedData = JSON.stringify({
        totalBudget: 50000,
        currency: 'USD',
        budgetFlexibility: 'strict',
        priorityAreas: ['storage'],
        includeProfessionalFees: true,
        includeAppliances: false,
        includeLighting: true,
        includeFlooring: true,
        timeline: 'urgent',
        financingNeeded: true,
        breakdown: {
          cabinets: 30,
          countertops: 20,
          appliances: 20,
          labor: 20,
          other: 10,
        },
      });

      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'questionnaire_budgetPlanning') return savedData;
          if (key === 'questionnaire_timestamp') return null;
          return null;
        }
      );

      renderBudgetPlanning();

      await waitFor(() => {
        expect(screen.getByDisplayValue(/usd/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch saved budget data from API on mount', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/questionnaire/budget-planning',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should handle API failure gracefully and use defaults', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      renderBudgetPlanning();

      // Should still render the form with defaults
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /budget planning/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation on Submit', () => {
    it('should POST budget data on Complete Questionnaire submission', async () => {
      // After 2026 redesign the page is a two-step flow: Complete
      // Questionnaire saves the budget, and a separate Generate button
      // (which only appears after save) navigates to /questionnaire/results.
      // We assert here that the POST is made; the navigate is exercised
      // separately in the Generate flow.
      mockFetch
        .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) }) // initial load
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }) // POST submit
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { tips: [], warnings: [], suggestions: [] } }),
        }); // AI tips

      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      const budgetInput = screen.getByPlaceholderText(/enter your total budget/i);
      await user.type(budgetInput, '20000');
      await user.click(screen.getByRole('button', { name: /complete questionnaire/i }));

      await waitFor(() => {
        const calls = mockFetch.mock.calls.map((c: unknown[]) => c[0] as string);
        // Verify the budget-planning endpoint was called as a POST.
        const planningCall = mockFetch.mock.calls.find(
          (c: unknown[]) =>
            typeof c[0] === 'string' &&
            (c[0] as string).includes('/budget-planning') &&
            (c[1] as RequestInit | undefined)?.method === 'POST',
        );
        expect(planningCall).toBeDefined();
        expect(calls.length).toBeGreaterThan(1);
      });
    });

    it('should clear all localStorage data on successful submission', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({}),
        }) // Initial load
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }) // POST submit
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { tips: [], warnings: [], suggestions: [] },
            }),
        }); // AI tips

      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your total budget/i),
        '20000'
      );
      await user.click(
        screen.getByRole('button', { name: /complete questionnaire/i })
      );

      await waitFor(() => {
        expect(window.localStorage.removeItem).toHaveBeenCalledWith(
          'questionnaire_budgetPlanning'
        );
        expect(window.localStorage.removeItem).toHaveBeenCalledWith(
          'questionnaire_currentStep'
        );
        expect(window.localStorage.removeItem).toHaveBeenCalledWith(
          'questionnaire_timestamp'
        );
      });
    });

    it('should have aria-busy on submit button while saving', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({}),
        }) // Initial load
        .mockImplementationOnce(
          () => new Promise(() => {})
        ); // POST never resolves

      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/enter your total budget/i)
        ).toBeInTheDocument();
      });

      await user.type(
        screen.getByPlaceholderText(/enter your total budget/i),
        '20000'
      );
      await user.click(
        screen.getByRole('button', { name: /complete questionnaire/i })
      );

      await waitFor(() => {
        const savingButton = screen.getByRole('button', {
          name: /saving/i,
        });
        expect(savingButton).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('Dark Mode', () => {
    it('should have dark mode classes on the page container', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const container = document.querySelector('.dark\\:bg-gray-900');
        expect(container).toBeInTheDocument();
      });
    });

    it('should have dark mode classes on the form card', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const card = document.querySelector('.dark\\:bg-gray-800');
        expect(card).toBeInTheDocument();
      });
    });

    it('should have dark mode text classes on headings', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const darkTextElements = document.querySelectorAll('.dark\\:text-white');
        expect(darkTextElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        expect(h1).toBeInTheDocument();

        const h2s = screen.getAllByRole('heading', { level: 2 });
        expect(h2s.length).toBeGreaterThanOrEqual(4); // Total Budget, Flexibility, Priorities, Breakdown, Timeline
      });
    });

    it('should have accessible progress bar', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '4');
        expect(progressbar).toHaveAttribute('aria-valuemin', '0');
        expect(progressbar).toHaveAttribute('aria-valuemax', '4');
      });
    });

    it('should have accessible sliders with labels', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        // slider for "Cabinets & Storage"
        const cabinetsSlider = screen.getByRole('slider', {
          name: /cabinets/i,
        });
        expect(cabinetsSlider).toBeInTheDocument();
      });
    });

    it('should show validation error role=alert when budget is invalid', async () => {
      renderBudgetPlanning();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /complete questionnaire/i })
        ).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole('button', { name: /complete questionnaire/i })
      );

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/please enter a valid budget amount/i);
      });
    });

    it('should have progress bar with aria-label', async () => {
      renderBudgetPlanning();

      await waitFor(() => {
        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-label');
      });
    });
  });
});
