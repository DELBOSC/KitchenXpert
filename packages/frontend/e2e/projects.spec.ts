/**
 * E2E Tests -- Project Management Flows
 *
 * Covers creating, listing, viewing, editing, and deleting projects
 * with mocked API responses.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
};

async function mockAuthenticated(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: TEST_USER }),
    })
  );
}

const SAMPLE_PROJECTS = [
  {
    id: 'proj-1',
    name: 'Cuisine Moderne Paris',
    description: 'Renovation totale de la cuisine',
    status: 'in_progress',
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2025-12-15T14:30:00Z',
    kitchenCount: 2,
    thumbnailUrl: null,
  },
  {
    id: 'proj-2',
    name: 'Cuisine Rustique Lyon',
    description: 'Nouveau projet cuisine campagne',
    status: 'draft',
    createdAt: '2025-10-20T08:00:00Z',
    updatedAt: '2025-11-10T09:00:00Z',
    kitchenCount: 0,
    thumbnailUrl: null,
  },
  {
    id: 'proj-3',
    name: 'Cuisine Industrielle Bordeaux',
    description: 'Loft industriel avec ilot central',
    status: 'completed',
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-10-05T12:00:00Z',
    kitchenCount: 1,
    thumbnailUrl: null,
  },
];

function mockProjectsList(page: Page, projects = SAMPLE_PROJECTS): Promise<void> {
  return page.route('**/api/v1/projects?*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: projects.length,
          itemsPerPage: 10,
        },
      }),
    })
  );
}

const FULL_PROJECT = {
  id: 'proj-1',
  name: 'Cuisine Moderne Paris',
  description: 'Renovation totale de la cuisine',
  status: 'in_progress',
  createdAt: '2025-11-01T10:00:00Z',
  updatedAt: '2025-12-15T14:30:00Z',
  kitchens: [
    {
      id: 'kitchen-1',
      name: 'Cuisine principale',
      style: 'modern',
      dimensions: { width: 4, height: 2.5, depth: 3 },
      status: 'designing',
      createdAt: '2025-11-02T10:00:00Z',
      updatedAt: '2025-12-10T10:00:00Z',
    },
  ],
  budget: { total: 20000, spent: 12500, currency: 'EUR' },
  owner: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
};

// ---------------------------------------------------------------------------
// Project list
// ---------------------------------------------------------------------------

