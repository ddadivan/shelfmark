import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { MenuItemComponent } from '../menu/menu-item.component';
import { MenuSeparatorComponent } from '../menu/menu-separator.component';
import { MenuComponent } from '../menu/menu.component';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import { TREE_STORY_ID } from './stories/tree-story-id.const';
import { TREE_STORY_DEEP } from './stories/tree-story-deep.const';
import { TREE_STORY_FIXED } from './stories/tree-story-fixed.const';
import { TREE_STORY_FLAT } from './stories/tree-story-flat.const';
import { TREE_STORY_LONG } from './stories/tree-story-long.const';
import { TREE_STORY_NESTED } from './stories/tree-story-nested.const';
import { TreeComponent } from './tree.component';
import { THEME, THEME_ATTRIBUTE } from '../theme';
import type { Theme } from '../theme';

const meta: Meta<TreeComponent> = {
  title: 'Components/Tree',
  component: TreeComponent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Sidebar navigation on the Angular Aria tree: fixed entries, then the folder tree with counts. ' +
          'Up / Down, Home / End, Right / Left (open, close, step to child or parent), typing to jump, ' +
          'Enter or a click to choose. It only emits: `selected`, `toggled` and `contextMenu` (right click, ' +
          'the "..." button, Shift+F10 or the context-menu key); the feature routes and opens its `ui-menu`. ' +
          'Rows get the ripple; the chevron turns (120 ms) and children open by height (200 ms), both off ' +
          'under reduced motion.',
      },
    },
  },
  args: {
    ariaLabel: 'Library',
    heading: 'Folders',
    menuLabel: 'Actions for {name}',
    fixedNodes: TREE_STORY_FIXED,
    nodes: TREE_STORY_NESTED,
    activeId: TREE_STORY_ID.Angular,
  },
};

export default meta;
type Story = StoryObj<TreeComponent>;

const template = `
  <div class="ts-panel">
    <div class="ts-sidebar">
      <ui-tree
        [ariaLabel]="ariaLabel"
        [heading]="heading"
        [menuLabel]="menuLabel"
        [fixedNodes]="fixedNodes"
        [nodes]="nodes"
        [activeId]="activeId"
      />
    </div>
  </div>`;

/** Folders without nesting; the first fixed row is current. */
export const Flat: Story = {
  args: { nodes: TREE_STORY_FLAT, activeId: TREE_STORY_ID.All },
  render: (args) => ({ props: args, template }),
};

/** Work is open with the current folder inside it; Clothes is closed (Right opens it). */
export const Nested: Story = {
  render: (args) => ({ props: args, template }),
};

/** Five levels, 16px per level. */
export const DeepNesting: Story = {
  args: { nodes: TREE_STORY_DEEP, activeId: TREE_STORY_ID.Forms },
  render: (args) => ({ props: args, template }),
};

/** Long names are cut with an ellipsis; the count and the button keep their place. */
export const LongNames: Story = {
  args: { nodes: TREE_STORY_LONG, activeId: TREE_STORY_ID.Ml },
  render: (args) => ({ props: args, template }),
};

/** The active row is `accent-bg`; a different row is current here. */
export const SelectedState: Story = {
  args: { activeId: TREE_STORY_ID.Favorites },
  render: (args) => ({ props: args, template }),
};

/** No fixed entries, no menu button (no `menuLabel`). */
export const FoldersOnly: Story = {
  args: { fixedNodes: [], menuLabel: undefined, activeId: null },
  render: (args) => ({ props: args, template }),
};

/**
 * Right click opens the menu at the pointer; the "..." button, Shift+F10 and the context-menu key
 * open it below the button or the row. Choosing a row makes it current.
 */
export const WithContextMenu: Story = {
  render: (args) => ({
    props: {
      ...args,
      current: signal<string | null>(args.activeId ?? null),
      menuNodeId: signal<string | null>(null),
      open: (event: UiTreeContextMenuEvent, menu: MenuComponent) => {
        if (event.position) {
          menu.openAt(event.position);
        } else {
          menu.openFrom(event.anchor);
        }
      },
    },
    moduleMetadata: { imports: [MenuComponent, MenuItemComponent, MenuSeparatorComponent] },
    template: `
      <div class="ts-panel">
        <div class="ts-sidebar">
          <ui-tree
            ariaLabel="Library"
            [heading]="heading"
            [menuLabel]="menuLabel"
                [fixedNodes]="fixedNodes"
            [nodes]="nodes"
            [activeId]="current()"
            [menuNodeId]="menuNodeId()"
            (selected)="current.set($event.id)"
            (contextMenu)="menuNodeId.set($event.node.id); open($event, menu)"
          />
        </div>
        <ui-menu #menu ariaLabel="Folder actions" (closed)="menuNodeId.set(null)">
          <ui-menu-item icon="folder-plus">New subfolder</ui-menu-item>
          <ui-menu-item icon="edit">Rename</ui-menu-item>
          <ui-menu-item icon="folder-move">Move to…</ui-menu-item>
          <ui-menu-separator />
          <ui-menu-item icon="trash" danger>Delete folder…</ui-menu-item>
        </ui-menu>
      </div>`,
  }),
};

const variants = (theme: Theme) => `
  <div ${THEME_ATTRIBUTE}="${theme}" class="ts-panel ts-panel--variants">
    <p class="ts-hint">${theme} theme: nested open and closed, current row, long names</p>
    <div class="ts-row">
      <div class="ts-sidebar">
        <ui-tree ariaLabel="Library (${theme})" heading="Folders" menuLabel="Actions for {name}"
          [fixedNodes]="fixedNodes" [nodes]="nested" [activeId]="ids.Angular" />
      </div>
      <div class="ts-sidebar">
        <ui-tree ariaLabel="Long names (${theme})" heading="Folders" menuLabel="Actions for {name}"
          [nodes]="long" [activeId]="ids.Ml" />
      </div>
    </div>
  </div>`;

/** Both themes: fixed rows, nested open and closed folders, the active row, long names. */
export const AllVariants: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    props: {
      fixedNodes: TREE_STORY_FIXED,
      nested: TREE_STORY_NESTED,
      long: TREE_STORY_LONG,
      ids: { Angular: TREE_STORY_ID.Angular, Ml: TREE_STORY_ID.Ml },
    },
    template: `${Object.values(THEME).map(variants).join('')}`,
  }),
};
