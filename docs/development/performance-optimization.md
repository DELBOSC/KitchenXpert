# Performance Optimization

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [Backend Optimization](#backend-optimization)
- [Frontend Optimization](#frontend-optimization)
- [3D Engine Optimization](#3d-engine-optimization)
- [Database Optimization](#database-optimization)
- [Caching Strategies](#caching-strategies)
- [Performance Monitoring](#performance-monitoring)
- [Performance Targets](#performance-targets)

## Overview

This guide covers performance optimization techniques for all components of KitchenXpert.

### Performance Goals

- **API Response Time**: < 100ms p50, < 500ms p99
- **Page Load Time**: < 2s (First Contentful Paint)
- **3D Rendering**: 60 FPS minimum
- **Database Queries**: < 50ms average

## Backend Optimization

### Database Query Optimization

```typescript
// ❌ N+1 Query Problem
async function getUsersWithDesigns() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    user.designs = await prisma.design.findMany({
      where: { userId: user.id }
    });
  }
  return users;
}

// ✅ Use Eager Loading
async function getUsersWithDesigns() {
  return await prisma.user.findMany({
    include: { designs: true }
  });
}
```

### Add Indexes

```sql
-- Index frequently queried columns
CREATE INDEX idx_designs_user_id ON designs(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);

-- Composite indexes for complex queries
CREATE INDEX idx_products_category_manufacturer
ON products(category_id, manufacturer_id);

-- Partial indexes for filtered queries
CREATE INDEX idx_users_active
ON users(email) WHERE is_active = true;
```

### Pagination

```typescript
// ✅ Always paginate large datasets
async function getProducts(page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count()
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}
```

### API Response Caching

```typescript
import { redis } from '@/db/redis';

async function getProduct(id: string) {
  // Check cache first
  const cached = await redis.get(`product:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const product = await prisma.product.findUnique({ where: { id } });

  // Cache for 1 hour
  if (product) {
    await redis.setex(`product:${id}`, 3600, JSON.stringify(product));
  }

  return product;
}
```

## Frontend Optimization

### Code Splitting

```typescript
// Lazy load routes
import { lazy, Suspense } from 'react';

const DesignPage = lazy(() => import('./pages/Design'));
const ProductsPage = lazy(() => import('./pages/Products'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/design" element={<DesignPage />} />
        <Route path="/products" element={<ProductsPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Image Optimization

```typescript
// Use modern formats and lazy loading
<picture>
  <source srcSet="/images/product.webp" type="image/webp" />
  <source srcSet="/images/product.jpg" type="image/jpeg" />
  <img
    src="/images/product.jpg"
    alt="Product"
    loading="lazy"
    width="400"
    height="300"
  />
</picture>

// Responsive images
<img
  srcSet="
    /images/product-small.jpg 400w,
    /images/product-medium.jpg 800w,
    /images/product-large.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
  src="/images/product-medium.jpg"
  alt="Product"
  loading="lazy"
/>
```

### Virtual Scrolling

```typescript
import { FixedSizeList } from 'react-window';

function ProductList({ products }: { products: Product[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Debouncing and Throttling

```typescript
import { debounce } from 'lodash-es';

// Debounce search input
const handleSearch = debounce((query: string) => {
  fetchSearchResults(query);
}, 300);

// Throttle scroll events
const handleScroll = throttle(() => {
  updateScrollPosition();
}, 100);
```

### React Performance

```typescript
// Use memo for expensive components
const ProductCard = memo(({ product }: { product: Product }) => {
  return <div>{product.name}</div>;
});

// Use useMemo for expensive calculations
const filteredProducts = useMemo(() => {
  return products.filter(p => p.price < maxPrice);
}, [products, maxPrice]);

// Use useCallback for functions passed to children
const handleClick = useCallback(() => {
  console.log('Clicked');
}, []);
```

## 3D Engine Optimization

### Object Pooling

```typescript
class ObjectPool {
  private pool: THREE.Mesh[] = [];

  getObject(): THREE.Mesh {
    return this.pool.pop() || this.createObject();
  }

  releaseObject(obj: THREE.Mesh) {
    obj.visible = false;
    this.pool.push(obj);
  }

  private createObject(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    return new THREE.Mesh(geometry, material);
  }
}
```

### Level of Detail (LOD)

```typescript
const lod = new THREE.LOD();

// High detail (close)
const highDetail = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  material
);
lod.addLevel(highDetail, 0);

// Medium detail
const medDetail = new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  material
);
lod.addLevel(medDetail, 10);

// Low detail (far)
const lowDetail = new THREE.Mesh(
  new THREE.SphereGeometry(1, 8, 8),
  material
);
lod.addLevel(lowDetail, 50);

scene.add(lod);
```

### Frustum Culling

```typescript
// Automatically enabled in Three.js
// Objects outside camera view are not rendered

// Manual optimization
mesh.frustumCulled = true;

// Disable for always-visible UI elements
uiElement.frustumCulled = false;
```

### Texture Optimization

```typescript
// Use compressed textures
const texture = textureLoader.load('/textures/wood.jpg');
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;

// Generate mipmaps
texture.generateMipmaps = true;

// Set max anisotropy
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

## Database Optimization

### Query Optimization

```sql
-- Use EXPLAIN to analyze queries
EXPLAIN ANALYZE
SELECT u.*, COUNT(d.id) as design_count
FROM users u
LEFT JOIN designs d ON d.user_id = u.id
GROUP BY u.id;

-- Add covering indexes
CREATE INDEX idx_designs_user_id_created
ON designs(user_id, created_at);

-- Use LIMIT for large result sets
SELECT * FROM products
WHERE category_id = $1
ORDER BY created_at DESC
LIMIT 20;
```

### Connection Pooling

```typescript
// Prisma connection pool
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Connection pool settings
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }
});
```

### Batch Operations

```typescript
// ✅ Batch insert
await prisma.product.createMany({
  data: products,
  skipDuplicates: true
});

// ✅ Batch update
await prisma.user.updateMany({
  where: { isActive: false },
  data: { deletedAt: new Date() }
});
```

## Caching Strategies

### Redis Caching

```typescript
// Cache frequently accessed data
async function getCachedData(key: string, fetcher: () => Promise<any>, ttl = 3600) {
  // Try cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch and cache
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Usage
const user = await getCachedData(
  `user:${userId}`,
  () => UserService.findById(userId),
  3600
);
```

### HTTP Caching

```typescript
// Set cache headers
app.get('/api/v1/products/:id', async (req, res) => {
  const product = await ProductService.findById(req.params.id);

  // Cache for 1 hour
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('ETag', generateETag(product));

  res.json(product);
});
```

### CDN Caching

```typescript
// Vite build configuration
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Add content hash to filenames
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
});
```

## Performance Monitoring

### Web Vitals

```typescript
import { onCLS, onFID, onLCP } from 'web-vitals';

// Measure Core Web Vitals
onCLS(console.log);  // Cumulative Layout Shift
onFID(console.log);  // First Input Delay
onLCP(console.log);  // Largest Contentful Paint

// Send to analytics
function sendToAnalytics(metric) {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(metric)
  });
}

onLCP(sendToAnalytics);
```

### Performance API

```typescript
// Measure custom metrics
performance.mark('design-start');
await generateDesign();
performance.mark('design-end');

performance.measure('design-generation', 'design-start', 'design-end');

const measure = performance.getEntriesByName('design-generation')[0];
console.log(`Design generated in ${measure.duration}ms`);
```

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g @lhci/cli
      - run: lhci autorun
```

## Performance Targets

### Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5-4s | > 4s |
| FID (First Input Delay) | < 100ms | 100-300ms | > 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 |

### API Response Times

| Endpoint Type | p50 | p95 | p99 |
|---------------|-----|-----|-----|
| Simple GET | < 50ms | < 100ms | < 200ms |
| Complex GET | < 100ms | < 300ms | < 500ms |
| POST/PUT | < 200ms | < 500ms | < 1s |

### Database Query Times

| Query Type | Target | Max |
|------------|--------|-----|
| Simple SELECT | < 10ms | 50ms |
| JOIN query | < 50ms | 200ms |
| Aggregation | < 100ms | 500ms |

## Related Documentation

- [Debugging Guide](./debugging.md) - Debugging techniques
- [Testing Guide](./testing.md) - Performance testing
- [Architecture Overview](../architecture/overview.md) - System design
- [Database Schema](../database/schema.md) - Database optimization
