import { KEYBOARD_KEY } from '../../models/keyboard';

/**
 * The context-menu key or Shift+F10: they open the folder menu, and the browser follows them with
 * its own `contextmenu` event (the echo).
 */
export function isEchoedMenuKey(event: KeyboardEvent): boolean {
  return (
    event.key === KEYBOARD_KEY.ContextMenu || (event.shiftKey && event.key === KEYBOARD_KEY.F10)
  );
}

/** Keys that open the folder menu: the echoed ones and Alt+Enter (laptops without the key). */
export function isMenuKey(event: KeyboardEvent): boolean {
  return isEchoedMenuKey(event) || (event.altKey && event.key === KEYBOARD_KEY.Enter);
}

/** Alt+Up is `-1` and Alt+Down `1` (no other modifier); any other key is `0`. */
export function reorderStep(event: KeyboardEvent): -1 | 0 | 1 {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return 0;
  }
  if (event.key === KEYBOARD_KEY.ArrowUp) {
    return -1;
  }
  return event.key === KEYBOARD_KEY.ArrowDown ? 1 : 0;
}
