import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { REMINDERS_SEEN_STORAGE_KEY } from '../../../core/auth/models/reminders-seen-storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';
import { RemindersStore } from '../../../stores/reminders.store';

/**
 * The gentle note on app open (#275): when reminders became due since the last visit on this
 * device, one toast says so (the title of a single link, "Show" opens the Reminders page). Asked
 * once per session; the latest due time it announced is kept in `localStorage`
 * (`REMINDERS_SEEN_STORAGE_KEY`, a per-user key cleared at sign-out). Nothing runs in the
 * background: a reminder that comes while the app is open shows on the next open.
 */
@Service()
export class ReminderNoticeService {
  private readonly store = inject(RemindersStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  private checked = false;

  constructor() {
    inject(SessionScope).onEnd(() => (this.checked = false));
  }

  /** Loads the due count (the sidebar badge) and, when something is due, announces what is new. */
  async check(): Promise<void> {
    if (this.checked) {
      return;
    }
    this.checked = true;
    await this.store.loadCount();
    if (this.store.dueCount() === 0) {
      return;
    }
    await this.store.load();
    const seen = this.readSeen();
    const fresh = this.store.due().filter((link) => seen === null || (link.remindAt ?? '') > seen);
    const latest = this.store
      .due()
      .reduce<string>(
        (max, link) => ((link.remindAt ?? '') > max ? (link.remindAt ?? '') : max),
        '',
      );
    if (latest) {
      this.writeSeen(latest);
    }
    if (fresh.length === 0) {
      return;
    }
    const [first] = fresh;
    this.toasts.show({
      kind: TOAST_KIND.Warn,
      title: this.transloco.translate(pluralKey('reminders.toast.due', fresh.length), {
        count: String(fresh.length),
      }),
      detail: fresh.length === 1 ? first?.title : undefined,
      action: {
        label: this.transloco.translate('reminders.toast.show'),
        run: () => void this.router.navigateByUrl(`/${APP_PATH.Reminders}`),
      },
    });
  }

  private readSeen(): string | null {
    try {
      return this.storage?.getItem(REMINDERS_SEEN_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private writeSeen(value: string): void {
    try {
      this.storage?.setItem(REMINDERS_SEEN_STORAGE_KEY, value);
    } catch {
      // Blocked storage: the note may show again on the next open, which is harmless.
    }
  }
}
