import { randomBytes } from 'node:crypto';
import {
  NOTIFICATION_ENDPOINT,
  NOTIFICATION_LIMIT,
  type AddNotificationDeviceRequest,
  type AddNotificationDeviceResponse,
  type NotificationSettingsResponse,
  type NotificationTestResponse,
} from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { CRON_ENV } from '../demo/models/cron-env.const';
import { CRON_ROUTE } from '../demo/models/cron-route.const';
import { PUSH_CONFIG } from './models/push-config.token';
import { PUSH_SEND_STATUS } from './models/push-send-status.const';
import { PUSH_SENDER } from './models/push-sender.token';
import type { NotificationDeliveryResponse } from './models/notification-delivery-response.interface';
import type { PushConfig } from './models/push-config.interface';
import type { PushMessage } from './models/push-message.interface';
import type { PushSendStatus } from './models/push-send-status.type';
import type { PushSender } from './models/push-sender.interface';
import type { PushTarget } from './models/push-target.interface';
import { NotificationDeliveryService } from './notification-delivery.service';

const SECRET = randomBytes(24).toString('hex');
const HOUR = 60 * 60 * 1000;
const b64url = (bytes: number): string => randomBytes(bytes).toString('base64url');

/** Records every push instead of sending it; an endpoint can be told to answer a status. */
class FakePushSender implements PushSender {
  readonly sent: { endpoint: string; message: PushMessage }[] = [];
  readonly answers = new Map<string, PushSendStatus>();
  /** When set, every send waits for it first (holds a run between its claim and its push). */
  gate: Promise<void> | null = null;
  /** When set, the next send throws it. */
  failWith: Error | null = null;

  async send(target: PushTarget, message: PushMessage): Promise<PushSendStatus> {
    if (this.gate) await this.gate;
    if (this.failWith) throw this.failWith;
    const answer = this.answers.get(target.endpoint) ?? PUSH_SEND_STATUS.Sent;
    if (answer === PUSH_SEND_STATUS.Sent) this.sent.push({ endpoint: target.endpoint, message });
    return answer;
  }
}

