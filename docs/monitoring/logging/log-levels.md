# Log Levels Guide

> Comprehensive guide to log level definitions, usage guidelines, and
> configuration for KitchenXpert.

**Last Updated:** 2026-01-10 **Owner:** Platform Engineering Team **Version:**
1.0

---

## Table of Contents

1. [Level Definitions](#level-definitions)
2. [When to Use Each Level](#when-to-use-each-level)
3. [Level Configuration by Environment](#level-configuration-by-environment)
4. [Log Level Changes at Runtime](#log-level-changes-at-runtime)
5. [Best Practices](#best-practices)
6. [Related Documentation](#related-documentation)

---

## Level Definitions

### Overview

KitchenXpert uses five standard log levels, ordered by severity:

| Level     | Numeric | Color  | Description                             |
| --------- | ------- | ------ | --------------------------------------- |
| **FATAL** | 60      | Red    | System crash, immediate action required |
| **ERROR** | 50      | Red    | Failures requiring attention            |
| **WARN**  | 40      | Yellow | Recoverable issues, potential problems  |
| **INFO**  | 30      | Blue   | Normal operations, significant events   |
| **DEBUG** | 20      | Gray   | Detailed debugging information          |

### FATAL

**Purpose:** Indicates an unrecoverable error that causes the application to
terminate or become non-functional.

**Characteristics:**

- Application cannot continue operating
- Requires immediate human intervention
- Triggers highest priority alerts (PagerDuty page)
- May indicate data corruption risk

**Examples:**

```javascript
// Database connection pool exhausted - cannot process requests
logger.fatal('Database connection pool exhausted', {
  context: {
    activeConnections: pool.activeConnections,
    maxConnections: pool.maxConnections,
    waitingRequests: pool.waitingQueue.length,
  },
});

// Critical configuration missing
logger.fatal('Required configuration missing', {
  context: {
    missingKeys: ['DATABASE_URL', 'JWT_SECRET'],
    environment: process.env.NODE_ENV,
  },
});

// Memory exhaustion
logger.fatal('Out of memory - application shutting down', {
  context: {
    heapUsed: process.memoryUsage().heapUsed,
    heapTotal: process.memoryUsage().heapTotal,
  },
});
```

**When NOT to use:**

- Recoverable errors (use ERROR)
- Single request failures (use ERROR)
- Degraded functionality (use ERROR or WARN)

---

### ERROR

**Purpose:** Indicates a failure that affects the current operation but allows
the application to continue running.

**Characteristics:**

- Current request/operation fails
- Application remains operational
- May affect subset of users
- Requires investigation within hours
- Triggers alerts (Slack, email)

**Examples:**

```javascript
// API request failed
logger.error('External API request failed', {
  error: {
    name: error.name,
    message: error.message,
    code: error.code,
  },
  context: {
    service: 'partner-catalog-api',
    endpoint: '/products',
    retryCount: 3,
    duration: 5000,
  },
});

// Database query failed
logger.error('Database query failed', {
  error: {
    name: error.name,
    message: error.message,
  },
  context: {
    operation: 'findDesignById',
    designId: req.params.id,
    userId: req.userId,
  },
});

// Unhandled exception in request
logger.error('Unhandled exception in request handler', {
  error: {
    name: error.name,
    message: error.message,
    stack: error.stack,
  },
  context: {
    method: req.method,
    path: req.path,
    userId: req.userId,
  },
});

// File upload failed
logger.error('File upload to S3 failed', {
  error: {
    name: error.name,
    message: error.message,
    code: error.code,
  },
  context: {
    bucket: 'kitchenxpert-uploads',
    key: uploadKey,
    fileSize: file.size,
  },
});
```

**When NOT to use:**

- Expected failures (use WARN)
- Client errors (4xx responses - use WARN or INFO)
- Debugging information (use DEBUG)

---

### WARN

**Purpose:** Indicates a recoverable issue or condition that might become a
problem if not addressed.

**Characteristics:**

- Application handles the situation gracefully
- May indicate future problems
- Should be reviewed during business hours
- Potential performance or reliability impact

**Examples:**

```javascript
// Deprecated API usage
logger.warn('Deprecated API endpoint called', {
  context: {
    endpoint: '/api/v1/designs',
    deprecatedSince: '2025-06-01',
    replacementEndpoint: '/api/v2/designs',
    userId: req.userId,
  },
});

// Operation retry
logger.warn('Operation retry initiated', {
  context: {
    operation: 'sendEmail',
    attempt: 2,
    maxAttempts: 3,
    reason: 'Connection timeout',
  },
});

// Resource usage high
logger.warn('Memory usage approaching threshold', {
  context: {
    currentUsage: '85%',
    threshold: '90%',
    heapUsed: process.memoryUsage().heapUsed,
  },
});

// Slow database query
logger.warn('Slow database query detected', {
  context: {
    query: 'SELECT * FROM designs WHERE...',
    duration: 2500,
    threshold: 1000,
  },
});

// Cache miss
logger.warn('High cache miss rate', {
  context: {
    cacheType: 'redis',
    hitRate: '65%',
    expectedRate: '90%',
    timeWindow: '5m',
  },
});

// Rate limit approaching
logger.warn('Approaching rate limit', {
  context: {
    userId: req.userId,
    currentRequests: 90,
    limit: 100,
    windowMinutes: 1,
  },
});
```

**When NOT to use:**

- Normal operational events (use INFO)
- Actual failures (use ERROR)
- Debugging details (use DEBUG)

---

### INFO

**Purpose:** Records significant events during normal operation.

**Characteristics:**

- Normal, expected events
- Useful for understanding system behavior
- Always enabled in production
- Key operational milestones

**Examples:**

```javascript
// Application startup
logger.info('Application started', {
  context: {
    version: '2.5.1',
    environment: 'production',
    port: 3000,
    startupTime: 2500,
  },
});

// Request completed
logger.info('Request completed', {
  context: {
    method: 'POST',
    path: '/api/v1/designs',
    statusCode: 201,
    duration: 145,
    userId: req.userId,
  },
});

// User action
logger.info('User created design', {
  context: {
    userId: req.userId,
    designId: design.id,
    productCount: design.products.length,
  },
});

// Background job completed
logger.info('Background job completed', {
  context: {
    jobType: 'generateThumbnails',
    jobId: job.id,
    duration: 5000,
    itemsProcessed: 50,
  },
});

// External service connected
logger.info('Connected to external service', {
  context: {
    service: 'partner-catalog',
    responseTime: 120,
  },
});

// Configuration loaded
logger.info('Configuration loaded', {
  context: {
    configVersion: '1.2.0',
    featureFlags: {
      newEditor: true,
      aiSuggestions: true,
    },
  },
});
```

**When NOT to use:**

- Detailed debugging info (use DEBUG)
- Every function call (use DEBUG)
- Large data dumps (use DEBUG or don't log)

---

### DEBUG

**Purpose:** Provides detailed information for diagnosing problems during
development and troubleshooting.

**Characteristics:**

- Verbose, detailed information
- Disabled in production by default
- Useful for understanding code flow
- May contain sensitive data (with redaction)

**Examples:**

```javascript
// Function entry/exit
logger.debug('Entering validateDesign', {
  context: {
    designId: design.id,
    objectCount: design.objects.length,
  },
});

// Variable state
logger.debug('Design validation result', {
  context: {
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
    validationDuration: 25,
  },
});

// Cache operation
logger.debug('Cache lookup', {
  context: {
    key: 'design:123',
    hit: true,
    ttl: 3600,
  },
});

// SQL query execution
logger.debug('Executing SQL query', {
  context: {
    query: 'SELECT * FROM designs WHERE user_id = $1 LIMIT $2',
    params: ['user_123', 10],
    duration: 15,
  },
});

// HTTP request details
logger.debug('Outgoing HTTP request', {
  context: {
    method: 'GET',
    url: 'https://api.partner.com/products',
    headers: {
      Authorization: '[REDACTED]',
      'Content-Type': 'application/json',
    },
  },
});

// Algorithm steps
logger.debug('AI recommendation step completed', {
  context: {
    step: 'feature_extraction',
    inputSize: 1024,
    outputSize: 256,
    duration: 50,
  },
});
```

**When NOT to use:**

- Production environments (unless debugging)
- Sensitive data without redaction
- High-frequency loops (performance impact)

---

## When to Use Each Level

### Decision Flow Chart

```
                    Is the application crashing?
                              |
                 +------------+------------+
                 |                         |
                Yes                        No
                 |                         |
              FATAL              Did an operation fail?
                                           |
                              +------------+------------+
                              |                         |
                             Yes                        No
                              |                         |
                 Is it recoverable?      Is something concerning?
                              |                         |
                 +------------+----+           +--------+--------+
                 |                 |           |                 |
                Yes               No          Yes               No
                 |                 |           |                 |
               WARN            ERROR        WARN        Is it significant?
                                                                |
                                                       +--------+--------+
                                                       |                 |
                                                      Yes               No
                                                       |                 |
                                                     INFO             DEBUG
```

### Quick Reference Table

| Scenario                  | Level      | Example Message                        |
| ------------------------- | ---------- | -------------------------------------- |
| App cannot start          | FATAL      | "Failed to bind to port 3000"          |
| Database connection lost  | FATAL      | "Database connection pool exhausted"   |
| API request failed        | ERROR      | "Partner API returned 500"             |
| User not found (expected) | WARN       | "User lookup returned no results"      |
| Validation failed         | WARN       | "Design validation failed"             |
| User logged in            | INFO       | "User authenticated successfully"      |
| Request completed         | INFO       | "POST /api/designs completed in 145ms" |
| Cache miss                | INFO/DEBUG | "Cache miss for key design:123"        |
| Function parameters       | DEBUG      | "Entering processDesign with id=123"   |
| Variable values           | DEBUG      | "Current state: {objects: 42}"         |

---

## Level Configuration by Environment

### Environment-Specific Settings

| Environment | Default Level | Notes                                |
| ----------- | ------------- | ------------------------------------ |
| Development | DEBUG         | Full visibility for debugging        |
| Test        | INFO          | Balance between visibility and noise |
| Staging     | INFO          | Production-like for validation       |
| Production  | INFO          | Normal operational logging           |

### Configuration File

```yaml
# config/logging.yaml

environments:
  development:
    level: debug
    format: pretty
    colorize: true
    includeStackTrace: true

  test:
    level: info
    format: json
    colorize: false
    includeStackTrace: true

  staging:
    level: info
    format: json
    colorize: false
    includeStackTrace: true
    services:
      # More verbose for specific services
      ai-service: debug
      background-jobs: debug

  production:
    level: info
    format: json
    colorize: false
    includeStackTrace: false # Security
    services:
      # Override for verbose services
      audit: warn
      metrics: warn
      health-check: warn
```

### Service-Specific Overrides

Some services generate excessive logs at INFO level:

```yaml
# Production service overrides
serviceOverrides:
  # Health check endpoints - too noisy
  health-check:
    level: warn

  # Metrics collection - very frequent
  metrics-collector:
    level: warn

  # Audit logs - keep at INFO for compliance
  audit-service:
    level: info

  # AI service - verbose, reduce in prod
  ai-service:
    level: warn
    # Except for errors
    exceptLevels:
      - error
      - fatal
```

### Environment Variables

```bash
# Set global log level
LOG_LEVEL=info

# Service-specific overrides
LOG_LEVEL_AI_SERVICE=warn
LOG_LEVEL_BACKGROUND_JOBS=debug

# Enable debug for specific modules
DEBUG_MODULES=design-validator,ai-recommender
```

---

## Log Level Changes at Runtime

### Dynamic Level Configuration

KitchenXpert supports changing log levels without restarting the application.

### API Endpoint

```http
# Get current log level
GET /admin/logging/level
Authorization: Bearer <admin-token>

Response:
{
  "globalLevel": "info",
  "serviceOverrides": {
    "ai-service": "debug"
  }
}
```

```http
# Set log level
POST /admin/logging/level
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "level": "debug",
  "service": "ai-service",  // Optional - global if omitted
  "duration": 3600          // Optional - seconds (auto-revert)
}

Response:
{
  "success": true,
  "previousLevel": "info",
  "newLevel": "debug",
  "expiresAt": "2026-01-10T15:30:00Z"
}
```

### Implementation

```javascript
// Log level manager
class LogLevelManager {
  constructor() {
    this.globalLevel = process.env.LOG_LEVEL || 'info';
    this.serviceOverrides = new Map();
    this.temporaryOverrides = new Map();
  }

  setLevel(level, service = null, durationSeconds = null) {
    const previousLevel = this.getLevel(service);

    if (service) {
      this.serviceOverrides.set(service, level);
    } else {
      this.globalLevel = level;
    }

    // Auto-revert after duration
    if (durationSeconds) {
      const expiresAt = Date.now() + durationSeconds * 1000;
      this.temporaryOverrides.set(service || 'global', {
        previousLevel,
        expiresAt,
      });

      setTimeout(() => {
        this.revertLevel(service);
      }, durationSeconds * 1000);
    }

    logger.info('Log level changed', {
      context: {
        service: service || 'global',
        previousLevel,
        newLevel: level,
        duration: durationSeconds,
      },
    });

    return { previousLevel, newLevel: level };
  }

  getLevel(service = null) {
    if (service && this.serviceOverrides.has(service)) {
      return this.serviceOverrides.get(service);
    }
    return this.globalLevel;
  }

  revertLevel(service = null) {
    const key = service || 'global';
    const override = this.temporaryOverrides.get(key);

    if (override) {
      if (service) {
        this.serviceOverrides.set(service, override.previousLevel);
      } else {
        this.globalLevel = override.previousLevel;
      }
      this.temporaryOverrides.delete(key);

      logger.info('Log level reverted', {
        context: {
          service: key,
          level: override.previousLevel,
        },
      });
    }
  }
}

// Global instance
const logLevelManager = new LogLevelManager();
module.exports = logLevelManager;
```

### Kubernetes ConfigMap Reload

```yaml
# Log level ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: log-levels
data:
  LOG_LEVEL: info
  LOG_LEVEL_AI_SERVICE: warn
---
# Deployment with ConfigMap reload
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: backend
          envFrom:
            - configMapRef:
                name: log-levels
          # Reloader annotation for automatic reload
          annotations:
            configmap.reloader.stakater.com/reload: 'log-levels'
```

---

## Best Practices

### Do's

1. **Be consistent:** Use the same level for similar events across services
2. **Include context:** Always add relevant contextual information
3. **Use structured data:** Prefer structured context over string interpolation
4. **Log at method boundaries:** INFO for significant methods, DEBUG for
   internal
5. **Include timing:** Add duration for operations that take time
6. **Correlate logs:** Always include traceId and requestId

### Don'ts

1. **Don't log sensitive data:** Always redact PII, credentials
2. **Don't log in tight loops:** Performance impact, use sampling
3. **Don't use ERROR for expected failures:** Use WARN for expected conditions
4. **Don't mix levels inconsistently:** Same type of event = same level
5. **Don't log entire objects:** Extract relevant fields only
6. **Don't use DEBUG in production:** Unless actively debugging

### Examples of Good vs Bad Logging

**Bad:**

```javascript
// Too little information
logger.error('Error occurred');

// Too much information (and sensitive data)
logger.info('User data', { user: entireUserObject });

// Wrong level
logger.error('User not found'); // This is expected, use WARN
```

**Good:**

```javascript
// Descriptive with context
logger.error('Failed to process payment', {
  error: { name: error.name, message: error.message },
  context: {
    orderId: order.id,
    amount: order.amount,
    retryCount: retryAttempt,
  },
});

// Appropriate level
logger.warn('User not found', {
  context: {
    searchedUserId: userId,
    searchMethod: 'email',
  },
});
```

---

## Related Documentation

- [Log Structure](./log-structure.md)
- [Centralized Logging Setup](./centralized-logging.md)
- [Log Analysis](./log-analysis.md)
- [Monitoring Overview](../overview.md)

---

_For questions about log levels, contact the Platform Engineering team at
platform@kitchenxpert.com_
