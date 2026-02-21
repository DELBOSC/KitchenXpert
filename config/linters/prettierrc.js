/**
 * Prettier Configuration for KitchenXpert
 *
 * Purpose:
 * - Enforces consistent code formatting across the entire codebase
 * - Automatically formats code on save (with editor integration)
 * - Works in conjunction with ESLint (via eslint-config-prettier)
 *
 * Usage:
 * - Automatically used by editors with Prettier extension
 * - Format all files: npx prettier --write .
 * - Check formatting: npx prettier --check .
 * - Format specific file: npx prettier --write path/to/file.ts
 *
 * Philosophy:
 * - Opinionated formatting to eliminate style debates
 * - Focus on code readability and consistency
 * - Minimal configuration for maximum compatibility
 *
 * @see https://prettier.io/docs/en/options.html
 */

module.exports = {
  // ============================================================
  // Line Configuration
  // ============================================================

  /**
   * Maximum line length before wrapping
   * - Matches ESLint max-len for consistency
   * - Balance between readability and horizontal scrolling
   */
  printWidth: 100,

  /**
   * Number of spaces per indentation level
   * - Industry standard for JavaScript/TypeScript
   * - Better for nested structures (JSX, objects)
   */
  tabWidth: 2,

  /**
   * Use spaces instead of tabs
   * - Consistent rendering across all editors
   * - Better for diffs and version control
   */
  useTabs: false,

  // ============================================================
  // Semicolons and Quotes
  // ============================================================

  /**
   * Add semicolons at the end of statements
   * - Prevents ASI (Automatic Semicolon Insertion) issues
   * - More explicit and safer for minification
   * - Aligns with TypeScript conventions
   */
  semi: true,

  /**
   * Use single quotes instead of double quotes
   * - Less visual noise
   * - Consistent with most JavaScript style guides
   * - Exception: JSX uses double quotes (see jsxSingleQuote)
   */
  singleQuote: true,

  /**
   * Use double quotes in JSX
   * - Follows HTML/XML convention
   * - Makes JSX attributes visually distinct from JavaScript strings
   */
  jsxSingleQuote: false,

  /**
   * Quote object properties only when necessary
   * - Cleaner code when keys are valid identifiers
   * - Only quotes when needed (e.g., "kebab-case", reserved words)
   */
  quoteProps: 'as-needed',

  // ============================================================
  // Trailing Commas
  // ============================================================

  /**
   * Add trailing commas where valid in ES5 (objects, arrays)
   * - Cleaner git diffs (only changed line shows)
   * - Prevents forgotten commas when adding new items
   * - Safer for refactoring and code movement
   *
   * Options:
   * - 'none': No trailing commas
   * - 'es5': Trailing commas in objects and arrays
   * - 'all': Trailing commas everywhere possible (including function params)
   */
  trailingComma: 'es5',

  // ============================================================
  // Spacing
  // ============================================================

  /**
   * Add spaces inside object literals
   * - { foo: bar } instead of {foo: bar}
   * - Better readability for object destructuring
   */
  bracketSpacing: true,

  /**
   * Put > of multi-line JSX on the last line
   * - false: More compact, saves vertical space
   * - Consistent with React/JSX conventions
   */
  bracketSameLine: false,

  // ============================================================
  // Arrow Functions
  // ============================================================

  /**
   * Omit parentheses when possible in arrow functions
   * - x => x instead of (x) => x
   * - Cleaner for simple callbacks
   * - Less visual clutter
   *
   * Options:
   * - 'always': Always include parens (a) => a
   * - 'avoid': Omit when possible x => x
   */
  arrowParens: 'avoid',

  // ============================================================
  // Line Endings
  // ============================================================

  /**
   * Use LF (\n) for line endings
   * - Unix/Mac standard
   * - Consistent across platforms
   * - Better for version control (prevents CRLF issues)
   * - Git should be configured with core.autocrlf=input
   */
  endOfLine: 'lf',

  // ============================================================
  // Prose and Markdown
  // ============================================================

  /**
   * Wrap prose (markdown, etc.) at printWidth
   * - 'always': Wrap at printWidth
   * - 'never': Don't wrap
   * - 'preserve': Keep as-is
   */
  proseWrap: 'preserve',

  // ============================================================
  // HTML Whitespace
  // ============================================================

  /**
   * Respect whitespace sensitivity in HTML/JSX
   * - 'css': Respect CSS display property
   * - 'strict': All whitespace is significant
   * - 'ignore': All whitespace is insignificant
   */
  htmlWhitespaceSensitivity: 'css',

  // ============================================================
  // Vue and Other Frameworks
  // ============================================================

  /**
   * Indent script and style tags in Vue files
   * - Consistent with Vue SFC conventions
   */
  vueIndentScriptAndStyle: false,

  // ============================================================
  // Embedded Languages
  // ============================================================

  /**
   * Format code inside template literals if it's tagged
   * - Auto-format SQL, GraphQL, HTML in tagged templates
   */
  embeddedLanguageFormatting: 'auto',

  // ============================================================
  // Special Cases
  // ============================================================

  /**
   * Whether to add a trailing newline at end of file
   * - Some editors add this automatically
   * - Keeps consistent with EditorConfig
   */
  insertPragma: false,

  /**
   * Only format files with @prettier or @format pragma comment
   * - false: Format all files
   * - Useful for gradual adoption in large codebases
   */
  requirePragma: false,

  // ============================================================
  // File-Specific Overrides
  // ============================================================

  overrides: [
    // JSON files
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },

    // Markdown files
    {
      files: '*.md',
      options: {
        proseWrap: 'always',
        printWidth: 80,
      },
    },

    // YAML files
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },

    // Package.json
    {
      files: 'package.json',
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },

    // HTML files
    {
      files: '*.html',
      options: {
        printWidth: 120,
      },
    },

    // CSS/SCSS files
    {
      files: ['*.css', '*.scss', '*.sass'],
      options: {
        singleQuote: false, // CSS typically uses double quotes
      },
    },

    // SVG files (don't format to avoid breaking)
    {
      files: '*.svg',
      options: {
        parser: 'html',
      },
    },
  ],
};

