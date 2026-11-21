import { TestBed } from '@angular/core/testing';
import {
  LIBRARY_SETTINGS_DEFAULT,
  LIBRARY_SORT,
  LIBRARY_VIEW,
  LINK_OPEN_TARGET,
  type UpdateUserSettingsRequest,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { Subject, of, throwError, type Observable } from 'rxjs';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { UserSettingsStore } from './user-settings.store';

function setup(account: Partial<UserSettingsResponse> = {}) {
  let settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    customColours: [],
    customEmoji: [],
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
    ...account,
  };
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request: UpdateUserSettingsRequest) => {
      settings = { ...settings, ...request } as UserSettingsResponse;
      return of(settings);
    }),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: USER_SETTINGS_API, useValue: api },
      { provide: TRASH_API, useValue: { list: () => of({ items: [], total: 0 }) } },
    ],
  });
  return { api, store: TestBed.inject(UserSettingsStore) };
}

describe('UserSettingsStore library settings', () => {
  // An appearance left in localStorage by another spec would trigger the one-off silent save of it.
  beforeEach(() => localStorage.clear());

  it('shows the defaults until the account tells, then the account', async () => {
    const { store } = setup({
      defaultView: LIBRARY_VIEW.List,
      openLinksIn: LINK_OPEN_TARGET.SameTab,
      showFolderCounts: false,
    });
    expect(store.libraryShown()).toEqual(LIBRARY_SETTINGS_DEFAULT);
    expect(store.openInNewTab()).toBe(true);
    expect(store.countsShown()).toBe(true);

    await store.load();

    expect(store.libraryShown().defaultView).toBe(LIBRARY_VIEW.List);
    expect(store.openInNewTab()).toBe(false);
    expect(store.countsShown()).toBe(false);
  });

  it('applies a change at once and saves only what changed', async () => {
    const { store, api } = setup();
    await store.load();

    const done = store.setLibrary({ defaultSort: LIBRARY_SORT.Title, fetchPreviews: true });
    expect(store.libraryShown().defaultSort).toBe(LIBRARY_SORT.Title);
    expect(await done).toBe(true);
    expect(api.update).toHaveBeenCalledWith({
      defaultSort: LIBRARY_SORT.Title,
      fetchPreviews: true,
    });
  });

  it('sends nothing for a choice that is already set', async () => {
    const { store, api } = setup();
    await store.load();
    expect(await store.setLibrary({ defaultView: LIBRARY_VIEW.Cards })).toBe(true);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('puts the old value back when the request fails', async () => {
    const { store, api } = setup();
    await store.load();
    api.update.mockReturnValueOnce(throwError(() => new Error('offline')));

    expect(await store.setLibrary({ fetchPreviews: false })).toBe(false);
    expect(store.libraryShown().fetchPreviews).toBe(true);
  });

  it('keeps a later choice when an earlier request fails', async () => {
    const { store, api } = setup();
    await store.load();
    const first = new Subject<UserSettingsResponse>();
    api.update.mockReturnValueOnce(first as Observable<UserSettingsResponse>);

    const failing = store.setLibrary({ showFolderCounts: false });
    await store.setLibrary({ showFolderCounts: true });
    first.error(new Error('offline'));

    expect(await failing).toBe(false);
    expect(store.libraryShown().showFolderCounts).toBe(true);
  });

  it('takes the folder the server answers (Unsorted when it is gone)', async () => {
    const { store, api } = setup();
    await store.load();
    api.update.mockImplementationOnce(() =>
      of({
        trashRetentionDays: 30,
        folderColours: true,
        pauseHistory: false,
        customColours: [],
        customEmoji: [],
        ...MOCK_APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
        newLinksFolderId: null,
      }),
    );
    expect(await store.setLibrary({ newLinksFolderId: 'f1' })).toBe(true);
    expect(store.libraryShown().newLinksFolderId).toBeNull();
  });
});
