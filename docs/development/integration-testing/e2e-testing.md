# End-to-End Testing

**Last Updated:** 2026-01-10

## Table of Contents

- [Playwright Setup](#playwright-setup)
- [Writing E2E Tests](#writing-e2e-tests)
- [Page Object Model](#page-object-model)
- [Running E2E Tests](#running-e2e-tests)
- [Visual Regression Testing](#visual-regression-testing)
- [E2E Test Examples](#e2e-test-examples)
- [Best Practices](#best-practices)

## Playwright Setup

### Installation

```bash
# Install Playwright
pnpm add -D @playwright/test

# Install browsers
pnpm playwright install

# Install system dependencies (Linux)
pnpm playwright install-deps
```

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Writing E2E Tests

### Basic Test Structure

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect
    await expect(page).toHaveURL('/dashboard');

    // Verify logged in
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
```

### User Registration Flow

```typescript
// tests/e2e/registration.spec.ts
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('User Registration', () => {
  test('should complete registration flow', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    const email = faker.internet.email();
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.fill('input[name="name"]', faker.person.fullName());

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Account created')).toBeVisible();
  });
});
```

## Page Object Model

### Login Page Object

```typescript
// tests/e2e/pages/login.page.ts
import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    return await this.page.locator('[role="alert"]').textContent();
  }

  async isLoggedIn() {
    await this.page.waitForURL('/dashboard');
    return this.page.url().includes('/dashboard');
  }
}
```

### Design Page Object

```typescript
// tests/e2e/pages/design.page.ts
import { Page, expect } from '@playwright/test';

export class DesignPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/design');
  }

  async createNewDesign(name: string) {
    await this.page.click('button:has-text("New Design")');
    await this.page.fill('input[placeholder="Design name"]', name);
    await this.page.click('button:has-text("Create")');
  }

  async addAppliance(type: string) {
    await this.page.click(`[data-appliance="${type}"]`);
    await this.page.click('#canvas'); // Click on canvas to place
  }

  async saveDesign() {
    await this.page.click('button:has-text("Save")');
    await expect(this.page.locator('text=Design saved')).toBeVisible();
  }

  async getCanvasObjects() {
    return await this.page.evaluate(() => {
      // Access Three.js scene
      return window.designEngine.scene.children.length;
    });
  }
}
```

### Using Page Objects

```typescript
// tests/e2e/design-flow.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { DesignPage } from './pages/design.page';

test.describe('Design Creation Flow', () => {
  let loginPage: LoginPage;
  let designPage: DesignPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    designPage = new DesignPage(page);

    // Login first
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await expect(loginPage.isLoggedIn()).resolves.toBe(true);
  });

  test('should create and save design', async ({ page }) => {
    await designPage.goto();
    await designPage.createNewDesign('My Kitchen');
    await designPage.addAppliance('refrigerator');
    await designPage.addAppliance('dishwasher');
    await designPage.saveDesign();

    // Verify design appears in list
    await page.goto('/designs');
    await expect(page.locator('text=My Kitchen')).toBeVisible();
  });
});
```

## Running E2E Tests

### Command Line

```bash
# Run all E2E tests
pnpm test:e2e

# Run in headed mode (see browser)
pnpm test:e2e --headed

# Run specific test
pnpm test:e2e login.spec.ts

# Run in debug mode
pnpm test:e2e --debug

# Run specific browser
pnpm test:e2e --project=chromium

