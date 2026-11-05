import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  args: {
    variant: 'secondary',
    size: 'md',
    type: 'button',
    iconOnly: false,
    disabled: false,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    iconLeft: { control: 'select', options: [undefined, ...ICON_NAMES] },
    iconRight: { control: 'select', options: [undefined, ...ICON_NAMES] },
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-button
        [variant]="variant"
        [size]="size"
        [type]="type"
        [iconLeft]="iconLeft"
        [iconRight]="iconRight"
        [iconOnly]="iconOnly"
        [ariaLabel]="ariaLabel"
        [disabled]="disabled"
        >Add link</ui-button
      >`,
  }),
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Default: Story = {};

export const Primary: Story = { args: { variant: 'primary', iconLeft: 'add' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Danger: Story = { args: { variant: 'danger', iconLeft: 'trash' } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg', variant: 'primary' } };

export const IconRight: Story = { args: { iconRight: 'chevron-down' } };

/** Icon-only buttons need `ariaLabel`; in dev mode a missing one throws. */
export const IconOnly: Story = {
  args: { iconOnly: true, iconLeft: 'settings', ariaLabel: 'Settings', variant: 'ghost' },
};

export const Disabled: Story = { args: { variant: 'primary', disabled: true } };

const panel = (theme: 'light' | 'dark') => `
  <div data-theme="${theme}" style="padding: 1.5rem; background: var(--bg); color: var(--text); display: grid; gap: 1rem">
    @for (v of variants; track v) {
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap">
        @for (s of sizes; track s) {
          <ui-button [variant]="v" [size]="s" iconLeft="add">Add link</ui-button>
        }
        <ui-button [variant]="v" iconRight="chevron-down">With icon</ui-button>
        <ui-button [variant]="v" [iconOnly]="true" iconLeft="settings" ariaLabel="Settings" />
        <ui-button [variant]="v" [disabled]="true">Disabled</ui-button>
      </div>
    }
  </div>`;

/** Every variant, size and state in both themes, independent of the toolbar. */
export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    props: {
      variants: ['primary', 'secondary', 'ghost', 'danger'],
      sizes: ['sm', 'md', 'lg'],
    },
    template: `${panel('light')}${panel('dark')}`,
  }),
};
