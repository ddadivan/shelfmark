import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { NOTIFICATION_PERMISSION } from '../models/notification-permission.const';
import type { NotificationPermissionState } from '../models/notification-permission.type';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { deviceParts, needsHomeScreen } from '../utils/device-name';
import { PushSubscriptionService } from './push-subscription.service';

/**
 * Notifications on this device (Shelf 05-settings "On this device", 12-notify): the browser's
 * permission, the device switch (a device preference: `STORAGE_KEY.NotificationsDevice`), the
 * browser's own prompt (only from a user's press, never on its own) and a test notification.
 * Turning on also subscribes this browser to Web Push (`PushSubscriptionService`, in the
 * background) so reminders arrive while Shelfmark is closed; turning off removes the device.
 */
@Service()
export class DeviceNotificationsService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly storage = inject(SafeStorage);
  private readonly transloco = inject(TranslocoService);
  private readonly push = inject(PushSubscriptionService);

  private readonly permissionState = signal<NotificationPermissionState>(this.readPermission());
  private readonly switchedOff = signal(this.readOff());

  /** The browser's answer so far, or `unsupported`. */
  readonly permission = this.permissionState.asReadonly();
  readonly supported = computed(() => this.permission() !== NOTIFICATION_PERMISSION.Unsupported);
  readonly blocked = computed(() => this.permission() === NOTIFICATION_PERMISSION.Denied);
  /** Notifications allowed by the browser and not turned off here. */
  readonly enabled = computed(
    () => this.permission() === NOTIFICATION_PERMISSION.Granted && !this.switchedOff(),
  );
  /** iPhone or iPad Safari outside an app on the Home Screen: notifications cannot be asked. */
  readonly needsHomeScreen = needsHomeScreen(this.userAgent(), this.standalone());

  /** "Chrome on macOS", or a plain "This browser". */
  deviceName(): string {
    const { browser, system } = deviceParts(this.userAgent());
    if (browser && system) {
      return this.transloco.translate('notifications.device.name', { browser, system });
    }
    return this.transloco.translate('notifications.device.unknown');
  }

  /** Re-reads the permission (the person may have changed it in the browser meanwhile). */
  refresh(): void {
    this.permissionState.set(this.readPermission());
  }

  /** Turns notifications on here: asks the browser when it has not been asked. True when on. */
  async turnOn(): Promise<boolean> {
    const api = this.window?.Notification;
    if (!api) {
      return false;
    }
    if (api.permission === NOTIFICATION_PERMISSION.Default) {
      try {
        await api.requestPermission();
      } catch {
        // An old Safari answers through a callback only; the permission below tells.
      }
    }
    this.refresh();
    this.writeOff(false);
    if (this.enabled()) {
      void this.push.subscribe(this.deviceName());
    }
    return this.enabled();
  }

  turnOff(): void {
    this.writeOff(true);
    void this.push.unsubscribe();
  }

  /**
   * Shows a sample notification: a real push through the server when this browser is subscribed,
   * else a local one (through the service worker when there is one).
   */
  async test(title: string, body: string): Promise<boolean> {
    if (!this.enabled() || !this.window) {
      return false;
    }
    if (await this.push.sendTest()) {
      return true;
    }
    const options: NotificationOptions = { body, icon: '/icons/icon-192.png', tag: 'sm-test' };
    try {
      const registration = await this.window.navigator.serviceWorker?.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
      new this.window.Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }

  private readPermission(): NotificationPermissionState {
    const api = this.window?.Notification;
    if (!api) {
      return NOTIFICATION_PERMISSION.Unsupported;
    }
    switch (api.permission) {
      case NOTIFICATION_PERMISSION.Granted:
        return NOTIFICATION_PERMISSION.Granted;
      case NOTIFICATION_PERMISSION.Denied:
        return NOTIFICATION_PERMISSION.Denied;
      default:
        return NOTIFICATION_PERMISSION.Default;
    }
  }

  private readOff(): boolean {
    return this.storage.getString(STORAGE_KEY.NotificationsDevice) === 'off';
  }

  private writeOff(off: boolean): void {
    this.switchedOff.set(off);
    // Storage blocked: the switch lasts for this load.
    if (off) {
      this.storage.set(STORAGE_KEY.NotificationsDevice, 'off');
    } else {
      this.storage.remove(STORAGE_KEY.NotificationsDevice);
    }
  }

  private userAgent(): string {
    return this.window?.navigator.userAgent ?? '';
  }

  private standalone(): boolean {
    try {
      return this.window?.matchMedia('(display-mode: standalone)').matches ?? false;
    } catch {
      return false;
    }
  }
}
