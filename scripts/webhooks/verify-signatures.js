#!/usr/bin/env node
/**
 * Verify Webhook Signatures - KitchenXpert
 *
 * Utilities for verifying and debugging webhook signatures.
 */

const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');

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
    INFO: `${colors.blue}[VERIFY]${colors.reset}`,
    SUCCESS: `${colors.green}[VERIFY]${colors.reset}`,
    WARNING: `${colors.yellow}[VERIFY]${colors.reset}`,
    ERROR: `${colors.red}[VERIFY]${colors.reset}`,
  };
  console.log(`${prefix[level] || prefix.INFO} ${message}`);
}

// Configuration
const config = {
  secret: process.env.WEBHOOK_SECRET || '',
  timestampTolerance: parseInt(process.env.TIMESTAMP_TOLERANCE || '300'), // 5 minutes
  mode: 'verify', // verify, generate, debug
};

/**
 * Generate a webhook signature
 */
function generateSignature(payload, secret, timestamp = null) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedPayload = `${ts}.${payloadStr}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    timestamp: ts,
    signature: `t=${ts},v1=${signature}`,
    rawSignature: signature,
    signedPayload,
  };
}

/**
 * Parse a signature header
 */
function parseSignatureHeader(header) {
  const parts = {};

  header.split(',').forEach((part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      parts[key] = value;
    }
  });

  return {
    timestamp: parts.t ? parseInt(parts.t) : null,
    signatures: {
      v1: parts.v1 || null,
      v0: parts.v0 || null, // Legacy version support
    },
  };
}

/**
 * Verify a webhook signature
 */
function verifySignature(payload, signatureHeader, secret, options = {}) {
  const tolerance = options.timestampTolerance || config.timestampTolerance;

  // Parse the signature header
  const parsed = parseSignatureHeader(signatureHeader);

  if (!parsed.timestamp) {
    return {
      valid: false,
      error: 'Missing timestamp in signature header',
    };
  }

  if (!parsed.signatures.v1) {
    return {
      valid: false,
      error: 'Missing v1 signature in header',
    };
  }

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(now - parsed.timestamp);

  if (timeDiff > tolerance) {
    return {
      valid: false,
      error: `Timestamp expired (${timeDiff}s old, tolerance: ${tolerance}s)`,
      details: {
        timestamp: parsed.timestamp,
        now,
        difference: timeDiff,
        tolerance,
      },
    };
  }

  // Generate expected signature
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const expected = generateSignature(payloadStr, secret, parsed.timestamp);

  // Compare signatures
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expected.rawSignature),
    Buffer.from(parsed.signatures.v1)
  );

  return {
    valid: isValid,
    error: isValid ? null : 'Signature mismatch',
    details: {
      timestamp: parsed.timestamp,
      providedSignature: parsed.signatures.v1,
      expectedSignature: expected.rawSignature,
      signedPayload: expected.signedPayload,
    },
  };
}

/**
 * Interactive signature generator
 */
async function interactiveGenerate() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log('');
  log('INFO', 'Interactive Signature Generator');
  console.log('');

  const secret = config.secret || (await question('Webhook secret: '));
  const payloadInput = await question('Payload (JSON or press Enter for example): ');

  let payload;
  if (payloadInput.trim()) {
    try {
      payload = JSON.parse(payloadInput);
    } catch {
      payload = payloadInput; // Use as raw string
    }
  } else {
    payload = {
      id: `evt_${crypto.randomUUID()}`,
      type: 'test.example',
      created: Date.now(),
      data: { message: 'Example payload' },
    };
  }

  const result = generateSignature(payload, secret);

  console.log('');
  log('SUCCESS', 'Generated Signature:');
  console.log('');
  console.log(`  Timestamp:        ${result.timestamp}`);
  console.log(`  Signature Header: ${result.signature}`);
  console.log(`  Raw Signature:    ${result.rawSignature}`);
  console.log('');
  console.log('  Headers to use:');
  console.log(`    X-Webhook-Signature: ${result.signature}`);
  console.log(`    X-Webhook-Timestamp: ${result.timestamp}`);
  console.log('');
  console.log('  Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  rl.close();
}

/**
 * Interactive signature verifier
 */
async function interactiveVerify() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  console.log('');
  log('INFO', 'Interactive Signature Verifier');
  console.log('');

  const secret = config.secret || (await question('Webhook secret: '));
  const signatureHeader = await question('Signature header (X-Webhook-Signature): ');
  const payloadInput = await question('Payload (JSON): ');

  let payload;
  try {
    payload = JSON.parse(payloadInput);
  } catch {
    payload = payloadInput;
  }

  const result = verifySignature(payload, signatureHeader, secret);

  console.log('');
  if (result.valid) {
    log('SUCCESS', 'Signature is VALID ✓');
  } else {
    log('ERROR', `Signature is INVALID: ${result.error}`);
  }

  if (result.details) {
    console.log('');
    console.log('  Details:');
    console.log(`    Timestamp:          ${result.details.timestamp}`);
    console.log(`    Provided Signature: ${result.details.providedSignature}`);
    console.log(`    Expected Signature: ${result.details.expectedSignature}`);
  }
  console.log('');

  rl.close();
}

/**
 * Debug mode - show detailed signature computation
 */
function debugSignature(payload, secret, timestamp = null) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

  console.log('');
  log('INFO', 'Signature Debug Information');
  console.log('');
  console.log('  Input:');
  console.log(`    Secret:    ${secret.slice(0, 4)}...${secret.slice(-4)} (${secret.length} chars)`);
  console.log(`    Timestamp: ${ts}`);
  console.log(`    Payload:   ${payloadStr.slice(0, 50)}...`);
  console.log('');
  console.log('  Computation:');

  const signedPayload = `${ts}.${payloadStr}`;
  console.log(`    1. Signed payload: "${signedPayload.slice(0, 60)}..."`);

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  const signature = hmac.digest('hex');

  console.log(`    2. HMAC-SHA256:    ${signature}`);
  console.log(`    3. Header format:  t=${ts},v1=${signature}`);
  console.log('');
  console.log('  Result:');
  console.log(`    X-Webhook-Signature: t=${ts},v1=${signature}`);
  console.log(`    X-Webhook-Timestamp: ${ts}`);
  console.log('');
}

/**
 * Verify from file
 */
function verifyFromFile(filePath, secret) {
  if (!fs.existsSync(filePath)) {
    log('ERROR', `File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  try {
    const data = JSON.parse(content);

    if (!data.signature || !data.payload) {
      log('ERROR', 'File must contain "signature" and "payload" fields');
      return;
    }

    const result = verifySignature(data.payload, data.signature, secret);

    if (result.valid) {
      log('SUCCESS', 'Signature is VALID');
    } else {
      log('ERROR', `Signature is INVALID: ${result.error}`);
    }

    if (result.details) {
      console.log('');
      console.log('  Details:', JSON.stringify(result.details, null, 2));
    }
  } catch (error) {
    log('ERROR', `Failed to parse file: ${error.message}`);
  }
}

