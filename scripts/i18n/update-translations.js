#!/usr/bin/env node
/**
 * Update Translations - KitchenXpert
 *
 * Interactively update translation values for specific keys or namespaces.
 * Supports batch updates from JSON files.
 */

const fs = require('fs');
const path = require('path');
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

const log = {
  info: (msg) => console.log(`${colors.blue}[UPDATE]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[UPDATE]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[UPDATE]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[UPDATE]${colors.reset} ${msg}`),
};

// Configuration
const config = {
  localesDir: path.resolve(__dirname, '../../locales'),
};

class TranslationUpdater {
  constructor() {
    this.stats = {
      updated: 0,
      added: 0,
      unchanged: 0,
    };
  }

  /**
   * Load translation file
   */
  loadFile(locale, namespace) {
    const filePath = path.join(config.localesDir, locale, `${namespace}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  /**
   * Save translation file
   */
  saveFile(locale, namespace, content) {
    const localeDir = path.join(config.localesDir, locale);

    if (!fs.existsSync(localeDir)) {
      fs.mkdirSync(localeDir, { recursive: true });
    }

    const filePath = path.join(localeDir, `${namespace}.json`);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
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

    const existed = current[parts[parts.length - 1]] !== undefined;
    current[parts[parts.length - 1]] = value;

    return existed;
  }

  /**
   * Update a single translation
   */
  updateKey(locale, namespace, key, value) {
    let content = this.loadFile(locale, namespace) || {};

    const oldValue = this.getValue(content, key);
    const existed = this.setValue(content, key, value);

    this.saveFile(locale, namespace, content);

    if (!existed) {
      this.stats.added++;
      return 'added';
    } else if (oldValue !== value) {
      this.stats.updated++;
      return 'updated';
    } else {
      this.stats.unchanged++;
      return 'unchanged';
    }
  }

  /**
   * Batch update from JSON file
   */
  batchUpdate(updateFile) {
    const updates = JSON.parse(fs.readFileSync(updateFile, 'utf-8'));

    log.info(`Processing batch update from: ${updateFile}`);
    console.log('');

    for (const [locale, namespaces] of Object.entries(updates)) {
      log.info(`Updating locale: ${locale}`);

      for (const [namespace, keys] of Object.entries(namespaces)) {
        for (const [key, value] of Object.entries(keys)) {
          const result = this.updateKey(locale, namespace, key, value);
          console.log(`  ${namespace}:${key} - ${result}`);
        }
      }
    }
  }

  /**
   * Interactive update mode
   */
  async interactiveUpdate(locale, namespace) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt) =>
      new Promise((resolve) => rl.question(prompt, resolve));

    log.info(`Interactive update mode`);
    log.info(`Locale: ${locale}, Namespace: ${namespace}`);
    console.log('');
    console.log('Enter translations (empty line to finish):');
    console.log('Format: key = value');
    console.log('');

    let content = this.loadFile(locale, namespace) || {};

    while (true) {
      const input = await question(`${colors.cyan}>${colors.reset} `);

      if (!input.trim()) {
        break;
      }

      const match = input.match(/^([^=]+)\s*=\s*(.*)$/);
      if (!match) {
        log.warning('Invalid format. Use: key = value');
        continue;
      }

      const [, key, value] = match;
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();

      const existed = this.setValue(content, trimmedKey, trimmedValue);

      if (existed) {
        log.success(`Updated: ${trimmedKey}`);
        this.stats.updated++;
      } else {
        log.success(`Added: ${trimmedKey}`);
        this.stats.added++;
      }
    }

    // Save changes
    this.saveFile(locale, namespace, content);

    rl.close();
    console.log('');
    this.printSummary();
  }

  /**
   * Find and replace across all translations
   */
  findAndReplace(search, replace, options = {}) {
    const { locale, namespace, regex = false, dryRun = false } = options;

    log.info(`Finding and replacing translations...`);
    log.info(`Search: "${search}"`);
    log.info(`Replace: "${replace}"`);

    if (dryRun) {
      log.warning('DRY RUN - no changes will be made');
    }

    console.log('');

    const searchPattern = regex ? new RegExp(search, 'g') : search;
    const locales = locale
      ? [locale]
      : fs.readdirSync(config.localesDir).filter((f) => {
          const stat = fs.statSync(path.join(config.localesDir, f));
          return stat.isDirectory();
        });

    let totalMatches = 0;

    for (const loc of locales) {
      const localeDir = path.join(config.localesDir, loc);
      const namespaces = namespace
        ? [`${namespace}.json`]
        : fs.readdirSync(localeDir).filter((f) => f.endsWith('.json'));

      for (const nsFile of namespaces) {
        const ns = path.basename(nsFile, '.json');
        let content = this.loadFile(loc, ns);

        if (!content) continue;

        const matches = this.replaceInObject(content, searchPattern, replace);

        if (matches > 0) {
          log.info(`${loc}/${ns}: ${matches} replacement(s)`);
          totalMatches += matches;

          if (!dryRun) {
            this.saveFile(loc, ns, content);
          }
        }
      }
    }

    console.log('');
    log.success(`Total replacements: ${totalMatches}`);
    this.stats.updated = totalMatches;
  }

  /**
   * Recursively replace in object
   */
  replaceInObject(obj, search, replace) {
    let matches = 0;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const newValue = value.replace(search, replace);
        if (newValue !== value) {
          obj[key] = newValue;
          matches++;
        }
      } else if (typeof value === 'object' && value !== null) {
        matches += this.replaceInObject(value, search, replace);
      }
    }

    return matches;
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}              Update Summary                   ${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log('');
    console.log(`  Added:     ${this.stats.added}`);
    console.log(`  Updated:   ${this.stats.updated}`);
    console.log(`  Unchanged: ${this.stats.unchanged}`);
    console.log('');
    log.success('Update completed!');
  }
}

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    mode: 'interactive',
    locale: null,
    namespace: null,
    key: null,
    value: null,
    file: null,
    search: null,
    replace: null,
    regex: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--locale':
      case '-l':
        options.locale = args[++i];
        break;
      case '--namespace':
      case '-n':
        options.namespace = args[++i];
        break;
      case '--key':
      case '-k':
        options.key = args[++i];
        break;
      case '--value':
      case '-v':
        options.value = args[++i];
        break;
      case '--file':
      case '-f':
        options.file = args[++i];
        options.mode = 'batch';
        break;
      case '--search':
        options.search = args[++i];
        options.mode = 'replace';
        break;
      case '--replace':
        options.replace = args[++i];
        break;
      case '--regex':
        options.regex = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  // Determine mode
  if (options.key && options.value) {
    options.mode = 'single';
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: node update-translations.js [options]

Modes:
  Interactive:  Update translations interactively
  Single:       Update a single key
  Batch:        Update from a JSON file
  Replace:      Find and replace across translations

Options:
  -l, --locale <locale>     Target locale
  -n, --namespace <ns>      Target namespace
  -k, --key <key>           Key to update (single mode)
  -v, --value <value>       New value (single mode)
  -f, --file <path>         Batch update file (JSON)
  --search <term>           Search term for replace mode
  --replace <term>          Replacement term
  --regex                   Use regex for search
  --dry-run                 Show what would change
  -h, --help                Show this help message

Examples:
  node update-translations.js -l en -n common
  node update-translations.js -l en -n common -k buttons.submit -v "Submit"
  node update-translations.js --file updates.json
  node update-translations.js --search "old text" --replace "new text"
`);
}

// Main execution
async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const updater = new TranslationUpdater();

  switch (options.mode) {
    case 'single':
      if (!options.locale || !options.namespace) {
        log.error('Locale and namespace are required for single update');
        process.exit(1);
      }
      const result = updater.updateKey(
        options.locale,
        options.namespace,
        options.key,
        options.value
      );
      log.success(`Key ${result}: ${options.key}`);
      break;

    case 'batch':
      if (!options.file) {
        log.error('File is required for batch update');
        process.exit(1);
      }
      updater.batchUpdate(options.file);
      updater.printSummary();
      break;

    case 'replace':
      if (!options.search || options.replace === null) {
        log.error('Search and replace terms are required');
        process.exit(1);
      }
      updater.findAndReplace(options.search, options.replace, options);
      break;

    case 'interactive':
    default:
      if (!options.locale || !options.namespace) {
        log.error('Locale and namespace are required for interactive mode');
        printHelp();
        process.exit(1);
      }
      await updater.interactiveUpdate(options.locale, options.namespace);
      break;
  }
}

main().catch((error) => {
  log.error(`Error: ${error.message}`);
  process.exit(1);
});
