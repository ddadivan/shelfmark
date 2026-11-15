import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { RemindersStore } from '../../../stores/reminders.store';
import { RemindDialogComponent } from '../components/remind-dialog/remind-dialog.component';
import type { RemindDialogData } from '../models/remind-dialog-data.interface';
import type { RemindDialogResult } from '../models/remind-dialog-result.interface';
import type { RemindOption } from '../models/remind-option.interface';
import { ReminderFormatService } from './reminder-format.service';

/**
 * What a user does with reminders (#275): "Remind me" on one link or a selection (the dialog),
 * snooze to a preset, Done. The store saves; this service asks, confirms with a toast and says
 * when a request failed (with Retry). Components only emit.
 */
@Service()
export class ReminderActionsService {
  private readonly store = inject(RemindersStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly format = inject(ReminderFormatService);

  /** "Remind me" (or "Change"): the dialog, then the save. Resolves `true` when something changed. */
  async remind(links: readonly LinkResponse[]): Promise<boolean> {
    const [first] = links;
    if (!first) {
      return false;
    }
    const single = links.length === 1;
    const result = await this.dialogs.open<
      RemindDialogComponent,
      RemindDialogResult,
      RemindDialogData
    >(RemindDialogComponent, {
      size: DIALOG_SIZE.Sm,
      data: {
        heading: single
          ? this.t('reminders.dialog.title')
          : this.t(pluralKey('reminders.dialog.titleMany', links.length), {
              count: String(links.length),
            }),
        subtitle: single ? first.title : undefined,
        current: single ? first.remindAt : null,
      },
    }).result;
    if (result === undefined) {
      return false;
    }
    return this.save(links, result.remindAt);
  }

  /** Snooze: the reminder moves to the preset's time. */
  snooze(link: LinkResponse, option: RemindOption): Promise<boolean> {
    return this.save([link], option.at.toISOString());
  }

  /** Done: the reminder is cleared. */
  done(link: LinkResponse): Promise<boolean> {
    return this.save([link], null);
  }

  private async save(links: readonly LinkResponse[], remindAt: string | null): Promise<boolean> {
    if (!(await this.store.set(links, remindAt))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('reminders.toast.failed'),
        detail: links.length === 1 ? links[0]?.title : undefined,
        action: {
          label: this.t('reminders.toast.retry'),
          run: () => void this.save(links, remindAt),
        },
      });
      return false;
    }
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title:
        remindAt === null
          ? this.t(pluralKey('reminders.toast.cleared', links.length), {
              count: String(links.length),
            })
          : this.t('reminders.toast.set', { when: this.format.when(remindAt) }),
      detail: links.length === 1 ? links[0]?.title : undefined,
    });
    return true;
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
