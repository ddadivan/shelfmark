/** Focus that arrives within this long after a modal closed is the return of focus, not the user's. */
const FOCUS_RETURN_WINDOW_MS = 150;

let lastReturnAt = Number.NEGATIVE_INFINITY;

/**
 * Called as a modal closes (and again once it is gone): the focus the CDK, or a `restoreFocus`
 * callback, puts back on the trigger is programmatic. `uiTooltip` reads `isFocusReturn()` and
 * stays closed for it, so a dialog that closes with Enter does not open the tooltip of its
 * trigger.
 */
export function markFocusReturn(): void {
  lastReturnAt = Date.now();
}

/** True while focus that arrives now is the return of focus after a modal closed. */
export function isFocusReturn(): boolean {
  return Date.now() - lastReturnAt <= FOCUS_RETURN_WINDOW_MS;
}
