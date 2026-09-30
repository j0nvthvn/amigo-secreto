import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/.expo/',
      'apps/mobile/expo-env.d.ts',
      'packages/shared/src/database.types.ts',
      // Deno: se revisan con `deno lint`
      'supabase/functions/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.{js,cjs,mjs}', 'supabase/tests/**/*.ts', 'packages/*/src/**/*.test.ts'],
    languageOptions: { globals: globals.node },
  },
);
