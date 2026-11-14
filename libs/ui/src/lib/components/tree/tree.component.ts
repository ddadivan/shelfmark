import { OVERLAY_SIDE } from '../../services/overlay/models/overlay-side.const';
import { TooltipDirective } from '../../directives/tooltip/tooltip.directive';
import { NgTemplateOutlet } from '@angular/common';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  afterRenderEffect,
  ElementRef,
  signal,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { FolderIconComponent } from '../folder-icon/folder-icon.component';
import { FOLDER_COLOUR } from '../folder-icon/models/folder-colour.const';
import { FOLDER_ICON_SIZE } from '../folder-icon/models/folder-icon-size.const';
import { IconComponent } from '../icon/icon.component';
import { LongPressDirective } from '../../directives/long-press/long-press.directive';
import { RippleDirective } from '../../directives/ripple/ripple.directive';
import type { UiTreeContextMenuEvent } from './models/tree-context-menu-event.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import type { UiTreeToggleEvent } from './models/tree-toggle-event.interface';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { TREE_DROP_OPEN_DELAY_MS } from './models/tree-drop-open-delay.const';
import type { TreeReorderDrop } from './models/tree-reorder-drop.interface';
import type { UiTreeReorderEvent } from './models/tree-reorder-event.interface';
import { UI_TREE_REORDER_TRIGGER } from './models/tree-reorder-trigger.const';
import type { UiTreeReorderTrigger } from './models/tree-reorder-trigger.type';
import { TreeReorderItemDirective } from './tree-reorder-item.directive';
import { TreeReorderListDirective } from './tree-reorder-list.directive';
import { TreeContextMenu } from './tree-context-menu';
import { TreeFocus } from './tree-focus';
import { reorderStep } from './tree-keys';
import { indexTreeNodes } from './tree-nodes';

