import {
  LINK_ERROR_MESSAGE,
  REMINDER_ENDPOINT,
  REMINDER_ERROR_MESSAGE,
  REMINDER_LIMIT,
  type LinkResponse,
  type ListRemindersResponse,
  type ReminderCountResponse,
  type SetRemindersBatchResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const inHours = (hours: number): string => new Date(Date.now() + hours * HOUR).toISOString();

describe('reminders API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const link = (title = 'Read later') => seedLink(t.db.prisma, users.owner.userId, { title });
  /** A reminder in the past cannot be set through the API: it became due on its own. */
  const makeDue = (id: string, hoursAgo = 2) =>
    t.db.prisma.link.update({
      where: { id },
      data: { remindAt: new Date(Date.now() - hoursAgo * HOUR) },
    });
  const list = async (agent: TestAgent = a) =>
    (await agent.get(REMINDER_ENDPOINT.Base).expect(200)).body as ListRemindersResponse;
  const count = async (agent: TestAgent = a) =>
    ((await agent.get(REMINDER_ENDPOINT.Count).expect(200)).body as ReminderCountResponse).due;

  it('sets, changes and clears a reminder without touching updatedAt', async () => {
    const id = await link();
    const before = (await a.get(`/api/links/${id}`).expect(200)).body as LinkResponse;
    expect(before.remindAt).toBeNull();

    const first = inHours(20);
    const set = (
      await a.put(`${REMINDER_ENDPOINT.Base}/${id}`).send({ remindAt: first }).expect(200)
    ).body as LinkResponse;
    expect(set).toMatchObject({ id, remindAt: first, updatedAt: before.updatedAt });

    const later = inHours(24 * 7);
    await a.put(`${REMINDER_ENDPOINT.Base}/${id}`).send({ remindAt: later }).expect(200);
    expect(((await a.get(`/api/links/${id}`).expect(200)).body as LinkResponse).remindAt).toBe(
      later,
    );

    await a.delete(`${REMINDER_ENDPOINT.Base}/${id}`).expect(204);
    await a.delete(`${REMINDER_ENDPOINT.Base}/${id}`).expect(204);
    const after = (await a.get(`/api/links/${id}`).expect(200)).body as LinkResponse;
    expect(after.remindAt).toBeNull();
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it('accepts a time with an offset and answers it in UTC', async () => {
    const id = await link();
    const at = new Date(Date.now() + DAY);
    const local = `${at.toISOString().slice(0, 19)}+02:00`;
    const body = (
      await a.put(`${REMINDER_ENDPOINT.Base}/${id}`).send({ remindAt: local }).expect(200)
    ).body as LinkResponse;
    expect(body.remindAt).toBe(new Date(local).toISOString());
  });

  it('refuses a past time, one too far ahead and malformed times', async () => {
    const id = await link();
    const past = await a
      .put(`${REMINDER_ENDPOINT.Base}/${id}`)
      .send({ remindAt: inHours(-1) })
      .expect(400);
    expect(past.body.message).toBe(REMINDER_ERROR_MESSAGE.NotInFuture);
    const far = await a
      .put(`${REMINDER_ENDPOINT.Base}/${id}`)
      .send({ remindAt: inHours((REMINDER_LIMIT.MaxAheadDays + 1) * 24) })
      .expect(400);
    expect(far.body.message).toBe(REMINDER_ERROR_MESSAGE.TooFarAhead);
    for (const remindAt of ['tomorrow', '2030-01-01', '2030-01-01T09:00:00', 42, null, '']) {
      await a.put(`${REMINDER_ENDPOINT.Base}/${id}`).send({ remindAt }).expect(400);
    }
    await a.put(`${REMINDER_ENDPOINT.Base}/${id}`).send({}).expect(400);
    await a
      .put(`${REMINDER_ENDPOINT.Base}/${id}`)
      .send({ remindAt: inHours(2), extra: true })
      .expect(400);
    expect(
      ((await a.get(`/api/links/${id}`).expect(200)).body as LinkResponse).remindAt,
    ).toBeNull();
  });

  it('lists due and upcoming reminders soonest first and counts the due ones', async () => {
    const soon = await link('Soon');
    const later = await link('Later');
    const old = await link('Long due');
    const recent = await link('Just due');
    await link('No reminder');
    await a
      .put(`${REMINDER_ENDPOINT.Base}/${later}`)
      .send({ remindAt: inHours(48) })
      .expect(200);
    await a
      .put(`${REMINDER_ENDPOINT.Base}/${soon}`)
      .send({ remindAt: inHours(3) })
      .expect(200);
    await makeDue(old, 30);
    await makeDue(recent, 1);

    const body = await list();
    expect(body.due.map((item) => item.id)).toEqual([old, recent]);
    expect(body.upcoming.map((item) => item.id)).toEqual([soon, later]);
    expect(await count()).toBe(2);

    await a.delete(`${REMINDER_ENDPOINT.Base}/${old}`).expect(204);
    expect(await count()).toBe(1);
    // Snooze: a new time moves a due link back to upcoming.
    await a
      .put(`${REMINDER_ENDPOINT.Base}/${recent}`)
      .send({ remindAt: inHours(24) })
      .expect(200);
    expect(await count()).toBe(0);
    expect((await list()).upcoming.map((item) => item.id)).toEqual([soon, recent, later]);
  });

  it('leaves trashed links out and shows their reminder again once restored', async () => {
    const id = await link();
    await makeDue(id);
    await a.delete(`/api/links/${id}`).expect(204);
    expect(await count()).toBe(0);
    expect((await list()).due).toEqual([]);
    await a
      .put(`${REMINDER_ENDPOINT.Base}/${id}`)
      .send({ remindAt: inHours(2) })
      .expect(404);
    await a
      .post('/api/trash/restore')
      .send({ items: [{ kind: 'link', id }] })
      .expect(200);
    expect(await count()).toBe(1);
  });

  it('sets and clears one reminder on several links, ignoring foreign and missing ids', async () => {
    const first = await link('One');
    const second = await link('Two');
    const foreign = await seedLink(t.db.prisma, users.intruder.userId, { title: 'Theirs' });
    const missing = '0190f0f0-0000-7000-8000-000000000000';
    const at = inHours(10);
    const body = (
      await a
        .post(REMINDER_ENDPOINT.Batch)
        .send({ ids: [second, foreign, missing, first], remindAt: at })
        .expect(200)
    ).body as SetRemindersBatchResponse;
    expect(body.updated).toBe(2);
    expect(body.links.map((item) => [item.id, item.remindAt])).toEqual([
      [second, at],
      [first, at],
    ]);
    const theirs = (await b.get(`/api/links/${foreign}`).expect(200)).body as LinkResponse;
    expect(theirs.remindAt).toBeNull();

    const cleared = (
      await a
        .post(REMINDER_ENDPOINT.Batch)
        .send({ ids: [first], remindAt: null })
        .expect(200)
    ).body as SetRemindersBatchResponse;
    expect(cleared.links[0]?.remindAt).toBeNull();
  });

  it('validates the batch body', async () => {
    const id = await link();
    await a
      .post(REMINDER_ENDPOINT.Batch)
      .send({ ids: [], remindAt: inHours(1) })
      .expect(400);
    await a
      .post(REMINDER_ENDPOINT.Batch)
      .send({ ids: [id] })
      .expect(400);
    await a
      .post(REMINDER_ENDPOINT.Batch)
      .send({ ids: [id, id], remindAt: null })
      .expect(400);
    await a
      .post(REMINDER_ENDPOINT.Batch)
      .send({ ids: ['nope'], remindAt: null })
      .expect(400);
    const past = await a
      .post(REMINDER_ENDPOINT.Batch)
      .send({ ids: [id], remindAt: inHours(-2) })
      .expect(400);
    expect(past.body.message).toBe(REMINDER_ERROR_MESSAGE.NotInFuture);
  });

  it('keeps every user to their own reminders', async () => {
    await expectIsolated(t.app, users, {
      create: async (owner) => {
        const id = (
          (
            await owner
              .post('/api/links')
              .send({ url: 'https://owner.test/r', title: 'secret' })
              .expect(201)
          ).body as LinkResponse
        ).id;
        await owner
          .put(`${REMINDER_ENDPOINT.Base}/${id}`)
          .send({ remindAt: inHours(5) })
          .expect(200);
        return id;
      },
      read: (agent, id) => agent.get(`/api/links/${id}`),
      update: (agent, id) =>
        agent.put(`${REMINDER_ENDPOINT.Base}/${id}`).send({ remindAt: inHours(9) }),
      remove: (agent, id) => agent.delete(`${REMINDER_ENDPOINT.Base}/${id}`),
      list: {
        request: (agent) => agent.get(REMINDER_ENDPOINT.Base),
        ids: (body) => (body as ListRemindersResponse).upcoming.map((item) => item.id),
      },
      skip: {
        reference:
          'the batch ignores foreign ids instead of answering 404 (covered by the batch test)',
      },
    });
  });

  it('counts and lists only the session user due links', async () => {
    const mine = await link();
    await makeDue(mine);
    const theirs = await seedLink(t.db.prisma, users.intruder.userId, { title: 'Theirs' });
    await makeDue(theirs);
    expect(await count(a)).toBe(1);
    expect(await count(b)).toBe(1);
    expect((await list(b)).due.map((item) => item.id)).toEqual([theirs]);
  });

  it('answers 404 with the link message for a missing link', async () => {
    const response = await a
      .put(`${REMINDER_ENDPOINT.Base}/0190f0f0-0000-7000-8000-000000000000`)
      .send({ remindAt: inHours(2) })
      .expect(404);
    expect(response.body.message).toBe(LINK_ERROR_MESSAGE.NotFound);
    await a.delete(`${REMINDER_ENDPOINT.Base}/not-a-uuid`).expect(400);
  });

  it('is closed to anonymous callers', async () => {
    const guest = anonymous(t.app);
    await guest.get(REMINDER_ENDPOINT.Base).expect(401);
    await guest.get(REMINDER_ENDPOINT.Count).expect(401);
    await guest.post(REMINDER_ENDPOINT.Batch).send({ ids: [], remindAt: null }).expect(401);
  });
});
