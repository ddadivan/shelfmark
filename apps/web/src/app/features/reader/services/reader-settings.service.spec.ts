import { TestBed } from '@angular/core/testing';
import { READER_SETTINGS_STORAGE_KEY } from '../models/reader-settings-storage-key.const';
import { READER_SETTINGS_DEFAULT } from '../models/reader-settings-default.const';
import { ReaderSettingsService } from './reader-settings.service';

describe('ReaderSettingsService', () => {
  afterEach(() => localStorage.clear());

  it('starts from the stored settings and keeps every change', () => {
    localStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify({ font: 'serif' }));
    const service = TestBed.inject(ReaderSettingsService);
    expect(service.settings().font).toBe('serif');

    service.set({ theme: 'sepia' });
    expect(service.settings()).toEqual({
      theme: 'sepia',
      font: 'serif',
      size: 18,
      lineSpacing: 'normal',
      width: 'normal',
    });
    expect(JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE_KEY) ?? '{}')).toMatchObject({
      theme: 'sepia',
    });
  });

  it('steps the text size by 1px and stays between 14 and 24', () => {
    const service = TestBed.inject(ReaderSettingsService);
    service.stepSize(1);
    expect(service.settings().size).toBe(19);
    service.set({ size: 24 });
    service.stepSize(1);
    expect(service.settings().size).toBe(24);
    service.set({ size: 3 });
    expect(service.settings().size).toBe(14);
    service.stepSize(-1);
    expect(service.settings().size).toBe(14);
  });

  it('resets to the defaults, so the theme follows the app again', () => {
    const service = TestBed.inject(ReaderSettingsService);
    service.set({ theme: 'black', size: 22, lineSpacing: 'relaxed', width: 'wide' });
    service.reset();
    expect(service.settings()).toEqual(READER_SETTINGS_DEFAULT);
    expect(JSON.parse(localStorage.getItem(READER_SETTINGS_STORAGE_KEY) ?? '{}')).toMatchObject({
      theme: null,
      size: 18,
    });
  });

  it('carries over the first version of the settings', () => {
    localStorage.setItem(
      READER_SETTINGS_STORAGE_KEY,
      JSON.stringify({ size: 'l', font: 'readable', width: 'narrow', tone: 'sepia' }),
    );
    const service = TestBed.inject(ReaderSettingsService);
    expect(service.settings()).toEqual({
      theme: 'sepia',
      font: 'readable',
      size: 20,
      lineSpacing: 'normal',
      width: 'normal',
    });
  });

  it('keeps a change for the page when storage refuses it', () => {
    const service = TestBed.inject(ReaderSettingsService);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    service.set({ size: 20 });
    expect(service.settings().size).toBe(20);
    spy.mockRestore();
  });
});
