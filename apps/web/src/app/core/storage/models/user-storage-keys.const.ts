import { STORAGE_KEY } from './storage-key.const';
import { STORAGE_KEY_SCOPE } from './storage-key-scope.const';
import { STORAGE_SCOPE } from './storage-scope.const';
import type { StorageKeyName } from './storage-key-name.type';

const NAMES = Object.keys(STORAGE_KEY) as StorageKeyName[];

/**
 * `localStorage` keys that hold what one user did on this device, derived from the `User` scope
 * of `STORAGE_KEY_SCOPE`. `SessionScope.end()` removes them (sign-out, expiry, a 401, a deleted
 * account), so the next person on the device starts clean.
 */
export const USER_STORAGE_KEYS: readonly string[] = NAMES.filter(
  (name) => STORAGE_KEY_SCOPE[name] === STORAGE_SCOPE.User,
).map((name) => STORAGE_KEY[name]);
