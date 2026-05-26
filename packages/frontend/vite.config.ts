/// <reference types="vitest" />
import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';

/**
 * Build config for the KitchenXpert SPA.
 *
 * Performance-tuned defaults for Lighthouse 95+:
 *   - manualChunks splits heavy libs (three, framer, vendor) into their
 *     own files so the home/login/legal pages don't pay the cost
 *   - sourcemaps off in prod (cuts ~30% of upload size and prevents
 *     accidental code disclosure to crawlers)
 *   - terser-grade minification with safe drops
 *
 * Optional plugins (vite-imagetools / rollup-plugin-visualizer /
 * vite-plugin-compression) are enabled only when present in
 * node_modules so the project still builds without them — install them
 * with `pnpm add -D rollup-plugin-visualizer vite-imagetools
 * vite-plugin-compression2` to activate.
 */

async function loadOptionalPlugins(): Promise<PluginOption[]> {
  const plugins: PluginOption[] = [];

  // Bundle visualizer — produces dist/stats.html when ANALYZE=1
  if (process.env.ANALYZE === '1') {
    try {
      const { visualizer } = await import('rollup-plugin-visualizer');
      plugins.push(
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }) as PluginOption,
      );
    } catch {
      console.warn('[vite] rollup-plugin-visualizer not installed — skipping');
    }
  }

  // Image transformer — `?w=640;1280;1920&format=avif;webp` syntax
  try {
    const { imagetools } = await import('vite-imagetools');
    plugins.push(imagetools() as PluginOption);
  } catch {
    /* not installed — fine */
  }

  // Pre-gzip + pre-brotli the static bundle so the reverse proxy can
  // serve `index.html.br` directly without re-compressing on every hit.
  try {
    const compression = (await import('vite-plugin-compression2')).default;
    plugins.push(
      compression({ algorithm: 'gzip', threshold: 1024 }) as PluginOption,
      compression({ algorithm: 'brotliCompress', threshold: 1024 }) as PluginOption,
    );
  } catch {
    /* not installed — fine */
  }

  return plugins;
}

export default defineConfig(async () => {
  const optional = await loadOptionalPlugins();
  return {
    plugins: [react(), ...optional],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 3005,
      host: '127.0.0.1',
      proxy: {
        '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      },
    },
    build: {
      outDir: 'dist',
      // Sourcemaps in prod leak source. Keep them for staging only via
      // VITE_SOURCEMAP=1 env flag.
      sourcemap: process.env.VITE_SOURCEMAP === '1',
      cssCodeSplit: true,
      // Tighter chunk-warning threshold so we notice silent regressions.
      chunkSizeWarningLimit: 500,
      assetsInlineLimit: 4096, // inline ≤ 4 KB to save round-trips
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          // Hash assets so the long Cache-Control headers in
          // packages/backend/src/api/middleware/security-headers.ts are safe.
          assetFileNames: 'assets/[name].[hash][extname]',
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
          // Heaviest, route-specific deps go into their own chunk so
          // /login, /register, /legal/* etc. don't have to download them.
          // Everything else (React + redux + zustand + helpers) lands in a
          // single `vendor` chunk — the previous `react-vendor` split
          // created a circular dependency with `vendor` (broad `id.includes
          // ('react')` caught transitive helpers that vendor packages also
          // depend on) and bought nothing in practice since every route
          // already loads both chunks.
          manualChunks: (id: string): string | undefined => {
            if (!id.includes('node_modules')) return undefined;

            if (id.includes('three') || id.includes('@react-three'))
              return 'three';
            if (id.includes('@kitchenxpert/3d-engine'))
              return '3d-engine';
            if (id.includes('framer-motion'))
              return 'framer';
            if (id.includes('@stripe/stripe-js') || id.includes('@stripe/react-stripe-js'))
              return 'stripe';
            if (id.includes('react-i18next') || id.includes('i18next'))
              return 'i18n';
            return 'vendor';
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e', 'e2e-critical'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/__tests__/',
          '**/*.d.ts',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
        ],
      },
      testTimeout: 10000,
      hookTimeout: 10000,
    },
  };
});
