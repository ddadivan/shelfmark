import { signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { MenuItemComponent } from '../menu/menu-item/menu-item.component';
import { MenuSeparatorComponent } from '../menu/menu-separator/menu-separator.component';
import { MenuComponent } from '../menu/menu.component';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import { TREE_STORY_ID } from './stories/tree-story-id.const';
import { TREE_STORY_DEEP } from './stories/tree-story-deep.const';
import { TREE_STORY_FIXED } from './stories/tree-story-fixed.const';
import { TREE_STORY_FLAT } from './stories/tree-story-flat.const';
import { TREE_STORY_LONG } from './stories/tree-story-long.const';
import { TREE_STORY_NESTED } from './stories/tree-story-nested.const';
import {
  reorderDropLine,
  setReorderDropLine,
} from '../../utils/reorder-drop-line/reorder-drop-line';
import { TreeComponent } from './tree.component';
import { THEME, THEME_ATTRIBUTE } from '../../models/theme';
import type { Theme } from '../../models/theme';

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
        [dropTargetId]="dropTargetId"
        [dropLabel]="dropLabel"
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

/**
 * A link is dragged over "Recipes": the row is the drop target (sage fill and ring, "Move here"
 * instead of the count). A closed folder under the target opens after 600 ms.
 */
export const DropTarget: Story = {
  args: { dropTargetId: TREE_STORY_ID.Recipes, dropLabel: 'Move here' },
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

/** Draws the reorder line in every open sub-folder list: the first row would land after the second. */
async function drawReorderLines(canvas: HTMLElement): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  for (const list of canvas.querySelectorAll<HTMLElement>(
    '.ui-tree__children.is-open > ul.ui-tree__group',
  )) {
    const items = [...list.querySelectorAll<HTMLElement>(':scope > .ui-tree__item')];
    if (items.length > 1) {
      const rowOf = (item: HTMLElement) =>
        item.querySelector<HTMLElement>(':scope > .ui-tree__row') ?? item;
      setReorderDropLine(list, reorderDropLine(list, items, items[0], 1, rowOf));
    }
  }
}

/**
 * Reorder line (#315): while a folder row drags among its siblings, the rows hold still and a
 * plain 2px accent line with rounded ends marks where it lands, centred in the gap and as wide as
 * the row's own background (the same inset on both sides, whatever the indent or chevron). It
 * fades in; under reduced motion it simply appears. Drawn here in Work's sub-folders, both themes.
 */
export const ReorderLine: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => ({
    props: { fixedNodes: TREE_STORY_FIXED, nested: TREE_STORY_NESTED, ids: TREE_STORY_ID },
    template: `${Object.values(THEME)
      .map(
        (theme) => `
          <div ${THEME_ATTRIBUTE}="${theme}" class="ts-panel ts-panel--variants">
            <p class="ts-hint">${theme} theme: the first sub-folder of Work lands after the second</p>
            <div class="ts-sidebar">
              <ui-tree ariaLabel="Reorder (${theme})" heading="Folders" menuLabel="Actions for {name}"
                reorderable [nodes]="nested" [activeId]="ids.Angular" />
            </div>
          </div>`,
      )
      .join('')}`,
  }),
  play: async ({ canvasElement }) => drawReorderLines(canvasElement),
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
