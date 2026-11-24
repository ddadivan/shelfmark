// Bundles the background service worker (right-click save) into one ES module:
//   node apps/extension/scripts/build-worker.mjs --configuration=production|development
//   -> dist/apps/extension-worker/<configuration>/background.js
// The Angular build of the popup copies that file next to its manifest (project.json `assets`), so
// `nx build extension` (which depends on `build-worker`) ships both. The development configuration
// swaps the origin constant like the popup's `fileReplacements`.
// esbuild comes with @angular/build, which bundles the popup.
import { build } from 'esbuild';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const arg = process.argv.find((value) => value.startsWith('--configuration='));
const configuration = arg?.split('=')[1] ?? 'production';
if (!['production', 'development'].includes(configuration)) {
  throw new Error(`Unknown configuration "${configuration}".`);
}
const development = configuration === 'development';
const config = resolve(root, 'apps/extension/src/app/core/config');

/** `shelfmark-origin.const` -> `shelfmark-origin.development.const` in the development build. */
const developmentOrigin = {
  name: 'development-origin',
  setup(pluginBuild) {
    // A string, not a regex literal: esbuild takes Go regex syntax, which has no `u` flag.
    pluginBuild.onResolve({ filter: new RegExp(String.raw`/shelfmark-origin\.const$`) }, () => ({
      path: resolve(config, 'shelfmark-origin.development.const.ts'),
    }));
  },
};

await build({
  absWorkingDir: root,
  entryPoints: ['apps/extension/src/background/background.ts'],
  outfile: `dist/apps/extension-worker/${configuration}/background.js`,
  tsconfig: 'apps/extension/tsconfig.app.json',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'chrome120',
  minify: !development,
  sourcemap: development ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'warning',
  plugins: development ? [developmentOrigin] : [],
});
console.log(`Built dist/apps/extension-worker/${configuration}/background.js`);
