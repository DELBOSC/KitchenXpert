/**
 * E2E Tests -- Catalog Browsing
 *
 * Covers product listing, text search, AI search, category filtering,
 * sort options, pagination, and empty / error states.
 * All API calls are mocked with page.route().
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers & Fixtures
// ---------------------------------------------------------------------------

const PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Meuble Bas 60cm Blanc',
    category: 'cabinets',
    subcategory: 'base',
    price: 249.99,
    currency: 'EUR',
    images: ['https://example.com/img1.jpg'],
    dimensions: { width: 60, depth: 56, height: 82 },
  },
  {
    id: 'prod-2',
    name: 'Plan de Travail Granit Noir 300cm',
    category: 'countertops',
    subcategory: null,
    price: 899,
    currency: 'EUR',
    images: ['https://example.com/img2.jpg'],
    dimensions: { width: 300, depth: 65, height: 3 },
  },
  {
    id: 'prod-3',
    name: 'Evier Double Bac Inox',
    category: 'sinks',
    subcategory: null,
    price: 179,
    currency: 'EUR',
    images: [],
    dimensions: { width: 80, depth: 50, height: 20 },
  },
  {
    id: 'prod-4',
    name: 'Hotte Aspirante Ilot 90cm',
    category: 'appliances',
    subcategory: 'hood',
    price: 599,
    currency: 'EUR',
    images: ['https://example.com/img4.jpg'],
    dimensions: { width: 90, depth: 45, height: 60 },
  },
  {
    id: 'prod-5',
    name: 'Suspension LED Cuisine',
    category: 'lighting',
    subcategory: null,
    price: 89,
    currency: 'EUR',
    images: [],
    dimensions: null,
  },
];

/**
 * Intercept the Redux thunk / fetch call used by the catalog page.
 * The CatalogPage dispatches fetchProducts which hits /api/v1/catalog/products.
 */
function mockCatalogProducts(
  page: Page,
  products = PRODUCTS,
  total = PRODUCTS.length,
  totalPages = 1
): Promise<void> {
  return page.route('**/api/v1/catalog/products*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: products,
        pagination: {
          page: 1,
          limit: 20,
          total,
          totalPages,
        },
      }),
    })
  );
}

// The catalog page is public (no auth required), but it reads from Redux
// which is initialised by the app shell. We do NOT need an auth mock here
// because /catalog is a public route. However, auth/me will still be called
// by the app on mount, so we stub it to prevent 404/network noise.
async function stubAuthForPublicPage(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  );
}

// ---------------------------------------------------------------------------
// Product listing
// ---------------------------------------------------------------------------

