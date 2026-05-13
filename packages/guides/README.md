# @kitchenxpert/guides

Static editorial site for KitchenXpert. Built with **Astro v5** + MDX
content collections. Mounted at `/guides/*` on production via the
reverse proxy (Caddy/Nginx routes `/guides/*` to this Astro server,
everything else to the SPA).

> **Don't write code here unless you're adding a new template.** For
> new articles, see [docs/CONTENT-WORKFLOW.md](../../docs/CONTENT-WORKFLOW.md).

## Quick start

```bash
pnpm --filter guides install      # first time only
pnpm --filter guides dev          # http://localhost:4321/guides
pnpm --filter guides build        # → packages/guides/dist/
pnpm --filter guides preview      # preview the static build
```

## Architecture

| Path | Role |
|---|---|
| `src/content/config.ts`   | Zod schemas for the 6 article collections (the contract) |
| `src/content/<col>/*.mdx` | Articles. Run `pnpm guides new` to scaffold one |
| `src/components/`          | 8 editorial components (Astro + 1 React island for FAQ) |
| `src/layouts/ArticleLayout.astro` | Shared chrome (SEO head, breadcrumb, TOC, related, JSON-LD) |
| `src/pages/index.astro`    | Hub `/guides` with search + grouping by collection |
| `src/pages/[...slug].astro`| Catch-all dynamic routing for every collection |
| `src/pages/og/[...slug].png.ts` | OG image generator (`astro-og-canvas`, build-time) |
| `src/data/article-manifest.ts`  | The 50-article launch manifest |
| `src/data/authors.ts`      | Author registry referenced from frontmatter |
| `src/analytics/track.ts`   | Plausible custom events (page view, scroll depth, reading time) |

## Production deploy

The reverse proxy in front of the production stack should route
`/guides/*` → this Astro `dist/` (served by `vite preview` or any
static host). Caddy snippet:

```
kitchenxpert.com {
  handle_path /guides/* {
    root * /srv/guides/dist
    try_files {path} {path}/index.html =404
    file_server
  }
  handle {
    reverse_proxy frontend:8080
  }
}
api.kitchenxpert.com {
  reverse_proxy backend:4000
}
```

That keeps **link equity on the apex domain** (best for SEO) while
giving the editorial site its own deploy cadence + cache TTL.

## Why Astro instead of MDX-in-Vite

- Zero JS by default → Lighthouse 100 trivially
- Content collections + Zod = typed frontmatter (compile-time safety)
- `astro-og-canvas` ships dynamic OG images out of the box
- The SPA stays focused on the auth/designer surface; the editorial
  build doesn't bloat the main bundle

## Adding a new article

```bash
# 1. Add the entry to src/data/article-manifest.ts
# 2. Generate the stub
pnpm --filter guides new --slug=mon-article

# 3. Write content in src/content/<template>/<slug>.mdx
# 4. Set draft: false in frontmatter
# 5. Open a PR
```

Full instructions: [docs/CONTENT-WORKFLOW.md](../../docs/CONTENT-WORKFLOW.md).
