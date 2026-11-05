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
      <div class="story-row">
        <ui-logo class="story-logo--sm" />
        <ui-logo />
        <ui-logo class="story-logo--lg" />
      </div>`,
  }),
};

/** Every variant and tone, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    template: `
      <div class="story-themes">
        @for (theme of ['light', 'dark']; track theme) {
          <div [attr.data-theme]="theme" class="story-theme-pane story-theme-pane--logos">
            <ui-logo />
            <ui-logo variant="mark" label="Shelfmark" />
            <ui-logo tone="mono" />
            <ui-logo variant="mark" tone="mono" label="Shelfmark" />
          </div>
        }
      </div>`,
  }),
};
