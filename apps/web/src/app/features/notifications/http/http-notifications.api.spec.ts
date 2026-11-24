import { firstValueFrom } from 'rxjs';
import { HttpNotificationsApi } from './http-notifications.api';

describe('HttpNotificationsApi', () => {
  it('answers "not available" without a request', async () => {
    const api = new HttpNotificationsApi();
    expect((await firstValueFrom(api.get())).available).toBe(false);
    expect((await firstValueFrom(api.update())).available).toBe(false);
    expect((await firstValueFrom(api.removeDevice())).devices).toEqual([]);
  });
});
