# Catalog Providers System

## Architecture

Ce système utilise un **pattern Factory** pour gérer les 183 intégrations de catalogues de manière standardisée et éviter la duplication de code.

## 🚀 Nouveautés - Ajout Simplifié de Produits

Le système a été amélioré pour permettre l'ajout **facile et rapide** de produits depuis diverses sources :

### ✨ Fonctionnalités principales

1. **🔧 Générateur CLI** - Créer un nouveau provider en 2 minutes
2. **📂 Adaptateurs multi-sources** - Support API, CSV, Excel, JSON, XML
3. **🗺️ Mapping déclaratif** - Configuration JSON au lieu de code
4. **🔄 Synchronisation incrémentale** - Synchro delta uniquement
5. **✅ Validation & Preview** - Prévisualiser avant import

## Structure

```
catalog-providers/
├── common/                          # Classes de base réutilisables
│   ├── base-provider.ts            # Provider abstrait de base
│   ├── base-api-client.ts          # Client API avec retry & rate limiting
│   ├── base-transformer.ts         # Transformations de données communes
│   ├── base-validator.ts           # Validations communes
│   ├── provider-factory.ts         # Factory pour créer des providers
│   ├── adapters/                   # 🆕 Adaptateurs pour sources diverses
│   │   ├── file-based-client.ts   # CSV, Excel, JSON, XML
│   │   └── declarative-mapper.ts  # Mapping sans code
│   ├── sync/                       # 🆕 Synchronisation avancée
│   │   └── incremental-sync.ts    # Synchro incrémentale
│   ├── validation/                 # 🆕 Validation & Preview
│   │   └── import-preview.ts      # Preview avant import
│   └── index.ts
├── cli/                            # 🆕 Outils CLI
│   └── generate-provider.ts       # Générateur de providers
├── furniture-providers/             # 30+ providers de meubles
│   ├── ikea/
│   │   ├── api-client.ts           # Étend BaseApiClient
│   │   ├── schema-mapper.ts        # Convertit IKEA ↔ CatalogItem
│   │   ├── transformer.ts          # Étend BaseTransformer
│   │   ├── validator.ts            # Étend BaseValidator
│   │   └── index.ts                # Enregistre dans le registre
│   └── ...
└── appliance-providers/             # 50+ providers d'électroménager
    └── ...
```

## Avantages

✅ **Zéro duplication** - Code partagé dans `common/`
✅ **Type-safe** - TypeScript strict avec interfaces
✅ **Extensible** - Surcharger uniquement ce qui diffère
✅ **Rate limiting** - Intégré dans BaseApiClient
✅ **Retry automatique** - Avec exponential backoff
✅ **Validation standardisée** - Erreurs cohérentes

## Utilisation

### 1. Créer un nouveau provider

```typescript
// catalog-providers/furniture-providers/monprovider/api-client.ts
import { BaseApiClient } from '../../common/base-api-client';

export class MonProviderApiClient extends BaseApiClient {
  async fetchProducts(options?: FetchOptions): Promise<ProviderProduct[]> {
    const url = `${this.config.apiEndpoint}/products`;
    return this.request<ProviderProduct[]>(url);
  }

  async fetchProductById(id: string): Promise<ProviderProduct> {
    const url = `${this.config.apiEndpoint}/products/${id}`;
    return this.request<ProviderProduct>(url);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request(`${this.config.apiEndpoint}/health`);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 2. Créer le mapper

```typescript
// schema-mapper.ts
import { ISchemaMapper } from '../../common/base-provider';

export class MonProviderSchemaMapper implements ISchemaMapper {
  mapToCatalogItem(providerProduct: ProviderProduct): CatalogItem {
    return {
      id: `monprovider_${providerProduct.id}`,
      providerId: 'monprovider',
      name: providerProduct.name,
      // ... mapper tous les champs
    };
  }

  mapToProviderFormat(catalogItem: CatalogItem): ProviderProduct {
    // Conversion inverse
  }
}
```

### 3. Utiliser les classes de base (optionnel)

```typescript
// transformer.ts - Hérite des transformations communes
import { BaseTransformer } from '../../common/base-transformer';

export class MonProviderTransformer extends BaseTransformer {
  // BaseTransformer fournit déjà:
  // - transformDimensions()
  // - transformPrice()
  // - transformImages()
  // - transformSpecifications()

  // Surcharger uniquement si format spécial
}

// validator.ts
import { BaseValidator } from '../../common/base-validator';

export class MonProviderValidator extends BaseValidator {
  // Ajouter validations spécifiques si besoin
}
```

### 4. Créer le provider et l'enregistrer

```typescript
// index.ts
import { BaseProvider } from '../../common/base-provider';
import { providerRegistry } from '../../common/provider-factory';

