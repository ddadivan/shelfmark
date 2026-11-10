import { OVERLAY_SIDE } from '../overlay/models/overlay-side.const';
import { TooltipDirective } from '../tooltip/tooltip.directive';
import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  afterNextRender,
  afterRenderEffect,
  ElementRef,
  signal,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { FOLDER_ICON_SIZE } from '../folder-icon/models/folder-icon-size.const';
import { IconComponent } from '../icon/icon.component';
import { LongPressDirective } from '../long-press/long-press.directive';
import type { UiLongPressEvent } from '../long-press/models/long-press-event.interface';
import { RippleDirective } from '../ripple/ripple.directive';
import { UI_TREE_CONTEXT_MENU_TRIGGER } from './models/tree-context-menu-trigger.const';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import type { UiTreeToggleEvent } from './models/tree-toggle-event.interface';
import { KEYBOARD_KEY } from '../keyboard';
import type { TreeRowPlace } from './models/tree-row-place.interface';
import { ICON_SIZE } from '../icon/models/icon-size.const';

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
 * A button with the `uiTreeHeadingAction` attribute is shown at the end of the heading row (for
 * example "Create a folder"); it is outside the tree element, which only allows rows.
 *
 * Presentational: it emits `selected`, `toggled` and `contextMenu`; the feature routes and opens
 * its `ui-menu` (`openAt(position)` for a right click, `openFrom(anchor)` for the "..." button
 * and Shift+F10 / the context-menu key). Every string comes in through an input.
 */
@Component({
  selector: 'ui-tree',
  imports: [
    ButtonComponent,
    FolderIconComponent,
    IconComponent,
    LongPressDirective,
    NgTemplateOutlet,
    RippleDirective,
    TooltipDirective,
    Tree,
    TreeItem,
    TreeItemGroup,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusin)': 'onFocusin($event)',
    '(focusout)': 'onFocusout($event)',
  },
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
})
export class TreeComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;
  /**
   * The row's "…" tooltip opens to the right, towards the content: below the row it would cover
   * the next row or the section header ("+" of Tags) and keep a resting pointer trapped on it.
   */
  protected readonly MORE_TOOLTIP_SIDE = OVERLAY_SIDE.Right;
  /** A keyboard menu request is pending; the browser's echoed `contextmenu` consumes it. */
  private keyboardEcho = false;
  private echoTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly injector = inject(Injector);
  private readonly tree = viewChild.required(Tree);
  private readonly items = viewChildren(TreeItem);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly section = viewChild<ElementRef<HTMLElement>>('section');
  /** Top of the heading row inside the host; the action button is placed there. */
  protected readonly actionTop = signal(0);
  /** Height of the text area of the heading row: the action is centred on it, not on the padding. */
  protected readonly actionHeight = signal(0);
  /** Where every row has been seen (kept for removed rows, so focus can find a neighbour). */
  private readonly lastKnown = new Map<string, TreeRowPlace>();
  /** The row that held focus last; cleared when focus moves to another element. */
  private focused: { readonly id: string; readonly element: HTMLElement } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.echoTimer));
    afterRenderEffect(() => {
      this.heading();
      this.fixedNodes();
      this.measureHeading();
    });
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.measureHeading());
      observer.observe(this.host);
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
    effect(() => {
      this.remember();
      // The rows are re-rendered after this effect: look at them then.
      if (this.focused) {
        afterNextRender(() => this.restoreIfDropped(), { injector: this.injector });
      }
    });
  }

  /** Reads where the heading row is (it moves with the fixed rows above it and their size). */
  private measureHeading(): void {
    const section = this.section()?.nativeElement;
    if (section) {
      const style = getComputedStyle(section);
      const paddingTop = parseFloat(style.paddingTop);
      this.actionTop.set(section.offsetTop + paddingTop);
      this.actionHeight.set(section.clientHeight - paddingTop - parseFloat(style.paddingBottom));
    }
  }

  /**
   * Moves focus to the row `id`. Returns `false` (and moves nothing) when there is no such row
   * or it is hidden inside a collapsed folder.
   */
  focusRow(id: string): boolean {
    const item = this.items().find((candidate) => candidate.value() === id);
    if (!item?.visible()) {
      return false;
    }
    // Make it the Aria tree's active row first: with roving focus the arrow keys move from the
    // active row, so a plain DOM focus would leave Up / Down / Right / Left acting elsewhere.
    this.tree()._pattern.activeItem.set(item._pattern);
    item.element.focus();
    return true;
  }

  /**
   * Gives focus back to the row nearest to `id` after that row went away (removed, or moved under
   * a collapsed folder): the row itself when it is still visible, else its nearest visible
   * ancestor, else (a removed row) the parent it had, its previous sibling, and last the first
   * row. Returns the id of the row that took focus, or `null` when the tree has no row.
   */
  restoreFocusNear(id: string): string | null {
    const first = this.items()
      .find((item) => item.visible())
      ?.value();
    const known = this.lastKnown.get(id);
    const candidates = [id, ...this.ancestors(id), known?.parent, known?.previous, first];
    for (const candidate of candidates) {
      if (candidate != null && this.focusRow(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  protected onFocusin(event: FocusEvent): void {
    const target = event.target;
    const item = this.items().find((candidate) => candidate.element === target);
    if (item) {
      this.focused = { id: item.value(), element: item.element };
    }
  }

  protected onFocusout(event: FocusEvent): void {
    // `relatedTarget` is `null` while the row is removed (or the window loses focus): keep it.
    if (event.relatedTarget !== null) {
      this.focused = null;
    }
  }

  /** The row that held focus left the page and focus fell to <body>: move it to a neighbour. */
  private restoreIfDropped(): void {
    const focused = this.focused;
    const active = document.activeElement;
    if (focused && !focused.element.isConnected && (!active || active === document.body)) {
      this.focused = null;
      this.restoreFocusNear(focused.id);
    }
  }

  /** Ids of the parents of `id` now, nearest first. */
  private ancestors(id: string): string[] {
    const chain: string[] = [];
    let parent = this.lastKnown.get(id)?.parent;
    while (parent && !chain.includes(parent)) {
      chain.push(parent);
      parent = this.lastKnown.get(parent)?.parent;
    }
    return chain;
  }

  /** Records the place of every current row. */
  private remember(): void {
    const walk = (list: readonly UiTreeNode[], parent: string | null): void => {
      list.forEach((node, index) => {
        this.lastKnown.set(node.id, { parent, previous: list[index - 1]?.id ?? null });
        walk(node.children ?? [], node.id);
      });
    };
    walk(this.fixedNodes(), null);
    walk(this.nodes(), null);
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

  /** Touch route to the folder menu: iOS Safari fires no `contextmenu`, so a long press opens it. */
  protected onLongPress(event: UiLongPressEvent, node: UiTreeNode, row: HTMLElement): void {
    this.contextMenu.emit({
      node,
      trigger: UI_TREE_CONTEXT_MENU_TRIGGER.Pointer,
      anchor: row,
      position: { x: event.x, y: event.y },
    });
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
      event.key === KEYBOARD_KEY.ContextMenu || (event.shiftKey && event.key === KEYBOARD_KEY.F10);
    if (folder && (echoing || (event.altKey && event.key === KEYBOARD_KEY.Enter))) {
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
