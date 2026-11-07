/** How long a touch or pen has to stay down before `uiLongPress` emits. */
export const LONG_PRESS_DURATION_MS = 500;

/** Movement in CSS px after which the press counts as a scroll or drag and is cancelled. */
export const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

/** How long after the release the click that follows a long press is still swallowed. */
export const LONG_PRESS_CLICK_GUARD_MS = 400;

/** `PointerEvent.pointerType` values that can long-press (a mouse has a right click). */
export const LONG_PRESS_POINTER_TYPES: readonly string[] = ['touch', 'pen'];
