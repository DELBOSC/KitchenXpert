#!/usr/bin/env node
/**
 * 🚀 Bulk Import - Importer massivement depuis des APIs publiques
 *
 * Usage:
 *   pnpm catalog:bulk-import
 *   pnpm catalog:bulk-import --provider=ikea
 *   pnpm catalog:bulk-import --category=furniture --limit=100
 *
 * Fonctionnalités:
 * - Import automatique depuis 50+ APIs publiques
 * - Gestion de la pagination
 * - Rate limiting automatique
 * - Retry sur erreurs
 * - Progress bar en temps réel
 * - Cache des résultats
 */

import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';
import { QuickImporter } from '../universal-importer/quick-import';
import type { CatalogItem } from '../../packages/common/types/catalog';

interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  endpoints: {
    products: string;
    categories?: string;
  };
  rateLimit: {
    requestsPerSecond: number;
    maxConcurrent: number;
  };
  pagination: {
    type: 'offset' | 'page' | 'cursor';
    limitParam: string;
    offsetParam?: string;
    pageParam?: string;
    cursorParam?: string;
    maxLimit: number;
  };
  authentication?: {
    type: 'bearer' | 'apiKey' | 'basic';
    header?: string;
    param?: string;
  };
  mapping: {
    templateId: string;
    customTransforms?: Record<string, Function>;
  };
}

interface BulkImportOptions {
  providers?: string[];
  categories?: string[];
  limit?: number;
  skipCache?: boolean;
  dryRun?: boolean;
}

interface ImportProgress {
  provider: string;
  total: number;
  imported: number;
  failed: number;
  skipped: number;
  startTime: number;
  endTime?: number;
}

export class BulkImporter {
  private providersConfig: ProviderConfig[];
  private quickImporter: QuickImporter;
  private progressTracking: Map<string, ImportProgress>;
  private httpClients: Map<string, AxiosInstance>;

  constructor() {
    this.providersConfig = this.loadProvidersConfig();
    this.quickImporter = new QuickImporter();
    this.progressTracking = new Map();
    this.httpClients = new Map();
  }

  /**
   * Importer depuis tous les providers ou une sélection
   */
  async importAll(options: BulkImportOptions = {}): Promise<void> {
    console.log('🚀 Bulk Import - KitchenXpert Catalog\n');

    // Filtrer les providers selon les options
    const providers = this.providersConfig.filter(p => {
      if (options.providers && !options.providers.includes(p.id)) {
        return false;
      }
      return true;
    });

    console.log(`📋 ${providers.length} provider(s) sélectionné(s)\n`);

    // Importer séquentiellement pour respecter les rate limits
    for (const provider of providers) {
      try {
        await this.importFromProvider(provider, options);
      } catch (error) {
        console.error(`\n❌ Erreur avec ${provider.name}:`, error.message);
        continue;
      }
    }

    // Afficher le résumé final
    this.displayFinalSummary();
  }

