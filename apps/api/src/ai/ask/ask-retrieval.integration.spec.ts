import { AI_ENDPOINT, type AuthUser } from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../../test-utils/reset-rate-limits';
import { seedLink } from '../../../test-utils/seed-link';
import { AiBackgroundService } from '../background/ai-background.service';
import { AI_ENV } from '../models/ai-env.const';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AskRetrievalService } from './ask-retrieval.service';

describe('Ask retrieval (AI-4)', () => {
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

  const owner = (): AuthUser => ({ id: users.owner.userId, isDemo: false }) as unknown as AuthUser;
  const intruder = (): AuthUser =>
    ({ id: users.intruder.userId, isDemo: false }) as unknown as AuthUser;
  const retrieval = () => t.app.get(AskRetrievalService);
  const turnOn = async (agent: TestAgent) => {
    await agent
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off' })
      .expect(200);
    await deferrer.flush();
  };
  const library = async (userId: string, prefix = '') => {
    const folder = await t.db.prisma.folder.create({ data: { userId, name: `${prefix}Wardrobe` } });
    await seedLink(t.db.prisma, userId, {
      title: `${prefix}Winter coat buying guide`,
      url: 'https://www.shop.example/coats/winter?ref=mail#top',
      tags: ['clothing'],
      folderId: folder.id,
      note: `${prefix}my secret sizes`,
    });
    await seedLink(t.db.prisma, userId, { title: `${prefix}Parka review`, tags: ['clothing'] });
    await seedLink(t.db.prisma, userId, { title: `${prefix}Best ramen in Tokyo`, tags: ['food'] });
    await seedLink(t.db.prisma, userId, { title: `${prefix}Angular signals deep dive` });
  };
  const options = { searchReady: false, tier: 'free' as const, includeNotes: false };

  it('finds word matches of the user only, numbered, with the prompt fields and no query string', async () => {
    await library(users.owner.userId);
    await library(users.intruder.userId, 'Other ');
    const found = await retrieval().retrieve(owner(), 'Which winter coat did I save?', options);
    expect(found.sources.map((source) => source.title)).toEqual(['Winter coat buying guide']);
    expect(found.sources[0]).toMatchObject({
      n: 1,
      host: 'shop.example',
      path: '/coats/winter',
      folderName: 'Wardrobe',
      tagNames: ['clothing'],
      note: null,
    });
    expect(found.wordMatches).toBe(1);
    expect(found.meaningMatches).toBe(0);
    const ownIds = new Set(
      (await t.db.prisma.link.findMany({ where: { userId: users.owner.userId } })).map((l) => l.id),
    );
    expect(found.linkIds.every((id) => ownIds.has(id))).toBe(true);
  });

  it('matches tag names, ranks by matched words and sends the note only with the switch', async () => {
    await library(users.owner.userId);
    const byTag = await retrieval().retrieve(owner(), 'my clothing links', options);
    expect(byTag.sources.map((source) => source.title).sort()).toEqual([
      'Parka review',
      'Winter coat buying guide',
    ]);
    const ranked = await retrieval().retrieve(owner(), 'winter clothing', options);
    expect(ranked.sources[0]?.title).toBe('Winter coat buying guide');
    const withNotes = await retrieval().retrieve(owner(), 'winter coat', {
      ...options,
      includeNotes: true,
    });
    expect(withNotes.sources[0]?.note).toBe('my secret sizes');
  });

  it('finds nothing for a question without topic words, and never a trashed link', async () => {
    await library(users.owner.userId);
    expect((await retrieval().retrieve(owner(), 'What did I save?', options)).sources).toEqual([]);
    await t.db.prisma.link.updateMany({
      where: { userId: users.owner.userId },
      data: { deletedAt: new Date() },
    });
    expect((await retrieval().retrieve(owner(), 'winter coat', options)).sources).toEqual([]);
  });

  it('adds meaning matches once search is ready, never from another user', async () => {
    await library(users.owner.userId);
    await library(users.intruder.userId, 'Other ');
    await turnOn(a);
    await turnOn(b);
    const found = await retrieval().retrieve(owner(), 'warm jackets for the cold', {
      ...options,
      searchReady: true,
    });
    expect(found.meaningMatches).toBeGreaterThan(0);
    expect(found.sources.length).toBeLessThanOrEqual(10);
    expect(found.sources.every((source) => !source.title.startsWith('Other '))).toBe(true);
    const theirs = await retrieval().retrieve(intruder(), 'warm jackets for the cold', {
      ...options,
      searchReady: true,
    });
    expect(theirs.sources.every((source) => source.title.startsWith('Other '))).toBe(true);
  });

  it('falls back to words only when the query cannot be embedded', async () => {
    await library(users.owner.userId);
    await turnOn(a);
    const provider = t.app.get(AiProviderRegistry).embeddingsFor({ isDemo: false });
    vi.spyOn(provider, 'embed').mockResolvedValue({ ok: false, retryable: true });
    const found = await retrieval().retrieve(owner(), 'Parka review', {
      ...options,
      searchReady: true,
    });
    expect(found.meaningMatches).toBe(0);
    expect(found.sources.map((source) => source.title)).toEqual(['Parka review']);
  });

  it('caps the sources at ten', async () => {
    for (let i = 0; i < 14; i += 1) {
      await seedLink(t.db.prisma, users.owner.userId, { title: `Ramen place ${i}` });
    }
    const found = await retrieval().retrieve(owner(), 'ramen', options);
    expect(found.sources).toHaveLength(10);
    expect(found.sources.map((source) => source.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
