import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/api',
  // SWC emits decorator metadata; Vite's own TS transform must not run.
  oxc: false,
  resolve: {
    // Workspace library, resolved from source (runtime imports such as AUTH_PROVIDER).
    alias: {
      '@shelfmark/contracts': resolve(
        import.meta.dirname,
        '../../libs/shared/contracts/src/index.ts',
      ),
    },
  },
  plugins: [swc.vite({ tsconfigFile: './tsconfig.spec.json' })],
  test: {
    name: 'api',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    setupFiles: ['./vitest.setup.ts'],
    // Each DB spec boots its own PGlite; parallel files make the first hook slow on small machines.
    hookTimeout: 30_000,
    reporters: ['default'],
    coverage: {
      // On by default so `nx test api` enforces the thresholds; filtered runs (`-t foo`) may fail them.
      enabled: true,
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/api',
      include: ['src/**/*.ts', 'scripts/**/*.mjs'],
      // prisma-cli.mjs only spawns the Prisma CLI (covered end to end by `nx run api:db-check`).
      exclude: ['scripts/prisma-cli.mjs', 'src/main.ts', 'src/generated/**', 'src/**/*.spec.ts'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
