#!/usr/bin/env node
/**
 * Validate Translations - KitchenXpert
 *
 * Validates translation files for completeness, consistency, and quality.
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
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[VALIDATE]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[VALIDATE]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[VALIDATE]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[VALIDATE]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  localesDir: path.resolve(__dirname, '../../locales'),
  defaultLocale: 'fr',
  requiredLocales: ['fr', 'en'],
};

class TranslationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      locales: 0,
      namespaces: 0,
      totalKeys: 0,
      missingKeys: 0,
      emptyValues: 0,
      placeholderMismatches: 0,
    };
  }

  /**
   * Load all translations for a locale
   */
  loadLocale(locale) {
    const localeDir = path.join(config.localesDir, locale);
    const translations = {};

    if (!fs.existsSync(localeDir)) {
      this.errors.push(`Locale directory not found: ${locale}`);
      return null;
    }

    const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const filePath = path.join(localeDir, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        translations[namespace] = JSON.parse(content);
      } catch (error) {
        this.errors.push(`Invalid JSON in ${locale}/${file}: ${error.message}`);
      }
    }

    return translations;
  }

  /**
   * Flatten nested object to dot notation keys
   */
  flattenKeys(obj, prefix = '') {
    const keys = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.flattenKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }

  /**
   * Get value by dot notation key
   */
  getByKey(obj, key) {
    const parts = key.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Extract placeholders from a string
   */
  extractPlaceholders(str) {
    if (typeof str !== 'string') return [];

    const patterns = [
      /\{\{(\w+)\}\}/g, // {{name}}
      /\{(\w+)\}/g, // {name}
      /%\((\w+)\)s/g, // %(name)s
      /%(\d+)\$s/g, // %1$s
    ];

    const placeholders = new Set();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(str)) !== null) {
        placeholders.add(match[1]);
      }
    }

    return [...placeholders];
  }

  /**
   * Validate a single translation key
   */
  validateKey(namespace, key, defaultValue, targetValue, locale) {
    const keyPath = `${namespace}:${key}`;

    // Check for missing translation
    if (targetValue === undefined) {
      this.errors.push(`[${locale}] Missing key: ${keyPath}`);
      this.stats.missingKeys++;
      return false;
    }

    // Check for empty value
    if (targetValue === '' || targetValue === null) {
      this.warnings.push(`[${locale}] Empty value: ${keyPath}`);
      this.stats.emptyValues++;
    }

    // Check placeholder consistency
    if (typeof defaultValue === 'string' && typeof targetValue === 'string') {
      const defaultPlaceholders = this.extractPlaceholders(defaultValue);
      const targetPlaceholders = this.extractPlaceholders(targetValue);

      const missingPlaceholders = defaultPlaceholders.filter(
        (p) => !targetPlaceholders.includes(p)
      );
      const extraPlaceholders = targetPlaceholders.filter(
        (p) => !defaultPlaceholders.includes(p)
      );

      if (missingPlaceholders.length > 0) {
        this.errors.push(
          `[${locale}] Missing placeholders in ${keyPath}: ${missingPlaceholders.join(', ')}`
        );
        this.stats.placeholderMismatches++;
      }

      if (extraPlaceholders.length > 0) {
        this.warnings.push(
          `[${locale}] Extra placeholders in ${keyPath}: ${extraPlaceholders.join(', ')}`
        );
      }
    }

    // Check for untranslated (same as default)
    if (locale !== config.defaultLocale && targetValue === defaultValue) {
      this.warnings.push(`[${locale}] Possibly untranslated: ${keyPath}`);
    }

    return true;
  }

  /**
   * Validate namespace consistency
   */
  validateNamespace(namespace, defaultTranslations, targetTranslations, locale) {
    const defaultObj = defaultTranslations[namespace];
    const targetObj = targetTranslations[namespace];

    if (!targetObj) {
      this.errors.push(`[${locale}] Missing namespace: ${namespace}`);
      return;
    }

    const defaultKeys = this.flattenKeys(defaultObj);
    const targetKeys = this.flattenKeys(targetObj);

    // Check for missing keys
    for (const key of defaultKeys) {
      const defaultValue = this.getByKey(defaultObj, key);
      const targetValue = this.getByKey(targetObj, key);
      this.validateKey(namespace, key, defaultValue, targetValue, locale);
      this.stats.totalKeys++;
    }

    // Check for extra keys (in target but not in default)
    for (const key of targetKeys) {
      if (!defaultKeys.includes(key)) {
        this.warnings.push(`[${locale}] Extra key not in default: ${namespace}:${key}`);
      }
    }
  }

  /**
   * Validate all translations
   */
  validate() {
    log.info('Starting translation validation...');
    console.log('');

    // Load default locale
    const defaultTranslations = this.loadLocale(config.defaultLocale);
    if (!defaultTranslations) {
      log.error(`Cannot load default locale: ${config.defaultLocale}`);
      return false;
    }

    const namespaces = Object.keys(defaultTranslations);
    this.stats.namespaces = namespaces.length;

    log.info(`Default locale: ${config.defaultLocale}`);
    log.info(`Namespaces: ${namespaces.join(', ')}`);
    console.log('');

    // Get all locales
    const locales = fs
      .readdirSync(config.localesDir)
      .filter((f) => {
        const stat = fs.statSync(path.join(config.localesDir, f));
        return stat.isDirectory() && f !== config.defaultLocale;
      });

    this.stats.locales = locales.length + 1;

    // Check required locales exist
    for (const required of config.requiredLocales) {
      if (required !== config.defaultLocale && !locales.includes(required)) {
        this.errors.push(`Required locale missing: ${required}`);
      }
    }

    // Validate each locale
    for (const locale of locales) {
      log.info(`Validating locale: ${locale}`);

      const targetTranslations = this.loadLocale(locale);
      if (!targetTranslations) continue;

      // Check for missing namespaces
      for (const namespace of namespaces) {
        this.validateNamespace(
          namespace,
          defaultTranslations,
          targetTranslations,
          locale
        );
      }
    }

    return this.errors.length === 0;
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('');
    console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}              Validation Results               ${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════${colors.reset}`);
    console.log('');

    // Statistics
    console.log('  Statistics:');
    console.log(`    Locales validated:     ${this.stats.locales}`);
    console.log(`    Namespaces:            ${this.stats.namespaces}`);
    console.log(`    Total keys checked:    ${this.stats.totalKeys}`);
    console.log(`    Missing keys:          ${this.stats.missingKeys}`);
    console.log(`    Empty values:          ${this.stats.emptyValues}`);
    console.log(`    Placeholder issues:    ${this.stats.placeholderMismatches}`);
    console.log('');

    // Errors
    if (this.errors.length > 0) {
      console.log(`  ${colors.red}Errors (${this.errors.length}):${colors.reset}`);
      for (const error of this.errors.slice(0, 20)) {
        console.log(`    ${colors.red}✗${colors.reset} ${error}`);
      }
      if (this.errors.length > 20) {
        console.log(`    ... and ${this.errors.length - 20} more errors`);
      }
      console.log('');
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`  ${colors.yellow}Warnings (${this.warnings.length}):${colors.reset}`);
      for (const warning of this.warnings.slice(0, 10)) {
        console.log(`    ${colors.yellow}⚠${colors.reset} ${warning}`);
      }
      if (this.warnings.length > 10) {
        console.log(`    ... and ${this.warnings.length - 10} more warnings`);
      }
      console.log('');
    }

    // Summary
    if (this.errors.length === 0) {
      console.log(`  ${colors.green}✓ All translations are valid!${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✗ Validation failed with ${this.errors.length} error(s)${colors.reset}`);
    }
    console.log('');
  }

  /**
   * Export results to JSON
   */
  exportResults(outputPath) {
    const results = {
      generatedAt: new Date().toISOString(),
      stats: this.stats,
      errors: this.errors,
      warnings: this.warnings,
      valid: this.errors.length === 0,
    };

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    log.success(`Results exported to: ${outputPath}`);
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    export: null,
    strict: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--export':
      case '-e':
        options.export = args[++i];
        break;
      case '--locales-dir':
        config.localesDir = path.resolve(args[++i]);
        break;
      case '--default-locale':
        config.defaultLocale = args[++i];
        break;
      case '--strict':
        options.strict = true;
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
Usage: node validate-translations.js [options]

Options:
  -e, --export <file>    Export results to JSON file
  --locales-dir <dir>    Directory containing locale folders
  --default-locale <l>   Default/source locale (default: fr)
  --strict               Treat warnings as errors
  -h, --help             Show this help message

Examples:
  node validate-translations.js
  node validate-translations.js --export results.json
  node validate-translations.js --strict
`);
}

// Main execution
const options = parseArgs();

if (options.help) {
  printHelp();
  process.exit(0);
}

const validator = new TranslationValidator();
const valid = validator.validate();
validator.printResults();

if (options.export) {
  validator.exportResults(options.export);
}

// Exit with appropriate code
if (!valid || (options.strict && validator.warnings.length > 0)) {
  process.exit(1);
}
