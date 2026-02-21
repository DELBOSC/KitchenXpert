/**
 * E2E Tests — Inscription (Registration)
 * Tests the full user registration flow with mocked API responses.
 */

import { test, expect } from '@playwright/test';

// Mock API helper: intercept auth/me to simulate unauthenticated state
async function mockUnauthenticated(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({}) })
  );
}

test.describe('Inscription (Registration)', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnauthenticated(page);
  });

  test('should display registration form with all fields', async ({ page }) => {
    await page.goto('/register');

    // Check page title
    await expect(page.locator('h1')).toBeVisible();

    // Check all form fields exist
    await expect(page.locator('#firstName')).toBeVisible();
    await expect(page.locator('#lastName')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check link to login
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('should register successfully and redirect to dashboard', async ({ page }) => {
    // Mock successful registration API
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'user-1',
              email: 'jean@example.com',
              name: 'Jean Dupont',
              role: 'user',
            },
          },
        }),
      })
    );

    // After registration, auth/me returns the user (for ProtectedRoute)
    await page.unroute('**/api/v1/auth/me');
    let registered = false;
    await page.route('**/api/v1/auth/register', async (route) => {
      registered = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'user-1',
              email: 'jean@example.com',
              name: 'Jean Dupont',
              role: 'user',
            },
          },
        }),
      });
    });
    await page.route('**/api/v1/auth/me', (route) => {
      if (registered) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'user-1',
              email: 'jean@example.com',
              name: 'Jean Dupont',
              role: 'user',
            },
          }),
        });
      }
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/register');

    // Fill form
    await page.locator('#firstName').fill('Jean');
    await page.locator('#lastName').fill('Dupont');
    await page.locator('#email').fill('jean@example.com');
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('Password123!');

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/register');

    // Fill form with mismatched passwords
    await page.locator('#firstName').fill('Jean');
    await page.locator('#lastName').fill('Dupont');
    await page.locator('#email').fill('jean@example.com');
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('DifferentPassword!');

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should show error toast (password mismatch)
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });

    // Should stay on register page
    await expect(page).toHaveURL(/\/register/);
  });

  test('should show error when password is too short', async ({ page }) => {
    await page.goto('/register');

    await page.locator('#firstName').fill('Jean');
    await page.locator('#lastName').fill('Dupont');
    await page.locator('#email').fill('jean@example.com');
    await page.locator('#password').fill('short');
    await page.locator('#confirmPassword').fill('short');

    await page.locator('button[type="submit"]').click();

    // Should show error toast
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test('should show error on API failure (email already exists)', async ({ page }) => {
    await page.route('**/api/v1/auth/register', (route) =>
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Email already exists' },
        }),
      })
    );

    await page.goto('/register');

    await page.locator('#firstName').fill('Jean');
    await page.locator('#lastName').fill('Dupont');
    await page.locator('#email').fill('existing@example.com');
    await page.locator('#password').fill('Password123!');
    await page.locator('#confirmPassword').fill('Password123!');

    await page.locator('button[type="submit"]').click();

    // Should show error toast
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/register/);
  });

  test('should navigate to login page via link', async ({ page }) => {
    await page.goto('/register');

    await page.locator('a[href="/login"]').click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('should require all fields before submission', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form — HTML validation should prevent submission
    await page.locator('button[type="submit"]').click();

    // Should stay on register page (form validation prevents submission)
    await expect(page).toHaveURL(/\/register/);
  });
});
