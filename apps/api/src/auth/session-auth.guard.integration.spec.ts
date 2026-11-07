import { AUTH_ENDPOINT } from '@shelfmark/contracts';
import type { AuthUser } from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { NotesFixtureModule } from '../../test-utils/isolation/notes-fixture.module';
import { asUser } from '../../test-utils/isolation/test-agent';
import { FIXTURE_PATH } from '../../test-utils/models/fixture-path.const';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';

const HOUR_MS = 60 * 60 * 1000;

describe('SessionAuthGuard with a real session', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp({ imports: [NotesFixtureModule] });
  });

  beforeEach(async () => {
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  it('gives the handler the user of the session, never the token', async () => {
    const res = await asUser(t.app, users.owner).get(FIXTURE_PATH.WhoAmI).expect(200);
    expect(res.body).toEqual({
      id: users.owner.userId,
      name: 'Owner',
      email: 'owner@example.com',
      image: expect.any(String),
      isDemo: false,
      demoExpiresAt: null,
    });
    expect(Object.keys(res.body as object).sort()).toEqual([
      'demoExpiresAt',
      'email',
      'id',
      'image',
      'isDemo',
      'name',
    ]);
  });

  it('reports isDemo for a demo user', async () => {
    await t.db.prisma.user.update({
      where: { id: users.owner.userId },
      data: { isDemo: true, demoExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const res = await asUser(t.app, users.owner).get(FIXTURE_PATH.WhoAmI).expect(200);
    expect((res.body as AuthUser).isDemo).toBe(true);
  });

  it('answers 401 for an expired session', async () => {
    await t.db.prisma.session.updateMany({
      where: { userId: users.owner.userId },
      data: { expiresAt: new Date(Date.now() - HOUR_MS) },
    });
    await asUser(t.app, users.owner).get(FIXTURE_PATH.WhoAmI).expect(401);
  });

  it('answers 401 with the old cookie after sign-out', async () => {
    await request(t.app.getHttpServer())
      .post(AUTH_ENDPOINT.SignOut)
      .set('Origin', t.baseUrl)
      .set('Cookie', users.owner.cookie)
      .expect(200);
    await asUser(t.app, users.owner).get(FIXTURE_PATH.WhoAmI).expect(401);
  });

  it('does not slide the session: only get-session does', async () => {
    const where = { userId: users.owner.userId };
    const inWindow = new Date(Date.now() + HOUR_MS);
    await t.db.prisma.session.updateMany({ where, data: { expiresAt: inWindow } });

    await asUser(t.app, users.owner).get(FIXTURE_PATH.WhoAmI).expect(200);
    const afterGuard = await t.db.prisma.session.findFirstOrThrow({ where });
    expect(afterGuard.expiresAt.getTime()).toBe(inWindow.getTime());

    await asUser(t.app, users.owner).get(AUTH_ENDPOINT.GetSession).expect(200);
    const afterGetSession = await t.db.prisma.session.findFirstOrThrow({ where });
    expect(afterGetSession.expiresAt.getTime()).toBeGreaterThan(inWindow.getTime());
  });

  it('rejects a body with a userId (forbidNonWhitelisted)', async () => {
    const res = await asUser(t.app, users.owner)
      .post(FIXTURE_PATH.Notes)
      .send({ text: 'hello', userId: users.intruder.userId });
    expect(res.status).toBe(400);
    const list = await asUser(t.app, users.intruder).get(FIXTURE_PATH.Notes).expect(200);
    expect(list.body).toEqual({ items: [] });
  });

  it('owns a created note by the session user only', async () => {
    const created = await asUser(t.app, users.owner)
      .post(FIXTURE_PATH.Notes)
      .send({ text: 'mine' })
      .expect(201);
    const id = (created.body as { id: string }).id;
    const ownerList = await asUser(t.app, users.owner).get(FIXTURE_PATH.Notes).expect(200);
    const intruderList = await asUser(t.app, users.intruder).get(FIXTURE_PATH.Notes).expect(200);
    expect((ownerList.body as { items: { id: string }[] }).items.map((n) => n.id)).toEqual([id]);
    expect(intruderList.body).toEqual({ items: [] });
  });
});