# Update snapshots
pnpm test:e2e --update-snapshots
```

### VS Code Integration

```json
// .vscode/launch.json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug E2E Tests",
      "program": "${workspaceFolder}/node_modules/@playwright/test/cli.js",
      "args": ["test", "--headed", "--debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Visual Regression Testing

### Screenshot Comparison

```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage should match snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('design page should match snapshot', async ({ page }) => {
    await page.goto('/design');
    await page.waitForSelector('#canvas');
    await expect(page.locator('#canvas')).toHaveScreenshot('design-canvas.png');
  });

  test('product card should match snapshot', async ({ page }) => {
    await page.goto('/products');
    const card = page.locator('.product-card').first();
    await expect(card).toHaveScreenshot('product-card.png', {
      maxDiffPixels: 100, // Allow small differences
    });
  });
});
```

### Full Page Screenshots

```typescript
test('full page screenshot', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({
    path: 'screenshots/homepage-full.png',
    fullPage: true,
  });
});
```

## E2E Test Examples

### Design Creation Workflow

```typescript
// tests/e2e/design-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Design Workflow', () => {
  test('should create, edit, and share design', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Create design
    await page.goto('/design/new');
    await page.fill('input[name="designName"]', 'Test Kitchen');
    await page.click('button:has-text("Create")');

    // Add appliances
    await page.click('[data-appliance="refrigerator"]');
    await page.click('#canvas', { position: { x: 100, y: 100 } });

    await page.click('[data-appliance="dishwasher"]');
    await page.click('#canvas', { position: { x: 300, y: 100 } });

    // Save design
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Design saved')).toBeVisible();

    // Share design
    await page.click('button:has-text("Share")');
    const shareLink = await page.locator('#share-link').inputValue();
    expect(shareLink).toContain('/design/share/');

    // Verify in designs list
    await page.goto('/designs');
    await expect(page.locator('text=Test Kitchen')).toBeVisible();
  });
});
```

### Product Browsing and Cart

```typescript
// tests/e2e/shopping-cart.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Shopping Cart', () => {
  test('should add products to cart and checkout', async ({ page }) => {
    await page.goto('/products');

    // Add product to cart
    await page.click(
      '.product-card:first-child button:has-text("Add to Cart")'
    );
    await expect(page.locator('.cart-badge')).toHaveText('1');

    // Add another product
    await page.click(
      '.product-card:nth-child(2) button:has-text("Add to Cart")'
    );
    await expect(page.locator('.cart-badge')).toHaveText('2');

    // View cart
    await page.click('[aria-label="Cart"]');
    await expect(page.locator('.cart-item')).toHaveCount(2);

    // Update quantity
    await page.click(
      '.cart-item:first-child button[aria-label="Increase quantity"]'
    );
    await expect(page.locator('.cart-item:first-child .quantity')).toHaveText(
      '2'
    );

    // Proceed to checkout
    await page.click('button:has-text("Checkout")');
    await expect(page).toHaveURL('/checkout');
  });
});
```

## Best Practices

### 1. Use Data Test IDs

```typescript
// Component
<button data-testid="submit-design">Save Design</button>

// Test
await page.click('[data-testid="submit-design"]');
```

### 2. Wait for Elements

```typescript
// ❌ Don't use fixed timeouts
await page.waitForTimeout(5000);

// ✅ Wait for specific elements
await page.waitForSelector('#loading-spinner', { state: 'hidden' });
await page.waitForLoadState('networkidle');
```

### 3. Use Fixtures for Setup

```typescript
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';

type Fixtures = {
  loginPage: LoginPage;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  authenticatedPage: async ({ page, loginPage }, use) => {
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await use(page);
  },
});

// Use in tests
test('should access dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  await expect(authenticatedPage).toHaveURL('/dashboard');
});
```

### 4. Handle Flaky Tests

```typescript
// Retry failed tests
test.describe('Flaky Suite', () => {
  test.describe.configure({ retries: 2 });

  test('potentially flaky test', async ({ page }) => {
    // Test implementation
  });
});

// Use soft assertions
test('multiple assertions', async ({ page }) => {
  await expect.soft(page.locator('.header')).toBeVisible();
  await expect.soft(page.locator('.footer')).toBeVisible();
  // Test continues even if soft assertions fail
});
```

### 5. Clean Up Test Data

```typescript
test.afterEach(async ({ page }) => {
  // Clean up created data
  await page.request.delete('/api/v1/test-cleanup');
});
```

## Related Documentation

- [Integration Testing Overview](./overview.md) - Testing strategy
- [Frontend-Backend Integration](./frontend-backend-integration.md) - API
  testing
- [CI Integration](./ci-integration.md) - Running in CI
- [Testing Guide](../testing.md) - General testing
