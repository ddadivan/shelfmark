import { SESSION_HINT_STORAGE_KEY } from './models/session-hint-storage-key.const';

type HintStorage = Pick<Storage, 'setItem' | 'removeItem'>;

function defaultStorage(): HintStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Remembers on this device that a session exists or is about to (OAuth redirect, demo). */
export function markSessionHint(storage: HintStorage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(SESSION_HINT_STORAGE_KEY, '1');
  } catch {
    // Storage may be full or blocked; the skeleton is a nicety, never a requirement.
  }
}

/** The session is gone (guest, sign-out, expiry): the next load shows the landing as usual. */
export function clearSessionHint(storage: HintStorage | undefined = defaultStorage()): void {
  try {
    storage?.removeItem(SESSION_HINT_STORAGE_KEY);
  } catch {
    // See markSessionHint.
  }
}
