/**
 * UserProfile Tests (Questionnaire Step 1)
 * Tests for the user profile questionnaire page - form rendering, validation,
 * checkbox interactions, form submission, error states, localStorage, accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserProfile from '../../pages/Questionnaire/UserProfile/UserProfile';

// Mock logger
vi.mock('../../../services/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Also mock with the relative path used in the component import
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

const renderUserProfile = () => {
  return render(
    <BrowserRouter>
      <UserProfile />
    </BrowserRouter>
  );
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: fetch returns no saved profile (use defaults)
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    global.fetch = mockFetch;

    // Ensure localStorage returns null (no saved state)
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      renderUserProfile();

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Page Structure', () => {
    it('should render page title after loading', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 1, name: /tell us about yourself/i })
        ).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(
          screen.getByText(/help us understand your household/i)
        ).toBeInTheDocument();
      });
    });

    it('should render progress indicator showing step 1 of 4', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should render form element', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(document.querySelector('form')).toBeInTheDocument();
      });
    });

    it('should render Cancel link to dashboard', async () => {
      renderUserProfile();

      await waitFor(() => {
        // fr.json: common.cancel = "Annuler".
        const cancelLink = screen.getByRole('link', { name: /cancel|annuler/i });
        expect(cancelLink).toBeInTheDocument();
        expect(cancelLink).toHaveAttribute('href', '/dashboard');
      });
    });

    it('should render Continue submit button', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /continue/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Household Information', () => {
    it('should render Household Information section heading', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByText(/household information/i)).toBeInTheDocument();
      });
    });

    it('should render household size input', async () => {
      renderUserProfile();

      await waitFor(() => {
        const input = screen.getByLabelText(/household size/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('type', 'number');
      });
    });

    it('should default household size to 2', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/household size/i)).toHaveValue(2);
      });
    });

    it('should render primary cook input', async () => {
      renderUserProfile();

      await waitFor(() => {
        const input = screen.getByLabelText(/primary cook/i);
        expect(input).toBeInTheDocument();
        expect(input).toHaveAttribute('type', 'text');
      });
    });

    it('should have aria-required on household size input', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/household size/i)).toHaveAttribute('aria-required', 'true');
      });
    });

    it('should have aria-required on primary cook input', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/primary cook/i)).toHaveAttribute('aria-required', 'true');
      });
    });
  });

  describe('Cooking Habits', () => {
    it('should render Cooking Habits section heading', async () => {
      renderUserProfile();

      await waitFor(() => {
        // Section heading + AI-tips block both mention cooking habits.
        expect(screen.getAllByText(/cooking habits/i).length).toBeGreaterThan(0);
      });
    });

    it('should render cooking frequency select', async () => {
      renderUserProfile();

      await waitFor(() => {
        const select = screen.getByLabelText(/how often do you cook/i);
        expect(select).toBeInTheDocument();
      });
    });

    it('should default cooking frequency to regularly', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/how often do you cook/i)).toHaveValue('regularly');
      });
    });

    it('should render cooking experience select', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/cooking experience level/i)).toBeInTheDocument();
      });
    });

    it('should default cooking experience to intermediate', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/cooking experience level/i)).toHaveValue('intermediate');
      });
    });

    it('should render entertaining frequency select', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/how often do you entertain/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dietary Preferences', () => {
    it('should render dietary preferences section', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByText(/dietary preferences/i)).toBeInTheDocument();
        expect(screen.getByText(/select all that apply/i)).toBeInTheDocument();
      });
    });

    it('should render all 9 dietary options', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByText('Vegetarian')).toBeInTheDocument();
        expect(screen.getByText('Vegan')).toBeInTheDocument();
        expect(screen.getByText('Gluten-Free')).toBeInTheDocument();
        expect(screen.getByText('Dairy-Free')).toBeInTheDocument();
        expect(screen.getByText('Halal')).toBeInTheDocument();
        expect(screen.getByText('Kosher')).toBeInTheDocument();
        expect(screen.getByText('Low-Carb')).toBeInTheDocument();
        expect(screen.getByText('Keto')).toBeInTheDocument();
        expect(screen.getByText('Paleo')).toBeInTheDocument();
      });
    });

    it('should toggle dietary preference when clicked', async () => {
      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      });

      const vegetarianLabel = screen.getByText('Vegetarian').closest('label')!;
      await user.click(vegetarianLabel);

      // After clicking, the label should have the selected blue styling
      await waitFor(() => {
        expect(vegetarianLabel).toHaveClass('border-blue-500');
      });
    });
  });

  describe('Accessibility & Special Needs', () => {
    it('should render accessibility section', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByText(/accessibility & special needs/i)).toBeInTheDocument();
      });
    });

    it('should render all 8 special needs options', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByText('Wheelchair Accessible')).toBeInTheDocument();
        expect(screen.getByText('Lower Counter Heights')).toBeInTheDocument();
        expect(screen.getByText('Pull-Out Shelves')).toBeInTheDocument();
        expect(screen.getByText('Wide Aisles')).toBeInTheDocument();
        expect(screen.getByText('Easy-Grip Handles')).toBeInTheDocument();
        expect(screen.getByText('Voice-Activated Controls')).toBeInTheDocument();
        expect(screen.getByText('Enhanced Lighting')).toBeInTheDocument();
        expect(screen.getByText('Non-Slip Flooring')).toBeInTheDocument();
      });
    });

    it('should toggle special needs option when clicked', async () => {
      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Wide Aisles')).toBeInTheDocument();
      });

      const wideAislesLabel = screen.getByText('Wide Aisles').closest('label')!;
      await user.click(wideAislesLabel);

      await waitFor(() => {
        expect(wideAislesLabel).toHaveClass('border-blue-500');
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error when primary cook is empty on submit', async () => {
      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      // Submit with empty primary cook
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter the primary cook name/i)).toBeInTheDocument();
      });
    });

    it('should show aria-invalid on primary cook input when validation fails', async () => {
      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/primary cook/i)).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should clear error when user starts typing in primary cook', async () => {
      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      // Trigger validation
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter the primary cook name/i)).toBeInTheDocument();
      });

      // Start typing
      await user.type(screen.getByLabelText(/primary cook/i), 'Jane');

      await waitFor(() => {
        expect(screen.queryByText(/please enter the primary cook name/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call POST API with form data on valid submit', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) }) // Initial load
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) }) // POST save
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { tips: [], warnings: [], suggestions: [] } }) }); // AI tips

      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/primary cook/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/primary cook/i), 'Alice');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/questionnaire/user-profile',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
      });
    });

    it('should navigate to spatial step on successful save', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: { tips: [], warnings: [], suggestions: [] } }) });

      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/primary cook/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/primary cook/i), 'Alice');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/questionnaire/spatial');
      });
    });

    it('should show error alert when save fails', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/primary cook/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/primary cook/i), 'Alice');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/failed to save profile/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button and show saving state while saving', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) })
        .mockImplementationOnce(() => new Promise(() => {}));

      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByLabelText(/primary cook/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/primary cook/i), 'Alice');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        const savingButton = screen.getByRole('button', { name: /saving|enregistrement/i });
        expect(savingButton).toBeDisabled();
        expect(savingButton).toHaveAttribute('aria-busy', 'true');
      });
    });
  });

  describe('localStorage', () => {
    it('should check localStorage for saved data on mount', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(window.localStorage.getItem).toHaveBeenCalledWith('questionnaire_userProfile');
      });
    });

    it('should restore saved form data from localStorage', async () => {
      const savedData = JSON.stringify({
        householdSize: 5,
        cookingFrequency: 'daily',
        cookingExperience: 'advanced',
        dietaryPreferences: ['Vegan'],
        specialNeeds: [],
        primaryCook: 'Bob',
        entertainingFrequency: 'weekly',
      });

      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'questionnaire_userProfile') return savedData;
          if (key === 'questionnaire_timestamp') return null;
          return null;
        }
      );

      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByLabelText(/household size/i)).toHaveValue(5);
        expect(screen.getByLabelText(/primary cook/i)).toHaveValue('Bob');
        expect(screen.getByLabelText(/how often do you cook/i)).toHaveValue('daily');
      });
    });
  });

  describe('Data Loading', () => {
    it('should fetch saved profile from API on mount', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/questionnaire/user-profile',
          expect.objectContaining({
            credentials: 'include',
          })
        );
      });
    });

    it('should handle API failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /tell us about yourself/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderUserProfile();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        const h2s = screen.getAllByRole('heading', { level: 2 });
        expect(h2s.length).toBeGreaterThanOrEqual(4); // Household, Cooking, Dietary, Accessibility
      });
    });

    it('should have accessible progress bar', async () => {
      renderUserProfile();

      await waitFor(() => {
        const progressbar = screen.getByRole('progressbar');
        expect(progressbar).toHaveAttribute('aria-valuenow', '1');
        expect(progressbar).toHaveAttribute('aria-valuemin', '0');
        expect(progressbar).toHaveAttribute('aria-valuemax', '4');
      });
    });

    it('should have aria-describedby linking errors to inputs', async () => {
      renderUserProfile();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        const primaryCookInput = screen.getByLabelText(/primary cook/i);
        expect(primaryCookInput).toHaveAttribute('aria-describedby', 'primaryCook-error');

        const errorElement = document.getElementById('primaryCook-error');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });
});
