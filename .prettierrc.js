/** @type {import('prettier').Config} */
module.exports = {
  // Basic formatting
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  endOfLine: 'lf',

  // Trailing commas
  trailingComma: 'es5',

  // Brackets & Spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrows
  arrowParens: 'always',

  // JSX
  jsxSingleQuote: false,

  // Objects
  quoteProps: 'as-needed',

  // HTML/JSX whitespace
  htmlWhitespaceSensitivity: 'css',

  // Prose (markdown)
  proseWrap: 'preserve',

  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',

  // File-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.prisma',
      options: {
        tabWidth: 2,
      },
    },
    {
      files: ['*.html', '*.htm'],
      options: {
        printWidth: 120,
      },
    },
    {
      files: ['*.css', '*.scss', '*.less'],
      options: {
        singleQuote: false,
      },
    },
  ],

  // Plugins (add if installed)
  // plugins: ['prettier-plugin-tailwindcss', 'prettier-plugin-prisma'],
};
