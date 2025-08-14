import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/config/**',
        '**/*.d.ts',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@root': path.resolve(__dirname, '../../'),
      '@controllers': path.resolve(__dirname, './src/controllers'),
    },
  },
});
