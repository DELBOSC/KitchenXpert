/**
 * OfflineStorage - IndexedDB wrapper for offline kitchen data (F14)
 *
 * Provides persistent client-side storage using IndexedDB for:
 * - Kitchen designs for offline editing
 * - Pending changes queue for sync when back online
 * - Cached catalog products
 * - User preferences
 *
 * All operations are async and use proper error handling.
 */

// ────────────────────────────── Types ──────────────────────────────

export interface KitchenData {
  id: string;
  projectId?: string;
  name: string;
  items: unknown[];
  roomDimensions?: { width: number; depth: number; height: number };
  metadata?: Record<string, unknown>;
  savedAt: string; // ISO timestamp
}

export interface PendingChange {
  id: string;
  kitchenId: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  method: string;
  body?: unknown;
  createdAt: string; // ISO timestamp
  synced: boolean;
}

export interface Product {
  id: string;
  ref: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  imageUrl?: string;
  dimensions?: { width: number; height: number; depth: number };
  metadata?: Record<string, unknown>;
}

export interface UserPreference {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

// ────────────────────────────── Constants ──────────────────────────────

const DB_NAME = 'kitchenxpert-offline';
const DB_VERSION = 1;

const STORES = {
  KITCHENS: 'kitchens',
  PENDING_CHANGES: 'pendingChanges',
  CATALOG: 'catalog',
  USER_PREFERENCES: 'userPreferences',
} as const;

// ────────────────────────────── OfflineStorage Class ──────────────────────────────

export class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database.
   * Creates object stores if they don't exist.
   */
  async init(): Promise<void> {
    // Prevent concurrent initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    if (this.db) {
      return;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.warn('[OfflineStorage] IndexedDB is not available');
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Kitchen designs for offline editing
        if (!db.objectStoreNames.contains(STORES.KITCHENS)) {
          const kitchenStore = db.createObjectStore(STORES.KITCHENS, { keyPath: 'id' });
          kitchenStore.createIndex('projectId', 'projectId', { unique: false });
          kitchenStore.createIndex('savedAt', 'savedAt', { unique: false });
        }

        // Pending changes queue
        if (!db.objectStoreNames.contains(STORES.PENDING_CHANGES)) {
          const changesStore = db.createObjectStore(STORES.PENDING_CHANGES, { keyPath: 'id' });
          changesStore.createIndex('kitchenId', 'kitchenId', { unique: false });
          changesStore.createIndex('synced', 'synced', { unique: false });
          changesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Cached catalog products
        if (!db.objectStoreNames.contains(STORES.CATALOG)) {
          const catalogStore = db.createObjectStore(STORES.CATALOG, { keyPath: 'id' });
          catalogStore.createIndex('category', 'category', { unique: false });
          catalogStore.createIndex('brand', 'brand', { unique: false });
        }

        // User preferences
        if (!db.objectStoreNames.contains(STORES.USER_PREFERENCES)) {
          db.createObjectStore(STORES.USER_PREFERENCES, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;

        // Handle unexpected close
        this.db.onclose = () => {
          this.db = null;
          this.initPromise = null;
        };

        console.log('[OfflineStorage] Database initialized');
        resolve();
      };

      request.onerror = (event) => {
        console.error('[OfflineStorage] Failed to open database:', (event.target as IDBOpenDBRequest).error);
        this.initPromise = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure the database is initialized before operations.
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
    return this.db;
  }

  /**
   * Generic helper to perform an IndexedDB transaction operation.
   */
  private async transaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const db = await this.ensureDB();

    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Generic helper to get all records from a store.
   */
  private async getAll<T>(storeName: string): Promise<T[]> {
    return this.transaction<T[]>(storeName, 'readonly', (store) => store.getAll());
  }

  // ────────────────────────────── Kitchen Operations ──────────────────────────────

  /**
   * Save a kitchen design for offline use.
   */
  async saveKitchenOffline(kitchenId: string, data: Omit<KitchenData, 'id' | 'savedAt'>): Promise<void> {
    const record: KitchenData = {
      ...data,
      id: kitchenId,
      savedAt: new Date().toISOString(),
    };
    await this.transaction(STORES.KITCHENS, 'readwrite', (store) =>
      store.put(record)
    );
  }

  /**
   * Get a kitchen design from offline storage.
   */
  async getKitchen(kitchenId: string): Promise<KitchenData | null> {
    try {
      const result = await this.transaction<KitchenData | undefined>(
        STORES.KITCHENS,
        'readonly',
        (store) => store.get(kitchenId)
      );
      return result ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get all offline kitchen designs.
   */
  async getAllKitchens(): Promise<KitchenData[]> {
    return this.getAll<KitchenData>(STORES.KITCHENS);
  }

  /**
   * Delete a kitchen from offline storage.
   */
  async deleteKitchen(kitchenId: string): Promise<void> {
    await this.transaction(STORES.KITCHENS, 'readwrite', (store) =>
      store.delete(kitchenId)
    );
  }

  // ────────────────────────────── Pending Changes ──────────────────────────────

  /**
   * Queue a change for later sync with the server.
   */
  async queueChange(change: Omit<PendingChange, 'synced'>): Promise<void> {
    const record: PendingChange = {
      ...change,
      synced: false,
    };
    await this.transaction(STORES.PENDING_CHANGES, 'readwrite', (store) =>
      store.put(record)
    );
  }

  /**
   * Get all pending (unsynced) changes.
   */
  async getPendingChanges(): Promise<PendingChange[]> {
    const db = await this.ensureDB();

    return new Promise<PendingChange[]>((resolve, reject) => {
      const tx = db.transaction(STORES.PENDING_CHANGES, 'readonly');
      const store = tx.objectStore(STORES.PENDING_CHANGES);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the count of pending changes.
   */
  async getPendingCount(): Promise<number> {
    const db = await this.ensureDB();

    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORES.PENDING_CHANGES, 'readonly');
      const store = tx.objectStore(STORES.PENDING_CHANGES);
      const index = store.index('synced');
      const request = index.count(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync all pending changes with the server.
   * Returns the sync result with counts and errors.
   */
  async syncChanges(): Promise<SyncResult> {
    const pending = await this.getPendingChanges();
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };

    for (const change of pending) {
      try {
        const response = await fetch(change.endpoint, {
          method: change.method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: change.body ? JSON.stringify(change.body) : undefined,
        });

        if (response.ok) {
          // Mark as synced
          await this.transaction(STORES.PENDING_CHANGES, 'readwrite', (store) =>
            store.put({ ...change, synced: true })
          );
          result.synced++;
        } else {
          const data = await response.json().catch(() => null);
          const errorMsg = data?.error || `HTTP ${response.status}`;
          result.errors.push(`${change.type} ${change.kitchenId}: ${errorMsg}`);
          result.failed++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`${change.type} ${change.kitchenId}: ${errorMsg}`);
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Clear all synced changes from the store.
   */
  async clearSynced(changeIds?: string[]): Promise<void> {
    const db = await this.ensureDB();

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.PENDING_CHANGES, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_CHANGES);

      if (changeIds && changeIds.length > 0) {
        // Delete specific IDs
        let completed = 0;
        changeIds.forEach((id) => {
          const req = store.delete(id);
          req.onsuccess = () => {
            completed++;
            if (completed === changeIds.length) {resolve();}
          };
          req.onerror = () => reject(req.error);
        });
      } else {
        // Delete all synced changes
        const index = store.index('synced');
        const cursorReq = index.openCursor(IDBKeyRange.only(true));

        cursorReq.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      }
    });
  }

  // ────────────────────────────── Catalog Operations ──────────────────────────────

  /**
   * Cache catalog products for offline access.
   */
  async cacheCatalog(products: Product[]): Promise<void> {
    const db = await this.ensureDB();

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.CATALOG, 'readwrite');
      const store = tx.objectStore(STORES.CATALOG);

      products.forEach((product) => {
        store.put(product);
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Get all cached catalog products.
   */
  async getCachedCatalog(): Promise<Product[]> {
    return this.getAll<Product>(STORES.CATALOG);
  }

  /**
   * Get cached products by category.
   */
  async getCachedByCategory(category: string): Promise<Product[]> {
    const db = await this.ensureDB();

    return new Promise<Product[]>((resolve, reject) => {
      const tx = db.transaction(STORES.CATALOG, 'readonly');
      const store = tx.objectStore(STORES.CATALOG);
      const index = store.index('category');
      const request = index.getAll(IDBKeyRange.only(category));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear the catalog cache.
   */
  async clearCatalog(): Promise<void> {
    await this.transaction(STORES.CATALOG, 'readwrite', (store) =>
      store.clear()
    );
  }

  // ────────────────────────────── User Preferences ──────────────────────────────

  /**
   * Save a user preference.
   */
  async setPreference(key: string, value: unknown): Promise<void> {
    const record: UserPreference = {
      key,
      value,
      updatedAt: new Date().toISOString(),
    };
    await this.transaction(STORES.USER_PREFERENCES, 'readwrite', (store) =>
      store.put(record)
    );
  }

  /**
   * Get a user preference.
   */
  async getPreference<T = unknown>(key: string): Promise<T | null> {
    try {
      const result = await this.transaction<UserPreference | undefined>(
        STORES.USER_PREFERENCES,
        'readonly',
        (store) => store.get(key)
      );
      return result ? (result.value as T) : null;
    } catch {
      return null;
    }
  }

  /**
   * Get all user preferences.
   */
  async getAllPreferences(): Promise<UserPreference[]> {
    return this.getAll<UserPreference>(STORES.USER_PREFERENCES);
  }

  // ────────────────────────────── Utility ──────────────────────────────

  /**
   * Get storage usage stats.
   */
  async getStorageStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    for (const storeName of Object.values(STORES)) {
      try {
        const items = await this.getAll(storeName);
        stats[storeName] = items.length;
      } catch {
        stats[storeName] = 0;
      }
    }
    return stats;
  }

  /**
   * Clear all offline data.
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise<void>((resolve, reject) => {
      const storeNames = Object.values(STORES);
      const tx = db.transaction(storeNames, 'readwrite');

      storeNames.forEach((storeName) => {
        tx.objectStore(storeName).clear();
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// ────────────────────────────── Singleton ──────────────────────────────

let instance: OfflineStorage | null = null;

export function getOfflineStorage(): OfflineStorage {
  if (!instance) {
    instance = new OfflineStorage();
  }
  return instance;
}

export default OfflineStorage;
