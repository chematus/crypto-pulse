import { env } from 'node:process';
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

const consoleRule = env.NODE_ENV === 'production' ? 'warn' : 'off';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: [
        'node_modules/',
        '.env',
        'eslint.config.mjs',
        '.prettierrc.js',
        'data-fetcher/dist/',
        'websocket-service/dist/',
        'frontend/dist/',
        'logs/',
        '*.d.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': consoleRule,
    },
    languageOptions: {
        globals: {
          ...globals.node,
        }
    }
  }
);