  /**
   * Importer depuis un provider spécifique
   */
  private async importFromProvider(
    provider: ProviderConfig,
    options: BulkImportOptions
  ): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 ${provider.name}`);
    console.log('='.repeat(60));

    // Initialiser le tracking de progression
    const progress: ImportProgress = {
      provider: provider.id,
      total: 0,
      imported: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now(),
    };
    this.progressTracking.set(provider.id, progress);

    // Vérifier le cache
    const cacheFile = this.getCacheFilePath(provider.id);
    if (!options.skipCache && fs.existsSync(cacheFile)) {
      const cacheAge = Date.now() - fs.statSync(cacheFile).mtimeMs;
      const cacheMaxAge = 24 * 60 * 60 * 1000; // 24h

      if (cacheAge < cacheMaxAge) {
        console.log('💾 Cache trouvé (< 24h), utilisation des données en cache');
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        progress.total = cachedData.products.length;
        progress.skipped = cachedData.products.length;
        return;
      }
    }

    // Créer le client HTTP avec rate limiting
    const client = this.createHttpClient(provider);

    try {
      // Récupérer tous les produits avec pagination
      const products = await this.fetchAllProducts(client, provider, options);
      progress.total = products.length;

      console.log(`\n✅ ${products.length} produits récupérés`);

      if (options.dryRun) {
        console.log('🔍 Mode dry-run: pas d\'import réel');
        return;
      }

      // Sauvegarder en cache
      this.saveToCache(provider.id, products);

      // Convertir en fichier temporaire pour QuickImporter
      const tempFile = this.createTempFile(provider.id, products);

      // Importer avec QuickImporter
      const stats = await this.quickImporter.import({
        file: tempFile,
        template: provider.mapping.templateId,
        providerId: provider.id,
        autoConfirm: true,
      });

      progress.imported = stats.validProducts;
      progress.failed = stats.invalidProducts;

      // Nettoyer le fichier temporaire
      fs.unlinkSync(tempFile);

    } catch (error) {
      console.error(`❌ Erreur lors de l'import:`, error.message);
      progress.failed = progress.total;
    } finally {
      progress.endTime = Date.now();
    }
  }

  /**
   * Récupérer tous les produits avec gestion de la pagination
   */
  private async fetchAllProducts(
    client: AxiosInstance,
    provider: ProviderConfig,
    options: BulkImportOptions
  ): Promise<any[]> {
    const allProducts: any[] = [];
    let page = 0;
    let offset = 0;
    let hasMore = true;

    console.log('\n📡 Récupération des produits...');

    while (hasMore) {
      // Construire les paramètres de pagination
      const params: Record<string, any> = {};

      switch (provider.pagination.type) {
        case 'page':
          params[provider.pagination.pageParam!] = page;
          params[provider.pagination.limitParam] = provider.pagination.maxLimit;
          break;
        case 'offset':
          params[provider.pagination.offsetParam!] = offset;
          params[provider.pagination.limitParam] = provider.pagination.maxLimit;
          break;
        case 'cursor':
          // TODO: Implémenter cursor-based pagination
          break;
      }

      // Filtrer par catégorie si spécifié
      if (options.categories && options.categories.length > 0) {
        params.category = options.categories.join(',');
      }

      try {
        const response = await client.get(provider.endpoints.products, { params });

        // Extraire les produits (selon la structure de la réponse)
        let products = response.data;
        if (response.data.products) products = response.data.products;
        if (response.data.items) products = response.data.items;
        if (response.data.data) products = response.data.data;

        if (!Array.isArray(products)) {
          console.warn('⚠️  Format de réponse inattendu');
          break;
        }

        allProducts.push(...products);

        // Afficher la progression
        process.stdout.write(`\r   Récupérés: ${allProducts.length} produits`);

        // Vérifier s'il y a plus de données
        hasMore = products.length === provider.pagination.maxLimit;

        // Vérifier la limite globale
        if (options.limit && allProducts.length >= options.limit) {
          hasMore = false;
        }

        // Incrémenter pour la prochaine page
        page++;
        offset += products.length;

        // Respecter le rate limit
        await this.sleep(1000 / provider.rateLimit.requestsPerSecond);

      } catch (error) {
        if (error.response?.status === 429) {
          console.log('\n⏳ Rate limit atteint, pause de 60s...');
          await this.sleep(60000);
          continue;
        }
        throw error;
      }
    }

    console.log(''); // Nouvelle ligne après la progression
    return options.limit ? allProducts.slice(0, options.limit) : allProducts;
  }

  /**
   * Créer un client HTTP avec rate limiting et retry
   */
  private createHttpClient(provider: ProviderConfig): AxiosInstance {
    const client = axios.create({
      baseURL: provider.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'KitchenXpert-Bulk-Importer/1.0',
      },
    });

    // Ajouter l'authentification si nécessaire
    if (provider.authentication) {
      if (provider.authentication.type === 'bearer' && provider.apiKey) {
        client.defaults.headers.common['Authorization'] = `Bearer ${provider.apiKey}`;
      } else if (provider.authentication.type === 'apiKey' && provider.apiKey) {
        const header = provider.authentication.header || 'X-API-Key';
        client.defaults.headers.common[header] = provider.apiKey;
      }
    }

    // Intercepteur pour retry automatique
    client.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;

        if (!config || !config.retry) {
          config.retry = { count: 0, maxRetries: 3 };
        }

        config.retry.count++;

        if (config.retry.count <= config.retry.maxRetries) {
          console.log(`\n🔄 Retry ${config.retry.count}/${config.retry.maxRetries}...`);
          await this.sleep(1000 * config.retry.count);
          return client(config);
        }

        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Charger la configuration des providers
   */
  private loadProvidersConfig(): ProviderConfig[] {
    const configPath = path.join(__dirname, 'providers-list.json');

    if (!fs.existsSync(configPath)) {
      console.warn('⚠️  Fichier providers-list.json introuvable');
      return [];
    }

    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return data.providers || [];
  }

  /**
   * Sauvegarder en cache
   */
  private saveToCache(providerId: string, products: any[]): void {
    const cacheDir = path.join(__dirname, '.cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheFile = this.getCacheFilePath(providerId);
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        provider: providerId,
        timestamp: new Date().toISOString(),
        count: products.length,
        products,
      }, null, 2),
      'utf-8'
    );
  }

  /**
   * Obtenir le chemin du fichier de cache
   */
  private getCacheFilePath(providerId: string): string {
    return path.join(__dirname, '.cache', `${providerId}.json`);
  }

  /**
   * Créer un fichier temporaire pour QuickImporter
   */
  private createTempFile(providerId: string, products: any[]): string {
    const tempDir = path.join(__dirname, '.temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `${providerId}-${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(products, null, 2), 'utf-8');

    return tempFile;
  }

  /**
   * Afficher le résumé final
   */
  private displayFinalSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ FINAL');
    console.log('='.repeat(60));

    let totalImported = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const [providerId, progress] of this.progressTracking) {
      const duration = progress.endTime
        ? ((progress.endTime - progress.startTime) / 1000).toFixed(1)
        : 'N/A';

      console.log(`\n${providerId}:`);
      console.log(`  Total:     ${progress.total}`);
      console.log(`  Importés:  ${progress.imported}`);
      console.log(`  Échoués:   ${progress.failed}`);
      console.log(`  Ignorés:   ${progress.skipped}`);
      console.log(`  Durée:     ${duration}s`);

      totalImported += progress.imported;
      totalFailed += progress.failed;
      totalSkipped += progress.skipped;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`Total importés: ${totalImported}`);
    console.log(`Total échoués:  ${totalFailed}`);
    console.log(`Total ignorés:  ${totalSkipped}`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
🚀 Bulk Import CLI - KitchenXpert

Usage:
  pnpm catalog:bulk-import [options]

Exemples:
  pnpm catalog:bulk-import
  pnpm catalog:bulk-import --provider=ikea,schmidt
  pnpm catalog:bulk-import --category=furniture --limit=1000
  pnpm catalog:bulk-import --dry-run

Options:
  --provider=<ids>       Importer uniquement ces providers (séparés par ,)
  --category=<cats>      Filtrer par catégories (séparés par ,)
  --limit=<number>       Nombre max de produits par provider
  --skip-cache           Ignorer le cache et re-télécharger
  --dry-run              Mode test: ne pas importer réellement
  --help                 Afficher cette aide

Providers disponibles:
  Voir catalog-providers/bulk-import/providers-list.json
    `);
    process.exit(0);
  }

  // Parser les arguments
  const providers = args.find(arg => arg.startsWith('--provider='))?.split('=')[1]?.split(',');
  const categories = args.find(arg => arg.startsWith('--category='))?.split('=')[1]?.split(',');
  const limitStr = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const skipCache = args.includes('--skip-cache');
  const dryRun = args.includes('--dry-run');

  try {
    const importer = new BulkImporter();
    await importer.importAll({
      providers,
      categories,
      limit,
      skipCache,
      dryRun,
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

export default BulkImporter;
