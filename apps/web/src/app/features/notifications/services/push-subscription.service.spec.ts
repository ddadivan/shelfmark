import { TestBed } from '@angular/core/testing';
import { SwPush } from '@angular/service-worker';
import { NOTIFICATION_DEFAULTS, type NotificationSettingsResponse } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { PUSH_DEVICE_STORAGE_KEY } from '../../../core/auth/models/push-device-storage-key.const';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { NOTIFICATIONS_API } from '../models/notifications-api.const';
import { NotificationSettingsStore } from './notification-settings.store';
import { PushSubscriptionService } from './push-subscription.service';

const ANSWER: NotificationSettingsResponse = {
  available: true,
  publicKey: 'server-key',
  settings: NOTIFICATION_DEFAULTS,
  devices: [],
};

function setup({
  enabled = true,
  answer = ANSWER,
}: { enabled?: boolean; answer?: NotificationSettingsResponse } = {}) {
  const subscription = {
    toJSON: () => ({
      endpoint: 'https://fcm.googleapis.com/fcm/send/x',
      keys: { p256dh: 'p', auth: 'a' },
    }),
  };
  const swPush = {
    isEnabled: enabled,
    requestSubscription: vi.fn(() => Promise.resolve(subscription)),
    unsubscribe: vi.fn(() => Promise.resolve()),
  };
  const api = {
    get: vi.fn(() => of(answer)),
    update: vi.fn(),
    addDevice: vi.fn(() =>
      of({
        ...answer,
        deviceId: 'd1',
        devices: [{ id: 'd1', name: 'Chrome', createdAt: 'x', lastUsedAt: null }],
      }),
    ),
    removeDevice: vi.fn(() => of(answer)),
    test: vi.fn(() => of({ sent: 1 })),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: SwPush, useValue: swPush },
      { provide: NOTIFICATIONS_API, useValue: api },
    ],
  });
  return {
    push: TestBed.inject(PushSubscriptionService),
    store: TestBed.inject(NotificationSettingsStore),
    scope: TestBed.inject(SessionScope),
    swPush,
    api,
  };
}

describe('PushSubscriptionService', () => {
  afterEach(() => localStorage.removeItem(PUSH_DEVICE_STORAGE_KEY));

  it('subscribes with the server key, stores the device and its id', async () => {
    const { push, store, swPush, api } = setup();

    expect(await push.subscribe('Chrome on macOS')).toBe(true);
    expect(swPush.requestSubscription).toHaveBeenCalledWith({ serverPublicKey: 'server-key' });
    expect(api.addDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://fcm.googleapis.com/fcm/send/x',
        name: 'Chrome on macOS',
      }),
    );
    expect(push.deviceId()).toBe('d1');
    expect(store.devices()).toHaveLength(1);

    expect(await push.sendTest()).toBe(true);
    await push.unsubscribe();
    expect(api.removeDevice).toHaveBeenCalledWith('d1');
    expect(swPush.unsubscribe).toHaveBeenCalled();
    expect(push.deviceId()).toBeNull();
  });

  it('does nothing without a service worker or while the server cannot push', async () => {
    expect(await setup({ enabled: false }).push.subscribe('x')).toBe(false);
    TestBed.resetTestingModule();
    const off = setup({ answer: { ...ANSWER, available: false, publicKey: null } });
    expect(await off.push.subscribe('x')).toBe(false);
    expect(off.swPush.requestSubscription).not.toHaveBeenCalled();
    expect(await off.push.sendTest()).toBe(false);
  });

  it('answers false when the browser or the API refuses', async () => {
    const { push, api } = setup();
    api.addDevice.mockReturnValueOnce(throwError(() => new Error('409')));
    expect(await push.subscribe('x')).toBe(false);
    expect(push.deviceId()).toBeNull();
  });

  it('removes the device before sign-out and drops the browser subscription at the end', async () => {
    const { push, scope, swPush, api } = setup();
    push.init();
    push.init();
    await push.subscribe('x');

    await scope.flush();
    expect(api.removeDevice).toHaveBeenCalledTimes(1);
    scope.end();
    await Promise.resolve();
    expect(swPush.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
