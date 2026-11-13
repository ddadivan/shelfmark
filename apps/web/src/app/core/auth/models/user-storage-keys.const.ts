import { EMOJI_RECENT_STORAGE_KEY } from './emoji-recent-storage-key.const';

/**
 * `localStorage` keys that hold what one user did on this device. `SessionScope.end()` removes
 * them (sign-out, expiry, a 401, a deleted account), so the next person on the device starts clean.
 */
export const USER_STORAGE_KEYS: readonly string[] = [EMOJI_RECENT_STORAGE_KEY];
