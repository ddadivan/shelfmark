import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ButtonComponent } from '../button/button.component';
import { MenuItemComponent } from './menu-item/menu-item.component';
import { MenuSeparatorComponent } from './menu-separator/menu-separator.component';
import { MenuTriggerDirective } from '../../directives/menu-trigger/menu-trigger.directive';
import { MenuComponent } from './menu.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { Theme } from '../../models/theme';
import { MENU_ALIGN } from './models/menu-align.const';
import type { MenuAlign } from './models/menu-align.type';

interface MenuArgs {
  align: MenuAlign;
}

const meta: Meta<MenuArgs> = {
  title: 'Components/Menu',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Action menu on Angular Aria. Open it from a button (click, Enter, Space, ArrowDown or ArrowUp), ' +
          'with the arrow keys, Home / End and typing to move, Esc or a click outside to close. ' +
          'The destructive item goes last, after a separator. The popup lives in the page body ' +
          'and follows the theme of the page.',
      },
    },
  },
  args: { align: MENU_ALIGN.Start },
  argTypes: { align: { control: 'inline-radio', options: Object.values(MENU_ALIGN) } },
};

export default meta;
type Story = StoryObj<MenuArgs>;

const imports = [
  ButtonComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
];

const linkItems = `
  <ui-menu-item icon="external" shortcut="↵">Open</ui-menu-item>
  <ui-menu-item icon="edit" shortcut="E">Edit</ui-menu-item>
  <ui-menu-item icon="star" shortcut="F">Add to favorites</ui-menu-item>
  <ui-menu-item icon="copy" shortcut="⌘C">Copy link</ui-menu-item>
  <ui-menu-separator />
  <ui-menu-item icon="trash" danger>Delete</ui-menu-item>`;

/** A `ui-button` trigger: the ARIA state sits on the inner native button. */
export const WithButtonTrigger: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div class="ms-row">
          <ui-button [uiMenuTrigger]="menu" iconRight="chevron-down">Actions</ui-button>
        </div>
        <ui-menu #menu [align]="align" ariaLabel="Link actions">${linkItems}</ui-menu>
      </div>`,
  }),
};

/** The menu is open: the trigger stays pressed (`aria-expanded`), items are 24px icons, text at the start. */
export const OpenMenu: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div class="ms-row">
          <ui-button [uiMenuTrigger]="menu" variant="secondary" iconRight="chevron-down">Newest first</ui-button>
        </div>
        <ui-menu #menu [align]="align" ariaLabel="Sort links">
          <ui-menu-item icon="clock" type="radio" [selected]="true">Newest first</ui-menu-item>
          <ui-menu-item icon="clock" type="radio">Oldest first</ui-menu-item>
          <ui-menu-item icon="edit" type="radio">Title A to Z</ui-menu-item>
        </ui-menu>
      </div>`,
  }),
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('button')?.click();
  },
};

/** An icon-only trigger at the end of a row: the menu lines up with its right edge. */
export const IconOnlyTrigger: Story = {
  args: { align: MENU_ALIGN.End },
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div class="ms-end">
          <ui-button [uiMenuTrigger]="menu" variant="secondary" size="sm" iconOnly iconLeft="more"
            ariaLabel="More actions" />
        </div>
        <ui-menu #menu [align]="align" ariaLabel="Link actions">${linkItems}</ui-menu>
      </div>`,
  }),
};

/** A disabled item stays in the arrow order, is announced as disabled and cannot be chosen. */
export const DisabledItem: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div class="ms-row">
          <ui-button [uiMenuTrigger]="menu">Folder</ui-button>
        </div>
        <ui-menu #menu [align]="align" ariaLabel="Folder actions">
          <ui-menu-item icon="folder-plus">New subfolder</ui-menu-item>
          <ui-menu-item icon="edit">Rename</ui-menu-item>
          <ui-menu-item icon="folder-move" [disabled]="true">Move to…</ui-menu-item>
          <ui-menu-separator />
          <ui-menu-item icon="trash" danger>Delete folder…</ui-menu-item>
        </ui-menu>
      </div>`,
  }),
};

/** Current choice of a group: `is-selected` with `type="radio"`. */
export const SelectedChoice: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div class="ms-row">
          <ui-button [uiMenuTrigger]="menu" iconLeft="moon">Theme</ui-button>
        </div>
        <ui-menu #menu [align]="align" ariaLabel="Theme">
          <ui-menu-item icon="sun" type="radio">Light</ui-menu-item>
          <ui-menu-item icon="moon" type="radio">Dark</ui-menu-item>
          <ui-menu-item icon="monitor" type="radio" selected>System</ui-menu-item>
        </ui-menu>
      </div>`,
  }),
};

/** Right click opens the menu at the pointer; near an edge it flips and stays on screen. */
export const ContextMenu: Story = {
  render: (args) => ({
    props: args,
    moduleMetadata: { imports },
    template: `
      <div class="ms-panel">
        <div
          class="ms-context"
          tabindex="0"
          (contextmenu)="$event.preventDefault(); menu.openAt({ x: $event.clientX, y: $event.clientY })"
        >Right click anywhere in this box</div>
        <ui-menu #menu ariaLabel="Folder actions">
          <ui-menu-item>New subfolder</ui-menu-item>
          <ui-menu-item>Add link here</ui-menu-item>
          <ui-menu-item>Rename</ui-menu-item>
          <ui-menu-item>Move to…</ui-menu-item>
          <ui-menu-separator />
          <ui-menu-item danger>Delete folder…</ui-menu-item>
        </ui-menu>
      </div>`,
  }),
};

const variants = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="ms-panel">
    <p class="ms-hint">${theme} theme: static menus (open the stories above for the live popup)</p>
    <div class="ms-row">
      <ui-menu inline ariaLabel="Link actions" class="ms-static">${linkItems}</ui-menu>
      <ui-menu inline ariaLabel="Theme" class="ms-static">
        <ui-menu-item icon="sun" type="radio">Light</ui-menu-item>
        <ui-menu-item icon="moon" type="radio">Dark</ui-menu-item>
        <ui-menu-item icon="monitor" type="radio" selected>System</ui-menu-item>
        <ui-menu-separator />
        <ui-menu-item icon="download" [disabled]="true" shortcut="JSON or HTML">Export all links</ui-menu-item>
        <ui-menu-item icon="logout" danger>Sign out</ui-menu-item>
      </ui-menu>
    </div>
  </div>`;

/** Both themes: default, selected, disabled and danger items with icons and shortcuts. */
export const AllVariants: Story = {
  render: () => ({
    moduleMetadata: { imports },
    template: `${Object.values(THEME).map(variants).join('')}`,
  }),
};
