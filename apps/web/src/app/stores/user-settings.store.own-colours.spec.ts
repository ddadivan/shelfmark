import { TestBed } from '@angular/core/testing';
import { LIBRARY_SETTINGS_DEFAULT, type UserSettingsResponse } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { UserSettingsStore } from './user-settings.store';

function setup(customColours: UserSettingsResponse['customColours'] = []) {
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    customColours,
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
  };
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      of({ ...settings, customColours: request.customColours ?? settings.customColours }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: USER_SETTINGS_API, useValue: api },
      { provide: TRASH_API, useValue: { list: () => of({ items: [], total: 0 }) } },
    ],
  });
  return { api, store: TestBed.inject(UserSettingsStore) };
}

describe('UserSettingsStore own colours (#350)', () => {
  beforeEach(() => localStorage.clear());

  it('removes a colour from the saved list and sends the shorter list', async () => {
    const { store, api } = setup(['#3a7bd5', '#1d4f91']);
    await store.load();

    expect(await store.removeCustomColour('#3a7bd5')).toBe(true);

    expect(api.update).toHaveBeenCalledWith({ customColours: ['#1d4f91'] });
    expect(store.customColours()).toEqual(['#1d4f91']);
  });

  it('puts the colour back when removing it fails', async () => {
    const { store, api } = setup(['#3a7bd5']);
    await store.load();
    api.update.mockImplementation(() => throwError(() => new Error('down')));

    expect(await store.removeCustomColour('#3a7bd5')).toBe(false);

    expect(store.customColours()).toEqual(['#3a7bd5']);
  });

  it('only the newest save of the list writes its answer back (two quick changes)', async () => {
    const { store, api } = setup([]);
    await store.load();
    const first = new Subject<UserSettingsResponse>();
    const second = new Subject<UserSettingsResponse>();
    api.update.mockReturnValueOnce(first).mockReturnValueOnce(second);

    const one = store.addCustomColour('#3a7bd5');
    const two = store.addCustomColour('#1d4f91');
    expect(store.customColours()).toEqual(['#3a7bd5', '#1d4f91']);

    // The answers arrive in order; the stale first one must not shorten the list again.
    const answer = (colours: UserSettingsResponse['customColours']): UserSettingsResponse => ({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
      customColours: colours,
      ...MOCK_APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
    });
    first.next(answer(['#3a7bd5']));
    first.complete();
    await one;
    expect(store.customColours()).toEqual(['#3a7bd5', '#1d4f91']);
    second.next(answer(['#3a7bd5', '#1d4f91']));
    second.complete();
    await two;
    expect(store.customColours()).toEqual(['#3a7bd5', '#1d4f91']);
  });
});