export class MonProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    const apiClient = new MonProviderApiClient(config);
    const schemaMapper = new MonProviderSchemaMapper();
    const transformer = new MonProviderTransformer();
    const validator = new MonProviderValidator();

    super(config, apiClient, schemaMapper, transformer, validator);
  }
}

// Enregistrer dans le registre
providerRegistry.register({
  name: 'Mon Provider',
  slug: 'monprovider',
  country: 'FR',
  type: 'furniture',
  factory: (config) => new MonProvider(config),
});
```

### 5. Utiliser le provider via la Factory

```typescript
import { ProviderFactory } from './catalog-providers/common';

// Créer une instance
const config: ProviderConfig = {
  apiEndpoint: 'https://api.monprovider.com',
  apiKey: 'xxx',
  timeout: 5000,
  retryAttempts: 3,
  rateLimit: { maxRequests: 100, windowMs: 60000 }
};

const provider = ProviderFactory.create('ikea', config);

// Synchroniser les produits
const result = await provider.sync();
console.log(`Added: ${result.itemsAdded}, Errors: ${result.errors.length}`);

// Récupérer un produit
const product = await provider.fetchProduct('12345');
```

## BaseApiClient Features

- ✅ **Retry automatique** avec exponential backoff
- ✅ **Rate limiting** configurable
- ✅ **Timeout** par requête
- ✅ **Authentication** (Bearer token)
- ✅ **Error handling** robuste

## BaseTransformer Features

Transformations communes pour:
- **Dimensions**: formats multiples (object, array, string "WxDxH")
- **Prix**: formats multiples (object, number, avec/sans devise)
- **Images**: URL simple, array d'URLs, array d'objets
- **Specifications**: normalisation des clés

## Tests

```bash
# Tester un provider
pnpm test catalog-providers/furniture-providers/ikea

# Tester tous les providers
pnpm test catalog-providers
```

## Configuration

Chaque provider a un fichier `credentials.example.json`:

```json
{
  "apiEndpoint": "https://api.provider.com",
  "apiKey": "YOUR_API_KEY",
  "timeout": 5000,
  "retryAttempts": 3,
  "rateLimit": {
    "maxRequests": 100,
    "windowMs": 60000
  }
}
```

## 🔧 Méthode 1 : Générateur CLI (RECOMMANDÉ)

### Créer un nouveau provider en 2 minutes

```bash
# Lancer le générateur interactif
pnpm tsx catalog-providers/cli/generate-provider.ts

# Répondre aux questions :
# - Nom du provider: IKEA
# - Type: furniture
# - Pays: SE
# - Type de source: api
# - URL de l'API: https://api.ikea.com
# - Auth required? yes
# - Auth type: api-key

# ✅ Tous les fichiers sont générés automatiquement !
```

Le générateur crée automatiquement :
- ✅ `api-client.ts` ou `file-client.ts` selon le type
- ✅ `schema-mapper.ts` avec mapping de base
- ✅ `transformer.ts` et `validator.ts`
- ✅ `index.ts` avec enregistrement
- ✅ `credentials.example.json`
- ✅ `models.ts` avec types TypeScript
- ✅ `README.md` avec documentation

### Options de sources supportées

1. **API REST** - Client HTTP avec retry et rate limiting
2. **CSV** - Parser CSV avec détection automatique du délimiteur
3. **Excel** - Support .xlsx et .xls
4. **JSON** - Fichiers JSON locaux ou URLs
5. **XML** - Parser XML avec conversion en objets

## 🗺️ Méthode 2 : Mapping Déclaratif (SANS CODE)

Pour les sources simples, utilisez le mapping déclaratif :

```typescript
// catalog-providers/furniture-providers/simple-provider/mapping.config.ts
import { MappingConfig, CommonTransforms } from '../../common/adapters/declarative-mapper';

export const mapping: MappingConfig = {
  // Valeurs constantes pour tous les produits
  constants: {
    type: 'furniture',
    brand: 'Ma Marque',
    currency: 'EUR',
  },

  // Valeurs par défaut si champ manquant
  defaults: {
    status: 'available',
    stock: 0,
  },

  // Mapping des champs
  fields: {
    // Mapping simple
    name: 'product_name',
    model: 'sku',

    // Mapping avec fallback (essaie dans l'ordre)
    description: ['long_description', 'short_description', 'title'],

    // Mapping avec transformation
    price: {
      source: 'price_value',
      transform: CommonTransforms.toNumber,
      required: true,
    },

    dimensions: {
      source: 'dimensions_string',  // Ex: "80x60x200"
      transform: CommonTransforms.toDimensions,
    },

    images: {
      source: ['image_url', 'image_urls', 'photos'],
      transform: CommonTransforms.toImages,
    },

    // Transformation custom
    category: {
      source: 'product_type',
      transform: (value: string) => value.toLowerCase().replace(/_/g, '-'),
    },
  },
};

