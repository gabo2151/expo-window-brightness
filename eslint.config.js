// Flat config, replacing the `.eslintrc.js` that ESLint 9 stopped reading.
// That is what disabled linting in da2151f ("pending ESLint v9 migration");
// eslint-config-universe 15 ships `flat/` builds, so no new dependency is
// needed to turn it back on.
const universeNative = require('eslint-config-universe/flat/native');
const universeWeb = require('eslint-config-universe/flat/web');

module.exports = [
  {
    ignores: ['build/**', 'example/**', 'node_modules/**'],
  },

  ...universeNative,
  ...universeWeb,

  {
    // The scripts are Node ESM, not React Native.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },

  {
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
