/** Keys that scroll a page or a list when nothing editable has focus. */
const SCROLL_KEYS: readonly string[] = [
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown',
  ' ',
  'Spacebar',
];

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') !==
      null
  );
}

/**
 * True when the event (one of `USER_SCROLL_EVENTS`) means the person scrolls: a wheel turn, a
 * touch, a pointer press that is not inside a text field, or a scroll key (PageUp, PageDown,
 * Home, End, the vertical arrows, Space) that is not typed into an editable element. Typing in a
 * composer is not scrolling.
 */
export function isUserScrollInput(event: Event): boolean {
  if (event instanceof KeyboardEvent) {
    return SCROLL_KEYS.includes(event.key) && !isEditable(event.target);
  }
  if (event.type === 'pointerdown') {
    return !isEditable(event.target);
  }
  return true;
}
