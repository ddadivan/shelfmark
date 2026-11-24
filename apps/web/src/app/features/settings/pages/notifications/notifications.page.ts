import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { UpdateNotificationSettings } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  ButtonComponent,
  ICON_SIZE,
  IconComponent,
  SelectComponent,
  SettingsRowComponent,
  SettingsSectionComponent,
  SwitchComponent,
  TOAST_KIND,
  ToastService,
  type SelectOption,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { DeviceNotificationsService } from '../../../notifications/services/device-notifications.service';
import { EMAIL_ENABLED } from '../../../notifications/models/email-enabled.const';
import { NotificationSettingsStore } from '../../../notifications/services/notification-settings.store';
import { quietHourValues } from '../../../notifications/utils/quiet-hours';
import { SettingsPageHeaderComponent } from '../../components/settings-page-header/settings-page-header.component';

/**
 * `/settings/notifications` (Shelf 05-settings Notifications, 12-notify): "On this device" (the
 * browser's permission as a switch, a test, or the steps when the browser blocks it or iOS needs
 * the Home Screen), then, while the server can deliver (`NotificationSettingsStore.available`),
 * what to send, quiet hours and the devices.
 */
@Component({
  selector: 'app-settings-notifications-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    IconComponent,
    SelectComponent,
    SettingsPageHeaderComponent,
    SettingsRowComponent,
    SettingsSectionComponent,
    SwitchComponent,
  ],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotificationsPage {
  protected readonly device = inject(DeviceNotificationsService);
  protected readonly store = inject(NotificationSettingsStore);
  protected readonly locale = inject(LocaleService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly ICON_SIZE = ICON_SIZE;
  /** Shelf: email postponed by the author; the weekly email row stays hidden. */
  protected readonly EMAIL_ENABLED = EMAIL_ENABLED;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  /** The address shown in the "blocked" steps. */
  protected readonly site = inject(DOCUMENT).defaultView?.location.host ?? '';

  /** Whole hours, written in the account's clock. */
  protected readonly hourOptions = computed<SelectOption[]>(() => {
    this.locale.settings();
    return quietHourValues().map((value) => ({
      id: value,
      name: this.locale.formatTime(new Date(`2000-01-01T${value}:00`)),
    }));
  });

  constructor() {
    this.device.refresh();
    void this.store.load();
  }

  protected async setDevice(on: boolean): Promise<void> {
    if (!on) {
      this.device.turnOff();
      return;
    }
    if (!(await this.device.turnOn()) && this.device.blocked()) {
      this.toasts.show({
        kind: TOAST_KIND.Info,
        title: this.t('settings.notifications.blocked.title'),
      });
    }
  }

  protected async test(): Promise<void> {
    const shown = await this.device.test(
      this.t('settings.notifications.test.title'),
      this.t('settings.notifications.test.body'),
    );
    if (!shown) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('settings.notifications.test.failed'),
      });
    }
  }

  protected setQuietFrom(value: string | null): void {
    void this.save(
      value === null
        ? { quietFrom: null, quietTo: null }
        : { quietFrom: value, quietTo: this.store.settings().quietTo ?? '08:00' },
    );
  }

  protected async save(change: UpdateNotificationSettings): Promise<void> {
    if (!(await this.store.update(change))) {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('settings.notifications.failed') });
    }
  }

  protected async removeDevice(id: string, name: string): Promise<void> {
    if (!(await this.store.removeDevice(id))) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('settings.notifications.failed'),
        detail: name,
      });
    }
  }

  private t(key: string): string {
    return this.transloco.translate(key);
  }
}
