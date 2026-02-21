/**
 * E2E Tests — Connexion (Login)
 * Tests the full login flow with mocked API responses.
 */

import { test, expect } from '@playwright/test';

// Mock unauthenticated state
async function mockUnauthenticated(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  );
}

test.describe('Connexion (Login)', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
  });

  test('should display login form with email and password fields', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page.locator('h1')).toBeVisible();

    // Check form fields
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check link to register
    await expect(page.locator('a[href="/register"]')).toBeVisible();

    // Check forgot password link
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    let loggedIn = false;

    // Mock login API
    await page.route('**/api/v1/auth/login', async (route) => {
      loggedIn = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
            },
          },
        }),
      });
    });

    // After login, auth/me returns the user
    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', (route) => {
      if (loggedIn) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
            },
          }),
        });
      }
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });

    // Mock projects fetch (dashboard will request this)
    await page.route('**/api/v1/projects*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
      })
    );

    await page.goto('/login');

    // Fill form
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show error toast on invalid credentials', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Invalid credentials' },
        }),
      })
    );

    await page.goto('/login');

    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('wrongpassword');

    await page.locator('button[type="submit"]').click();

    // Should show error toast
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show loading state during login', async ({ page }) => {
    // Delay the login response
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' },
          },
        }),
      });
    });

    await page.goto('/login');

    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Button should be disabled during loading
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should navigate to register page via link', async ({ page }) => {
    await page.goto('/login');

    await page.locator('a[href="/register"]').click();

    await expect(page).toHaveURL(/\/register/);
  });

  test('should require email and password before submission', async ({ page }) => {
    await page.goto('/login');

    // Try to submit with empty fields — HTML validation blocks
    await page.locator('button[type="submit"]').click();

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to dashboard if already authenticated', async ({ page }) => {
    // Override: user is already authenticated
    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'user' },
        }),
      })
    );

    // Mock projects for dashboard
    await page.route('**/api/v1/projects*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
      })
    );

    await page.goto('/login');

    // PublicRoute should redirect authenticated users to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should handle network error gracefully', async ({ page }) => {
    await page.route('**/api/v1/auth/login', (route) =>
      route.abort('connectionrefused')
    );

    await page.goto('/login');

    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('button[type="submit"]').click();

    // Should show error toast
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
