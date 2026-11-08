const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('node:path');
const { EsmExternalsPlugin } = require('./esm-externals.plugin');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    module: true,
    chunkFormat: 'module',
    library: { type: 'module' },
    filename: '[name].mjs',
  },
  experiments: { outputModule: true },
  // Workspace library: bundled from source for runtime imports (type-only imports need nothing).
  resolve: {
    alias: {
      '@shelfmark/contracts': join(__dirname, '../../libs/shared/contracts/src/index.ts'),
    },
  },
  externalsType: 'module',
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      additionalEntryPoints: [
        { entryName: 'vercel-handler', entryPath: './src/vercel-handler.ts' },
      ],
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      skipTypeChecking: true,
      externalDependencies: 'all',
    }),
    // After Nx: turns its `commonjs` externals into static ESM imports (issue #11).
    new EsmExternalsPlugin(),
  ],
};
