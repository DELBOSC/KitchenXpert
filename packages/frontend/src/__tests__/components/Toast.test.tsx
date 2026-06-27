/**
 * Toast Tests
 * Tests for Toast component and ToastProvider - notifications, types, and auto-dismiss
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ToastProvider, useToast } from '../../components/ui/Toast';

// Test component that uses the toast context
function TestComponent() {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Show Success</button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.warning('Warning message')}>Show Warning</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.addToast('success', 'Custom toast', 10000)}>
        Custom Duration
      </button>
      <button onClick={() => toast.addToast('success', 'No auto dismiss', 0)}>
        No Auto Dismiss
      </button>
    </div>
  );
}

const renderWithToastProvider = () => {
  return render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('ToastProvider', () => {
    it('should render children', () => {
      renderWithToastProvider();

      expect(screen.getByText('Show Success')).toBeInTheDocument();
    });

    it('should provide toast context to children', () => {
      // If context is not provided, this would throw
      expect(() => renderWithToastProvider()).not.toThrow();
    });
  });

  describe('useToast hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useToast must be used within a ToastProvider');

      console.error = consoleError;
    });
  });

  describe('Toast Types', () => {
    it('should show success toast with green background', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-green-500');
    });

    it('should show error toast with red background', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-red-500');
    });

    it('should show warning toast with yellow background', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-500');
    });

    it('should show info toast with blue background', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-blue-500');
    });
  });

  describe('Toast Display', () => {
    it('should display toast message', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should render toast with alert role', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should display close button', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByRole('button', { name: /close|fermer/i })).toBeInTheDocument();
    });
  });

  describe('Multiple Toasts', () => {
    it('should display multiple toasts simultaneously', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Info'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('should stack toasts in container', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
    });
  });

  describe('Toast Dismissal', () => {
    it('should remove toast when close button is clicked', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /close|fermer/i }));
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('should auto-dismiss toast after default duration', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Fast-forward 5 seconds (default duration)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('should not auto-dismiss when duration is 0', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('No Auto Dismiss'));
      expect(screen.getByText('No auto dismiss')).toBeInTheDocument();

      // Fast-forward 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should still be there
      expect(screen.getByText('No auto dismiss')).toBeInTheDocument();
    });

    it('should respect custom duration', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Custom Duration'));
      expect(screen.getByText('Custom toast')).toBeInTheDocument();

      // Fast-forward 5 seconds (less than custom duration)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should still be there
      expect(screen.getByText('Custom toast')).toBeInTheDocument();

      // Fast-forward another 5 seconds (total 10 seconds)
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.queryByText('Custom toast')).not.toBeInTheDocument();
    });
  });

  describe('Toast Container', () => {
    it('should not render container when no toasts', () => {
      renderWithToastProvider();

      const container = document.querySelector('.fixed.bottom-4.right-4');
      expect(container).not.toBeInTheDocument();
    });

    it('should render container when toasts exist', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const container = document.querySelector('.fixed.bottom-4.right-4');
      expect(container).toBeInTheDocument();
    });

    it('should position container at bottom right', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const container = document.querySelector('.fixed');
      expect(container).toHaveClass('bottom-4');
      expect(container).toHaveClass('right-4');
    });

    it('should have high z-index for visibility', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const container = document.querySelector('.fixed');
      expect(container).toHaveClass('z-50');
    });
  });

  describe('Toast Styling', () => {
    it('should have minimum width', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByRole('alert');
      // Component uses min-w-[280px] (mobile-friendly width).
      expect(toast).toHaveClass('min-w-[280px]');
    });

    it('should have animation class', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('animate-slide-in');
    });

    it('should have white text color', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('text-white');
    });

    it('should have padding', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('px-4');
      expect(toast).toHaveClass('py-3');
    });

    it('should have rounded corners', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('rounded-lg');
    });

    it('should have shadow', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('shadow-lg');
    });
  });

  describe('Accessibility', () => {
    it('should use alert role for toast notifications', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Error'));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have accessible close button', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));

      const closeButton = screen.getByRole('button', { name: /close|fermer/i });
      // Component uses i18n: 'Fermer' in fr.json, fallback to 'Close'.
      expect(closeButton).toHaveAttribute('aria-label', expect.stringMatching(/close|fermer/i));
    });

    it('should announce toast messages to screen readers', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Error'));

      // role="alert" automatically announces to screen readers
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Error message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toast creation', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // Rapidly click multiple buttons
      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Warning'));
      await user.click(screen.getByText('Show Info'));
      await user.click(screen.getByText('Show Success'));

      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBe(5);
    });

    it('should handle toast with empty message', async () => {
      // This tests the context function directly through a modified component
      const EmptyMessageTest = () => {
        const toast = useToast();
        return <button onClick={() => toast.success('')}>Empty Toast</button>;
      };

      render(
        <ToastProvider>
          <EmptyMessageTest />
        </ToastProvider>
      );

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(screen.getByText('Empty Toast'));

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should generate unique IDs for toasts', async () => {
      renderWithToastProvider();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Success'));

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
      // Both should exist independently
    });
  });
});
