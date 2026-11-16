import { describe, expect, it } from 'vitest';
import { clearSessionHint, hasSessionHint, markSessionHint } from './session-hint';
import { SESSION_HINT_KIND } from './models/session-hint-kind.const';
import { SESSION_HINT_STORAGE_KEY } from './models/session-hint-storage-key.const';

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
    expect(storage.getItem(SESSION_HINT_STORAGE_KEY)).toBe('1');
    clearSessionHint(storage);
    expect(storage.getItem(SESSION_HINT_STORAGE_KEY)).toBeNull();
  });

  it('says whether the session is a demo (#440)', () => {
    const storage = fakeStorage();
    markSessionHint(storage, SESSION_HINT_KIND.Demo);
    expect(storage.getItem(SESSION_HINT_STORAGE_KEY)).toBe('demo');
    expect(hasSessionHint(storage)).toBe(true);
    markSessionHint(storage);
    expect(storage.getItem(SESSION_HINT_STORAGE_KEY)).toBe('1');
  });

  it('is read back', () => {
    const storage = fakeStorage();
    expect(hasSessionHint(storage)).toBe(false);
    markSessionHint(storage);
    expect(hasSessionHint(storage)).toBe(true);
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
