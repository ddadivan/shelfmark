/** Elements that are about to get their focus back (a trigger a modal will return focus to). */
const pending = new WeakSet<Element>();

let tracking = false;
let lastInputPointer = false;

/**
 * Starts remembering whether the last input was a pointer press or a key (capture listeners on the
 * document, installed once). A modal reads it when it opens to know how its trigger was activated.
 * Called by `DialogService` and `DrawerService`, which exist before the first click.
 */
export function trackInputModality(): void {
  if (tracking || typeof document === 'undefined') {
    return;
  }
  tracking = true;
  document.addEventListener(
    'pointerdown',
    () => {
      lastInputPointer = true;
    },
    true,
  );
  document.addEventListener(
    'keydown',
    () => {
      lastInputPointer = false;
    },
    true,
  );
}

/** True when the last input before now was a pointer press (the trigger was clicked or tapped). */
export function lastInputWasPointer(): boolean {
  return lastInputPointer;
}

/**
 * Says that `element` is about to receive focus that is handed back, not moved there by the user:
 * a modal registers its opener when it opens (before any close path can restore focus), and
 * `returnFocus` registers its target. `uiTooltip` stays closed for that one focus event
 * (`consumeFocusReturn`); nothing is timed and no state outlives the element.
 */
export function expectFocusReturn(element: Element): void {
  pending.add(element);
}

/** Forgets the expectation (the modal is gone and focus went elsewhere, or it was used). */
export function cancelFocusReturn(element: Element | null): void {
  if (element) {
    pending.delete(element);
  }
}

/**
 * True for the focus event that returns to `element`; the next focus is the user's. Every tooltip
 * on the element (an icon `ui-button` can carry two) hears the same event, so the expectation is
 * dropped after the event has been dispatched, not on the first read.
 */
export function consumeFocusReturn(element: Element): boolean {
  if (!pending.has(element)) {
    return false;
  }
  setTimeout(() => pending.delete(element));
  return true;
}

/**
 * Hands focus back to `element` (a trigger). When the trigger was activated with a pointer
 * (`pointer`), the focus ring stays off (`focusVisible: false`; older browsers ignore the option),
 * otherwise the normal ring shows. Its tooltip stays closed either way, once.
 */
export function returnFocus(element: HTMLElement, pointer: boolean): void {
  expectFocusReturn(element);
  // `focusVisible` is newer than the DOM lib's FocusOptions in some TypeScript versions.
  const options: FocusOptions & { focusVisible?: boolean } = pointer ? { focusVisible: false } : {};
  element.focus(options);
  // No focus event (already focused, or not focusable): do not swallow a later real one.
  cancelFocusReturn(element);
}
