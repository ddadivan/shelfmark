import { Logger } from '@nestjs/common';
import { AI_ENDPOINT, AI_QUOTA, type MeaningSearchResponse } from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { AiBackgroundService } from './background/ai-background.service';
import { AI_ENV } from './models/ai-env.const';
import { AI_MEANING_LIMIT } from './models/ai-meaning-limit.const';
import { EMBEDDING_LIMIT } from './models/embedding-limit.const';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { QueryEmbeddingCache } from './search/query-embedding-cache.service';

const SEARCH = AI_ENDPOINT.MeaningSearch;

describe('GET /api/ai/search (AI-3)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const deferrer = new AwaitableDeferrer();

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined },
      overrides: [{ provide: AiBackgroundService, useValue: deferrer }],
    });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    deferrer.clear();
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const owner = (): string => users.owner.userId;
  const intruder = (): string => users.intruder.userId;
  const provider = () => t.app.get(AiProviderRegistry).embeddingsFor({ isDemo: false });
  const search = async (q: string, agent: TestAgent = a, limit?: number) =>
    (
      await agent
        .get(SEARCH)
        .query(limit === undefined ? { q } : { q, limit })
        .expect(200)
    ).body as MeaningSearchResponse;
  const titles = (res: MeaningSearchResponse) => res.items.map((item) => item.link.title);
  const turnOn = async (agent: TestAgent = a) => {
    await agent
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off' })
      .expect(200);
    await deferrer.flush();
  };
  /** A small library: two clothing links, a food link and a framework link. */
  const library = async (userId: string, prefix = '') => {
    const folder = await t.db.prisma.folder.create({
      data: { userId, name: `${prefix}Wardrobe` },
    });
    await seedLink(t.db.prisma, userId, {
      title: `${prefix}Winter coat buying guide`,
      tags: ['clothing'],
      folderId: folder.id,
    });
    await seedLink(t.db.prisma, userId, { title: `${prefix}Parka review`, tags: ['clothing'] });
    await seedLink(t.db.prisma, userId, { title: `${prefix}Best ramen in Tokyo`, tags: ['food'] });
    await seedLink(t.db.prisma, userId, { title: `${prefix}Angular signals deep dive` });
  };

  it('needs a session and a query of 3 to 200 characters', async () => {
    await anonymous(t.app).get(SEARCH).query({ q: 'coat' }).expect(401);
    await a.get(SEARCH).expect(400);
    await a.get(SEARCH).query({ q: '  ab   ' }).expect(400);
    await a
      .get(SEARCH)
      .query({ q: 'x'.repeat(201) })
      .expect(400);
    await a.get(SEARCH).query({ q: 'coat', limit: 0 }).expect(400);
    await a.get(SEARCH).query({ q: 'coat', limit: 11 }).expect(400);
    await a.get(SEARCH).query({ q: 'coat', extra: 1 }).expect(400);
  });

  it('answers off without a provider call while AI or the switch is off', async () => {
    await library(owner());
    const spy = vi.spyOn(provider(), 'embed');
    expect(await search('warm jackets')).toEqual({
      status: { state: 'off', ready: 0, total: 0 },
      items: [],
    });
    await turnOn();
    await a.patch(AI_ENDPOINT.Settings).send({ meaningSearch: false }).expect(200);
    expect((await search('warm jackets')).status.state).toBe('off');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalledWith(expect.anything(), 'query');
  });

  it('answers processing with no items while fewer than 80% of the links have a vector', async () => {
    await library(owner());
    await a
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off' })
      .expect(200);
    deferrer.clear();
    const spy = vi.spyOn(provider(), 'embed');
    expect(await search('warm jackets')).toEqual({
      status: { state: 'processing', ready: 0, total: 4 },
      items: [],
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('finds links by meaning that are not word matches, best first, with why they matched', async () => {
    await library(owner());
    await turnOn();
    const res = await search('warm jackets');
    expect(res.status).toEqual({ state: 'ready', ready: 4, total: 4 });
    expect(titles(res).sort()).toEqual(['Parka review', 'Winter coat buying guide']);
    for (const item of res.items) expect(item.why).toEqual([{ source: 'tag', text: 'clothing' }]);
    expect(res.items[0]?.link).toMatchObject({ url: expect.any(String), tags: ['clothing'] });

    // "parka" is a word match for the review: the word search shows it, so meaning leaves it out.
    expect(titles(await search('parka'))).toEqual(['Winter coat buying guide']);
    expect(titles(await search('wardrobe jackets', a, 1))).toHaveLength(1);
  });

  it('caches the query vector per user and counts a provider call against search queries', async () => {
    await library(owner());
    await turnOn();
    const spy = vi.spyOn(provider(), 'embed');
    await search('warm jackets');
    await search('  warm   jackets ');
    expect(spy).toHaveBeenCalledTimes(1);
    const usage = await t.db.prisma.aiUsage.findFirstOrThrow({ where: { userId: owner() } });
    expect(usage.searchQueries).toBe(1);

    await t.db.prisma.aiUsage.updateMany({
      where: { userId: owner() },
      data: { searchQueries: AI_QUOTA.free.searchQueriesPerMonth },
    });
    // A cached query still answers; a new one hits the monthly limit without a call.
    expect((await search('warm jackets')).status.state).toBe('ready');
    expect(await search('cold weather')).toEqual({
      status: { state: 'quota', ready: 4, total: 4 },
      items: [],
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('answers unavailable and gives the query back when the provider fails', async () => {
    await library(owner());
    await turnOn();
    const res = await search('please ai-fail');
    expect(res).toEqual({ status: { state: 'unavailable', ready: 4, total: 4 }, items: [] });
    const usage = await t.db.prisma.aiUsage.findFirst({ where: { userId: owner() } });
    expect(usage?.searchQueries ?? 0).toBe(0);
  });

  describe('with controlled vectors', () => {
    /** A unit vector with `head` on the first axis and the rest on `axis`. */
    const vectorOf = (head: number, axis = 1): string =>
      `[${Array.from({ length: EMBEDDING_LIMIT.Dimensions }, (_, i) =>
        i === 0 ? head : i === axis ? Math.sqrt(1 - head * head) : 0,
      ).join(',')}]`;
    const setVector = (linkId: string, vector: string) =>
      t.db.prisma.$executeRaw`
        UPDATE link_embeddings SET embedding = ${vector}::halfvec WHERE link_id = ${linkId}::uuid`;
    /** The query embeds along the first axis. */
    const queryAlongFirstAxis = () =>
      vi
        .spyOn(provider(), 'embed')
        .mockResolvedValue({ ok: true, vectors: [JSON.parse(vectorOf(1)) as number[]], tokens: 1 });

    it('removes word matches before the relative window, so a nearer word match leaves meaning matches', async () => {
      const word = await seedLink(t.db.prisma, owner(), { title: 'Zebra stripes' });
      const meaning = await seedLink(t.db.prisma, owner(), { title: 'Horse patterns' });
      await turnOn();
      await setVector(word, vectorOf(1));
      // 0.2 below the word match: outside its window, but the best once word matches are gone.
      await setVector(meaning, vectorOf(0.8));
      queryAlongFirstAxis();
      expect(titles(await search('zebra stripes'))).toEqual(['Horse patterns']);
    });

    it('does not let trashed links with nearer vectors shrink the result', async () => {
      const live = await seedLink(t.db.prisma, owner(), { title: 'Live neighbour' });
      const trashed: string[] = [];
      for (let i = 0; i < AI_MEANING_LIMIT.KnnLimit; i += 1) {
        trashed.push(await seedLink(t.db.prisma, owner(), { title: `Trashed ${i}` }));
      }
      await turnOn();
      for (const [i, id] of trashed.entries()) await setVector(id, vectorOf(1, i + 2));
      await setVector(live, vectorOf(0.95));
      await t.db.prisma.link.updateMany({
        where: { id: { in: trashed } },
        data: { deletedAt: new Date() },
      });
      queryAlongFirstAxis();
      expect(titles(await search('something else'))).toEqual(['Live neighbour']);
    });
  });

  it('leaves out trashed links and never logs the query', async () => {
    await library(owner());
    await turnOn();
    const coat = await t.db.prisma.link.findFirstOrThrow({
      where: { userId: owner(), title: { startsWith: 'Winter' } },
    });
    await a.delete(`/api/links/${coat.id}`).expect(204);
    const logged: string[] = [];
    for (const method of ['log', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(Logger.prototype, method).mockImplementation((message: unknown) => {
        logged.push(String(message));
      });
    }
    const res = await search('warm jackets secretword');
    expect(titles(res)).not.toContain('Winter coat buying guide');
    expect(logged.join('\n')).not.toMatch(/secretword|jackets/);
  });

  describe('data isolation', () => {
    it('never answers another user’s links, even identical and nearer ones', async () => {
      await library(owner());
      // The intruder has the same texts and many links that are nearer to the query.
      await library(intruder());
      for (let i = 0; i < 25; i += 1) {
        await seedLink(t.db.prisma, intruder(), { title: `warm jackets ${i}`, tags: ['jacket'] });
      }
      await turnOn();
      await turnOn(b);
      const ownIds = new Set(
        (await t.db.prisma.link.findMany({ where: { userId: owner() } })).map((link) => link.id),
      );
      const res = await search('warm jackets', a, 10);
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items.every((item) => ownIds.has(item.link.id))).toBe(true);
      expect(res.status).toEqual({ state: 'ready', ready: 4, total: 4 });
    });

    it('never shares a cached query vector between users', async () => {
      await library(owner());
      await library(intruder());
      await turnOn();
      await turnOn(b);
      const spy = vi.spyOn(provider(), 'embed');
      await search('warm jackets', a);
      await search('warm jackets', b);
      expect(spy).toHaveBeenCalledTimes(2);
      const cache = t.app.get(QueryEmbeddingCache);
      expect(cache.key(owner(), 'mock-embed-1', 'warm jackets')).not.toBe(
        cache.key(intruder(), 'mock-embed-1', 'warm jackets'),
      );
    });
  });
});
