import { FEEDBACK_ENDPOINT } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';

const VIEWS = FEEDBACK_ENDPOINT.RatingPromptViews;

describe('rating prompt views API', () => {
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

  const rows = (userId: string) =>
    t.db.prisma.ratingPromptView.findMany({ where: { userId }, orderBy: { milestone: 'asc' } });

  it('creates the row with a count of 1 and answers 204', async () => {
    await a.post(VIEWS).send({ milestone: 'day3' }).expect(204);
    expect(await rows(users.owner.userId)).toMatchObject([{ milestone: 'day3', shownCount: 1 }]);
  });

  it('increments the count and moves last_shown_at, first_shown_at stays', async () => {
    await a.post(VIEWS).send({ milestone: 'week1' }).expect(204);
    const [first] = await rows(users.owner.userId);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await a.post(VIEWS).send({ milestone: 'week1' }).expect(204);
    await a.post(VIEWS).send({ milestone: 'month1' }).expect(204);
    const all = await rows(users.owner.userId);
    expect(all.map((row) => [row.milestone, row.shownCount])).toEqual([
      ['month1', 1],
      ['week1', 2],
    ]);
    const week1 = all.find((row) => row.milestone === 'week1');
    expect(week1?.firstShownAt).toEqual(first?.firstShownAt);
    expect(week1?.lastShownAt.getTime()).toBeGreaterThan(first?.lastShownAt.getTime() ?? 0);
  });

  it('counts parallel calls without losing one', async () => {
    await Promise.all([1, 2, 3, 4].map(() => a.post(VIEWS).send({ milestone: 'day3' })));
    expect(await rows(users.owner.userId)).toMatchObject([{ shownCount: 4 }]);
  });

  it('counts a demo user too', async () => {
    await t.db.prisma.user.update({
      where: { id: users.owner.userId },
      data: { isDemo: true, demoExpiresAt: new Date(Date.now() + 86_400_000) },
    });
    await a.post(VIEWS).send({ milestone: 'day3' }).expect(204);
    expect(await rows(users.owner.userId)).toHaveLength(1);
  });

  it.each([
    ['an unknown milestone', { milestone: 'week2' }],
    ['no milestone', {}],
    ['a non-string milestone', { milestone: 3 }],
    ['an extra field (forbidNonWhitelisted)', { milestone: 'day3', userId: 'x' }],
  ])('400 for %s, nothing is written', async (_label, body) => {
    await a.post(VIEWS).send(body).expect(400);
    expect(await t.db.prisma.ratingPromptView.count()).toBe(0);
  });

  it('401 for an anonymous caller and 403 for a foreign Origin', async () => {
    await anonymous(t.app).post(VIEWS).send({ milestone: 'day3' }).expect(401);
    await a.post(VIEWS).set('Origin', 'https://evil.test').send({ milestone: 'day3' }).expect(403);
    expect(await t.db.prisma.ratingPromptView.count()).toBe(0);
  });

  it('isolates users: each writes only their own row, a body user id is refused', async () => {
    await a.post(VIEWS).send({ milestone: 'day3' }).expect(204);
    await a.post(VIEWS).send({ milestone: 'day3' }).expect(204);
    await b.post(VIEWS).send({ milestone: 'day3' }).expect(204);
    await b.post(VIEWS).send({ milestone: 'day3', userId: users.owner.userId }).expect(400);
    expect(await rows(users.owner.userId)).toMatchObject([{ shownCount: 2 }]);
    expect(await rows(users.intruder.userId)).toMatchObject([{ shownCount: 1 }]);
  });

  it('429 after 10 calls in a minute', async () => {
    for (let i = 0; i < 10; i++) {
      await a.post(VIEWS).send({ milestone: 'day3' }).expect(204);
    }
    await a.post(VIEWS).send({ milestone: 'day3' }).expect(429);
  });

  it('deletes the rows with the user', async () => {
    await a.post(VIEWS).send({ milestone: 'day3' }).expect(204);
    await t.db.prisma.user.delete({ where: { id: users.owner.userId } });
    expect(await t.db.prisma.ratingPromptView.count()).toBe(0);
  });
});
