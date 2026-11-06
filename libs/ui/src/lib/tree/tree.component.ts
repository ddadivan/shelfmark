import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { RippleDirective } from '../ripple/ripple.directive';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import type { UiTreeToggleEvent } from './models/tree-toggle-event.interface';

/** Browsers echo a keyboard context-menu request as `contextmenu` within this window. */
const KEYBOARD_CONTEXT_MENU_ECHO_MS = 750;

/**
 * Sidebar navigation: fixed entries, then a heading and the nested folder tree with counts, on
 * the Angular Aria tree in navigation mode (roving focus; Up / Down, Home / End, Right / Left
 * to open, close or step to the child / parent, typing to jump, Enter or a click to choose;
 * `aria-expanded`, `aria-level`, `aria-current` on the active row).
 *
 * Presentational: it emits `selected`, `toggled` and `contextMenu`; the feature routes and opens
 * its `ui-menu` (`openAt(position)` for a right click, `openFrom(anchor)` for the "..." button
 * and Shift+F10 / the context-menu key). Every string comes in through an input.
 */
@Component({
  selector: 'ui-tree',
  imports: [
    ButtonComponent,
    IconComponent,
    NgTemplateOutlet,
    RippleDirective,
    Tree,
    TreeItem,
    TreeItemGroup,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
})
export class TreeComponent {
  private keyboardMenuAt = Number.NEGATIVE_INFINITY;

  /** Folder tree, shown after the heading. Rows nest by `children`. */
  readonly nodes = input<readonly UiTreeNode[]>([]);
  /** Fixed entries before the folders (All links, Unsorted, Favorites); flat, no menu button. */
  readonly fixedNodes = input<readonly UiTreeNode[]>([]);
  /** `id` of the current row (`aria-current`); `null` for none. */
  readonly activeId = input<string | null>(null);
  /** Section heading above `nodes` (for example "Folders"). */
  readonly heading = input<string>();
  /** Accessible name of the tree. */
  readonly ariaLabel = input<string>();
  /**
   * Accessible name of each "..." button; `{name}` becomes the folder name, for example
   * "Actions for {name}". Without it folder rows have no button (right click and the keyboard
   * still work).
   */
  readonly menuLabel = input<string>();
  /** `id` of the folder whose menu is open: its button shows `aria-expanded="true"` and stays visible. */
  readonly menuNodeId = input<string | null>(null);
  /** A row was chosen (click, Enter). */
  readonly selected = output<UiTreeNode>();
  /** A folder opened or closed. */
  readonly toggled = output<UiTreeToggleEvent>();
  /** The folder menu was requested: right click, "..." button, Shift+F10 or the context-menu key. */
  readonly contextMenu = output<UiTreeContextMenuEvent>();

  protected readonly selectedValue = computed(() => {
    const id = this.activeId();
    return id === null ? [] : [id];
  });

  private readonly nodesById = computed(() => {
    const map = new Map<string, UiTreeNode>();
    const walk = (list: readonly UiTreeNode[]): void => {
      for (const node of list) {
        map.set(node.id, node);
        walk(node.children ?? []);
      }
    };
    walk(this.fixedNodes());
    walk(this.nodes());
    return map;
  });

  protected onValueChange(ids: readonly string[]): void {
    const node = this.nodesById().get(ids.at(-1) ?? '');
    if (node) {
      this.selected.emit(node);
    }
  }

  /** Picks the id that the template builds `aria-labelledby` from: name, then the count. */
  protected labelledBy(itemId: string, node: UiTreeNode): string {
    if (node.count === undefined) {
      return `${itemId}-name`;
    }
    return `${itemId}-name ${itemId}-count`;
  }

  protected menuButtonLabel(node: UiTreeNode): string {
    return (this.menuLabel() ?? '').replace('{name}', node.name);
  }

  /** Twisty click: toggles without choosing the row (the Aria click handler never sees it). */
  protected onTwist(
    event: Event,
    expanded: { update(fn: (value: boolean) => boolean): void },
  ): void {
    event.stopPropagation();
    expanded.update((value) => !value);
  }

  protected onButton(event: Event, node: UiTreeNode, button: ButtonComponent): void {
    // Not a row click: the Aria handler would choose the row and toggle it.
    event.stopPropagation();
    const anchor = button.element();
    if (anchor) {
      this.contextMenu.emit({ node, trigger: 'button', anchor, position: null });
    }
  }

  protected onContextMenu(event: MouseEvent, node: UiTreeNode, row: HTMLElement): void {
    event.preventDefault();
    // The context-menu key also fires `contextmenu` on the focused row, right after the keydown
    // that already emitted: it is not a pointer request.
    if (event.timeStamp - this.keyboardMenuAt < KEYBOARD_CONTEXT_MENU_ECHO_MS) {
      return;
    }
    this.contextMenu.emit({
      node,
      trigger: 'pointer',
      anchor: row,
      position: { x: event.clientX, y: event.clientY },
    });
  }

  protected onKeydown(event: KeyboardEvent, node: UiTreeNode, row: HTMLElement): void {
    const requested = event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10');
    if (!requested) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.keyboardMenuAt = event.timeStamp;
    this.contextMenu.emit({ node, trigger: 'keyboard', anchor: row, position: null });
  }
}
