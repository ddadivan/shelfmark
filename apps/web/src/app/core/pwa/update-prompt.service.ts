import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_DURATION_MS, TOAST_KIND } from '@shelfmark/ui';
import { filter } from 'rxjs';
import { LazyToastService } from '../toast/lazy-toast.service';

/** `VersionEvent.type` of a downloaded version that is ready to activate. */
const VERSION_READY = 'VERSION_READY';

/**
 * The update prompt (#424): when the service worker has downloaded a new version, a toast "A new
 * version of Shelfmark is ready" with Reload and Later. Once per version and load; it stays until
 * the user picks one, and it never reloads on its own, so an open dialog or a half-typed note is
 * never lost. Without a service worker (dev server, tests) it does nothing.
 */
@Service()
export class UpdatePromptService {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(LazyToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly location = inject(DOCUMENT).location;
  private readonly destroyRef = inject(DestroyRef);
  /** Hashes of the versions already announced in this load. */
  private readonly prompted = new Set<string>();
  private started = false;

  /** Starts listening (idempotent); an app initializer calls it. */
  init(): void {
    if (this.started || !this.updates.isEnabled) {
      return;
    }
    this.started = true;
    this.updates.versionUpdates
      .pipe(
        filter((event): event is VersionReadyEvent => event.type === VERSION_READY),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.prompt(event.latestVersion.hash));
  }

  private prompt(hash: string): void {
    if (this.prompted.has(hash)) {
      return;
    }
    this.prompted.add(hash);
    this.toasts.show({
      kind: TOAST_KIND.Info,
      title: this.transloco.translate('update.available'),
      duration: TOAST_DURATION_MS.Sticky,
      action: {
        label: this.transloco.translate('update.reload'),
        run: () => this.location.reload(),
      },
      secondary: { label: this.transloco.translate('update.later'), run: () => undefined },
    });
  }
}
