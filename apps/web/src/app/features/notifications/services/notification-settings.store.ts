import { inject, Service, signal } from '@angular/core';
import {
  NOTIFICATION_DEFAULTS,
  type NotificationDevice,
  type NotificationSettings,
  type NotificationSettingsResponse,
  type UpdateNotificationSettings,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { NOTIFICATIONS_API } from '../models/notifications-api.const';

/**
 * Settings › Notifications on the account (root): loaded by the page, changes saved optimistically
 * with a rollback of the changed fields. `available` is false while the server cannot push (no
 * VAPID keys): the page then shows only the device part.
 */
@Service()
export class NotificationSettingsStore {
  private readonly api = inject(NOTIFICATIONS_API);

  readonly loaded = signal(false);
  readonly available = signal(false);
  /** The server's VAPID public key while it can push; `null` otherwise. */
  readonly publicKey = signal<string | null>(null);
  readonly settings = signal<NotificationSettings>(NOTIFICATION_DEFAULTS);
  readonly devices = signal<readonly NotificationDevice[]>([]);

  async load(): Promise<void> {
    try {
      this.apply(await firstValueFrom(this.api.get()));
    } catch {
      this.available.set(false);
    } finally {
      this.loaded.set(true);
    }
  }

  /** Saves a change at once; puts the changed fields back when the request fails. */
  async update(change: UpdateNotificationSettings): Promise<boolean> {
    const before = this.settings();
    this.settings.set({ ...before, ...change });
    try {
      const answer = await firstValueFrom(this.api.update(change));
      this.settings.set(answer.settings);
      return true;
    } catch {
      const keys = Object.keys(change) as (keyof NotificationSettings)[];
      this.settings.update((now) => {
        const back = { ...now };
        for (const key of keys) {
          Object.assign(back, { [key]: before[key] });
        }
        return back;
      });
      return false;
    }
  }

  /** Takes a whole answer of the API (also the push subscription's `addDevice`). */
  apply(answer: NotificationSettingsResponse): void {
    this.available.set(answer.available);
    this.publicKey.set(answer.publicKey);
    this.settings.set(answer.settings);
    this.devices.set(answer.devices);
    this.loaded.set(true);
  }

  async removeDevice(id: string): Promise<boolean> {
    try {
      const answer = await firstValueFrom(this.api.removeDevice(id));
      this.devices.set(answer.devices);
      return true;
    } catch {
      return false;
    }
  }
}
