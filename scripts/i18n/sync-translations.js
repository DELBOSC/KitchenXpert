#!/usr/bin/env node
/**
 * Sync Translations - KitchenXpert
 *
 * Synchronizes translation keys across all locales.
 * Adds missing keys and optionally removes obsolete ones.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[SYNC]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SYNC]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[SYNC]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[SYNC]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  localesDir: path.resolve(__dirname, '../../locales'),
  defaultLocale: 'fr',
  removeObsolete: false,
  dryRun: false,
};

class TranslationSyncer {
  constructor() {
    this.stats = {
      keysAdded: 0,
      keysRemoved: 0,
      filesUpdated: 0,
    };
  }

  /**
   * Load translations from a file
   */
  loadFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      log.error(`Failed to load ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Save translations to a file
   */
  saveFile(filePath, content) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  }

  /**
   * Get all keys from an object (flattened)
   */
  getAllKeys(obj, prefix = '') {
    const keys = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  /**
   * Get value by dot notation key
   */
  getValue(obj, key) {
    const parts = key.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Set value by dot notation key
   */
  setValue(obj, key, value) {
    const parts = key.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Delete value by dot notation key
   */
  deleteValue(obj, key) {
    const parts = key.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) return;
      current = current[parts[i]];
    }

    delete current[parts[parts.length - 1]];

    // Clean up empty parent objects
    this.cleanEmptyObjects(obj);
  }

  /**
   * Remove empty objects recursively
   */
  cleanEmptyObjects(obj) {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.cleanEmptyObjects(obj[key]);
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    }
  }

  /**
   * Sort object keys alphabetically
   */
  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        sorted[key] = this.sortObject(obj[key]);
      } else {
        sorted[key] = obj[key];
      }
    }

    return sorted;
  }

  /**
   * Sync a namespace across locales
   */
  syncNamespace(namespace, defaultContent, targetLocale) {
    const targetPath = path.join(config.localesDir, targetLocale, `${namespace}.json`);
    let targetContent = this.loadFile(targetPath) || {};
    let modified = false;

    const defaultKeys = this.getAllKeys(defaultContent);
    const targetKeys = this.getAllKeys(targetContent);

    // Add missing keys
    for (const key of defaultKeys) {
      if (!targetKeys.includes(key)) {
        const defaultValue = this.getValue(defaultContent, key);
        // Use empty string for missing translations
        this.setValue(targetContent, key, '');
        this.stats.keysAdded++;
        modified = true;
        log.info(`[${targetLocale}/${namespace}] Added: ${key}`);
      }
    }

    // Remove obsolete keys if enabled
    if (config.removeObsolete) {
      for (const key of targetKeys) {
        if (!defaultKeys.includes(key)) {
          this.deleteValue(targetContent, key);
          this.stats.keysRemoved++;
          modified = true;
          log.warning(`[${targetLocale}/${namespace}] Removed: ${key}`);
        }
      }
    }

    // Save if modified
    if (modified && !config.dryRun) {
      targetContent = this.sortObject(targetContent);
      this.saveFile(targetPath, targetContent);
      this.stats.filesUpdated++;
    }

    return modified;
  }

  /**
   * Get all locales
   */
  getLocales() {
    if (!fs.existsSync(config.localesDir)) {
      log.error(`Locales directory not found: ${config.localesDir}`);
      return [];
    }

    return fs.readdirSync(config.localesDir).filter((f) => {
      const stat = fs.statSync(path.join(config.localesDir, f));
      return stat.isDirectory();
    });
  }

  /**
   * Get all namespaces from default locale
   */
  getNamespaces() {
    const defaultDir = path.join(config.localesDir, config.defaultLocale);

    if (!fs.existsSync(defaultDir)) {
      log.error(`Default locale directory not found: ${defaultDir}`);
      return [];
    }

    return fs
      .readdirSync(defaultDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.basename(f, '.json'));
  }

  /**
   * Run synchronization
   */
  sync() {
    log.info('Starting translation synchronization...');
    console.log('');

    const locales = this.getLocales();
    const namespaces = this.getNamespaces();

    log.info(`Default locale: ${config.defaultLocale}`);
    log.info(`Locales: ${locales.join(', ')}`);
    log.info(`Namespaces: ${namespaces.join(', ')}`);

    if (config.dryRun) {
      log.warning('DRY RUN - no files will be modified');
    }

    console.log('');

    // Process each locale (except default)
    for (const locale of locales) {
      if (locale === config.defaultLocale) continue;

      log.info(`Syncing locale: ${locale}`);

      // Ensure locale directory exists
      const localeDir = path.join(config.localesDir, locale);
      if (!fs.existsSync(localeDir) && !config.dryRun) {
        fs.mkdirSync(localeDir, { recursive: true });
      }

      // Sync each namespace
      for (const namespace of namespaces) {
        const defaultPath = path.join(config.localesDir, config.defaultLocale, `${namespace}.json`);
        const defaultContent = this.loadFile(defaultPath);

        if (defaultContent) {
          this.syncNamespace(namespace, defaultContent, locale);
        }
      }
    }

    console.log('');
    this.printSummary();
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}              Sync Summary                     ${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log('');
    console.log(`  Keys added:    ${this.stats.keysAdded}`);
    console.log(`  Keys removed:  ${this.stats.keysRemoved}`);
    console.log(`  Files updated: ${this.stats.filesUpdated}`);
    console.log('');

    if (config.dryRun) {
      log.warning('DRY RUN - no changes were made');
    } else {
      log.success('Synchronization completed!');
    }
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--locales-dir':
        config.localesDir = path.resolve(args[++i]);
        break;
      case '--default-locale':
        config.defaultLocale = args[++i];
        break;
      case '--remove-obsolete':
        config.removeObsolete = true;
        break;
      case '--dry-run':
        config.dryRun = true;
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
Usage: node sync-translations.js [options]

Options:
  --locales-dir <dir>    Directory containing locale folders
  --default-locale <l>   Default/source locale (default: fr)
  --remove-obsolete      Remove keys not in default locale
  --dry-run              Show what would be changed
  -h, --help             Show this help message

Examples:
  node sync-translations.js
  node sync-translations.js --remove-obsolete
  node sync-translations.js --dry-run
`);
}

// Main execution
const options = parseArgs();

if (options.help) {
  printHelp();
  process.exit(0);
}

const syncer = new TranslationSyncer();
syncer.sync();
