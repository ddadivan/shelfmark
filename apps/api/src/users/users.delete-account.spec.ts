import { AUTH_ENDPOINT } from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
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
    },
  });
  const tag = await prisma.tag.create({ data: { userId, name: `${label}-tag` } });
  await prisma.linkTag.create({ data: { linkId: link.id, tagId: tag.id } });
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
    users = await createIsolationUsers(t);
    await seedLibrary(t, users.owner.userId, 'owner');
    await seedLibrary(t, users.intruder.userId, 'intruder');
    await t.db.prisma.verification.create({
      data: {
        identifier: 'owner@example.com',
        value: 'v',
        expiresAt: new Date(Date.now() + 60_000),
      },
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
      verifications: 1,
    });

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
      verifications: 0,
    });
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
      verifications: 0,
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
});
