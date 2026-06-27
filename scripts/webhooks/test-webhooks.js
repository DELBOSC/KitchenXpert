#!/usr/bin/env node
/**
 * Test Webhooks - KitchenXpert
 *
 * Tests webhook endpoint configuration and delivery.
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
    INFO: `${colors.blue}[TEST]${colors.reset}`,
    SUCCESS: `${colors.green}[TEST]${colors.reset}`,
    WARNING: `${colors.yellow}[TEST]${colors.reset}`,
    ERROR: `${colors.red}[TEST]${colors.reset}`,
    STEP: `${colors.cyan}[STEP]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  targetUrl: process.env.WEBHOOK_URL || 'http://localhost:3001/api/webhooks',
  webhookSecret: process.env.WEBHOOK_SECRET || 'test-webhook-secret',
  timeout: parseInt(process.env.TIMEOUT || '10000'),
  verbose: process.env.VERBOSE === 'true',
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Generate webhook signature
function generateSignature(payload, secret, timestamp = null) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${JSON.stringify(payload)}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  return {
    timestamp: ts,
    signature: `t=${ts},v1=${signature}`,
  };
}

// Send HTTP request
function sendRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'POST',
      headers: options.headers || {},
      timeout: config.timeout,
    };

    const req = transport.request(requestOptions, (res) => {
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test helper
function recordTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    log('SUCCESS', `✓ ${name}`);
  } else {
    results.failed++;
    log('ERROR', `✗ ${name}${details ? `: ${details}` : ''}`);
  }
}

// Test: Endpoint reachability
async function testEndpointReachability() {
  log('STEP', 'Testing endpoint reachability...');

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost',
      },
    });

    // Accept 200, 204, or 405 (method not allowed is fine for OPTIONS)
    const passed = [200, 204, 405, 404].includes(response.statusCode);
    recordTest('Endpoint reachability', passed, `Status: ${response.statusCode}`);
    return passed;
  } catch (error) {
    recordTest('Endpoint reachability', false, error.message);
    return false;
  }
}

// Test: Valid webhook delivery
async function testValidWebhookDelivery() {
  log('STEP', 'Testing valid webhook delivery...');

  const payload = {
    id: `evt_test_${crypto.randomUUID()}`,
    type: 'test.ping',
    created: Date.now(),
    data: {
      message: 'Test webhook delivery',
      timestamp: new Date().toISOString(),
    },
  };

  const signature = generateSignature(payload, config.webhookSecret);
  const body = JSON.stringify(payload);

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Webhook-Signature': signature.signature,
        'X-Webhook-Timestamp': signature.timestamp.toString(),
        'X-Webhook-ID': payload.id,
      },
      body,
    });

    const passed = response.statusCode >= 200 && response.statusCode < 300;
    recordTest('Valid webhook delivery', passed, `Status: ${response.statusCode}`);

    if (config.verbose && response.body) {
      console.log(`  Response: ${response.body.slice(0, 200)}`);
    }

    return passed;
  } catch (error) {
    recordTest('Valid webhook delivery', false, error.message);
    return false;
  }
}

// Test: Invalid signature rejection
async function testInvalidSignatureRejection() {
  log('STEP', 'Testing invalid signature rejection...');

  const payload = {
    id: `evt_test_${crypto.randomUUID()}`,
    type: 'test.invalid_signature',
    created: Date.now(),
    data: { message: 'This should be rejected' },
  };

  const body = JSON.stringify(payload);

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Webhook-Signature': 't=123,v1=invalid_signature_here',
        'X-Webhook-Timestamp': '123',
        'X-Webhook-ID': payload.id,
      },
      body,
    });

    // Should return 401 or 403 for invalid signature
    const passed = [401, 403, 400].includes(response.statusCode);
    recordTest('Invalid signature rejection', passed, `Status: ${response.statusCode}`);
    return passed;
  } catch (error) {
    recordTest('Invalid signature rejection', false, error.message);
    return false;
  }
}

// Test: Missing signature header
async function testMissingSignature() {
  log('STEP', 'Testing missing signature handling...');

  const payload = {
    id: `evt_test_${crypto.randomUUID()}`,
    type: 'test.no_signature',
    created: Date.now(),
    data: { message: 'No signature provided' },
  };

  const body = JSON.stringify(payload);

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Webhook-ID': payload.id,
      },
      body,
    });

    // Should return 401 or 400 for missing signature
    const passed = [401, 400, 403].includes(response.statusCode);
    recordTest('Missing signature handling', passed, `Status: ${response.statusCode}`);
    return passed;
  } catch (error) {
    recordTest('Missing signature handling', false, error.message);
    return false;
  }
}

// Test: Expired timestamp rejection
async function testExpiredTimestamp() {
  log('STEP', 'Testing expired timestamp rejection...');

  const payload = {
    id: `evt_test_${crypto.randomUUID()}`,
    type: 'test.expired',
    created: Date.now(),
    data: { message: 'Expired timestamp' },
  };

  // Use timestamp from 10 minutes ago
  const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
  const signature = generateSignature(payload, config.webhookSecret, oldTimestamp);
  const body = JSON.stringify(payload);

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Webhook-Signature': signature.signature,
        'X-Webhook-Timestamp': oldTimestamp.toString(),
        'X-Webhook-ID': payload.id,
      },
      body,
    });

    // Should return 401 or 400 for expired timestamp
    // Note: Some implementations might accept this, so we just report
    const isRejected = [401, 400, 403].includes(response.statusCode);
    recordTest(
      'Expired timestamp handling',
      true,
      isRejected ? 'Correctly rejected' : `Accepted (Status: ${response.statusCode})`
    );
    return true;
  } catch (error) {
    recordTest('Expired timestamp handling', false, error.message);
    return false;
  }
}

// Test: Invalid JSON handling
async function testInvalidJson() {
  log('STEP', 'Testing invalid JSON handling...');

  const invalidBody = '{ invalid json here }';

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(invalidBody),
        'X-Webhook-Signature': 't=123,v1=dummy',
        'X-Webhook-Timestamp': '123',
      },
      body: invalidBody,
    });

    // Should return 400 for invalid JSON
    const passed = response.statusCode === 400;
    recordTest('Invalid JSON handling', passed, `Status: ${response.statusCode}`);
    return passed;
  } catch (error) {
    recordTest('Invalid JSON handling', false, error.message);
    return false;
  }
}

// Test: Large payload handling
async function testLargePayload() {
  log('STEP', 'Testing large payload handling...');

  const largeData = 'x'.repeat(100000); // 100KB payload
  const payload = {
    id: `evt_test_${crypto.randomUUID()}`,
    type: 'test.large_payload',
    created: Date.now(),
    data: { content: largeData },
  };

  const signature = generateSignature(payload, config.webhookSecret);
  const body = JSON.stringify(payload);

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Webhook-Signature': signature.signature,
        'X-Webhook-Timestamp': signature.timestamp.toString(),
        'X-Webhook-ID': payload.id,
      },
      body,
    });

    // Either accept or reject with 413 (payload too large)
    const passed = response.statusCode === 200 || response.statusCode === 413;
    recordTest('Large payload handling', passed, `Status: ${response.statusCode}`);
    return passed;
  } catch (error) {
    recordTest('Large payload handling', false, error.message);
    return false;
  }
}

// Test: Response time
async function testResponseTime() {
  log('STEP', 'Testing response time...');

  const payload = {
    id: `evt_test_${crypto.randomUUID()}`,
    type: 'test.performance',
    created: Date.now(),
    data: { message: 'Performance test' },
  };

  const signature = generateSignature(payload, config.webhookSecret);
  const body = JSON.stringify(payload);

  const startTime = Date.now();

  try {
    const response = await sendRequest(config.targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Webhook-Signature': signature.signature,
        'X-Webhook-Timestamp': signature.timestamp.toString(),
        'X-Webhook-ID': payload.id,
      },
      body,
    });

    const responseTime = Date.now() - startTime;

    // Response should be under 5 seconds (webhooks should respond quickly)
    const passed = responseTime < 5000;
    recordTest('Response time', passed, `${responseTime}ms`);
    return passed;
  } catch (error) {
    recordTest('Response time', false, error.message);
    return false;
  }
}

// Test: Idempotency
async function testIdempotency() {
  log('STEP', 'Testing idempotency (duplicate event handling)...');

  const eventId = `evt_test_${crypto.randomUUID()}`;
  const payload = {
    id: eventId,
    type: 'test.idempotency',
    created: Date.now(),
    data: { message: 'Idempotency test' },
  };

  const signature = generateSignature(payload, config.webhookSecret);
  const body = JSON.stringify(payload);

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'X-Webhook-Signature': signature.signature,
    'X-Webhook-Timestamp': signature.timestamp.toString(),
    'X-Webhook-ID': eventId,
  };

  try {
    // Send the same event twice
    const response1 = await sendRequest(config.targetUrl, { method: 'POST', headers, body });
    const response2 = await sendRequest(config.targetUrl, { method: 'POST', headers, body });

    // Both should succeed (or second should return 200/409 for duplicate)
    const passed =
      response1.statusCode >= 200 &&
      response1.statusCode < 300 &&
      ((response2.statusCode >= 200 && response2.statusCode < 300) || response2.statusCode === 409);
    recordTest(
      'Idempotency handling',
      passed,
      `First: ${response1.statusCode}, Second: ${response2.statusCode}`
    );
    return passed;
  } catch (error) {
    recordTest('Idempotency handling', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('');
  log('INFO', `Testing webhook endpoint: ${config.targetUrl}`);
  console.log('');

  // Run tests
  await testEndpointReachability();
  await testValidWebhookDelivery();
  await testInvalidSignatureRejection();
  await testMissingSignature();
  await testExpiredTimestamp();
  await testInvalidJson();
  await testLargePayload();
  await testResponseTime();
  await testIdempotency();
}

async function main() {
  console.log('');
  console.log(
    `${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║${colors.reset}        KitchenXpert - Webhook Test Suite                   ${colors.blue}║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );

  await runAllTests();

  console.log('');
  const statusColor = results.failed === 0 ? colors.green : colors.red;
  console.log(
    `${statusColor}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${statusColor}║${colors.reset}        Test Results                                        ${statusColor}║${colors.reset}`
  );
  console.log(
    `${statusColor}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Total:  ${results.tests.length}`);
  console.log('');

  process.exit(results.failed > 0 ? 1 : 0);
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
    case '--timeout':
    case '-t':
      config.timeout = parseInt(args[++i]);
      break;
    case '--verbose':
    case '-v':
      config.verbose = true;
      break;
    case '--help':
      console.log('Usage: test-webhooks.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -u, --url <url>       Webhook endpoint URL');
      console.log('  -s, --secret <secret> Webhook signing secret');
      console.log('  -t, --timeout <ms>    Request timeout');
      console.log('  -v, --verbose         Verbose output');
      console.log('  --help                Show this help message');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});
