import type { Meta, StoryObj } from '@storybook/angular-vite';
import { LogoComponent } from './logo.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import { LOGO_VARIANT } from './models/logo-variant.const';
import { LOGO_TONE } from './models/logo-tone.const';

const meta: Meta<LogoComponent> = {
  title: 'Components/Logo',
  component: LogoComponent,
  tags: ['autodocs'],
  args: { variant: LOGO_VARIANT.Lockup, tone: LOGO_TONE.Color, wordmark: 'Shelfmark' },
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(LOGO_VARIANT) },
    tone: { control: 'inline-radio', options: Object.values(LOGO_TONE) },
  },
};

export default meta;
type Story = StoryObj<LogoComponent>;

export const Lockup: Story = {};

export const Mark: Story = { args: { variant: LOGO_VARIANT.Mark, label: 'Shelfmark' } };

export const Mono: Story = { args: { tone: LOGO_TONE.Mono } };

export const MonoMark: Story = {
  args: { variant: LOGO_VARIANT.Mark, tone: LOGO_TONE.Mono, label: 'Shelfmark' },
};

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
    props: { themes: Object.values(THEME) },
    template: `
      <div class="story-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="story-theme-pane story-theme-pane--logos">
            <ui-logo />
            <ui-logo variant="mark" label="Shelfmark" />
            <ui-logo tone="mono" />
            <ui-logo variant="mark" tone="mono" label="Shelfmark" />
          </div>
        }
      </div>`,
  }),
};
