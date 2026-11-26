import { SEARCH_SHORTCUT_CODE } from '../models/search-shortcut-code.const';
import { SEARCH_SHORTCUT_KEY } from '../models/search-shortcut-key.const';

/**
 * True for Cmd or Ctrl + K without Alt or Shift. On a Latin layout the key is `k`; only when the
 * key is not a Latin letter (Cyrillic, Greek, ...) the physical key (`code`) decides. Key events
 * without a `key` (autofill) and IME composition are ignored. Pure: it neither prevents the
 * default nor opens anything.
 */
export function matchesSearchShortcut(event: KeyboardEvent): boolean {
  if (typeof event.key !== 'string' || event.isComposing) {
    return false;
  }
  const key = event.key.toLowerCase();
  const latin = /^[a-z]$/u.test(key);
  const isKey = latin ? key === SEARCH_SHORTCUT_KEY : event.code === SEARCH_SHORTCUT_CODE;
  return isKey && !event.altKey && !event.shiftKey && (event.metaKey || event.ctrlKey);
}
