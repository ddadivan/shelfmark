import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { DOCUMENT } from '@angular/common';
import { Injector, runInInjectionContext } from '@angular/core';
import { CUSTOM_THEME_DEFAULT, MOTION_PREFERENCE, THEME_PREFERENCE } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_STORAGE_KEY } from '../models/mock-appearance-storage-key.const';
import { firstValueFrom } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockUserSettingsApi } from './mock-user-settings.api';

function create() {
  const injector = Injector.create({
    providers: [MockLibraryData, { provide: DOCUMENT, useValue: document }],
  });
  return runInInjectionContext(injector, () => ({
    api: new MockUserSettingsApi(),
    data: injector.get(MockLibraryData),
  }));
}

describe('MockUserSettingsApi', () => {
  afterEach(() => localStorage.removeItem(MOCK_APPEARANCE_STORAGE_KEY));

  it('keeps the appearance in localStorage like an account: a new instance (a reload) reads it', async () => {
    const customTheme = { ...CUSTOM_THEME_DEFAULT, accent: 'teal' as const };
    await firstValueFrom(
      create().api.update({
        theme: THEME_PREFERENCE.Custom,
        customTheme,
        motion: MOTION_PREFERENCE.Full,
      }),
    );
    const again = await firstValueFrom(create().api.get());
    expect(again).toMatchObject({ theme: 'custom', customTheme, motion: 'full' });
  });

  it('falls back to the defaults for a broken or invalid stored appearance', async () => {
    localStorage.setItem(MOCK_APPEARANCE_STORAGE_KEY, '{');
    expect(await firstValueFrom(create().api.get())).toMatchObject(MOCK_APPEARANCE_DEFAULTS);
    localStorage.setItem(
      MOCK_APPEARANCE_STORAGE_KEY,
      JSON.stringify({ theme: 'sepia', customTheme: { base: 'dark' }, motion: 1 }),
    );
    expect(await firstValueFrom(create().api.get())).toMatchObject(MOCK_APPEARANCE_DEFAULTS);
  });

  it('starts with the default retention of 30 days', async () => {
    const { api } = create();

    expect(await firstValueFrom(api.get())).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...MOCK_APPEARANCE_DEFAULTS,
    });
  });

  it('changes the retention and answers the settings as they are', async () => {
    const { api, data } = create();

    expect(await firstValueFrom(api.update({ trashRetentionDays: 90 }))).toEqual({
      trashRetentionDays: 90,
      folderColours: true,
      pauseHistory: false,
      ...MOCK_APPEARANCE_DEFAULTS,
    });
    expect(data.trashRetentionDays).toBe(90);
    expect(await firstValueFrom(api.get())).toEqual({
      trashRetentionDays: 90,
      folderColours: true,
      pauseHistory: false,
      ...MOCK_APPEARANCE_DEFAULTS,
    });
  });

  it('pauses and resumes the history on the shared mock library', async () => {
    const { api, data } = create();

    expect((await firstValueFrom(api.update({ pauseHistory: true }))).pauseHistory).toBe(true);
    expect(data.pauseHistory).toBe(true);
    expect((await firstValueFrom(api.update({ pauseHistory: false }))).pauseHistory).toBe(false);
    expect(data.pauseHistory).toBe(false);
  });

  it('keeps what is not sent', async () => {
    const { api } = create();

    expect(await firstValueFrom(api.update({}))).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      ...MOCK_APPEARANCE_DEFAULTS,
    });
  });
});
