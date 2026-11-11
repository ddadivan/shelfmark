/**
 * Whether a page-level shortcut must leave this key alone: the focus is in a text field (Cmd+A
 * selects its text there) or inside a dialog, menu or listbox (they own Esc and the arrows).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  return (
    target.closest(
      'input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
    ) !== null
  );
}
