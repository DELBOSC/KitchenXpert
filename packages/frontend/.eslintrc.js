module.exports = {
  root: true,
  extends: [
    '../../.eslintrc.js',
    'next/core-web-vitals',
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
    jest: true,
  },
  rules: {
    // Frontend-specific rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@next/next/no-img-element': 'warn',
  },
};