/**
 * Sidebar navigation: fixed entries, then a heading and the nested folder tree with counts, on
 * the Angular Aria tree in navigation mode (roving focus; Up / Down, Home / End, Right / Left
 * to open, close or step to the child / parent, typing to jump, Enter or a click to choose;
 * `aria-expanded`, `aria-level`, `aria-current` on the active row).
 *
 * A button with the `uiTreeHeadingAction` attribute is shown at the end of the heading row (for
 * example "Create a folder"); it is outside the tree element, which only allows rows.
 *
 * With `reorderable`, folder rows also move among their siblings (never to another parent): drag
 * a row with a mouse, or with a finger after a short rest (CDK drag and drop, a reserved slot marks
 * the place), or press Alt+Up / Alt+Down on the focused row; all emit `reordered`, and the row
 * keeps focus after a keyboard move.
 *
 * Presentational: it emits `selected`, `toggled`, `contextMenu` and `reordered`; the feature routes and opens
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
    TreeReorderItemDirective,
    TreeReorderListDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusin)': 'focus.onFocusin($event)',
    '(focusout)': 'focus.onFocusout($event)',
  },
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss', './tree-drop.scss', './tree-reorder.scss'],
})
export class TreeComponent {
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
  /**
   * `id` of the row under a dragged item (drag and drop is the feature's): the row is highlighted,
   * shows `dropLabel` instead of its count, and a closed folder opens after
   * `TREE_DROP_OPEN_DELAY_MS`. Every row carries its id in `data-ui-tree-id` for hit testing.
   */
  readonly dropTargetId = input<string | null>(null);
  /**
   * Ids of rows that cannot take what is dragged (the feature passes them only while dragging):
   * they show a no-drop cursor and a muted state, never the drop highlight.
   */
  readonly noDropIds = input<readonly string[]>([]);
  /** Badge text on the drop target row ("Move here"); none when empty. */
  readonly dropLabel = input<string>();
  /**
   * Folder rows can be reordered among their siblings: dragged with a mouse, by touch after a
   * rest of `TREE_REORDER_TOUCH_DELAY_MS` and a move (a swipe scrolls, a hold opens the menu), or
   * moved with Alt+Up / Alt+Down. The tree only emits `reordered`; the feature saves the order.
   */
  readonly reorderable = input(false, { transform: booleanAttribute });
  /** A folder row asks for another place among its siblings (see `UiTreeReorderEvent`). */
  readonly reordered = output<UiTreeReorderEvent>();
  /**
   * A pointer or touch drag of a folder row started. A long press may have opened the row menu
   * just before (press, hold, then move, as on iOS): the feature closes it here.
   */
  readonly reorderStarted = output<UiTreeNode>();
  /** A row was chosen (click, Enter). */
  readonly selected = output<UiTreeNode>();
  /** A folder opened or closed. */
  readonly toggled = output<UiTreeToggleEvent>();
  /** The folder menu was requested: right click, "..." button, Shift+F10 or the context-menu key. */
  readonly contextMenu = output<UiTreeContextMenuEvent>();

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;
  protected readonly FOLDER_COLOUR = FOLDER_COLOUR;
  /**
   * The row's "…" tooltip opens to the right, towards the content: below the row it would cover
   * the next row or the section header ("+" of Tags) and keep a resting pointer trapped on it.
   */
  protected readonly MORE_TOOLTIP_SIDE = OVERLAY_SIDE.Right;

  private readonly tree = viewChild.required<Tree<string>>(Tree);
  private readonly items = viewChildren<TreeItem<string>>(TreeItem);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly section = viewChild<ElementRef<HTMLElement>>('section');
  /** Top of the heading row inside the host; the action button is placed there. */
  protected readonly actionTop = signal(0);
  /** Height of the text area of the heading row: the action is centred on it, not on the padding. */
  protected readonly actionHeight = signal(0);

  protected readonly focus = new TreeFocus(this.tree, this.items, () => [
    this.fixedNodes(),
    this.nodes(),
  ]);
  protected readonly menu = new TreeContextMenu((event) => this.contextMenu.emit(event));

  protected readonly selectedValue = computed(() => {
    const id = this.activeId();
    return id === null ? [] : [id];
  });

  private readonly nodesById = computed(() => indexTreeNodes(this.fixedNodes(), this.nodes()));

  constructor() {
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
    // Drag and drop: a closed folder under the drop target opens after a short rest.
    effect((onCleanup) => {
      const id = this.dropTargetId();
      if (id === null) {
        return;
      }
      const timer = setTimeout(() => {
        const item = this.focus.item(id);
        if (item && this.nodesById().get(id)?.children?.length && !item.expanded()) {
          item.expanded.set(true);
        }
      }, TREE_DROP_OPEN_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  /**
   * Opens the collapsed folders above the row `id`, so it is visible (and `focusRow` can reach
   * it). Does nothing for an unknown row or one that is already shown.
   */
  revealRow(id: string): void {
    this.focus.reveal(id);
  }

  /**
   * Moves focus to the row `id`. Returns `false` (and moves nothing) when there is no such row
   * or it is hidden inside a collapsed folder.
   */
  focusRow(id: string): boolean {
    return this.focus.focus(id);
  }

  /**
   * Gives focus back to the row nearest to `id` after that row went away (removed, or moved under
   * a collapsed folder): the row itself when it is still visible, else its nearest visible
   * ancestor, else (a removed row) the parent it had, its previous sibling, and last the first
   * row. Returns the id of the row that took focus, or `null` when the tree has no row.
   */
  restoreFocusNear(id: string): string | null {
    return this.focus.restoreNear(id);
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

  /** The row is named by its name, then its count or drop badge (never by its children). */
  protected labelledBy(itemId: string, node: UiTreeNode): string {
    // The drop target's badge replaces the count, in the name too ("Recipes Move here").
    if (this.dropTargetId() === node.id && this.dropLabel()) {
      return `${itemId}-name ${itemId}-drop`;
    }
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

  /**
   * Keys the row handles itself: Alt+Up / Alt+Down move a folder among its siblings (with
   * `reorderable`); the context-menu key, Shift+F10 and Alt+Enter open the folder menu. Keys that
   * come from the "..." button inside the row never reach the Aria tree (Enter would choose the
   * roving row, Space is blocked, letters would start a typeahead).
   */
  protected onKeydown(
    event: KeyboardEvent,
    node: UiTreeNode,
    row: HTMLElement,
    folder: boolean,
  ): void {
    if (folder && event.target === row && this.reorderByKey(event, node)) {
      return;
    }
    if (folder && this.menu.fromKey(event, node, row)) {
      return;
    }
    if (event.target !== row) {
      event.stopPropagation();
    }
  }

  /** A row drag started: no row menu until it is dropped, and the feature hears of it. */
  protected onReorderStarted(id: string): void {
    this.menu.dragging = true;
    const node = this.nodesById().get(id);
    if (node) {
      this.reorderStarted.emit(node);
    }
  }

  /** A drag ended in the sibling list of `parentId` (`null` = the top level). */
  protected onDropped(drop: TreeReorderDrop, parentId: string | null): void {
    this.menu.dragging = false;
    if (drop.previousIndex !== drop.currentIndex) {
      this.emitReorder(drop.id, parentId, drop.currentIndex, UI_TREE_REORDER_TRIGGER.Pointer);
    }
  }

  /** Alt+Up / Alt+Down on a folder row: one place up or down among its siblings. */
  private reorderByKey(event: KeyboardEvent, node: UiTreeNode): boolean {
    const step = reorderStep(event);
    if (!this.reorderable() || step === 0) {
      return false;
    }
    // Ours, also at the ends: Aria must not read Alt+arrow as a plain arrow.
    event.preventDefault();
    event.stopPropagation();
    const parentId = this.focus.parentOf(node.id);
    const siblings = this.siblingsOf(parentId);
    const from = siblings.findIndex((sibling) => sibling.id === node.id);
    const to = from + step;
    if (from >= 0 && to >= 0 && to < siblings.length) {
      this.focus.refocusAfterRender(node.id);
      this.emitReorder(node.id, parentId, to, UI_TREE_REORDER_TRIGGER.Keyboard);
    }
    return true;
  }

  private emitReorder(
    id: string,
    parentId: string | null,
    toIndex: number,
    trigger: UiTreeReorderTrigger,
  ): void {
    const siblings = this.siblingsOf(parentId);
    const fromIndex = siblings.findIndex((sibling) => sibling.id === id);
    if (fromIndex < 0) {
      return;
    }
    this.reordered.emit({
      node: siblings[fromIndex],
      parentId,
      fromIndex,
      toIndex,
      total: siblings.length,
      trigger,
    });
  }

  /** The folder rows under `parentId` (`null` = the top level) as they are now. */
  private siblingsOf(parentId: string | null): readonly UiTreeNode[] {
    return parentId === null ? this.nodes() : (this.nodesById().get(parentId)?.children ?? []);
  }
}
