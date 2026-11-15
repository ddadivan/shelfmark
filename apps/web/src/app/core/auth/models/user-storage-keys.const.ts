import { EMOJI_RECENT_STORAGE_KEY } from './emoji-recent-storage-key.const';
import { RECENT_FOLDERS_STORAGE_KEY } from './recent-folders-storage-key.const';
import { REMINDERS_SEEN_STORAGE_KEY } from './reminders-seen-storage-key.const';
import { SESSION_HINT_STORAGE_KEY } from './session-hint-storage-key.const';

/**
 * `localStorage` keys that hold what one user did on this device. `SessionScope.end()` removes
 * them (sign-out, expiry, a 401, a deleted account), so the next person on the device starts clean.
 */
export const USER_STORAGE_KEYS: readonly string[] = [
  EMOJI_RECENT_STORAGE_KEY,
  RECENT_FOLDERS_STORAGE_KEY,
  // Which due reminders the toast already announced (#275).
  REMINDERS_SEEN_STORAGE_KEY,
  // The first-paint hint of the app skeleton (#410); gone with the session.
  SESSION_HINT_STORAGE_KEY,
];
