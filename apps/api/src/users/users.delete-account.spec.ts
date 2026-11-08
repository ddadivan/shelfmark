import { AUTH_ENDPOINT } from '@shelfmark/contracts';
import request from 'supertest';
import { SIGN_OUT_TIMEOUT_MS } from '../auth/models/sign-out-timeout.const';
import { SessionCookieService } from '../auth/session-cookie.service';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { setCookiesOf } from '../../test-utils/sign-in-as';

const ME = '/api/me';

async function seedLibrary(t: AuthTestApp, userId: string, label: string): Promise<void> {
  const { prisma } = t.db;
  const folder = await prisma.folder.create({ data: { userId, name: `${label} folder` } });
  await prisma.folder.create({ data: { userId, name: `${label} child`, parentId: folder.id } });
  const link = await prisma.link.create({
    data: {
      userId,
      folderId: folder.id,
      url: `https://example.com/${label}`,
      normalizedUrl: `example.com/${label}`,
      title: label,
      titleSortKey: label.toLowerCase(),
    },
  });
  const tag = await prisma.tag.create({ data: { userId, name: `${label}-tag` } });
  await prisma.linkTag.create({ data: { linkId: link.id, tagId: tag.id } });
  await prisma.feedback.create({ data: { userId, milestone: 'day3', score: 8 } });
  await prisma.linkImage.create({
    data: {
      userId,
      linkId: link.id,
      kind: 'favicon',
      contentType: 'image/webp',
      bytes: Buffer.from('webp'),
      width: 16,
      height: 16,
      sha256: 'a'.repeat(64),
    },
  });
}

async function countsFor(t: AuthTestApp, userId: string, email: string) {
  const { prisma } = t.db;
  const links = await prisma.link.findMany({ where: { userId }, select: { id: true } });
  return {
    users: await prisma.user.count({ where: { id: userId } }),
    sessions: await prisma.session.count({ where: { userId } }),
    accounts: await prisma.account.count({ where: { userId } }),
    folders: await prisma.folder.count({ where: { userId } }),
    links: links.length,
    tags: await prisma.tag.count({ where: { userId } }),
    linkTags: await prisma.linkTag.count({
      where: { linkId: { in: links.map((l) => l.id) } },
    }),
    feedback: await prisma.feedback.count({ where: { userId } }),
    linkImages: await prisma.linkImage.count({ where: { userId } }),
    verifications: await prisma.verification.count({ where: { identifier: email } }),
  };
}

