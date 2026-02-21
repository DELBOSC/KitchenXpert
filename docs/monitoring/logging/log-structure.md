# Log Structure Documentation

> Comprehensive guide to structured logging format and standards for KitchenXpert.

**Last Updated:** 2026-01-10
**Owner:** Platform Engineering Team
**Version:** 1.0

---

## Table of Contents

1. [Structured Logging Format](#structured-logging-format)
2. [Log Fields by Service](#log-fields-by-service)
3. [Correlation IDs for Distributed Tracing](#correlation-ids-for-distributed-tracing)
4. [Sensitive Data Redaction](#sensitive-data-redaction)
5. [Log Enrichment](#log-enrichment)
6. [Implementation Examples](#implementation-examples)
7. [Related Documentation](#related-documentation)

---

## Structured Logging Format

### Standard JSON Log Format

All KitchenXpert services MUST use structured JSON logging with the following base format:

```json
{
  "timestamp": "2026-01-10T14:30:45.123Z",
  "level": "info",
  "service": "backend",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "spanId": "1234567890abcdef",
  "userId": "user_abc123",
  "message": "Human readable message describing the event",
  "context": {
    "additional": "structured data"
  }
}
```

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `timestamp` | ISO 8601 string | UTC timestamp with milliseconds | `"2026-01-10T14:30:45.123Z"` |
| `level` | string | Log level (lowercase) | `"info"`, `"error"`, `"warn"` |
| `service` | string | Service identifier | `"backend"`, `"ai-service"` |
| `message` | string | Human-readable description | `"User logged in successfully"` |

### Optional Standard Fields

| Field | Type | Description | When to Include |
|-------|------|-------------|-----------------|
| `traceId` | UUID string | Distributed trace identifier | All requests |
| `spanId` | hex string | Current span identifier | All requests |
| `userId` | string | Authenticated user ID | When authenticated |
| `requestId` | UUID string | Unique request identifier | All HTTP requests |
| `sessionId` | string | User session identifier | When available |
| `context` | object | Additional structured data | As needed |
| `error` | object | Error details | On errors |
| `duration` | number | Operation duration (ms) | Timed operations |
| `method` | string | HTTP method | HTTP requests |
| `path` | string | Request path | HTTP requests |
| `statusCode` | number | HTTP status code | HTTP responses |

### Context Object Structure

The `context` field holds additional structured data relevant to the log entry:

```json
{
  "context": {
    "endpoint": "/api/v1/designs",
    "method": "POST",
    "requestSize": 1024,
    "responseSize": 256,
    "queryParams": {
      "limit": "10",
      "offset": "0"
    },
    "headers": {
      "user-agent": "Mozilla/5.0...",
      "content-type": "application/json"
    }
  }
}
```

### Error Object Structure

For error logs, include detailed error information:

```json
{
  "level": "error",
  "message": "Database query failed",
  "error": {
    "name": "PostgresError",
    "message": "Connection timeout",
    "code": "ETIMEDOUT",
    "stack": "Error: Connection timeout\n    at ...",
    "cause": {
      "name": "NetworkError",
      "message": "Host unreachable"
    }
  },
  "context": {
    "query": "SELECT * FROM designs WHERE user_id = $1",
    "params": ["<REDACTED>"],
    "retryCount": 2
  }
}
```

---

## Log Fields by Service

### Backend Service (Node.js)

```json
{
  "timestamp": "2026-01-10T14:30:45.123Z",
  "level": "info",
  "service": "backend",
  "version": "2.5.1",
  "environment": "production",
  "hostname": "backend-pod-abc123",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "spanId": "1234567890abcdef",
  "userId": "user_abc123",
  "requestId": "req_xyz789",
  "message": "Design created successfully",
  "context": {
    "designId": "design_123",
    "duration": 145,
    "objectCount": 42
  }
}
```

#### Backend-Specific Fields

| Field | Description |
|-------|-------------|
| `designId` | Design resource identifier |
| `projectId` | Project resource identifier |
| `partnerId` | Partner catalog identifier |
| `productId` | Product catalog identifier |
| `operationType` | CRUD operation type |

### Frontend Service (Browser)

```json
{
  "timestamp": "2026-01-10T14:30:45.123Z",
  "level": "error",
  "service": "frontend",
  "version": "2.5.1",
  "sessionId": "sess_abc123",
  "userId": "user_abc123",
  "message": "3D rendering error",
  "context": {
    "page": "/design/123",
    "component": "ThreeJSCanvas",
    "browser": "Chrome 120",
    "os": "Windows 11",
    "viewport": "1920x1080",
    "webglSupported": true
  },
  "error": {
    "name": "WebGLContextLost",
    "message": "The WebGL context was lost"
  }
}
```

#### Frontend-Specific Fields

| Field | Description |
|-------|-------------|
| `page` | Current page/route |
| `component` | React component name |
| `browser` | Browser name and version |
| `os` | Operating system |
| `viewport` | Screen dimensions |
| `webglSupported` | WebGL capability |
| `fps` | Current frame rate |

### AI Service (Python)

```json
{
  "timestamp": "2026-01-10T14:30:45.123Z",
  "level": "info",
  "service": "ai-service",
  "version": "1.2.0",
  "hostname": "ai-service-pod-xyz789",
  "traceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "spanId": "abcdef1234567890",
  "message": "Design generation completed",
  "context": {
    "modelName": "kitchen-layout-v3",
    "modelVersion": "3.2.1",
    "inputSize": 2048,
    "outputSize": 4096,
    "inferenceTime": 2340,
    "gpuMemoryUsed": 4096,
    "batchSize": 1
  }
}
```

#### AI Service-Specific Fields

| Field | Description |
|-------|-------------|
| `modelName` | AI model identifier |
| `modelVersion` | Model version |
| `inferenceTime` | Inference duration (ms) |
| `gpuMemoryUsed` | GPU memory (MB) |
| `batchSize` | Batch size used |
| `confidence` | Model confidence score |

### Database Operations

```json
{
  "timestamp": "2026-01-10T14:30:45.123Z",
  "level": "warn",
  "service": "backend",
  "message": "Slow database query detected",
  "context": {
    "database": "postgresql",
    "operation": "SELECT",
    "table": "designs",
    "duration": 1523,
    "rowsAffected": 150,
    "queryHash": "abc123def456"
  }
}
```

---

## Correlation IDs for Distributed Tracing

### Trace Context Propagation

KitchenXpert uses W3C Trace Context standard for distributed tracing:

#### HTTP Headers

| Header | Description | Example |
|--------|-------------|---------|
| `traceparent` | W3C trace context | `00-a1b2c3d4...-1234...-01` |
| `tracestate` | Vendor-specific data | `kitchenxpert=sampling:1` |
| `X-Request-ID` | Request identifier | `req_xyz789` |
| `X-Correlation-ID` | Correlation ID | `corr_abc123` |

#### TraceId Format

```
traceId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
         |        |         |
         +--------+---------+-- 128-bit unique identifier
```

#### SpanId Format

```
spanId: 1234567890abcdef
        |
        +-- 64-bit unique identifier
```

### Propagation Flow

```
+-------------+     +-------------+     +-------------+
|   Frontend  |     |   Backend   |     | AI Service  |
+-------------+     +-------------+     +-------------+
      |                   |                   |
      | HTTP Request      |                   |
      | traceId: abc123   |                   |
      | spanId: span-1    |                   |
      +------------------>|                   |
      |                   |                   |
      |                   | HTTP Request      |
      |                   | traceId: abc123   |
      |                   | spanId: span-2    |
      |                   | parentSpanId: span-1
      |                   +------------------>|
      |                   |                   |
      |                   |<------------------+
      |<------------------+                   |
```

### Implementation Example

```javascript
// Express middleware for trace propagation
const { trace, context, propagation } = require('@opentelemetry/api');

app.use((req, res, next) => {
  // Extract trace context from incoming request
  const extractedContext = propagation.extract(context.active(), req.headers);

  // Get or create trace and span IDs
  const span = trace.getSpan(extractedContext);
  const traceId = span?.spanContext().traceId || generateTraceId();
  const spanId = span?.spanContext().spanId || generateSpanId();

  // Attach to request for logging
  req.traceId = traceId;
  req.spanId = spanId;
  req.requestId = req.headers['x-request-id'] || generateRequestId();

  // Add to response headers
  res.setHeader('X-Trace-ID', traceId);
  res.setHeader('X-Request-ID', req.requestId);

  next();
});
```

### Logging with Correlation IDs

```javascript
// Logger configuration with automatic trace injection
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format((info) => {
      const activeSpan = trace.getSpan(context.active());
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        info.traceId = spanContext.traceId;
        info.spanId = spanContext.spanId;
      }
      return info;
    })(),
    winston.format.json()
  )
});
```

---

## Sensitive Data Redaction

### Data Classification

| Classification | Examples | Handling |
|----------------|----------|----------|
| **PII** | Email, name, phone, address | Always redact |
| **Credentials** | Passwords, API keys, tokens | Never log |
| **Financial** | Credit cards, bank accounts | Always redact |
| **Health** | Medical information | Never log |
| **Internal** | User IDs, design IDs | Log as-is |

### Redaction Rules

#### Never Log (Block)

These fields should NEVER appear in logs:

```javascript
const BLOCKED_FIELDS = [
  'password',
  'passwordHash',
  'apiKey',
  'apiSecret',
  'accessToken',
  'refreshToken',
  'creditCard',
  'cvv',
  'ssn',
  'bankAccount',
];
```

#### Always Redact (Mask)

These fields should be masked when logged:

```javascript
const REDACTED_FIELDS = [
  'email',           // user@[REDACTED].com
  'phone',           // +1***-***-1234
  'address',         // [REDACTED]
  'name',            // J*** D***
  'dateOfBirth',     // [REDACTED]
  'ipAddress',       // 192.168.XXX.XXX
];
```

### Redaction Implementation

```javascript
const sensitiveFields = {
  password: () => '[REDACTED]',
  email: (value) => {
    const [local, domain] = value.split('@');
    return `${local[0]}***@${domain}`;
  },
  phone: (value) => {
    return value.replace(/\d(?=\d{4})/g, '*');
  },
  creditCard: (value) => {
    return `****-****-****-${value.slice(-4)}`;
  },
  ipAddress: (value) => {
    const parts = value.split('.');
    return `${parts[0]}.${parts[1]}.XXX.XXX`;
  },
};

function redactSensitiveData(obj, path = '') {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const result = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Check if field should be blocked
    if (BLOCKED_FIELDS.some(f => lowerKey.includes(f.toLowerCase()))) {
      continue; // Don't include in output
    }

    // Check if field should be redacted
    const redactor = sensitiveFields[lowerKey];
    if (redactor && typeof value === 'string') {
      result[key] = redactor(value);
    } else if (typeof value === 'object') {
      result[key] = redactSensitiveData(value, `${path}.${key}`);
    } else {
      result[key] = value;
    }
  }

  return result;
}
```

### Example Redacted Log

**Before Redaction:**
```json
{
  "message": "User registration completed",
  "context": {
    "email": "john.doe@example.com",
    "name": "John Doe",
    "password": "secret123",
    "phone": "+1-555-123-4567",
    "address": "123 Main St, City, ST 12345"
  }
}
```

**After Redaction:**
```json
{
  "message": "User registration completed",
  "context": {
    "email": "j***@example.com",
    "name": "J*** D***",
    "phone": "+1-***-***-4567",
    "address": "[REDACTED]"
  }
}
```

---

## Log Enrichment

### Automatic Enrichment

The logging pipeline automatically enriches logs with:

#### Infrastructure Context

```json
{
  "infrastructure": {
    "hostname": "backend-pod-abc123",
    "containerId": "docker_xyz789",
    "nodeId": "node-us-east-1a",
    "region": "us-east-1",
    "availabilityZone": "us-east-1a",
    "cluster": "prod-cluster-1"
  }
}
```

#### Application Context

```json
{
  "application": {
    "service": "backend",
    "version": "2.5.1",
    "environment": "production",
    "deploymentId": "deploy_abc123",
    "buildNumber": "1234"
  }
}
```

#### Request Context

```json
{
  "request": {
    "method": "POST",
    "path": "/api/v1/designs",
    "userAgent": "Mozilla/5.0...",
    "referer": "https://kitchenxpert.com/editor",
    "clientIp": "192.168.XXX.XXX",
    "contentType": "application/json"
  }
}
```

### Logstash Enrichment Pipeline

```ruby
filter {
  # Parse JSON
  json {
    source => "message"
  }

  # Add infrastructure metadata
  mutate {
    add_field => {
      "[infrastructure][cluster]" => "${CLUSTER_NAME}"
      "[infrastructure][region]" => "${AWS_REGION}"
    }
  }

  # Geolocate IP addresses
  geoip {
    source => "[request][clientIp]"
    target => "[geo]"
  }

  # Parse user agent
  useragent {
    source => "[request][userAgent]"
    target => "[userAgent]"
  }

  # Add processing timestamp
  ruby {
    code => "event.set('processedAt', Time.now.utc.iso8601(3))"
  }
}
```

### Custom Enrichment

```javascript
// Custom log enrichment middleware
function enrichLog(logEntry) {
  return {
    ...logEntry,

    // Add feature flags context
    featureFlags: {
      newDesignEditor: featureFlags.isEnabled('new-design-editor'),
      aiRecommendations: featureFlags.isEnabled('ai-recommendations'),
    },

    // Add A/B test context
    experiments: {
      checkoutFlow: getExperimentVariant('checkout-flow'),
    },

    // Add business context
    business: {
      tier: getCurrentUserTier(),
      subscription: getSubscriptionType(),
    }
  };
}
```

---

## Implementation Examples

### Node.js (Winston)

```javascript
const winston = require('winston');
const { format } = winston;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.errors({ stack: true }),
    format((info) => {
      // Add service metadata
      info.service = 'backend';
      info.version = process.env.APP_VERSION;
      info.environment = process.env.NODE_ENV;
      info.hostname = os.hostname();

      // Redact sensitive data
      if (info.context) {
        info.context = redactSensitiveData(info.context);
      }

      return info;
    })(),
    format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '/var/log/kitchenxpert/backend.log',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10
    })
  ]
});

// Usage
logger.info('Design created', {
  userId: req.userId,
  traceId: req.traceId,
  context: {
    designId: design.id,
    objectCount: design.objects.length,
    duration: Date.now() - startTime
  }
});
```

### Python (structlog)

```python
import structlog
import logging

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Usage
logger.info(
    "Design generation completed",
    service="ai-service",
    trace_id=trace_id,
    context={
        "model_name": "kitchen-layout-v3",
        "inference_time": inference_time,
        "confidence": confidence
    }
)
```

### Frontend (Browser)

```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class FrontendLogger {
  private service = 'frontend';
  private version = process.env.REACT_APP_VERSION;
  private sessionId = getSessionId();

  private createEntry(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      context: {
        ...context,
        sessionId: this.sessionId,
        page: window.location.pathname,
        browser: getBrowserInfo(),
      },
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry('info', message, context);
    this.send(entry);
  }

  error(message: string, error: Error, context?: Record<string, unknown>): void {
    const entry = this.createEntry('error', message, context, error);
    this.send(entry);
  }

  private send(entry: LogEntry): void {
    // Send to logging endpoint
    navigator.sendBeacon('/api/logs', JSON.stringify(entry));
  }
}
```

---

## Related Documentation

- [Log Levels Guide](./log-levels.md)
- [Centralized Logging Setup](./centralized-logging.md)
- [Log Analysis](./log-analysis.md)
- [Monitoring Overview](../overview.md)

---

*For questions about log structure, contact the Platform Engineering team at platform@kitchenxpert.com*