// ============================================================
// Integration Notes
// ============================================================

/**
 * Editor Integration:
 *
 * VSCode (.vscode/settings.json):
 * {
 *   "editor.defaultFormatter": "esbenp.prettier-vscode",
 *   "editor.formatOnSave": true,
 *   "editor.codeActionsOnSave": {
 *     "source.fixAll.eslint": true
 *   }
 * }
 *
 * WebStorm/IntelliJ:
 * - Settings > Languages & Frameworks > JavaScript > Prettier
 * - Check "On save"
 * - Check "On code reformat"
 *
 * Pre-commit Hook (Husky):
 * - Install: npx husky-init && npm install
 * - Add to .husky/pre-commit:
 *   npx lint-staged
 *
 * lint-staged config (package.json):
 * {
 *   "lint-staged": {
 *     "*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --fix"],
 *     "*.{json,md,yml,yaml,css,scss}": ["prettier --write"]
 *   }
 * }
 */

/**
 * Troubleshooting:
 *
 * Conflict with ESLint:
 * - Ensure eslint-config-prettier is installed and in extends array
 * - Run: npx eslint-config-prettier path/to/file.js
 *
 * Not formatting on save:
 * - Check editor settings
 * - Verify Prettier extension is installed
 * - Check for .prettierignore file
 *
 * Different formatting in CI:
 * - Ensure same Prettier version locally and in CI
 * - Check for different configs in parent directories
 * - Use npx prettier --check . in CI
 */

// TODO: Consider adding plugins for specific frameworks:
// - prettier-plugin-tailwindcss (for Tailwind CSS class sorting)
// - prettier-plugin-organize-imports (for TypeScript import organization)
// - @trivago/prettier-plugin-sort-imports (advanced import sorting)
