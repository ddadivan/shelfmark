/** Fields where a key press is typing: text-like inputs (not buttons, checkboxes or radios), text areas, selects, editable content and text roles. */
const EDITABLE_SELECTOR =
  'input:not([type="button"], [type="checkbox"], [type="radio"], [type="submit"], [type="reset"]), textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="searchbox"]';

/** Surfaces that own the keyboard while the focus is inside them. */
const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]';

export interface TypingTargetOptions {
  /** Also count the inside of a dialog, menu or listbox (they own Esc and the arrows). */
  readonly overlays?: boolean;
}

/**
 * Whether a key or paste event came from somewhere the person is typing, so a page-level shortcut
 * must stay out of it. Checkboxes, radios and button inputs are not typing.
 */
export function isTypingTarget(
  target: EventTarget | null,
  options: TypingTargetOptions = {},
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  const selector = options.overlays
    ? `${EDITABLE_SELECTOR}, ${OVERLAY_SELECTOR}`
    : EDITABLE_SELECTOR;
  return target.closest(selector) !== null;
}
