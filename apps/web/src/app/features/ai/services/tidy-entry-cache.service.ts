import { computed, effect, inject, Service } from '@angular/core';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { AiSettingsStore } from './ai-settings.store';
import { TidyCountStore } from './tidy-count.store';

/**
 * Whether "Tidy with suggestions" showed the last time the account answered (`1` / `0` in
 * `localStorage`). The button arrives after the AI settings and the count; on a phone it wraps the
 * toolbar onto a second row (76px), so Unsorted keeps its slot (`reserve`) only when it was there
 * last time, and `public/boot-skeleton.js` does the same for the boot overlay. Reserving always
 * would move the page the other way for an account with nothing to tidy. The shell starts it.
 */
@Service()
export class TidyEntryCache {
  private readonly storage = inject(SafeStorage);
  private readonly settings = inject(AiSettingsStore);
  private readonly count = inject(TidyCountStore);
  private readonly last = this.storage.getString(STORAGE_KEY.TidyEntry) === '1';

  /** The slot is held: the button was there last time and this time's answer is not in yet. */
  readonly reserve = computed(() => this.last && !this.count.known());

  constructor() {
    effect(() => {
      if (this.count.known()) {
        const shown = this.settings.isOn() && this.count.total() > 0;
        this.storage.set(STORAGE_KEY.TidyEntry, shown ? '1' : '0');
      }
    });
  }
}
