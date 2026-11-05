import type { Signal } from '@angular/core';

/**
 * The element a trigger directive (tooltip, menu trigger, overlay origin) should attach to.
 * A wrapper component such as `ui-button` provides it so the inner native element, not the
 * non-focusable host, receives listeners, `aria-describedby` and overlay anchoring.
 */
export interface UiFocusTarget {
  /** The inner native element; `undefined` until it is rendered. */
  readonly element: Signal<HTMLElement | undefined>;
  /** Focuses the inner native element. */
  focus(options?: FocusOptions): void;
}
