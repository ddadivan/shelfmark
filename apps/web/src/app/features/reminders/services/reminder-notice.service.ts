import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injector, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { REMINDERS_SEEN_STORAGE_KEY } from '../../../core/auth/models/reminders-seen-storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { APP_PATH } from '../../../models/app-path.const';
import { RemindersStore } from '../../../stores/reminders.store';
import { linkHost } from '../../links/utils/link-view';
import { REMINDER_NOTICE } from '../models/reminder-notice.const';

/**
 * The note when reminders become due (#275, Shelf 12-notify "A reminder arrives"): on app open,
 * when reminders became due since the last visit on this device, one toast says so; while the
 * app stays open, the next upcoming reminder (within `REMINDER_NOTICE.WatchMaxMs`) is announced
 * the moment it is due, so a tab that is open does not wait for the next visit. One link: "<title>
 * is due" with its site, Open (opens the link) and Snooze (an hour); several: how many, Show opens
 * the Reminders page. The latest due time announced is kept in `localStorage`
 * (`REMINDERS_SEEN_STORAGE_KEY`, a per-user key cleared at sign-out).
 */
@Service()
export class ReminderNoticeService {
  private readonly store = inject(RemindersStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
  private checked = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(SessionScope).onEnd(() => {
      this.checked = false;
      this.stopWatch();
    });
    inject(DestroyRef).onDestroy(() => this.stopWatch());
  }

  /** Loads the due count (the sidebar badge) and, when something is due, announces what is new. */
  async check(): Promise<void> {
    if (this.checked) {
      return;
    }
    this.checked = true;
    await this.store.loadCount();
    // The lists also hold the upcoming reminders the open tab waits for.
    await this.store.load();
    if (this.store.dueCount() > 0) {
      this.announce();
    }
    this.watch();
  }

  /** Announces the due links not announced yet and remembers the latest due time. */
  private announce(): void {
    const seen = this.readSeen();
    const due = this.store.due();
    const fresh = due.filter((link) => seen === null || (link.remindAt ?? '') > seen);
    const latest = due.reduce<string>(
      (max, link) => ((link.remindAt ?? '') > max ? (link.remindAt ?? '') : max),
      '',
    );
    if (latest) {
      this.writeSeen(latest);
    }
    const [first] = fresh;
    if (first === undefined) {
      return;
    }
    if (fresh.length === 1) {
      this.showOne(first);
      return;
    }
    this.toasts.show({
      kind: TOAST_KIND.Warn,
      title: this.t(pluralKey('reminders.toast.due', fresh.length), {
        count: String(fresh.length),
      }),
      action: {
        label: this.t('reminders.toast.show'),
        run: () => void this.router.navigateByUrl(`/${APP_PATH.Reminders}`),
      },
    });
  }

  /** "<title> is due" with Open and Snooze (Shelf 12-notify, the in-app toast). */
  private showOne(link: LinkResponse): void {
    this.toasts.show({
      kind: TOAST_KIND.Warn,
      title: this.t('reminders.toast.dueOne', { title: link.title }),
      detail: linkHost(link.url),
      action: { label: this.t('reminders.toast.open'), run: () => void this.open(link) },
      secondary: { label: this.t('reminders.toast.snooze'), run: () => void this.snooze(link) },
    });
  }

  private async open(link: LinkResponse): Promise<void> {
    // Lazy: the link actions pull in the dialogs of the library.
    const { LinkActionsService } = await import('../../links/services/link-actions.service');
    this.injector.get(LinkActionsService).open(link);
  }

  private async snooze(link: LinkResponse): Promise<void> {
    const remindAt = new Date(Date.now() + REMINDER_NOTICE.SnoozeMs).toISOString();
    if (await this.store.set([link], remindAt)) {
      this.watch();
    }
  }

  /** Waits for the soonest upcoming reminder (when it is near enough) and announces it. */
  private watch(): void {
    this.stopWatch();
    const next = this.store
      .upcoming()
      .map((link) => Date.parse(link.remindAt ?? ''))
      .filter((at) => Number.isFinite(at))
      .sort((a, b) => a - b)[0];
    if (next === undefined) {
      return;
    }
    const wait = next - Date.now();
    if (wait > REMINDER_NOTICE.WatchMaxMs) {
      return;
    }
    this.timer = setTimeout(
      () => {
        this.timer = null;
        void this.store.open().then(() => {
          this.announce();
          this.watch();
        });
      },
      Math.max(0, wait) + REMINDER_NOTICE.GraceMs,
    );
  }

  private stopWatch(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
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
