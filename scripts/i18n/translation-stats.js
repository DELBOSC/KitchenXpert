#!/usr/bin/env node
/**
 * Translation Stats - KitchenXpert
 *
 * Generates comprehensive statistics about translation coverage and quality.
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
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[STATS]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[STATS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[STATS]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  localesDir: path.resolve(__dirname, '../../locales'),
  defaultLocale: 'fr',
};

class TranslationStats {
  constructor() {
    this.locales = {};
    this.namespaces = new Set();
    this.totalKeys = 0;
  }

  /**
   * Load translation file
   */
  loadFile(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      return null;
    }
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
        keys.push({ key: fullKey, value, empty: !value || value === '' });
      }
    }

    return keys;
  }

  /**
   * Analyze a single locale
   */
  analyzeLocale(locale) {
    const localeDir = path.join(config.localesDir, locale);

    if (!fs.existsSync(localeDir)) {
      return null;
    }

    const stats = {
      namespaces: {},
      totalKeys: 0,
      translatedKeys: 0,
      emptyKeys: 0,
      averageLength: 0,
      longestKey: null,
      longestValue: null,
    };

    const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));
    let totalLength = 0;
    let maxKeyLength = 0;
    let maxValueLength = 0;

    for (const file of files) {
      const namespace = path.basename(file, '.json');
      this.namespaces.add(namespace);

      const content = this.loadFile(path.join(localeDir, file));
      if (!content) continue;

      const keys = this.getAllKeys(content);
      const translated = keys.filter((k) => !k.empty).length;
      const empty = keys.filter((k) => k.empty).length;

      stats.namespaces[namespace] = {
        total: keys.length,
        translated,
        empty,
        coverage: keys.length > 0 ? ((translated / keys.length) * 100).toFixed(1) : 0,
      };

      stats.totalKeys += keys.length;
      stats.translatedKeys += translated;
      stats.emptyKeys += empty;

      // Analyze key/value lengths
      for (const { key, value } of keys) {
        if (typeof value === 'string') {
          totalLength += value.length;

          if (key.length > maxKeyLength) {
            maxKeyLength = key.length;
            stats.longestKey = { namespace, key, length: key.length };
          }

          if (value.length > maxValueLength) {
            maxValueLength = value.length;
            stats.longestValue = {
              namespace,
              key,
              length: value.length,
              preview: value.slice(0, 50) + (value.length > 50 ? '...' : ''),
            };
          }
        }
      }
    }

    stats.averageLength =
      stats.translatedKeys > 0
        ? Math.round(totalLength / stats.translatedKeys)
        : 0;

    stats.coverage =
      stats.totalKeys > 0
        ? ((stats.translatedKeys / stats.totalKeys) * 100).toFixed(1)
        : 0;

    return stats;
  }

  /**
   * Compare locales for missing translations
   */
  compareLocales(sourceLocale, targetLocale) {
    const sourceDir = path.join(config.localesDir, sourceLocale);
    const targetDir = path.join(config.localesDir, targetLocale);

    const missing = [];
    const extra = [];

    const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const sourceContent = this.loadFile(path.join(sourceDir, file)) || {};
      const targetContent = this.loadFile(path.join(targetDir, file)) || {};

      const sourceKeys = this.getAllKeys(sourceContent).map((k) => k.key);
      const targetKeys = this.getAllKeys(targetContent).map((k) => k.key);

      // Find missing in target
      for (const key of sourceKeys) {
        if (!targetKeys.includes(key)) {
          missing.push({ namespace, key });
        }
      }

      // Find extra in target
      for (const key of targetKeys) {
        if (!sourceKeys.includes(key)) {
          extra.push({ namespace, key });
        }
      }
    }

    return { missing, extra };
  }

  /**
   * Collect all statistics
   */
  collect() {
    log.info('Collecting translation statistics...');
    console.log('');

    const localeNames = fs.readdirSync(config.localesDir).filter((f) => {
      const stat = fs.statSync(path.join(config.localesDir, f));
      return stat.isDirectory() && f !== 'exports';
    });

    for (const locale of localeNames) {
      const stats = this.analyzeLocale(locale);
      if (stats) {
        this.locales[locale] = stats;
        if (locale === config.defaultLocale) {
          this.totalKeys = stats.totalKeys;
        }
      }
    }

    return this;
  }

  /**
   * Print coverage bar
   */
  coverageBar(percentage, width = 30) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    let color = colors.green;
    if (percentage < 50) color = colors.red;
    else if (percentage < 80) color = colors.yellow;

    return `${color}${'█'.repeat(filled)}${colors.reset}${'░'.repeat(empty)} ${percentage}%`;
  }

  /**
   * Print statistics
   */
  print() {
    console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║${colors.reset}                   Translation Statistics                         ${colors.cyan}║${colors.reset}`);
    console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');

    // Overall statistics
    console.log(`${colors.blue}  Overall:${colors.reset}`);
    console.log(`    Locales:     ${Object.keys(this.locales).length}`);
    console.log(`    Namespaces:  ${this.namespaces.size}`);
    console.log(`    Total keys:  ${this.totalKeys}`);
    console.log('');

    // Per-locale statistics
    console.log(`${colors.blue}  Coverage by Locale:${colors.reset}`);
    console.log('');

    const sortedLocales = Object.entries(this.locales).sort((a, b) => {
      if (a[0] === config.defaultLocale) return -1;
      if (b[0] === config.defaultLocale) return 1;
      return parseFloat(b[1].coverage) - parseFloat(a[1].coverage);
    });

    for (const [locale, stats] of sortedLocales) {
      const isDefault = locale === config.defaultLocale;
      const label = isDefault ? `${locale} (default)` : locale;

      console.log(`    ${label.padEnd(15)} ${this.coverageBar(parseFloat(stats.coverage))}`);
      console.log(`                    ${stats.translatedKeys}/${stats.totalKeys} keys, ${stats.emptyKeys} empty`);
      console.log('');
    }

    // Namespace breakdown for default locale
    const defaultStats = this.locales[config.defaultLocale];
    if (defaultStats) {
      console.log(`${colors.blue}  Namespaces (${config.defaultLocale}):${colors.reset}`);
      console.log('');

      for (const [namespace, ns] of Object.entries(defaultStats.namespaces)) {
        console.log(`    ${namespace.padEnd(20)} ${ns.total} keys`);
      }
      console.log('');
    }

    // Missing translations
    console.log(`${colors.blue}  Missing Translations:${colors.reset}`);
    console.log('');

    for (const [locale, stats] of Object.entries(this.locales)) {
      if (locale === config.defaultLocale) continue;

      const { missing } = this.compareLocales(config.defaultLocale, locale);

      if (missing.length > 0) {
        console.log(`    ${locale}: ${missing.length} missing key(s)`);

        // Show first 5 missing
        for (const m of missing.slice(0, 5)) {
          console.log(`      - ${m.namespace}:${m.key}`);
        }

        if (missing.length > 5) {
          console.log(`      ... and ${missing.length - 5} more`);
        }
        console.log('');
      } else {
        console.log(`    ${locale}: ${colors.green}Complete!${colors.reset}`);
      }
    }

    console.log('');
  }

  /**
   * Export statistics to JSON
   */
  exportJson(outputPath) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        locales: Object.keys(this.locales).length,
        namespaces: [...this.namespaces],
        totalKeys: this.totalKeys,
        defaultLocale: config.defaultLocale,
      },
      locales: this.locales,
      comparisons: {},
    };

    // Add comparisons
    for (const locale of Object.keys(this.locales)) {
      if (locale !== config.defaultLocale) {
        report.comparisons[locale] = this.compareLocales(
          config.defaultLocale,
          locale
        );
      }
    }

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    log.success(`Report exported: ${outputPath}`);
  }

  /**
   * Export statistics to Markdown
   */
  exportMarkdown(outputPath) {
    let md = `# Translation Statistics\n\n`;
    md += `Generated: ${new Date().toISOString()}\n\n`;

    md += `## Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Locales | ${Object.keys(this.locales).length} |\n`;
    md += `| Namespaces | ${this.namespaces.size} |\n`;
    md += `| Total Keys | ${this.totalKeys} |\n\n`;

    md += `## Coverage by Locale\n\n`;
    md += `| Locale | Coverage | Translated | Empty |\n`;
    md += `|--------|----------|------------|-------|\n`;

    for (const [locale, stats] of Object.entries(this.locales)) {
      const icon = parseFloat(stats.coverage) >= 90 ? '✅' : parseFloat(stats.coverage) >= 50 ? '⚠️' : '❌';
      md += `| ${locale} | ${icon} ${stats.coverage}% | ${stats.translatedKeys}/${stats.totalKeys} | ${stats.emptyKeys} |\n`;
    }

    md += `\n## Missing Translations\n\n`;

    for (const [locale, stats] of Object.entries(this.locales)) {
      if (locale === config.defaultLocale) continue;

      const { missing } = this.compareLocales(config.defaultLocale, locale);

      md += `### ${locale}\n\n`;

      if (missing.length === 0) {
        md += `✅ Complete!\n\n`;
      } else {
        md += `Missing ${missing.length} key(s):\n\n`;
        for (const m of missing.slice(0, 20)) {
          md += `- \`${m.namespace}:${m.key}\`\n`;
        }
        if (missing.length > 20) {
          md += `\n... and ${missing.length - 20} more\n`;
        }
        md += `\n`;
      }
    }

    fs.writeFileSync(outputPath, md);
    log.success(`Markdown report exported: ${outputPath}`);
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    exportJson: null,
    exportMd: null,
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
      case '--export-json':
        options.exportJson = args[++i];
        break;
      case '--export-md':
        options.exportMd = args[++i];
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
Usage: node translation-stats.js [options]

Options:
  --locales-dir <dir>    Directory containing locale folders
  --default-locale <l>   Default/source locale (default: fr)
  --export-json <file>   Export statistics to JSON file
  --export-md <file>     Export statistics to Markdown file
  -h, --help             Show this help message

Examples:
  node translation-stats.js
  node translation-stats.js --export-json stats.json
  node translation-stats.js --export-md TRANSLATION_STATUS.md
`);
}

// Main execution
const options = parseArgs();

if (options.help) {
  printHelp();
  process.exit(0);
}

const stats = new TranslationStats();
stats.collect();
stats.print();

if (options.exportJson) {
  stats.exportJson(options.exportJson);
}

if (options.exportMd) {
  stats.exportMarkdown(options.exportMd);
}
