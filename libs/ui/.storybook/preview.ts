import '@fontsource-variable/onest/wght.css';
import '../src/styles/global.scss';
import './dialog-stories.scss';
import './foundations.scss';
import './illustration-stories.scss';
import './menu-stories.scss';
import './ripple-stories.scss';
import './tooltip-stories.scss';
import { provideZonelessChangeDetection } from '@angular/core';
import { applicationConfig, type Preview } from '@storybook/angular-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

const preview: Preview = {
  decorators: [
    applicationConfig({ providers: [provideZonelessChangeDetection()] }),
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
      parentSelector: 'html',
    }),
  ],
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    a11y: { test: 'error' },
  },
};

export default preview;
