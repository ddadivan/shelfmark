import { DragDrop, type DragRef, type DropListRef } from '@angular/cdk/drag-drop';
import { DestroyRef, Directive, ElementRef, inject, output, signal } from '@angular/core';
import type { TreeReorderDrop } from './models/tree-reorder-drop.interface';

/** One registered row of a sibling list. */
interface TreeReorderEntry {
  readonly id: () => string;
  readonly enabled: () => boolean;
  readonly ref: DragRef;
  readonly element: HTMLElement;
}

/** Ancestors that scroll: CDK keeps its cached positions right while one of them scrolls. */
function scrollableParents(element: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      found.push(node);
    }
  }
  return found;
}

/**
 * One sibling list of `ui-tree` (the top level or one folder's group) as a CDK drop list. The
 * rows are registered by `uiTreeReorderItem` with an explicit list reference: the tree renders
 * its levels from one recursive template, where DI cannot reach the enclosing list. Lists are
 * never connected, so a row only moves among its siblings. Internal to `ui-tree`.
 */
@Directive({
  selector: '[uiTreeReorderList]',
  exportAs: 'uiTreeReorderList',
  host: { '[class.ui-tree__list--sorting]': 'sorting()' },
})
export class TreeReorderListDirective {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly ref: DropListRef = inject(DragDrop).createDropList(this.element);
  private readonly entries = new Set<TreeReorderEntry>();
  /** A row of this list is being dragged: the siblings animate aside. */
  protected readonly sorting = signal(false);
  /** A row was dropped (also when it lands where it started). */
  readonly dropped = output<TreeReorderDrop>();

  constructor() {
    this.ref.withOrientation('vertical');
    this.ref.lockAxis = 'y';
    const started = this.ref.beforeStarted.subscribe(() => {
      this.sync();
      this.ref.withScrollableParents(scrollableParents(this.element));
      this.sorting.set(true);
    });
    const dropped = this.ref.dropped.subscribe((event) => {
      this.sorting.set(false);
      const entry = [...this.entries].find((candidate) => candidate.ref === event.item);
      if (entry) {
        this.dropped.emit({
          id: entry.id(),
          previousIndex: event.previousIndex,
          currentIndex: event.currentIndex,
        });
      }
    });
    inject(DestroyRef).onDestroy(() => {
      started.unsubscribe();
      dropped.unsubscribe();
      this.ref.dispose();
    });
  }

  register(entry: TreeReorderEntry): void {
    this.entries.add(entry);
    this.sync();
  }

  unregister(entry: TreeReorderEntry): void {
    this.entries.delete(entry);
    this.sync();
  }

  /** Hands CDK the draggable rows in DOM order (the order the user sees). */
  sync(): void {
    const sorted = [...this.entries]
      .filter((entry) => entry.enabled())
      .sort((a, b) =>
        a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );
    this.ref.withItems(sorted.map((entry) => entry.ref));
  }
}
