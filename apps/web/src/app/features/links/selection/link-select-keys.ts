import { KEYBOARD_KEY } from '@shelfmark/ui';
import { LINK_KEY_INTENT } from './models/link-key-intent.const';
import type { LinkKeyIntent } from './models/link-key-intent.type';
import { LINK_SELECT_SHORTCUT } from './models/link-select-shortcut.const';

/** Whether the event is the letter `key` (Latin layouts) or the physical `code` (other layouts). */
export function isLetter(event: KeyboardEvent, key: string, code: string): boolean {
  if (typeof event.key !== 'string') {
    return false;
  }
  const typed = event.key.toLowerCase();
  return /^[a-z]$/u.test(typed) ? typed === key : event.code === code;
}

/**
 * Space toggles the selection of the focused link (Shift+Space selects a range); M opens "Move
 * to folder…" for it. Only keys pressed on the link itself count, never on its buttons or menu.
 */
export function linkKeyIntent(event: KeyboardEvent): LinkKeyIntent | null {
  const target = event.target;
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    !(target instanceof HTMLElement) ||
    !target.matches('.ui-card__link, .ui-list-item__link')
  ) {
    return null;
  }
  if (event.key === KEYBOARD_KEY.Space) {
    return LINK_KEY_INTENT.Toggle;
  }
  if (
    !event.shiftKey &&
    isLetter(event, LINK_SELECT_SHORTCUT.MoveKey, LINK_SELECT_SHORTCUT.MoveCode)
  ) {
    return LINK_KEY_INTENT.Move;
  }
  return null;
}
