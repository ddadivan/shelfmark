import { randomBytes } from 'node:crypto';
import { PUSH_ENV } from '../models/push-env.const';
import { reminderMessage, remindersSummaryMessage, testMessage } from './build-push-message';
import { isTimeZone } from './is-time-zone';
import { isAllowedPushEndpoint } from './push-endpoint-policy';
import { readPushConfig } from './push-config';
import { isQuietAt } from './quiet-hours';

const b64url = (bytes: number): string => randomBytes(bytes).toString('base64url');

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QK0abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
  ])('allows %s', (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  it.each([
    'http://fcm.googleapis.com/x',
    'https://notify.windows.com/x',
    'https://.notify.windows.com/x',
    'https://evilnotify.windows.com.example/x',
    'https://fcm.googleapis.com:444/x',
    'https://a:b@fcm.googleapis.com/x',
    'https://10.0.0.1/x',
    'not a url',
    42,
    `https://fcm.googleapis.com/${'a'.repeat(2048)}`,
  ])('refuses %s', (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });
});

describe('isQuietAt', () => {
  const at = (iso: string) => new Date(iso);

  it('handles a range across midnight in the device time zone', () => {
    expect(isQuietAt(at('2026-11-24T23:30:00Z'), '22:00', '08:00', 'UTC')).toBe(true);
    expect(isQuietAt(at('2026-11-24T07:59:00Z'), '22:00', '08:00', 'UTC')).toBe(true);
    expect(isQuietAt(at('2026-11-24T08:00:00Z'), '22:00', '08:00', 'UTC')).toBe(false);
    // 21:30 UTC is 22:30 in Berlin (winter time).
    expect(isQuietAt(at('2026-11-24T21:30:00Z'), '22:00', '08:00', 'Europe/Berlin')).toBe(true);
  });

  it('handles a daytime range, no quiet hours and an unknown zone', () => {
    expect(isQuietAt(at('2026-11-24T13:00:00Z'), '12:00', '14:00', 'UTC')).toBe(true);
    expect(isQuietAt(at('2026-11-24T15:00:00Z'), '12:00', '14:00', 'UTC')).toBe(false);
    expect(isQuietAt(at('2026-11-24T13:00:00Z'), null, null, 'UTC')).toBe(false);
    expect(isQuietAt(at('2026-11-24T13:00:00Z'), '12:00', '12:00', 'UTC')).toBe(false);
    expect(isQuietAt(at('2026-11-24T13:00:00Z'), '12:00', '14:00', 'Nope/Nowhere')).toBe(true);
  });
});

describe('isTimeZone', () => {
  it('knows IANA zones and refuses the rest', () => {
    expect(isTimeZone('Europe/Kyiv')).toBe(true);
    expect(isTimeZone('UTC')).toBe(true);
    expect(isTimeZone('Mars/Olympus')).toBe(false);
    expect(isTimeZone('../etc')).toBe(false);
    expect(isTimeZone(5)).toBe(false);
  });
});

describe('readPushConfig', () => {
  const keys = () => ({
    [PUSH_ENV.PublicKey]: b64url(65),
    [PUSH_ENV.PrivateKey]: b64url(32),
    [PUSH_ENV.Subject]: 'mailto:ops@example.test',
  });

  it('is not configured without the variables', () => {
    expect(readPushConfig({})).toEqual({ vapid: null });
  });

  it('reads a complete, well-formed set', () => {
    const env = keys();
    expect(readPushConfig(env).vapid).toEqual({
      publicKey: env[PUSH_ENV.PublicKey],
      privateKey: env[PUSH_ENV.PrivateKey],
      subject: 'mailto:ops@example.test',
    });
    expect(readPushConfig({ ...env, [PUSH_ENV.Subject]: 'https://shelfmark.test' }).vapid).not.toBe(
      null,
    );
  });

  it('treats a partial or malformed set as not configured', () => {
    expect(readPushConfig({ ...keys(), [PUSH_ENV.PrivateKey]: '' }).vapid).toBeNull();
    expect(readPushConfig({ ...keys(), [PUSH_ENV.PublicKey]: 'short' }).vapid).toBeNull();
    expect(readPushConfig({ ...keys(), [PUSH_ENV.Subject]: 'ops' }).vapid).toBeNull();
  });
});

describe('push messages', () => {
  it('builds a reminder with the title, site and a click to Today', () => {
    const message = reminderMessage({
      id: 'l1',
      title: '  A  jacket ',
      url: 'https://www.shop.test/x',
    });
    expect(message.notification).toMatchObject({
      title: 'A jacket',
      body: 'Reminder · shop.test',
      tag: 'sm-reminder-l1',
      data: {
        onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url: '/today' } },
      },
    });
  });

  it('falls back to the site, clips long text and has a summary and a test', () => {
    expect(reminderMessage({ id: 'l', title: '', url: 'bad' }).notification.title).toBe('Reminder');
    const long = reminderMessage({ id: 'l', title: 'x'.repeat(500), url: 'https://a.test' });
    expect(long.notification.title).toHaveLength(200);
    expect(remindersSummaryMessage(5).notification.title).toBe('5 reminders are due');
    expect(testMessage().notification.tag).toBe('sm-test');
  });
});
