/** What `uiLongPress` emits: the element that was pressed and the pointer position. */
export interface UiLongPressEvent {
  /** The host element of the directive; pass it to `ui-menu.openFrom` as an anchor. */
  origin: HTMLElement;
  /** Viewport position of the pointer; pass `{ x, y }` to `ui-menu.openAt`. */
  x: number;
  y: number;
}