describe('DELETE /api/me', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    await seedLibrary(t, users.owner.userId, 'owner');
    await seedLibrary(t, users.intruder.userId, 'intruder');
    const expiresAt = new Date(Date.now() + 60_000);
    await t.db.prisma.verification.createMany({
      data: [
        { identifier: 'owner@example.com', value: 'v1', expiresAt },
        { identifier: 'Owner@Example.com', value: 'v2', expiresAt },
        { identifier: 'intruder@example.com', value: 'v3', expiresAt },
      ],
    });
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  it('removes every row of the user in every table and answers 204', async () => {
    const before = await countsFor(t, users.owner.userId, 'owner@example.com');
    expect(before).toEqual({
      users: 1,
      sessions: 1,
      accounts: 1,
      folders: 2,
      links: 1,
      tags: 1,
      linkTags: 1,
      feedback: 1,
      linkImages: 1,
      verifications: 1,
    });
    expect(await t.db.prisma.verification.count()).toBe(3);

    const res = await asUser(t.app, users.owner)
      .delete(ME)
      .send({ email: 'Owner@Example.com' })
      .expect(204);
    expect(res.text).toBe('');

    expect(await countsFor(t, users.owner.userId, 'owner@example.com')).toEqual({
      users: 0,
      sessions: 0,
      accounts: 0,
      folders: 0,
      links: 0,
      tags: 0,
      linkTags: 0,
      feedback: 0,
      linkImages: 0,
      verifications: 0,
    });
    // Both the exact and the differently cased rows of the user are gone; the intruder's survives.
    expect(await t.db.prisma.verification.findMany({ select: { identifier: true } })).toEqual([
      { identifier: 'intruder@example.com' },
    ]);
  });

  it('leaves the data of another user untouched', async () => {
    await asUser(t.app, users.owner).delete(ME).send({ email: 'owner@example.com' }).expect(204);

    expect(await countsFor(t, users.intruder.userId, 'intruder@example.com')).toEqual({
      users: 1,
      sessions: 1,
      accounts: 1,
      folders: 2,
      links: 1,
      tags: 1,
      linkTags: 1,
      feedback: 1,
      linkImages: 1,
      verifications: 1,
    });
    await asUser(t.app, users.intruder).get(AUTH_ENDPOINT.GetSession).expect(200);
  });

  it('never takes the user from the request: a foreign id or email deletes nothing', async () => {
    await asUser(t.app, users.owner).delete(ME).send({ email: 'intruder@example.com' }).expect(400);
    await asUser(t.app, users.owner)
      .delete(ME)
      .send({ email: 'owner@example.com', userId: users.intruder.userId })
      .expect(400);
    await asUser(t.app, users.owner).delete(`${ME}?userId=${users.intruder.userId}`).expect(400);

    expect(await countsFor(t, users.owner.userId, 'owner@example.com')).toMatchObject({
      users: 1,
      links: 1,
    });
    expect(await countsFor(t, users.intruder.userId, 'intruder@example.com')).toMatchObject({
      users: 1,
      links: 1,
    });
  });

  it('requires the confirmation: missing, empty, invalid or wrong email is a 400', async () => {
    const agent = asUser(t.app, users.owner);
    await agent.delete(ME).expect(400);
    await agent.delete(ME).send({}).expect(400);
    await agent.delete(ME).send({ email: '' }).expect(400);
    await agent.delete(ME).send({ email: 'not-an-email' }).expect(400);
    const wrong = await agent.delete(ME).send({ email: 'other@example.com' }).expect(400);
    expect(wrong.body).toMatchObject({ statusCode: 400, requestId: expect.any(String) });
    expect(await t.db.prisma.user.count({ where: { id: users.owner.userId } })).toBe(1);
  });

  it('clears the session cookie in the response', async () => {
    const res = await asUser(t.app, users.owner)
      .delete(ME)
      .send({ email: 'owner@example.com' })
      .expect(204);
    const cookie = setCookiesOf(res).find((c) => /session_token=/.test(c));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/session_token=;/);
    expect(cookie).toMatch(/Max-Age=0/i);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('answers 401 to the same cookie afterwards, and to a repeated call', async () => {
    await asUser(t.app, users.owner).delete(ME).send({ email: 'owner@example.com' }).expect(204);
    await asUser(t.app, users.owner).get(AUTH_ENDPOINT.GetSession).expect(200, 'null');
    await asUser(t.app, users.owner).delete(ME).send({ email: 'owner@example.com' }).expect(401);
  });

  it('answers 401 without a session and deletes nothing', async () => {
    await request(t.app.getHttpServer())
      .delete(ME)
      .send({ email: 'owner@example.com' })
      .expect(401);
    expect(await t.db.prisma.user.count()).toBe(2);
  });

  it('revokes every session of the user, not only the current one', async () => {
    const second = await t.db.prisma.session.create({
      data: {
        userId: users.owner.userId,
        token: 'second-device-token',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    expect(second.userId).toBe(users.owner.userId);
    await asUser(t.app, users.owner).delete(ME).send({ email: 'owner@example.com' }).expect(204);
    expect(await t.db.prisma.session.count({ where: { userId: users.owner.userId } })).toBe(0);
  });

  it('still answers 204 with an expired cookie when the sign-out fails after the commit', async () => {
    const cookies = t.app.get(SessionCookieService);
    vi.spyOn(cookies, 'clearingCookies').mockRejectedValueOnce(new Error('boom'));
    const res = await asUser(t.app, users.owner)
      .delete(ME)
      .send({ email: 'owner@example.com' })
      .expect(204);
    expect(await t.db.prisma.user.count({ where: { id: users.owner.userId } })).toBe(0);
    const [cookie] = setCookiesOf(res);
    expect(cookie).toMatch(/^shelfmark\.session_token=;/);
    expect(cookie).toMatch(/Path=\/; Max-Age=0; HttpOnly; SameSite=Lax/);
    expect(cookie).not.toMatch(/Secure/);
  });

  it('answers exactly two 204, or one 204 and one 401, to two concurrent deletions', async () => {
    const send = () => asUser(t.app, users.owner).delete(ME).send({ email: 'owner@example.com' });
    const statuses = (await Promise.all([send(), send()])).map((r) => r.status).sort();
    expect([
      [204, 204],
      [204, 401],
    ]).toContainEqual(statuses);
    expect(await countsFor(t, users.owner.userId, 'owner@example.com')).toEqual({
      users: 0,
      sessions: 0,
      accounts: 0,
      folders: 0,
      links: 0,
      tags: 0,
      linkTags: 0,
      feedback: 0,
      linkImages: 0,
      verifications: 0,
    });
    expect(
      await t.db.prisma.verification.count({
        where: { identifier: { equals: 'owner@example.com', mode: 'insensitive' } },
      }),
    ).toBe(0);
  });

  it('answers 429 after 5 attempts in a minute and deletes nothing more', async () => {
    const agent = asUser(t.app, users.owner);
    for (let i = 0; i < 5; i++) {
      await agent.delete(ME).send({ email: 'wrong@example.com' }).expect(400);
    }
    const res = await agent.delete(ME).send({ email: 'owner@example.com' }).expect(429);
    expect(res.body).toMatchObject({ statusCode: 429 });
    expect(await t.db.prisma.user.count({ where: { id: users.owner.userId } })).toBe(1);
  });

  it('propagates a failing transaction as a generic 500 and deletes nothing', async () => {
    vi.spyOn(t.db.prisma, '$transaction').mockRejectedValueOnce(new Error('db down'));
    const res = await asUser(t.app, users.owner)
      .delete(ME)
      .send({ email: 'owner@example.com' })
      .expect(500);
    expect(JSON.stringify(res.body)).not.toContain('db down');
    expect(await t.db.prisma.user.count({ where: { id: users.owner.userId } })).toBe(1);
    expect(setCookiesOf(res)).toEqual([]);
  });
});

type AuthStub = ConstructorParameters<typeof SessionCookieService>[0];

describe('SessionCookieService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  // The fallback never touches Better Auth, so the stub has no behaviour.
  const stubAuth = (signOut = vi.fn()): AuthStub => ({ api: { signOut } }) as unknown as AuthStub;

  it('builds the fallback cookie with the prefix and Secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const [cookie] = new SessionCookieService(stubAuth()).fallbackClearingCookies();
    expect(cookie).toBe(
      '__Secure-shelfmark.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure',
    );
  });

  it('builds the fallback cookie without prefix and Secure outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const [cookie] = new SessionCookieService(stubAuth()).fallbackClearingCookies();
    expect(cookie).toBe('shelfmark.session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
  });

  it('rejects when the sign-out hangs longer than the timeout', async () => {
    vi.useFakeTimers();
    const hanging = vi.fn(() => new Promise<never>(() => undefined));
    const pending = new SessionCookieService(stubAuth(hanging)).clearingCookies({});
    const outcome = expect(pending).rejects.toThrow('Sign-out timed out');
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS);
    await outcome;
  });
});
