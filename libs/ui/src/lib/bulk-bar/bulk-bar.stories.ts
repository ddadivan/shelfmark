import type { Meta, StoryObj } from '@storybook/angular-vite';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import { BulkBarComponent } from './bulk-bar.component';
import type { BulkBarAction } from './models/bulk-bar-action.interface';
import { BULK_BAR_LAYOUT } from './models/bulk-bar-layout.const';

const DESKTOP: BulkBarAction[] = [
  { id: 'move', label: 'Move', icon: 'folder-move' },
  { id: 'tags', label: 'Tags', icon: 'tag' },
  { id: 'favorite', label: 'Favorite', icon: 'star', pressed: false },
  { id: 'open', label: 'Open all', icon: 'external' },
  { id: 'copy', label: 'Copy links', icon: 'copy' },
  { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
];

const PHONE: BulkBarAction[] = [
  { id: 'move', label: 'Move', icon: 'folder-move' },
  { id: 'tags', label: 'Tags', icon: 'tag' },
  { id: 'favorite', label: 'Favorite', icon: 'star', pressed: false },
  { id: 'share', label: 'Share', icon: 'share' },
  { id: 'delete', label: 'Delete', icon: 'trash', danger: true },
];

const meta: Meta<BulkBarComponent> = {
  title: 'Components/BulkBar',
  component: BulkBarComponent,
  tags: ['autodocs'],
  args: {
    actions: DESKTOP,
    ariaLabel: 'Actions for 3 selected links',
    layout: BULK_BAR_LAYOUT.Inline,
  },
  argTypes: {
    layout: { control: 'inline-radio', options: Object.values(BULK_BAR_LAYOUT) },
    action: { action: 'action' },
  },
  render: (args) => ({
    props: args,
    template: `<ui-bulk-bar [actions]="actions" [ariaLabel]="ariaLabel" [layout]="layout" (action)="action($event)" />`,
  }),
};

export default meta;
type Story = StoryObj<BulkBarComponent>;

/** Desktop: icon and label side by side, Delete after a divider. */
export const Inline: Story = {};

/** Phone: icon above the label, the buttons share the width like the tab bar. */
export const Stacked: Story = {
  args: { actions: PHONE, layout: BULK_BAR_LAYOUT.Stacked },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 22.5rem">
        <ui-bulk-bar [actions]="actions" [ariaLabel]="ariaLabel" [layout]="layout" />
      </div>`,
  }),
};

/** Favorite is on for every selected item (`aria-pressed="true"`). */
export const TogglePressed: Story = {
  args: {
    actions: DESKTOP.map((item) =>
      item.id === 'favorite' ? { ...item, icon: 'star-filled', pressed: true } : item,
    ),
  },
};

/** An action that cannot run right now. */
export const Disabled: Story = {
  args: {
    actions: DESKTOP.map((item) => (item.id === 'open' ? { ...item, disabled: true } : item)),
  },
};

/** Both layouts, in both themes side by side. */
export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => ({
    props: { desktop: DESKTOP, phone: PHONE, themes: Object.values(THEME) },
    template: `
      <div class="ds-themes">
        @for (theme of themes; track theme) {
          <div [attr.${THEME_ATTRIBUTE}]="theme" class="ds-pane">
            <ui-bulk-bar [actions]="desktop" [ariaLabel]="'Actions, inline, ' + theme" />
            <div style="max-width: 22.5rem">
              <ui-bulk-bar [actions]="phone" layout="stacked" [ariaLabel]="'Actions, stacked, ' + theme" />
            </div>
          </div>
        }
      </div>`,
  }),
};