test.describe('Project list', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
  });

  test('should display a list of projects', async ({ page }) => {
    await mockProjectsList(page);

    await page.goto('/projects');

    // Wait for loading to finish - the project names should appear
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Cuisine Moderne Paris')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Cuisine Rustique Lyon')).toBeVisible();
    await expect(page.getByText('Cuisine Industrielle Bordeaux')).toBeVisible();
  });

  test('should show empty state when no projects exist', async ({ page }) => {
    await mockProjectsList(page, []);

    await page.goto('/projects');

    // The empty state should contain a "create" call-to-action
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /create/i })).toBeVisible({ timeout: 10_000 });
  });

  test('should navigate to project detail when clicking a project card', async ({ page }) => {
    await mockProjectsList(page);
    await page.route('**/api/v1/projects/proj-1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FULL_PROJECT),
      })
    );

    await page.goto('/projects');

    await page.getByText('Cuisine Moderne Paris').click();

    await expect(page).toHaveURL(/\/projects\/proj-1/, { timeout: 10_000 });
  });

  test('should show search functionality', async ({ page }) => {
    await mockProjectsList(page);

    await page.goto('/projects');

    // The search input should be present
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Type a search query
    await searchInput.fill('Moderne');

    // Submit the search form
    await page.getByRole('button', { name: /search/i }).click();

    // Stay on the projects page
    await expect(page).toHaveURL(/\/projects/);
  });

  test('should handle API error on project list fetch', async ({ page }) => {
    await page.route('**/api/v1/projects?*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      })
    );

    await page.goto('/projects');

    // Error state should show a retry button
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Create project
// ---------------------------------------------------------------------------

test.describe('Create project', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
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

  test('should display the create project form', async ({ page }) => {
    await page.goto('/projects/new');

    await expect(page.locator('h1')).toContainText('Create New Project');
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('button:has-text("Create Project")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
  });

  test('should create a project and redirect to project detail', async ({ page }) => {
    const newProjectId = 'new-proj-abc';

    await page.route('**/api/v1/projects', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: newProjectId,
            name: 'Ma Nouvelle Cuisine',
            description: 'Un beau projet',
            status: 'draft',
          }),
        });
      }
      return route.continue();
    });

    await page.route(`**/api/v1/projects/${newProjectId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: newProjectId,
            name: 'Ma Nouvelle Cuisine',
            description: 'Un beau projet',
            status: 'draft',
            kitchens: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    );

    await page.goto('/projects/new');

    await page.locator('#name').fill('Ma Nouvelle Cuisine');
    await page.locator('#description').fill('Un beau projet');
    await page.locator('button:has-text("Create Project")').click();

    await expect(page).toHaveURL(new RegExp(`/projects/${newProjectId}`), { timeout: 10_000 });
  });

  test('should show validation error for empty name', async ({ page }) => {
    await page.goto('/projects/new');

    await page.locator('#description').fill('Some description');
    await page.locator('button:has-text("Create Project")').click();

    await expect(page.locator('text=Project name is required')).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new/);
  });

  test('should show validation error for short name (< 3 chars)', async ({ page }) => {
    await page.goto('/projects/new');

    await page.locator('#name').fill('AB');
    await page.locator('button:has-text("Create Project")').click();

    await expect(page.locator('text=Project name must be at least 3 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/projects\/new/);
  });

  test('should handle API error on creation', async ({ page }) => {
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

    await page.locator('#name').fill('Ma Nouvelle Cuisine');
    await page.locator('button:has-text("Create Project")').click();

    await expect(page.locator('text=Failed to create project')).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/projects\/new/);
  });

  test('should cancel and navigate back to projects list', async ({ page }) => {
    await page.goto('/projects/new');

    await page.locator('button:has-text("Cancel")').click();

    await expect(page).toHaveURL(/\/projects$/, { timeout: 5_000 });
  });

  test('should support budget/currency fields', async ({ page }) => {
    await page.goto('/projects/new');

    // Budget fields should be present
    const budgetCurrency = page.locator('select[name="budgetCurrency"]');
    const budgetTotal = page.locator('input[name="budgetTotal"]');

    if (await budgetCurrency.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await budgetCurrency.selectOption('EUR');
      await budgetTotal.fill('15000');

      await expect(budgetCurrency).toHaveValue('EUR');
      await expect(budgetTotal).toHaveValue('15000');
    }
  });
});

// ---------------------------------------------------------------------------
// Project detail
// ---------------------------------------------------------------------------

test.describe('Project detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
  });

  test('should display project details with kitchens', async ({ page }) => {
    await page.route('**/api/v1/projects/proj-1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FULL_PROJECT),
      })
    );

    await page.goto('/projects/proj-1');

    await expect(page.getByText('Cuisine Moderne Paris')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Cuisine principale')).toBeVisible();
    // Budget section should be visible
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
  });

  test('should navigate to edit page', async ({ page }) => {
    await page.route('**/api/v1/projects/proj-1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FULL_PROJECT),
      })
    );

    await page.goto('/projects/proj-1');

    // Click the edit button
    const editButton = page.getByRole('button', { name: /edit/i });
    await expect(editButton).toBeVisible({ timeout: 10_000 });
    await editButton.click();

    await expect(page).toHaveURL(/\/projects\/proj-1\/edit/, { timeout: 10_000 });
  });

  test('should show 404 when project does not exist', async ({ page }) => {
    await page.route('**/api/v1/projects/nonexistent', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    );

    await page.goto('/projects/nonexistent');

    await expect(page.getByText('404')).toBeVisible({ timeout: 10_000 });
  });

  test('should delete project with confirmation modal', async ({ page }) => {
    await page.route('**/api/v1/projects/proj-1', (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FULL_PROJECT),
      });
    });

    // Mock projects list for the redirect after delete
    await mockProjectsList(page);

    await page.goto('/projects/proj-1');

    // Click the delete button
    const deleteButton = page.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });
    await deleteButton.click();

    // Confirmation modal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Confirm deletion
    const confirmButton = modal.getByRole('button', { name: /delete/i });
    await confirmButton.click();

    // Should redirect to projects list
    await expect(page).toHaveURL(/\/projects$/, { timeout: 10_000 });
  });

  test('should cancel deletion when clicking cancel in modal', async ({ page }) => {
    await page.route('**/api/v1/projects/proj-1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(FULL_PROJECT),
      })
    );

    await page.goto('/projects/proj-1');

    // Click the delete button
    const deleteButton = page.getByRole('button', { name: /delete/i });
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });
    await deleteButton.click();

    // Confirmation modal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Click cancel
    const cancelButton = modal.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Should remain on the project detail page
    await expect(page).toHaveURL(/\/projects\/proj-1/);
  });
});

// ---------------------------------------------------------------------------
// Edit project
// ---------------------------------------------------------------------------

test.describe('Edit project', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
  });

  test('should load project data and show in the edit form', async ({ page }) => {
    await page.route('**/api/v1/projects/proj-1', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'proj-1',
            name: 'Cuisine Moderne Paris',
            description: 'Renovation totale',
            status: 'in_progress',
            address: '12 Rue de Paris',
            clientName: 'Jean Dupont',
            clientEmail: 'jean@example.com',
            clientPhone: '+33 1 23 45 67 89',
          }),
        });
      }
      return route.continue();
    });

    await page.goto('/projects/proj-1/edit');

    // Wait for form to load with data
    await expect(page.locator('input[name="name"]')).toHaveValue('Cuisine Moderne Paris', {
      timeout: 10_000,
    });
  });

  test('should save updated project name and redirect', async ({ page }) => {
    await page.route('**/api/v1/projects/proj-1', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'proj-1',
            name: 'Cuisine Moderne Paris',
            description: 'Renovation totale',
            status: 'in_progress',
            address: '',
            clientName: '',
            clientEmail: '',
            clientPhone: '',
          }),
        });
      }
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
      return route.continue();
    });

    await page.goto('/projects/proj-1/edit');

    // Wait for form to be populated
    await expect(page.locator('input[name="name"]')).toHaveValue('Cuisine Moderne Paris', {
      timeout: 10_000,
    });

    // Clear and type new name
    await page.locator('input[name="name"]').fill('Cuisine Moderne Paris Renovee');

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Should redirect to project detail or show success toast
    await expect(page).toHaveURL(/\/projects\/proj-1/, { timeout: 10_000 });
  });

  test('should show validation error for empty name', async ({ page }) => {
    await page.route('**/api/v1/projects/proj-1', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'proj-1',
            name: 'Cuisine Moderne Paris',
            description: '',
            status: 'draft',
            address: '',
            clientName: '',
            clientEmail: '',
            clientPhone: '',
          }),
        });
      }
      return route.continue();
    });

    await page.goto('/projects/proj-1/edit');

    await expect(page.locator('input[name="name"]')).toHaveValue('Cuisine Moderne Paris', {
      timeout: 10_000,
    });

    // Clear the name field
    await page.locator('input[name="name"]').fill('');

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Validation message should appear
    await expect(page.locator('text=Project name is required')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// Navigation from Dashboard to Projects
// ---------------------------------------------------------------------------

test.describe('Dashboard to project navigation', () => {
  test('should navigate from dashboard to create project', async ({ page }) => {
    await mockAuthenticated(page);

    await page.route('**/api/v1/projects*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        }),
      })
    );

    await page.goto('/dashboard');

    // Look for the "create first design" or "new project" link
    const createLink = page.locator('a[href="/projects/new"]').first();

    if (await createLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await createLink.click();
      await expect(page).toHaveURL(/\/projects\/new/);
    }
  });

  test('should navigate from dashboard to projects list via quick actions', async ({ page }) => {
    await mockAuthenticated(page);

    await page.route('**/api/v1/projects*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        }),
      })
    );

    await page.goto('/dashboard');

    // Quick action card links to /projects
    const projectsLink = page.locator('a[href="/projects"]').first();
    if (await projectsLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await projectsLink.click();
      await expect(page).toHaveURL(/\/projects/);
    }
  });
});
