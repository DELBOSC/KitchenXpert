# @kitchenxpert/common

Package partagé contenant les types, utilitaires et constantes communs à tous les packages KitchenXpert.

## Installation

Ce package est automatiquement installé comme dépendance workspace.

```bash
# Dans package.json d'un autre package
"dependencies": {
  "@kitchenxpert/common": "workspace:*"
}
```

## Contenu

### Types

```typescript
import {
  User,
  Kitchen,
  Product,
  Order,
  ApiResponse,
  PaginatedResponse
} from '@kitchenxpert/common';
```

### Utilitaires

#### Validation
```typescript
import {
  isValidEmail,
  isValidPassword,
  validateSchema
} from '@kitchenxpert/common/utils/validation';
```

#### Formatage
```typescript
import {
  formatCurrency,
  formatDate,
  formatNumber
} from '@kitchenxpert/common/utils/formatting';
```

#### Transformation
```typescript
import {
  groupBy,
  sortBy,
  uniqueBy
} from '@kitchenxpert/common/utils/transformation';
```

## Structure

```
src/
├── types/
│   ├── api.types.ts        # Types API communs
│   ├── user.types.ts       # Types utilisateur
│   ├── product.types.ts    # Types produit
│   ├── kitchen.types.ts    # Types cuisine
│   └── index.ts
├── utils/
│   ├── validation/         # Fonctions de validation
│   ├── formatting/         # Formatage (dates, nombres, devises)
│   ├── transformation/     # Transformation de données
│   └── index.ts
└── constants/
    └── index.ts            # Constantes partagées
```

## Scripts

```bash
# Build
pnpm --filter @kitchenxpert/common build

# Tests
pnpm --filter @kitchenxpert/common test

# Type check
pnpm --filter @kitchenxpert/common type-check
```

## Utilisation

### Dans le backend

```typescript
import { User, ApiResponse } from '@kitchenxpert/common';
import { isValidEmail } from '@kitchenxpert/common/utils/validation';

function createUser(data: Partial<User>): ApiResponse<User> {
  if (!isValidEmail(data.email)) {
    return { success: false, error: 'Invalid email' };
  }
  // ...
}
```

### Dans le frontend

```typescript
import { Product, formatCurrency } from '@kitchenxpert/common';

function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <h3>{product.name}</h3>
      <p>{formatCurrency(product.price, 'EUR')}</p>
    </div>
  );
}
```
