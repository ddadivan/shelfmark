import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../../node_modules/.vite/libs/shared/contract-tests',
  resolve: {
    alias: {
      '@shelfmark/contracts': resolve(import.meta.dirname, '../contracts/src/index.ts'),
    },
  },
  test: {
    name: 'contract-tests',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});
