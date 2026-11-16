import { SESSION_HINT_STORAGE_KEY } from './models/session-hint-storage-key.const';

type HintStorage = Pick<Storage, 'setItem' | 'removeItem'>;
type HintReader = Pick<Storage, 'getItem'>;

function defaultStorage(): Storage | undefined {
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

/**
 * Whether this device has seen a session. Without the hint the visitor is almost surely a guest,
 * so the landing renders without waiting for the session request (a cold API takes seconds).
 */
export function hasSessionHint(storage: HintReader | undefined = defaultStorage()): boolean {
  try {
    return storage?.getItem(SESSION_HINT_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}
