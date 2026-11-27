import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_DURATION_MS, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { NOTIFICATION_LIMIT } from '../models/notification-limit.const';
import { NOTIFICATION_PERMISSION } from '../models/notification-permission.const';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { DeviceNotificationsService } from './device-notifications.service';

/**
 * "Asking at the right moment" (Shelf 12-notify): right after a reminder is set, while this
 * browser has never been asked, the confirmation toast becomes a short question with "Turn on
 * notifications" (only then the browser's own prompt appears) and "Not now" (hidden for 30 days).
 * Never on its own, never twice in a row, never once the browser blocked it.
 */
@Service()
export class NotificationPromptService {
  private readonly device = inject(DeviceNotificationsService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly storage = inject(SafeStorage);

  /** Shows the question in place of the "Reminder set" toast; false when it should not ask. */
  offer(title: string, detail?: string): boolean {
    this.device.refresh();
    if (
      this.device.permission() !== NOTIFICATION_PERMISSION.Default ||
      this.device.needsHomeScreen ||
      this.recentlyDeclined()
    ) {
      return false;
    }
    this.toasts.show({
      kind: TOAST_KIND.Info,
      title,
      detail: detail ?? this.transloco.translate('notifications.prompt.question'),
      duration: TOAST_DURATION_MS.Sticky,
      action: {
        label: this.transloco.translate('notifications.prompt.turnOn'),
        run: () => void this.device.turnOn(),
      },
      secondary: {
        label: this.transloco.translate('notifications.prompt.notNow'),
        run: () => this.decline(),
      },
    });
    return true;
  }

  private recentlyDeclined(): boolean {
    const at = this.storage.getNumber(STORAGE_KEY.NotificationsAsked);
    return at !== null && at > 0 && Date.now() - at < NOTIFICATION_LIMIT.AskAgainAfterMs;
  }

  private decline(): void {
    // Storage blocked: the question may come back after the next reminder.
    this.storage.set(STORAGE_KEY.NotificationsAsked, String(Date.now()));
  }
}
