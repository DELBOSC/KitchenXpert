#!/usr/bin/env node
/**
 * Import Translations - KitchenXpert
 *
 * Imports translations from various formats back into the project.
 * Supports: CSV, XLIFF, JSON flat, PO (gettext)
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
  info: (msg) => console.log(`${colors.blue}[IMPORT]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[IMPORT]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[IMPORT]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[IMPORT]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  localesDir: path.resolve(__dirname, '../../locales'),
  dryRun: false,
  overwrite: true,
};

class TranslationImporter {
  constructor() {
    this.stats = {
      imported: 0,
      skipped: 0,
      errors: 0,
    };
  }

  /**
   * Detect file format
   */
  detectFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.csv':
        return 'csv';
      case '.xlf':
      case '.xliff':
        return 'xliff';
      case '.po':
        return 'po';
      case '.json':
        return 'json';
      default:
        return null;
    }
  }

  /**
   * Parse CSV content
   */
  parseCsv(content) {
    const lines = content.split('\n');
    const translations = {};
    let targetLocale = null;

    // Parse header to get target locale
    const header = this.parseCsvLine(lines[0]);
    if (header.length >= 4) {
      targetLocale = header[3];
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [namespace, key, source, target] = this.parseCsvLine(line);

      if (namespace && key && target) {
        if (!translations[namespace]) {
          translations[namespace] = {};
        }
        translations[namespace][key] = target;
      }
    }

    return { locale: targetLocale, translations };
  }

  /**
   * Parse a CSV line
   */
  parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Parse XLIFF content
   */
  parseXliff(content) {
    const translations = {};
    let targetLocale = null;

    // Extract target language
    const langMatch = content.match(/target-language="([^"]+)"/);
    if (langMatch) {
      targetLocale = langMatch[1];
    }

    // Extract trans-units
    const unitRegex = /<trans-unit id="([^"]+)"[^>]*>[\s\S]*?<target[^>]*>([^<]*)<\/target>/g;
    let match;

    while ((match = unitRegex.exec(content)) !== null) {
      const [, id, target] = match;
      const [namespace, ...keyParts] = id.split(':');
      const key = keyParts.join(':');

      if (namespace && key && target) {
        if (!translations[namespace]) {
          translations[namespace] = {};
        }
        translations[namespace][key] = this.unescapeXml(target);
      }
    }

    return { locale: targetLocale, translations };
  }

  /**
   * Unescape XML entities
   */
  unescapeXml(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  /**
   * Parse PO content
   */
  parsePo(content) {
    const translations = {};
    let targetLocale = null;

    // Extract language
    const langMatch = content.match(/"Language:\s*([^\\]+)\\n"/);
    if (langMatch) {
      targetLocale = langMatch[1];
    }

    // Extract msgid/msgstr pairs
    const entryRegex = /#:\s*([^\n]+)\nmsgid "([^"]*)"\nmsgstr "([^"]*)"/g;
    let match;

    while ((match = entryRegex.exec(content)) !== null) {
      const [, comment, msgid, msgstr] = match;
      const [namespace, key] = comment.split(':');

      if (namespace && key && msgstr) {
        if (!translations[namespace]) {
          translations[namespace] = {};
        }
        translations[namespace][key] = this.unescapePo(msgstr);
      }
    }

    return { locale: targetLocale, translations };
  }

  /**
   * Unescape PO string
   */
  unescapePo(str) {
    return str.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  /**
   * Parse flat JSON content
   */
  parseJson(content) {
    const data = JSON.parse(content);
    const translations = {};
    const targetLocale = data.metadata?.targetLocale;

    if (data.translations) {
      for (const [fullKey, value] of Object.entries(data.translations)) {
        const [namespace, ...keyParts] = fullKey.split(':');
        const key = keyParts.join(':');
        const target = typeof value === 'object' ? value.target : value;

        if (namespace && key && target) {
          if (!translations[namespace]) {
            translations[namespace] = {};
          }
          translations[namespace][key] = target;
        }
      }
    }

    return { locale: targetLocale, translations };
  }

  /**
   * Parse file based on format
   */
  parseFile(filePath, format) {
    const content = fs.readFileSync(filePath, 'utf-8');

    switch (format) {
      case 'csv':
        return this.parseCsv(content);
      case 'xliff':
        return this.parseXliff(content);
      case 'po':
        return this.parsePo(content);
      case 'json':
        return this.parseJson(content);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert flat keys to nested object
   */
  unflattenObject(flat) {
    const result = {};

    for (const [key, value] of Object.entries(flat)) {
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
   * Merge imported translations with existing
   */
  mergeTranslations(existing, imported) {
    const merged = { ...existing };

    for (const [key, value] of Object.entries(imported)) {
      if (config.overwrite || !merged[key]) {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Save translations to files
   */
  saveTranslations(locale, translations) {
    const localeDir = path.join(config.localesDir, locale);

    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    for (const [namespace, keys] of Object.entries(translations)) {
      const filePath = path.join(localeDir, `${namespace}.json`);

      // Load existing if present
      let existing = {};
      if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }

      // Unflatten imported keys
      const unflattened = this.unflattenObject(keys);

      // Deep merge
      const merged = this.deepMerge(existing, unflattened);

      // Save
      if (!config.dryRun) {
        fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + '\n');
      }

      const keyCount = Object.keys(keys).length;
      log.success(`${locale}/${namespace}.json: ${keyCount} keys`);
      this.stats.imported += keyCount;
    }
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key] || {}, value);
      } else if (config.overwrite || !result[key]) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Import translations from file
   */
  import(filePath, options = {}) {
    log.info('Starting translation import...');
    console.log('');

    // Detect or use specified format
    const format = options.format || this.detectFormat(filePath);
    if (!format) {
      log.error(`Cannot detect format for: ${filePath}`);
      return false;
    }

    log.info(`File: ${filePath}`);
    log.info(`Format: ${format}`);

    if (config.dryRun) {
      log.warning('DRY RUN - no files will be modified');
    }

    console.log('');

    try {
      // Parse file
      const { locale, translations } = this.parseFile(filePath, format);

      if (!locale) {
        log.error('Could not determine target locale from file');
        return false;
      }

      log.info(`Target locale: ${locale}`);
      log.info(`Namespaces: ${Object.keys(translations).join(', ')}`);
      console.log('');

      // Save translations
      this.saveTranslations(locale, translations);

      console.log('');
      this.printSummary();

      return true;
    } catch (error) {
      log.error(`Import failed: ${error.message}`);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}              Import Summary                   ${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log('');
    console.log(`  Keys imported: ${this.stats.imported}`);
    console.log(`  Keys skipped:  ${this.stats.skipped}`);
    console.log(`  Errors:        ${this.stats.errors}`);
    console.log('');

    if (config.dryRun) {
      log.warning('DRY RUN - no changes were made');
    } else if (this.stats.errors === 0) {
      log.success('Import completed successfully!');
    } else {
      log.warning('Import completed with errors');
    }
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    format: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--format':
        options.format = args[++i];
        break;
      case '--no-overwrite':
        config.overwrite = false;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!args[i].startsWith('-') && !options.file) {
          options.file = args[i];
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: node import-translations.js [options] <file>

Options:
  -f, --file <path>      File to import
  --format <format>      File format: csv, xliff, po, json (auto-detected)
  --no-overwrite         Don't overwrite existing translations
  --dry-run              Show what would be imported
  -h, --help             Show this help message

Examples:
  node import-translations.js translations_en.csv
  node import-translations.js --file exports/en.xlf
  node import-translations.js --dry-run translations.json
`);
}

// Main execution
const options = parseArgs();

if (options.help) {
  printHelp();
  process.exit(0);
}

if (!options.file) {
  log.error('No file specified');
  printHelp();
  process.exit(1);
}

const importer = new TranslationImporter();
const success = importer.import(options.file, options);
process.exit(success ? 0 : 1);
