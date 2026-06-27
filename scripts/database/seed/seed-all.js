#!/usr/bin/env node
/**
 * Seed All Data - KitchenXpert
 *
 * Orchestrates seeding of all database collections with sample data.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[SEED]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SEED]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[SEED]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[SEED]${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`),
};

// Configuration
const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '../../..');

// Seed scripts in order of execution (respecting dependencies)
const seedScripts = [
  { name: 'users', file: 'seed-users.js', description: 'User accounts and profiles' },
  { name: 'partners', file: 'seed-partners.js', description: 'Partner organizations' },
  { name: 'catalogs', file: 'seed-catalogs.js', description: 'Product catalogs and items' },
  { name: 'kitchens', file: 'seed-kitchens.js', description: 'Kitchen configurations' },
];

function printHeader() {
  console.log('');
  console.log(
    `${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║${colors.reset}            KitchenXpert - Database Seeding                 ${colors.blue}║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');
}

function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    });
    log.info('Environment loaded from .env');
  }
}

async function runSeedScript(script) {
  const scriptPath = path.join(scriptDir, script.file);

  if (!fs.existsSync(scriptPath)) {
    log.warning(`Script not found: ${script.file}`);
    return { name: script.name, status: 'skipped', reason: 'Script not found' };
  }

  log.step(`Seeding ${script.description}...`);

  try {
    // Run the seed script
    execSync(`node "${scriptPath}"`, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });

    log.success(`${script.name} seeded successfully`);
    return { name: script.name, status: 'success' };
  } catch (error) {
    log.error(`Failed to seed ${script.name}: ${error.message}`);
    return { name: script.name, status: 'failed', error: error.message };
  }
}

async function seedAll(options = {}) {
  const { only, skip, clean } = options;
  const results = [];

  // Filter scripts based on options
  let scriptsToRun = [...seedScripts];

  if (only && only.length > 0) {
    scriptsToRun = scriptsToRun.filter((s) => only.includes(s.name));
  }

  if (skip && skip.length > 0) {
    scriptsToRun = scriptsToRun.filter((s) => !skip.includes(s.name));
  }

  log.info(`Seeding ${scriptsToRun.length} collection(s)...`);
  console.log('');

  // Clean existing data if requested
  if (clean) {
    log.warning('Clean mode enabled - existing data will be deleted');
    process.env.SEED_CLEAN = 'true';
  }

  // Run each seed script
  for (const script of scriptsToRun) {
    const result = await runSeedScript(script);
    results.push(result);
    console.log('');
  }

  return results;
}

function printSummary(results) {
  console.log('');
  console.log(
    `${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║${colors.reset}                    Seeding Summary                         ${colors.blue}║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');

  const successful = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  results.forEach((result) => {
    let statusIcon;
    let statusColor;

    switch (result.status) {
      case 'success':
        statusIcon = '✓';
        statusColor = colors.green;
        break;
      case 'failed':
        statusIcon = '✗';
        statusColor = colors.red;
        break;
      default:
        statusIcon = '○';
        statusColor = colors.yellow;
    }

    console.log(`  ${statusColor}${statusIcon}${colors.reset} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`    ${colors.red}Error: ${result.error}${colors.reset}`);
    }
  });

  console.log('');
  console.log(
    `  Total: ${results.length} | Success: ${successful} | Failed: ${failed} | Skipped: ${skipped}`
  );
  console.log('');

  return failed === 0;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    only: [],
    skip: [],
    clean: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--only':
        options.only = args[++i]?.split(',') || [];
        break;
      case '--skip':
        options.skip = args[++i]?.split(',') || [];
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--list':
        console.log('\nAvailable seed scripts:');
        seedScripts.forEach((s) => {
          console.log(`  - ${s.name}: ${s.description}`);
        });
        console.log('');
        process.exit(0);
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: node seed-all.js [options]

Options:
  --only <names>   Only run specified seeds (comma-separated)
  --skip <names>   Skip specified seeds (comma-separated)
  --clean          Delete existing data before seeding
  --list           List available seed scripts
  --help, -h       Show this help message

Examples:
  node seed-all.js                    # Run all seeds
  node seed-all.js --only users       # Only seed users
  node seed-all.js --skip kitchens    # Skip kitchens
  node seed-all.js --clean            # Clean and reseed all
`);
}

// Main execution
async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  printHeader();
  loadEnv();

  const results = await seedAll(options);
  const success = printSummary(results);

  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
