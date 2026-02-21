/**
 * HomePage Tests
 * Tests for the main landing page - hero section, features, links, and footer
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import HomePage from '../../pages/HomePage';

const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Hero Section', () => {
    it('should render without crashing', () => {
      renderHomePage();

      expect(screen.getByText('KitchenXpert')).toBeInTheDocument();
    });

    it('should display the main heading', () => {
      renderHomePage();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('KitchenXpert');
    });

    it('should display the tagline', () => {
      renderHomePage();

      // fr.json: home.tagline = "Concevez la cuisine de vos rêves..."
      expect(
        screen.getByText(/concevez la cuisine de vos rêves/i)
      ).toBeInTheDocument();
    });

    it('should display "Start Design" call-to-action link', () => {
      renderHomePage();

      // fr.json: home.startDesign = "Commencer un design"
      const startLink = screen.getByRole('link', {
        name: /commencer un design/i,
      });
      expect(startLink).toBeInTheDocument();
      expect(startLink).toHaveAttribute('href', '/designer');
    });

    it('should display "Explore Catalog" link', () => {
      renderHomePage();

      // fr.json: home.exploreCatalog = "Explorer le catalogue"
      const catalogLink = screen.getByRole('link', {
        name: /explorer le catalogue/i,
      });
      expect(catalogLink).toBeInTheDocument();
      expect(catalogLink).toHaveAttribute('href', '/catalog');
    });
  });

  describe('Features Section', () => {
    it('should render features heading', () => {
      renderHomePage();

      // fr.json: home.features = "Fonctionnalités"
      expect(
        screen.getByRole('heading', { name: /fonctionnalités/i })
      ).toBeInTheDocument();
    });

    it('should render 3D Design feature card', () => {
      renderHomePage();

      // fr.json: home.feature3dTitle = "Design 3D"
      expect(screen.getByRole('heading', { name: /design 3d/i })).toBeInTheDocument();
      // fr.json: home.feature3dDesc = "Visualisez votre cuisine en 3D..."
      expect(
        screen.getByText(/visualisez votre cuisine en 3d/i)
      ).toBeInTheDocument();
    });

    it('should render AI feature card', () => {
      renderHomePage();

      // fr.json: home.featureAiTitle = "IA Intelligente"
      expect(screen.getByText(/ia intelligente/i)).toBeInTheDocument();
      // fr.json: home.featureAiDesc = "Notre IA vous suggère..."
      expect(
        screen.getByText(/notre ia vous suggère/i)
      ).toBeInTheDocument();
    });

    it('should render Catalog feature card', () => {
      renderHomePage();

      // fr.json: home.featureCatalogTitle = "Catalogue Multi-Marques"
      expect(
        screen.getByText(/catalogue multi-marques/i)
      ).toBeInTheDocument();
      // fr.json: home.featureCatalogDesc = "Accédez aux catalogues..."
      expect(
        screen.getByText(/accédez aux catalogues/i)
      ).toBeInTheDocument();
    });

    it('should render all three feature cards', () => {
      renderHomePage();

      const h3s = screen.getAllByRole('heading', { level: 3 });
      expect(h3s).toHaveLength(3);
    });

    it('should display feature icons', () => {
      renderHomePage();

      const container = document.body;
      expect(container.textContent).toContain('🎨');
      expect(container.textContent).toContain('🤖');
      expect(container.textContent).toContain('📚');
    });
  });

  describe('Footer', () => {
    it('should render footer with copyright', () => {
      renderHomePage();

      const currentYear = new Date().getFullYear().toString();
      expect(
        screen.getByText(new RegExp(`${currentYear}.*KitchenXpert`))
      ).toBeInTheDocument();
    });

    it('should display all rights reserved text', () => {
      renderHomePage();

      // fr.json: common.allRightsReserved = "Tous droits réservés."
      expect(
        screen.getByText(/tous droits réservés/i)
      ).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have exactly two main navigation links in hero', () => {
      renderHomePage();

      const links = screen.getAllByRole('link');
      // /designer and /catalog
      const heroLinks = links.filter(
        (link) =>
          link.getAttribute('href') === '/designer' ||
          link.getAttribute('href') === '/catalog'
      );
      expect(heroLinks).toHaveLength(2);
    });
  });

  describe('Layout and Structure', () => {
    it('should have proper heading hierarchy', () => {
      renderHomePage();

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThanOrEqual(1);
      expect(h3s.length).toBe(3);
    });

    it('should have header element for hero section', () => {
      renderHomePage();

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have footer element', () => {
      renderHomePage();

      const footer = document.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('should have features section', () => {
      renderHomePage();

      const section = document.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should have grid layout for feature cards', () => {
      renderHomePage();

      const gridContainer = document.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });
  });
});
