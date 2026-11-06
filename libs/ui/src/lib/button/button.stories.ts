import { signal } from '@angular/core';
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
    loading: false,
    ripple: true,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    type: { control: 'inline-radio', options: ['button', 'submit', 'reset'] },
    iconLeft: { control: 'select', options: [undefined, ...ICON_NAMES] },
    iconRight: { control: 'select', options: [undefined, ...ICON_NAMES] },
    href: { control: 'text' },
    ariaHaspopup: {
      control: 'select',
      options: [undefined, true, 'menu', 'listbox', 'tree', 'grid', 'dialog'],
    },
    ariaPressed: { control: 'select', options: [undefined, true, false, 'mixed'] },
    ariaExpanded: { control: 'select', options: [undefined, true, false] },
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
        [loading]="loading"
        [href]="href"
        [ripple]="ripple"
        [ariaExpanded]="ariaExpanded"
        [ariaControls]="ariaControls"
        [ariaHaspopup]="ariaHaspopup"
        [ariaDescribedby]="ariaDescribedby"
        [ariaPressed]="ariaPressed"
        (linkClick)="$event.preventDefault()"
        >{{ label || 'Add link' }}</ui-button
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

/** Press it: a ripple grows from the touch point (20% of the text colour on filled buttons). */
export const WithRipple: Story = { args: { variant: 'primary', size: 'lg' } };

export const WithoutRipple: Story = { args: { ripple: false } };

/** `href` renders an inner `<a>`; `(linkClick)` fires on plain left clicks so the feature can route. */
export const Link: Story = { args: { href: '#links', variant: 'primary', iconRight: 'external' } };

export const GhostLink: Story = { args: { href: '#links', variant: 'ghost' } };

/** A disabled link has no `href` and `aria-disabled="true"`; it is not activatable. */
export const DisabledLink: Story = { args: { href: '#links', disabled: true } };

/** Forwarded ARIA inputs land on the inner button: a menu trigger and a toggle. */
export const MenuTrigger: Story = {
  args: {
    iconRight: 'chevron-down',
    ariaHaspopup: 'menu',
    ariaExpanded: false,
    ariaControls: 'menu-1',
  },
};

export const Toggle: Story = { args: { ariaPressed: true, variant: 'ghost' } };

/** Busy: spinner, `aria-busy="true"`, width locked, clicks ignored; the button stays focusable. */
export const Loading: Story = {
  args: { variant: 'primary', loading: true, label: 'Saving…' },
};

export const LoadingSecondary: Story = { args: { loading: true, label: 'Exporting…' } };

export const LoadingDanger: Story = {
  args: { variant: 'danger', loading: true, label: 'Deleting…' },
};

export const LoadingIconOnly: Story = {
  args: { iconOnly: true, iconLeft: 'settings', ariaLabel: 'Saving', loading: true },
};

/**
 * Click it: the width is locked, the label changes to "Saving…" and the spinner grows in; after
 * two seconds the spinner leaves and the label and width come back. It never jumps.
 */
export const LoadingWithLabelChange: Story = {
  args: { variant: 'primary', size: 'lg' },
  render: (args) => {
    const busy = signal(false);
    return {
      props: {
        args,
        busy,
        save: () => {
          busy.set(true);
          setTimeout(() => busy.set(false), 2000);
        },
      },
      template: `
        <ui-button
          [variant]="args.variant"
          [size]="args.size"
          [loading]="busy()"
          (click)="save()"
          >{{ busy() ? 'Saving…' : 'Save link' }}</ui-button
        >`,
    };
  },
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
        <ui-button [variant]="v" [loading]="true">Saving…</ui-button>
        <ui-button [variant]="v" [loading]="true" [iconOnly]="true" iconLeft="settings" ariaLabel="Saving" />
        <ui-button [variant]="v" href="#links" iconRight="external">Link</ui-button>
        <ui-button [variant]="v" href="#links" [disabled]="true">Disabled link</ui-button>
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
