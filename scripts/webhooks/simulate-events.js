#!/usr/bin/env node
/**
 * Simulate Webhook Events - KitchenXpert
 *
 * Simulates various webhook events for testing integrations.
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const prefix = {
    INFO: `${colors.blue}[SIMULATE]${colors.reset}`,
    SUCCESS: `${colors.green}[SIMULATE]${colors.reset}`,
    WARNING: `${colors.yellow}[SIMULATE]${colors.reset}`,
    ERROR: `${colors.red}[SIMULATE]${colors.reset}`,
    EVENT: `${colors.cyan}[EVENT]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  targetUrl: process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks',
  webhookSecret: process.env.WEBHOOK_SECRET || 'test-webhook-secret',
  eventType: process.env.EVENT_TYPE || 'all',
  count: parseInt(process.env.EVENT_COUNT || '1'),
  delay: parseInt(process.env.EVENT_DELAY || '1000'),
  dryRun: process.env.DRY_RUN === 'true',
};

// Event templates
const eventTemplates = {
  // Order events
  'order.created': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'order.created',
    created: Date.now(),
    data: {
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      customerId: `cus_${crypto.randomUUID().slice(0, 8)}`,
      status: 'pending',
      total: Math.round((500 + Math.random() * 10000) * 100) / 100,
      currency: 'EUR',
      items: [
        {
          productId: `prod_${crypto.randomUUID().slice(0, 8)}`,
          name: 'Kitchen Cabinet Set',
          quantity: Math.floor(1 + Math.random() * 5),
          price: Math.round((100 + Math.random() * 500) * 100) / 100,
        },
      ],
      shippingAddress: {
        street: '123 Test Street',
        city: 'Paris',
        postalCode: '75001',
        country: 'FR',
      },
      createdAt: new Date().toISOString(),
    },
  }),

  'order.updated': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'order.updated',
    created: Date.now(),
    data: {
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      previousStatus: 'pending',
      newStatus: 'confirmed',
      updatedFields: ['status', 'confirmedAt'],
      updatedAt: new Date().toISOString(),
    },
  }),

  'order.shipped': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'order.shipped',
    created: Date.now(),
    data: {
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      trackingNumber: `TRK${Math.floor(Math.random() * 1000000000)}`,
      carrier: 'DHL',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      shippedAt: new Date().toISOString(),
    },
  }),

  'order.delivered': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'order.delivered',
    created: Date.now(),
    data: {
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      deliveredAt: new Date().toISOString(),
      signature: 'John Doe',
    },
  }),

  'order.cancelled': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'order.cancelled',
    created: Date.now(),
    data: {
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      reason: 'Customer request',
      refundAmount: Math.round((100 + Math.random() * 1000) * 100) / 100,
      cancelledAt: new Date().toISOString(),
    },
  }),

  // Payment events
  'payment.succeeded': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'payment.succeeded',
    created: Date.now(),
    data: {
      paymentId: `pay_${crypto.randomUUID().slice(0, 8)}`,
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      amount: Math.round((100 + Math.random() * 5000) * 100) / 100,
      currency: 'EUR',
      paymentMethod: 'card',
      last4: '4242',
      brand: 'visa',
      paidAt: new Date().toISOString(),
    },
  }),

  'payment.failed': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'payment.failed',
    created: Date.now(),
    data: {
      paymentId: `pay_${crypto.randomUUID().slice(0, 8)}`,
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      amount: Math.round((100 + Math.random() * 5000) * 100) / 100,
      currency: 'EUR',
      error: {
        code: 'card_declined',
        message: 'Your card was declined.',
      },
      failedAt: new Date().toISOString(),
    },
  }),

  'payment.refunded': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'payment.refunded',
    created: Date.now(),
    data: {
      paymentId: `pay_${crypto.randomUUID().slice(0, 8)}`,
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      refundId: `ref_${crypto.randomUUID().slice(0, 8)}`,
      amount: Math.round((100 + Math.random() * 1000) * 100) / 100,
      currency: 'EUR',
      reason: 'Customer request',
      refundedAt: new Date().toISOString(),
    },
  }),

  // Customer events
  'customer.created': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'customer.created',
    created: Date.now(),
    data: {
      customerId: `cus_${crypto.randomUUID().slice(0, 8)}`,
      email: `test.user.${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date().toISOString(),
    },
  }),

  'customer.updated': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'customer.updated',
    created: Date.now(),
    data: {
      customerId: `cus_${crypto.randomUUID().slice(0, 8)}`,
      updatedFields: ['email', 'phone'],
      updatedAt: new Date().toISOString(),
    },
  }),

  // Kitchen design events
  'kitchen.created': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'kitchen.created',
    created: Date.now(),
    data: {
      kitchenId: `kit_${crypto.randomUUID().slice(0, 8)}`,
      customerId: `cus_${crypto.randomUUID().slice(0, 8)}`,
      name: 'My Dream Kitchen',
      style: 'modern',
      layout: 'L-shaped',
      dimensions: {
        width: 4000,
        length: 3500,
        height: 2700,
      },
      createdAt: new Date().toISOString(),
    },
  }),

  'kitchen.updated': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'kitchen.updated',
    created: Date.now(),
    data: {
      kitchenId: `kit_${crypto.randomUUID().slice(0, 8)}`,
      changes: ['products', 'layout'],
      productCount: Math.floor(5 + Math.random() * 20),
      updatedAt: new Date().toISOString(),
    },
  }),

  'kitchen.completed': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'kitchen.completed',
    created: Date.now(),
    data: {
      kitchenId: `kit_${crypto.randomUUID().slice(0, 8)}`,
      customerId: `cus_${crypto.randomUUID().slice(0, 8)}`,
      totalPrice: Math.round((5000 + Math.random() * 20000) * 100) / 100,
      productCount: Math.floor(10 + Math.random() * 30),
      completedAt: new Date().toISOString(),
    },
  }),

  // Partner events
  'partner.order_assigned': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'partner.order_assigned',
    created: Date.now(),
    data: {
      partnerId: `ptn_${crypto.randomUUID().slice(0, 8)}`,
      orderId: `ord_${crypto.randomUUID().slice(0, 8)}`,
      commission: Math.round((50 + Math.random() * 500) * 100) / 100,
      assignedAt: new Date().toISOString(),
    },
  }),

  // Inventory events
  'inventory.low_stock': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'inventory.low_stock',
    created: Date.now(),
    data: {
      productId: `prod_${crypto.randomUUID().slice(0, 8)}`,
      productName: 'Oak Cabinet Base Unit',
      currentStock: Math.floor(1 + Math.random() * 5),
      threshold: 10,
      detectedAt: new Date().toISOString(),
    },
  }),

  'inventory.out_of_stock': () => ({
    id: `evt_${crypto.randomUUID()}`,
    type: 'inventory.out_of_stock',
    created: Date.now(),
    data: {
      productId: `prod_${crypto.randomUUID().slice(0, 8)}`,
      productName: 'Marble Worktop Premium',
      lastAvailable: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      detectedAt: new Date().toISOString(),
    },
  }),
};

// Generate webhook signature
function generateSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  return {
    timestamp,
    signature: `t=${timestamp},v1=${signature}`,
  };
}

// Send webhook
function sendWebhook(url, payload, signature) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const data = JSON.stringify(payload);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Webhook-Signature': signature.signature,
        'X-Webhook-Timestamp': signature.timestamp.toString(),
        'X-Webhook-ID': payload.id,
        'User-Agent': 'KitchenXpert-Webhook/1.0',
      },
    };

    const req = transport.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get all event types
function getEventTypes() {
  return Object.keys(eventTemplates);
}

// Simulate events
async function simulateEvents() {
  const eventTypes =
    config.eventType === 'all' ? getEventTypes() : config.eventType.split(',').map((e) => e.trim());

  log('INFO', `Target URL: ${config.targetUrl}`);
  log('INFO', `Events to simulate: ${eventTypes.length}`);
  log('INFO', `Iterations: ${config.count}`);

  if (config.dryRun) {
    log('WARNING', 'DRY RUN MODE - No requests will be sent');
  }

  console.log('');

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < config.count; i++) {
    if (config.count > 1) {
      log('INFO', `--- Iteration ${i + 1}/${config.count} ---`);
    }

    for (const eventType of eventTypes) {
      if (!eventTemplates[eventType]) {
        log('WARNING', `Unknown event type: ${eventType}`);
        continue;
      }

      const payload = eventTemplates[eventType]();
      const signature = generateSignature(payload, config.webhookSecret);

      log('EVENT', `${eventType} (${payload.id})`);

      if (config.dryRun) {
        console.log(JSON.stringify(payload, null, 2));
        successCount++;
        continue;
      }

      try {
        const response = await sendWebhook(config.targetUrl, payload, signature);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          log('SUCCESS', `Delivered (${response.statusCode})`);
          successCount++;
        } else {
          log('ERROR', `Failed (${response.statusCode}): ${response.body}`);
          failureCount++;
        }
      } catch (error) {
        log('ERROR', `Error: ${error.message}`);
        failureCount++;
      }

      if (config.delay > 0 && eventTypes.indexOf(eventType) < eventTypes.length - 1) {
        await sleep(config.delay);
      }
    }

    if (config.count > 1 && i < config.count - 1) {
      await sleep(config.delay);
    }
  }

  return { successCount, failureCount };
}

async function main() {
  console.log('');
  console.log(
    `${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║${colors.reset}      KitchenXpert - Webhook Event Simulator                ${colors.blue}║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');

  const { successCount, failureCount } = await simulateEvents();

  console.log('');
  console.log(
    `${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.green}║${colors.reset}        Simulation Complete                                 ${colors.green}║${colors.reset}`
  );
  console.log(
    `${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed:     ${failureCount}`);
  console.log('');

  process.exit(failureCount > 0 ? 1 : 0);
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--url':
    case '-u':
      config.targetUrl = args[++i];
      break;
    case '--secret':
    case '-s':
      config.webhookSecret = args[++i];
      break;
    case '--event':
    case '-e':
      config.eventType = args[++i];
      break;
    case '--count':
    case '-c':
      config.count = parseInt(args[++i]);
      break;
    case '--delay':
    case '-d':
      config.delay = parseInt(args[++i]);
      break;
    case '--dry-run':
      config.dryRun = true;
      break;
    case '--list':
      console.log('Available event types:');
      getEventTypes().forEach((e) => console.log(`  - ${e}`));
      process.exit(0);
    case '--help':
      console.log('Usage: simulate-events.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -u, --url <url>       Webhook target URL');
      console.log('  -s, --secret <secret> Webhook signing secret');
      console.log('  -e, --event <type>    Event type(s) to simulate (comma-separated)');
      console.log('  -c, --count <n>       Number of iterations');
      console.log('  -d, --delay <ms>      Delay between events');
      console.log('  --dry-run             Print events without sending');
      console.log('  --list                List available event types');
      console.log('  --help                Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  simulate-events.js --event order.created');
      console.log('  simulate-events.js --event payment.succeeded,payment.failed');
      console.log('  simulate-events.js --url http://localhost:3001/webhooks --count 10');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});
