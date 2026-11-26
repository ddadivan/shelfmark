import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { TestBed } from '@angular/core/testing';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { readLastExport, writeLastExport } from './last-export';

describe('last export', () => {
  let storage: SafeStorage;

  beforeEach(() => {
    storage = TestBed.inject(SafeStorage);
    localStorage.clear();
  });

  it('is unknown before the first export', () => {
    expect(readLastExport(storage)).toBeNull();
  });

  it('remembers the format and the time', () => {
    writeLastExport(storage, EXPORT_FORMAT.Html, new Date('2026-11-02T10:00:00Z'));
    expect(readLastExport(storage)).toEqual({ format: 'html', at: '2026-11-02T10:00:00.000Z' });
  });

  it('ignores malformed values', () => {
    const bad = [
      'nope',
      '{"format":"zip","at":"2026-11-02T10:00:00Z"}',
      '{"format":"json","at":"x"}',
      'null',
    ];
    for (const raw of bad) {
      localStorage.setItem(STORAGE_KEY.LastExport, raw);
      expect(readLastExport(storage)).toBeNull();
    }
  });

  it('survives a blocked storage', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readLastExport(storage)).toBeNull();
    expect(() => writeLastExport(storage, EXPORT_FORMAT.Json)).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});
