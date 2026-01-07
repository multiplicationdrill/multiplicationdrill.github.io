/**
 * ESLint Configuration
 * 
 * Follows Playwright best practices:
 * - Includes @typescript-eslint/no-floating-promises to catch missing awaits
 * - This is CRITICAL for Playwright tests where async operations MUST be awaited
 * 
 * @see https://playwright.dev/docs/best-practices#lint-your-tests
 */

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    // ==========================================================================
    // MAIN SOURCE FILES CONFIGURATION
    // ==========================================================================
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        // Enable project for type-aware linting
        // Required for no-floating-promises rule
        project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        localStorage: 'readonly',
        HTMLElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLInputElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  {
    // ==========================================================================
    // E2E TEST FILES CONFIGURATION
    // ==========================================================================
    // PLAYWRIGHT BEST PRACTICE: Lint your tests with no-floating-promises
    // This catches missing await statements which cause flaky tests
    // ==========================================================================
    files: ['e2e/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        // CRITICAL: Must enable project for no-floating-promises
        project: './tsconfig.e2e.json',
      },
      globals: {
        // Node.js globals for E2E tests
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off', // More lenient in tests
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // ========================================================================
      // CRITICAL RULE FOR PLAYWRIGHT
      // ========================================================================
      // This rule ensures all async calls are awaited
      // Without this, you might write:
      //   page.click('button')  // WRONG - not awaited!
      // When you should write:
      //   await page.click('button')  // CORRECT
      //
      // This prevents a HUGE class of flaky tests
      // ========================================================================
      '@typescript-eslint/no-floating-promises': 'error',
      
      // Also enable this to catch void returns being ignored
      '@typescript-eslint/require-await': 'warn',
    },
  },
  {
    // ==========================================================================
    // UNIT TEST FILES CONFIGURATION
    // ==========================================================================
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '*.cjs', 'scripts/**'],
  },
];
