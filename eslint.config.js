// @ts-check
const tseslint = require('typescript-eslint');
const playwright = require('eslint-plugin-playwright');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'playwright-report/**',
      'reports/**',
      'test-results/**',
      'eslint.config.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: { playwright },
    rules: {
      ...playwright.configs['flat/recommended'].rules,

      // Code review guidelines (CODE_REVIEW_GUIDELINES.md): no hard sleeps,
      // no focused/skipped tests, no leftover debug statements left in PRs.
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/no-conditional-in-test': 'warn',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-networkidle': 'off', // this repo intentionally relies on networkidle (see CLAUDE.md)
      'playwright/expect-expect': 'error',
      'playwright/valid-expect': 'error',

      'no-console': 'error',
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Setup scripts intentionally have no assertions.
    files: ['tests/**/*.setup.ts'],
    rules: {
      'playwright/expect-expect': 'off',
    },
  },
);
