import type { LinkLookupResponse } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const PATH = '/api/links/lookup';

describe('POST /api/links/lookup', () => {
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

  const lookup = async (agent: TestAgent, url: string): Promise<LinkLookupResponse> =>
    (await agent.post(PATH).send({ url }).expect(200)).body as LinkLookupResponse;

  it('returns the own link, mapped like any other link', async () => {
    const id = await seedLink(t.db.prisma, users.owner.userId, {
      url: 'https://hello.test/page',
      title: 'Saved title',
      tags: ['dev'],
    });
    const { link } = await lookup(a, 'https://hello.test/page');
    expect(link).toMatchObject({ id, url: 'https://hello.test/page', title: 'Saved title' });
    expect(link?.tags).toEqual(['dev']);
  });

  it('answers null when nothing is saved', async () => {
    expect(await lookup(a, 'https://nothing.test/')).toEqual({ link: null });
  });

  it('ignores a trashed link', async () => {
    const id = await seedLink(t.db.prisma, users.owner.userId, { url: 'https://hello.test/page' });
    await t.db.prisma.link.update({ where: { id }, data: { deletedAt: new Date() } });
    expect(await lookup(a, 'https://hello.test/page')).toEqual({ link: null });
  });

  it('matches by normalized URL and strips tracking parameters', async () => {
    const id = await seedLink(t.db.prisma, users.owner.userId, { url: 'https://hello.test/page' });
    expect((await lookup(a, 'https://HELLO.test/page/?utm_source=x&fbclid=1#frag')).link?.id).toBe(
      id,
    );
    expect((await lookup(a, 'hello.test/page')).link?.id).toBe(id);
  });

  it('keeps other query parameters significant', async () => {
    await seedLink(t.db.prisma, users.owner.userId, { url: 'https://hello.test/page?id=1' });
    expect((await lookup(a, 'https://hello.test/page?id=2')).link).toBeNull();
  });

  it('returns the newest of several live links', async () => {
    await seedLink(t.db.prisma, users.owner.userId, {
      url: 'https://hello.test/page',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    const newest = await seedLink(t.db.prisma, users.owner.userId, {
      url: 'https://hello.test/page',
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    expect((await lookup(a, 'https://hello.test/page')).link?.id).toBe(newest);
  });

  it('never shows the link of another user', async () => {
    await seedLink(t.db.prisma, users.intruder.userId, { url: 'https://hello.test/page' });
    expect(await lookup(a, 'https://hello.test/page')).toEqual({ link: null });
    expect((await lookup(b, 'https://hello.test/page')).link).not.toBeNull();
  });

  it('rejects a bad URL and extra fields with 400', async () => {
    await a.post(PATH).send({ url: 'ftp://hello.test/x' }).expect(400);
    await a.post(PATH).send({}).expect(400);
    await a.post(PATH).send({ url: 'https://hello.test/', extra: 1 }).expect(400);
  });

  it('requires a session', async () => {
    await anonymous(t.app).post(PATH).send({ url: 'https://hello.test/' }).expect(401);
  });
});
