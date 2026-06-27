# Debugging Guide

**Last Updated:** 2026-01-10

## Table of Contents

- [Overview](#overview)
- [Backend Debugging](#backend-debugging)
- [Frontend Debugging](#frontend-debugging)
- [3D Engine Debugging](#3d-engine-debugging)
- [AI Modules Debugging](#ai-modules-debugging)
- [Database Debugging](#database-debugging)
- [Common Debugging Scenarios](#common-debugging-scenarios)
- [Debugging Tools](#debugging-tools)

## Overview

Effective debugging is crucial for development productivity. This guide covers
debugging techniques and tools for all components of KitchenXpert.

## Backend Debugging

### VS Code Debugger

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "cwd": "${workspaceFolder}/packages/backend",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      }
    }
  ]
}
```

**Usage:**

1. Set breakpoints in VS Code
2. Press F5 or click "Run and Debug"
3. Execution pauses at breakpoints
4. Use Debug Console for expressions

### Node.js Inspector

```bash
# Start with inspector
node --inspect-brk packages/backend/dist/index.js

# Open Chrome DevTools
# Navigate to: chrome://inspect
# Click "inspect" on your Node.js process
```

### Winston Logging

```typescript
import { logger } from '@/utils/logger';

// Log at different levels
logger.debug('Detailed debugging info', { query, params });
logger.info('Request received', { method: req.method, path: req.path });
logger.warn('Unusual condition', { userId, action });
logger.error('Error occurred', { error: error.message, stack: error.stack });

// Add context
logger.info('User action', {
  userId: user.id,
  action: 'design_created',
  timestamp: new Date(),
  metadata: { designId, designName },
});
```

### Database Query Debugging

```typescript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug('Query executed', {
    query: e.query,
    params: e.params,
    duration: `${e.duration}ms`,
  });
});

// Log slow queries
prisma.$on('query', (e) => {
  if (e.duration > 100) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration: `${e.duration}ms`,
    });
  }
});
```

### API Request Debugging

```typescript
// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
    });
  });

  next();
});

// Debug specific endpoints
router.post('/users', (req, res, next) => {
  logger.debug('Create user request', {
    body: req.body,
    headers: req.headers,
  });
  next();
});
```

## Frontend Debugging

### React DevTools

**Installation:**

```bash
# Chrome Extension
# https://chrome.google.com/webstore/detail/react-developer-tools
```

**Features:**

- Inspect component hierarchy
- View props and state
- Track component updates
- Profile performance

**Usage:**

1. Open Chrome DevTools (F12)
2. Click "Components" or "Profiler" tab
3. Select component to inspect
4. View props, hooks, and state

### Chrome DevTools

#### Console Debugging

```typescript
// Strategic console.log placement
function calculateTotal(items: CartItem[]): number {
  console.log('calculateTotal called', { itemCount: items.length });

  const total = items.reduce((sum, item) => {
    console.log('Processing item', { item, currentSum: sum });
    return sum + item.price * item.quantity;
  }, 0);

  console.log('Total calculated', { total });
  return total;
}

// Use console.table for arrays
console.table(users);

// Use console.group for organization
console.group('User Login');
console.log('Username:', username);
console.log('Timestamp:', new Date());
console.groupEnd();
```

#### Network Tab

**Debugging API calls:**

1. Open Network tab
2. Filter by "XHR" or "Fetch"
3. Click request to see:
   - Request headers
   - Request payload
   - Response data
   - Response time

**Common issues:**

- **404 errors** - Check endpoint URL
- **401/403 errors** - Check authentication
- **500 errors** - Check server logs
- **Slow requests** - Check Network throttling

#### Source Maps

Ensure source maps are enabled:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true, // Enable source maps
  },
});
```

**Usage:**

1. Open Sources tab
2. Navigate to webpack:// sources
3. Set breakpoints in TypeScript files
4. Execution pauses at breakpoints

### React Query DevTools

