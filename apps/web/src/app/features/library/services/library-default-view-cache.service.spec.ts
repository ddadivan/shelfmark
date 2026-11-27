import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LIBRARY_SETTINGS_DEFAULT, LIBRARY_VIEW, type LibrarySettings } from '@shelfmark/contracts';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { LibraryDefaultViewCache } from './library-default-view-cache.service';

describe('LibraryDefaultViewCache', () => {
  const library = signal<LibrarySettings | null>(null);

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY.LibraryDefaultView);
    library.set(null);
    TestBed.configureTestingModule({
      providers: [{ provide: UserSettingsStore, useValue: { library } }],
    });
    TestBed.inject(LibraryDefaultViewCache);
    TestBed.tick();
  });
  afterAll(() => localStorage.removeItem(STORAGE_KEY.LibraryDefaultView));

  it('writes nothing until the account settings are loaded', () => {
    expect(localStorage.getItem(STORAGE_KEY.LibraryDefaultView)).toBeNull();
  });

  it('keeps the Default view for the next first paint and follows a change', () => {
    library.set({ ...LIBRARY_SETTINGS_DEFAULT, defaultView: LIBRARY_VIEW.List });
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY.LibraryDefaultView)).toBe('list');
    library.set({ ...LIBRARY_SETTINGS_DEFAULT, defaultView: LIBRARY_VIEW.Headlines });
    TestBed.tick();
    expect(localStorage.getItem(STORAGE_KEY.LibraryDefaultView)).toBe('headlines');
  });
});
