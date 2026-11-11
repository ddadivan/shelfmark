import '@fontsource-variable/onest/wght.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '../src/styles/global.scss';
import './breadcrumbs-stories.scss';
import './card-stories.scss';
import './command-list-stories.scss';
import './display-stories.scss';
import './dialog-stories.scss';
import './drawer-stories.scss';
import './foundations.scss';
import './field-stories.scss';
import './history-stories.scss';
import './illustration-stories.scss';
import './loading-stories.scss';
import './menu-stories.scss';
import './ripple-stories.scss';
import './segmented-stories.scss';
import './select-stories.scss';
import './tag-input-stories.scss';
import './toast-stories.scss';
import './tooltip-stories.scss';
import './tree-stories.scss';
import { provideZonelessChangeDetection } from '@angular/core';
import { applicationConfig, type Preview } from '@storybook/angular-vite';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { THEME, THEME_ATTRIBUTE } from '../src/lib/theme';

const preview: Preview = {
  decorators: [
    applicationConfig({ providers: [provideZonelessChangeDetection()] }),
    withThemeByDataAttribute({
      themes: { light: THEME.Light, dark: THEME.Dark },
      defaultTheme: THEME.Light,
      attributeName: THEME_ATTRIBUTE,
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
