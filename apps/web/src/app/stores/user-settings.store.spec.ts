import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { TestBed } from '@angular/core/testing';
import { TRASH_RETENTION_DEFAULT, type UserSettingsResponse } from '@shelfmark/contracts';
import { of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { TrashStore } from './trash.store';
import { UserSettingsStore } from './user-settings.store';

function setup() {
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() =>
      of({
        trashRetentionDays: 7 as const,
        folderColours: true,
        pauseHistory: false,
        ...MOCK_APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
      }),
    ),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      of({
        trashRetentionDays: request.trashRetentionDays ?? 30,
        folderColours: true,
        pauseHistory: false,
        ...MOCK_APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
      }),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: USER_SETTINGS_API, useValue: api },
      {
        provide: TRASH_API,
        useValue: { list: vi.fn(() => of({ items: [], total: 0, retentionDays: 7 })) },
      },
    ],
  });
  return { api, store: TestBed.inject(UserSettingsStore) };
}

describe('UserSettingsStore', () => {
  it('shows the default retention until the settings arrive, then the account value', async () => {
    const { store } = setup();
    expect(store.retentionDays()).toBe(TRASH_RETENTION_DEFAULT);
    expect(store.loaded()).toBe(false);

    await store.load();

    expect(store.retentionDays()).toBe(7);
    expect(store.loaded()).toBe(true);
  });

  it('loads once', async () => {
    const { store, api } = setup();

    await Promise.all([store.load(), store.load()]);
    await store.load();

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('flags a failed first load', async () => {
    const { store, api } = setup();
    api.get.mockImplementation(() => throwError(() => new Error('down')));

    await store.load();

    expect(store.error()).toBe(true);
    expect(store.retentionDays()).toBe(TRASH_RETENTION_DEFAULT);
  });

  it('takes the retention from the Trash list while the settings are not loaded', () => {
    const { store } = setup();

    store.noteRetention(90);

    expect(store.retentionDays()).toBe(90);
  });

  it('does not let a late Trash list undo what the settings said or the user chose', async () => {
    const { store } = setup();
    await store.load();

    store.noteRetention(90);

    expect(store.retentionDays()).toBe(7);
  });

  describe('setTrashRetention', () => {
    it('applies the choice at once, saves it and reloads Trash for the new days left', async () => {
      const gate = new Subject<UserSettingsResponse>();
      const { store, api } = setup();
      await store.load();
      const refresh = vi.spyOn(TestBed.inject(TrashStore), 'refresh');
      api.update.mockImplementation(() => gate);

      const done = store.setTrashRetention(90);

      expect(store.retentionDays()).toBe(90);
      expect(api.update).toHaveBeenCalledWith({ trashRetentionDays: 90 });
      gate.next({
        trashRetentionDays: 90,
        folderColours: true,
        pauseHistory: false,
        ...MOCK_APPEARANCE_DEFAULTS,
        ...LIBRARY_SETTINGS_DEFAULT,
      });
      gate.complete();
      expect(await done).toBe(true);
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('puts the old value back when the request fails', async () => {
      const { store, api } = setup();
      await store.load();
      api.update.mockImplementation(() => throwError(() => new Error('boom')));

      expect(await store.setTrashRetention(90)).toBe(false);
      expect(store.retentionDays()).toBe(7);
    });

    it('sends nothing when the value does not change', async () => {
      const { store, api } = setup();
      await store.load();

      expect(await store.setTrashRetention(7)).toBe(true);
      expect(api.update).not.toHaveBeenCalled();
    });

    it('keeps a newer choice when an older request fails late', async () => {
      const first = new Subject<UserSettingsResponse>();
      const { store, api } = setup();
      await store.load();
      api.update.mockImplementationOnce(() => first);

      const older = store.setTrashRetention(90);
      const newer = store.setTrashRetention(30);
      first.error(new Error('late'));

      expect(await older).toBe(false);
      await newer;
      expect(store.retentionDays()).toBe(30);
    });
  });

  it('forgets everything when the session ends', async () => {
    const { store } = setup();
    await store.load();

    TestBed.inject(SessionScope).end();

    expect(store.loaded()).toBe(false);
    expect(store.retentionDays()).toBe(TRASH_RETENTION_DEFAULT);
  });
});
