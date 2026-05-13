# KitchenXpert — Performance, Accessibility & SEO

Reference for Lighthouse 95+ on the 8 public pages (`/`, `/login`,
`/register`, `/pricing`, `/catalog`, `/catalog/IKEA`, `/legal/privacy`,
`/legal/cgv`).

---

## How to measure (locally)

```bash
# Production build
pnpm --filter frontend build

# Static preview on :3005
pnpm --filter frontend preview --port 3005

# Lighthouse CI — same suite + thresholds as the CI workflow
pnpm dlx @lhci/cli@0.13.x autorun --config=packages/frontend/lighthouserc.json

# Bundle visualizer — opens dist/stats.html with treemap + gz/br sizes
pnpm --filter frontend build:analyze && open packages/frontend/dist/stats.html

# Manual axe scan on a single page
pnpm --filter frontend exec playwright test e2e-critical/accessibility.spec.ts --headed
```

> **Heads up:** I cannot give you before/after Lighthouse numbers in
> this PR — Lighthouse needs Chrome + a running dev server. Run the
> commands above to capture the baseline yourself; the CI workflow
> turns the baseline into a hard gate from then on.

---

## What ships in this changeset

### Performance

| Change | File | Why |
|---|---|---|
| Manual chunks: `three`, `3d-engine`, `framer`, `stripe`, `i18n`, `react-vendor`, `vendor` | [vite.config.ts](packages/frontend/vite.config.ts) | Home/login/legal stop downloading Three.js (~150 KB gz) and Framer Motion (~30 KB gz) they never use |
| Hashed filenames + tighter chunkSizeWarningLimit (500 KB) + assetsInlineLimit 4 KB | [vite.config.ts](packages/frontend/vite.config.ts) | Long-Cache-Control header in [security-headers.ts](packages/backend/src/api/middleware/security-headers.ts) becomes safe; small assets inlined save round-trips |
| Sourcemap off in prod (opt-in via `VITE_SOURCEMAP=1`) | [vite.config.ts](packages/frontend/vite.config.ts) | Cuts ~30 % of the upload size; prevents source disclosure |
| Optional gzip + brotli pre-compression | [vite.config.ts](packages/frontend/vite.config.ts) | Reverse proxy serves `index.html.br` directly — saves CPU on every request |
| Optional bundle visualizer | `pnpm build:analyze` | Treemap with gz + br sizes |
| Self-hosted Inter (variable, latin subset) + preload | [index.html](packages/frontend/index.html), [index.css](packages/frontend/src/index.css) | Replaces 6+ Google Font requests with one preloaded woff2; FOIT eliminated via `font-display: swap` |
| Page-level `React.lazy()` (already in place) + manualChunks | [router.tsx](packages/frontend/src/router.tsx) | Confirmed: every page is code-split. Combined with manualChunks, the home bundle stays small |
| Reduced-motion respected globally | [index.css](packages/frontend/src/index.css) | Disables Framer Motion + CSS transitions for users who opted in (WCAG 2.3.3 + RGAA 13.x) |

### SEO

| Change | File | Why |
|---|---|---|
| Per-page `SeoHead` component (title, description, OG, Twitter, canonical, JSON-LD) | [components/seo/SeoHead.tsx](packages/frontend/src/components/seo/SeoHead.tsx) | Lighthouse SEO 95+ requires unique titles + descriptions per route. Dependency-free (no react-helmet-async) — uses `useEffect` |
| OG + Twitter Cards + Organization JSON-LD baseline | [index.html](packages/frontend/index.html) | Default values that `<SeoHead>` overrides per-route |
| Preconnect to `js.stripe.com`, dns-prefetch `api.stripe.com` | [index.html](packages/frontend/index.html) | Saves the TLS round-trip on the first Stripe Elements load |
| `robots.txt` with strict private-route disallow + AI-crawler block | [public/robots.txt](packages/frontend/public/robots.txt) | Crawl budget is precious; also opts out of GPTBot/Google-Extended/ClaudeBot |
| `sitemap.xml` generator at build time | [scripts/generate-sitemap.mjs](packages/frontend/scripts/generate-sitemap.mjs) | 15 public URLs, change-freq + priority. Wired into `pnpm build` |
| Pre-baked JSON-LD payloads (Organization, WebSite, SoftwareApplication) | [SeoHead.tsx](packages/frontend/src/components/seo/SeoHead.tsx) | Drop into the home page via `<SeoHead jsonLd={[ORGANIZATION_JSONLD, WEBSITE_JSONLD, SOFTWARE_JSONLD]} />` |

### Accessibility

