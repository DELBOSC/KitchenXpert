/**
 * Dynamic Open Graph image — 1200×630, generated at build time.
 *
 * One PNG per article, served at `/guides/og/<slug>.png`. Uses
 * `astro-og-canvas` which renders text on a node-canvas surface with
 * the same dark aurora palette as the SPA.
 *
 * Why server-render instead of static JPGs:
 *   - 50 articles × 1 manual JPG = 50 design tasks. Generated images
 *     stay perfectly in sync with article titles when authors rename them.
 *   - Same canvas template = consistent brand presence in social previews.
 *   - Output is cached by Astro's static build → zero runtime cost.
 */
import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { OGImageRoute } from 'astro-og-canvas';

type AnyEntry =
  | CollectionEntry<'layouts'>
  | CollectionEntry<'cuisinistes'>
  | CollectionEntry<'budgets'>
  | CollectionEntry<'styles'>
  | CollectionEntry<'comparatifs'>
  | CollectionEntry<'pratiques'>;

const all = (
  await Promise.all([
    getCollection('layouts',     ({ data }) => !data.draft),
    getCollection('cuisinistes', ({ data }) => !data.draft),
    getCollection('budgets',     ({ data }) => !data.draft),
    getCollection('styles',      ({ data }) => !data.draft),
    getCollection('comparatifs', ({ data }) => !data.draft),
    getCollection('pratiques',   ({ data }) => !data.draft),
  ])
).flat() as AnyEntry[];

const pages = Object.fromEntries(
  all.map((entry) => [
    entry.slug,
    {
      title: entry.data.title,
      description: entry.data.description,
    },
  ]),
);

export const { getStaticPaths, GET } = OGImageRoute({
  // Read the slug param from the route filename `[...slug].png.ts`.
  param: 'slug',
  pages,
  getImageOptions: (_path, page: { title: string; description: string }) => ({
    title: page.title,
    description: page.description,
    logo: {
      // path: relative to the public/ folder — replace with your real logo
      // once a 512×512 PNG ships under public/logo-512.png.
      // path: './public/logo-512.png',
      size: [56],
    },
    bgGradient: [
      [10, 10, 15],         // #0a0a0f
      [26, 10, 42],         // #1a0a2a
    ],
    border: { color: [167, 139, 250], width: 4, side: 'inline-start' },
    padding: 80,
    font: {
      title: { size: 60, color: [255, 255, 255], weight: 'Bold' },
      description: { size: 28, color: [200, 200, 220], weight: 'Normal' },
    },
  }),
}) as { getStaticPaths: () => unknown[]; GET: APIRoute };
