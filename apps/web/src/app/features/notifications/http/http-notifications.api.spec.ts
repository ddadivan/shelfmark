import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NOTIFICATION_DEFAULTS, type NotificationSettingsResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { HttpNotificationsApi } from './http-notifications.api';

const ANSWER: NotificationSettingsResponse = {
  available: true,
  publicKey: 'key',
  settings: NOTIFICATION_DEFAULTS,
  devices: [],
};

describe('HttpNotificationsApi', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      api: TestBed.inject(HttpNotificationsApi),
      http: TestBed.inject(HttpTestingController),
    };
  }

  it('reads and changes the settings', async () => {
    const { api, http } = setup();
    const read = firstValueFrom(api.get());
    http.expectOne({ method: 'GET', url: '/api/me/notifications' }).flush(ANSWER);
    expect(await read).toEqual(ANSWER);

    const write = firstValueFrom(api.update({ reminders: false }));
    const req = http.expectOne({ method: 'PATCH', url: '/api/me/notifications' });
    expect(req.request.body).toEqual({ reminders: false });
    req.flush(ANSWER);
    await write;
    http.verify();
  });

  it('adds and removes devices and sends a test', async () => {
    const { api, http } = setup();
    const body = {
      endpoint: 'https://fcm.googleapis.com/x',
      keys: { p256dh: 'p', auth: 'a' },
      name: 'Chrome on macOS',
      timeZone: 'UTC',
    };
    const add = firstValueFrom(api.addDevice(body));
    const post = http.expectOne({ method: 'POST', url: '/api/me/notifications/devices' });
    expect(post.request.body).toEqual(body);
    post.flush({ ...ANSWER, deviceId: 'd1' });
    expect((await add).deviceId).toBe('d1');

    const remove = firstValueFrom(api.removeDevice('d/1'));
    http.expectOne({ method: 'DELETE', url: '/api/me/notifications/devices/d%2F1' }).flush(ANSWER);
    await remove;

    const test = firstValueFrom(api.test());
    http.expectOne({ method: 'POST', url: '/api/me/notifications/test' }).flush({ sent: 2 });
    expect((await test).sent).toBe(2);
    http.verify();
  });
});
