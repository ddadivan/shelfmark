import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SafeStorage } from './safe-storage.service';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function withDocument(defaultView: unknown): SafeStorage {
  TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: { defaultView } }] });
  return TestBed.inject(SafeStorage);
}

const THROWING = {
  localStorage: {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    },
  },
};

describe('SafeStorage', () => {
  afterEach(() => localStorage.clear());

  describe('with a working storage', () => {
    it('round-trips strings, numbers and JSON', () => {
      const storage = TestBed.inject(SafeStorage);

      expect(storage.set('k', 'v')).toBe(true);
      expect(storage.getString('k')).toBe('v');
      storage.set('n', '42');
      expect(storage.getNumber('n')).toBe(42);
      expect(storage.setJson('j', ['a', 'b'])).toBe(true);
      expect(storage.getJson('j', isStringArray, [])).toEqual(['a', 'b']);
      storage.remove('k');
      expect(storage.getString('k')).toBeNull();
    });

    it('gives the fallback for a missing key, bad JSON or a value the guard rejects', () => {
      const storage = TestBed.inject(SafeStorage);

      expect(storage.getJson('missing', isStringArray, ['x'])).toEqual(['x']);
      localStorage.setItem('bad', '{oops');
      expect(storage.getJson('bad', isStringArray, ['x'])).toEqual(['x']);
      localStorage.setItem('wrong', JSON.stringify([1, 2]));
      expect(storage.getJson('wrong', isStringArray, ['x'])).toEqual(['x']);
    });

    it('gives the fallback for a missing, empty or non-numeric number', () => {
      const storage = TestBed.inject(SafeStorage);

      expect(storage.getNumber('none')).toBeNull();
      expect(storage.getNumber('none', 7)).toBe(7);
      localStorage.setItem('empty', '');
      expect(storage.getNumber('empty', 3)).toBe(3);
      localStorage.setItem('text', 'abc');
      expect(storage.getNumber('text', 3)).toBe(3);
    });
  });

  describe('with a storage that throws', () => {
    it('reads the fallback and reports failed writes without throwing', () => {
      const storage = withDocument(THROWING);

      expect(storage.getString('k')).toBeNull();
      expect(storage.getJson('k', isStringArray, ['x'])).toEqual(['x']);
      expect(storage.getNumber('k', 5)).toBe(5);
      expect(storage.set('k', 'v')).toBe(false);
      expect(storage.setJson('k', [])).toBe(false);
      expect(() => storage.remove('k')).not.toThrow();
    });

    it('survives a window whose localStorage getter throws', () => {
      const view = {
        get localStorage(): Storage {
          throw new DOMException('denied', 'SecurityError');
        },
      };
      const storage = withDocument(view);

      expect(storage.getString('k')).toBeNull();
      expect(storage.set('k', 'v')).toBe(false);
    });
  });

  describe('without a window', () => {
    it('reads the fallback and writes nothing', () => {
      const storage = withDocument(null);

      expect(storage.getString('k')).toBeNull();
      expect(storage.set('k', 'v')).toBe(false);
      expect(storage.setJson('k', 1)).toBe(false);
      expect(() => storage.remove('k')).not.toThrow();
    });
  });

  it('gives the unchecked JSON value, or undefined when absent or broken', () => {
    const storage = TestBed.inject(SafeStorage);

    expect(storage.getJsonValue('none')).toBeUndefined();
    localStorage.setItem('bad', '{oops');
    expect(storage.getJsonValue('bad')).toBeUndefined();
    localStorage.setItem('ok', '{"a":1}');
    expect(storage.getJsonValue('ok')).toEqual({ a: 1 });
    localStorage.setItem('null', 'null');
    expect(storage.getJsonValue('null')).toBeNull();
  });

  it('does not store a value JSON cannot serialize', () => {
    const storage = TestBed.inject(SafeStorage);
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;

    expect(storage.setJson('k', circular)).toBe(false);
  });
});
