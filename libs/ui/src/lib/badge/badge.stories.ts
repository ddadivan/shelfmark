import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { BadgeComponent } from './badge.component';
import { BADGE_VARIANT } from './models/badge-variant.const';

const meta: Meta<BadgeComponent> = {
  title: 'Components/Badge',
  component: BadgeComponent,
  tags: ['autodocs'],
  args: { variant: BADGE_VARIANT.Neutral },
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(BADGE_VARIANT) },
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
  },
  render: (args) => ({
    props: args,
    template: `<ui-badge [variant]="variant" [icon]="icon">Shared</ui-badge>`,
  }),
};

export default meta;
type Story = StoryObj<BadgeComponent>;

export const Neutral: Story = {};

export const Accent: Story = {
  args: { variant: BADGE_VARIANT.Accent },
  render: (args) => ({
    props: args,
    template: `<ui-badge [variant]="variant" [icon]="icon">Pinned</ui-badge>`,
  }),
};

/** A row that is already on the shelf (paste many). */
export const Warn: Story = {
  args: { variant: BADGE_VARIANT.Warn },
  render: (args) => ({
    props: args,
    template: `<ui-badge [variant]="variant" [icon]="icon">Already saved</ui-badge>`,
  }),
};

export const Danger: Story = {
  args: { variant: BADGE_VARIANT.Danger },
  render: (args) => ({
    props: args,
    template: `<ui-badge [variant]="variant" [icon]="icon">Overdue</ui-badge>`,
  }),
};

export const WithIcon: Story = { args: { variant: BADGE_VARIANT.Accent, icon: 'check' } };

/** Every tint, with and without an icon, in both themes. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME), variants: Object.values(BADGE_VARIANT) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-stack">
              @for (variant of variants; track variant) {
                <div>
                  <ui-badge [variant]="variant">4 days left</ui-badge>
                  <ui-badge [variant]="variant" icon="check">Already saved</ui-badge>
                </div>
              }
            </div>
          </div>
        }
      </div>`,
  }),
};
