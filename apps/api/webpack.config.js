const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('node:path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    module: true,
    chunkFormat: 'module',
    library: { type: 'module' },
    filename: '[name].js',
  },
  experiments: { outputModule: true },
  externalsType: 'module',
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      skipTypeChecking: true,
      externalDependencies: 'all',
    }),
  ],
};