```typescript
// Add to your app
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

**Features:**

- View all queries and mutations
- See cached data
- Inspect query state
- Trigger refetch manually

### Redux DevTools (if using Redux)

```typescript
import { configureStore } from '@reduxjs/toolkit';

const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production',
});
```

**Features:**

- Time travel debugging
- Action history
- State snapshots
- Performance monitoring

## 3D Engine Debugging

### Three.js Inspector

```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';

export class DesignEngine {
  private stats?: Stats;

  init() {
    // Add FPS counter
    if (process.env.NODE_ENV === 'development') {
      this.stats = new Stats();
      document.body.appendChild(this.stats.dom);
    }

    // Add helpers
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);
  }

  render() {
    this.stats?.update();
    this.renderer.render(this.scene, this.camera);
  }
}
```

### Performance Monitoring

```typescript
export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();

  update() {
    this.frameCount++;

    if (this.frameCount % 60 === 0) {
      const now = performance.now();
      const fps = 1000 / ((now - this.lastTime) / 60);
      console.log(`FPS: ${fps.toFixed(2)}`);
      this.lastTime = now;
    }
  }

  logMemory() {
    if (performance.memory) {
      console.log('Memory:', {
        used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(performance.memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      });
    }
  }
}
```

### WebGL Debugging

Enable WebGL debugging:

```typescript
// Enable WebGL debug mode
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2', { debug: true });

// Log WebGL errors
function checkGLError(gl: WebGLRenderingContext, label: string) {
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.error(`WebGL Error (${label}):`, error);
  }
}

// Use in rendering loop
checkGLError(gl, 'After render');
```

## AI Modules Debugging

### Python Debugger (pdb)

```python
import pdb

async def generate_design(params: DesignParams) -> Design:
    # Set breakpoint
    pdb.set_trace()

    # Process params
    result = await model.predict(params)

    return result
```

**Commands:**

- `n` - Next line
- `s` - Step into function
- `c` - Continue execution
- `p variable` - Print variable
- `l` - List source code
- `q` - Quit debugger

### FastAPI Debug Mode

```python
# Run with reload and debug
uvicorn app.main:app --reload --log-level debug

# Enable detailed error messages
from fastapi import FastAPI

app = FastAPI(debug=True)  # Only in development!
```

### Model Inference Testing

```python
import logging

logger = logging.getLogger(__name__)

async def generate_design(params: DesignParams) -> Design:
    logger.debug(f"Design generation started with params: {params}")

    try:
        # Preprocess
        preprocessed = preprocess(params)
        logger.debug(f"Preprocessed data: {preprocessed}")

        # Model prediction
        prediction = await model.predict(preprocessed)
        logger.debug(f"Model prediction: {prediction}")

        # Postprocess
        result = postprocess(prediction)
        logger.debug(f"Final result: {result}")

        return result

    except Exception as e:
        logger.error(f"Design generation failed: {e}", exc_info=True)
        raise
```

### Request/Response Logging

```python
from fastapi import Request
import time

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    logger.debug(f"Headers: {request.headers}")

    # Process request
    response = await call_next(request)

    # Log response
    duration = time.time() - start_time
    logger.info(f"Response: {response.status_code} ({duration:.2f}s)")

    return response
```

## Database Debugging

### PostgreSQL Query Debugging

```bash
# Enable query logging
# Edit postgresql.conf:
log_statement = 'all'
log_duration = on
log_min_duration_statement = 100  # Log queries > 100ms

# Restart PostgreSQL
sudo systemctl restart postgresql

# View logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

### EXPLAIN ANALYZE

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT u.*, COUNT(d.id) as design_count
FROM users u
LEFT JOIN designs d ON d.user_id = u.id
GROUP BY u.id
ORDER BY design_count DESC
LIMIT 10;

-- Output shows:
-- - Execution time
-- - Scan methods (Seq Scan vs Index Scan)
-- - Row estimates vs actual rows
-- - Bottlenecks
```

### MongoDB Query Debugging

```javascript
// Enable profiling
db.setProfilingLevel(2); // Profile all queries

