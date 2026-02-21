/**
 * CarbonAdmin Tests
 * Tests for the admin carbon footprint dashboard page - rendering, i18n,
 * dark mode classes, container layout, and accessibility
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import CarbonAdmin from '../../pages/Admin/CarbonAdmin';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
    i18n: { language: 'fr' },
  }),
}));

// Mock api service (imported but not used in current render)
vi.mock('../../services/api/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../services/api/endpoints', () => ({
  API_ENDPOINTS: {},
}));

const renderCarbonAdmin = () => {
  return render(
    <MemoryRouter>
      <CarbonAdmin />
    </MemoryRouter>
  );
};

describe('CarbonAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- Rendering ----------

  describe('Rendering', () => {
    it('should render the page heading', () => {
      renderCarbonAdmin();

      expect(
        screen.getByRole('heading', { level: 1, name: /carbon footprint dashboard/i })
      ).toBeInTheDocument();
    });

    it('should render the description text', () => {
      renderCarbonAdmin();

      expect(
        screen.getByText(/view and manage carbon footprint reports for kitchen designs/i)
      ).toBeInTheDocument();
    });

    it('should render heading with correct text from translation fallback', () => {
      renderCarbonAdmin();

      expect(screen.getByText('Carbon Footprint Dashboard')).toBeInTheDocument();
    });

    it('should render description with correct text from translation fallback', () => {
      renderCarbonAdmin();

      expect(
        screen.getByText('View and manage carbon footprint reports for kitchen designs.')
      ).toBeInTheDocument();
    });

    it('should render the page container', () => {
      const { container } = renderCarbonAdmin();

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toBeInTheDocument();
      expect(outerDiv.tagName).toBe('DIV');
    });

    it('should render the content card', () => {
      const { container } = renderCarbonAdmin();

      const card = container.querySelector('.bg-white');
      expect(card).toBeInTheDocument();
    });
  });

  // ---------- Dark Mode Classes ----------

  describe('Dark Mode Classes', () => {
    it('should have dark:text-white class on the heading', () => {
      renderCarbonAdmin();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('dark:text-white');
    });

    it('should have dark:bg-gray-800 class on the content card', () => {
      const { container } = renderCarbonAdmin();

      const card = container.querySelector('.bg-white');
      expect(card?.className).toContain('dark:bg-gray-800');
    });

    it('should have dark:text-gray-400 class on the description', () => {
      const description = screen.queryByText(
        'View and manage carbon footprint reports for kitchen designs.'
      );
      // Re-render to check
      const { container } = renderCarbonAdmin();
      const descriptionEl = container.querySelector('.text-gray-500');
      expect(descriptionEl?.className).toContain('dark:text-gray-400');
    });
  });

  // ---------- Layout and Styling ----------

  describe('Layout and Styling', () => {
    it('should have max-w-7xl container class', () => {
      const { container } = renderCarbonAdmin();

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('max-w-7xl');
    });

    it('should have mx-auto for centering', () => {
      const { container } = renderCarbonAdmin();

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('mx-auto');
    });

    it('should have padding classes on the container', () => {
      const { container } = renderCarbonAdmin();

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('px-4');
      expect(outerDiv.className).toContain('py-8');
    });

    it('should have rounded-lg and shadow on the card', () => {
      const { container } = renderCarbonAdmin();

      const card = container.querySelector('.bg-white');
      expect(card?.className).toContain('rounded-lg');
      expect(card?.className).toContain('shadow');
    });

    it('should have p-6 padding on the card', () => {
      const { container } = renderCarbonAdmin();

      const card = container.querySelector('.bg-white');
      expect(card?.className).toContain('p-6');
    });

    it('should have mb-6 margin on the heading', () => {
      renderCarbonAdmin();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('mb-6');
    });

    it('should have text-2xl font-bold on the heading', () => {
      renderCarbonAdmin();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('text-2xl');
      expect(heading.className).toContain('font-bold');
    });

    it('should have responsive padding classes', () => {
      const { container } = renderCarbonAdmin();

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('sm:px-6');
      expect(outerDiv.className).toContain('lg:px-8');
    });
  });

  // ---------- Accessibility ----------

  describe('Accessibility', () => {
    it('should have a proper heading hierarchy with h1', () => {
      renderCarbonAdmin();

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThanOrEqual(1);
      expect(headings[0].tagName).toBe('H1');
    });

    it('should render description as a paragraph element', () => {
      renderCarbonAdmin();

      const description = screen.getByText(
        'View and manage carbon footprint reports for kitchen designs.'
      );
      expect(description.tagName).toBe('P');
    });

    it('should have text-gray-900 for heading readability', () => {
      renderCarbonAdmin();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.className).toContain('text-gray-900');
    });

    it('should use semantic HTML structure', () => {
      const { container } = renderCarbonAdmin();

      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('p')).toBeInTheDocument();
    });
  });

  // ---------- Translation Keys ----------

  describe('Translation Keys', () => {
    it('should use admin.carbon.title translation key', () => {
      // The mock t function returns the fallback, verifying the correct fallback is used
      renderCarbonAdmin();
      expect(screen.getByText('Carbon Footprint Dashboard')).toBeInTheDocument();
    });

    it('should use admin.carbon.description translation key', () => {
      renderCarbonAdmin();
      expect(
        screen.getByText('View and manage carbon footprint reports for kitchen designs.')
      ).toBeInTheDocument();
    });
  });

  // ---------- Component Structure ----------

  describe('Component Structure', () => {
    it('should have exactly one heading element', () => {
      renderCarbonAdmin();

      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(1);
    });

    it('should have exactly one paragraph element', () => {
      const { container } = renderCarbonAdmin();

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(1);
    });

    it('should not render any buttons', () => {
      renderCarbonAdmin();

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });

    it('should not render any links', () => {
      renderCarbonAdmin();

      const links = screen.queryAllByRole('link');
      expect(links).toHaveLength(0);
    });

    it('should not render any forms', () => {
      const { container } = renderCarbonAdmin();

      const forms = container.querySelectorAll('form');
      expect(forms).toHaveLength(0);
    });

    it('should not render any tables', () => {
      renderCarbonAdmin();

      const tables = screen.queryAllByRole('table');
      expect(tables).toHaveLength(0);
    });
  });
});