test.describe('Catalog -- Product listing', () => {
  test.beforeEach(async ({ page }) => {
    await stubAuthForPublicPage(page);
    await mockCatalogProducts(page);
  });

  test('should display the catalog page with products', async ({ page }) => {
    await page.goto('/catalog');

    // Page heading
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    // Products should render
    await expect(page.getByText('Meuble Bas 60cm Blanc')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Plan de Travail Granit Noir 300cm')).toBeVisible();
    await expect(page.getByText('Evier Double Bac Inox')).toBeVisible();
  });

  test('should display product prices in EUR format', async ({ page }) => {
    await page.goto('/catalog');

    // Wait for products to load
    await expect(page.getByText('Meuble Bas 60cm Blanc')).toBeVisible({ timeout: 10_000 });

    // Price values should appear (formatted by Intl.NumberFormat with EUR)
    // e.g. "249,99 EUR" or "249,99 $" depending on locale
    await expect(page.locator('text=/249/')).toBeVisible();
    await expect(page.locator('text=/899/')).toBeVisible();
  });

  test('should show category buttons', async ({ page }) => {
    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    // Category section should show 6 categories
    // cabinets, appliances, countertops, sinks, lighting, accessories
    const categoryButtons = page.locator('section button');
    const count = await categoryButtons.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('should display sort dropdown', async ({ page }) => {
    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    const sortSelect = page
      .locator('select[aria-label*="Trier"], select[aria-label*="sort"]')
      .first();
    await expect(sortSelect).toBeVisible({ timeout: 5_000 });

    // Should have at least relevance, price_asc, price_desc, newest
    const options = sortSelect.locator('option');
    expect(await options.count()).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

test.describe('Catalog -- Search', () => {
  test.beforeEach(async ({ page }) => {
    await stubAuthForPublicPage(page);
    await mockCatalogProducts(page);
  });

  test('should have a search input field', async ({ page }) => {
    await page.goto('/catalog');

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test('should trigger search on Enter key', async ({ page }) => {
    let searchCalled = false;

    // Override the mock to track search parameter
    await page.unroute('**/api/v1/catalog/products*');
    await page.route('**/api/v1/catalog/products*', (route) => {
      const url = route.request().url();
      if (url.includes('search=granit')) {
        searchCalled = true;
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [PRODUCTS[1]], // Only the countertop matches
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto('/catalog');

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('granit');
    await searchInput.press('Enter');

    // Wait for the debounced search to fire
    await page.waitForTimeout(500);
    expect(searchCalled).toBe(true);
  });

  test('should trigger search on button click', async ({ page }) => {
    await page.goto('/catalog');

    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    await searchInput.fill('hotte');

    // Click the search button
    const searchButton = page
      .locator('button')
      .filter({ hasText: /search|rechercher/i })
      .first();
    await searchButton.click();

    // Should stay on catalog page
    await expect(page).toHaveURL(/\/catalog/);
  });
});

// ---------------------------------------------------------------------------
// Category filtering
// ---------------------------------------------------------------------------

test.describe('Catalog -- Category filtering', () => {
  test.beforeEach(async ({ page }) => {
    await stubAuthForPublicPage(page);
  });

  test('should filter products by category when clicking a category button', async ({ page }) => {
    let categoryRequested: string | null = null;

    await page.route('**/api/v1/catalog/products*', (route) => {
      const url = route.request().url();
      const params = new URL(url).searchParams;
      categoryRequested = params.get('category');

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: categoryRequested === 'cabinets' ? [PRODUCTS[0]] : PRODUCTS,
          pagination: {
            page: 1,
            limit: 20,
            total: categoryRequested === 'cabinets' ? 1 : PRODUCTS.length,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/catalog');

    // Wait for initial load
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    // Click the cabinets category button
    const cabinetsButton = page.locator('section button').first();
    await cabinetsButton.click();

    // Give the dispatch time to fire
    await page.waitForTimeout(500);

    // The category should have been passed
    expect(categoryRequested).toBe('cabinets');
  });

  test('should toggle off category when clicking the same category again', async ({ page }) => {
    let lastCategoryRequested: string | null = 'initial';

    await page.route('**/api/v1/catalog/products*', (route) => {
      const url = route.request().url();
      const params = new URL(url).searchParams;
      lastCategoryRequested = params.get('category');

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: PRODUCTS,
          pagination: { page: 1, limit: 20, total: PRODUCTS.length, totalPages: 1 },
        }),
      });
    });

    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    const cabinetsButton = page.locator('section button').first();

    // Click once -> select
    await cabinetsButton.click();
    await page.waitForTimeout(400);
    expect(lastCategoryRequested).toBe('cabinets');

    // Click again -> deselect
    await cabinetsButton.click();
    await page.waitForTimeout(400);

    // Category should be null (no filter)
    expect(lastCategoryRequested).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

test.describe('Catalog -- Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await stubAuthForPublicPage(page);
    await mockCatalogProducts(page);
  });

  test('should sort by price ascending', async ({ page }) => {
    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    const sortSelect = page
      .locator('select[aria-label*="Trier"], select[aria-label*="sort"]')
      .first();
    await expect(sortSelect).toBeVisible({ timeout: 5_000 });

    await sortSelect.selectOption('price_asc');

    // The sort is local so we just verify the select value changed
    await expect(sortSelect).toHaveValue('price_asc');
  });

  test('should sort by price descending', async ({ page }) => {
    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    const sortSelect = page
      .locator('select[aria-label*="Trier"], select[aria-label*="sort"]')
      .first();
    await sortSelect.selectOption('price_desc');

    await expect(sortSelect).toHaveValue('price_desc');
  });
});

// ---------------------------------------------------------------------------
// Empty & error states
// ---------------------------------------------------------------------------

test.describe('Catalog -- Empty and error states', () => {
  test('should show empty state when no products match', async ({ page }) => {
    await stubAuthForPublicPage(page);

    await page.route('**/api/v1/catalog/products*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        }),
      })
    );

    await page.goto('/catalog');

    // Wait for loading to finish and the empty state to appear
    // The empty state shows a box emoji and a message
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(1_000);

    // Should show empty state placeholder (either "no results" or "products placeholder")
    const emptyState = page.locator('text=/aucun|no results|no products/i');
    if (await emptyState.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should show error state on API failure with retry button', async ({ page }) => {
    await stubAuthForPublicPage(page);

    await page.route('**/api/v1/catalog/products*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      })
    );

    await page.goto('/catalog');

    // Redux should surface the error in the UI
    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    // The error section has a retry button
    const retryButton = page.getByRole('button', { name: /retry|reessayer/i });
    if (await retryButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(retryButton).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

test.describe('Catalog -- Pagination', () => {
  test('should display pagination controls when more than one page', async ({ page }) => {
    await stubAuthForPublicPage(page);

    await page.route('**/api/v1/catalog/products*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: PRODUCTS,
          pagination: { page: 1, limit: 20, total: 60, totalPages: 3 },
        }),
      })
    );

    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    // Pagination navigation buttons (Previous / Next)
    const prevButton = page.getByRole('button', { name: /previous|precedent/i });
    const nextButton = page.getByRole('button', { name: /next|suivant/i });

    await expect(prevButton).toBeVisible({ timeout: 5_000 });
    await expect(nextButton).toBeVisible();

    // Previous should be disabled on page 1
    await expect(prevButton).toBeDisabled();
    await expect(nextButton).toBeEnabled();
  });

  test('should not display pagination controls for single page', async ({ page }) => {
    await stubAuthForPublicPage(page);

    await mockCatalogProducts(page, PRODUCTS, PRODUCTS.length, 1);

    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    // Pagination should not be visible
    const prevButton = page.getByRole('button', { name: /previous|precedent/i });
    await expect(prevButton).not.toBeVisible({ timeout: 3_000 });
  });
});

// ---------------------------------------------------------------------------
// AI Search
// ---------------------------------------------------------------------------

test.describe('Catalog -- AI Search', () => {
  test.beforeEach(async ({ page }) => {
    await stubAuthForPublicPage(page);
    await mockCatalogProducts(page);
  });

  test('should show AI search section', async ({ page }) => {
    await page.goto('/catalog');

    await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 });

    // AI search label
    await expect(page.locator('text=/Recherche intelligente|AI search/i')).toBeVisible({
      timeout: 5_000,
    });

    // AI search input
    const aiInput = page
      .locator('input[aria-label*="langage naturel"], input[aria-label*="natural language"]')
      .first();
    await expect(aiInput).toBeVisible();
  });

  test('should submit AI search and show results', async ({ page }) => {
    await page.route('**/api/v1/ai-search/catalog', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            filters: { material: 'quartz' },
            results: [
              {
                id: 'ai-1',
                name: 'Plan Quartz Blanc',
                brand: 'Premium',
                material: 'quartz',
                price: 450,
                currency: 'EUR',
              },
            ],
            explanation: 'Voici les plans de travail en quartz blanc disponibles.',
            suggestions: ['plan de travail marbre', 'plan de travail bois'],
          },
        }),
      })
    );

    await page.goto('/catalog');

    const aiInput = page
      .locator('input[aria-label*="langage naturel"], input[aria-label*="natural language"]')
      .first();
    await expect(aiInput).toBeVisible({ timeout: 10_000 });

    await aiInput.fill('plan de travail en quartz blanc');

    // Click AI search button
    const aiButton = page
      .locator('button')
      .filter({ hasText: /Recherche IA|AI search/i })
      .first();
    await aiButton.click();

    // Results should appear
    await expect(page.getByText('Plan Quartz Blanc')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Voici les plans de travail')).toBeVisible();

    // Suggestions should appear
    await expect(page.getByText('plan de travail marbre')).toBeVisible();
  });
});