// View slow queries
db.system.profile
  .find({
    millis: { $gt: 100 },
  })
  .sort({ ts: -1 })
  .limit(10);

// Explain query
db.designs.find({ userId: '123' }).explain('executionStats');
```

### Redis Debugging

```bash
# Monitor all commands in real-time
redis-cli monitor

# Check slow queries
redis-cli slowlog get 10

# View memory usage
redis-cli info memory

# Check key patterns
redis-cli --scan --pattern 'user:*'
```

## Common Debugging Scenarios

### Authentication Issues

```typescript
// Add authentication debugging
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.debug('Authentication attempt', {
    path: req.path,
    hasAuthHeader: !!req.headers.authorization,
  });

  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('No token provided', { path: req.path });
      throw new UnauthorizedError('No token provided');
    }

    logger.debug('Verifying token', { tokenLength: token.length });
    const payload = verifyToken(token);
    logger.debug('Token verified', { userId: payload.userId });

    req.user = await UserService.findById(payload.userId);

    if (!req.user) {
      logger.warn('User not found', { userId: payload.userId });
      throw new UnauthorizedError('Invalid token');
    }

    logger.debug('Authentication successful', { userId: req.user.id });
    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    next(error);
  }
}
```

### State Management Issues

```typescript
// Debug React state updates
function UserProfile() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    console.log('UserProfile mounted');
    return () => console.log('UserProfile unmounted');
  }, []);

  useEffect(() => {
    console.log('User state changed', { user });
  }, [user]);

  useEffect(() => {
    console.log('Fetching user data');
    fetchUser().then(data => {
      console.log('User data received', { data });
      setUser(data);
    });
  }, []);

  return <div>{user?.name}</div>;
}
```

### API Integration Issues

```typescript
// Debug API calls
async function fetchDesigns(userId: string): Promise<Design[]> {
  console.log('Fetching designs', { userId });

  try {
    const response = await fetch(`${API_URL}/users/${userId}/designs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response received', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response', { errorText });
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Data parsed', { designCount: data.length });

    return data;
  } catch (error) {
    console.error('Fetch failed', { error });
    throw error;
  }
}
```

### Memory Leaks

```typescript
// Check for memory leaks
useEffect(() => {
  const interval = setInterval(() => {
    // Some work
  }, 1000);

  // ✅ Cleanup to prevent memory leak
  return () => {
    console.log('Cleaning up interval');
    clearInterval(interval);
  };
}, []);

// Debug memory usage
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    if (performance.memory) {
      console.log('Memory usage:', {
        used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
      });
    }
  }, 5000);
}
```

### Performance Issues

```typescript
// Profile React component renders
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  console.log('Component render', {
    id,
    phase,
    actualDuration: `${actualDuration.toFixed(2)}ms`,
    baseDuration: `${baseDuration.toFixed(2)}ms`
  });
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <YourComponents />
    </Profiler>
  );
}
```

## Debugging Tools

### Browser Extensions

- **React Developer Tools** - Component inspection
- **Redux DevTools** - State debugging
- **Apollo Client DevTools** - GraphQL debugging
- **Lighthouse** - Performance auditing

### VS Code Extensions

- **JavaScript Debugger** - Built-in debugger
- **Error Lens** - Inline error display
- **REST Client** - API testing in editor
- **Docker** - Container debugging

### Command Line Tools

```bash
# Network debugging
curl -v https://api.kitchenxpert.com/users

# JSON formatting
echo '{"name":"test"}' | jq

# Process monitoring
htop

# Network monitoring
nethogs

# Log viewing
tail -f logs/combined.log | grep ERROR
```

### Remote Debugging

```bash
# SSH tunnel for debugging production
ssh -L 9229:localhost:9229 user@production-server

# Then attach VS Code debugger to localhost:9229
```

## Related Documentation

- [Development Setup](./setup.md) - Development environment
- [Testing Guide](./testing.md) - Testing practices
- [Performance Optimization](./performance-optimization.md) - Performance tuning
- [Logging Best Practices](./coding-standards.md#logging-best-practices) -
  Logging standards
