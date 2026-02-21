# Data Flow Architecture

**Last Updated**: 2026-01-10

## Table of Contents

1. [Overview](#overview)
2. [User Authentication Flow](#user-authentication-flow)
3. [Design Creation and Save Flow](#design-creation-and-save-flow)
4. [Catalog Synchronization Flow](#catalog-synchronization-flow)
5. [AI Design Generation Flow](#ai-design-generation-flow)
6. [Order Processing Flow](#order-processing-flow)
7. [Webhook Delivery Flow](#webhook-delivery-flow)
8. [Real-Time Collaboration Flow](#real-time-collaboration-flow)
9. [File Upload Flow](#file-upload-flow)
10. [Best Practices](#best-practices)

## Overview

This document outlines the detailed data flows for critical operations in the KitchenXpert platform. Each flow includes sequence diagrams, data transformations, error handling, and performance considerations.

## User Authentication Flow

Complete authentication flow including JWT generation and refresh:

```mermaid
sequenceDiagram
    participant Client
    participant Frontend
    participant Backend
    participant PostgreSQL
    participant Redis
    participant OAuth Provider

    Note over Client,OAuth Provider: Login Flow

    Client->>Frontend: Enter credentials
    Frontend->>Frontend: Validate input
    Frontend->>Backend: POST /api/v1/auth/login<br/>{email, password}

    Backend->>Backend: Rate limit check
    Backend->>PostgreSQL: Query user by email
    PostgreSQL-->>Backend: User record

    alt User not found
        Backend-->>Frontend: 401 Unauthorized
        Frontend-->>Client: Show error
    else User found
        Backend->>Backend: Compare password hash
        alt Invalid password
            Backend->>PostgreSQL: Log failed attempt
            Backend-->>Frontend: 401 Unauthorized
            Frontend-->>Client: Show error
        else Valid password
            Backend->>Backend: Generate access token (15min)
            Backend->>Backend: Generate refresh token (7d)
            Backend->>Redis: Store refresh token<br/>Key: refresh:{userId}<br/>TTL: 7 days
            Backend->>PostgreSQL: Update last_login timestamp
            Backend-->>Frontend: 200 OK<br/>{accessToken, refreshToken, user}
            Frontend->>Frontend: Store tokens in localStorage
            Frontend->>Frontend: Update AuthContext
            Frontend-->>Client: Redirect to dashboard
        end
    end

    Note over Client,OAuth Provider: OAuth Flow (Google/GitHub/Microsoft)

    Client->>Frontend: Click "Sign in with Google"
    Frontend->>OAuth Provider: Redirect to OAuth consent
    OAuth Provider-->>Client: Show consent screen
    Client->>OAuth Provider: Grant permission
    OAuth Provider->>Frontend: Redirect with auth code
    Frontend->>Backend: POST /api/v1/auth/oauth/callback<br/>{code, provider}
    Backend->>OAuth Provider: Exchange code for token
    OAuth Provider-->>Backend: Access token + user info
    Backend->>PostgreSQL: Find or create user
    Backend->>Backend: Generate JWT tokens
    Backend->>Redis: Store refresh token
    Backend-->>Frontend: 200 OK<br/>{accessToken, refreshToken, user}
    Frontend->>Frontend: Store tokens
    Frontend-->>Client: Redirect to dashboard

    Note over Client,Redis: Token Refresh Flow

    Frontend->>Backend: API request with expired token
    Backend-->>Frontend: 401 Unauthorized
    Frontend->>Backend: POST /api/v1/auth/refresh<br/>{refreshToken}
    Backend->>Redis: Verify refresh token exists
    alt Token not found or expired
        Redis-->>Backend: Null
        Backend-->>Frontend: 401 Unauthorized
        Frontend->>Frontend: Clear tokens
        Frontend-->>Client: Redirect to login
    else Token valid
        Redis-->>Backend: Token exists
        Backend->>Backend: Generate new access token
        Backend-->>Frontend: 200 OK<br/>{accessToken}
        Frontend->>Frontend: Update stored token
        Frontend->>Backend: Retry original request
        Backend-->>Frontend: Success
    end
```

### Authentication Flow Details

**Request Payload (Login)**:
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd"
}
```

**Response Payload**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "emailVerified": true
  }
}
```

**Token Structure**:
```javascript
// Access Token (JWT)
{
  "id": "uuid-v4",
  "email": "user@example.com",
  "role": "customer",
  "iat": 1704902400,
  "exp": 1704903300  // 15 minutes
}

// Refresh Token (JWT)
{
  "id": "uuid-v4",
  "iat": 1704902400,
  "exp": 1705507200  // 7 days
}
```

## Design Creation and Save Flow

3D design creation with real-time preview and save:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Three.js
    participant Backend
    participant MongoDB
    participant S3
    participant Redis

    User->>Frontend: Open design canvas
    Frontend->>Three.js: Initialize 3D scene
    Three.js-->>Frontend: Scene ready

    User->>Frontend: Add appliance from catalog
    Frontend->>Frontend: Validate placement
    Frontend->>Three.js: Add 3D model to scene
    Three.js->>Three.js: Load GLTF model
    Three.js->>Three.js: Apply transformations
    Three.js-->>Frontend: Render updated scene

    User->>Frontend: Adjust position/rotation
    Frontend->>Three.js: Update object transform
    Three.js-->>Frontend: Re-render

    User->>Frontend: Click "Save Design"
    Frontend->>Frontend: Show loading state
    Frontend->>Three.js: Capture screenshot
    Three.js-->>Frontend: Screenshot blob

    par Upload Screenshot and Save Design
        Frontend->>Backend: POST /api/v1/upload/screenshot<br/>FormData: {file}
        Backend->>S3: Upload screenshot
        S3-->>Backend: URL
    and
        Frontend->>Backend: POST /api/v1/kitchen/designs<br/>{name, description, layout, ...}
        Backend->>Backend: Validate design data
        Backend->>Backend: Check user quota
    end

    Backend->>MongoDB: Insert design document
    MongoDB-->>Backend: Design ID

    Backend->>Backend: Update design with screenshot URL
    Backend->>MongoDB: Update design.thumbnail
    MongoDB-->>Backend: Success

    Backend->>Redis: Invalidate cache<br/>Key: designs:{userId}:*

    Backend-->>Frontend: 201 Created<br/>{design}
    Frontend->>Frontend: Update local state
    Frontend->>Frontend: Add to React Query cache
    Frontend-->>User: Show success message

    Note over User,Redis: Auto-save (every 30 seconds)

    loop Every 30 seconds
        Frontend->>Frontend: Check if changes exist
        alt Has unsaved changes
            Frontend->>Backend: PUT /api/v1/kitchen/designs/:id<br/>{layout}
            Backend->>MongoDB: Update design
            MongoDB-->>Backend: Success
            Backend->>Redis: Invalidate cache
            Backend-->>Frontend: 200 OK
            Frontend->>Frontend: Mark as saved
        end
    end
```

### Design Data Structure

**Create Design Request**:
```json
{
  "name": "Modern Kitchen Design",
  "description": "Contemporary kitchen with island",
  "dimensions": {
    "width": 5.5,
    "height": 2.8,
    "depth": 4.0
  },
  "layout": {
    "walls": [
      {
        "id": "wall-1",
        "start": { "x": 0, "y": 0, "z": 0 },
        "end": { "x": 5.5, "y": 0, "z": 0 },
        "height": 2.8,
        "material": "painted-drywall",
        "color": "#FFFFFF"
      }
    ],
    "appliances": [
      {
        "id": "appliance-1",
        "catalogItemId": "uuid-v4",
        "type": "refrigerator",
        "position": { "x": 0.5, "y": 0, "z": 0.3 },
        "rotation": { "x": 0, "y": 0, "z": 0 },
        "modelUrl": "/models/refrigerator-model.glb"
      }
    ],
    "cabinets": [...],
    "countertops": [...]
  },
  "style": "modern",
  "tags": ["modern", "island", "white"],
  "aiGenerated": false
}
```

**MongoDB Document**:
```javascript
{
  _id: ObjectId("..."),
  userId: "uuid-v4",
  name: "Modern Kitchen Design",
  description: "Contemporary kitchen with island",
  dimensions: {
    width: 5.5,
    height: 2.8,
    depth: 4.0
  },
  layout: { /* ... */ },
  style: "modern",
  aiGenerated: false,
  thumbnail: "https://s3.amazonaws.com/kitchenxpert/designs/uuid-v4.jpg",
  tags: ["modern", "island", "white"],
  shared: false,
  shareToken: null,
  version: 1,
  createdAt: ISODate("2026-01-10T10:00:00Z"),
  updatedAt: ISODate("2026-01-10T10:00:00Z")
}
```

## Catalog Synchronization Flow

Partner API to PostgreSQL catalog sync:

```mermaid
sequenceDiagram
    participant Scheduler
    participant Backend
    participant Queue
    participant Worker
    participant Partner API
    participant PostgreSQL
    participant Redis
    participant Webhook

    Note over Scheduler,Webhook: Scheduled Sync (Every 6 hours)

    Scheduler->>Backend: Trigger sync job
    Backend->>Queue: Add sync job to Bull queue<br/>Job: {partnerId, syncType: 'full'}
    Queue-->>Backend: Job queued

    Worker->>Queue: Fetch next job
    Queue-->>Worker: Sync job

    Worker->>Partner API: GET /api/v1/catalog<br/>Headers: {X-API-Key}
    Partner API-->>Worker: {items: [...], total: 1000}

    loop For each batch of 100 items
        Worker->>Worker: Transform data to schema
        Worker->>Worker: Validate items
        Worker->>PostgreSQL: BEGIN TRANSACTION
        Worker->>PostgreSQL: UPSERT catalog_items<br/>ON CONFLICT (partner_id, external_id)<br/>DO UPDATE

        alt New item
            PostgreSQL->>PostgreSQL: INSERT
        else Existing item
            PostgreSQL->>PostgreSQL: UPDATE<br/>SET updated_at = NOW()
        end

        Worker->>PostgreSQL: COMMIT
    end

    Worker->>PostgreSQL: Query changed items<br/>WHERE updated_at > last_sync
    PostgreSQL-->>Worker: Changed items list

    Worker->>Redis: Invalidate catalog cache<br/>DEL catalog:*
    Worker->>Redis: Cache new items<br/>SET catalog:items:all<br/>TTL: 1 hour

    alt Has changes
        Worker->>Webhook: POST partner_webhook_url<br/>{event: 'catalog.synced', changes: [...]}
        Webhook-->>Worker: 200 OK
    end

    Worker->>PostgreSQL: Update sync_history<br/>INSERT (partner_id, status, items_synced)
    Worker-->>Queue: Job completed

    Note over Scheduler,Webhook: Incremental Sync (Webhook-triggered)

    Partner API->>Backend: POST /api/v1/webhooks/catalog-update<br/>{partnerId, itemId, action: 'updated'}
    Backend->>Backend: Verify webhook signature
    Backend->>Queue: Add incremental sync job
    Queue-->>Backend: Job queued

    Worker->>Queue: Fetch job
    Worker->>Partner API: GET /api/v1/catalog/items/:id
    Partner API-->>Worker: Item data
    Worker->>PostgreSQL: UPSERT catalog_items
    Worker->>Redis: Invalidate specific item<br/>DEL catalog:item:{itemId}
    Worker-->>Queue: Job completed
```

### Catalog Sync Details

**Partner API Response**:
```json
{
  "items": [
    {
      "id": "partner-item-123",
      "name": "Premium Refrigerator",
      "description": "Energy-efficient side-by-side refrigerator",
      "category": "refrigerators",
      "price": 1299.99,
      "currency": "USD",
      "dimensions": {
        "width": 91.4,
        "height": 178.8,
        "depth": 88.9
      },
      "specifications": {
        "capacity": "25 cu ft",
        "energyRating": "A++",
        "color": "Stainless Steel"
      },
      "images": [
        "https://partner-cdn.com/images/item-123-1.jpg"
      ],
      "availability": "in_stock",
      "updatedAt": "2026-01-10T09:00:00Z"
    }
  ],
  "total": 1000,
  "page": 1,
  "perPage": 100
}
```

**PostgreSQL Schema**:
```sql
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  external_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  dimensions JSONB,
  specifications JSONB,
  images JSONB,
  availability VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(partner_id, external_id)
);

CREATE INDEX idx_catalog_category ON catalog_items(category);
CREATE INDEX idx_catalog_partner ON catalog_items(partner_id);
CREATE INDEX idx_catalog_updated ON catalog_items(updated_at);
```

## AI Design Generation Flow

Questionnaire-based AI design generation:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant AI Service
    participant TorchServe
    participant MongoDB
    participant Queue

    User->>Frontend: Start AI design wizard
    Frontend-->>User: Show questionnaire

    User->>Frontend: Complete questionnaire<br/>- Dimensions<br/>- Style preference<br/>- Budget<br/>- Appliances needed<br/>- Constraints
    Frontend->>Frontend: Validate responses
    Frontend->>Backend: POST /api/v1/ai/generate-design<br/>{questionnaire data}

    Backend->>Backend: Authenticate user
    Backend->>Backend: Check AI generation quota
    Backend->>Queue: Add to AI processing queue<br/>Priority: normal
    Queue-->>Backend: Job ID

    Backend-->>Frontend: 202 Accepted<br/>{jobId, estimatedTime: 30}
    Frontend->>Frontend: Show progress indicator
    Frontend->>Frontend: Start polling for result

    Queue->>AI Service: Process job
    AI Service->>AI Service: Preprocess input<br/>- Normalize dimensions<br/>- Encode preferences<br/>- Extract features

    AI Service->>TorchServe: POST /predictions/design_generator<br/>{preprocessed_data}
    TorchServe->>TorchServe: Load model to GPU
    TorchServe->>TorchServe: Run inference<br/>- Generate layout<br/>- Place appliances<br/>- Select materials

    TorchServe-->>AI Service: Raw predictions

    AI Service->>AI Service: Postprocess results<br/>- Decode layout<br/>- Map appliances to catalog<br/>- Validate constraints<br/>- Calculate cost

    AI Service->>MongoDB: Save AI suggestion<br/>Collection: ai_suggestions
    MongoDB-->>AI Service: Suggestion ID

    AI Service->>MongoDB: Create design document<br/>Collection: designs
    MongoDB-->>AI Service: Design ID

    AI Service-->>Queue: Job completed

    loop Poll every 2 seconds
        Frontend->>Backend: GET /api/v1/ai/jobs/:jobId
        Backend->>Queue: Check job status
        alt Job in progress
            Queue-->>Backend: {status: 'processing', progress: 45}
            Backend-->>Frontend: 200 OK {status, progress}
        else Job completed
            Queue-->>Backend: {status: 'completed', designId}
            Backend->>MongoDB: Get design by ID
            MongoDB-->>Backend: Design document
            Backend-->>Frontend: 200 OK {status: 'completed', design}
            Frontend->>Frontend: Stop polling
            Frontend->>Frontend: Navigate to design editor
            Frontend-->>User: Show generated design
        end
    end

    Note over User,Queue: User can refine design

    User->>Frontend: Request design variation
    Frontend->>Backend: POST /api/v1/ai/refine-design<br/>{designId, modifications}
    Backend->>AI Service: Generate variation
    AI Service->>TorchServe: Inference with modifications
    TorchServe-->>AI Service: New predictions
    AI Service->>MongoDB: Save new version
    AI Service-->>Backend: Refined design
    Backend-->>Frontend: 200 OK {design}
    Frontend-->>User: Update design view
```

### AI Generation Request

**Questionnaire Payload**:
```json
{
  "dimensions": {
    "width": 5.5,
    "height": 2.8,
    "depth": 4.0,
    "shape": "rectangular"
  },
  "style": "modern",
  "budget": 15000,
  "budgetFlexibility": 0.1,
  "preferences": {
    "colors": ["white", "gray"],
    "materials": ["quartz", "metal"],
    "applianceTypes": ["refrigerator", "oven", "dishwasher", "microwave"],
    "layoutType": "l-shaped",
    "features": ["island", "breakfast-bar"]
  },
  "constraints": {
    "doorLocation": { "wall": "north", "position": 0.5 },
    "windowLocations": [
      { "wall": "east", "position": 0.3, "width": 1.5 }
    ],
    "plumbingLocation": { "wall": "west", "position": 0.7 }
  },
  "priorities": {
    "storage": 0.8,
    "workflow": 0.9,
    "aesthetics": 0.7,
    "cost": 0.6
  }
}
```

**AI Response**:
```json
{
  "designId": "uuid-v4",
  "suggestionId": "uuid-v4",
  "layout": {
    "walls": [...],
    "appliances": [...],
    "cabinets": [...],
    "countertops": [...]
  },
  "recommendations": {
    "appliances": [
      {
        "catalogItemId": "uuid-v4",
        "type": "refrigerator",
        "name": "Premium Side-by-Side",
        "price": 1299.99,
        "reasoning": "Energy-efficient, fits budget, matches modern style"
      }
    ]
  },
  "estimatedCost": {
    "appliances": 8500,
    "cabinets": 4200,
    "countertops": 1800,
    "installation": 2500,
    "total": 17000
  },
  "score": 0.87,
  "alternatives": [
    {
      "name": "Budget-Friendly Variation",
      "totalCost": 13500,
      "score": 0.81
    }
  ]
}
```

## Order Processing Flow

Cart to confirmation with payment integration:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant PostgreSQL
    participant Payment Gateway
    participant Email Queue
    participant Partner API

    User->>Frontend: Add items to cart
    Frontend->>Frontend: Update cart state
    Frontend->>Backend: POST /api/v1/cart/items<br/>{catalogItemId, quantity}
    Backend->>PostgreSQL: Save cart item
    Backend-->>Frontend: 200 OK {cart}

    User->>Frontend: Proceed to checkout
    Frontend->>Backend: POST /api/v1/orders/create<br/>{cartItems, shippingAddress}
    Backend->>Backend: Validate cart items
    Backend->>PostgreSQL: Check item availability
    Backend->>PostgreSQL: Calculate total

    Backend->>PostgreSQL: BEGIN TRANSACTION
    Backend->>PostgreSQL: INSERT INTO orders
    Backend->>PostgreSQL: INSERT INTO order_items
    Backend->>PostgreSQL: UPDATE cart (set status='checked_out')
    Backend-->>Frontend: 200 OK {orderId, amount}

    Frontend->>Payment Gateway: Initialize payment<br/>{amount, currency, orderId}
    Payment Gateway-->>Frontend: Payment session {sessionId}

    Frontend-->>User: Show payment form
    User->>Payment Gateway: Submit payment details
    Payment Gateway->>Payment Gateway: Process payment

    alt Payment successful
        Payment Gateway->>Backend: Webhook: payment.succeeded<br/>{orderId, paymentId, status}
        Backend->>Backend: Verify webhook signature
        Backend->>PostgreSQL: UPDATE orders<br/>SET status='paid', payment_id=...
        Backend->>PostgreSQL: COMMIT TRANSACTION

        par Notify user and partners
            Backend->>Email Queue: Add email job<br/>{to: user.email, template: 'order-confirmation'}
            Email Queue->>Email Queue: Send confirmation email
        and
            Backend->>Partner API: POST /api/webhooks/order-created<br/>{orderId, items}
            Partner API-->>Backend: 200 OK
        end

        Payment Gateway-->>Frontend: Redirect to success page
        Frontend-->>User: Show order confirmation
    else Payment failed
        Payment Gateway->>Backend: Webhook: payment.failed
        Backend->>PostgreSQL: UPDATE orders<br/>SET status='payment_failed'
        Backend->>PostgreSQL: ROLLBACK TRANSACTION
        Payment Gateway-->>Frontend: Redirect to failure page
        Frontend-->>User: Show error message
    end

    Note over User,Partner API: Order Fulfillment

    Partner API->>Backend: POST /api/v1/webhooks/order-shipped<br/>{orderId, trackingNumber}
    Backend->>PostgreSQL: UPDATE orders<br/>SET status='shipped', tracking_number=...
    Backend->>Email Queue: Add shipping notification
    Email Queue->>User: Email: "Your order has shipped"

    Partner API->>Backend: POST /api/v1/webhooks/order-delivered<br/>{orderId}
    Backend->>PostgreSQL: UPDATE orders SET status='delivered'
    Backend->>Email Queue: Add delivery notification
    Email Queue->>User: Email: "Your order has been delivered"
```

### Order Data Structure

**Create Order Request**:
```json
{
  "cartItems": [
    {
      "catalogItemId": "uuid-v4",
      "quantity": 1,
      "price": 1299.99
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US",
    "phone": "+1-555-0123"
  },
  "billingAddress": { /* same structure */ },
  "notes": "Please deliver after 5 PM"
}
```

**Order States**:
```
created → paid → processing → shipped → delivered
                      ↓
                   cancelled
```

## Webhook Delivery Flow

Event-driven webhook delivery with retry logic:

```mermaid
sequenceDiagram
    participant Backend
    participant Queue
    participant Worker
    participant Partner Endpoint
    participant PostgreSQL
    participant Redis

    Backend->>Backend: Event triggered<br/>(e.g., order.created)
    Backend->>PostgreSQL: Get partner webhooks<br/>WHERE event='order.created'
    PostgreSQL-->>Backend: Webhook configurations

    loop For each webhook
        Backend->>Queue: Add webhook job<br/>{url, payload, headers, attempt: 1}
        Queue-->>Backend: Job queued
    end

    Worker->>Queue: Fetch job
    Queue-->>Worker: Webhook job

    Worker->>Worker: Sign payload<br/>HMAC-SHA256(secret, payload)

    Worker->>Partner Endpoint: POST webhook_url<br/>Headers:<br/>- X-Webhook-Signature<br/>- X-Webhook-Event<br/>- X-Webhook-ID<br/>Body: {payload}

    alt Success (200-299)
        Partner Endpoint-->>Worker: 200 OK
        Worker->>PostgreSQL: Log delivery<br/>INSERT INTO webhook_logs<br/>(status='success')
        Worker-->>Queue: Job completed
    else Temporary failure (500, timeout)
        Partner Endpoint-->>Worker: 500 Server Error
        Worker->>Worker: Calculate backoff<br/>delay = attempt² * 60 seconds

        alt Attempts < 3
            Worker->>Queue: Retry job<br/>{...job, attempt: attempt + 1}<br/>Delay: backoff delay
            Worker->>PostgreSQL: Log retry<br/>INSERT INTO webhook_logs<br/>(status='retry')
        else Max attempts reached
            Worker->>PostgreSQL: Log failure<br/>INSERT INTO webhook_logs<br/>(status='failed')
            Worker->>Redis: Add to failed queue<br/>For manual retry
            Worker-->>Queue: Job failed
        end
    else Client error (400-499)
        Partner Endpoint-->>Worker: 400 Bad Request
        Worker->>PostgreSQL: Log permanent failure<br/>INSERT INTO webhook_logs<br/>(status='permanent_failure')
        Worker-->>Queue: Job failed (no retry)
    end
```

### Webhook Payload Format

**Event Payload**:
```json
{
  "id": "evt_uuid-v4",
  "event": "order.created",
  "timestamp": "2026-01-10T10:00:00Z",
  "data": {
    "orderId": "uuid-v4",
    "userId": "uuid-v4",
    "total": 1299.99,
    "currency": "USD",
    "items": [
      {
        "catalogItemId": "uuid-v4",
        "externalId": "partner-item-123",
        "quantity": 1,
        "price": 1299.99
      }
    ]
  }
}
```

**Headers**:
```
X-Webhook-Signature: sha256=abc123def456...
X-Webhook-Event: order.created
X-Webhook-ID: evt_uuid-v4
X-Webhook-Timestamp: 1704902400
Content-Type: application/json
```

## Real-Time Collaboration Flow

WebSocket-based real-time design collaboration:

```mermaid
sequenceDiagram
    participant User A
    participant Frontend A
    participant Backend
    participant WebSocket Server
    participant Redis PubSub
    participant Frontend B
    participant User B

    Note over User A,User B: User A shares design

    User A->>Frontend A: Click "Share Design"
    Frontend A->>Backend: POST /api/v1/kitchen/designs/:id/share
    Backend->>MongoDB: Update design<br/>SET shared=true, shareToken=random
    Backend-->>Frontend A: 200 OK {shareToken}
    Frontend A-->>User A: Show share link

    Note over User A,User B: User B joins collaboration

    User A->>User B: Send share link
    User B->>Frontend B: Open share link
    Frontend B->>Backend: GET /api/v1/kitchen/designs/shared/:token
    Backend->>MongoDB: Find design by shareToken
    Backend-->>Frontend B: 200 OK {design}
    Frontend B->>WebSocket Server: Connect<br/>ws://server/collaborate/:designId
    WebSocket Server->>WebSocket Server: Authenticate connection
    WebSocket Server->>Redis PubSub: SUBSCRIBE design:{designId}
    WebSocket Server-->>Frontend B: Connection established

    Frontend A->>WebSocket Server: Connect to same design
    WebSocket Server->>Redis PubSub: SUBSCRIBE design:{designId}
    WebSocket Server-->>Frontend A: Connection established

    WebSocket Server->>Frontend A: User joined<br/>{userId, userName}
    WebSocket Server->>Frontend B: User joined<br/>{userId, userName}

    Note over User A,User B: Real-time collaboration

    User A->>Frontend A: Move appliance
    Frontend A->>Frontend A: Update local state (optimistic)
    Frontend A->>WebSocket Server: Send update<br/>{type: 'object.moved', objectId, position}
    WebSocket Server->>Redis PubSub: PUBLISH design:{designId}<br/>{from: userA, update}
    Redis PubSub-->>WebSocket Server: Broadcast to subscribers
    WebSocket Server->>Frontend B: Receive update<br/>{type: 'object.moved', ...}
    Frontend B->>Frontend B: Apply update to scene
    Frontend B-->>User B: Visual update

    User B->>Frontend B: Change material
    Frontend B->>Frontend B: Optimistic update
    Frontend B->>WebSocket Server: Send update<br/>{type: 'material.changed', objectId, material}
    WebSocket Server->>Redis PubSub: PUBLISH
    Redis PubSub-->>WebSocket Server: Broadcast
    WebSocket Server->>Frontend A: Receive update
    Frontend A->>Frontend A: Apply update
    Frontend A-->>User A: Visual update

    Note over User A,User B: Persistence

    loop Every 10 seconds
        Frontend A->>Backend: PUT /api/v1/kitchen/designs/:id<br/>{layout} (auto-save)
        Backend->>MongoDB: Update design
        Backend-->>Frontend A: 200 OK
    end

    Note over User A,User B: User disconnects

    User B->>Frontend B: Close browser
    Frontend B->>WebSocket Server: Disconnect
    WebSocket Server->>Redis PubSub: UNSUBSCRIBE
    WebSocket Server->>Frontend A: User left<br/>{userId, userName}
    Frontend A-->>User A: Show notification
```

### WebSocket Message Format

**Client to Server**:
```json
{
  "type": "object.moved",
  "designId": "uuid-v4",
  "objectId": "appliance-1",
  "data": {
    "position": { "x": 1.5, "y": 0, "z": 2.0 }
  },
  "timestamp": 1704902400000
}
```

**Server to Client**:
```json
{
  "type": "object.moved",
  "from": {
    "userId": "uuid-v4",
    "userName": "John Doe"
  },
  "objectId": "appliance-1",
  "data": {
    "position": { "x": 1.5, "y": 0, "z": 2.0 }
  },
  "timestamp": 1704902400000
}
```

## File Upload Flow

Frontend to S3 with database URL storage:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant S3
    participant PostgreSQL/MongoDB

    User->>Frontend: Select file
    Frontend->>Frontend: Validate file<br/>- Type (image/jpeg, image/png)<br/>- Size (< 10MB)<br/>- Dimensions

    alt Validation fails
        Frontend-->>User: Show error
    else Validation passes
        Frontend->>Frontend: Generate preview
        Frontend-->>User: Show preview

        User->>Frontend: Confirm upload
        Frontend->>Backend: POST /api/v1/upload/presigned-url<br/>{fileName, fileType, fileSize}
        Backend->>Backend: Authenticate user
        Backend->>Backend: Generate unique filename<br/>uuid-v4 + extension
        Backend->>S3: Generate presigned URL<br/>PUT {bucket}/{key}<br/>Expiry: 5 minutes
        S3-->>Backend: Presigned URL
        Backend-->>Frontend: 200 OK<br/>{uploadUrl, key, expiresIn}

        Frontend->>S3: PUT upload URL<br/>Body: file blob<br/>Headers: {Content-Type}
        S3->>S3: Store file
        S3-->>Frontend: 200 OK

        Frontend->>Backend: POST /api/v1/upload/confirm<br/>{key, metadata}
        Backend->>S3: Verify file exists<br/>HEAD {bucket}/{key}
        S3-->>Backend: File metadata

        alt File type: profile picture
            Backend->>PostgreSQL: UPDATE users<br/>SET profile_picture=url
        else File type: design screenshot
            Backend->>MongoDB: UPDATE designs<br/>SET thumbnail=url
        else File type: attachment
            Backend->>PostgreSQL: INSERT INTO attachments
        end

        Backend-->>Frontend: 200 OK<br/>{url, key}
        Frontend->>Frontend: Update UI with final URL
        Frontend-->>User: Upload complete
    end

    Note over User,PostgreSQL/MongoDB: Direct upload (alternative)

    User->>Frontend: Select file
    Frontend->>Backend: POST /api/v1/upload<br/>FormData: {file, metadata}
    Backend->>Backend: Validate file
    Backend->>S3: Upload file
    S3-->>Backend: URL
    Backend->>PostgreSQL/MongoDB: Save URL
    Backend-->>Frontend: 200 OK {url}
    Frontend-->>User: Upload complete
```

### Upload Configuration

**File Validation Rules**:
```javascript
{
  images: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxDimensions: { width: 4096, height: 4096 }
  },
  models: {
    allowedTypes: ['model/gltf-binary', 'model/gltf+json'],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  documents: {
    allowedTypes: ['application/pdf'],
    maxSize: 5 * 1024 * 1024 // 5MB
  }
}
```

**S3 Bucket Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedUploads",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::kitchenxpert-uploads/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

## Best Practices

1. **Error Handling**: Implement comprehensive error handling at every step
2. **Retries**: Use exponential backoff for transient failures
3. **Idempotency**: Ensure operations are idempotent (use idempotency keys)
4. **Timeouts**: Set appropriate timeouts for all external calls
5. **Validation**: Validate data at every boundary (client, server, database)
6. **Monitoring**: Log all critical flows with structured logging
7. **Caching**: Cache frequently accessed data with appropriate TTLs
8. **Rate Limiting**: Implement rate limiting to prevent abuse
9. **Authentication**: Verify authentication at every protected endpoint
10. **Transactions**: Use database transactions for multi-step operations

## Related Documentation

- [Backend Architecture](./backend.md)
- [Frontend Architecture](./frontend.md)
- [AI Modules Architecture](./ai-modules.md)
- [Security Architecture](./security.md)
- [API Documentation](../api/README.md)
- [WebSocket Protocol](../api/websocket.md)
