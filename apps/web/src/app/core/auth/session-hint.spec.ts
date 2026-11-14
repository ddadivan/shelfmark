import { describe, expect, it } from 'vitest';
import { clearSessionHint, markSessionHint } from './session-hint';
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
  });
});
