import { DOCUMENT } from '@angular/common';
import { inject, Injector, Service } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { SafeStorage } from '../../../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../../../core/storage/models/storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { NOTIFICATIONS_API } from '../models/notifications-api.const';
import { toDeviceRequest } from '../utils/to-device-request';
import { NotificationSettingsStore } from './notification-settings.store';

/**
 * This browser's Web Push subscription (Shelf 12-notify). The Angular service worker (`ngsw`)
 * receives the pushes and shows them by itself (`notification` payloads with `onActionClick`),
 * so the app only subscribes through `SwPush` with the server's VAPID key and hands the
 * subscription to the API (`NOTIFICATIONS_API.addDevice`). The device id is kept per user
 * (`STORAGE_KEY.NotificationsPushDevice`). Nothing happens without a service worker (dev and mock builds)
 * or while the server cannot push. On sign-out the device is removed while the session is still
 * valid, and on every session end the browser's subscription is dropped, so the next person on
 * this browser never gets the previous user's reminders.
 */
@Service()
export class PushSubscriptionService {
  private readonly swPush = inject(SwPush, { optional: true });
  // Resolved on use: the app initializer and every user of DeviceNotificationsService create this
  // service, while the API seam is only needed once something is subscribed.
  private readonly injector = inject(Injector);
  private readonly session = inject(SessionScope);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly storage = inject(SafeStorage);
  private started = false;

  private get api() {
    return this.injector.get(NOTIFICATIONS_API);
  }

  private get store(): NotificationSettingsStore {
    return this.injector.get(NotificationSettingsStore);
  }

  /** Registers the session end handlers (app initializer; no request). Idempotent. */
  init(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.session.beforeEnd(() => this.removeDevice());
    this.session.onEnd(() => void this.dropBrowserSubscription());
  }

  /** True when this browser can hold a push subscription (a running service worker). */
  get supported(): boolean {
    return this.swPush?.isEnabled === true;
  }

  /** The device id of this browser on the account, when it subscribed. */
  deviceId(): string | null {
    return this.storage.getString(STORAGE_KEY.NotificationsPushDevice);
  }

  /**
   * Subscribes this browser (the permission must already be granted) and stores the device.
   * True when the server now has it; false without a service worker, a key or on any failure.
   */
  async subscribe(name: string): Promise<boolean> {
    const swPush = this.swPush;
    if (!swPush?.isEnabled) {
      return false;
    }
    try {
      if (!this.store.loaded()) {
        await this.store.load();
      }
      const serverPublicKey = this.store.publicKey();
      if (!this.store.available() || serverPublicKey === null) {
        return false;
      }
      const subscription = await swPush.requestSubscription({ serverPublicKey });
      const body = toDeviceRequest(subscription.toJSON(), name, this.timeZone());
      if (body === null) {
        return false;
      }
      const answer = await firstValueFrom(this.api.addDevice(body));
      this.writeDeviceId(answer.deviceId);
      this.store.apply(answer);
      return true;
    } catch {
      return false;
    }
  }

  /** Turns push off here: removes the device on the account and drops the browser subscription. */
  async unsubscribe(): Promise<void> {
    await this.removeDevice();
    await this.dropBrowserSubscription();
  }

  /** A real push to every device of the account; false when the server cannot or nothing took it. */
  async sendTest(): Promise<boolean> {
    if (!this.supported || this.deviceId() === null || !this.store.available()) {
      return false;
    }
    try {
      return (await firstValueFrom(this.api.test())).sent > 0;
    } catch {
      return false;
    }
  }

  private async removeDevice(): Promise<void> {
    const id = this.deviceId();
    if (id === null) {
      return;
    }
    this.writeDeviceId(null);
    try {
      this.store.apply(await firstValueFrom(this.api.removeDevice(id)));
    } catch {
      // Gone already or offline: the push service's 410 removes the row on the next push.
    }
  }

  private async dropBrowserSubscription(): Promise<void> {
    if (!this.swPush?.isEnabled) {
      return;
    }
    try {
      await this.swPush.unsubscribe();
    } catch {
      // No subscription: nothing to drop.
    }
  }

  private writeDeviceId(id: string | null): void {
    // Storage blocked: turning off here then cannot name the device; the list still can.
    if (id === null) {
      this.storage.remove(STORAGE_KEY.NotificationsPushDevice);
    } else {
      this.storage.set(STORAGE_KEY.NotificationsPushDevice, id);
    }
  }

  private timeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
}
