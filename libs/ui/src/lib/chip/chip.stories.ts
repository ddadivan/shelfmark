import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { ChipComponent } from './chip.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { CHIP_VARIANT } from './models/chip-variant.const';

const meta: Meta<ChipComponent> = {
  title: 'Components/Chip',
  component: ChipComponent,
  tags: ['autodocs'],
  args: {
    variant: CHIP_VARIANT.Tag,
    clickable: false,
    removable: false,
    disabled: false,
    removeLabel: 'Remove tag design',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(CHIP_VARIANT) },
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
    clicked: { action: 'clicked' },
    removed: { action: 'removed' },
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-chip
        [variant]="variant"
        [clickable]="clickable"
        [removable]="removable"
        [disabled]="disabled"
        [icon]="icon"
        [removeLabel]="removeLabel"
        (clicked)="clicked($event)"
        (removed)="removed($event)"
      >design</ui-chip>`,
  }),
};

export default meta;
type Story = StoryObj<ChipComponent>;

export const Tag: Story = {};

export const Neutral: Story = { args: { variant: CHIP_VARIANT.Neutral } };

/** Button semantics with ripple; filters the feed by the tag. */
export const Clickable: Story = { args: { clickable: true } };

/** Remove button, Delete and Backspace on focus. */
export const Removable: Story = { args: { removable: true } };

export const ClickableAndRemovable: Story = { args: { clickable: true, removable: true } };

export const WithIcon: Story = {
  args: { variant: CHIP_VARIANT.Neutral, icon: 'star', clickable: true },
};

export const Disabled: Story = {
  args: { clickable: true, removable: true, disabled: true },
};

/** The "+2" chip that collapses the tags beyond three on a card. */
export const Overflow: Story = {
  args: { variant: CHIP_VARIANT.Neutral },
  render: (args) => ({
    props: args,
    template: `<ui-chip [variant]="variant">+2</ui-chip>`,
  }),
};

/** Every variant and state, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: {
      cases: [
        { variant: CHIP_VARIANT.Tag },
        { variant: CHIP_VARIANT.Tag, clickable: true },
        { variant: CHIP_VARIANT.Tag, removable: true },
        { variant: CHIP_VARIANT.Tag, clickable: true, removable: true, icon: 'tag' },
        { variant: CHIP_VARIANT.Tag, clickable: true, disabled: true },
        { variant: CHIP_VARIANT.Neutral },
        { variant: CHIP_VARIANT.Neutral, clickable: true },
        { variant: CHIP_VARIANT.Neutral, removable: true },
        { variant: CHIP_VARIANT.Neutral, clickable: true, icon: 'star' },
        { variant: CHIP_VARIANT.Neutral, clickable: true, disabled: true },
      ],
      themes: Object.values(THEME),
    },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <div class="ds-row">
              @for (c of cases; track $index) {
                <ui-chip
                  [variant]="c.variant"
                  [clickable]="c.clickable ?? false"
                  [removable]="c.removable ?? false"
                  [disabled]="c.disabled ?? false"
                  [icon]="c.icon"
                  removeLabel="Remove tag design"
                >design</ui-chip>
              }
            </div>
          </div>
        }
      </div>`,
  }),
};
