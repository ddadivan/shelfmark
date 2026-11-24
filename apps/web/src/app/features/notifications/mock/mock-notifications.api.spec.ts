import { firstValueFrom } from 'rxjs';
import { MOCK_NOTIFICATIONS_STORAGE_KEY } from './models/mock-notifications-storage-key.const';
import { MockNotificationsApi } from './mock-notifications.api';

const DEVICE = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/mock',
  keys: { p256dh: 'p', auth: 'a' },
  name: 'Chrome on macOS',
  timeZone: 'UTC',
};

describe('MockNotificationsApi', () => {
  afterEach(() => localStorage.removeItem(MOCK_NOTIFICATIONS_STORAGE_KEY));

  it('starts with the defaults and one other device, keeps changes and removes devices', async () => {
    const api = new MockNotificationsApi();
    const first = await firstValueFrom(api.get());
    expect(first.available).toBe(true);
    expect(first.publicKey).toBeNull();
    expect(first.settings.reminders).toBe(true);
    expect(first.devices).toHaveLength(1);

    await firstValueFrom(api.update({ continueReading: true, quietFrom: '22:00', quietTo: 'bad' }));
    const changed = await firstValueFrom(api.get());
    expect(changed.settings).toMatchObject({
      continueReading: true,
      quietFrom: null,
      quietTo: null,
    });
    await firstValueFrom(api.update({ quietFrom: '22:00', quietTo: '08:00' }));
    expect((await firstValueFrom(api.get())).settings.quietTo).toBe('08:00');

    const removed = await firstValueFrom(api.removeDevice(first.devices[0]?.id ?? ''));
    expect(removed.devices).toEqual([]);
  });

  it('adds a device once per endpoint, never answers the endpoint and counts it in a test', async () => {
    const api = new MockNotificationsApi();
    const added = await firstValueFrom(api.addDevice(DEVICE));
    const again = await firstValueFrom(api.addDevice({ ...DEVICE, name: 'Chrome on Windows' }));
    expect(again.deviceId).toBe(added.deviceId);
    expect(again.devices).toHaveLength(2);
    expect(JSON.stringify(again)).not.toContain(DEVICE.endpoint);
    expect((await firstValueFrom(api.test())).sent).toBe(2);
  });

  it('reads a broken stored value as the defaults', async () => {
    localStorage.setItem(MOCK_NOTIFICATIONS_STORAGE_KEY, '{oops');
    const answer = await firstValueFrom(new MockNotificationsApi().get());
    expect(answer.settings.reminders).toBe(true);
  });
});
