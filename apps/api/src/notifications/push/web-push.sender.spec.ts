import { randomBytes } from 'node:crypto';
import webPush from 'web-push';
import { PUSH_SEND_STATUS } from '../models/push-send-status.const';
import { testMessage } from './build-push-message';
import { WebPushSender } from './web-push.sender';

// Never the network: the package's send is replaced for every case.
vi.mock('web-push', async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof webPush }>();
  return {
    default: { ...actual.default, sendNotification: vi.fn() },
  };
});

const b64url = (bytes: number): string => randomBytes(bytes).toString('base64url');
const vapid = { publicKey: b64url(65), privateKey: b64url(32), subject: 'mailto:ops@example.test' };
const target = (endpoint = 'https://fcm.googleapis.com/fcm/send/x') => ({
  endpoint,
  keys: { p256dh: b64url(65), auth: b64url(16) },
});
const send = vi.mocked(webPush.sendNotification);

describe('WebPushSender', () => {
  afterEach(() => send.mockReset());

  it('sends the JSON message with VAPID, a TTL and a timeout', async () => {
    send.mockResolvedValue({ statusCode: 201, body: '', headers: {} });
    const status = await new WebPushSender().send(target(), testMessage(), vapid);
    expect(status).toBe(PUSH_SEND_STATUS.Sent);
    const [, payload, options] = send.mock.calls[0] ?? [];
    expect(JSON.parse(String(payload))).toEqual(testMessage());
    expect(options).toMatchObject({ vapidDetails: vapid, TTL: expect.any(Number), timeout: 5000 });
  });

  it('refuses an endpoint outside the allow-list without a request', async () => {
    const status = await new WebPushSender().send(
      target('https://evil.test/x'),
      testMessage(),
      vapid,
    );
    expect(status).toBe(PUSH_SEND_STATUS.Refused);
    expect(send).not.toHaveBeenCalled();
  });

  it('maps 404 / 410 to gone and other failures to failed', async () => {
    const sender = new WebPushSender();
    send.mockRejectedValueOnce(new webPush.WebPushError('gone', 410, {}, '', 'x'));
    expect(await sender.send(target(), testMessage(), vapid)).toBe(PUSH_SEND_STATUS.Gone);
    send.mockRejectedValueOnce(new webPush.WebPushError('busy', 500, {}, '', 'x'));
    expect(await sender.send(target(), testMessage(), vapid)).toBe(PUSH_SEND_STATUS.Failed);
    send.mockRejectedValueOnce(new Error('socket hang up'));
    expect(await sender.send(target(), testMessage(), vapid)).toBe(PUSH_SEND_STATUS.Failed);
  });
});
