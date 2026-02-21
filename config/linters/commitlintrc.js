/**
 * Commitlint Configuration for KitchenXpert
 *
 * Purpose:
 * - Enforces consistent commit message format (Conventional Commits)
 * - Enables automated changelog generation
 * - Improves git history readability and searchability
 * - Facilitates semantic versioning
 *
 * Usage:
 * - Automatically runs via Husky pre-commit hook
 * - Test commit message: echo "feat: add new feature" | npx commitlint
 * - Lint last commit: npx commitlint --from HEAD~1
 * - Lint commit range: npx commitlint --from HEAD~5 --to HEAD
 *
 * Conventional Commit Format:
 * <type>[optional scope]: <description>
 *
 * [optional body]
 *
 * [optional footer(s)]
 *
 * Examples:
 * - feat(catalog): add product filtering by category
 * - fix(auth): resolve JWT token expiration issue
 * - docs(readme): update installation instructions
 * - refactor(api)!: change endpoint response structure
 * - chore(deps): upgrade React to v18.3.0
 *
 * @see https://commitlint.js.org/
 * @see https://www.conventionalcommits.org/
 */

module.exports = {
  // ============================================================
  // Base Configuration
  // ============================================================

  /**
   * Extend conventional commit configuration
   * - Provides sensible defaults for type, scope, subject, etc.
   */
  extends: ['@commitlint/config-conventional'],

  // ============================================================
  // Parser Configuration
  // ============================================================

  parserPreset: {
    parserOpts: {
      // Header pattern: type(scope): subject
      headerPattern: /^(\w+)(?:\(([a-z-]+)\))?: (.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],

      // Allow merge commits
      issuePrefixes: ['#', 'KX-'],

      // Reference keywords for automatic issue linking
      referenceActions: [
        'close',
        'closes',
        'closed',
        'fix',
        'fixes',
        'fixed',
        'resolve',
        'resolves',
        'resolved',
      ],

      // Note keywords
      noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],

      // Revert pattern
      revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w+)/i,
      revertCorrespondence: ['header', 'hash'],
    },
  },

  // ============================================================
  // Custom Rules
  // ============================================================

  rules: {
    // ============================================================
    // Type Rules
    // ============================================================

    /**
     * Type must be one of the allowed types
     * - Level: error
     * - Always applicable
     */
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation only changes
        'style',     // Code style (formatting, missing semicolons, etc.)
        'refactor',  // Code change that neither fixes a bug nor adds a feature
        'perf',      // Performance improvement
        'test',      // Adding or updating tests
        'build',     // Changes to build system or dependencies
        'ci',        // Changes to CI configuration files and scripts
        'chore',     // Other changes that don't modify src or test files
        'revert',    // Reverts a previous commit
      ],
    ],

    /**
     * Type must be lowercase
     */
    'type-case': [2, 'always', 'lowercase'],

    /**
     * Type must not be empty
     */
    'type-empty': [2, 'never'],

    // ============================================================
    // Scope Rules
    // ============================================================

    /**
     * Scope is optional but recommended
     * - Helps categorize changes
     */
    'scope-empty': [0, 'never'], // Warning level 0 = disabled

    /**
     * Scope must be lowercase
     */
    'scope-case': [2, 'always', 'lowercase'],

    /**
     * Allowed scopes for KitchenXpert
     * - Organized by application area
     */
    'scope-enum': [
      1, // Warning level
      'always',
      [
        // Frontend modules
        'catalog',      // Product catalog
        'design',       // Kitchen design tool
        'configurator', // 3D configurator
        'cart',         // Shopping cart
        'checkout',     // Checkout process
        'auth',         // Authentication
        'profile',      // User profile
        'dashboard',    // User dashboard
        'ui',           // UI components
        'forms',        // Form components
        'layout',       // Layout components

        // Backend modules
        'api',          // API layer
        'db',           // Database
        'models',       // Data models
        'services',     // Business services
        'middleware',   // Middleware
        'routes',       // Route handlers
        'controllers',  // Controllers
        'validators',   // Validation logic

        // Features
        'ai',           // AI recommendations
        'search',       // Search functionality
        'analytics',    // Analytics
        'payments',     // Payment processing
        'notifications',// Notifications
        'webhooks',     // Webhook system
        'cache',        // Caching
        'queue',        // Job queue

        // Infrastructure
        'config',       // Configuration
        'docker',       // Docker setup
        'nginx',        // Nginx configuration
        'redis',        // Redis
        'postgres',     // PostgreSQL
        'monitoring',   // Monitoring/logging
        'security',     // Security

        // Development
        'deps',         // Dependencies
        'scripts',      // Build scripts
        'tests',        // Testing infrastructure
        'ci',           // CI/CD
        'docs',         // Documentation
        'i18n',         // Internationalization

        // Release
        'release',      // Release process
        'version',      // Versioning
      ],
    ],

    // ============================================================
    // Subject Rules
    // ============================================================

    /**
     * Subject must not be empty
     */
    'subject-empty': [2, 'never'],

    /**
     * Subject must start with lowercase
     */
    'subject-case': [
      2,
      'always',
      'lowercase',
    ],

    /**
     * Subject must not end with a period
     */
    'subject-full-stop': [2, 'never', '.'],

    /**
     * Subject maximum length
     * - Ensures commit messages are concise
     * - Readable in git log --oneline
     */
    'subject-max-length': [2, 'always', 100],

    /**
     * Subject minimum length
     * - Ensures meaningful commit messages
     */
    'subject-min-length': [2, 'always', 10],

    // ============================================================
    // Header Rules
    // ============================================================

    /**
     * Header maximum length
     * - Includes type, scope, and subject
     * - Fits in one line in most terminals
     */
    'header-max-length': [2, 'always', 100],

    /**
     * Header minimum length
     */
    'header-min-length': [2, 'always', 10],

    // ============================================================
    // Body Rules
    // ============================================================

    /**
     * Body must have a leading blank line
     */
    'body-leading-blank': [2, 'always'],

    /**
     * Body maximum line length
     * - Ensures readability
     */
    'body-max-line-length': [2, 'always', 100],

    /**
     * Body case (disabled - allow any case in body)
     */
    'body-case': [0, 'always'],

    // ============================================================
    // Footer Rules
    // ============================================================

    /**
     * Footer must have a leading blank line
     */
    'footer-leading-blank': [2, 'always'],

    /**
     * Footer maximum line length
     */
    'footer-max-line-length': [2, 'always', 100],

    // ============================================================
    // References Rules
    // ============================================================

    /**
     * References (issue numbers) must be in footer
     * - Disabled: Allow references in subject/body
     */
    'references-empty': [0, 'never'],

    // ============================================================
    // Special Rules
    // ============================================================

    /**
     * Allow signed-off-by trailer
     */
    'signed-off-by': [0, 'always'],

    /**
     * Allow merge commits
     */
    'type-max-length': [0],
    'type-min-length': [0],
  },

  // ============================================================
  // Custom Prompts (for interactive mode)
  // ============================================================

  prompt: {
    questions: {
      type: {
        description: "Select the type of change you're committing",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: 'Code style changes (formatting, semicolons, etc.)',
            title: 'Styles',
            emoji: '💎',
          },
          refactor: {
            description: 'Code refactoring (neither fixes a bug nor adds a feature)',
            title: 'Code Refactoring',
            emoji: '📦',
          },
          perf: {
            description: 'Performance improvement',
            title: 'Performance Improvements',
            emoji: '🚀',
          },
          test: {
            description: 'Adding or updating tests',
            title: 'Tests',
            emoji: '🚨',
          },
          build: {
            description: 'Changes to build system or dependencies',
            title: 'Builds',
            emoji: '🛠',
          },
          ci: {
            description: 'Changes to CI configuration',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          chore: {
            description: 'Other changes (e.g., updating .gitignore)',
            title: 'Chores',
            emoji: '♻️',
          },
          revert: {
            description: 'Revert a previous commit',
            title: 'Reverts',
            emoji: '🗑',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g., catalog, api, auth)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change (optional)',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description:
          'A BREAKING CHANGE commit requires a body. Please enter a longer description',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description:
          'If issues are closed, the commit requires a body. Please enter a longer description',
      },
      issues: {
        description: 'Add issue references (e.g., "fix #123", "re #456")',
      },
    },
  },

  // ============================================================
  // Help Messages
  // ============================================================

  helpUrl:
    'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',

  // ============================================================
  // Ignored Commits
  // ============================================================

  /**
   * Ignore commits that match these patterns
   * - Useful for automated commits (e.g., version bumps)
   */
  ignores: [
    // Ignore WIP commits during development
    (commit) => commit.includes('WIP'),
    // Ignore merge commits
    (commit) => commit.startsWith('Merge'),
    // Ignore revert commits
    (commit) => commit.startsWith('Revert'),
  ],
};

