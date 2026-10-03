import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  { ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/practicesoftwaretesting\\.com/]',
          message: 'No hard-coded base URL; use baseURL from playwright.config.ts.',
        },
      ],
    },
  },
  {
    files: ['pages/**/*.ts'],
    rules: {
      '@typescript-eslint/prefer-readonly': 'off',
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.name='expect']",
          message:
            'Page objects should not assert; return state or use an explicit expectXxx helper.',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'warn',
      'playwright/no-force-option': 'error',
      'playwright/no-page-pause': 'error',
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'warn',
      'playwright/expect-expect': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-nth-methods': 'warn',
      'playwright/no-raw-locators': 'warn',
      'playwright/require-top-level-describe': 'error',
      'playwright/valid-title': [
        'warn',
        { mustMatch: { test: ['^[A-Z]+\\d+ – should .+ when .+$', 'Test ID – should … when …'] } },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              message: 'Import test/expect from ../../fixtures.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.object.name='page']",
          message: 'No raw page.* calls in specs; move to a page object or facade.',
        },
      ],
    },
  },
  {
    files: ['tests/auth.setup.ts'],
    rules: {
      'playwright/require-top-level-describe': 'off',
      'playwright/expect-expect': 'off',
      'no-restricted-imports': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['playwright.config.ts', 'data/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
