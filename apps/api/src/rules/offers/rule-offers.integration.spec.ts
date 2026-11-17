import {
  AI_ENDPOINT,
  RULE_LIMIT,
  RULE_OFFER_ENDPOINT,
  type RuleOfferResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../../test-utils/reset-rate-limits';
import { seedLink } from '../../../test-utils/seed-link';

describe('rule offers (AI-2)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  let minutes = 0;

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

  const folder = async (userId: string, name = 'Videos'): Promise<string> =>
    (await t.db.prisma.folder.create({ data: { userId, name } })).id;
  /** Links of one site, oldest first (each one a minute newer than the last). */
  const file = async (
    userId: string,
    folderId: string | null,
    times = 1,
    url = 'https://www.youtube.com/watch?v=',
  ): Promise<string[]> => {
    const ids: string[] = [];
    for (let i = 0; i < times; i += 1) {
      minutes += 1;
      ids.push(
        await seedLink(t.db.prisma, userId, {
          url: `${url}${minutes}`,
          folderId,
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, minutes)),
        }),
      );
    }
    return ids;
  };
  const check = async (linkIds: string[], agent: TestAgent = a): Promise<RuleOfferResponse> =>
    (await agent.post(RULE_OFFER_ENDPOINT.Check).send({ linkIds }).expect(200))
      .body as RuleOfferResponse;
  const dismiss = (domain: string, agent: TestAgent = a) =>
    agent.post(RULE_OFFER_ENDPOINT.Dismiss).send({ domain });

  it('offers a rule when the last three links of the site share a folder', async () => {
    const videos = await folder(users.owner.userId);
    const ids = await file(users.owner.userId, videos, 3);
    expect(await check([ids[2] ?? ''])).toEqual({
      offer: { domain: 'youtube.com', folderId: videos, count: 3 },
    });
  });

  it('offers nothing below three, for mixed folders, for links in Unsorted or a folder in Trash', async () => {
    const owner = users.owner.userId;
    const videos = await folder(owner);
    const two = await file(owner, videos, 2);
    expect(await check(two)).toEqual({ offer: null });
    const other = await folder(owner, 'Other');
    const mixed = await file(owner, other, 1);
    await file(owner, videos, 1);
    expect(await check(mixed)).toEqual({ offer: null });
    const unsorted = await file(owner, null, 1);
    expect(await check(unsorted)).toEqual({ offer: null });
    await file(owner, videos, 3);
    await t.db.prisma.folder.update({ where: { id: videos }, data: { deletedAt: new Date() } });
    expect(await check(two)).toEqual({ offer: null });
  });

  it('does not count a link AI filed', async () => {
    const owner = users.owner.userId;
    const videos = await folder(owner);
    const ids = await file(owner, videos, 3);
    await t.db.prisma.linkSuggestion.create({
      data: {
        userId: owner,
        linkId: ids[1] ?? '',
        kind: 'folder',
        folderId: videos,
        state: 'auto-applied',
      },
    });
    expect(await check(ids)).toEqual({ offer: null });
  });

  it('skips a site a rule covers (also a parent domain) and when the rule limit is reached', async () => {
    const owner = users.owner.userId;
    const videos = await folder(owner);
    const music = await file(owner, videos, 3, 'https://music.youtube.com/watch?v=');
    await t.db.prisma.linkRule.create({ data: { userId: owner, domain: 'youtube.com' } });
    expect(await check(music)).toEqual({ offer: null });
    await t.db.prisma.linkRule.deleteMany({ where: { userId: owner } });
    expect((await check(music)).offer?.domain).toBe('music.youtube.com');
    await t.db.prisma.linkRule.createMany({
      data: Array.from({ length: RULE_LIMIT.PerUserMax }, (_, i) => ({
        userId: owner,
        domain: `site${i}.example`,
      })),
    });
    expect(await check(music)).toEqual({ offer: null });
  });

  it('reads a site stored in Unicode as its punycode domain', async () => {
    const owner = users.owner.userId;
    const books = await folder(owner, 'Books');
    const ids = await file(owner, books, 3, 'https://bücher.de/');
    expect((await check(ids)).offer).toEqual({
      domain: 'xn--bcher-kva.de',
      folderId: books,
      count: 3,
    });
  });

  it('remembers "Not now" per site, idempotently, and validates the domain', async () => {
    const videos = await folder(users.owner.userId);
    const ids = await file(users.owner.userId, videos, 3);
    await dismiss('https://www.YouTube.com/watch').expect(204);
    await dismiss('youtube.com').expect(204);
    expect(await check(ids)).toEqual({ offer: null });
    expect(await t.db.prisma.ruleOfferDismissal.count()).toBe(1);
    await dismiss('localhost').expect(400);
    await a.post(RULE_OFFER_ENDPOINT.Dismiss).send({}).expect(400);
  });

  it('validates the check body', async () => {
    await a.post(RULE_OFFER_ENDPOINT.Check).send({ linkIds: [] }).expect(400);
    await a
      .post(RULE_OFFER_ENDPOINT.Check)
      .send({ linkIds: ['x'] })
      .expect(400);
    const id = crypto.randomUUID();
    await a
      .post(RULE_OFFER_ENDPOINT.Check)
      .send({ linkIds: [id, id] })
      .expect(400);
    expect(await check([crypto.randomUUID()])).toEqual({ offer: null });
  });

  it('keeps "Not now" when AI data is deleted', async () => {
    await dismiss('youtube.com').expect(204);
    await a.delete(AI_ENDPOINT.Data).expect(204);
    expect(await t.db.prisma.ruleOfferDismissal.count()).toBe(1);
  });

  describe('data isolation', () => {
    it("answers nothing for the other user's links", async () => {
      const videos = await folder(users.intruder.userId);
      const theirs = await file(users.intruder.userId, videos, 3);
      expect(await check(theirs)).toEqual({ offer: null });
      expect((await check(theirs, b)).offer?.folderId).toBe(videos);
    });

    it("never counts the other user's links toward a pattern", async () => {
      const mine = await folder(users.owner.userId);
      const theirs = await folder(users.intruder.userId);
      await file(users.intruder.userId, theirs, 3);
      const ids = await file(users.owner.userId, mine, 2);
      expect(await check(ids)).toEqual({ offer: null });
    });

    it("does not hide the other user's offer after a dismiss", async () => {
      const theirs = await folder(users.intruder.userId);
      const ids = await file(users.intruder.userId, theirs, 3);
      await dismiss('youtube.com').expect(204);
      expect((await check(ids, b)).offer?.domain).toBe('youtube.com');
    });
  });
});
