/**
 * ESLint Configuration for KitchenXpert
 *
 * Purpose:
 * - Enforces TypeScript/JavaScript code quality and consistency
 * - Ensures React best practices and hooks rules
 * - Maintains consistent import ordering and accessibility standards
 *
 * Usage:
 * - Automatically used by editors with ESLint extension
 * - Run manually: npx eslint . --ext .ts,.tsx,.js,.jsx
 * - Fix auto-fixable issues: npx eslint . --ext .ts,.tsx,.js,.jsx --fix
 *
 * @see https://eslint.org/docs/latest/user-guide/configuring
 */

module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },

  env: {
    browser: true,
    node: true,
    es2024: true,
    jest: true,
  },

  settings: {
    react: {
      version: 'detect', // Automatically detect React version
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
  },

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'prettier', // Must be last to override other configs
  ],

  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'import',
  ],

  rules: {
    // ============================================================
    // TypeScript Rules
    // ============================================================

    // Enforce consistent type imports for better tree-shaking
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],

    // Enforce consistent type exports
    '@typescript-eslint/consistent-type-exports': [
      'error',
      {
        fixMixedExportsWithInlineTypeSpecifier: true,
      },
    ],

    // Allow unused vars if they start with underscore (convention)
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    // Prefer nullish coalescing over logical OR for default values
    '@typescript-eslint/prefer-nullish-coalescing': 'error',

    // Prefer optional chaining over manual checks
    '@typescript-eslint/prefer-optional-chain': 'error',

    // Enforce explicit return types on functions for clarity
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],

    // Naming conventions for better code readability
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false, // Don't prefix interfaces with 'I'
        },
      },
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow',
      },
    ],

    // Prevent any type usage except where explicitly allowed
    '@typescript-eslint/no-explicit-any': [
      'error',
      {
        ignoreRestArgs: true,
      },
    ],

    // Prevent floating promises (must be awaited or handled)
    '@typescript-eslint/no-floating-promises': 'error',

    // Prevent misused promises (e.g., in conditionals)
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: false, // Allow promises in event handlers
      },
    ],

    // ============================================================
    // React Rules
    // ============================================================

    // Enforce consistent React component definition
    'react/function-component-definition': [
      'error',
      {
        namedComponents: 'arrow-function',
        unnamedComponents: 'arrow-function',
      },
    ],

    // Allow JSX in .tsx files
    'react/jsx-filename-extension': [
      'error',
      {
        extensions: ['.jsx', '.tsx'],
      },
    ],

    // Disable prop-types (we use TypeScript)
    'react/prop-types': 'off',
    'react/require-default-props': 'off',

    // Enforce self-closing for components without children
    'react/self-closing-comp': 'error',

    // Enforce consistent JSX props indentation
    'react/jsx-props-no-spreading': [
      'warn',
      {
        custom: 'ignore', // Allow spreading in custom components
      },
    ],

    // Prevent missing React import (not needed in React 17+)
    'react/react-in-jsx-scope': 'off',

    // Enforce hook dependencies
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Enforce button type attribute for accessibility
    'react/button-has-type': 'error',

    // Prevent usage of dangerous props
    'react/no-danger': 'error',

    // Enforce consistent boolean prop naming
    'react/jsx-boolean-value': ['error', 'never'],

    // ============================================================
    // Import Rules
    // ============================================================

    // Enforce consistent import order
    'import/order': [
      'error',
      {
        groups: [
          'builtin',   // Node.js built-in modules
          'external',  // npm packages
          'internal',  // Aliased modules
          'parent',    // Parent imports
          'sibling',   // Sibling imports
          'index',     // Index imports
          'object',    // Object imports
          'type',      // Type imports
        ],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // Prevent duplicate imports
    'import/no-duplicates': 'error',

    // Enforce file extensions for imports (except TS/JS)
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],

    // Prevent circular dependencies
    'import/no-cycle': 'error',

    // Prefer default export for single exports
    'import/prefer-default-export': 'off', // Disabled for better tree-shaking

    // Prevent importing from dev dependencies in production code
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/test/**',
          '**/tests/**',
          '**/__tests__/**',
          '**/jest.config.js',
          '**/webpack.config.js',
        ],
      },
    ],

    // ============================================================
    // Accessibility Rules (jsx-a11y)
    // ============================================================

    // Enforce alt text on images
    'jsx-a11y/alt-text': 'error',

    // Enforce anchor elements have content
    'jsx-a11y/anchor-has-content': 'error',

    // Enforce anchor elements are valid
    'jsx-a11y/anchor-is-valid': 'error',

    // Enforce click handler has keyboard event
    'jsx-a11y/click-events-have-key-events': 'warn',

    // Enforce heading elements have content
    'jsx-a11y/heading-has-content': 'error',

    // Enforce lang attribute on html element
    'jsx-a11y/html-has-lang': 'error',

    // Enforce label elements have associated control
    'jsx-a11y/label-has-associated-control': 'error',

    // ============================================================
    // General JavaScript Rules
    // ============================================================

    // Enforce consistent function declarations
    'func-style': [
      'error',
      'expression',
      {
        allowArrowFunctions: true,
      },
    ],

    // Prefer const over let when variable is not reassigned
    'prefer-const': 'error',

    // Prevent var usage (use let/const)
    'no-var': 'error',

    // Enforce consistent console usage (warn for console logs)
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],

    // Prevent debugger statements in production
    'no-debugger': 'error',

    // Prevent alert, confirm, prompt
    'no-alert': 'error',

    // Enforce use of template literals over string concatenation
    'prefer-template': 'error',

    // Enforce consistent arrow function syntax
    'arrow-body-style': ['error', 'as-needed'],

    // Enforce consistent object shorthand
    'object-shorthand': ['error', 'always'],

    // Prevent unnecessary else after return
    'no-else-return': 'error',

    // Prevent nested ternary expressions
    'no-nested-ternary': 'warn',

    // Enforce consistent parameter properties
    'no-param-reassign': [
      'error',
      {
        props: true,
        ignorePropertyModificationsFor: [
          'state', // For Redux/Immer
          'draft', // For Immer
        ],
      },
    ],

    // Maximum line length (handled by Prettier)
    'max-len': [
      'warn',
      {
        code: 100,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],

    // Complexity rules for maintainability
    complexity: ['warn', 15],
    'max-depth': ['warn', 4],
    'max-nested-callbacks': ['warn', 3],
    'max-params': ['warn', 5],
  },

  // ============================================================
  // Override rules for specific file patterns
  // ============================================================
  overrides: [
    // Test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        // Allow any type in tests
        '@typescript-eslint/no-explicit-any': 'off',
        // Allow non-null assertions in tests
        '@typescript-eslint/no-non-null-assertion': 'off',
        // Allow empty functions in mocks
        '@typescript-eslint/no-empty-function': 'off',
        // Allow require in tests
        '@typescript-eslint/no-var-requires': 'off',
      },
    },

    // Config files
    {
      files: ['*.config.js', '*.config.ts', '.eslintrc.js'],
      rules: {
        // Allow require in config files
        '@typescript-eslint/no-var-requires': 'off',
        // Allow dev dependencies
        'import/no-extraneous-dependencies': 'off',
      },
    },

    // JavaScript files (no TypeScript rules)
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },

    // Stories files (Storybook)
    {
      files: ['*.stories.tsx', '*.stories.ts'],
      rules: {
        // Allow default exports in stories
        'import/no-default-export': 'off',
        // Allow any in story args
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],

  // ============================================================
  // Ignored patterns
  // ============================================================
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'public/',
    '.next/',
    'out/',
    '*.config.js',
  ],
};

// TODO: Consider adding these plugins for additional checks:
// - eslint-plugin-security (security best practices)
// - eslint-plugin-promise (promise best practices)
// - eslint-plugin-unicorn (additional code quality rules)