describe('notifications API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const sender = new FakePushSender();
  const config: PushConfig = {
    vapid: { publicKey: b64url(65), privateKey: b64url(32), subject: 'mailto:ops@example.test' },
  };
  const vapid = config.vapid;

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [CRON_ENV.Secret]: SECRET },
      overrides: [
        { provide: PUSH_CONFIG, useValue: config },
        { provide: PUSH_SENDER, useValue: sender },
      ],
    });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    config.vapid = vapid;
    sender.sent.length = 0;
    sender.answers.clear();
    sender.gate = null;
    sender.failWith = null;
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  let counter = 0;
  const device = (overrides: Partial<AddNotificationDeviceRequest> = {}) => {
    counter += 1;
    return {
      endpoint: `https://fcm.googleapis.com/fcm/send/device-${counter}`,
      keys: { p256dh: b64url(65), auth: b64url(16) },
      name: 'Chrome on macOS',
      timeZone: 'Europe/Berlin',
      ...overrides,
    };
  };
  const addDevice = async (agent: TestAgent = a, body = device()) =>
    (await agent.post(NOTIFICATION_ENDPOINT.Devices).send(body).expect(201))
      .body as AddNotificationDeviceResponse;
  const settings = async (agent: TestAgent = a) =>
    (await agent.get(NOTIFICATION_ENDPOINT.Settings).expect(200))
      .body as NotificationSettingsResponse;
  const runCron = async () =>
    (
      await request(t.app.getHttpServer())
        .get(CRON_ROUTE.NotificationsPath)
        .set('Authorization', `Bearer ${SECRET}`)
        .expect(200)
    ).body as NotificationDeliveryResponse;
  const dueLink = async (userId: string, hoursAgo = 1, title = 'The Ojai Jacket') => {
    const id = await seedLink(t.db.prisma, userId, { title, url: 'https://www.shop.test/jacket' });
    await t.db.prisma.link.update({
      where: { id },
      data: { remindAt: new Date(Date.now() - hoursAgo * HOUR) },
    });
    return id;
  };

  it('answers the defaults, the public key and no devices; email has no setting', async () => {
    const body = await settings();
    expect(body).toEqual({
      available: true,
      publicKey: vapid?.publicKey,
      settings: { reminders: true, continueReading: false, quietFrom: null, quietTo: null },
      devices: [],
    });
    await a.patch(NOTIFICATION_ENDPOINT.Settings).send({ weeklyEmail: true }).expect(400);
  });

  it('saves changes and keeps quiet hours a pair', async () => {
    const changed = (
      await a
        .patch(NOTIFICATION_ENDPOINT.Settings)
        .send({ continueReading: true, quietFrom: '22:00', quietTo: '07:30' })
        .expect(200)
    ).body as NotificationSettingsResponse;
    expect(changed.settings).toEqual({
      reminders: true,
      continueReading: true,
      quietFrom: '22:00',
      quietTo: '07:30',
    });
    await a.patch(NOTIFICATION_ENDPOINT.Settings).send({ quietTo: null }).expect(400);
    await a.patch(NOTIFICATION_ENDPOINT.Settings).send({ quietFrom: '25:00' }).expect(400);
    await a.patch(NOTIFICATION_ENDPOINT.Settings).send({ reminders: 'yes' }).expect(400);
    const cleared = (
      await a
        .patch(NOTIFICATION_ENDPOINT.Settings)
        .send({ quietFrom: null, quietTo: null })
        .expect(200)
    ).body as NotificationSettingsResponse;
    expect(cleared.settings.quietFrom).toBeNull();
  });

  it('adds a device once per endpoint, never answers the endpoint, and removes it', async () => {
    const body = device();
    const added = await addDevice(a, body);
    expect(added.devices).toHaveLength(1);
    expect(added.devices[0]).toEqual({
      id: added.deviceId,
      name: 'Chrome on macOS',
      createdAt: expect.any(String),
      lastUsedAt: null,
    });
    expect(JSON.stringify(added)).not.toContain(body.endpoint);

    const again = await addDevice(a, { ...body, name: 'Chrome on Windows' });
    expect(again.deviceId).toBe(added.deviceId);
    expect(again.devices.map((d) => d.name)).toEqual(['Chrome on Windows']);

    const removed = (
      await a.delete(`${NOTIFICATION_ENDPOINT.Devices}/${added.deviceId}`).expect(200)
    ).body as NotificationSettingsResponse;
    expect(removed.devices).toEqual([]);
    await a.delete(`${NOTIFICATION_ENDPOINT.Devices}/${added.deviceId}`).expect(404);
  });

  it('refuses endpoints outside the push service allow-list and bad keys or zones', async () => {
    for (const endpoint of [
      'http://fcm.googleapis.com/fcm/send/x',
      'https://evil.test/push',
      'https://fcm.googleapis.com.evil.test/x',
      'https://user:pw@fcm.googleapis.com/x',
      'https://fcm.googleapis.com:8443/x',
      'https://127.0.0.1/x',
      `https://fcm.googleapis.com/${'a'.repeat(NOTIFICATION_LIMIT.EndpointMax)}`,
    ]) {
      await a.post(NOTIFICATION_ENDPOINT.Devices).send(device({ endpoint })).expect(400);
    }
    await a
      .post(NOTIFICATION_ENDPOINT.Devices)
      .send(device({ keys: { p256dh: 'short', auth: b64url(16) } }))
      .expect(400);
    await a
      .post(NOTIFICATION_ENDPOINT.Devices)
      .send(device({ timeZone: 'Mars/Olympus' }))
      .expect(400);
    await a
      .post(NOTIFICATION_ENDPOINT.Devices)
      .send(device({ name: 'bad\u0000name' }))
      .expect(400);
    await a
      .post(NOTIFICATION_ENDPOINT.Devices)
      .send(device({ endpoint: 'https://wns2-par02p.notify.windows.com/w/?token=x' }))
      .expect(201);
  });

  it('caps the devices per account', async () => {
    for (let i = 0; i < NOTIFICATION_LIMIT.DevicesPerUserMax; i += 1) await addDevice();
    await a.post(NOTIFICATION_ENDPOINT.Devices).send(device()).expect(409);
  });

  it('reports "not configured" and stores or sends nothing without VAPID keys', async () => {
    config.vapid = null;
    const body = await settings();
    expect(body).toMatchObject({ available: false, publicKey: null });
    await a.post(NOTIFICATION_ENDPOINT.Devices).send(device()).expect(503);
    await a.post(NOTIFICATION_ENDPOINT.Test).expect(503);
    await dueLink(users.owner.userId);
    expect(await runCron()).toEqual({
      configured: false,
      sent: 0,
      removed: 0,
      quiet: 0,
      skipped: 0,
      hasMore: false,
    });
  });

  it('sends a test to every device of the account only', async () => {
    await addDevice();
    await addDevice();
    await addDevice(b);
    const answer = (await a.post(NOTIFICATION_ENDPOINT.Test).expect(200))
      .body as NotificationTestResponse;
    expect(answer.sent).toBe(2);
    expect(sender.sent.map((s) => s.message.notification.tag)).toEqual(['sm-test', 'sm-test']);
    expect((await settings()).devices.every((d) => d.lastUsedAt !== null)).toBe(true);
  });

  it('keeps settings and devices per user', async () => {
    await expectIsolated(t.app, users, {
      create: async (agent) => (await addDevice(agent)).deviceId,
      read: (u, id) => u.get(`${NOTIFICATION_ENDPOINT.Devices}/${id}`),
      remove: (u, id) => u.delete(`${NOTIFICATION_ENDPOINT.Devices}/${id}`),
      list: {
        request: (u) => u.get(NOTIFICATION_ENDPOINT.Settings),
        ids: (body) => (body as NotificationSettingsResponse).devices.map((d) => d.id),
      },
      skip: {
        update: 'devices are not edited; a re-subscribe keys on the session user and endpoint',
        reference: 'no other resource refers to a device',
      },
    });
    await a.patch(NOTIFICATION_ENDPOINT.Settings).send({ reminders: false }).expect(200);
    expect((await settings(b)).settings.reminders).toBe(true);
    await anonymous(t.app).get(NOTIFICATION_ENDPOINT.Settings).expect(401);
  });

  describe('delivery cron', () => {
    it('needs the cron secret', async () => {
      await request(t.app.getHttpServer()).get(CRON_ROUTE.NotificationsPath).expect(401);
    });

    it('pushes a due reminder once, to every device, with the title and site', async () => {
      await addDevice();
      await addDevice();
      await dueLink(users.owner.userId);
      await dueLink(users.intruder.userId);

      expect(await runCron()).toMatchObject({ configured: true, sent: 2, quiet: 0 });
      expect(sender.sent[0]?.message.notification).toMatchObject({
        title: 'The Ojai Jacket',
        body: 'Reminder · shop.test',
        data: { onActionClick: { default: { url: '/today' } } },
      });
      expect((await runCron()).sent).toBe(0);
    });

    it('answers a Vercel Schedule delivery (ce-id and schedule headers) and needs the secret', async () => {
      const headers = {
        'user-agent': 'vercel-cron/1.0',
        'x-vercel-cron-schedule': '*/15 * * * *',
        'ce-id': 'exec_0123456789abcdef',
        'ce-vssscheduledat': new Date().toISOString(),
      };
      await addDevice();
      await dueLink(users.owner.userId);
      await request(t.app.getHttpServer())
        .get(CRON_ROUTE.NotificationsPath)
        .set(headers)
        .expect(401);
      await request(t.app.getHttpServer())
        .get(CRON_ROUTE.NotificationsPath)
        .set(headers)
        .set('Authorization', 'Bearer wrong-secret-wrong-secret-wrong-secret')
        .expect(401);
      expect(sender.sent).toHaveLength(0);

      const ok = () =>
        request(t.app.getHttpServer())
          .get(CRON_ROUTE.NotificationsPath)
          .set(headers)
          .set('Authorization', `Bearer ${SECRET}`)
          .expect(200);
      expect((await ok()).body).toMatchObject({ configured: true, sent: 1, skipped: 0 });
      // The same occurrence delivered again pushes nothing.
      expect((await ok()).body).toMatchObject({ sent: 0 });
      // A malformed ce-id is ignored, not an error.
      await request(t.app.getHttpServer())
        .get(CRON_ROUTE.NotificationsPath)
        .set('ce-id', 'bad id with spaces')
        .set('Authorization', `Bearer ${SECRET}`)
        .expect(200);
      expect(sender.sent).toHaveLength(1);
    });

    it('pushes once when two runs overlap', async () => {
      await addDevice();
      await dueLink(users.owner.userId, 1, 'One');
      await dueLink(users.owner.userId, 2, 'Two');
      const service = t.app.get(NotificationDeliveryService);
      let open: () => void = () => undefined;
      sender.gate = new Promise<void>((resolve) => {
        open = resolve;
      });
      // Run 1 claims both reminders and waits at the push; run 2 starts meanwhile.
      const first = service.run({ executionId: 'exec_1' });
      await vi.waitFor(async () => {
        const claimed = await t.db.prisma.link.count({ where: { remindPushedAt: { not: null } } });
        expect(claimed).toBe(2);
      });
      const second = await service.run({ executionId: 'exec_1' });
      expect(second).toMatchObject({ sent: 0, quiet: 0, hasMore: false });
      open();
      expect(await first).toMatchObject({ sent: 2 });
      expect(sender.sent).toHaveLength(2);
      expect(sender.sent.map((entry) => entry.message.notification.title).sort()).toEqual([
        'One',
        'Two',
      ]);
    });

    it('pushes once when two runs start at the same moment', async () => {
      await addDevice();
      await dueLink(users.owner.userId, 1, 'One');
      await dueLink(users.owner.userId, 2, 'Two');
      const service = t.app.get(NotificationDeliveryService);
      const now = new Date();
      const runs = await Promise.all([service.run({ now }), service.run({ now })]);
      expect(runs[0].sent + runs[1].sent).toBe(2);
      expect(sender.sent).toHaveLength(2);
    });

    it('releases the claim when the push throws, so the next run delivers', async () => {
      await addDevice();
      const id = await dueLink(users.owner.userId);
      const service = t.app.get(NotificationDeliveryService);
      sender.failWith = new Error('network down');
      await expect(service.run()).rejects.toThrow('network down');
      const link = await t.db.prisma.link.findUniqueOrThrow({ where: { id } });
      expect(link.remindPushedAt).toBeNull();
      sender.failWith = null;
      expect(await service.run()).toMatchObject({ sent: 1 });
    });

    it('does not push reminders past the 24 hour window, marks them handled and keeps them due', async () => {
      await addDevice();
      const stale = await dueLink(users.owner.userId, 30, 'Stale');
      await dueLink(users.owner.userId, 23, 'Fresh');
      // Another user's old reminder is not touched: no device, nothing to push.
      const foreign = await dueLink(users.intruder.userId, 30, 'Foreign');
      const service = t.app.get(NotificationDeliveryService);
      expect(await service.run()).toMatchObject({ sent: 1, skipped: 1 });
      expect(sender.sent.map((entry) => entry.message.notification.title)).toEqual(['Fresh']);
      expect(await service.run()).toMatchObject({ sent: 0, skipped: 0 });
      const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: stale } });
      expect(row.remindPushedAt).not.toBeNull();
      expect(row.remindAt).not.toBeNull();
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: foreign } })).remindPushedAt,
      ).toBeNull();
    });

    it('defers through quiet hours without skipping a reminder inside the window', async () => {
      await addDevice(a, device({ timeZone: 'UTC' }));
      const id = await dueLink(users.owner.userId);
      const service = t.app.get(NotificationDeliveryService);
      const night = new Date();
      night.setUTCHours(23, 0, 0, 0);
      await t.db.prisma.link.update({
        where: { id },
        data: { remindAt: new Date(night.getTime() - 12 * HOUR) },
      });
      await a
        .patch(NOTIFICATION_ENDPOINT.Settings)
        .send({ quietFrom: '00:00', quietTo: '23:59' })
        .expect(200);
      expect(await service.run({ now: night })).toMatchObject({ sent: 0, quiet: 1, skipped: 0 });
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id } })).remindPushedAt,
      ).toBeNull();
    });

    it('pushes again after the reminder is set anew', async () => {
      await addDevice();
      const id = await dueLink(users.owner.userId);
      await runCron();
      await t.db.prisma.link.update({
        where: { id },
        // As if pushed long ago and set anew since: remind_at is newer than the last push.
        data: {
          remindAt: new Date(Date.now() - 1000),
          remindPushedAt: new Date(Date.now() - 2 * HOUR),
        },
      });
      expect((await runCron()).sent).toBe(1);
    });

    it('sums up more than three due reminders in one message', async () => {
      await addDevice();
      for (let i = 0; i < 4; i += 1) await dueLink(users.owner.userId, i + 1, `Link ${i}`);
      expect((await runCron()).sent).toBe(1);
      expect(sender.sent[0]?.message.notification.title).toBe('4 reminders are due');
    });

    it('skips reminders off, old reminders, trashed links and users without devices', async () => {
      await dueLink(users.intruder.userId);
      await addDevice();
      await dueLink(users.owner.userId, 72);
      const trashed = await dueLink(users.owner.userId);
      await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
      expect((await runCron()).sent).toBe(0);

      await dueLink(users.owner.userId);
      await a.patch(NOTIFICATION_ENDPOINT.Settings).send({ reminders: false }).expect(200);
      expect((await runCron()).sent).toBe(0);
    });

    it('waits through quiet hours on the device clock', async () => {
      await addDevice(a, device({ timeZone: 'UTC' }));
      const id = await dueLink(users.owner.userId);
      const service = t.app.get(NotificationDeliveryService);
      const night = new Date();
      night.setUTCHours(23, 0, 0, 0);
      await t.db.prisma.link.update({
        where: { id },
        data: { remindAt: new Date(night.getTime() - HOUR) },
      });
      await a
        .patch(NOTIFICATION_ENDPOINT.Settings)
        .send({ quietFrom: '22:00', quietTo: '08:00' })
        .expect(200);
      expect(await service.run({ now: night })).toMatchObject({ sent: 0, quiet: 1 });
      const morning = new Date(night.getTime() + 10 * HOUR);
      expect(await service.run({ now: morning })).toMatchObject({ sent: 1, quiet: 0 });
    });

    it('deletes a device its push service no longer knows and keeps the reminder', async () => {
      const gone = device();
      await addDevice(a, gone);
      sender.answers.set(gone.endpoint, PUSH_SEND_STATUS.Gone);
      await dueLink(users.owner.userId);
      expect(await runCron()).toMatchObject({ sent: 0, removed: 1 });
      expect((await settings()).devices).toEqual([]);

      const failing = device();
      await addDevice(a, failing);
      sender.answers.set(failing.endpoint, PUSH_SEND_STATUS.Failed);
      expect(await runCron()).toMatchObject({ sent: 0, removed: 0 });
      sender.answers.clear();
      expect((await runCron()).sent).toBe(1);
    });

    it('stops at the budget and says there is more', async () => {
      await addDevice(a);
      await addDevice(b);
      await dueLink(users.owner.userId);
      await dueLink(users.intruder.userId);
      const service = t.app.get(NotificationDeliveryService);
      expect(await service.run({ budgetMs: 0, usersPerBatch: 1 })).toMatchObject({
        sent: 1,
        hasMore: true,
      });
      expect(await service.run()).toMatchObject({ sent: 1, hasMore: false });
    });
  });
});
