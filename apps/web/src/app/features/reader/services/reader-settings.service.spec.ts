import { TestBed } from '@angular/core/testing';
import { READER_SETTINGS_STORAGE_KEY } from '../models/reader-settings-storage-key.const';
import { ReaderSettingsService } from './reader-settings.service';

describe('ReaderSettingsService', () => {
  afterEach(() => localStorage.clear());

  it('starts from the stored settings and keeps every change', () => {
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ font: 'serif' }));
    const service = TestBed.inject(ReaderSettingsService);
    expect(service.settings().font).toBe('serif');

    service.set({ tone: 'sepia' });
    expect(service.settings()).toEqual({
      size: 'm',
      font: 'serif',
      width: 'narrow',
      tone: 'sepia',
    });
    expect(JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE_KEY) ?? '{}')).toMatchObject({
      tone: 'sepia',
    });
  });

  it('keeps a change for the page when storage refuses it', () => {
    const service = TestBed.inject(ReaderSettingsService);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    service.set({ size: 'l' });
    expect(service.settings().size).toBe('l');
    spy.mockRestore();
  });
});
