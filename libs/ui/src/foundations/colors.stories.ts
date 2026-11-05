import type { Meta, StoryObj } from '@storybook/angular-vite';
import { COLOR_GROUPS } from './models/color-groups.const';

const meta: Meta = {
  title: 'Foundations/Colours',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Colour tokens from `docs/design/tokens.css`. Components use them only through CSS custom properties (`var(--text)`), never as hex values. Both themes are shown side by side; the toolbar theme switch changes the rest of the page.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {
  render: () => ({
    props: { themes: ['light', 'dark'], groups: COLOR_GROUPS },
    template: `
      <div class="fd-page">
        <p class="fd-lead">Same token names in both themes; only the values change.</p>
        <div class="fd-themes">
          @for (theme of themes; track theme) {
            <section class="fd-panel" [attr.data-theme]="theme" [attr.aria-label]="theme + ' theme'">
              <h2 class="fd-panel__title">{{ theme === 'light' ? 'Light' : 'Dark' }} theme</h2>
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
