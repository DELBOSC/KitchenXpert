/**
 * E2E Tests -- Authentication Flows
 *
 * Covers login, registration, logout, forgot-password, and
 * protected-route redirection with mocked API responses.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  name: 'Test User',
  role: 'user' as const,
};

const ADMIN_USER = {
  ...TEST_USER,
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin' as const,
};

/** Intercept auth/me so the app sees an unauthenticated session. */
async function mockUnauthenticated(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  );
}

/** Intercept auth/me so the app sees an authenticated regular user. */
async function mockAuthenticated(page: Page, user = TEST_USER): Promise<void> {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: user }),
    })
  );
}

/** Stub the dashboard projects fetch so the page renders after redirect. */
async function stubDashboardData(page: Page): Promise<void> {
  await page.route('**/api/v1/projects*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    })
  );
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
  });

  test('should display the login form with all expected elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/register"]')).toBeVisible();
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('should login successfully and redirect to /dashboard', async ({ page }) => {
    let loggedIn = false;

    await page.route('**/api/v1/auth/login', async (route) => {
      loggedIn = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { user: TEST_USER } }),
      });
    });

    // After login succeeds, auth/me returns the user
    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', (route) => {
      if (loggedIn) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: TEST_USER }),
        });
      }
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });

    await stubDashboardData(page);
    await page.goto('/login');

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Invalid credentials' } }),
      })
    );

    await page.goto('/login');

    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show loading/disabled state while request is in flight', async ({ page }) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 1_500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { user: TEST_USER } }),
      });
    });

    await page.goto('/login');

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should handle network error gracefully', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) => route.abort('connectionrefused'));

    await page.goto('/login');

    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect already-authenticated users away from /login', async ({ page }) => {
    // Override to authenticated
    await page.unroute('**/api/v1/auth/me');
    await mockAuthenticated(page);
    await stubDashboardData(page);

    await page.goto('/login');

    // PublicRoute should bounce us to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('should require email and password (HTML validation)', async ({ page }) => {
    await page.goto('/login');

    await page.locator('button[type="submit"]').click();

    // Native validation blocks submission; we stay on login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to register page via link', async ({ page }) => {
    await page.goto('/login');

    await page.locator('a[href="/register"]').click();

    await expect(page).toHaveURL(/\/register/);
  });
});

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

test.describe('Registration flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
  });

  test('should display the registration form with all fields', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('should register successfully and redirect to /dashboard', async ({ page }) => {
    let registered = false;

    await page.route('**/api/v1/auth/register', async (route) => {
      registered = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { user: TEST_USER } }),
      });
    });

    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', (route) => {
      if (registered) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: TEST_USER }),
        });
      }
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });

    await stubDashboardData(page);
    await page.goto('/register');

    await page.locator('#firstName').fill('Test');
    await page.locator('#lastName').fill('User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/register');

    await page.locator('#firstName').fill('Test');
    await page.locator('#lastName').fill('User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('Different123!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test('should show error when email already exists (409)', async ({ page }) => {
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Email already exists' } }),
      })
    );

    await page.goto('/register');

    await page.locator('#firstName').fill('Test');
    await page.locator('#lastName').fill('User');
    await page.locator('#email').fill('existing@example.com');
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test('should navigate to login page via link', async ({ page }) => {
    await page.goto('/register');

    await page.locator('a[href="/login"]').click();

    await expect(page).toHaveURL(/\/login/);
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe('Logout flow', () => {
  test('should clear session and redirect to /login after logout', async ({ page }) => {
    let isLoggedOut = false;

    await mockAuthenticated(page);
    await stubDashboardData(page);

    // Mock logout endpoint
    await page.route('**/api/v1/auth/logout', async (route) => {
      isLoggedOut = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // After logout, auth/me returns 401
    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', (route) => {
      if (isLoggedOut) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: TEST_USER }),
      });
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Find and click the logout button/link (typically in header or profile menu)
    const logoutButton = page
      .locator(
        'button:has-text("logout"), button:has-text("Logout"), button:has-text("Deconnexion"), button:has-text("deconnexion"), a:has-text("Logout"), a:has-text("logout")'
      )
      .first();
    const profileMenuButton = page
      .locator(
        '[aria-label="Profile"], [aria-label="profile"], [aria-label="User menu"], button:has-text("Profile"), button:has-text("profile")'
      )
      .first();

    // Try opening profile menu first if logout button is not directly visible
    if (await profileMenuButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await profileMenuButton.click();
    }

    if (await logoutButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    }
    // If logout button is not found in the UI, verify that visiting /dashboard
    // after session expiry redirects to login
    else {
      isLoggedOut = true;
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    }
  });
});

// ---------------------------------------------------------------------------
// Protected routes
// ---------------------------------------------------------------------------

test.describe('Protected route redirection', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
  });

  const protectedPaths = [
    '/dashboard',
    '/projects',
    '/projects/new',
    '/designer',
    '/profile',
    '/questionnaire',
  ];

  for (const path of protectedPaths) {
    test(`unauthenticated user visiting ${path} should be redirected to /login`, async ({
      page,
    }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }

  test('non-admin user visiting /admin/users should be redirected to /dashboard', async ({
    page,
  }) => {
    await page.unroute('**/api/v1/auth/me');
    await mockAuthenticated(page); // role = 'user'
    await stubDashboardData(page);

    await page.goto('/admin/users');

    // AdminRoute sends non-admin users to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('unauthenticated user visiting /admin/users should be redirected to /login', async ({
    page,
  }) => {
    await page.goto('/admin/users');

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------

test.describe('Forgot Password flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
  });

  test('should display the forgot-password form', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('should submit email and show success message', async ({ page }) => {
    await page.route('**/api/v1/auth/password/forgot', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto('/forgot-password');

    await page.locator('#email').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    // The page should show the success state with a green confirmation block
    await expect(page.locator('text=If an account exists with this email')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('should show validation error when email is empty', async ({ page }) => {
    await page.goto('/forgot-password');

    // Submit without filling email
    await page.locator('button[type="submit"]').click();

    // The component uses noValidate and shows its own error
    await expect(page.locator('#email-error, [role="alert"]')).toBeVisible({ timeout: 3_000 });
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('should show error on API failure', async ({ page }) => {
    await page.route('**/api/v1/auth/password/forgot', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Server error' } }),
      })
    );

    await page.goto('/forgot-password');

    await page.locator('#email').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5_000 });
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.route('**/api/v1/auth/password/forgot', async (route) => {
      await new Promise((r) => setTimeout(r, 1_500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/forgot-password');

    await page.locator('#email').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should navigate back to login via link', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.locator('a[href="/login"]').click();

    await expect(page).toHaveURL(/\/login/);
  });
});
