import { TestBed } from '@angular/core/testing';
import {
  LIBRARY_SETTINGS_DEFAULT,
  USER_LIMIT,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../features/settings/models/user-settings-api.interface';
import { TRASH_API } from '../features/trash/models/trash-api.const';
import { UserSettingsStore } from './user-settings.store';

function response(customEmoji: string[]): UserSettingsResponse {
  return {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    customColours: [],
    customEmoji,
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
  };
}

function setup(customEmoji: string[] = []) {
  const settings = response(customEmoji);
  const api = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) =>
      of(response(request.customEmoji ?? settings.customEmoji)),
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

describe('UserSettingsStore own emoji (#363)', () => {
  beforeEach(() => localStorage.clear());

  it('reads the own emoji with the settings', async () => {
    const { store } = setup(['🦩']);
    await store.load();
    expect(store.customEmoji()).toEqual(['🦩']);
  });

  it('adds an emoji at the end, moves an old copy there and keeps at most the limit', async () => {
    const full = Array.from({ length: USER_LIMIT.CustomEmojiMax }, (_, i) =>
      String.fromCodePoint(0x1f400 + i),
    );
    const { store, api } = setup(full);
    await store.load();

    expect(await store.addCustomEmoji('🦩')).toBe(true);
    expect(store.customEmoji()).toEqual([...full.slice(1), '🦩']);
    expect(api.update).toHaveBeenLastCalledWith({ customEmoji: [...full.slice(1), '🦩'] });

    await store.addCustomEmoji(full[5]);
    expect(store.customEmoji().at(-1)).toBe(full[5]);
    expect(store.customEmoji()).toHaveLength(USER_LIMIT.CustomEmojiMax);
  });

  it('sends nothing when the list does not change', async () => {
    const { store, api } = setup(['🦩']);
    await store.load();
    expect(await store.removeCustomEmoji('🐙')).toBe(true);
    expect(api.update).not.toHaveBeenCalled();
  });

  it('removes an emoji optimistically and puts it back when the save fails', async () => {
    const { store, api } = setup(['🦩', '🐙']);
    await store.load();
    const answer = new Subject<UserSettingsResponse>();
    api.update.mockReturnValueOnce(answer);

    const removing = store.removeCustomEmoji('🦩');
    expect(store.customEmoji()).toEqual(['🐙']);
    answer.error(new Error('down'));

    expect(await removing).toBe(false);
    expect(store.customEmoji()).toEqual(['🦩', '🐙']);
  });

  it('keeps the colour and emoji saves apart', async () => {
    const { store, api } = setup([]);
    await store.load();
    api.update.mockImplementationOnce(() => throwError(() => new Error('down')));
    expect(await store.addCustomColour('#3a7bd5')).toBe(false);
    expect(await store.addCustomEmoji('🦩')).toBe(true);
    expect(store.customColours()).toEqual([]);
    expect(store.customEmoji()).toEqual(['🦩']);
  });
});
