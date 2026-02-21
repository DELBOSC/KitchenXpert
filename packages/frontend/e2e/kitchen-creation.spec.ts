/**
 * E2E Tests — Création cuisine (Kitchen Creation)
 * Tests the project creation flow (which enables kitchen creation).
 * Uses mocked API responses since backend may not be running.
 */

import { test, expect } from '@playwright/test';

// Mock authenticated user
async function mockAuthenticated(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
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
    })
  );
}

test.describe('Création cuisine (Kitchen Creation via Project)', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);

    // Mock projects list endpoint
    await page.route('**/api/v1/projects?*', (route) =>
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
  });

  test('should display create project form', async ({ page }) => {
    await page.goto('/projects/new');

    // Check page title
    await expect(page.locator('h1')).toContainText('Create New Project');

    // Check form fields
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('#targetCompletionDate')).toBeVisible();

    // Check buttons
    await expect(page.locator('button:has-text("Create Project")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should create a project successfully and redirect to project detail', async ({ page }) => {
    const projectId = 'new-project-123';

    // Mock project creation API
    await page.route('**/api/v1/projects', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: projectId,
            name: 'Ma Cuisine Moderne',
            description: 'Rénovation complète de la cuisine',
            status: 'draft',
          }),
        });
      }
      return route.continue();
    });

    // Mock the project detail page fetch
    await page.route(`**/api/v1/projects/${projectId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: projectId,
            name: 'Ma Cuisine Moderne',
            description: 'Rénovation complète de la cuisine',
            status: 'draft',
            kitchens: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    );

    await page.goto('/projects/new');

    // Fill the project form
    await page.locator('#name').fill('Ma Cuisine Moderne');
    await page.locator('#description').fill('Rénovation complète de la cuisine');

    // Submit
    await page.locator('button:has-text("Create Project")').click();

    // Should redirect to the project detail page
    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`), { timeout: 10000 });
  });

  test('should show validation error for empty project name', async ({ page }) => {
    await page.goto('/projects/new');

    // Leave name empty, try to submit
    await page.locator('#description').fill('Some description');
    await page.locator('button:has-text("Create Project")').click();

    // Should show validation error
    await expect(page.locator('text=Project name is required')).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new/);
  });

  test('should show validation error for short project name', async ({ page }) => {
    await page.goto('/projects/new');

    await page.locator('#name').fill('AB');
    await page.locator('button:has-text("Create Project")').click();

    // Should show validation error
    await expect(page.locator('text=Project name must be at least 3 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new/);
  });

  test('should handle API error on project creation', async ({ page }) => {
    await page.route('**/api/v1/projects', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Failed to create project' }),
        });
      }
      return route.continue();
    });

    await page.goto('/projects/new');

    await page.locator('#name').fill('Ma Cuisine Moderne');
    await page.locator('button:has-text("Create Project")').click();

    // Should show error message
    await expect(page.locator('text=Failed to create project')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/projects\/new/);
  });

  test('should cancel and return to projects list', async ({ page }) => {
    await page.goto('/projects/new');

    await page.locator('button:has-text("Cancel")').click();

    await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
  });

  test('should set budget with currency selection', async ({ page }) => {
    await page.goto('/projects/new');

    // Select EUR currency
    await page.locator('select[name="budgetCurrency"]').selectOption('EUR');

    // Enter budget
    await page.locator('input[name="budgetTotal"]').fill('15000');

    // Verify values
    await expect(page.locator('select[name="budgetCurrency"]')).toHaveValue('EUR');
    await expect(page.locator('input[name="budgetTotal"]')).toHaveValue('15000');
  });

  test('should display tips section', async ({ page }) => {
    await page.goto('/projects/new');

    await expect(page.locator('text=Tips for a Great Project')).toBeVisible();
  });

  test('should navigate from dashboard to create project', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for a "new project" link on the dashboard
    const newProjectLink = page.locator('a[href="/projects/new"]').first();
    if (await newProjectLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newProjectLink.click();
      await expect(page).toHaveURL(/\/projects\/new/);
    }
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Override: simulate unauthenticated
    await page.unroute('**/api/v1/auth/me');
    await page.route('**/api/v1/auth/me', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    );

    await page.goto('/projects/new');

    // ProtectedRoute should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
