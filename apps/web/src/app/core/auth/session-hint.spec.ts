import { STORAGE_KEY } from '../storage/models/storage-key.const';
import { describe, expect, it } from 'vitest';
import { clearSessionHint, hasSessionHint, markSessionHint } from './session-hint';
import { SESSION_HINT_KIND } from './models/session-hint-kind.const';

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  } as Storage;
}

describe('session hint', () => {
  it('is written and cleared', () => {
    const storage = fakeStorage();
    markSessionHint(storage);
    expect(storage.getItem(STORAGE_KEY.SessionHint)).toBe('1');
    clearSessionHint(storage);
    expect(storage.getItem(STORAGE_KEY.SessionHint)).toBeNull();
  });

  it('says whether the session is a demo (#440)', () => {
    const storage = fakeStorage();
    markSessionHint(storage, SESSION_HINT_KIND.Demo);
    expect(storage.getItem(STORAGE_KEY.SessionHint)).toBe('demo');
    expect(hasSessionHint(storage)).toBe(true);
    markSessionHint(storage);
    expect(storage.getItem(STORAGE_KEY.SessionHint)).toBe('1');
  });

  it('is read back', () => {
    const storage = fakeStorage();
    expect(hasSessionHint(storage)).toBe(false);
    markSessionHint(storage);
    expect(hasSessionHint(storage)).toBe(true);
    // Without a storage argument it reads the device storage, which another spec in the same
    // worker may have written: clear it first so the answer does not depend on test order.
    globalThis.localStorage.removeItem(STORAGE_KEY.SessionHint);
    expect(hasSessionHint(undefined)).toBe(false);
  });

  it('survives a storage that throws', () => {
    const broken = {
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => markSessionHint(broken)).not.toThrow();
    expect(() => clearSessionHint(broken)).not.toThrow();
    const unreadable = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(hasSessionHint(unreadable)).toBe(false);
  });
});
