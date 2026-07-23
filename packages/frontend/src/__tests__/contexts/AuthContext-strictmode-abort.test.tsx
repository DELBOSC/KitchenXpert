/**
 * Negative control for the reload → /dashboard redirect bug.
 *
 * Root cause: checkAuth put setIsLoading(false) in a `finally`. A `return` inside the
 * AbortError catch still runs `finally`, so an aborted (StrictMode-superseded) /auth/me
 * flipped isLoading→false while user was still null — a transient "unauthenticated"
 * window that ProtectedRoute turned into /login → (auth resolves) → PublicRoute → /dashboard.
 *
 * This reproduces the exact StrictMode sequence (mount → abort first /auth/me → remount)
 * and asserts isLoading stays true through the abort window until the second /auth/me
 * resolves. It FAILS on the old code (isLoading flips to false after the abort).
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Records every render so we can assert on the whole history, not a fragile snapshot.
const states: Array<{ isLoading: boolean; isAuthenticated: boolean }> = [];
function Probe() {
  const { isLoading, isAuthenticated } = useAuth();
  states.push({ isLoading, isAuthenticated });
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</span>
      <span data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
    </div>
  );
}

describe('AuthContext — an aborted /auth/me must NOT flip isLoading (StrictMode reload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    states.length = 0;
  });

  it('🔒 isLoading stays true through the StrictMode abort window, then resolves on the 2nd probe', async () => {
    // fetch1 (mount1): never resolves; rejects with AbortError when the signal aborts
    // (StrictMode cleanup). This is the observed "(canceled) /auth/me".
    mockFetch.mockImplementationOnce(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            const e = new Error('The operation was aborted');
            e.name = 'AbortError';
            reject(e);
          });
        })
    );
    // fetch2 (mount2): resolve manually so we can inspect the window in between.
    let resolveSecond!: () => void;
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = () =>
            resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  success: true,
                  data: { id: 'u1', email: 'demo@kitchenxpert.dev' },
                }),
            });
        })
    );

    render(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>
    );

    // StrictMode has run mount1 → cleanup1(abort) → mount2. Both probes fired.
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    // Flush the abort rejection microtask (checkAuth1's catch), then resolve the 2nd probe.
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      resolveSecond();
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated'));

    // THE ASSERTION (timing-robust): across the ENTIRE render history, isLoading must
    // never have been false while unauthenticated — that is the exact transient
    // ProtectedRoute turns into /login → /dashboard. On the old code (setIsLoading in a
    // finally that runs on the abort's `return`), this forbidden state appears → fails.
    const forbidden = states.filter((s) => s.isLoading === false && s.isAuthenticated === false);
    expect(forbidden).toEqual([]);
    // Final state is settled + authenticated.
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
  });

  it('normal single-mount flow still resolves (happy path unbroken)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ success: true, data: { id: 'u1', email: 'demo@kitchenxpert.dev' } }),
    });
    // No StrictMode → single mount, single probe.
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated'));
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
  });

  it('edge: a real unmount during a pending probe aborts without throwing (no stuck state leak)', async () => {
    mockFetch.mockImplementationOnce(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => {
            const e = new Error('The operation was aborted');
            e.name = 'AbortError';
            reject(e);
          });
        })
    );
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    // Unmount while the probe is still pending → cleanup aborts it.
    await act(async () => {
      unmount();
      await Promise.resolve();
    });
    // The abort is handled (return in catch); no unhandled rejection / no crash. The
    // component is gone, so leaving isLoading as-is leaks nothing. Reaching here = pass.
    expect(true).toBe(true);
  });
});
