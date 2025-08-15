import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/setupTests.ts', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@root': path.resolve(__dirname, '../../'),
    },
  },
});
