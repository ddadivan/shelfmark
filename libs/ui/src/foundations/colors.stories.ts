import type { Meta, StoryObj } from '@storybook/angular-vite';
import { COLOR_GROUPS } from './models/color-groups.const';
import { THEME, THEME_ATTRIBUTE } from '../lib/theme';

const meta: Meta = {
  title: 'Foundations/Colours',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Colour tokens from `docs/design/tokens.json`. Components use them only through CSS custom properties (`var(--text)`), never as hex values. Both themes are shown side by side; the toolbar theme switch changes the rest of the page.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {
  render: () => ({
    props: { themes: Object.values(THEME), THEME, groups: COLOR_GROUPS },
    template: `
      <div class="fd-page">
        <p class="fd-lead">Same token names in both themes; only the values change.</p>
        <div class="fd-themes">
          @for (theme of themes; track theme) {
            <section class="fd-panel" [attr.${THEME_ATTRIBUTE}]="theme" [attr.aria-label]="theme + ' theme'">
              <h2 class="fd-panel__title">{{ theme === THEME.Light ? 'Light' : 'Dark' }} theme</h2>
              @for (group of groups; track group.title) {
                <div>
                  <h3 class="fd-group__title">{{ group.title }}</h3>
                  <ul class="fd-swatches">
                    @for (token of group.tokens; track token) {
                      <li class="fd-swatch">
                        <span class="fd-swatch__chip" [style.background]="'var(--' + token + ')'"></span>
                        <span class="fd-swatch__name">--{{ token }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            </section>
          }
        </div>
      </div>`,
  }),
};

export const Glass: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Frosted surface for floating layers only: menus, toasts, the phone tab bar, the bulk-action bar and the sign-in card (`@include glass` in components, `.ui-glass` in app layouts). The blur is dropped under reduced motion and without `backdrop-filter` support; the `glass` fill alone keeps text readable.',
      },
    },
  },
  render: () => ({
    props: { themes: Object.values(THEME), THEME },
    template: `
      <div class="fd-themes">
        @for (theme of themes; track theme) {
          <section class="fd-panel" [attr.${THEME_ATTRIBUTE}]="theme" [attr.aria-label]="theme + ' theme glass'">
            <h2 class="fd-panel__title">{{ theme === THEME.Light ? 'Light' : 'Dark' }} theme</h2>
            <div class="fd-glass-stage">
              <div class="fd-glass-stage__blob fd-glass-stage__blob--a"></div>
              <div class="fd-glass-stage__blob fd-glass-stage__blob--b"></div>
              <div class="ui-glass fd-glass-bar">
                <strong>3 selected</strong>
                <span>Move</span>
                <span>Favorite</span>
                <span>Delete</span>
              </div>
            </div>
          </section>
        }
      </div>`,
  }),
};
