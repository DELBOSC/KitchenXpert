import { CatalogItem } from '@kitchenxpert/common';
import { ProviderProduct } from '../base-provider';

/**
 * État de synchronisation pour un provider
 */
export interface SyncState {
  providerId: string;
  lastSyncAt: Date;
  lastSuccessfulSyncAt?: Date;
  totalProducts: number;
  fingerprint?: string; // Hash du contenu pour détecter changements
}

/**
 * Résultat de synchronisation incrémentale
 */
export interface IncrementalSyncResult {
  added: CatalogItem[];
  updated: CatalogItem[];
  removed: string[]; // IDs des produits supprimés
  unchanged: number;
  errors: Array<{ productId: string; error: string }>;
}

/**
 * Change detection strategy
 */
export type ChangeStrategy = 'hash' | 'timestamp' | 'full';

/**
 * Gestionnaire de synchronisation incrémentale
 * Détecte uniquement les changements depuis la dernière sync
 */
export class IncrementalSyncManager {
  private stateStore: Map<string, SyncState> = new Map();

  constructor() {
    // TODO: Charger l'état depuis la DB
    this.loadState();
  }

  /**
   * Synchronise de manière incrémentale
   */
  async sync(
    providerId: string,
    currentProducts: ProviderProduct[],
    previousProducts: CatalogItem[],
    strategy: ChangeStrategy = 'hash'
  ): Promise<IncrementalSyncResult> {
    const result: IncrementalSyncResult = {
      added: [],
      updated: [],
      removed: [],
      unchanged: 0,
      errors: [],
    };

    // Map des produits existants par providerItemId
    const existingMap = new Map<string, CatalogItem>();
    previousProducts.forEach((p) => {
      existingMap.set(p.providerItemId, p);
    });

    // Map des produits actuels
    const currentMap = new Map<string, ProviderProduct>();
    currentProducts.forEach((p) => {
      currentMap.set(p.id, p);
    });

    // Détecter ajouts et mises à jour
    for (const current of currentProducts) {
      const existing = existingMap.get(current.id);

      if (!existing) {
        // Nouveau produit
        result.added.push(current as any); // TODO: Convert to CatalogItem
      } else {
        // Vérifier si modifié
        const hasChanged = this.detectChange(current, existing, strategy);

        if (hasChanged) {
          result.updated.push(current as any); // TODO: Convert to CatalogItem
        } else {
          result.unchanged++;
        }
      }
    }

    // Détecter suppressions
    for (const [id, existing] of existingMap) {
      if (!currentMap.has(id)) {
        result.removed.push(existing.id);
      }
    }

    // Mettre à jour l'état
    await this.updateState(providerId, currentProducts);

    return result;
  }

  /**
   * Détecte si un produit a changé
   */
  private detectChange(
    current: ProviderProduct,
    existing: CatalogItem,
    strategy: ChangeStrategy
  ): boolean {
    switch (strategy) {
      case 'hash':
        return this.computeHash(current) !== this.computeHash(existing);

      case 'timestamp':
        // Comparer updatedAt si disponible
        if (current.updatedAt && existing.updatedAt) {
          return new Date(current.updatedAt) > new Date(existing.updatedAt);
        }
        // Fallback sur hash
        return this.computeHash(current) !== this.computeHash(existing);

      case 'full':
        // Toujours considérer comme changé (full sync)
        return true;

      default:
        return this.computeHash(current) !== this.computeHash(existing);
    }
  }

  /**
   * Calcule un hash du produit pour détecter changements
   */
  private computeHash(product: any): string {
    // Champs significatifs pour le hash
    const significantFields = {
      name: product.name,
      price: product.price,
      description: product.description,
      images: product.images,
      stock: product.stock,
      status: product.status,
    };

    const str = JSON.stringify(significantFields);
    return this.simpleHash(str);
  }

  /**
   * Hash simple (non-cryptographique, juste pour comparaison)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Charge l'état depuis le storage
   */
  private loadState(): void {
    // TODO: Charger depuis la DB
    // SELECT * FROM sync_states
  }

  /**
   * Met à jour l'état après sync
   */
  private async updateState(providerId: string, products: ProviderProduct[]): Promise<void> {
    const fingerprint = this.computeHash(products);

    const state: SyncState = {
      providerId,
      lastSyncAt: new Date(),
      lastSuccessfulSyncAt: new Date(),
      totalProducts: products.length,
      fingerprint,
    };

    this.stateStore.set(providerId, state);

    // TODO: Sauvegarder dans la DB
    // UPDATE sync_states SET ... WHERE provider_id = ?
  }

  /**
   * Récupère l'état d'un provider
   */
  getState(providerId: string): SyncState | undefined {
    return this.stateStore.get(providerId);
  }

  /**
   * Vérifie si une sync est nécessaire
   */
  needsSync(providerId: string, maxAgeMinutes: number = 60): boolean {
    const state = this.getState(providerId);

    if (!state || !state.lastSuccessfulSyncAt) {
      return true;
    }

    const ageMinutes = (Date.now() - state.lastSuccessfulSyncAt.getTime()) / 1000 / 60;

    return ageMinutes >= maxAgeMinutes;
  }
}
