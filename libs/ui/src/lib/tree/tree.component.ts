import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';
import { RippleDirective } from '../ripple/ripple.directive';
import { UI_TREE_CONTEXT_MENU_TRIGGER } from './models/tree-context-menu-trigger.const';
import { TREE_KEY } from './models/tree-key.const';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import type { UiTreeToggleEvent } from './models/tree-toggle-event.interface';

/** Safety net: a pending keyboard echo is dropped after this long (a held key refreshes it). */
const KEYBOARD_ECHO_TIMEOUT_MS = 1000;
/** The echo can arrive just after the key is released. */
const KEYBOARD_ECHO_RELEASE_MS = 100;

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
  /** A keyboard menu request is pending; the browser's echoed `contextmenu` consumes it. */
  private keyboardEcho = false;
  private echoTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.echoTimer));
  }

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

  /** `id` of the count element of a row, or `null` for a row without a count. */
  protected countId(itemId: string, node: UiTreeNode): string | null {
    return node.count === undefined ? null : `${itemId}-count`;
  }

  /** The row is named by its name, then its count (never by its children). */
  protected labelledBy(itemId: string, node: UiTreeNode): string {
    const count = this.countId(itemId, node);
    return count ? `${itemId}-name ${count}` : `${itemId}-name`;
  }

  protected menuButtonLabel(node: UiTreeNode): string {
    return (this.menuLabel() ?? '').replace('{name}', () => node.name);
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
      this.contextMenu.emit({
        node,
        trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Button,
        anchor,
        position: null,
      });
    }
  }

  protected onContextMenu(event: MouseEvent, node: UiTreeNode, row: HTMLElement): void {
    event.preventDefault();
    if (this.keyboardEcho) {
      // The echo of the key press that already emitted: not a pointer request.
      this.disarmEcho();
      return;
    }
    const keyboard = event.clientX === 0 && event.clientY === 0;
    this.contextMenu.emit({
      node,
      trigger: keyboard
        ? UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard
        : UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
      anchor: row,
      position: keyboard ? null : { x: event.clientX, y: event.clientY },
    });
  }

  /**
   * Keys the row handles itself: the context-menu key, Shift+F10 and Alt+Enter open the folder
   * menu. Keys that come from the "..." button inside the row never reach the Aria tree (Enter
   * would choose the roving row, Space is blocked, letters would start a typeahead).
   */
  protected onKeydown(
    event: KeyboardEvent,
    node: UiTreeNode,
    row: HTMLElement,
    folder: boolean,
  ): void {
    const echoing =
      event.key === TREE_KEY.ContextMenu || (event.shiftKey && event.key === TREE_KEY.F10);
    if (folder && (echoing || (event.altKey && event.key === TREE_KEY.Enter))) {
      event.preventDefault();
      event.stopPropagation();
      // A held key repeats: one request, but the echo (context-menu key, Shift+F10) stays expected.
      if (!event.repeat) {
        this.contextMenu.emit({
          node,
          trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Keyboard,
          anchor: row,
          position: null,
        });
      }
      if (echoing) {
        this.armEcho();
      }
    } else if (event.target !== row) {
      event.stopPropagation();
    }
  }

  protected onKeyup(): void {
    if (this.keyboardEcho) {
      // The echo may arrive right after the release.
      this.scheduleDisarm(KEYBOARD_ECHO_RELEASE_MS);
    }
  }

  protected disarmEcho(): void {
    clearTimeout(this.echoTimer);
    this.keyboardEcho = false;
  }

  private armEcho(): void {
    this.keyboardEcho = true;
    this.scheduleDisarm(KEYBOARD_ECHO_TIMEOUT_MS);
  }

  private scheduleDisarm(delay: number): void {
    clearTimeout(this.echoTimer);
    this.echoTimer = setTimeout(() => this.disarmEcho(), delay);
  }
}
