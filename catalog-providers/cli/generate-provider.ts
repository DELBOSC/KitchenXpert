#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

/**
 * CLI pour générer un nouveau provider en 2 minutes
 * Usage: pnpm run generate:provider
 */

interface ProviderConfig {
  name: string;
  slug: string;
  type: 'furniture' | 'appliance';
  country: string;
  sourceType: 'api' | 'csv' | 'excel' | 'json' | 'scraping';
  apiEndpoint?: string;
  authType?: 'none' | 'api-key' | 'oauth' | 'basic';
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function generateProvider(): Promise<void> {
  console.log('\n🚀 Générateur de Provider KitchenXpert\n');

  const config: ProviderConfig = {
    name: await question('Nom du provider (ex: IKEA): '),
    slug: '',
    type: (await question('Type (furniture/appliance): ')) as any,
    country: await question('Code pays (ex: FR, SE, DE): '),
    sourceType: (await question(
      'Source de données (api/csv/excel/json/scraping): '
    )) as any,
  };

  // Générer le slug
  config.slug = config.name.toLowerCase().replace(/\s+/g, '-');

  // Questions spécifiques à l'API
  if (config.sourceType === 'api') {
    config.apiEndpoint = await question('URL API (ex: https://api.provider.com): ');
    config.authType = (await question(
      'Type d\'auth (none/api-key/oauth/basic): '
    )) as any;
  }

  rl.close();

  console.log('\n📦 Génération du provider...\n');

  // Créer la structure
  const providerDir = path.join(
    __dirname,
    '..',
    `${config.type}-providers`,
    config.slug
  );

  if (fs.existsSync(providerDir)) {
    console.error(`❌ Le provider ${config.slug} existe déjà !`);
    process.exit(1);
  }

  fs.mkdirSync(providerDir, { recursive: true });
  fs.mkdirSync(path.join(providerDir, 'model'), { recursive: true });

  // Générer les fichiers
  generateApiClient(providerDir, config);
  generateSchemaMapper(providerDir, config);
  generateTransformer(providerDir, config);
  generateValidator(providerDir, config);
  generateIndex(providerDir, config);
  generateCredentialsExample(providerDir, config);
  generateModel(providerDir, config);
  generateReadme(providerDir, config);

  console.log(`✅ Provider ${config.name} créé avec succès !`);
  console.log(`📁 Emplacement: ${providerDir}`);
  console.log(`\n📝 Prochaines étapes:`);
  console.log(`1. Copier credentials.example.json → credentials.json`);
  console.log(`2. Remplir les credentials avec vos clés API`);
  console.log(`3. Implémenter la logique spécifique dans api-client.ts`);
  console.log(`4. Tester avec: pnpm test ${config.slug}`);
}

function generateApiClient(dir: string, config: ProviderConfig): void {
  const content = config.sourceType === 'api'
    ? generateApiClientForAPI(config)
    : generateApiClientForFile(config);

  fs.writeFileSync(path.join(dir, 'api-client.ts'), content);
}

function generateApiClientForAPI(config: ProviderConfig): string {
  const className = toPascalCase(config.slug);

  return `import { BaseApiClient } from '../../common/base-api-client';
import { ProviderProduct, FetchOptions } from '../../common/base-provider';

/**
 * Client API pour ${config.name}
 * Documentation API: [TODO: Ajouter lien]
 */
export class ${className}ApiClient extends BaseApiClient {
  /**
   * Récupère tous les produits
   */
  async fetchProducts(options?: FetchOptions): Promise<ProviderProduct[]> {
    const params = new URLSearchParams();

    if (options?.category) {
      params.append('category', options.category);
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }
    if (options?.offset) {
      params.append('offset', String(options.offset));
    }

    // TODO: Adapter selon l'API de ${config.name}
    const url = \`\${this.config.apiEndpoint}/products?\${params.toString()}\`;
    const response = await this.request<{ products: ProviderProduct[] }>(url);

    return response.products; // Adapter selon la réponse API
  }

  /**
   * Récupère un produit par ID
   */
  async fetchProductById(id: string): Promise<ProviderProduct> {
    // TODO: Adapter selon l'API de ${config.name}
    const url = \`\${this.config.apiEndpoint}/products/\${id}\`;
    return this.request<ProviderProduct>(url);
  }

  /**
   * Teste la connexion à l'API
   */
  async testConnection(): Promise<boolean> {
    try {
      // TODO: Adapter selon l'API de ${config.name}
      const url = \`\${this.config.apiEndpoint}/health\`;
      await this.request<{ status: string }>(url);
      return true;
    } catch {
      return false;
    }
  }
}
`;
}

function generateApiClientForFile(config: ProviderConfig): string {
  const className = toPascalCase(config.slug);

  return `import { FileBasedApiClient } from '../../common/adapters/file-based-client';
import { ProviderProduct } from '../../common/base-provider';

/**
 * Client pour ${config.name} (source: ${config.sourceType})
 * Fichier de données: [TODO: Spécifier l'emplacement]
 */
export class ${className}ApiClient extends FileBasedApiClient {
  constructor(config: any) {
    super(config, '${config.sourceType}');
  }

  /**
   * Parse les données spécifiques à ${config.name}
   */
  protected parseData(rawData: any): ProviderProduct[] {
    // TODO: Implémenter le parsing selon le format de ${config.name}
    return rawData.map((item: any) => ({
      id: item.id || item.product_id,
      name: item.name || item.title,
      price: item.price,
      // ... mapper tous les champs
    }));
  }
}
`;
}

function generateSchemaMapper(dir: string, config: ProviderConfig): void {
  const className = toPascalCase(config.slug);

  const content = `import { CatalogItem } from '@kitchenxpert/common';
import { ISchemaMapper, ProviderProduct } from '../../common/base-provider';
import { ${className}Transformer } from './transformer';

/**
 * Mapper de schéma pour ${config.name}
 * Convertit entre le format ${config.name} et CatalogItem
 */
export class ${className}SchemaMapper implements ISchemaMapper {
  private transformer: ${className}Transformer;

  constructor() {
    this.transformer = new ${className}Transformer();
  }

  /**
   * Mappe un produit ${config.name} vers CatalogItem
   */
  mapToCatalogItem(providerProduct: ProviderProduct): CatalogItem {
    // TODO: Adapter les noms de champs selon l'API de ${config.name}
    const dimensions = this.transformer.transformDimensions(
      providerProduct.dimensions || providerProduct.size
    );

    const { price, currency } = this.transformer.transformPrice(
      providerProduct.price
    );

    const images = this.transformer.transformImages(
      providerProduct.images || providerProduct.pictures
    );

    return {
      id: \`${config.slug}_\${providerProduct.id}\`,
      providerId: '${config.slug}',
      providerItemId: providerProduct.id,
      type: '${config.type === 'furniture' ? 'furniture' : 'appliance'}',
      category: providerProduct.category || 'kitchen',
      subcategory: providerProduct.subcategory || null,
      name: providerProduct.name || providerProduct.productName,
      description: providerProduct.description || null,
      brand: '${config.name}',
      model: providerProduct.model || providerProduct.reference,
      sku: providerProduct.sku || providerProduct.reference,
      price,
      currency,
      dimensions: dimensions ? { ...dimensions, unit: 'cm' } : undefined,
      specifications: this.transformer.transformSpecifications(
        providerProduct.specifications || {}
      ),
      images,
      colors: providerProduct.colors || [],
      materials: providerProduct.materials || [],
      status: this.mapStatus(providerProduct.availability),
      stock: providerProduct.stock,
      url: providerProduct.url,
      warranty: providerProduct.warranty,
      tags: providerProduct.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CatalogItem;
  }

  /**
   * Mappe un CatalogItem vers le format ${config.name}
   */
  mapToProviderFormat(catalogItem: CatalogItem): ProviderProduct {
    // TODO: Implémenter si nécessaire
    return {
      id: catalogItem.providerItemId,
      name: catalogItem.name,
      // ... mapper les autres champs
    };
  }

  /**
   * Mappe le statut ${config.name} vers notre format
   */
  private mapStatus(
    availability: any
  ): 'available' | 'out_of_stock' | 'discontinued' {
    if (!availability) return 'available';

    const status = String(availability).toLowerCase();

    if (status.includes('available') || status.includes('in stock')) {
      return 'available';
    }
    if (status.includes('out of stock') || status.includes('unavailable')) {
      return 'out_of_stock';
    }
    if (status.includes('discontinued')) {
      return 'discontinued';
    }

    return 'available';
  }
}
`;

  fs.writeFileSync(path.join(dir, 'schema-mapper.ts'), content);
}

function generateTransformer(dir: string, config: ProviderConfig): void {
  const className = toPascalCase(config.slug);

  const content = `import { BaseTransformer } from '../../common/base-transformer';

/**
 * Transformer pour ${config.name}
 * Gère les transformations spécifiques au format de ${config.name}
 */
export class ${className}Transformer extends BaseTransformer {
  // Le BaseTransformer fournit déjà les méthodes standard
  // Surcharger ici uniquement si ${config.name} a des formats spéciaux

  /**
   * Exemple: Si ${config.name} utilise un format spécial pour les dimensions
   */
  // transformDimensions(data: any): { width: number; depth: number; height: number } {
  //   // Format spécial de ${config.name}
  //   if (typeof data === 'string' && data.includes('x')) {
  //     const parts = data.split('x').map(p => this.parseNumber(p));
  //     if (parts.length >= 3) {
  //       return { width: parts[0], depth: parts[1], height: parts[2] };
  //     }
  //   }
  //   return super.transformDimensions(data);
  // }
}
`;

  fs.writeFileSync(path.join(dir, 'transformer.ts'), content);
}

function generateValidator(dir: string, config: ProviderConfig): void {
  const className = toPascalCase(config.slug);

  const content = `import { BaseValidator } from '../../common/base-validator';
import { ProviderProduct, ValidationResult } from '../../common/base-provider';

/**
 * Validateur pour ${config.name}
 * Règles de validation spécifiques
 */
export class ${className}Validator extends BaseValidator {
  /**
   * Valide un produit ${config.name}
   */
  validate(data: ProviderProduct): ValidationResult {
    const baseResult = super.validate(data);
    const errors = [...baseResult.errors];

    // Validations spécifiques ${config.name}
    // TODO: Ajouter les règles métier spécifiques

    if (!data.name) {
      errors.push('Name is required');
    }

    if (!data.price || typeof data.price !== 'number') {
      errors.push('Valid price is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
`;

  fs.writeFileSync(path.join(dir, 'validator.ts'), content);
}

function generateIndex(dir: string, config: ProviderConfig): void {
  const className = toPascalCase(config.slug);

  const content = `import { ProviderConfig } from '@kitchenxpert/common';
import { BaseProvider } from '../../common/base-provider';
import { providerRegistry } from '../../common/provider-factory';
import { ${className}ApiClient } from './api-client';
import { ${className}SchemaMapper } from './schema-mapper';
import { ${className}Transformer } from './transformer';
import { ${className}Validator } from './validator';

/**
 * Provider ${config.name}
 */
export class ${className}Provider extends BaseProvider {
  constructor(config: ProviderConfig) {
    const apiClient = new ${className}ApiClient(config);
    const schemaMapper = new ${className}SchemaMapper();
    const transformer = new ${className}Transformer();
    const validator = new ${className}Validator();

    super(config, apiClient, schemaMapper, transformer, validator);
  }
}

/**
 * Enregistrer automatiquement dans le registre
 */
providerRegistry.register({
  name: '${config.name}',
  slug: '${config.slug}',
  country: '${config.country}',
  type: '${config.type}',
  factory: (config: ProviderConfig) => new ${className}Provider(config),
});

export {
  ${className}ApiClient,
  ${className}SchemaMapper,
  ${className}Transformer,
  ${className}Validator,
};
`;

  fs.writeFileSync(path.join(dir, 'index.ts'), content);
}

function generateCredentialsExample(dir: string, config: ProviderConfig): void {
  const content: any = {
    apiEndpoint: config.apiEndpoint || `https://api.${config.slug}.com/v1`,
    timeout: 5000,
    retryAttempts: 3,
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000,
    },
  };

