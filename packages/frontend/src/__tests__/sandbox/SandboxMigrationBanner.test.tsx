/**
 * Tests for SandboxMigrationBanner — focus on dual tracking at the two
 * completion call sites (import + delete). Both paths must emit:
 *
 *   1. trackSandbox('sandbox_signup_completed', { imported: 'yes'|'no' })
 *      → generic funnel event
 *   2. tagConversion('hero', 'sandbox_signup_completed_ab')
 *      → AB-sliced variant
 *
 * The banner renders nothing if no persisted sandbox is detected, so we
 * stub readPersistedSandbox to return a minimal snapshot, and
 * migrateSandboxToAccount to resolve to a project id.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

const mockSnapshot = {
  name: 'Ma cuisine démo',
  kitchen: {
    widthCm: 300,
    depthCm: 200,
    heightCm: 250,
    items: [{ id: 'item-1' }],
  },
  updatedAt: '2026-05-20T10:00:00.000Z',
  fromTemplate: null,
};

vi.mock('../../sandbox/store', () => ({
  readPersistedSandbox: vi.fn(() => mockSnapshot),
  clearPersistedSandbox: vi.fn(),
}));

vi.mock('../../sandbox/migrateSandbox', () => ({
  migrateSandboxToAccount: vi.fn(async () => 'project-42'),
}));

import { SandboxMigrationBanner } from '../../components/sandbox/SandboxMigrationBanner';

const renderBanner = () => {
  return render(
    <BrowserRouter>
      <SandboxMigrationBanner />
    </BrowserRouter>
  );
};

describe('SandboxMigrationBanner — dual tracking on completion', () => {
  let plausibleSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    plausibleSpy = vi.fn();
    window.plausible = plausibleSpy;
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'kx-ab-hero') {
        return 'A';
      }
      return null;
    });
  });

  afterEach(() => {
    delete window.plausible;
  });

  it('renders the banner with the snapshot name', () => {
    renderBanner();
    expect(screen.getByText(/ma cuisine démo/i)).toBeInTheDocument();
  });

  it('handleImport fires BOTH sandbox_signup_completed (yes) AND sandbox_signup_completed_ab', async () => {
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: /importer dans mon compte/i }));

    await waitFor(() => {
      expect(plausibleSpy).toHaveBeenCalledWith('sandbox_signup_completed', {
        props: { imported: 'yes' },
      });
    });
    expect(plausibleSpy).toHaveBeenCalledWith('sandbox_signup_completed_ab', {
      props: { experiment: 'hero', variant: 'A' },
    });
  });

  it('handleDelete fires BOTH sandbox_signup_completed (no) AND sandbox_signup_completed_ab', () => {
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: /supprimer la démo/i }));

    expect(plausibleSpy).toHaveBeenCalledWith('sandbox_signup_completed', {
      props: { imported: 'no' },
    });
    expect(plausibleSpy).toHaveBeenCalledWith('sandbox_signup_completed_ab', {
      props: { experiment: 'hero', variant: 'A' },
    });
    expect(plausibleSpy).toHaveBeenCalledTimes(2);
  });
});
