import { DOCUMENT } from '@angular/common';
import { Service, computed, inject, signal } from '@angular/core';
import { EXTENSION_BANNER_DISMISSED_STORAGE_KEY } from '../auth/models/extension-banner-dismissed-storage-key.const';
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
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  private readonly dismissed = signal(this.readDismissed());

  readonly storeUrl = this.extension.storeUrl;
  readonly bannerShown = computed(() => this.extension.offered() && !this.dismissed());
  readonly entryShown = computed(() => this.extension.offered() && this.dismissed());

  constructor() {
    inject(SessionScope).onEnd(() => this.dismissed.set(false));
  }

  dismiss(): void {
    this.dismissed.set(true);
    try {
      this.storage?.setItem(EXTENSION_BANNER_DISMISSED_STORAGE_KEY, DISMISSED);
    } catch {
      // Blocked storage: closed for this visit only.
    }
  }

  private readDismissed(): boolean {
    try {
      return this.storage?.getItem(EXTENSION_BANNER_DISMISSED_STORAGE_KEY) === DISMISSED;
    } catch {
      return false;
    }
  }
}
