/**
 * Service Worker for KitchenXpert (F14: Full Offline Mode)
 *
 * Cache strategies:
 * 1. App Shell (HTML, JS, CSS) -> Cache First
 * 2. API responses -> Network First, fallback to cache
 * 3. Catalog images -> Cache First with size limit
 * 4. 3D model assets -> Cache First
 *
 * Features:
 * - Pre-caches app shell on install
 * - Route-based caching strategy on fetch
 * - Cache versioning and cleanup on activate
 * - Background sync message support
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// ────────────────────────────── Cache Names ──────────────────────────────

const CACHE_VERSION = 'v1';
const APP_SHELL_CACHE = `kitchenxpert-shell-${CACHE_VERSION}`;
const API_CACHE = `kitchenxpert-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `kitchenxpert-images-${CACHE_VERSION}`;
const MODEL_CACHE = `kitchenxpert-models-${CACHE_VERSION}`;

const ALL_CACHES = [APP_SHELL_CACHE, API_CACHE, IMAGE_CACHE, MODEL_CACHE];

// Maximum sizes for caches (number of entries)
const API_CACHE_MAX = 100;

// ────────────────────────────── App Shell Files ──────────────────────────────

const APP_SHELL_FILES = [
  '/',
  '/index.html',
];

// ────────────────────────────── Install ──────────────────────────────

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Failed to pre-cache app shell:', err);
      })
  );
});

// ────────────────────────────── Activate ──────────────────────────────

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // Delete old caches that don't match current version
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('kitchenxpert-') && !ALL_CACHES.includes(name))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// ────────────────────────────── Cache Strategies ──────────────────────────────

/**
 * Cache First strategy: Try cache, fall back to network.
 * Good for static assets that rarely change.
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      void cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Return a basic offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      const fallbackCache = await caches.open(APP_SHELL_CACHE);
      const fallback = await fallbackCache.match('/index.html');
      if (fallback) {return fallback;}
    }
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Network First strategy: Try network, fall back to cache.
 * Good for API responses where freshness matters.
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const networkResponse = await fetch(request);

    // Only cache successful GET responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(cacheName);
      void cache.put(request, networkResponse.clone());

      // Trim cache if over limit
      void trimCache(cacheName, API_CACHE_MAX);
    }

    return networkResponse;
  } catch {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return error response for API calls
    return new Response(
      JSON.stringify({
        success: false,
        error: 'You are offline and this data is not cached',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Stale While Revalidate strategy: Return cached, then update in background.
 * Good for assets that change occasionally but stale is acceptable.
 */
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        void cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Ignore fetch errors for background revalidation
      return undefined;
    });

  // Return cached response immediately, or wait for network
  if (cached) {
    return cached;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

// ────────────────────────────── Fetch Handler ──────────────────────────────

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests (let them pass through)
  if (event.request.method !== 'GET') {
    return;
  }

  // Route-based caching strategy
  if (url.pathname.startsWith('/api/')) {
    // API: Network First with cache fallback
    event.respondWith(networkFirst(event.request, API_CACHE));
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)) {
    // Images: Cache First
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }

  if (url.pathname.match(/\.(glb|gltf|obj|mtl|fbx|usdz)$/i)) {
    // 3D models: Cache First
    event.respondWith(cacheFirst(event.request, MODEL_CACHE));
    return;
  }

  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/i)) {
    // Static assets: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(event.request, APP_SHELL_CACHE));
    return;
  }

  // HTML pages (SPA): Cache First (serve index.html for all routes)
  event.respondWith(cacheFirst(event.request, APP_SHELL_CACHE));
});

// ────────────────────────────── Message Handler ──────────────────────────────

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      void self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        Promise.all(ALL_CACHES.map((name) => caches.delete(name))).then(() => {
          void notifyClients({ type: 'CACHE_CLEARED' });
        })
      );
      break;

    case 'CACHE_API_RESPONSE':
      // Allow manual caching of API responses for offline use
      if (payload?.url && payload?.data) {
        event.waitUntil(
          caches.open(API_CACHE).then((cache) => {
            const response = new Response(JSON.stringify(payload.data), {
              headers: { 'Content-Type': 'application/json' },
            });
            return cache.put(payload.url, response);
          })
        );
      }
      break;

    case 'GET_CACHE_STATUS':
      event.waitUntil(
        getCacheStatus().then((status) => {
          void notifyClients({ type: 'CACHE_STATUS', payload: status });
        })
      );
      break;
  }
});

// ────────────────────────────── Utilities ──────────────────────────────

/**
 * Trim a cache to a maximum number of entries (FIFO).
 */
async function trimCache(cacheName: string, maxItems: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

/**
 * Get cache status information.
 */
async function getCacheStatus(): Promise<Record<string, number>> {
  const status: Record<string, number> = {};
  for (const cacheName of ALL_CACHES) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      status[cacheName] = keys.length;
    } catch {
      status[cacheName] = 0;
    }
  }
  return status;
}

/**
 * Send a message to all active clients.
 */
async function notifyClients(message: { type: string; payload?: unknown }): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

export {};
