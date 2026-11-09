import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ICON_NAMES } from '../icon/models/icon-names.const';
import { ButtonComponent } from './button.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { Theme } from '../theme';
import { BUTTON_VARIANT } from './models/button-variant.const';
import { BUTTON_SIZE } from './models/button-size.const';
import { BUTTON_TYPE } from './models/button-type.const';
import { BUTTON_HASPOPUP } from './models/button-haspopup.const';

/** The component inputs plus the projected label text. */
type ButtonArgs = ButtonComponent & { label?: string };

const meta: Meta<ButtonArgs> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  args: {
    variant: BUTTON_VARIANT.Secondary,
    size: BUTTON_SIZE.Md,
    type: BUTTON_TYPE.Button,
    iconOnly: false,
    fab: false,
    disabled: false,
    loading: false,
    ripple: true,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: Object.values(BUTTON_VARIANT) },
    size: { control: 'inline-radio', options: Object.values(BUTTON_SIZE) },
    type: { control: 'inline-radio', options: Object.values(BUTTON_TYPE) },
    iconLeft: { control: 'select', options: [undefined, ...ICON_NAMES] },
    iconRight: { control: 'select', options: [undefined, ...ICON_NAMES] },
    href: { control: 'text' },
    ariaHaspopup: {
      control: 'select',
      options: [undefined, true, ...Object.values(BUTTON_HASPOPUP)],
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
        [fab]="fab"
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
type Story = StoryObj<ButtonArgs>;

export const Default: Story = {};

export const Primary: Story = { args: { variant: BUTTON_VARIANT.Primary, iconLeft: 'add' } };

export const Ghost: Story = { args: { variant: BUTTON_VARIANT.Ghost } };

export const Danger: Story = { args: { variant: BUTTON_VARIANT.Danger, iconLeft: 'trash' } };

export const Small: Story = { args: { size: BUTTON_SIZE.Sm } };

export const Large: Story = { args: { size: BUTTON_SIZE.Lg, variant: BUTTON_VARIANT.Primary } };

export const IconRight: Story = { args: { iconRight: 'chevron-down' } };

/** Icon-only buttons need `ariaLabel`; in dev mode a missing one throws. */
export const IconOnly: Story = {
  args: {
    iconOnly: true,
    iconLeft: 'settings',
    ariaLabel: 'Settings',
    variant: BUTTON_VARIANT.Ghost,
  },
};

/** An icon-only button shows a tooltip with its label on hover and keyboard focus (Esc closes it). */
export const IconOnlyTooltip: Story = {
  render: () => ({
    moduleMetadata: { imports: [ButtonComponent] },
    template: `
      <div style="display: flex; gap: 1rem; padding: 3rem 1rem 1rem">
        <ui-button variant="ghost" iconOnly iconLeft="search" ariaLabel="Search" />
        <ui-button variant="ghost" iconOnly iconLeft="star" ariaLabel="Add to favorites" />
        <ui-button variant="secondary" size="sm" iconOnly iconLeft="more" ariaLabel="More actions" />
      </div>`,
  }),
};

/** Floating action button (phone "Add link"): 3.5rem, popover shadow, 24px icon. */
export const Fab: Story = {
  args: {
    fab: true,
    iconOnly: true,
    iconLeft: 'add',
    ariaLabel: 'Add link',
    variant: BUTTON_VARIANT.Primary,
  },
};

/** Full-width button (phone settings: Sign out). The host and the inner button take 100%. */
export const Block: Story = {
  render: () => ({
    template: `
      <div style="max-inline-size: 22rem; display: grid; gap: 0.75rem">
        <ui-button block size="lg">Sign out</ui-button>
        <ui-button block size="lg" variant="ghost">Delete account</ui-button>
      </div>
    `,
  }),
};

/** Press it: a ripple grows from the touch point (20% of the text colour on filled buttons). */
export const WithRipple: Story = {
  args: { variant: BUTTON_VARIANT.Primary, size: BUTTON_SIZE.Lg },
};

export const WithoutRipple: Story = { args: { ripple: false } };

/** `href` renders an inner `<a>`; `(linkClick)` fires on plain left clicks so the feature can route. */
export const Link: Story = {
  args: { href: '#links', variant: BUTTON_VARIANT.Primary, iconRight: 'external' },
};

export const GhostLink: Story = { args: { href: '#links', variant: BUTTON_VARIANT.Ghost } };

/** A disabled link has no `href` and `aria-disabled="true"`; it is not activatable. */
export const DisabledLink: Story = { args: { href: '#links', disabled: true } };

/** Forwarded ARIA inputs land on the inner button: a menu trigger and a toggle. */
export const MenuTrigger: Story = {
  args: {
    iconRight: 'chevron-down',
    ariaHaspopup: BUTTON_HASPOPUP.Menu,
    ariaExpanded: false,
    ariaControls: 'menu-1',
  },
};

export const Toggle: Story = { args: { ariaPressed: true, variant: BUTTON_VARIANT.Ghost } };

/** Busy: spinner, `aria-busy="true"`, width locked, clicks ignored; the button stays focusable. */
export const Loading: Story = {
  args: { variant: BUTTON_VARIANT.Primary, loading: true, label: 'Saving…' },
};

export const LoadingSecondary: Story = { args: { loading: true, label: 'Exporting…' } };

export const LoadingDanger: Story = {
  args: { variant: BUTTON_VARIANT.Danger, loading: true, label: 'Deleting…' },
};

export const LoadingIconOnly: Story = {
  args: { iconOnly: true, iconLeft: 'settings', ariaLabel: 'Saving', loading: true },
};

/**
 * Click it: the width is locked, the label changes to "Saving…" and the spinner grows in; after
 * two seconds the spinner leaves and the label and width come back. It never jumps.
 */
export const LoadingWithLabelChange: Story = {
  args: { variant: BUTTON_VARIANT.Primary, size: BUTTON_SIZE.Lg },
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

export const Disabled: Story = { args: { variant: BUTTON_VARIANT.Primary, disabled: true } };

const panel = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" style="padding: 1.5rem; background: var(--bg); color: var(--text); display: grid; gap: 1rem">
    @for (v of variants; track v) {
      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap">
        @for (s of sizes; track s) {
          <ui-button [variant]="v" [size]="s" iconLeft="add">Add link</ui-button>
        }
        <ui-button [variant]="v" iconRight="chevron-down">With icon</ui-button>
        <ui-button [variant]="v" [iconOnly]="true" iconLeft="settings" ariaLabel="Settings" />
        <ui-button [variant]="v" [disabled]="true">Disabled</ui-button>
        <ui-button [variant]="v" [loading]="true">Saving…</ui-button>
        <ui-button [variant]="v" [fab]="true" [iconOnly]="true" iconLeft="add" ariaLabel="Add link" />
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
      variants: Object.values(BUTTON_VARIANT),
      sizes: Object.values(BUTTON_SIZE),
    },
    template: `${Object.values(THEME).map(panel).join('')}`,
  }),
};

/**
 * Sign-in provider buttons: the secondary large button with a leading brand mark. GitHub is
 * `currentColor` (follows the text in both themes); the Google "G" keeps its fixed brand colours.
 * The label names the action, the mark is decorative. Light and dark side by side.
 */
export const ProviderButtons: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <ui-button size="lg" iconLeft="google">Continue with Google</ui-button>
            <ui-button size="lg" iconLeft="github">Continue with GitHub</ui-button>
          </div>
        }
      </div>`,
  }),
};
