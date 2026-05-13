/**
 * Automated accessibility audit on the 8 public pages.
 *
 * Uses @axe-core/playwright. Failure rules: WCAG 2.1 AA + best-practice
 * (matches what Lighthouse + the RGAA grid expect). Critical/serious
 * violations fail the build; minor/moderate ones print a warning so we
 * can triage without blocking.
 *
 * Install once:
 *   pnpm --filter frontend add -D @axe-core/playwright
 *
 * Run:
 *   pnpm --filter frontend exec playwright test e2e-critical/accessibility.spec.ts
 */
import { test, expect } from '@playwright/test';
// @ts-expect-error — package is optional; install per the comment above
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_PAGES: Array<{ name: string; url: string }> = [
  { name: 'home',           url: '/' },
  { name: 'login',          url: '/login' },
  { name: 'register',       url: '/register' },
  { name: 'pricing',        url: '/pricing' },
  { name: 'catalog',        url: '/catalog' },
  { name: 'catalog-ikea',   url: '/catalog/IKEA' },
  { name: 'legal-privacy',  url: '/legal/privacy' },
  { name: 'legal-cgv',      url: '/legal/cgv' },
];

for (const { name, url } of PUBLIC_PAGES) {
  test(`@critical a11y — ${name}`, async ({ page }, testInfo) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      // Skip the "color-contrast" rule on Framer Motion-animated text:
      // it false-positives during the fade-in. Lighthouse's stricter
      // post-load audit catches the real issues.
      .disableRules([])
      .analyze();

    // Always attach the full result so traces show every violation
    await testInfo.attach(`axe-${name}.json`, {
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(results, null, 2)),
    });

    const blockers = results.violations.filter((v: { impact?: string }) =>
      v.impact === 'critical' || v.impact === 'serious',
    );

    if (blockers.length > 0) {
      const summary = blockers
        .map((v: { id: string; impact?: string; description: string; nodes: unknown[] }) =>
          `  - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`,
        )
        .join('\n');
      throw new Error(`axe found ${blockers.length} blocking violations on ${name}:\n${summary}`);
    }

    // Soft-warn on minor/moderate — surfaced in the trace, not a fail
    const warnings = results.violations.filter(
      (v: { impact?: string }) => v.impact === 'minor' || v.impact === 'moderate',
    );
    if (warnings.length > 0) {
      console.warn(
        `[a11y/${name}] ${warnings.length} non-blocking issue(s): ${warnings.map((w: { id: string }) => w.id).join(', ')}`,
      );
    }

    expect(blockers.length, 'no critical or serious axe violations').toBe(0);
  });
}