  if (config.sourceType === 'api') {
    if (config.authType === 'api-key') {
      content.apiKey = 'YOUR_API_KEY_HERE';
    } else if (config.authType === 'oauth') {
      content.clientId = 'YOUR_CLIENT_ID';
      content.clientSecret = 'YOUR_CLIENT_SECRET';
    } else if (config.authType === 'basic') {
      content.username = 'YOUR_USERNAME';
      content.password = 'YOUR_PASSWORD';
    }
  } else {
    content.filePath = `./data/${config.slug}-products.${config.sourceType}`;
    content.encoding = 'utf-8';
  }

  fs.writeFileSync(
    path.join(dir, 'credentials.example.json'),
    JSON.stringify(content, null, 2)
  );
}

function generateModel(dir: string, config: ProviderConfig): void {
  const content = `/**
 * Modèle de données pour ${config.name}
 * Définit la structure des produits retournés par l'API/fichier
 */

export interface ${toPascalCase(config.slug)}Product {
  id: string;
  name: string;
  description?: string;
  price: number | { amount: number; currency: string };
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  sku?: string;
  reference?: string;

  // Dimensions
  dimensions?: {
    width: number;
    depth: number;
    height: number;
    unit?: string;
  } | string;  // Peut être "WxDxH"

  // Images
  images?: string[] | Array<{ url: string; alt?: string }>;

  // Disponibilité
  availability?: string | boolean;
  stock?: number;

  // Métadonnées
  colors?: string[];
  materials?: string[];
  specifications?: Record<string, any>;
  warranty?: string;
  url?: string;
  tags?: string[];

  // TODO: Ajouter les champs spécifiques à ${config.name}
}
`;

  fs.writeFileSync(path.join(dir, 'model', 'product-model.ts'), content);
}

