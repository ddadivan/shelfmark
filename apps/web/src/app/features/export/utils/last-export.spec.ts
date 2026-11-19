import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { LAST_EXPORT_STORAGE_KEY } from '../../../core/auth/models/last-export-storage-key.const';
import { readLastExport, writeLastExport } from './last-export';

describe('last export', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is unknown before the first export', () => {
    expect(readLastExport()).toBeNull();
  });

  it('remembers the format and the time', () => {
    writeLastExport(EXPORT_FORMAT.Html, new Date('2026-11-02T10:00:00Z'));
    expect(readLastExport()).toEqual({ format: 'html', at: '2026-11-02T10:00:00.000Z' });
  });

  it('ignores malformed values', () => {
    const bad = [
      'nope',
      '{"format":"zip","at":"2026-11-02T10:00:00Z"}',
      '{"format":"json","at":"x"}',
      'null',
    ];
    for (const raw of bad) {
      localStorage.setItem(LAST_EXPORT_STORAGE_KEY, raw);
      expect(readLastExport()).toBeNull();
    }
  });

  it('survives a blocked storage', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readLastExport()).toBeNull();
    expect(() => writeLastExport(EXPORT_FORMAT.Json)).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});
