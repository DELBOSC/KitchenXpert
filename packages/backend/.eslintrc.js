module.exports = {
  root: true,
  extends: ['../../.eslintrc.js'],
  parserOptions: {
    // tsconfig.eslint.json includes test files which the build config
    // (tsconfig.json) excludes; otherwise typescript-eslint refuses to lint
    // them and emits "Parsing error: TSConfig does not include this file".
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    node: true,
    jest: true,
  },
  rules: {
    // Backend-specific rules
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        // Express handlers + middleware accept void-returning async fns;
        // relaxing this matcher kills ~150 false positives without losing
        // the genuine "async-as-event-listener" check.
        checksVoidReturn: false,
      },
    ],

    // ─────────────────────────────────────────────────────────────────────
    // Noise rules disabled at the backend level.
    //
    // The codebase carries 3+ years of legacy any-typed Prisma/Express
    // handlers. Re-typing every call-site is multi-week work and these
    // rules produce 2 000+ warnings without surfacing real bugs that
    // runtime tests + Prisma type-checks don't already catch. We keep
    // `@typescript-eslint/no-explicit-any` as a warn (inherited) so new
    // `any`s stay visible, but stop flagging every consumer of an
    // existing `any`.
    // ─────────────────────────────────────────────────────────────────────
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    // `||` is used intentionally for falsy-coalescing of `0`/`''`; the
    // autofix doesn't know that.
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    // Logger formatters concatenate non-string Prisma decimals; documented.
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/no-base-to-string': 'off',
    // Async fn without await is sometimes legitimate (returning a Promise
    // assembled elsewhere); we accept it.
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/no-redundant-type-constituents': 'off',
    '@typescript-eslint/unbound-method': 'off',
  },
};
