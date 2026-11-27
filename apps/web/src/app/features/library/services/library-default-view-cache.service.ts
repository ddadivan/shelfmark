import { effect, inject, Service } from '@angular/core';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { UserSettingsStore } from '../../../stores/user-settings.store';

/**
 * Keeps the account's Default view (Settings › Library) in `localStorage` once the settings are
 * loaded, so `public/boot-skeleton.js` can draw the placeholder of the right view (cards, list
 * or headlines) on the next reload, before the account has answered. The shell starts it.
 * Never read by the app itself: the store stays the source of truth.
 */
@Service()
export class LibraryDefaultViewCache {
  private readonly settings = inject(UserSettingsStore);
  private readonly storage = inject(SafeStorage);

  constructor() {
    effect(() => {
      const library = this.settings.library();
      if (library !== null) {
        this.storage.set(STORAGE_KEY.LibraryDefaultView, library.defaultView);
      }
    });
  }
}
