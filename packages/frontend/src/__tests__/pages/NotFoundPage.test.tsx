/**
 * NotFoundPage Tests
 * Tests for 404 not found page - rendering, translations, navigation link
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import NotFoundPage from '../../pages/NotFoundPage';

const renderNotFoundPage = () => {
  return render(
    <BrowserRouter>
      <NotFoundPage />
    </BrowserRouter>
  );
};

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      renderNotFoundPage();

      // fr.json: notFound.title = "Page non trouvée"
      expect(
        screen.getByRole('heading', { level: 1, name: /page non trouvée/i })
      ).toBeInTheDocument();
    });

    it('should display the 404 title from i18n', () => {
      renderNotFoundPage();

      expect(screen.getByText(/page non trouvée/i)).toBeInTheDocument();
    });

    it('should display the not found message from i18n', () => {
      renderNotFoundPage();

      // fr.json: notFound.message = "La page que vous recherchez n'existe pas ou a été déplacée."
      expect(
        screen.getByText(/la page que vous recherchez n'existe pas/i)
      ).toBeInTheDocument();
    });

    it('should display the search emoji icon', () => {
      renderNotFoundPage();

      const container = document.body;
      expect(container.textContent).toContain('\uD83D\uDD0D');
    });

    it('should render the heading as h1', () => {
      renderNotFoundPage();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have a link to the home page', () => {
      renderNotFoundPage();

      // fr.json: notFound.backHome = "Retour à l'accueil"
      const homeLink = screen.getByRole('link', { name: /retour à l'accueil/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should render home link with proper text from translations', () => {
      renderNotFoundPage();

      const homeLink = screen.getByRole('link', { name: /retour à l'accueil/i });
      expect(homeLink).toHaveTextContent(/retour à l'accueil/i);
    });
  });

  describe('i18n Translations', () => {
    it('should use French translation for the title', () => {
      renderNotFoundPage();

      // Verify the French text is rendered (not English fallback or raw key)
      expect(screen.getByText('Page non trouvée')).toBeInTheDocument();
    });

    it('should use French translation for the message', () => {
      renderNotFoundPage();

      expect(
        screen.getByText("La page que vous recherchez n'existe pas ou a été déplacée.")
      ).toBeInTheDocument();
    });

    it('should use French translation for the back home link', () => {
      renderNotFoundPage();

      expect(screen.getByText("Retour à l'accueil")).toBeInTheDocument();
    });
  });

  describe('Layout and Structure', () => {
    it('should have centered layout', () => {
      renderNotFoundPage();

      const container = document.querySelector('.text-center');
      expect(container).toBeInTheDocument();
    });

    it('should have full-height layout', () => {
      renderNotFoundPage();

      const wrapper = document.querySelector('.min-h-screen');
      expect(wrapper).toBeInTheDocument();
    });

    it('should have a styled link button', () => {
      renderNotFoundPage();

      const homeLink = screen.getByRole('link', { name: /retour à l'accueil/i });
      expect(homeLink).toHaveClass('bg-blue-600');
      expect(homeLink).toHaveClass('text-white');
      expect(homeLink).toHaveClass('rounded-lg');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy with a single h1', () => {
      renderNotFoundPage();

      const headings = screen.getAllByRole('heading');
      expect(headings).toHaveLength(1);
      expect(headings[0].tagName).toBe('H1');
    });

    it('should have navigable link', () => {
      renderNotFoundPage();

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(1);
    });
  });
});
