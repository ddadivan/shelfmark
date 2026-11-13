import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { isFolderEmoji } from '@shelfmark/contracts';
import {
  TOAST_DURATION_MS,
  TOAST_KIND,
  ToastService,
  toastShortcutLabel,
  type EmojiPickerCategory,
  type EmojiPickerItem,
} from '@shelfmark/ui';
import { LocaleService } from '../../../core/i18n/locale.service';
import { FoldersStore } from '../../../stores/folders.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { FOLDER_EMOJI_CATALOG } from '../models/folder-emoji-catalog.const';
import type { FolderEmojiCategory } from '../models/folder-emoji-category.type';
import type { FolderEmojiNames } from '../models/folder-emoji-names.type';
import { FOLDER_EMOJI_RECENT } from '../models/folder-emoji-recent.const';
import { loadFolderEmojiNames } from './folder-emoji-names.loader';

const CATEGORIES = Object.keys(FOLDER_EMOJI_CATALOG) as FolderEmojiCategory[];
const CATALOGUED: ReadonlySet<string> = new Set(Object.values(FOLDER_EMOJI_CATALOG).flat());

/**
 * What the folder emoji picker shows (#363): the curated collection with names in the active
 * language (loaded lazily on the first open), "Recent" (per device), "Yours" (the account's own
 * emoji, `customEmoji`). Saving a folder emoji remembers it; one the collection lacks is kept on
 * the account. Removing an own emoji drops it with an Undo toast; one a folder wears is not
 * offered for removal.
 */
@Service()
export class FolderEmojiService {
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);
  private readonly settings = inject(UserSettingsStore);
  private readonly folders = inject(FoldersStore);
  private readonly toasts = inject(ToastService);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;

  private readonly names = signal<{ lang: string; names: FolderEmojiNames } | null>(null);
  private loading: { lang: string; done: Promise<void> } | null = null;
  private readonly recentList = signal<readonly string[]>(this.readRecent());

  /** Names of the active language, `null` until they are loaded. */
  private readonly shownNames = computed(() => {
    const loaded = this.names();
    return loaded?.lang === this.locale.lang() ? loaded.names : null;
  });

  /** The tabs; empty until the names of the active language are loaded. */
  readonly categories = computed<EmojiPickerCategory[]>(() => {
    const names = this.shownNames();
    if (names === null) {
      return [];
    }
    return CATEGORIES.map((id) => ({
      id,
      label: this.transloco.translate(`folders.style.emoji.categories.${id}`),
      items: FOLDER_EMOJI_CATALOG[id].map((emoji) => this.item(emoji, names)),
    }));
  });

  readonly recent = computed<EmojiPickerItem[]>(() => {
    const names = this.shownNames();
    return this.recentList().map((emoji) => this.item(emoji, names));
  });

  /** The account's own emoji; one a live folder wears has no remove action. */
  readonly own = computed<EmojiPickerItem[]>(() => {
    this.locale.lang();
    const worn = new Set(this.folders.entities().map((folder) => folder.icon));
    return this.settings.customEmoji().map((emoji) => ({
      emoji,
      name: emoji,
      ...(worn.has(emoji)
        ? {}
        : { removeLabel: this.transloco.translate('folders.style.emoji.remove', { emoji }) }),
    }));
  });

  /** Loads the names of the active language once (the picker calls it on every open). */
  load(): Promise<void> {
    const lang = this.locale.lang();
    if (this.names()?.lang === lang) {
      return Promise.resolve();
    }
    if (this.loading?.lang !== lang) {
      const done = loadFolderEmojiNames(lang)
        .then((names) => this.names.set({ lang, names }))
        .catch(() => undefined)
        .finally(() => {
          if (this.loading?.done === done) {
            this.loading = null;
          }
        });
      this.loading = { lang, done };
    }
    return this.loading.done;
  }

  /**
   * A folder was saved with `icon`: an emoji goes to the front of "Recent", and one the collection
   * lacks is kept on the account ("Yours").
   */
  remember(icon: string): void {
    if (!isFolderEmoji(icon)) {
      return;
    }
    const next = [icon, ...this.recentList().filter((emoji) => emoji !== icon)].slice(
      0,
      FOLDER_EMOJI_RECENT.Max,
    );
    this.recentList.set(next);
    this.writeRecent(next);
    if (!CATALOGUED.has(icon) && !this.settings.customEmoji().includes(icon)) {
      void this.settings.addCustomEmoji(icon);
    }
  }

  /** Forgets an own emoji with an Undo; a failed save puts it back and tells. */
  async remove(emoji: string): Promise<void> {
    if (!(await this.settings.removeCustomEmoji(emoji))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('folders.style.emoji.removeFailed'),
        detail: emoji,
      });
      return;
    }
    const undo = this.t('folders.style.emoji.undo');
    this.toasts.show({
      kind: TOAST_KIND.Info,
      title: this.t('folders.style.emoji.removed'),
      detail: emoji,
      duration: TOAST_DURATION_MS.Undo,
      actionHint: this.t('toast.actionHint', { shortcut: toastShortcutLabel(), action: undo }),
      action: { label: undo, run: () => void this.settings.addCustomEmoji(emoji) },
    });
  }

  private item(emoji: string, names: FolderEmojiNames | null): EmojiPickerItem {
    const [name, ...keywords] = names?.[emoji] ?? [emoji];
    return { emoji, name: name ?? emoji, keywords };
  }

  private readRecent(): string[] {
    try {
      const parsed: unknown = JSON.parse(
        this.storage?.getItem(FOLDER_EMOJI_RECENT.StorageKey) ?? '[]',
      );
      return Array.isArray(parsed)
        ? parsed
            .filter((item): item is string => isFolderEmoji(item))
            .slice(0, FOLDER_EMOJI_RECENT.Max)
        : [];
    } catch {
      return [];
    }
  }

  private writeRecent(list: readonly string[]): void {
    try {
      this.storage?.setItem(FOLDER_EMOJI_RECENT.StorageKey, JSON.stringify(list));
    } catch {
      // Storage full or blocked (private mode): "Recent" lives until the page reloads.
    }
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
