import { TestBed } from '@angular/core/testing';
import {
  NOTIFICATION_DEFAULTS,
  type NotificationSettingsResponse,
  type UpdateNotificationSettings,
} from '@shelfmark/contracts';
import { of } from 'rxjs';
import { axeViolations } from '../../../../../testing/axe';
import { buttonWith, setupSettingsPage } from '../../../../../testing/settings-page-testbed';
import { NOTIFICATIONS_API } from '../../../notifications/models/notifications-api.const';
import NotificationsPage from './notifications.page';

class FakeNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(() => {
    FakeNotification.permission = 'granted';
    return Promise.resolve(FakeNotification.permission);
  });
  static shown: string[] = [];
  constructor(title: string) {
    FakeNotification.shown.push(title);
  }
}

async function setup({
  available = true,
  permission,
}: { available?: boolean; permission?: NotificationPermission } = {}) {
  if (permission) {
    FakeNotification.permission = permission;
    FakeNotification.shown = [];
    vi.stubGlobal('Notification', FakeNotification);
  }
  let answer: NotificationSettingsResponse = {
    available,
    publicKey: available ? 'key' : null,
    settings: NOTIFICATION_DEFAULTS,
    devices: [
      {
        id: 'd1',
        name: 'Shelfmark on Pixel 8',
        createdAt: '2026-11-03T09:00:00.000Z',
        lastUsedAt: null,
      },
    ],
  };
  const api = {
    get: vi.fn(() => of(answer)),
    update: vi.fn((change: UpdateNotificationSettings) => {
      answer = { ...answer, settings: { ...answer.settings, ...change } };
      return of(answer);
    }),
    removeDevice: vi.fn(() => {
      answer = { ...answer, devices: [] };
      return of(answer);
    }),
    addDevice: vi.fn(() => of({ ...answer, deviceId: 'd2' })),
    test: vi.fn(() => of({ sent: 1 })),
  };
  TestBed.configureTestingModule({ providers: [{ provide: NOTIFICATIONS_API, useValue: api }] });
  const page = await setupSettingsPage(NotificationsPage, 'notifications');
  await page.harness.fixture.whenStable();
  return { ...page, api };
}

function headings(root: HTMLElement): (string | undefined)[] {
  return Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());
}

describe('NotificationsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem('sm-notifications-device');
  });

  it('says when the browser cannot show notifications', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Notifications');
    expect(root.textContent).toContain("This browser can't show notifications.");
    expect(root.querySelector('button[aria-label="Browser notifications"]')).toBeNull();
  });

  it('shows what to send, quiet hours and devices while the server can deliver', async () => {
    const { root, api, harness } = await setup();

    expect(headings(root)).toEqual(['On this device', 'What to send', 'Quiet hours', 'Devices']);
    const nudge = root.querySelector<HTMLButtonElement>(
      'button[role="switch"][aria-label="Continue reading"]',
    );
    nudge?.click();
    await harness.fixture.whenStable();
    expect(api.update).toHaveBeenCalledWith({ continueReading: true });
    expect(root.textContent).not.toContain('weekly email');

    buttonWith(root, 'Turn off')?.click();
    await harness.fixture.whenStable();
    expect(api.removeDevice).toHaveBeenCalledWith('d1');
    expect(root.textContent).toContain('No device has notifications on.');
    expect(await axeViolations(root)).toEqual([]);
  });

  it('shows only the device part while the server cannot deliver', async () => {
    const { root } = await setup({ available: false });

    expect(headings(root)).toEqual(['On this device']);
  });

  it('asks the browser from the switch and then sends a test', async () => {
    const { root, harness } = await setup({ permission: 'default' });
    const toggle = root.querySelector<HTMLButtonElement>(
      'button[role="switch"][aria-label="Browser notifications"]',
    );
    expect(toggle?.getAttribute('aria-checked')).toBe('false');

    toggle?.click();
    await harness.fixture.whenStable();
    expect(FakeNotification.requestPermission).toHaveBeenCalled();
    expect(toggle?.getAttribute('aria-checked')).toBe('true');

    buttonWith(root, 'Send a test')?.click();
    await harness.fixture.whenStable();
    expect(FakeNotification.shown).toEqual(['Shelfmark']);

    toggle?.click();
    await harness.fixture.whenStable();
    expect(localStorage.getItem('sm-notifications-device')).toBe('off');
  });

  it('explains how to unblock when the browser blocked notifications', async () => {
    const { root } = await setup({ permission: 'denied' });

    expect(root.querySelector('[data-testid="notifications-blocked"]')?.textContent).toContain(
      'Notifications are blocked in this browser',
    );
    expect(root.querySelector('button[aria-label="Browser notifications"]')).toBeNull();
  });
});
