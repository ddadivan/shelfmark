import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { TestBed } from '@angular/core/testing';
import { FOLDER_COLOUR, type UserSettingsResponse } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { UserSettingsStore } from './user-settings.store';

function setup(folderColours = true) {
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours,
    pauseHistory: false,
    customColours: [],
    customEmoji: [],
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
  };
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      of({ ...settings, folderColours: request.folderColours ?? settings.folderColours }),
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

describe('UserSettingsStore folder colours', () => {
  // An appearance left in localStorage by another spec would trigger the one-off silent save of it.
  beforeEach(() => localStorage.clear());

  it('shows colours until the settings say otherwise, then follows the account', async () => {
    const { store } = setup(false);
    expect(store.coloursOn()).toBe(true);
    expect(store.shownColour(FOLDER_COLOUR.Clay)).toBe('clay');

    await store.load();

    expect(store.coloursOn()).toBe(false);
    expect(store.shownColour(FOLDER_COLOUR.Clay)).toBe('graphite');
  });

  it('loads the settings although the Trash list already told the retention', async () => {
    const { store, api } = setup(false);
    store.noteRetention(90);

    await store.load();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(store.coloursOn()).toBe(false);
  });

  it('switches at once and sends the change', async () => {
    const { store, api } = setup(true);
    await store.load();

    expect(await store.setFolderColours(false)).toBe(true);

    expect(api.update).toHaveBeenCalledWith({ folderColours: false });
    expect(store.coloursOn()).toBe(false);
  });

  it('puts the old value back when the request fails', async () => {
    const { store, api } = setup(true);
    await store.load();
    api.update.mockImplementation(() => throwError(() => new Error('down')));

    expect(await store.setFolderColours(false)).toBe(false);

    expect(store.coloursOn()).toBe(true);
  });

  it('sends nothing when the value is already set', async () => {
    const { store, api } = setup(true);
    await store.load();

    await store.setFolderColours(true);

    expect(api.update).not.toHaveBeenCalled();
  });
});
