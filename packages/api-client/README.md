# @kitchenxpert/api-client

Client TypeScript pour l'API KitchenXpert. Fournit une interface typée pour communiquer avec le backend.

## Installation

```bash
pnpm add @kitchenxpert/api-client
```

## Utilisation

```typescript
import { createApiClient } from '@kitchenxpert/api-client';

const api = createApiClient({
  baseUrl: 'https://api.kitchenxpert.com',
  // Token JWT optionnel
  token: 'your-jwt-token',
});

// Auth
const { user, token } = await api.auth.login({
  email: 'user@example.com',
  password: 'password',
});

// Kitchens
const kitchens = await api.kitchens.list();
const kitchen = await api.kitchens.get('kitchen-id');
const newKitchen = await api.kitchens.create({ name: 'Ma cuisine' });

// Products
const products = await api.products.search({ query: 'meuble' });

// Orders
const orders = await api.orders.list();
```

## Configuration

```typescript
const api = createApiClient({
  baseUrl: process.env.API_URL,
  token: localStorage.getItem('accessToken'),
  // Options Axios personnalisées
  timeout: 10000,
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## Gestion des erreurs

```typescript
import { ApiError } from '@kitchenxpert/api-client';

try {
  await api.auth.login({ email, password });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.code);    // 'UNAUTHORIZED'
    console.error(error.message); // 'Invalid credentials'
    console.error(error.status);  // 401
  }
}
```

## Hooks React (optionnel)

```typescript
import { useApi } from '@kitchenxpert/api-client/react';

function MyComponent() {
  const api = useApi();

  const handleClick = async () => {
    const kitchens = await api.kitchens.list();
  };
}
```

## Structure

```
src/
├── client.ts           # Client principal
├── endpoints/
│   ├── auth.ts         # Endpoints auth
│   ├── users.ts        # Endpoints users
│   ├── kitchens.ts     # Endpoints kitchens
│   ├── products.ts     # Endpoints products
│   └── orders.ts       # Endpoints orders
├── types.ts            # Types du client
└── errors.ts           # Classes d'erreurs
```

## Scripts

```bash
pnpm --filter @kitchenxpert/api-client build
pnpm --filter @kitchenxpert/api-client test
```