/**
 * ============================================================
 * Integration with Husky
 * ============================================================
 *
 * Install Husky and commitlint:
 * npm install --save-dev @commitlint/cli @commitlint/config-conventional husky
 *
 * Initialize Husky:
 * npx husky-init
 *
 * Add commit-msg hook (.husky/commit-msg):
 * #!/bin/sh
 * . "$(dirname "$0")/_/husky.sh"
 *
 * npx --no-install commitlint --edit "$1"
 *
 * Make executable:
 * chmod +x .husky/commit-msg
 */

/**
 * ============================================================
 * Commit Message Examples
 * ============================================================
 *
 * Good Examples:
 *
 * feat(catalog): add product filtering by category
 * - Adds dropdown filter for product categories
 * - Includes search within filtered results
 * - Updates URL with query parameters
 *
 * fix(auth): resolve JWT token expiration issue
 * - Fixes token refresh logic
 * - Adds automatic retry on token expiry
 * - Closes #234
 *
 * docs(readme): update installation instructions
 *
 * refactor(api)!: change endpoint response structure
 *
 * BREAKING CHANGE: The /api/products endpoint now returns
 * an object with 'data' and 'meta' properties instead of
 * a plain array.
 *
 * Migration: Update client code to access products via
 * response.data instead of response directly.
 *
 * perf(design): optimize 3D rendering performance
 * - Implements object pooling for meshes
 * - Reduces draw calls by 40%
 * - Improves FPS from 30 to 60
 *
 * chore(deps): upgrade React to v18.3.0
 *
 * test(cart): add unit tests for discount calculation
 *
 * Bad Examples:
 *
 * ❌ update code (no type, too vague)
 * ❌ Fix bug (type not lowercase, too vague)
 * ❌ feat: Add feature. (ends with period)
 * ❌ feat(CATALOG): add filter (scope not lowercase)
 * ❌ wip (not a valid type)
 */

// TODO: Consider adding custom rules for:
// - Ticket reference requirement (e.g., must include KX-123)
// - Co-authored-by trailer validation
// - Custom footer validation (e.g., Reviewed-by)
