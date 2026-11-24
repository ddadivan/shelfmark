import { toDeviceRequest } from './to-device-request';

describe('toDeviceRequest', () => {
  it('builds the API body from a subscription', () => {
    expect(
      toDeviceRequest(
        { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'p', auth: 'a' } },
        'Chrome on macOS',
        'Europe/Berlin',
      ),
    ).toEqual({
      endpoint: 'https://fcm.googleapis.com/x',
      keys: { p256dh: 'p', auth: 'a' },
      name: 'Chrome on macOS',
      timeZone: 'Europe/Berlin',
    });
  });

  it('answers null when the endpoint or a key is missing', () => {
    expect(toDeviceRequest({ keys: { p256dh: 'p', auth: 'a' } }, 'x', 'UTC')).toBeNull();
    expect(
      toDeviceRequest({ endpoint: 'https://a.test', keys: { p256dh: 'p' } }, 'x', 'UTC'),
    ).toBeNull();
    expect(toDeviceRequest({ endpoint: 'https://a.test' }, 'x', 'UTC')).toBeNull();
  });
});
