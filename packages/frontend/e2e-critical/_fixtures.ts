/**
 * Shared fixtures for the critical-flow E2E suite.
 *
 * These tests hit a REAL backend (the smoke runner spins up Postgres +
 * Redis + the API + the SPA). To keep them deterministic we:
 *   - generate a fresh email per test run (`u_<ts>_<rand>@e2e.local`)
 *   - tear down via the GDPR delete endpoint at the end of the test
 *   - inject Stripe test cards through the official Elements iframe
 *
 * Selectors are intentionally **role-based** (`getByRole`, `getByLabel`)
 * so they survive copy edits — only structural changes break them.
 */
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_BASE =
  process.env.E2E_API_URL || 'http://localhost:4000/api/v1';

export const STRIPE_TEST_CARDS = {
  // 3D-Secure 2 challenge — what we use to validate the SCA path
  sca3DS: '4000 0027 6000 3184',
  // Plain success — fast happy-path
  success: '4242 4242 4242 4242',
} as const;

// ---------------------------------------------------------------------------
// Test user lifecycle
// ---------------------------------------------------------------------------

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function newTestUser(): TestUser {
  const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `u_${id}@e2e.local`,
    password: 'Sup3rStr0ng!Test#Pass',
    firstName: 'E2E',
    lastName: 'Tester',
  };
}

/**
 * Register + verify (skipping email confirmation via the test backdoor).
 *
 * The backend exposes a dev-only endpoint `/auth/dev/verify-email` that is
 * mounted only when `NODE_ENV !== 'production'`. It is what makes the
 * critical suite runnable end-to-end without a real SMTP inbox.
 */
export async function registerAndVerify(
  request: APIRequestContext,
  user: TestUser,
): Promise<void> {
  const reg = await request.post(`${API_BASE}/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      acceptTos: true,
    },
  });
  expect(reg.ok(), `register failed: ${await reg.text()}`).toBeTruthy();

  // Bypass email click (non-prod backdoor)
  const verify = await request.post(`${API_BASE}/auth/dev/verify-email`, {
    data: { email: user.email },
  });
  if (!verify.ok()) {
    // Backdoor not present → the flow that needed it must be marked fixme
    throw new Error(
      `dev/verify-email backdoor missing — add it under NODE_ENV!=production`,
    );
  }
}

/** Delete the user via the RGPD endpoint so the suite leaves no residue. */
export async function deleteUser(
  request: APIRequestContext,
  authCookies: string,
): Promise<void> {
  await request.delete(`${API_BASE}/me/gdpr/account`, {
    headers: { Cookie: authCookies },
    data: { confirm: true, reason: 'e2e-cleanup' },
  });
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/** Submit the login form and wait for the dashboard redirect. */
export async function loginUI(page: Page, user: TestUser): Promise<void> {
  await page.goto('/fr/login');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/mot de passe|password/i).fill(user.password);
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 15_000 }),
    page.getByRole('button', { name: /se connecter|connexion|sign in/i }).click(),
  ]);
}

/** Read the current Set-Cookie chain — used for backend tear-down. */
export async function captureCookies(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

// ---------------------------------------------------------------------------
// Per-test fixture
// ---------------------------------------------------------------------------

type Fixtures = {
  /** Pre-registered + email-verified user, deleted in afterEach. */
  freshUser: TestUser;
};

export const test = base.extend<Fixtures>({
  // Dismiss the cookie-consent banner for every critical-flow test. It renders
  // fixed at the bottom (z-100) and its subtree intercepts pointer events on
  // full-width controls — notably the register submit button, which made all of
  // Flow 1 time out. Pre-seed the stored decision so the banner never mounts.
  // (Verified locally: banner present → submit click intercepted; pre-seeded →
  // banner absent → click passes.)
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'kx.cookie-consent.v1',
          JSON.stringify({
            necessary: true,
            analytics: false,
            marketing: false,
            decidedAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* localStorage not available before first navigation — ignored */
      }
    });
    await use(page);
  },
  freshUser: async ({ request }, use) => {
    const user = newTestUser();
    await registerAndVerify(request, user);
    await use(user);
    // Best-effort cleanup — never fails the test
    try {
      const login = await request.post(`${API_BASE}/auth/login`, {
        data: { email: user.email, password: user.password },
      });
      if (login.ok()) {
        const cookies = login.headers()['set-cookie'] || '';
        await request.delete(`${API_BASE}/me/gdpr/account`, {
          headers: { Cookie: cookies.split('\n').join('; ') },
          data: { confirm: true, reason: 'e2e-cleanup' },
        });
      }
    } catch {
      /* swallow */
    }
  },
});

export { expect };
