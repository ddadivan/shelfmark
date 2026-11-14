import type { ReorderDropLine } from './models/reorder-drop-line.interface';

const SHOWN_CLASS = 'ui-drop-line--shown';

/**
 * The place of the reorder line (#315) while a row of `list` is dragged. `items` are the list's
 * sortable elements in the order on screen, with the CDK placeholder where the dragged row was
 * (CDK moves the row itself out of the list); `targetIndex` is the place CDK would drop it
 * (`sorted` event `currentIndex`). The rows never move during the drag (only the line does), so
 * the line sits in the gap after the row at `targetIndex` when moving down, before it when moving
 * up, and is as wide as that row's background (`rowOf`: the element that paints it). `null` while
 * the row is over its own place: dropping there changes nothing.
 */
export function reorderDropLine(
  list: HTMLElement,
  items: readonly HTMLElement[],
  placeholder: HTMLElement,
  targetIndex: number,
  rowOf: (item: HTMLElement) => HTMLElement = (item) => item,
): ReorderDropLine | null {
  const source = items.indexOf(placeholder);
  const target = items[targetIndex];
  if (source < 0 || !target || targetIndex === source) {
    return null;
  }
  const down = targetIndex > source;
  const before = down ? target : items[targetIndex - 1];
  const after = down ? items[targetIndex + 1] : target;
  const above = before?.getBoundingClientRect().bottom;
  const below = after?.getBoundingClientRect().top;
  const gapCentre =
    above !== undefined && below !== undefined ? (above + below) / 2 : (above ?? below ?? 0);
  const box = list.getBoundingClientRect();
  const row = rowOf(target).getBoundingClientRect();
  return { top: gapCentre - box.top, left: row.left - box.left, width: row.width };
}

/**
 * Keeps the rows where they are while CDK sorts (#315): CDK slides the siblings and its
 * placeholder with inline `transform`s after every sort step; the reorder line does that job, so
 * those offsets are removed again (CDK keeps its own positions in its model, not in the DOM). Call
 * it from the `sorted` handler, which runs right after CDK wrote them.
 */
export function holdRowsStill(items: readonly HTMLElement[]): void {
  for (const item of items) {
    item.style.removeProperty('transform');
  }
}

/** Shows the line on `list` (the `reorder-drop-line` Sass mixin), or hides it with `null`. */
export function setReorderDropLine(list: HTMLElement, line: ReorderDropLine | null): void {
  list.classList.toggle(SHOWN_CLASS, line !== null);
  if (line) {
    list.style.setProperty('--ui-drop-line-top', `${line.top}px`);
    list.style.setProperty('--ui-drop-line-left', `${line.left}px`);
    list.style.setProperty('--ui-drop-line-width', `${line.width}px`);
  } else {
    list.style.removeProperty('--ui-drop-line-top');
    list.style.removeProperty('--ui-drop-line-left');
    list.style.removeProperty('--ui-drop-line-width');
  }
}
