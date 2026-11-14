import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { isFolderEmoji } from '@shelfmark/contracts';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { ToastService } from '@shelfmark/ui';
import { firstValueFrom, throwError } from 'rxjs';
import { setActiveLang } from '../../../core/i18n/active-lang';
import { APP_LANG } from '../../../core/i18n/models/app-lang.const';
import { FoldersStore } from '../../../stores/folders.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { MockUserSettingsApi } from '../../settings/mock/mock-user-settings.api';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import { FOLDER_EMOJI_CATALOG } from '../models/folder-emoji-catalog.const';
import { EMOJI_RECENT_STORAGE_KEY } from '../../../core/auth/models/emoji-recent-storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { FOLDER_EMOJI_RECENT_MAX } from '../models/folder-emoji-recent-max.const';
import { FolderEmojiService } from './folder-emoji.service';

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: FOLDERS_API, useClass: MockFoldersApi },
      { provide: USER_SETTINGS_API, useClass: MockUserSettingsApi },
    ],
  });
  await loadEnglish();
  TestBed.inject(TranslocoService).setActiveLang(APP_LANG.En);
  const settings = TestBed.inject(UserSettingsStore);
  await settings.load();
  const folders = TestBed.inject(FoldersStore);
  await folders.load();
  const toasts = TestBed.inject(ToastService);
  const show = vi.spyOn(toasts, 'show');
  return { service: TestBed.inject(FolderEmojiService), settings, folders, show };
}

describe('FolderEmojiService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => setActiveLang(APP_LANG.En));

  it('has no categories until loaded, then the nine tabs with English names', async () => {
    const { service } = await setup();
    expect(service.categories()).toEqual([]);
    await service.load();
    const categories = service.categories();
    expect(categories.map((category) => category.id)).toEqual(Object.keys(FOLDER_EMOJI_CATALOG));
    expect(categories[0].label).toBe('Food');
    expect(categories[0].items[0]).toEqual(expect.objectContaining({ emoji: '🍕', name: 'pizza' }));
    // A second open loads nothing again.
    await service.load();
    expect(service.categories()).toBe(categories);
  });

  it('loads the names of the active language when it changes', async () => {
    const { service } = await setup();
    await service.load();
    const transloco = TestBed.inject(TranslocoService);
    await firstValueFrom(transloco.load(APP_LANG.De));
    transloco.setActiveLang(APP_LANG.De);
    setActiveLang(APP_LANG.De);
    expect(service.categories()).toEqual([]);
    await service.load();
    expect(service.categories()[0].label).toBe('Essen');
    expect(service.categories()[0].items[0].name).toBe('Pizza');
  });

  it('remembers saved emoji as recent on this device, newest first, at most 16', async () => {
    const { service } = await setup();
    service.remember('folder');
    expect(service.recent()).toEqual([]);
    const emoji = Object.values(FOLDER_EMOJI_CATALOG).flat().slice(0, 20);
    for (const item of emoji) {
      service.remember(item);
    }
    service.remember(emoji[10]);
    expect(service.recent().map((item) => item.emoji)).toHaveLength(FOLDER_EMOJI_RECENT_MAX);
    expect(service.recent()[0].emoji).toBe(emoji[10]);
    expect(JSON.parse(localStorage.getItem(EMOJI_RECENT_STORAGE_KEY) ?? '[]')[0]).toBe(emoji[10]);
    await service.load();
    expect(service.recent()[0].name).not.toBe(emoji[10]);
  });

  it('reads recent emoji back, skipping anything that is not one emoji', () => {
    localStorage.setItem(EMOJI_RECENT_STORAGE_KEY, JSON.stringify(['🍕', 'x', 7, '🦩']));
    return setup().then(({ service }) => {
      expect(service.recent().map((item) => item.emoji)).toEqual(['🍕', '🦩']);
    });
  });

  it('survives storage that is broken or blocked', async () => {
    localStorage.setItem(EMOJI_RECENT_STORAGE_KEY, '{not json');
    const { service } = await setup();
    expect(service.recent()).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    service.remember('🍕');
    expect(service.recent().map((item) => item.emoji)).toEqual(['🍕']);
  });

  it('forgets Recent when the session ends (sign-out, a deleted account)', async () => {
    const { service } = await setup();
    service.remember('🍕');
    TestBed.inject(SessionScope).end();
    expect(service.recent()).toEqual([]);
    expect(localStorage.getItem(EMOJI_RECENT_STORAGE_KEY)).toBeNull();
  });

  it('keeps an emoji the collection lacks on the account, once', async () => {
    const { service, settings } = await setup();
    service.remember('🍕');
    expect(settings.customEmoji()).toEqual([]);
    service.remember('🦩');
    service.remember('🦩');
    await vi.waitFor(() => expect(settings.customEmoji()).toEqual(['🦩']));
    expect(service.own()).toEqual([{ emoji: '🦩', name: '🦩', removeLabel: 'Remove emoji 🦩' }]);
  });

  it('offers no removal for an own emoji a folder wears', async () => {
    const { service, settings, folders } = await setup();
    await settings.addCustomEmoji('🦩');
    await folders.setStyle(MOCK_ID.FolderReading, { colour: 'graphite', icon: '🦩' });
    expect(service.own()).toEqual([{ emoji: '🦩', name: '🦩' }]);
  });

  it('removes an own emoji with an Undo toast; Undo puts it back', async () => {
    const { service, settings, show } = await setup();
    await settings.addCustomEmoji('🦩');
    await service.remove('🦩');
    expect(settings.customEmoji()).toEqual([]);
    const toast = show.mock.calls[0][0];
    expect(toast).toEqual(expect.objectContaining({ title: 'Emoji removed', detail: '🦩' }));
    toast.action?.run();
    await vi.waitFor(() => expect(settings.customEmoji()).toEqual(['🦩']));
  });

  it('tells when removing fails and keeps the emoji', async () => {
    const { service, settings, show } = await setup();
    await settings.addCustomEmoji('🦩');
    vi.spyOn(TestBed.inject(USER_SETTINGS_API), 'update').mockReturnValue(
      throwError(() => new Error('down')),
    );
    await service.remove('🦩');
    expect(settings.customEmoji()).toEqual(['🦩']);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Couldn’t remove the emoji' }),
    );
  });

  it('keeps every catalogue emoji valid and unique', () => {
    const all = Object.values(FOLDER_EMOJI_CATALOG).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all.filter((emoji) => !isFolderEmoji(emoji))).toEqual([]);
    expect(all.length).toBeGreaterThanOrEqual(280);
  });
});
