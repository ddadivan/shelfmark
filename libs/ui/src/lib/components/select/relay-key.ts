import { KEYBOARD_KEY } from '../../models/keyboard';

/**
 * Hands a key of the search box to the Aria listbox, as the combobox does for its trigger: the
 * key is stopped where it was pressed and a copy is dispatched on `listbox`. Ctrl / Cmd on Home /
 * End only chooses the options over the caret; Aria's single-select listbox binds the plain key,
 * so those two modifiers are dropped there.
 */
export function relayKey(event: KeyboardEvent, listbox: HTMLElement | undefined): void {
  event.preventDefault();
  const edge = event.key === KEYBOARD_KEY.Home || event.key === KEYBOARD_KEY.End;
  listbox?.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: event.key,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: edge ? false : event.ctrlKey,
      metaKey: edge ? false : event.metaKey,
    }),
  );
}
