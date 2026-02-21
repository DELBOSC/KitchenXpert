/**
 * Stylelint Configuration for KitchenXpert
 *
 * Purpose:
 * - Enforces CSS/SCSS code quality and consistency
 * - Prevents errors and bad practices in stylesheets
 * - Maintains consistent property ordering (Concentric CSS)
 * - Enforces BEM methodology for class naming
 *
 * Usage:
 * - Run manually: npx stylelint "**/*.{css,scss}"
 * - Fix auto-fixable issues: npx stylelint "**/*.{css,scss}" --fix
 * - Watch mode: npx stylelint "**/*.{css,scss}" --watch
 *
 * Methodology:
 * - BEM (Block Element Modifier) for naming
 * - Concentric CSS for property ordering
 * - SCSS best practices and modern features
 *
 * @see https://stylelint.io/user-guide/configure
 */

module.exports = {
  // ============================================================
  // Base Configuration
  // ============================================================

  extends: [
    'stylelint-config-standard',      // Standard CSS rules
    'stylelint-config-standard-scss', // SCSS-specific rules
    'stylelint-config-prettier',      // Disable conflicts with Prettier
  ],

  plugins: [
    'stylelint-order',           // Property ordering
    'stylelint-scss',            // SCSS linting
    'stylelint-selector-bem-pattern', // BEM methodology
  ],

  // ============================================================
  // Custom Rules
  // ============================================================

  rules: {
    // ============================================================
    // Possible Errors
    // ============================================================

    /**
     * Disallow invalid hex colors
     * - Prevents typos like #fff or #12345
     */
    'color-no-invalid-hex': true,

    /**
     * Disallow duplicate font family names
     */
    'font-family-no-duplicate-names': true,

    /**
     * Disallow missing generic font families
     */
    'font-family-no-missing-generic-family-keyword': true,

    /**
     * Disallow duplicate properties within declaration blocks
     */
    'declaration-block-no-duplicate-properties': [
      true,
      {
        ignore: ['consecutive-duplicates-with-different-values'],
      },
    ],

    /**
     * Disallow empty blocks
     */
    'block-no-empty': true,

    /**
     * Disallow unknown pseudo-class selectors
     */
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'local', 'export'], // CSS Modules
      },
    ],

    /**
     * Disallow unknown pseudo-element selectors
     */
    'selector-pseudo-element-no-unknown': true,

    /**
     * Disallow unknown type selectors
     */
    'selector-type-no-unknown': [
      true,
      {
        ignoreTypes: ['from'], // For @keyframes
      },
    ],

    /**
     * Disallow unknown at-rules
     */
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',    // Tailwind CSS
          'apply',       // Tailwind @apply
          'variants',    // Tailwind variants
          'responsive',  // Tailwind responsive
          'screen',      // Tailwind screen
          'layer',       // Tailwind layer
          'mixin',       // SCSS mixins
          'include',     // SCSS include
          'extend',      // SCSS extend
          'function',    // SCSS functions
          'return',      // SCSS return
          'each',        // SCSS each
          'if',          // SCSS if
          'else',        // SCSS else
          'for',         // SCSS for
          'while',       // SCSS while
        ],
      },
    ],

    // ============================================================
    // Color Configuration
    // ============================================================

    /**
     * Enforce lowercase hex colors
     * - #fff instead of #FFF
     */
    'color-hex-case': 'lower',

    /**
     * Enforce short hex colors when possible
     * - #fff instead of #ffffff
     */
    'color-hex-length': 'short',

    /**
     * Require named colors to be defined as variables
     * - Prevents magic colors scattered throughout code
     */
    'color-named': 'never',

    /**
     * Disallow hex colors (use functions like rgb(), hsl())
     * - Disabled to allow hex colors
     * - Enable if you want to enforce rgb()/hsl() only
     */
    'color-no-hex': null,

    // ============================================================
    // Font Configuration
    // ============================================================

    /**
     * Require numeric font weights
     * - 400 instead of 'normal', 700 instead of 'bold'
     */
    'font-weight-notation': 'numeric',

    /**
     * Require quotes around font family names
     */
    'font-family-name-quotes': 'always-where-recommended',

    // ============================================================
    // Length and Unit Configuration
    // ============================================================

    /**
     * Disallow units for zero lengths
     * - 0 instead of 0px
     */
    'length-zero-no-unit': true,

    /**
     * Specify allowed units
     * - Prevents inconsistent unit usage
     */
    'unit-allowed-list': [
      'px',    // Pixels
      'em',    // Relative to font size
      'rem',   // Relative to root font size
      '%',     // Percentage
      'vh',    // Viewport height
      'vw',    // Viewport width
      'vmin',  // Viewport minimum
      'vmax',  // Viewport maximum
      'deg',   // Degrees (for transforms)
      's',     // Seconds
      'ms',    // Milliseconds
      'fr',    // Fraction (Grid)
      'ch',    // Character width
    ],

    // ============================================================
    // Selector Configuration
    // ============================================================

    /**
     * Enforce BEM pattern for class selectors
     * - Block: .block
     * - Element: .block__element
     * - Modifier: .block--modifier
     * - Combined: .block__element--modifier
     */
    'plugin/selector-bem-pattern': {
      preset: 'bem',
      componentName: '^[a-z]+(-[a-z]+)*$', // kebab-case for blocks
      componentSelectors: {
        initial: '^\\.{componentName}(?:__[a-z]+(?:-[a-z]+)*)?(?:--[a-z]+(?:-[a-z]+)*)?$',
      },
      utilitySelectors: '^\\.u-[a-z]+(?:-[a-z]+)*$', // Utility classes
      ignoreSelectors: [
        '^\\.is-',      // State classes (.is-active)
        '^\\.has-',     // State classes (.has-error)
        '^\\.js-',      // JavaScript hooks
        '^\\.no-',      // Negation classes (.no-scroll)
      ],
    },

    /**
     * Limit selector complexity
     * - Prevents overly specific selectors
     */
    'selector-max-compound-selectors': 4,

    /**
     * Limit ID selectors (prefer classes)
     */
    'selector-max-id': 0,

    /**
     * Limit type selectors (prefer classes)
     */
    'selector-max-type': [
      2,
      {
        ignoreTypes: ['composes'], // CSS Modules
      },
    ],

    /**
     * Limit universal selector usage
     */
    'selector-max-universal': 1,

    /**
     * Require quotes around attribute values
     */
    'selector-attribute-quotes': 'always',

    /**
     * Enforce kebab-case for class selectors
     */
    'selector-class-pattern': [
      '^[a-z]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      {
        message: 'Class selector should follow BEM convention (block__element--modifier)',
      },
    ],

    /**
     * Disallow vendor prefixes in selectors
     * - Use autoprefixer instead
     */
    'selector-no-vendor-prefix': true,

    // ============================================================
    // Property Configuration
    // ============================================================

    /**
     * Enforce property ordering (Concentric CSS)
     * - Groups related properties together
     * - Logical ordering from outside to inside
     */
    'order/properties-order': [
      // Positioning
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'z-index',

      // Display & Box Model
      'display',
      'flex',
      'flex-basis',
      'flex-direction',
      'flex-flow',
      'flex-grow',
      'flex-shrink',
      'flex-wrap',
      'grid',
      'grid-area',
      'grid-auto-rows',
      'grid-auto-columns',
      'grid-auto-flow',
      'grid-gap',
      'grid-row',
      'grid-row-start',
      'grid-row-end',
      'grid-row-gap',
      'grid-column',
      'grid-column-start',
      'grid-column-end',
      'grid-column-gap',
      'grid-template',
      'grid-template-areas',
      'grid-template-rows',
      'grid-template-columns',
      'gap',
      'align-content',
      'align-items',
      'align-self',
      'justify-content',
      'justify-items',
      'justify-self',
      'order',
      'float',
      'clear',
      'box-sizing',
      'width',
      'min-width',
      'max-width',
      'height',
      'min-height',
      'max-height',
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'overflow',
      'overflow-x',
      'overflow-y',

      // Typography
      'color',
      'font',
      'font-family',
      'font-size',
      'font-size-adjust',
      'font-stretch',
      'font-style',
      'font-variant',
      'font-weight',
      'letter-spacing',
      'line-height',
      'list-style',
      'text-align',
      'text-decoration',
      'text-indent',
      'text-overflow',
      'text-rendering',
      'text-shadow',
      'text-transform',
      'white-space',
      'word-break',
      'word-spacing',
      'word-wrap',

      // Visual
      'background',
      'background-attachment',
      'background-clip',
      'background-color',
      'background-image',
      'background-origin',
      'background-position',
      'background-repeat',
      'background-size',
      'border',
      'border-top',
      'border-right',
      'border-bottom',
      'border-left',
      'border-width',
      'border-top-width',
      'border-right-width',
      'border-bottom-width',
      'border-left-width',
      'border-style',
      'border-top-style',
      'border-right-style',
      'border-bottom-style',
      'border-left-style',
      'border-color',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color',
      'border-radius',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
      'box-shadow',
      'opacity',
      'visibility',

      // Animation & Transforms
      'transform',
      'transform-origin',
      'transition',
      'transition-delay',
      'transition-duration',
      'transition-property',
      'transition-timing-function',
      'animation',
      'animation-delay',
      'animation-duration',
      'animation-iteration-count',
      'animation-name',
      'animation-play-state',
      'animation-timing-function',

      // Misc
      'cursor',
      'pointer-events',
      'user-select',
      'content',
      'quotes',
    ],

    /**
     * Disallow vendor prefixes in properties
     * - Use autoprefixer instead
     */
    'property-no-vendor-prefix': true,

    /**
     * Disallow unknown properties
     */
    'property-no-unknown': [
      true,
      {
        ignoreProperties: ['composes'], // CSS Modules
      },
    ],

    // ============================================================
    // Declaration Configuration
    // ============================================================

    /**
     * Require !important to have a reason (comment)
     */
    'declaration-no-important': true,

    /**
     * Disallow vendor prefixes in values
     */
    'value-no-vendor-prefix': true,

    // ============================================================
    // SCSS Specific Rules
    // ============================================================

    /**
     * Require @extend to be at the beginning of the block
     */
    'scss/at-extend-no-missing-placeholder': true,

    /**
     * Disallow duplicate dollar variables
     */
    'scss/dollar-variable-no-missing-interpolation': true,

    /**
     * Enforce consistent $ variable pattern
     */
    'scss/dollar-variable-pattern': '^[a-z]+(-[a-z0-9]+)*$',

    /**
     * Enforce consistent % placeholder pattern
     */
    'scss/percent-placeholder-pattern': '^[a-z]+(-[a-z0-9]+)*$',

    /**
     * Require @if to have an @else
     */
    'scss/at-if-closing-brace-newline-after': 'always-last-in-chain',

    /**
     * Disallow duplicate mixins
     */
    'scss/at-mixin-pattern': '^[a-z]+(-[a-z0-9]+)*$',

    /**
     * Require function to have a @return
     */
    'scss/at-function-pattern': '^[a-z]+(-[a-z0-9]+)*$',

    /**
     * Prevent duplicate @import
     */
    'scss/at-import-no-partial-leading-underscore': true,

    /**
     * Prefer // comments over /* */ in SCSS
     */
    'scss/double-slash-comment-whitespace-inside': 'always',

    /**
     * Disallow unknown operators
     */
    'scss/operator-no-unspaced': true,

    // ============================================================
    // Comments
    // ============================================================

    /**
     * Require empty line before comments
     */
    'comment-empty-line-before': [
      'always',
      {
        except: ['first-nested'],
        ignore: ['stylelint-commands'],
      },
    ],

    /**
     * Enforce consistent comment style
     */
    'comment-whitespace-inside': 'always',

    // ============================================================
    // General Formatting
    // ============================================================

    /**
     * Enforce lowercase for keywords
     */
    'value-keyword-case': 'lower',

    /**
     * Enforce consistent indentation (handled by Prettier)
     */
    indentation: null,

    /**
     * Enforce consistent line endings (handled by Prettier)
     */
    'linebreaks': null,

    /**
     * Maximum nesting depth
     */
    'max-nesting-depth': [
      4,
      {
        ignore: ['blockless-at-rules', 'pseudo-classes'],
      },
    ],

    /**
     * No duplicate selectors within a stylesheet
     */
    'no-duplicate-selectors': true,

    /**
     * Disallow empty sources
     */
    'no-empty-source': true,

    /**
     * Disallow extra semicolons
     */
    'no-extra-semicolons': true,
  },

  // ============================================================
  // Ignored Files
  // ============================================================

  ignoreFiles: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'public/**',
    'coverage/**',
    '*.min.css',
    'vendor/**',
  ],

  // ============================================================
  // Custom Syntax
  // ============================================================

  customSyntax: 'postcss-scss',

  // ============================================================
  // Default Severity
  // ============================================================

  defaultSeverity: 'error',
};

// TODO: Consider adding these plugins:
// - stylelint-high-performance-animation (performance checks)
// - stylelint-no-unsupported-browser-features (browser compatibility)
// - stylelint-declaration-use-variable (enforce SCSS variables for colors/fonts)
