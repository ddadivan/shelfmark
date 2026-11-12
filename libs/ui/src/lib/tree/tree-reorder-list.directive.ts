import { DragDrop, type DragRef, type DropListRef } from '@angular/cdk/drag-drop';
import { DestroyRef, Directive, ElementRef, inject, output, signal } from '@angular/core';
import type { TreeReorderDrop } from './models/tree-reorder-drop.interface';
import { holdRowsStill, reorderDropLine, setReorderDropLine } from './reorder-drop-line';

/** One registered row of a sibling list. */
interface TreeReorderEntry {
  readonly id: () => string;
  readonly enabled: () => boolean;
  readonly ref: DragRef;
  readonly element: HTMLElement;
}

/** `elements` sorted in document order. */
function inDomOrder(elements: HTMLElement[]): HTMLElement[] {
  return [...elements].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
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
 * never connected, so a row only moves among its siblings. While a row drags the rows stay where
 * they are and the list draws the reorder line where it would land (#315). Internal to `ui-tree`.
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
  /** A row of this list is being dragged: the siblings hold still, the line shows the place. */
  protected readonly sorting = signal(false);
  /** A row was dropped (also when it lands where it started). */
  readonly dropped = output<TreeReorderDrop>();
  /** A drag of one of its rows started (the row's id). */
  readonly started = output<string>();

  constructor() {
    this.ref.withOrientation('vertical');
    this.ref.lockAxis = 'y';
    const started = this.ref.beforeStarted.subscribe(() => {
      this.sync();
      this.ref.withScrollableParents(scrollableParents(this.element));
      this.sorting.set(true);
      const entry = [...this.entries].find((candidate) => candidate.ref.isDragging());
      if (entry) {
        this.started.emit(entry.id());
      }
    });
    const sorted = this.ref.sorted.subscribe((event) => this.drawLine(event.currentIndex));
    const dropped = this.ref.dropped.subscribe((event) => {
      this.sorting.set(false);
      setReorderDropLine(this.element, null);
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
      sorted.unsubscribe();
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

  /** The line before or after the row now at `index` (CDK's place), with the rows as they stand. */
  private drawLine(index: number): void {
    const dragged = [...this.entries].find((entry) => entry.ref.isDragging());
    if (!dragged) {
      return;
    }
    // The dragged row itself is out of the list (CDK parks it): its placeholder holds its place.
    const placeholder = dragged.ref.getPlaceholderElement();
    const items = inDomOrder(
      [...this.entries]
        .filter((entry) => entry.enabled())
        .map((entry) => (entry === dragged ? placeholder : entry.element)),
    );
    holdRowsStill(items);
    setReorderDropLine(
      this.element,
      reorderDropLine(
        this.element,
        items,
        placeholder,
        index,
        (item) => item.querySelector<HTMLElement>(':scope > .ui-tree__row') ?? item,
      ),
    );
  }

  /** The draggable rows in DOM order (the order the user sees). */
  private ordered(): TreeReorderEntry[] {
    const enabled = [...this.entries].filter((entry) => entry.enabled());
    const order = inDomOrder(enabled.map((entry) => entry.element));
    return enabled.sort((a, b) => order.indexOf(a.element) - order.indexOf(b.element));
  }

  /** Hands CDK the draggable rows in DOM order (the order the user sees). */
  sync(): void {
    this.ref.withItems(this.ordered().map((entry) => entry.ref));
  }
}