function generateReadme(dir: string, config: ProviderConfig): void {
  const content = `# ${config.name} Provider

Provider pour intégrer les produits ${config.name} dans KitchenXpert.

## Configuration

1. Copier \`credentials.example.json\` → \`credentials.json\`
2. Remplir avec vos identifiants ${config.name}

\`\`\`json
${fs.readFileSync(path.join(dir, 'credentials.example.json'), 'utf-8')}
\`\`\`

## Utilisation

\`\`\`typescript
import { ProviderFactory } from '../common/provider-factory';

const config = require('./credentials.json');
const provider = ProviderFactory.create('${config.slug}', config);

// Synchroniser les produits
const result = await provider.sync();
console.log(\`Synchronisé: \${result.itemsAdded} produits\`);

// Récupérer un produit
const product = await provider.fetchProduct('product-id');
\`\`\`

## Documentation API

**Base URL:** ${config.apiEndpoint || '[TODO]'}

**Authentication:** ${config.authType || 'none'}

**Endpoints:**
- \`GET /products\` - Liste des produits
- \`GET /products/:id\` - Détails d'un produit
- [TODO: Documenter les autres endpoints]

## Rate Limiting

- Maximum: 100 requêtes par minute
- Retry automatique en cas d'échec

## Notes d'Implémentation

**Points d'attention:**
- [TODO: Format spécial des dimensions?]
- [TODO: Gestion des images?]
- [TODO: Mapping des catégories?]

**Tests:**
\`\`\`bash
pnpm test ${config.slug}
\`\`\`

## Support

**Documentation:** [TODO: Lien vers la doc ${config.name}]
**Contact:** [TODO: Email support ${config.name}]
`;

  fs.writeFileSync(path.join(dir, 'README.md'), content);
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Exécuter
generateProvider().catch((error) => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
