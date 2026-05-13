import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

/**
 * KitchenXpert Guides — Astro config.
 *
 * Mounted at /guides/* on the production reverse proxy. The `base` and
 * `site` settings together produce the correct absolute URLs in
 * sitemap.xml + canonical tags + Open Graph.
 *
 *   site = https://kitchenxpert.com
 *   base = /guides
 *
 * Astro v5 + MDX content collections. React island only when an article
 * needs interactive bits (FAQ accordion, comparison table). Default JS
 * payload per page = 0 KB.
 */
export default defineConfig({
  site: 'https://kitchenxpert.com',
  base: '/guides',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  integrations: [
    mdx({
      // Auto-import the SEO/JSON-LD helpers in every .mdx file so
      // authors don't have to repeat 5 lines at the top of each article.
      gfm: true,
      smartypants: true,
    }),
    react(),
    sitemap({
      // Per-page changefreq + priority via the Astro page metadata
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date(),
      filter: (page) =>
        // Hide drafts (slug-prefixed `_`) from the public sitemap
        !page.includes('/_'),
    }),
  ],
  vite: {
    // Pull design tokens from the shared package. Keeps the dark
    // aurora identity consistent without re-exporting the full
    // ui-components React library into Astro.
    css: {
      // Uses tokens.css from the frontend package — copy at build time
      // via npm script if you prefer, or symlink in dev.
    },
  },
  // Strict markdown frontmatter validation — catches typos at build time.
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: { theme: 'github-dark-dimmed' },
  },
});