// Utiliser le mapper déclaratif
import { DeclarativeMapper } from '../../common/adapters/declarative-mapper';

const mapper = new DeclarativeMapper(mapping);
const catalogItem = mapper.map(sourceProduct, 'my-provider');
```

### Transformations disponibles

```typescript
CommonTransforms.toNumber(value)      // Converti en nombre
CommonTransforms.toPrice(value)       // Extrait prix + devise
CommonTransforms.toDimensions(value)  // Parse "WxDxH" ou array
CommonTransforms.toArray(value)       // Convertit en array
CommonTransforms.toImages(value)      // Normalise URLs images
CommonTransforms.toStatus(value)      // Normalise le statut
CommonTransforms.toBoolean(value)     // Convertit en boolean
CommonTransforms.trim(value)          // Nettoie les espaces
CommonTransforms.lowercase(value)     // Minuscules
CommonTransforms.uppercase(value)     // Majuscules
```

## 🔄 Synchronisation Incrémentale

Synchronisez uniquement les produits modifiés :

```typescript
import { IncrementalSyncManager } from '../common/sync/incremental-sync';

const syncManager = new IncrementalSyncManager();

// Sync incrémentale (uniquement les changements)
const result = await syncManager.sync(
  'ikea',
  currentProducts,    // Produits actuels depuis l'API
  previousProducts,   // Produits en DB
  'hash'             // Stratégie: 'hash' | 'timestamp' | 'full'
);

console.log(`Ajoutés: ${result.added.length}`);
console.log(`Modifiés: ${result.updated.length}`);
console.log(`Supprimés: ${result.removed.length}`);
console.log(`Inchangés: ${result.unchanged}`);
```

### Stratégies de détection de changements

- **hash** : Compare un hash des champs significatifs (recommandé)
- **timestamp** : Compare `updatedAt` si disponible
- **full** : Force une mise à jour complète

## ✅ Validation & Preview

Prévisualisez les données avant import :

```typescript
import { ImportPreviewManager } from '../common/validation/import-preview';

const previewManager = new ImportPreviewManager({
  checkDuplicates: true,
  priceLimits: { min: 0, max: 50000 },
  requiredFields: ['name', 'price', 'model'],
  strict: false,  // true = rejette si warnings
  previewLimit: 100,
});

// Générer le preview
const preview = await previewManager.generatePreview(
  sourceProducts,
  (product) => mapper.map(product, 'my-provider')
);

// Afficher dans la console
console.log(previewManager.formatPreviewForConsole(preview));

// Résultat:
// ═══════════════════════════════════════════════════════
// 📊 PREVIEW D'IMPORT DE CATALOGUE
// ═══════════════════════════════════════════════════════
//
// 📈 STATISTIQUES:
//    Total: 100 produits
//    Valides: 95 ✅
//    Invalides: 5 ❌
//    Avertissements: 12 ⚠️
//
// 💰 PRIX:
//    Min: 29.99€
//    Max: 2499.00€
//    Moyen: 456.78€
//
// 💡 RECOMMANDATIONS:
//    ✅ Les données semblent cohérentes. Prêt pour l'import.

// Procéder uniquement si satisfait
if (preview.invalidProducts.length === 0) {
  // Import en DB
  await saveToDatabase(preview.validProducts.map(p => p.mapped));
}
```

## 📂 Exemple Complet : Provider CSV

```typescript
// catalog-providers/furniture-providers/csv-provider/index.ts
import { FileBasedApiClient } from '../../common/adapters/file-based-client';
import { DeclarativeMapper } from '../../common/adapters/declarative-mapper';
import { BaseProvider } from '../../common/base-provider';
import { mappingConfig } from './mapping.config';

// 1. Client pour fichier CSV
class CSVProviderClient extends FileBasedApiClient {
  constructor() {
    super({
      apiEndpoint: './data/products.csv',
      sourceType: 'csv',
      cacheEnabled: true,
      cacheTTL: 3600,
    });
  }
}

// 2. Provider
class CSVProvider extends BaseProvider {
  private mapper: DeclarativeMapper;

  constructor(config: ProviderConfig) {
    const apiClient = new CSVProviderClient();
    const mapper = new DeclarativeMapper(mappingConfig);

    super(config, apiClient, mapper, transformer, validator);
    this.mapper = mapper;
  }
}

