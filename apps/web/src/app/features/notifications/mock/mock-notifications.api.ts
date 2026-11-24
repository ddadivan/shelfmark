import { Service } from '@angular/core';
import {
  NOTIFICATION_DEFAULTS,
  type NotificationDevice,
  type NotificationSettings,
  type NotificationSettingsResponse,
  type UpdateNotificationSettings,
} from '@shelfmark/contracts';
import { defer, delay, of, type Observable } from 'rxjs';
import { MOCK_LATENCY_MS } from '../../links/models/mock-latency.const';
import type { NotificationsApi } from '../models/notifications-api.interface';
import { MOCK_NOTIFICATIONS_STORAGE_KEY } from './models/mock-notifications-storage-key.const';

/** The second device of the mock account (this one is described by the browser itself). */
const MOCK_OTHER_DEVICE: NotificationDevice = {
  id: 'mock-device-phone',
  name: 'Shelfmark on Pixel 8',
  createdAt: '2026-11-03T09:00:00.000Z',
};

interface Stored {
  settings: NotificationSettings;
  devices: NotificationDevice[];
}

function isDevice(value: unknown): value is NotificationDevice {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Partial<Record<keyof NotificationDevice, unknown>>;
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
    typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : null;
  return {
    reminders: bool(item.reminders, NOTIFICATION_DEFAULTS.reminders),
    continueReading: bool(item.continueReading, NOTIFICATION_DEFAULTS.continueReading),
    weeklyEmail: bool(item.weeklyEmail, NOTIFICATION_DEFAULTS.weeklyEmail),
    quietFrom: time(item.quietFrom),
    quietTo: time(item.quietTo),
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
      devices: Array.isArray(parsed.devices) ? parsed.devices.filter(isDevice) : [],
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
 * `localStorage` (`sm-mock-notifications`) with one other device; nothing is ever delivered.
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

  removeDevice(id: string): Observable<NotificationSettingsResponse> {
    return defer(() => {
      const stored = read();
      const next = { ...stored, devices: stored.devices.filter((device) => device.id !== id) };
      write(next);
      return of(this.response(next));
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  private response(stored: Stored): NotificationSettingsResponse {
    return { available: true, settings: stored.settings, devices: stored.devices };
  }
}
