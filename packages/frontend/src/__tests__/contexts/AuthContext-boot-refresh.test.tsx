/**
 * Proof for the session-survival fix.
 *
 * The accessToken lives 15 min; the refreshToken lives 7 days (httpOnly cookie). Before
 * this fix, checkAuth did a raw /auth/me that bypassed api.ts's 401→refresh, so an expired
 * accessToken at boot logged the user out despite a valid refreshToken. checkAuth now
 * tries ONE /auth/refresh on 401, then retries /auth/me — the user stays authenticated.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function Probe() {
  const { isLoading, isAuthenticated } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</span>
      <span data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
    </div>
  );
}

describe('AuthContext — boot refreshes a 15-min-expired session via the 7-day refreshToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('🔒 /auth/me 401 → /auth/refresh 200 → /auth/me 200 → authenticated (no logout)', async () => {
    let meCalls = 0;
    let refreshCalled = false;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/auth/refresh')) {
        refreshCalled = true;
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      }
      // /auth/me: first call = expired accessToken (401); after refresh = 200 + user.
      meCalls += 1;
      if (meCalls === 1) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ success: true, data: { id: 'u1', email: 'demo@kitchenxpert.dev' } }),
      });
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('Authenticated'));
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    // The core of the fix: a refresh WAS attempted at boot. On the old raw-fetch code this
    // is false and the user ends up 'Not Authenticated' → this test fails.
    expect(refreshCalled).toBe(true);
  });

  it('a genuinely dead session (refresh also 401) resolves to unauthenticated', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })
    );
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading'));
    expect(screen.getByTestId('auth')).toHaveTextContent('Not Authenticated');
  });
});
