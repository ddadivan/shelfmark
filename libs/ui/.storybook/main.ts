import { resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  framework: '@storybook/angular-vite',
  core: { disableTelemetry: true },
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-themes', '@storybook/addon-docs'],
  // The icon sprite is served at /assets/ui/icons/sprite.svg, same path as in apps/web.
  staticDirs: [{ from: '../src/assets', to: '/assets/ui' }],
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    css: {
      ...viteConfig.css,
      preprocessorOptions: {
        ...viteConfig.css?.preprocessorOptions,
        scss: {
          ...viteConfig.css?.preprocessorOptions?.['scss'],
          loadPaths: [resolve(import.meta.dirname, '../src/styles')],
        },
      },
    },
  }),
};

export default config;
