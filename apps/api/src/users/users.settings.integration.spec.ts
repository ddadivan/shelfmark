import {
  TRASH_RETENTION_DAYS,
  USER_SETTINGS_ENDPOINT,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { signInDemo } from '../../test-utils/sign-in-demo';

describe('account settings', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const stored = async (userId: string): Promise<number> =>
    (await t.db.prisma.user.findUniqueOrThrow({ where: { id: userId } })).trashRetentionDays;

  it('defaults to 30 days', async () => {
    const res = await asUser(t.app, users.owner).get(USER_SETTINGS_ENDPOINT).expect(200);
    expect(res.body).toEqual({ trashRetentionDays: 30, folderColours: true, pauseHistory: false });
  });

  it.each(TRASH_RETENTION_DAYS)('saves %i days and reads it back', async (days) => {
    const a = asUser(t.app, users.owner);
    const res = await a
      .patch(USER_SETTINGS_ENDPOINT)
      .send({ trashRetentionDays: days })
      .expect(200);
    expect((res.body as UserSettingsResponse).trashRetentionDays).toBe(days);
    expect(await stored(users.owner.userId)).toBe(days);
    expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: days,
      folderColours: true,
      pauseHistory: false,
    });
  });

  it('answers the current settings for an empty PATCH', async () => {
    const a = asUser(t.app, users.owner);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 90 }).expect(200);
    expect((await a.patch(USER_SETTINGS_ENDPOINT).send({}).expect(200)).body).toEqual({
      trashRetentionDays: 90,
      folderColours: true,
      pauseHistory: false,
    });
  });

  it.each([[15], [0], [-7], ['30'], [null], [7.5], [[7]]])(
    'rejects %j with 400 and changes nothing',
    async (value) => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: value }).expect(400);
      expect(await stored(users.owner.userId)).toBe(30);
    },
  );

  it('saves folderColours independently of the retention', async () => {
    const a = asUser(t.app, users.owner);
    const off = await a
      .patch(USER_SETTINGS_ENDPOINT)
      .send({ folderColours: false, pauseHistory: false })
      .expect(200);
    expect(off.body).toEqual({ trashRetentionDays: 30, folderColours: false, pauseHistory: false });
    const day = await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200);
    expect(day.body).toEqual({ trashRetentionDays: 7, folderColours: false, pauseHistory: false });
    expect((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual(day.body);
    const other = asUser(t.app, users.intruder);
    expect((await other.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
    });
  });

  it.each([['false'], [null], [0], [1]])('rejects folderColours %j with 400', async (value) => {
    const a = asUser(t.app, users.owner);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ folderColours: value }).expect(400);
  });

  it('rejects extra fields', async () => {
    const a = asUser(t.app, users.owner);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7, isDemo: true }).expect(400);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ userId: users.intruder.userId }).expect(400);
    expect(await stored(users.owner.userId)).toBe(30);
  });

  it('is isolated: a user only reads and writes their own settings', async () => {
    const a = asUser(t.app, users.owner);
    const b = asUser(t.app, users.intruder);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200);
    expect((await b.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
    });
    await b.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 90 }).expect(200);
    expect(await stored(users.owner.userId)).toBe(7);
    expect(await stored(users.intruder.userId)).toBe(90);
  });

  it('works for demo users', async () => {
    const demo = asUser(t.app, await signInDemo(t.app, t.baseUrl));
    expect((await demo.get(USER_SETTINGS_ENDPOINT).expect(200)).body).toEqual({
      trashRetentionDays: 30,
      folderColours: true,
      pauseHistory: false,
    });
    expect(
      (await demo.patch(USER_SETTINGS_ENDPOINT).send({ trashRetentionDays: 7 }).expect(200)).body,
    ).toEqual({ trashRetentionDays: 7, folderColours: true, pauseHistory: false });
  });

  it('needs a session, a JSON body and the same origin', async () => {
    await anonymous(t.app).get(USER_SETTINGS_ENDPOINT).expect(401);
    await anonymous(t.app)
      .patch(USER_SETTINGS_ENDPOINT)
      .send({ trashRetentionDays: 7 })
      .expect(401);
    const a = asUser(t.app, users.owner);
    await a
      .patch(USER_SETTINGS_ENDPOINT)
      .set('Origin', 'https://evil.test')
      .send({ trashRetentionDays: 7 })
      .expect(403);
    expect(await stored(users.owner.userId)).toBe(30);
  });

  it('is enforced by the database CHECK', async () => {
    await expect(
      t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { trashRetentionDays: 15 },
      }),
    ).rejects.toThrow();
  });
});