// 3. Enregistrer
providerRegistry.register({
  name: 'CSV Products',
  slug: 'csv-provider',
  country: 'FR',
  type: 'furniture',
  factory: (config) => new CSVProvider(config),
});
```

## Bonnes Pratiques

1. **Utiliser le générateur CLI** - Gain de temps massif
2. **Privilégier le mapping déclaratif** - Moins de code = moins de bugs
3. **Toujours prévisualiser** - Éviter les mauvaises surprises
4. **Sync incrémentale** - Économiser bande passante et temps
5. **Valider les données** - Détecter les problèmes tôt

## Ajout d'un nouveau provider - Checklist

### Méthode rapide (CLI)
- [ ] Lancer `pnpm tsx catalog-providers/cli/generate-provider.ts`
- [ ] Répondre aux questions interactives
- [ ] Ajuster le mapping si nécessaire
- [ ] Tester avec preview
- [ ] Lancer la synchronisation

### Méthode manuelle (si besoin de customisation)
- [ ] Créer le dossier `catalog-providers/{type}-providers/{nom}/`
- [ ] Implémenter `api-client.ts` (étendre `BaseApiClient` ou `FileBasedApiClient`)
- [ ] Créer `mapping.config.ts` (utiliser `DeclarativeMapper`)
- [ ] Implémenter `transformer.ts` et `validator.ts` si nécessaire
- [ ] Créer `index.ts` et enregistrer dans `providerRegistry`
- [ ] Ajouter `credentials.example.json`
- [ ] Écrire des tests
- [ ] Documenter les spécificités du provider

## Questions Fréquentes

### Général

**Q: Dois-je implémenter toutes les méthodes de BaseTransformer ?**
R: Non, `BaseTransformer` fournit déjà toutes les méthodes. Surcharger uniquement si format spécifique.

**Q: Comment gérer les formats de données différents ?**
R: `BaseTransformer` supporte déjà plusieurs formats. Sinon, surcharger la méthode.

**Q: Que faire si l'API du provider a une pagination différente ?**
R: Implémenter la logique dans `api-client.ts`, le reste reste identique.

**Q: Comment gérer les erreurs API ?**
R: `BaseApiClient` gère automatiquement retry et timeout. Les erreurs remontent via exceptions.

### Nouvelles fonctionnalités

**Q: Dois-je écrire du code pour mapper mes données ?**
R: Non ! Utilisez `DeclarativeMapper` avec une configuration JSON. Seulement ~20 lignes de config au lieu de 200 lignes de code.

**Q: Peut-on importer depuis un fichier Excel ?**
R: Oui, utilisez `FileBasedApiClient` avec `sourceType: 'excel'`. Support .xlsx et .xls automatique.

**Q: Comment éviter de re-synchroniser tous les produits à chaque fois ?**
R: Utilisez `IncrementalSyncManager` qui détecte automatiquement les changements via hash ou timestamp.

**Q: Comment vérifier mes données avant de les insérer en base ?**
R: Utilisez `ImportPreviewManager` pour avoir un aperçu complet avec statistiques, erreurs et recommandations.

**Q: Le générateur CLI supporte-t-il les APIs avec authentification OAuth ?**
R: Actuellement, le générateur supporte API key, Bearer token et Basic auth. OAuth nécessite une implémentation manuelle.

**Q: Puis-je utiliser plusieurs sources pour le même provider ?**
R: Oui, créez plusieurs clients (ex: `APIClient` pour les nouveautés, `CSVClient` pour le catalogue complet) et fusionnez les résultats.

**Q: Les transformations `CommonTransforms` couvrent-elles tous les cas ?**
R: Elles couvrent 90% des cas. Pour des transformations complexes, créez une fonction custom dans votre mapping config.

**Q: La synchronisation incrémentale fonctionne-t-elle avec des fichiers CSV ?**
R: Oui, elle compare les hash même pour des fichiers. Mais `timestamp` nécessite que votre CSV ait une colonne `updatedAt`.

## 🚀 Quick Start

Pour créer votre premier provider en 5 minutes :

```bash
# 1. Générer le provider
pnpm tsx catalog-providers/cli/generate-provider.ts

# 2. Tester la connexion (selon le type généré)
cd catalog-providers/furniture-providers/mon-provider
pnpm tsx test-connection.ts

# 3. Preview des données
pnpm tsx preview-import.ts

# 4. Lancer la synchronisation
pnpm tsx sync.ts
```

## 📚 Documentation Complète

- [Guide de démarrage](./docs/GETTING_STARTED.md)
- [Référence API](./docs/API_REFERENCE.md)
- [Exemples avancés](./docs/ADVANCED_EXAMPLES.md)
- [Migration depuis l'ancien système](./docs/MIGRATION.md)
