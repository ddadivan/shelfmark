import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LogoComponent } from './logo.component';

const meta: Meta<LogoComponent> = {
  title: 'Components/Logo',
  component: LogoComponent,
  tags: ['autodocs'],
  args: { variant: 'lockup', tone: 'color', wordmark: 'Shelfmark' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['lockup', 'mark'] },
    tone: { control: 'inline-radio', options: ['color', 'mono'] },
  },
};

export default meta;
type Story = StoryObj<LogoComponent>;

export const Lockup: Story = {};

export const Mark: Story = { args: { variant: 'mark', label: 'Shelfmark' } };

export const Mono: Story = { args: { tone: 'mono' } };

export const MonoMark: Story = { args: { variant: 'mark', tone: 'mono', label: 'Shelfmark' } };

/** The mark scales through `--ui-logo-size`; the wordmark follows. */
export const Sizes: Story = {
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 2rem">
        <ui-logo style="--ui-logo-size: 1.5rem" />
        <ui-logo />
        <ui-logo style="--ui-logo-size: 3rem" />
      </div>`,
  }),
};

/** Every variant and tone, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" style="display: flex; flex-direction: column; align-items: flex-start; gap: 1.5rem; padding: 1.5rem; background: var(--bg); color: var(--text); border-radius: var(--radius-lg)">
            <ui-logo />
            <ui-logo variant="mark" label="Shelfmark" />
            <ui-logo tone="mono" />
            <ui-logo variant="mark" tone="mono" label="Shelfmark" />
          </div>
        }
      </div>`,
  }),
};
