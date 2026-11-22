import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { IconSwapComponent } from './icon-swap.component';

const meta: Meta<IconSwapComponent> = {
  title: 'Components/Icon swap',
  component: IconSwapComponent,
  tags: ['autodocs'],
  args: { name: 'copy', size: 24 },
};

export default meta;
type Story = StoryObj<IconSwapComponent>;

/** Change `name` in the controls: the old icon scales to 0.5, blurs and fades, the new one grows in. */
export const Default: Story = {};

/** Click the button: copy turns into a check and back, in both themes. */
export const CopyToCheck: Story = {
  render: () => ({
    props: { themes: Object.values(THEME), on: false },
    template: `
      <div style="display: flex; gap: 2rem">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" style="padding: 1.5rem; background: var(--bg); color: var(--text)">
            <button type="button" aria-label="Copy link" (click)="on = !on"
              style="padding: 0.5rem; color: inherit; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md)">
              <ui-icon-swap [name]="on ? 'check' : 'copy'" />
            </button>
          </div>
        }
      </div>`,
  }),
};
