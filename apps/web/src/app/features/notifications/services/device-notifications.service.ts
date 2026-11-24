import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { NOTIFICATION_PERMISSION } from '../models/notification-permission.const';
import type { NotificationPermissionState } from '../models/notification-permission.type';
import { NOTIFICATION_STORAGE_KEY } from '../models/notification-storage-key.const';
import { deviceParts, needsHomeScreen } from '../utils/device-name';

/**
 * Notifications on this device (Shelf 05-settings "On this device", 12-notify): the browser's
 * permission, the device switch (a device preference: `NOTIFICATION_STORAGE_KEY.Device`), the
 * browser's own prompt (only from a user's press, never on its own) and a test notification.
 * Delivery of reminders while Shelfmark is closed needs Web Push on the server (not built).
 */
@Service()
export class DeviceNotificationsService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly transloco = inject(TranslocoService);

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
    return this.enabled();
  }

  turnOff(): void {
    this.writeOff(true);
  }

  /** Shows a sample notification (through the service worker when there is one). */
  async test(title: string, body: string): Promise<boolean> {
    if (!this.enabled() || !this.window) {
      return false;
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
    try {
      return this.window?.localStorage.getItem(NOTIFICATION_STORAGE_KEY.Device) === 'off';
    } catch {
      return false;
    }
  }

  private writeOff(off: boolean): void {
    this.switchedOff.set(off);
    try {
      if (off) {
        this.window?.localStorage.setItem(NOTIFICATION_STORAGE_KEY.Device, 'off');
      } else {
        this.window?.localStorage.removeItem(NOTIFICATION_STORAGE_KEY.Device);
      }
    } catch {
      // Storage blocked: the switch lasts for this load.
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