/**
 * Batch verify from log file
 */
function batchVerify(logFilePath, secret) {
  if (!fs.existsSync(logFilePath)) {
    log('ERROR', `File not found: ${logFilePath}`);
    return;
  }

  const content = fs.readFileSync(logFilePath, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());

  let valid = 0;
  let invalid = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.signature && entry.payload) {
        const result = verifySignature(entry.payload, entry.signature, secret);
        if (result.valid) {
          valid++;
        } else {
          invalid++;
          log('WARNING', `Invalid: ${entry.payload?.id || 'unknown'} - ${result.error}`);
        }
      }
    } catch {
      // Skip invalid lines
    }
  }

  console.log('');
  log('INFO', `Batch verification complete: ${valid} valid, ${invalid} invalid`);
}

async function main() {
  console.log('');
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║${colors.reset}      KitchenXpert - Webhook Signature Verifier             ${colors.blue}║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`);

  switch (config.mode) {
    case 'generate':
      await interactiveGenerate();
      break;
    case 'verify':
      await interactiveVerify();
      break;
    case 'debug':
      if (!config.payload) {
        log('ERROR', 'Debug mode requires --payload');
        process.exit(1);
      }
      debugSignature(config.payload, config.secret, config.timestamp);
      break;
    case 'file':
      if (!config.file) {
        log('ERROR', 'File mode requires --file');
        process.exit(1);
      }
      verifyFromFile(config.file, config.secret);
      break;
    case 'batch':
      if (!config.file) {
        log('ERROR', 'Batch mode requires --file');
        process.exit(1);
      }
      batchVerify(config.file, config.secret);
      break;
    default:
      await interactiveVerify();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--secret':
    case '-s':
      config.secret = args[++i];
      break;
    case '--generate':
    case '-g':
      config.mode = 'generate';
      break;
    case '--verify':
    case '-v':
      config.mode = 'verify';
      break;
    case '--debug':
    case '-d':
      config.mode = 'debug';
      break;
    case '--payload':
    case '-p':
      config.payload = args[++i];
      try {
        config.payload = JSON.parse(config.payload);
      } catch {
        // Use as string
      }
      break;
    case '--signature':
      config.signature = args[++i];
      break;
    case '--timestamp':
    case '-t':
      config.timestamp = parseInt(args[++i]);
      break;
    case '--tolerance':
      config.timestampTolerance = parseInt(args[++i]);
      break;
    case '--file':
    case '-f':
      config.file = args[++i];
      config.mode = 'file';
      break;
    case '--batch':
    case '-b':
      config.file = args[++i];
      config.mode = 'batch';
      break;
    case '--help':
      console.log('Usage: verify-signatures.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -s, --secret <secret>   Webhook signing secret');
      console.log('  -g, --generate          Generate a new signature');
      console.log('  -v, --verify            Verify a signature (default)');
      console.log('  -d, --debug             Debug signature computation');
      console.log('  -p, --payload <json>    Payload for debug mode');
      console.log('  --signature <sig>       Signature to verify');
      console.log('  -t, --timestamp <ts>    Custom timestamp');
      console.log('  --tolerance <seconds>   Timestamp tolerance');
      console.log('  -f, --file <path>       Verify from JSON file');
      console.log('  -b, --batch <path>      Batch verify from log file');
      console.log('  --help                  Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  verify-signatures.js --generate --secret mysecret');
      console.log('  verify-signatures.js --verify --secret mysecret');
      console.log('  verify-signatures.js --debug --secret mysecret --payload \'{"id":"123"}\'');
      console.log('  verify-signatures.js --file webhook.json --secret mysecret');
      process.exit(0);
  }
}

main().catch((error) => {
  log('ERROR', `Fatal error: ${error.message}`);
  process.exit(1);
});
