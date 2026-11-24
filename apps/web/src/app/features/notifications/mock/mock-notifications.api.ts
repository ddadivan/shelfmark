import { Service } from '@angular/core';
import {
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_LIMIT,
  NOTIFICATION_TIME_PATTERN,
  type AddNotificationDeviceRequest,
  type AddNotificationDeviceResponse,
  type NotificationDevice,
  type NotificationSettings,
  type NotificationSettingsResponse,
  type NotificationTestResponse,
  type UpdateNotificationSettings,
} from '@shelfmark/contracts';
import { defer, delay, of, throwError, type Observable } from 'rxjs';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { NotificationsApi } from '../models/notifications-api.interface';
import { MOCK_NOTIFICATIONS_STORAGE_KEY } from './models/mock-notifications-storage-key.const';

/** The second device of the mock account (this one is described by the browser itself). */
const MOCK_OTHER_DEVICE: NotificationDevice = {
  id: 'mock-device-phone',
  name: 'Shelfmark on Pixel 8',
  createdAt: '2026-11-03T09:00:00.000Z',
  lastUsedAt: null,
};

interface StoredDevice extends NotificationDevice {
  /** The subscription endpoint, kept only to recognise a re-subscribe; never answered. */
  endpoint?: string;
}

interface Stored {
  settings: NotificationSettings;
  devices: StoredDevice[];
}

function isDevice(value: unknown): value is StoredDevice {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Partial<Record<keyof StoredDevice, unknown>>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.createdAt === 'string'
  );
}

function pickSettings(value: unknown): NotificationSettings {
  const item = (typeof value === 'object' && value !== null ? value : {}) as Partial<
    Record<keyof NotificationSettings, unknown>
  >;
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
  const time = (v: unknown): string | null =>
    typeof v === 'string' && NOTIFICATION_TIME_PATTERN.test(v) ? v : null;
  const quietFrom = time(item.quietFrom);
  const quietTo = time(item.quietTo);
  const pair = quietFrom !== null && quietTo !== null;
  return {
    reminders: bool(item.reminders, NOTIFICATION_DEFAULTS.reminders),
    continueReading: bool(item.continueReading, NOTIFICATION_DEFAULTS.continueReading),
    quietFrom: pair ? quietFrom : null,
    quietTo: pair ? quietTo : null,
  };
}

function read(): Stored {
  try {
    const raw = globalThis.localStorage.getItem(MOCK_NOTIFICATIONS_STORAGE_KEY);
    if (raw === null) {
      return { settings: NOTIFICATION_DEFAULTS, devices: [MOCK_OTHER_DEVICE] };
    }
    const parsed = JSON.parse(raw) as { settings?: unknown; devices?: unknown };
    return {
      settings: pickSettings(parsed.settings),
      devices: Array.isArray(parsed.devices)
        ? parsed.devices.filter(isDevice).map((d) => ({ ...d, lastUsedAt: d.lastUsedAt ?? null }))
        : [],
    };
  } catch {
    return { settings: NOTIFICATION_DEFAULTS, devices: [MOCK_OTHER_DEVICE] };
  }
}

function write(stored: Stored): void {
  try {
    globalThis.localStorage.setItem(MOCK_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable: the change lasts until the next read.
  }
}

/**
 * MOCK (Shelf): notification settings of the mock account (mock builds only), kept in
 * `localStorage` (`sm-mock-notifications`) with one other device; nothing is ever pushed (the
 * service worker is off in dev builds, so no subscription is made either). `test` answers how
 * many devices there are. Follows the API: push only, quiet hours as a pair, the device cap.
 */
@Service()
export class MockNotificationsApi implements NotificationsApi {
  get(): Observable<NotificationSettingsResponse> {
    return defer(() => of(this.response(read()))).pipe(delay(MOCK_LATENCY_MS.List));
  }

  update(change: UpdateNotificationSettings): Observable<NotificationSettingsResponse> {
    return defer(() => {
      const stored = read();
      const next = { ...stored, settings: pickSettings({ ...stored.settings, ...change }) };
      write(next);
      return of(this.response(next));
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  addDevice(body: AddNotificationDeviceRequest): Observable<AddNotificationDeviceResponse> {
    return defer(() => {
      const stored = read();
      const same = stored.devices.find((device) => device.endpoint === body.endpoint);
      if (!same && stored.devices.length >= NOTIFICATION_LIMIT.DevicesPerUserMax) {
        return throwError(() => new Error('Too many devices'));
      }
      const device: StoredDevice = same
        ? { ...same, name: body.name }
        : {
            id: `mock-device-${Date.now().toString(36)}`,
            name: body.name,
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
            endpoint: body.endpoint,
          };
      const next = {
        ...stored,
        devices: same
          ? stored.devices.map((d) => (d.id === same.id ? device : d))
          : [...stored.devices, device],
      };
      write(next);
      return of({ ...this.response(next), deviceId: device.id });
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  removeDevice(id: string): Observable<NotificationSettingsResponse> {
    return defer(() => {
      const stored = read();
      const next = { ...stored, devices: stored.devices.filter((device) => device.id !== id) };
      write(next);
      return of(this.response(next));
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  test(): Observable<NotificationTestResponse> {
    return defer(() => of({ sent: read().devices.length })).pipe(delay(MOCK_LATENCY_MS.List));
  }

  private response(stored: Stored): NotificationSettingsResponse {
    return {
      available: true,
      publicKey: null,
      settings: stored.settings,
      devices: stored.devices.map(({ id, name, createdAt, lastUsedAt }) => ({
        id,
        name,
        createdAt,
        lastUsedAt,
      })),
    };
  }
}
