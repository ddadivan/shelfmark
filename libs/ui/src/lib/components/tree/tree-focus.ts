import type { Tree, TreeItem } from '@angular/aria/tree';
import { afterNextRender, effect, inject, Injector, type Signal } from '@angular/core';
import type { TreeRowPlace } from './models/tree-row-place.interface';
import type { UiTreeNode } from './models/tree-node.interface';
import { treeAncestors, treeRowPlaces } from './tree-nodes';

/**
 * The focus half of `ui-tree`: reveals and focuses rows (keeping the Aria tree's active row in
 * step), gives a row focus back once a keyboard move is drawn, and moves focus to a neighbour when
 * the focused row leaves the page (removed, or moved under a collapsed folder). It remembers where
 * every row has been seen, so a removed row still has a parent and a previous sibling to fall back
 * to. Create it in the component's injection context.
 */
export class TreeFocus {
  private readonly injector = inject(Injector);
  /** Where every row has been seen (kept for removed rows, so focus can find a neighbour). */
  private readonly places = new Map<string, TreeRowPlace>();
  /** A row moved with the keyboard: it takes focus back once the new order is on screen. */
  private refocusId: string | null = null;
  /** The row that held focus last; cleared when focus moves to another element. */
  private focused: { readonly id: string; readonly element: HTMLElement } | null = null;

  constructor(
    private readonly tree: Signal<Tree<string>>,
    private readonly items: Signal<readonly TreeItem<string>[]>,
    rows: () => readonly (readonly UiTreeNode[])[],
  ) {
    effect(() => {
      for (const [id, place] of treeRowPlaces(...rows())) {
        this.places.set(id, place);
      }
      // The rows are re-rendered after this effect: look at them then.
      if (this.refocusId !== null) {
        const id = this.refocusId;
        afterNextRender(
          () => {
            if (this.refocusId === id) {
              this.refocusId = null;
              this.focus(id);
            }
          },
          { injector: this.injector },
        );
      } else if (this.focused) {
        afterNextRender(() => this.restoreIfDropped(), { injector: this.injector });
      }
    });
  }

  /** `id` of the parent of the row `id` as last seen; `null` at the top level. */
  parentOf(id: string): string | null {
    return this.places.get(id)?.parent ?? null;
  }

  /** The Aria item of the row `id`, if it is rendered. */
  item(id: string): TreeItem<string> | undefined {
    return this.items().find((candidate) => candidate.value() === id);
  }

  /** Opens the collapsed folders above the row `id`. */
  reveal(id: string): void {
    for (const ancestor of treeAncestors(id, this.places).reverse()) {
      const item = this.item(ancestor);
      if (item && !item.expanded()) {
        item.expanded.set(true);
      }
    }
  }

  /** Focuses the row `id`; `false` when there is no such row or it is hidden. */
  focus(id: string): boolean {
    const item = this.item(id);
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
   * Focuses the row `id` when visible, else its nearest visible ancestor, else (a removed row) the
   * parent it had, its previous sibling, and last the first row. Returns the id that took focus.
   */
  restoreNear(id: string): string | null {
    const first = this.items()
      .find((item) => item.visible())
      ?.value();
    const known = this.places.get(id);
    const candidates = [
      id,
      ...treeAncestors(id, this.places),
      known?.parent,
      known?.previous,
      first,
    ];
    for (const candidate of candidates) {
      if (candidate != null && this.focus(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  /** The row `id` takes focus back once the next order is drawn (a keyboard move). */
  refocusAfterRender(id: string): void {
    this.refocusId = id;
  }

  onFocusin(event: FocusEvent): void {
    const item = this.items().find((candidate) => candidate.element === event.target);
    if (item) {
      this.focused = { id: item.value(), element: item.element };
    }
  }

  onFocusout(event: FocusEvent): void {
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
      this.restoreNear(focused.id);
    }
  }
}
