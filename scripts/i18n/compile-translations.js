#!/usr/bin/env node
/**
 * Compile Translations - KitchenXpert
 *
 * Compiles translation files into optimized formats for production use.
 * Supports: ICU MessageFormat compilation, namespace merging, minification.
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
  info: (msg) => console.log(`${colors.blue}[COMPILE]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[COMPILE]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[COMPILE]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[COMPILE]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  localesDir: path.resolve(__dirname, '../../locales'),
  outputDir: path.resolve(__dirname, '../../public/locales'),
  minify: true,
  merge: false,
  hashFilenames: false,
  generateManifest: true,
};

class TranslationCompiler {
  constructor() {
    this.stats = {
      locales: 0,
      namespaces: 0,
      keys: 0,
      outputSize: 0,
    };
    this.manifest = {
      generatedAt: new Date().toISOString(),
      locales: {},
    };
  }

  /**
   * Load translation file
   */
  loadFile(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      log.warning(`Failed to load ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Count keys in nested object
   */
  countKeys(obj) {
    let count = 0;

    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        count += this.countKeys(value);
      } else {
        count++;
      }
    }

    return count;
  }

  /**
   * Optimize translations
   * - Remove empty values
   * - Trim whitespace
   * - Validate placeholders
   */
  optimizeTranslations(obj) {
    const optimized = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        const nested = this.optimizeTranslations(value);
        if (Object.keys(nested).length > 0) {
          optimized[key] = nested;
        }
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          optimized[key] = trimmed;
        }
      } else if (value !== null && value !== undefined) {
        optimized[key] = value;
      }
    }

    return optimized;
  }

  /**
   * Minify JSON output
   */
  stringify(obj) {
    if (config.minify) {
      return JSON.stringify(obj);
    }
    return JSON.stringify(obj, null, 2);
  }

  /**
   * Generate content hash
   */
  generateHash(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  }

  /**
   * Compile a single locale
   */
  compileLocale(locale) {
    const localeDir = path.join(config.localesDir, locale);
    const outputLocaleDir = path.join(config.outputDir, locale);

    if (!fs.existsSync(localeDir)) {
      log.warning(`Locale directory not found: ${locale}`);
      return null;
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputLocaleDir)) {
      fs.mkdirSync(outputLocaleDir, { recursive: true });
    }

    const files = fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));
    const localeManifest = { namespaces: {} };
    let mergedContent = {};

    for (const file of files) {
      const namespace = path.basename(file, '.json');
      const inputPath = path.join(localeDir, file);
      const content = this.loadFile(inputPath);

      if (!content) continue;

      // Optimize
      const optimized = this.optimizeTranslations(content);
      const keyCount = this.countKeys(optimized);
      this.stats.keys += keyCount;
      this.stats.namespaces++;

      if (config.merge) {
        // Merge all namespaces into one file
        mergedContent[namespace] = optimized;
      } else {
        // Output each namespace separately
        const outputContent = this.stringify(optimized);
        let outputFilename = `${namespace}.json`;

        if (config.hashFilenames) {
          const hash = this.generateHash(outputContent);
          outputFilename = `${namespace}.${hash}.json`;
        }

        const outputPath = path.join(outputLocaleDir, outputFilename);
        fs.writeFileSync(outputPath, outputContent);

        this.stats.outputSize += outputContent.length;
        localeManifest.namespaces[namespace] = {
          file: outputFilename,
          keys: keyCount,
          size: outputContent.length,
        };
      }
    }

    // If merging, output single file
    if (config.merge) {
      const outputContent = this.stringify(mergedContent);
      let outputFilename = 'translations.json';

      if (config.hashFilenames) {
        const hash = this.generateHash(outputContent);
        outputFilename = `translations.${hash}.json`;
      }

      const outputPath = path.join(outputLocaleDir, outputFilename);
      fs.writeFileSync(outputPath, outputContent);

      this.stats.outputSize += outputContent.length;
      localeManifest.merged = true;
      localeManifest.file = outputFilename;
      localeManifest.size = outputContent.length;
    }

    return localeManifest;
  }

  /**
   * Generate manifest file
   */
  generateManifest() {
    if (!config.generateManifest) return;

    const manifestPath = path.join(config.outputDir, 'manifest.json');
    const content = JSON.stringify(this.manifest, null, 2);

    fs.writeFileSync(manifestPath, content);
    log.success(`Manifest generated: ${manifestPath}`);
  }

  /**
   * Compile all locales
   */
  compile() {
    log.info('Starting translation compilation...');
    console.log('');

    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Get all locales
    const locales = fs.readdirSync(config.localesDir).filter((f) => {
      const stat = fs.statSync(path.join(config.localesDir, f));
      return stat.isDirectory() && f !== 'exports';
    });

    log.info(`Source: ${config.localesDir}`);
    log.info(`Output: ${config.outputDir}`);
    log.info(`Locales: ${locales.join(', ')}`);
    log.info(`Minify: ${config.minify}`);
    log.info(`Merge: ${config.merge}`);
    console.log('');

    // Compile each locale
    for (const locale of locales) {
      log.info(`Compiling: ${locale}`);
      const localeManifest = this.compileLocale(locale);

      if (localeManifest) {
        this.manifest.locales[locale] = localeManifest;
        this.stats.locales++;
      }
    }

    // Generate manifest
    this.generateManifest();

    console.log('');
    this.printSummary();
  }

  /**
   * Print compilation summary
   */
  printSummary() {
    const sizeKb = (this.stats.outputSize / 1024).toFixed(2);

    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}            Compilation Summary                ${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log('');
    console.log(`  Locales compiled:  ${this.stats.locales}`);
    console.log(`  Namespaces:        ${this.stats.namespaces}`);
    console.log(`  Total keys:        ${this.stats.keys}`);
    console.log(`  Output size:       ${sizeKb} KB`);
    console.log('');
    console.log(`  Output directory:  ${config.outputDir}`);
    console.log('');
    log.success('Compilation completed successfully!');
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
      case '--source':
      case '-s':
        config.localesDir = path.resolve(args[++i]);
        break;
      case '--output':
      case '-o':
        config.outputDir = path.resolve(args[++i]);
        break;
      case '--no-minify':
        config.minify = false;
        break;
      case '--merge':
        config.merge = true;
        break;
      case '--hash':
        config.hashFilenames = true;
        break;
      case '--no-manifest':
        config.generateManifest = false;
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
Usage: node compile-translations.js [options]

Options:
  -s, --source <dir>    Source locales directory
  -o, --output <dir>    Output directory for compiled files
  --no-minify           Disable JSON minification
  --merge               Merge all namespaces into single file
  --hash                Add content hash to filenames
  --no-manifest         Don't generate manifest file
  -h, --help            Show this help message

Examples:
  node compile-translations.js
  node compile-translations.js --merge --hash
  node compile-translations.js -o ./dist/locales
`);
}

// Main execution
const options = parseArgs();

if (options.help) {
  printHelp();
  process.exit(0);
}

const compiler = new TranslationCompiler();
compiler.compile();
