import { firstValueFrom } from 'rxjs';
import { MOCK_NOTIFICATIONS_STORAGE_KEY } from './models/mock-notifications-storage-key.const';
import { MockNotificationsApi } from './mock-notifications.api';

describe('MockNotificationsApi', () => {
  afterEach(() => localStorage.removeItem(MOCK_NOTIFICATIONS_STORAGE_KEY));

  it('starts with the defaults and one other device, keeps changes and removes devices', async () => {
    const api = new MockNotificationsApi();
    const first = await firstValueFrom(api.get());
    expect(first.available).toBe(true);
    expect(first.settings.reminders).toBe(true);
    expect(first.devices).toHaveLength(1);

    await firstValueFrom(api.update({ weeklyEmail: true, quietFrom: '22:00', quietTo: 'bad' }));
    const changed = await firstValueFrom(api.get());
    expect(changed.settings).toMatchObject({
      weeklyEmail: true,
      quietFrom: '22:00',
      quietTo: null,
    });

    const removed = await firstValueFrom(api.removeDevice(first.devices[0]?.id ?? ''));
    expect(removed.devices).toEqual([]);
  });

  it('reads a broken stored value as the defaults', async () => {
    localStorage.setItem(MOCK_NOTIFICATIONS_STORAGE_KEY, '{oops');
    const answer = await firstValueFrom(new MockNotificationsApi().get());
    expect(answer.settings.reminders).toBe(true);
  });
});