| Change | File | Why |
|---|---|---|
| Skip-link "Aller au contenu" + matching `<main id="main">` | [index.html](packages/frontend/index.html), [App.tsx](packages/frontend/src/App.tsx) | RGAA 12.7 + WCAG 2.4.1 |
| `lang="fr"` + `theme-color` + `color-scheme="dark light"` | [index.html](packages/frontend/index.html) | Already had `lang`; added the rest |
| Page « Déclaration d'accessibilité » (RGAA 4.1.2 template) | [pages/Legal/Accessibilite.tsx](packages/frontend/src/pages/Legal/Accessibilite.tsx) | Listed in the legal footer; modèle officiel DINUM |
| axe-core spec across the 8 public pages | [e2e-critical/accessibility.spec.ts](packages/frontend/e2e-critical/accessibility.spec.ts) | Critical/serious violations → fail; minor/moderate → trace warning |

### Best Practices

| Change | File | Why |
|---|---|---|
| All `target="_blank"` audited | already correct | The 7 occurrences all carry `rel="noopener noreferrer"` |
| HSTS, COEP, COOP, CSP, Permissions-Policy | already shipped in Phase 3 of the production-hardening pass | See [security-headers.ts](packages/backend/src/api/middleware/security-headers.ts) |
| `<html lang>` present, theme-color set | [index.html](packages/frontend/index.html) | |
| Lighthouse CI gate | [.github/workflows/lighthouse.yml](.github/workflows/lighthouse.yml) + [lighthouserc.json](packages/frontend/lighthouserc.json) | Fail if any score < 95 on any of the 8 pages |

---

## What you still need to do

### Before the first Lighthouse run

1. **Fetch the Inter font** (one-time):
   ```bash
   bash packages/frontend/scripts/fetch-fonts.sh
   git add packages/frontend/public/fonts/inter-var-latin.woff2
   ```
2. **Install optional Vite plugins** (otherwise the build still works,
   but you lose the bundle visualizer + brotli pre-compression):
   ```bash
   pnpm --filter frontend add -D \
     rollup-plugin-visualizer \
     vite-imagetools \
     vite-plugin-compression2 \
     @axe-core/playwright
   ```
3. **Apply `<SeoHead>` per page** — drop into the top of each public
   page component:
   ```tsx
   <SeoHead
     title="Tarifs — KitchenXpert"
     description="3 plans : Découverte gratuit · Premium 14,90 €/mois · Studio 49 €/mois. Sans engagement."
     canonical="https://kitchenxpert.com/pricing"
   />
   ```
   The home page should also pass `jsonLd={[ORGANIZATION_JSONLD,
   WEBSITE_JSONLD, SOFTWARE_JSONLD]}`.
4. **Add real OG images** to `public/og/` (1200×630 each). Recommended:
   `default.jpg`, `home.jpg`, `pricing.jpg`, `catalog.jpg`.

### After the first Lighthouse run

Capture the baseline scores and commit them as
`docs/lighthouse-baseline.json`:

```bash
pnpm dlx @lhci/cli@0.13.x autorun \
  --config=packages/frontend/lighthouserc.json \
  --collect.numberOfRuns=3
cp .lighthouseci/manifest.json docs/lighthouse-baseline.json
```

Re-run after each significant design change; the workflow refuses to
merge if any score drops below 95.

### Known limitations

- **Images are 0-byte placeholders** in `public/assets/images/` and
  `src/assets/images/`. The image pipeline (`vite-imagetools` + AVIF
  fallback via `<picture>`) is configured to activate the moment real
  images land. Until then, image audits will return clean.
- **`import * as THREE from 'three'`** appears in 12 designer files.
  This kills tree-shaking for the Three.js library, BUT all 12 files
  live under the lazy-loaded `/projects/.../designer` route — so the
  cost is contained to users actually opening the designer. Refactoring
  to named imports is a future micro-optimization (~80 KB gz savings on
  the designer chunk only).
- **No PWA** — `manifest.json` exists but service-worker is minimal.
  Lighthouse PWA category is intentionally excluded (`assertions:
  preset: lighthouse:no-pwa`).
- **Sourcemaps stripped in prod** — Sentry will need its own upload
  step (`@sentry/vite-plugin`) to symbolicate stack traces. Track as a
  separate task.

---

## CI summary

`.github/workflows/lighthouse.yml` runs on every PR that touches
`packages/frontend/**`:

1. Production build of the SPA
2. Static serve via `vite preview --port 3005`
3. Lighthouse CI executes the 8 URLs × 3 runs each
4. Asserts: each of perf / a11y / best-practices / SEO ≥ 0.95
5. Web-vitals: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms
6. Failure → uploads the `.lighthouseci/` HTML report as an artifact

Combined with `.github/workflows/e2e.yml` (the critical-flows + visual
regression suite) you have three independent gates: functional,
visual, performance.
