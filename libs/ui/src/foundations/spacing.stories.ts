import type { Meta, StoryObj } from '@storybook/angular-vite';
import { RADIUS_TOKENS } from './models/radius-tokens.const';
import { SHADOW_TOKENS } from './models/shadow-tokens.const';
import { SPACING_TOKENS } from './models/spacing-tokens.const';

const meta: Meta = {
  title: 'Foundations/Spacing, radii and shadows',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Spacing and radii are rem tokens (base 16 px). Shadows are the only two elevation levels; `box-shadow` is one of the few places plain px is allowed.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Spacing: Story = {
  render: () => ({
    props: { tokens: SPACING_TOKENS },
    template: `
      <div class="fd-page">
        <table class="fd-table">
          <caption class="fd-sr-note">Spacing tokens</caption>
          <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Preview</th></tr></thead>
          <tbody>
            @for (t of tokens; track t.name) {
              <tr>
                <th scope="row"><code class="fd-code">--{{ t.name }}</code></th>
                <td>{{ t.value }}</td>
                <td><div class="fd-space" [style.width]="'var(--' + t.name + ')'"></div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>`,
  }),
};

export const Radii: Story = {
  render: () => ({
    props: { tokens: RADIUS_TOKENS },
    template: `
      <div class="fd-page">
        <table class="fd-table">
          <caption class="fd-sr-note">Radius tokens</caption>
          <thead><tr><th scope="col">Token</th><th scope="col">Value</th><th scope="col">Preview</th></tr></thead>
          <tbody>
            @for (t of tokens; track t.name) {
              <tr>
                <th scope="row"><code class="fd-code">--{{ t.name }}</code></th>
                <td>{{ t.value }}</td>
                <td><div class="fd-radius" [style.border-radius]="'var(--' + t.name + ')'"></div></td>
              </tr>
            }
          </tbody>
        </table>
      </div>`,
  }),
};

export const Shadows: Story = {
  render: () => ({
    props: { themes: ['light', 'dark'], tokens: SHADOW_TOKENS },
    template: `
      <div class="fd-page">
        <div class="fd-themes">
          @for (theme of themes; track theme) {
            <section class="fd-panel" [attr.data-theme]="theme" [attr.aria-label]="theme + ' theme'">
              <h2 class="fd-panel__title">{{ theme === 'light' ? 'Light' : 'Dark' }} theme</h2>
              @for (t of tokens; track t.name) {
                <div>
                  <h3 class="fd-group__title"><code class="fd-code">--{{ t.name }}</code> · {{ t.value }}</h3>
                  <div class="fd-shadow" [class]="'fd-shadow fd-shadow--' + t.name.replace('shadow-', '')"></div>
                </div>
              }
            </section>
          }
        </div>
      </div>`,
  }),
};
