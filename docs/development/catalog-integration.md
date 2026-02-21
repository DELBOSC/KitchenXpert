# Catalog Integration Guide

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [Quick Import System](#quick-import-system)
- [Adding a New Catalog Provider](#adding-a-new-catalog-provider)
- [Using Catalog Templates](#using-catalog-templates)
- [API Integration](#api-integration)
- [Data Mapping and Validation](#data-mapping-and-validation)
- [Testing Catalog Imports](#testing-catalog-imports)
- [Sample Data Creation](#sample-data-creation)
- [Troubleshooting](#troubleshooting)

## Overview

KitchenXpert provides a flexible catalog integration system that allows easy import of product data from various manufacturers and suppliers.

### System Architecture

```
catalog-providers/
├── universal-importer/       # Generic import tool
│   ├── quick-import.ts       # CLI for quick imports
│   ├── catalog-templates/    # Reusable templates
│   └── validators/           # Data validation
├── bulk-import/              # Bulk import API
│   ├── api/                  # REST API endpoints
│   └── processors/           # Data processors
└── providers/                # Manufacturer-specific integrations
    ├── whirlpool/
    ├── samsung/
    └── bosch/
```

## Quick Import System

### Installation

```bash
# Navigate to universal importer
cd catalog-providers/universal-importer

# Install dependencies
pnpm install
```

### Basic Usage

```bash
# Import from CSV
pnpm quick-import --file products.csv --type csv --category appliances

# Import from JSON
pnpm quick-import --file products.json --type json --manufacturer whirlpool

# Import with template
pnpm quick-import --file products.csv --template refrigerator

# Dry run (validation only)
pnpm quick-import --file products.csv --dry-run
```

### Command Options

```typescript
interface QuickImportOptions {
  file: string;              // Path to import file
  type: 'csv' | 'json' | 'xlsx';  // File format
  template?: string;         // Template name
  category?: string;         // Product category
  manufacturer?: string;     // Manufacturer name
  dryRun?: boolean;          // Validate without importing
  batchSize?: number;        // Import batch size (default: 100)
  skipValidation?: boolean;  // Skip validation (not recommended)
}
```

### Example CSV Import

```bash
# Sample products.csv
# name,sku,price,category,manufacturer,description,dimensions,features
# "French Door Refrigerator",WRF535SWHZ,1899.99,refrigerators,whirlpool,"25 cu ft capacity","36x70x35","Water dispenser,Ice maker"

pnpm quick-import \
  --file products.csv \
  --type csv \
  --category refrigerators \
  --manufacturer whirlpool
```

### Example JSON Import

```bash
# Sample products.json
# [{
#   "name": "French Door Refrigerator",
#   "sku": "WRF535SWHZ",
#   "price": 1899.99,
#   "category": "refrigerators",
#   "manufacturer": "whirlpool",
#   "specifications": {
#     "capacity": "25 cu ft",
#     "dimensions": "36x70x35"
#   }
# }]

pnpm quick-import \
  --file products.json \
  --type json
```

## Adding a New Catalog Provider

### Step 1: Create Provider Directory

```bash
mkdir -p catalog-providers/providers/manufacturer-name
cd catalog-providers/providers/manufacturer-name
```

### Step 2: Implement Provider Interface

```typescript
// providers/manufacturer-name/provider.ts
import type { IProductProvider, Product } from '@/types';

export class ManufacturerProvider implements IProductProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.manufacturer.com';
  }

  async fetchProducts(options?: FetchOptions): Promise<Product[]> {
    const response = await fetch(`${this.baseUrl}/products`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return this.mapProducts(data);
  }

  async fetchProduct(sku: string): Promise<Product | null> {
    const response = await fetch(`${this.baseUrl}/products/${sku}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    if (response.status === 404) {
      return null;
    }

    const data = await response.json();
    return this.mapProduct(data);
  }

  private mapProducts(rawData: any[]): Product[] {
    return rawData.map(item => this.mapProduct(item));
  }

  private mapProduct(item: any): Product {
    return {
      sku: item.product_id,
      name: item.product_name,
      price: parseFloat(item.price),
      category: this.mapCategory(item.category_code),
      manufacturer: 'Manufacturer Name',
      description: item.description,
      specifications: {
        dimensions: item.dimensions,
        weight: item.weight,
        capacity: item.capacity,
        energyRating: item.energy_star_rating
      },
      images: item.images?.map((img: any) => ({
        url: img.url,
        isPrimary: img.is_main
      })),
      features: item.features || [],
      inStock: item.stock_quantity > 0,
      metadata: {
        source: 'manufacturer-api',
        lastUpdated: new Date()
      }
    };
  }

  private mapCategory(categoryCode: string): string {
    const categoryMap: Record<string, string> = {
      'REF': 'refrigerators',
      'DW': 'dishwashers',
      'RNG': 'ranges',
      'MW': 'microwaves'
    };
    return categoryMap[categoryCode] || 'other';
  }
}
```

### Step 3: Add Provider Configuration

```typescript
// providers/manufacturer-name/config.ts
export interface ManufacturerConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimit?: number;
  timeout?: number;
}

export const defaultConfig: Partial<ManufacturerConfig> = {
  baseUrl: 'https://api.manufacturer.com',
  rateLimit: 100, // requests per minute
  timeout: 30000  // 30 seconds
};
```

### Step 4: Add Tests

```typescript
// providers/manufacturer-name/provider.test.ts
import { ManufacturerProvider } from './provider';

describe('ManufacturerProvider', () => {
  let provider: ManufacturerProvider;

  beforeEach(() => {
    provider = new ManufacturerProvider({
      apiKey: 'test-key'
    });
  });

  it('should fetch products', async () => {
    const products = await provider.fetchProducts();
    expect(products).toBeInstanceOf(Array);
  });

  it('should map product data correctly', async () => {
    const product = await provider.fetchProduct('TEST-SKU');
    expect(product).toHaveProperty('sku');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
  });
});
```

### Step 5: Register Provider

```typescript
// providers/index.ts
import { ManufacturerProvider } from './manufacturer-name/provider';

export const providers = {
  whirlpool: WhirlpoolProvider,
  samsung: SamsungProvider,
  bosch: BoschProvider,
  'manufacturer-name': ManufacturerProvider  // Add new provider
};

export function getProvider(name: string, config: any) {
  const Provider = providers[name];
  if (!Provider) {
    throw new Error(`Provider "${name}" not found`);
  }
  return new Provider(config);
}
```

## Using Catalog Templates

### Creating a Template

```typescript
// universal-importer/catalog-templates/refrigerator.template.ts
export const refrigeratorTemplate = {
  name: 'refrigerator',
  category: 'refrigerators',
  requiredFields: [
    'name',
    'sku',
    'price',
    'manufacturer'
  ],
  optionalFields: [
    'description',
    'dimensions',
    'capacity',
    'energyRating',
    'features'
  ],
  fieldMappings: {
    'Product Name': 'name',
    'SKU': 'sku',
    'Price ($)': 'price',
    'Brand': 'manufacturer',
    'Description': 'description',
    'Width x Height x Depth': 'dimensions',
    'Total Capacity (cu ft)': 'capacity',
    'Energy Star Rating': 'energyRating'
  },
  validators: {
    price: (value: any) => {
      const price = parseFloat(value);
      return price > 0 && price < 100000;
    },
    capacity: (value: any) => {
      const capacity = parseFloat(value);
      return capacity > 0 && capacity < 50;
    }
  },
  transformers: {
    price: (value: any) => parseFloat(value),
    features: (value: any) => value.split(',').map((f: string) => f.trim())
  }
};
```

### Using a Template

```bash
# Apply template during import
pnpm quick-import \
  --file refrigerators.csv \
  --template refrigerator

# This automatically:
# - Maps column names
# - Validates required fields
# - Transforms data types
# - Sets category
```

### Available Templates

- `refrigerator` - Refrigerators and freezers
- `dishwasher` - Dishwashers
- `range` - Ranges and ovens
- `microwave` - Microwaves
- `cabinet` - Kitchen cabinets
- `countertop` - Countertops
- `sink` - Kitchen sinks
- `faucet` - Kitchen faucets

## API Integration

### Bulk Import API

```typescript
// POST /api/v1/catalog/bulk-import
import { Router } from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { CatalogService } from '@/services/catalog.service';

const router = Router();

router.post(
  '/bulk-import',
  authenticate,
  authorize('partner', 'admin'),
  async (req, res) => {
    try {
      const { products, source, manufacturer } = req.body;

      const result = await CatalogService.bulkImport({
        products,
        source,
        manufacturer,
        userId: req.user.id
      });

      res.json({
        success: true,
        data: {
          imported: result.imported,
          failed: result.failed,
          skipped: result.skipped,
          errors: result.errors
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

### Using the API

```typescript
// Example: Import products via API
async function importProducts(products: Product[]) {
  const response = await fetch('https://api.kitchenxpert.com/api/v1/catalog/bulk-import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      products: products,
      source: 'manufacturer-api',
      manufacturer: 'Whirlpool'
    })
  });

  const result = await response.json();
  console.log(`Imported: ${result.data.imported}`);
  console.log(`Failed: ${result.data.failed}`);
}
```

## Data Mapping and Validation

### Product Schema

```typescript
import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  price: z.number().positive().max(1000000),
  category: z.enum([
    'refrigerators',
    'dishwashers',
    'ranges',
    'microwaves',
    'cabinets',
    'countertops',
    'sinks',
    'faucets',
    'other'
  ]),
  manufacturer: z.string().min(1).max(100),
  description: z.string().optional(),
  specifications: z.object({
    dimensions: z.string().optional(),
    weight: z.string().optional(),
    capacity: z.string().optional(),
    energyRating: z.string().optional(),
    material: z.string().optional(),
    color: z.string().optional()
  }).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    isPrimary: z.boolean().default(false),
    altText: z.string().optional()
  })).optional(),
  features: z.array(z.string()).optional(),
  inStock: z.boolean().default(true),
  tags: z.array(z.string()).optional()
});

export type Product = z.infer<typeof productSchema>;
```

### Validation Example

```typescript
import { productSchema } from '@/schemas/product.schema';

function validateProduct(data: unknown): Product {
  try {
    return productSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid product data', error.errors);
    }
    throw error;
  }
}

// Usage
const validatedProduct = validateProduct(rawProductData);
```

## Testing Catalog Imports

### Unit Tests

```typescript
import { CatalogImporter } from '@/services/catalog-importer';

describe('CatalogImporter', () => {
  it('should import valid products', async () => {
    const products = [
      {
        sku: 'TEST-001',
        name: 'Test Refrigerator',
        price: 999.99,
        category: 'refrigerators',
        manufacturer: 'Test Brand'
      }
    ];

    const result = await CatalogImporter.import(products);

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('should reject invalid products', async () => {
    const products = [
      {
        sku: '',  // Invalid: empty SKU
        name: 'Test',
        price: -100  // Invalid: negative price
      }
    ];

    const result = await CatalogImporter.import(products);

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import app from '@/app';

describe('Catalog Import API', () => {
  it('should import products via API', async () => {
    const response = await request(app)
      .post('/api/v1/catalog/bulk-import')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        products: [
          {
            sku: 'TEST-001',
            name: 'Test Product',
            price: 99.99,
            category: 'refrigerators',
            manufacturer: 'Test'
          }
        ],
        source: 'test',
        manufacturer: 'Test'
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.imported).toBe(1);
  });
});
```

## Sample Data Creation

### Generate Sample Products

```typescript
// scripts/generate-sample-catalog.ts
import { faker } from '@faker-js/faker';
import { writeFile } from 'fs/promises';

interface SampleProduct {
  sku: string;
  name: string;
  price: number;
  category: string;
  manufacturer: string;
  description: string;
  specifications: Record<string, string>;
  features: string[];
}

function generateProduct(category: string): SampleProduct {
  return {
    sku: `${category.toUpperCase()}-${faker.string.alphanumeric(6)}`,
    name: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price({ min: 100, max: 5000 })),
    category,
    manufacturer: faker.company.name(),
    description: faker.commerce.productDescription(),
    specifications: {
      dimensions: `${faker.number.int({ min: 20, max: 40 })}x${faker.number.int({ min: 50, max: 80 })}x${faker.number.int({ min: 20, max: 40 })}`,
      weight: `${faker.number.int({ min: 50, max: 300 })} lbs`,
      capacity: `${faker.number.int({ min: 15, max: 30 })} cu ft`
    },
    features: Array.from({ length: 5 }, () => faker.commerce.productAdjective())
  };
}

async function generateCatalog(count: number) {
  const categories = ['refrigerators', 'dishwashers', 'ranges', 'microwaves'];
  const products: SampleProduct[] = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    products.push(generateProduct(category));
  }

  await writeFile(
    'sample-catalog.json',
    JSON.stringify(products, null, 2)
  );

  console.log(`Generated ${count} sample products`);
}

// Run: pnpm tsx scripts/generate-sample-catalog.ts
generateCatalog(100);
```

### Sample CSV Generator

```bash
# Generate sample CSV
node scripts/generate-sample-csv.js --count 50 --output sample-products.csv
```

## Troubleshooting

### Common Import Issues

#### Duplicate SKUs

```typescript
// Handle duplicate SKUs
try {
  await CatalogService.import(product);
} catch (error) {
  if (error.code === 'DUPLICATE_SKU') {
    // Update existing product instead
    await CatalogService.update(product.sku, product);
  }
}
```

#### Invalid Data Format

```bash
# Validate before importing
pnpm quick-import --file products.csv --dry-run

# Review validation errors
# Fix data and retry
```

#### Missing Required Fields

```typescript
// Check for missing fields
const missingFields = requiredFields.filter(
  field => !product[field]
);

if (missingFields.length > 0) {
  throw new ValidationError(
    `Missing required fields: ${missingFields.join(', ')}`
  );
}
```

#### Rate Limiting

```typescript
// Implement rate limiting for API imports
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 concurrent requests

async function importProductsBatch(products: Product[]) {
  const promises = products.map(product =>
    limit(() => importProduct(product))
  );

  return await Promise.all(promises);
}
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=catalog:* pnpm quick-import --file products.csv

# View detailed logs
tail -f logs/catalog-import.log
```

## Related Documentation

- [API Documentation](../api/catalog.md) - Catalog API reference
- [Database Schema](../database/schema.md#products) - Product schema
- [Partner Portal Guide](../user-guides/partner-portal.md) - Partner features
- [Testing Guide](./testing.md) - Testing practices
