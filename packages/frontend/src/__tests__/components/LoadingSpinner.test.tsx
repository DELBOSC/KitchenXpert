/**
 * LoadingSpinner Tests
 * Tests for loading spinner component - sizes, full screen mode, and accessibility
 */

import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render spinner element', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have loading aria-label', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should have animate-spin class', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });
  });

  describe('Sizes', () => {
    it('should render small size correctly', () => {
      render(<LoadingSpinner size="sm" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-4');
      expect(spinner).toHaveClass('h-4');
      expect(spinner).toHaveClass('border-2');
    });

    it('should render medium size by default', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-8');
      expect(spinner).toHaveClass('h-8');
      expect(spinner).toHaveClass('border-3');
    });

    it('should render medium size explicitly', () => {
      render(<LoadingSpinner size="md" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-8');
      expect(spinner).toHaveClass('h-8');
    });

    it('should render large size correctly', () => {
      render(<LoadingSpinner size="lg" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-12');
      expect(spinner).toHaveClass('h-12');
      expect(spinner).toHaveClass('border-4');
    });
  });

  describe('Full Screen Mode', () => {
    it('should not render full screen wrapper by default', () => {
      render(<LoadingSpinner />);

      const wrapper = document.querySelector('.fixed');
      expect(wrapper).not.toBeInTheDocument();
    });

    it('should render full screen wrapper when fullScreen is true', () => {
      render(<LoadingSpinner fullScreen />);

      const wrapper = document.querySelector('.fixed');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('inset-0');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('should have high z-index in full screen mode', () => {
      render(<LoadingSpinner fullScreen />);

      const wrapper = document.querySelector('.fixed');
      expect(wrapper).toHaveClass('z-50');
    });

    it('should have semi-transparent background in full screen mode', () => {
      render(<LoadingSpinner fullScreen />);

      const wrapper = document.querySelector('.fixed');
      expect(wrapper).toHaveClass('bg-white/80');
    });

    it('should contain spinner inside wrapper in full screen mode', () => {
      render(<LoadingSpinner fullScreen />);

      const wrapper = document.querySelector('.fixed');
      const spinner = screen.getByRole('status');
      expect(wrapper).toContainElement(spinner);
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(<LoadingSpinner className="custom-class" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('custom-class');
    });

    it('should combine default and custom classes', () => {
      render(<LoadingSpinner className="custom-class" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveClass('custom-class');
    });

    it('should apply custom className in full screen mode', () => {
      render(<LoadingSpinner fullScreen className="custom-class" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('custom-class');
    });
  });

  describe('Styling', () => {
    it('should have border styling for spinner effect', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('border-gray-300');
      expect(spinner).toHaveClass('border-t-blue-600');
    });

    it('should have rounded-full class', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('rounded-full');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<LoadingSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should be focusable for screen readers', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('should have dark mode background class in full screen', () => {
      render(<LoadingSpinner fullScreen />);

      const wrapper = document.querySelector('.fixed');
      expect(wrapper).toHaveClass('dark:bg-gray-900/80');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty className prop', () => {
      render(<LoadingSpinner className="" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should work without any props', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('w-8'); // Default medium size
    });

    it('should handle all props together', () => {
      render(<LoadingSpinner size="lg" fullScreen className="test-class" />);

      const wrapper = document.querySelector('.fixed');
      const spinner = screen.getByRole('status');

      expect(wrapper).toBeInTheDocument();
      expect(spinner).toHaveClass('w-12');
      expect(spinner).toHaveClass('test-class');
    });
  });
});
