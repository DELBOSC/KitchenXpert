#!/usr/bin/env node
/**
 * Export Translations - KitchenXpert
 *
 * Exports translations to various formats for translation services.
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
  info: (msg) => console.log(`${colors.blue}[EXPORT]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[EXPORT]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[EXPORT]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[EXPORT]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  localesDir: path.resolve(__dirname, '../../locales'),
  outputDir: path.resolve(__dirname, '../../locales/exports'),
  sourceLocale: 'fr',
  format: 'csv',
};

class TranslationExporter {
  constructor() {
    this.translations = {};
  }

  /**
   * Load all translations
   */
  loadTranslations() {
    const locales = fs.readdirSync(config.localesDir).filter((f) => {
      const stat = fs.statSync(path.join(config.localesDir, f));
      return stat.isDirectory() && f !== 'exports';
    });

    for (const locale of locales) {
      this.translations[locale] = {};
      const localeDir = path.join(config.localesDir, locale);
      const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));

      for (const file of files) {
        const namespace = path.basename(file, '.json');
        const content = JSON.parse(
          fs.readFileSync(path.join(localeDir, file), 'utf-8')
        );
        this.translations[locale][namespace] = this.flattenObject(content);
      }
    }

    log.info(`Loaded ${locales.length} locale(s)`);
    return locales;
  }

  /**
   * Flatten nested object
   */
  flattenObject(obj, prefix = '') {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }

    return result;
  }

  /**
   * Export to CSV format
   */
  exportToCsv(targetLocale) {
    const source = this.translations[config.sourceLocale];
    const target = this.translations[targetLocale] || {};

    const rows = [['Namespace', 'Key', config.sourceLocale, targetLocale, 'Notes']];

    for (const namespace of Object.keys(source)) {
      const sourceNs = source[namespace];
      const targetNs = target[namespace] || {};

      for (const key of Object.keys(sourceNs)) {
        const sourceValue = sourceNs[key] || '';
        const targetValue = targetNs[key] || '';
        const notes = targetValue === '' ? 'NEEDS_TRANSLATION' : '';

        rows.push([
          namespace,
          key,
          this.escapeCsvValue(sourceValue),
          this.escapeCsvValue(targetValue),
          notes,
        ]);
      }
    }

    return rows.map((row) => row.join(',')).join('\n');
  }

  /**
   * Escape CSV value
   */
  escapeCsvValue(value) {
    if (typeof value !== 'string') return String(value);
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Export to XLIFF format
   */
  exportToXliff(targetLocale) {
    const source = this.translations[config.sourceLocale];
    const target = this.translations[targetLocale] || {};

    let xliff = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="${config.sourceLocale}" target-language="${targetLocale}" datatype="plaintext" original="kitchenxpert">
    <body>
`;

    for (const namespace of Object.keys(source)) {
      const sourceNs = source[namespace];
      const targetNs = target[namespace] || {};

      for (const key of Object.keys(sourceNs)) {
        const sourceValue = this.escapeXml(sourceNs[key] || '');
        const targetValue = this.escapeXml(targetNs[key] || '');
        const state = targetValue ? 'translated' : 'needs-translation';

        xliff += `      <trans-unit id="${namespace}:${key}">
        <source>${sourceValue}</source>
        <target state="${state}">${targetValue}</target>
        <note>Namespace: ${namespace}</note>
      </trans-unit>
`;
      }
    }

    xliff += `    </body>
  </file>
</xliff>`;

    return xliff;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Export to PO (gettext) format
   */
  exportToPo(targetLocale) {
    const source = this.translations[config.sourceLocale];
    const target = this.translations[targetLocale] || {};

    let po = `# KitchenXpert Translations
# Language: ${targetLocale}
#
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: ${targetLocale}\\n"
"Generated-By: KitchenXpert i18n Export\\n"

`;

    for (const namespace of Object.keys(source)) {
      const sourceNs = source[namespace];
      const targetNs = target[namespace] || {};

      for (const key of Object.keys(sourceNs)) {
        const sourceValue = sourceNs[key] || '';
        const targetValue = targetNs[key] || '';

        po += `#: ${namespace}:${key}
msgid "${this.escapePoString(sourceValue)}"
msgstr "${this.escapePoString(targetValue)}"

`;
      }
    }

    return po;
  }

  /**
   * Escape PO string
   */
  escapePoString(str) {
    if (typeof str !== 'string') return String(str);
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  /**
   * Export to flat JSON format
   */
  exportToFlatJson(targetLocale) {
    const source = this.translations[config.sourceLocale];
    const target = this.translations[targetLocale] || {};

    const result = {
      metadata: {
        sourceLocale: config.sourceLocale,
        targetLocale: targetLocale,
        exportedAt: new Date().toISOString(),
      },
      translations: {},
    };

    for (const namespace of Object.keys(source)) {
      const sourceNs = source[namespace];
      const targetNs = target[namespace] || {};

      for (const key of Object.keys(sourceNs)) {
        const fullKey = `${namespace}:${key}`;
        result.translations[fullKey] = {
          source: sourceNs[key] || '',
          target: targetNs[key] || '',
          needsTranslation: !targetNs[key],
        };
      }
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * Export translations
   */
  export(locale, format) {
    let content;
    let extension;

    switch (format) {
      case 'csv':
        content = this.exportToCsv(locale);
        extension = 'csv';
        break;
      case 'xliff':
        content = this.exportToXliff(locale);
        extension = 'xlf';
        break;
      case 'po':
        content = this.exportToPo(locale);
        extension = 'po';
        break;
      case 'json':
        content = this.exportToFlatJson(locale);
        extension = 'json';
        break;
      default:
        log.error(`Unknown format: ${format}`);
        return null;
    }

    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const filename = `translations_${locale}_${Date.now()}.${extension}`;
    const outputPath = path.join(config.outputDir, filename);

    fs.writeFileSync(outputPath, content);
    log.success(`Exported: ${outputPath}`);

    return outputPath;
  }

  /**
   * Run export
   */
  run(options) {
    log.info('Starting translation export...');
    console.log('');

    const locales = this.loadTranslations();
    const targetLocales = options.locales || locales.filter((l) => l !== config.sourceLocale);
    const format = options.format || config.format;

    log.info(`Source locale: ${config.sourceLocale}`);
    log.info(`Target locales: ${targetLocales.join(', ')}`);
    log.info(`Format: ${format}`);
    console.log('');

    const exported = [];

    for (const locale of targetLocales) {
      const outputPath = this.export(locale, format);
      if (outputPath) {
        exported.push(outputPath);
      }
    }

    console.log('');
    log.success(`Exported ${exported.length} file(s) to ${config.outputDir}`);

    return exported;
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    locales: [],
    format: config.format,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--locales':
      case '-l':
        options.locales = args[++i]?.split(',') || [];
        break;
      case '--format':
      case '-f':
        options.format = args[++i];
        break;
      case '--output':
      case '-o':
        config.outputDir = path.resolve(args[++i]);
        break;
      case '--source':
      case '-s':
        config.sourceLocale = args[++i];
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
Usage: node export-translations.js [options]

Options:
  -l, --locales <list>   Comma-separated target locales
  -f, --format <format>  Export format: csv, xliff, po, json (default: csv)
  -o, --output <dir>     Output directory
  -s, --source <locale>  Source locale (default: fr)
  -h, --help             Show this help message

Examples:
  node export-translations.js
  node export-translations.js --locales en,de --format xliff
  node export-translations.js -f csv -o ./exports
`);
}

// Main execution
const options = parseArgs();

if (options.help) {
  printHelp();
  process.exit(0);
}

const exporter = new TranslationExporter();
exporter.run(options);
