#!/usr/bin/env node
/**
 * Extract Translations - KitchenXpert
 *
 * Scans source code to extract translatable strings.
 * Supports React/Next.js i18n patterns (t(), <Trans>, useTranslation).
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

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
  info: (msg) => console.log(`${colors.blue}[EXTRACT]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[EXTRACT]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[EXTRACT]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[EXTRACT]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  sourceDir: path.resolve(__dirname, '../../apps'),
  outputDir: path.resolve(__dirname, '../../locales'),
  defaultLocale: 'fr',
  extensions: ['.tsx', '.ts', '.jsx', '.js'],
  ignorePatterns: ['node_modules', '.next', 'dist', 'build', '__tests__'],
  namespaces: ['common', 'auth', 'kitchen', 'catalog', 'partner', 'errors'],
};

// Regex patterns for extracting translations
const patterns = {
  // t('key') or t('namespace:key')
  tFunction: /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,

  // useTranslation('namespace')
  useTranslation: /useTranslation\s*\(\s*['"`]([^'"`]+)['"`]/g,

  // <Trans i18nKey="key">
  transComponent: /<Trans[^>]*i18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,

  // i18n.t('key')
  i18nT: /i18n\.t\s*\(\s*['"`]([^'"`]+)['"`]/g,

  // $t('key') for Vue-style
  dollarT: /\$t\s*\(\s*['"`]([^'"`]+)['"`]/g,
};

class TranslationExtractor {
  constructor() {
    this.translations = new Map();
    this.sourceLocations = new Map();
    this.stats = {
      filesScanned: 0,
      keysExtracted: 0,
      namespaces: new Set(),
    };
  }

  /**
   * Extract keys from a single file
   */
  extractFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(config.sourceDir, filePath);
    const keys = new Set();

    // Extract using all patterns
    for (const [patternName, regex] of Object.entries(patterns)) {
      let match;
      const regexCopy = new RegExp(regex.source, regex.flags);

      while ((match = regexCopy.exec(content)) !== null) {
        const key = match[1];
        keys.add(key);

        // Track source location
        const line = content.substring(0, match.index).split('\n').length;
        if (!this.sourceLocations.has(key)) {
          this.sourceLocations.set(key, []);
        }
        this.sourceLocations.get(key).push({
          file: relativePath,
          line,
          pattern: patternName,
        });
      }
    }

    return keys;
  }

  /**
   * Parse key to get namespace and actual key
   */
  parseKey(fullKey) {
    if (fullKey.includes(':')) {
      const [namespace, ...keyParts] = fullKey.split(':');
      return { namespace, key: keyParts.join(':') };
    }
    return { namespace: 'common', key: fullKey };
  }

  /**
   * Add key to translations map
   */
  addKey(fullKey) {
    const { namespace, key } = this.parseKey(fullKey);

    if (!this.translations.has(namespace)) {
      this.translations.set(namespace, new Map());
    }

    const namespaceMap = this.translations.get(namespace);
    if (!namespaceMap.has(key)) {
      namespaceMap.set(key, {
        defaultValue: this.generateDefaultValue(key),
        extracted: true,
      });
      this.stats.keysExtracted++;
    }

    this.stats.namespaces.add(namespace);
  }

  /**
   * Generate a default value from the key
   */
  generateDefaultValue(key) {
    // Convert dot notation to human-readable text
    // e.g., "buttons.submit" -> "Submit"
    const lastPart = key.split('.').pop();
    return lastPart
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  /**
   * Scan all source files
   */
  scanSourceFiles() {
    log.info('Scanning source files...');

    const patterns = config.extensions.map(
      (ext) => `${config.sourceDir}/**/*${ext}`
    );

    for (const pattern of patterns) {
      const files = glob.sync(pattern, {
        ignore: config.ignorePatterns.map((p) => `**/${p}/**`),
      });

      for (const file of files) {
        this.stats.filesScanned++;
        const keys = this.extractFromFile(file);

        for (const key of keys) {
          this.addKey(key);
        }
      }
    }

    log.success(`Scanned ${this.stats.filesScanned} files`);
    log.success(`Extracted ${this.stats.keysExtracted} translation keys`);
    log.success(`Namespaces: ${[...this.stats.namespaces].join(', ')}`);
  }

  /**
   * Load existing translations
   */
  loadExistingTranslations(locale) {
    const existing = new Map();
    const localeDir = path.join(config.outputDir, locale);

    if (!fs.existsSync(localeDir)) {
      return existing;
    }

    const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const filePath = path.join(localeDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      existing.set(namespace, this.flattenObject(content));
    }

    return existing;
  }

  /**
   * Flatten nested object to dot notation
   */
  flattenObject(obj, prefix = '') {
    const result = new Map();

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = this.flattenObject(value, fullKey);
        for (const [k, v] of nested) {
          result.set(k, v);
        }
      } else {
        result.set(fullKey, value);
      }
    }

    return result;
  }

  /**
   * Convert flat map to nested object
   */
  unflattenObject(map) {
    const result = {};

    for (const [key, value] of map) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      current[parts[parts.length - 1]] = value;
    }

    return result;
  }

  /**
   * Merge extracted translations with existing ones
   */
  mergeTranslations(locale) {
    const existing = this.loadExistingTranslations(locale);
    const merged = new Map();

    for (const [namespace, keys] of this.translations) {
      const existingNamespace = existing.get(namespace) || new Map();
      const mergedNamespace = new Map();

      // Add existing translations
      for (const [key, value] of existingNamespace) {
        mergedNamespace.set(key, value);
      }

      // Add new extracted keys (don't overwrite existing)
      for (const [key, data] of keys) {
        if (!mergedNamespace.has(key)) {
          // For default locale, use default value; for others, leave empty
          mergedNamespace.set(
            key,
            locale === config.defaultLocale ? data.defaultValue : ''
          );
        }
      }

      merged.set(namespace, mergedNamespace);
    }

    return merged;
  }

  /**
   * Save translations to files
   */
  saveTranslations(locale, translations) {
    const localeDir = path.join(config.outputDir, locale);

    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    for (const [namespace, keys] of translations) {
      const filePath = path.join(localeDir, `${namespace}.json`);
      const content = this.unflattenObject(keys);

      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
      log.info(`Saved: ${locale}/${namespace}.json (${keys.size} keys)`);
    }
  }

  /**
   * Generate source location report
   */
  generateSourceReport() {
    const reportPath = path.join(config.outputDir, 'extraction-report.json');

    const report = {
      generatedAt: new Date().toISOString(),
      stats: {
        filesScanned: this.stats.filesScanned,
        keysExtracted: this.stats.keysExtracted,
        namespaces: [...this.stats.namespaces],
      },
      keys: {},
    };

    for (const [key, locations] of this.sourceLocations) {
      report.keys[key] = locations;
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log.success(`Source report saved: ${reportPath}`);
  }

  /**
   * Run extraction
   */
  run(options = {}) {
    const { locales = [config.defaultLocale], dryRun = false } = options;

    log.info('Starting translation extraction...');
    console.log('');

    // Scan source files
    this.scanSourceFiles();
    console.log('');

    if (dryRun) {
      log.info('[DRY RUN] Would save the following:');
      for (const [namespace, keys] of this.translations) {
        console.log(`  ${namespace}: ${keys.size} keys`);
      }
      return;
    }

    // Process each locale
    for (const locale of locales) {
      log.info(`Processing locale: ${locale}`);
      const merged = this.mergeTranslations(locale);
      this.saveTranslations(locale, merged);
    }

    // Generate report
    this.generateSourceReport();

    console.log('');
    log.success('Extraction completed successfully!');
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    locales: [],
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--locales':
      case '-l':
        options.locales = args[++i]?.split(',') || [];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--source':
      case '-s':
        config.sourceDir = path.resolve(args[++i]);
        break;
      case '--output':
      case '-o':
        config.outputDir = path.resolve(args[++i]);
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  if (options.locales.length === 0) {
    options.locales = [config.defaultLocale];
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: node extract-translations.js [options]

Options:
  -l, --locales <list>   Comma-separated list of locales (default: fr)
  -s, --source <dir>     Source directory to scan
  -o, --output <dir>     Output directory for translation files
  --dry-run              Show what would be extracted without saving
  -h, --help             Show this help message

Examples:
  node extract-translations.js
  node extract-translations.js --locales fr,en,de
  node extract-translations.js --dry-run
`);
}

// Main execution
const options = parseArgs();

if (options.help) {
  printHelp();
  process.exit(0);
}

try {
  const extractor = new TranslationExtractor();
  extractor.run(options);
} catch (error) {
  log.error(`Extraction failed: ${error.message}`);
  process.exit(1);
}
