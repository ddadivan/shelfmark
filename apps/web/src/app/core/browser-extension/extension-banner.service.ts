import { Service, computed, inject, signal } from '@angular/core';
import { SafeStorage } from '../storage/safe-storage.service';
import { STORAGE_KEY } from '../storage/models/storage-key.const';
import { SessionScope } from '../auth/session-scope.service';
import { BrowserExtensionService } from './browser-extension.service';

const DISMISSED = '1';

/**
 * Where the app offers the extension on the main screen (#455): the library banner until the user
 * closes it, then the "Get the extension" row in the sidebar footer, so an install button always
 * stays on the main screen. Closing is remembered on this device (`localStorage`, one of
 * `USER_STORAGE_KEYS`) and forgotten when the session ends.
 */
@Service()
export class ExtensionBannerService {
  private readonly extension = inject(BrowserExtensionService);
  private readonly storage = inject(SafeStorage);
  private readonly dismissed = signal(this.readDismissed());

  readonly storeUrl = this.extension.storeUrl;
  readonly bannerShown = computed(() => this.extension.offered() && !this.dismissed());
  readonly entryShown = computed(() => this.extension.offered() && this.dismissed());

  constructor() {
    inject(SessionScope).onEnd(() => this.dismissed.set(false));
  }

  dismiss(): void {
    this.dismissed.set(true);
    // Blocked storage: closed for this visit only.
    this.storage.set(STORAGE_KEY.ExtensionBannerDismissed, DISMISSED);
  }

  private readDismissed(): boolean {
    return this.storage.getString(STORAGE_KEY.ExtensionBannerDismissed) === DISMISSED;
  }
}
