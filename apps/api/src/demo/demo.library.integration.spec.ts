import {
  AI_ENDPOINT,
  AI_FEATURE_MODE,
  AI_JOB_STATUS,
  AI_QUOTA,
  ASK_PERIOD,
  AUTH_ENDPOINT,
  DEMO_LIMIT,
  REDISCOVER_ENDPOINT,
  REDISCOVER_LIMIT,
  REDISCOVER_MODE,
  RULE_OFFER_ENDPOINT,
  SUGGESTION_KIND,
  SUGGESTION_STATE,
  SUMMARY_SOURCE,
} from '@shelfmark/contracts';
import type {
  AiSettingsResponse,
  AskDoneEvent,
  GetSessionResponse,
  LinkAiState,
  LinkResponse,
  ListFoldersResponse,
  ListLinksResponse,
  ListRemindersResponse,
  ListTagsResponse,
  RediscoverResponse,
  RuleOfferResponse,
  TidyApplyResponse,
  TidyListResponse,
} from '@shelfmark/contracts';
import request from 'supertest';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { sseEvents, sseParser } from '../../test-utils/read-sse';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInAs } from '../../test-utils/sign-in-as';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { AiBackgroundService } from '../ai/background/ai-background.service';
import { AiExcerptService } from '../ai/excerpt/ai-excerpt.service';
import { DEMO_SEED } from './demo-seed';

const LINKS = '/api/links';
const DAY_MS = 24 * 60 * 60 * 1000;

describe('demo library, limits and expiry', () => {
  let t: AuthTestApp;
  // Demo users start with AI on, so saves queue jobs: they run only when a spec flushes them.
  const deferrer = new AwaitableDeferrer();
  const excerpts = { load: vi.fn(() => Promise.resolve({ excerpt: null, description: null })) };

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [
        { provide: AiBackgroundService, useValue: deferrer },
        { provide: AiExcerptService, useValue: excerpts },
      ],
    });
  });

  afterEach(async () => {
    deferrer.clear();
    await t.db.truncateAll();
    resetRateLimits(t.app);
  });

  afterAll(async () => {
    await t.close();
  });

  describe('seed', () => {
    it('gives the new user the seed library: counts, nesting, tags and dates', async () => {
      const before = Date.now();
      const demo = await signInDemo(t.app, t.baseUrl);
      const where = { userId: demo.userId };

      expect(await t.db.prisma.link.count({ where })).toBe(DEMO_SEED.links.length);
      expect(await t.db.prisma.tag.count({ where })).toBe(DEMO_SEED.tags.length);
      const rules = await t.db.prisma.linkRule.findMany({ where, include: { folder: true } });
      expect(rules.map((rule) => [rule.domain, rule.folder?.name, rule.tagNames])).toEqual([
        ['angular.dev', 'Angular', ['angular']],
      ]);
      const folders = await t.db.prisma.folder.findMany({ where, include: { parent: true } });
      expect(folders).toHaveLength(DEMO_SEED.folders.length);
      expect(
        folders
          .filter((folder) => folder.highlighted)
          .map((folder) => folder.name)
          .sort(),
      ).toEqual(
        DEMO_SEED.folders
          .filter((folder) => folder.highlighted === true)
          .map((folder) => folder.name)
          .sort(),
      );
      const nested = folders.filter((folder) => folder.parentId !== null);
      expect(nested).toHaveLength(1);
      expect(nested[0]?.parent?.name).toBe('Work');
      expect(await t.db.prisma.linkTag.count({ where: { link: where } })).toBe(
        DEMO_SEED.links.reduce((sum, link) => sum + link.tags.length, 0),
      );

      const links = await t.db.prisma.link.findMany({ where });
      const newest = Math.max(...links.map((link) => link.createdAt.getTime()));
      const oldest = Math.min(...links.map((link) => link.createdAt.getTime()));
      expect(newest).toBeLessThanOrEqual(Date.now());
      expect(newest).toBeGreaterThan(before - DAY_MS);
      expect(before - oldest).toBeGreaterThan(20 * DAY_MS);
      expect(links.some((link) => link.lastOpenedAt !== null)).toBe(true);
      expect(links.some((link) => link.isFavorite)).toBe(true);
      for (const link of links) {
        expect(link.titleSortKey).toBe(link.title.toLowerCase());
      }
    });

    it('seeds one due and one upcoming reminder (#275)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const reminders = await asUser(t.app, demo).get('/api/reminders').expect(200);
      const body = reminders.body as ListRemindersResponse;
      expect(body.due.map((link) => link.title)).toEqual(['Patagonia Worn Wear']);
      expect(body.upcoming.map((link) => link.title)).toEqual(['TypeScript Handbook']);
      await asUser(t.app, demo).get('/api/reminders/count').expect(200, { due: 1 });
    });

    it('starts with AI on: settings row, intro seen, default modes (#389)', async () => {
      const before = Date.now();
      const demo = await signInDemo(t.app, t.baseUrl);
      const row = await t.db.prisma.aiSettings.findUniqueOrThrow({
        where: { userId: demo.userId },
      });
      expect(row.enabled).toBe(true);
      expect(row.enabledAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(row.introSeenAt?.getTime()).toBe(row.enabledAt?.getTime());
      const res = await asUser(t.app, demo).get(AI_ENDPOINT.Settings).expect(200);
      const body = res.body as AiSettingsResponse;
      expect(body.settings).toMatchObject({
        enabled: true,
        folderMode: AI_FEATURE_MODE.Suggest,
        tagsMode: AI_FEATURE_MODE.Suggest,
        summaries: true,
      });
      expect(body.introSeen).toBe(true);
      expect(body.pendingJobs).toBe(0);
    });

    it('starts with search by meaning ready: a mock vector per seed link (AI-3)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const res = await asUser(t.app, demo).get(AI_ENDPOINT.Settings).expect(200);
      const body = res.body as AiSettingsResponse;
      expect(body.settings.meaningSearch).toBe(true);
      expect(body.search).toEqual({
        state: 'ready',
        ready: DEMO_SEED.links.length,
        total: DEMO_SEED.links.length,
      });
      const rows = await t.db.prisma.linkEmbedding.findMany({ where: { userId: demo.userId } });
      expect(rows).toHaveLength(DEMO_SEED.links.length);
      expect(rows.every((row) => row.model === 'mock-embed-1' && !row.stale)).toBe(true);
      // The embed pass finds nothing to do: the seed texts are exactly what it would build.
      const meaning = await asUser(t.app, demo)
        .get(AI_ENDPOINT.MeaningSearch)
        .query({ q: 'warm jackets for winter' })
        .expect(200);
      expect((meaning.body as { status: { state: string } }).status.state).toBe('ready');
    });

    it('starts with Ask on, the Free allowance and canned answers grounded in the seed (AI-4)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const agent = asUser(t.app, demo);
      const settings = (await agent.get(AI_ENDPOINT.Settings).expect(200))
        .body as AiSettingsResponse;
      expect(settings.settings.ask).toBe(true);
      expect(settings.ask.available).toBe(true);
      expect(settings.ask.allowance).toMatchObject({
        questionsLeft: AI_QUOTA.free.questionsPerMonth,
        period: ASK_PERIOD.Month,
      });

      const themes = [
        { question: 'Which ramen recipes did I save?', intro: 'You saved a few ramen recipes.' },
        { question: 'Which coats was I comparing?', intro: 'You were comparing two coats.' },
        {
          question: 'What do I have on Angular signals?',
          intro: 'Your Angular links cover signals.',
        },
      ];
      const seedUrls = new Set(DEMO_SEED.links.map((link) => link.url));
      for (const theme of themes) {
        const res = await agent
          .post(AI_ENDPOINT.Ask)
          .send({ question: theme.question })
          .buffer(true)
          .parse(sseParser)
          .expect(200);
        const events = sseEvents(res.body);
        const text = events.map((event) => (event.type === 'text' ? event.text : '')).join('');
        expect(text.startsWith(theme.intro)).toBe(true);
        const done = events.at(-1) as AskDoneEvent;
        expect(done.type).toBe('done');
        expect(done.notFound).toBe(false);
        expect(done.sources.length).toBeGreaterThan(0);
        for (const source of done.sources) expect(seedUrls.has(source.link.url)).toBe(true);
        for (const source of done.sources) expect(text).toContain(source.link.title);
      }
      const ramen = sseEvents(
        (
          await agent
            .post(AI_ENDPOINT.Ask)
            .send({ question: 'Remind me of my ramen links' })
            .buffer(true)
            .parse(sseParser)
            .expect(200)
        ).body,
      ).at(-1) as AskDoneEvent;
      expect(ramen.sources.map((source) => source.link.title)).toEqual(
        expect.arrayContaining(['Quick shoyu ramen for weeknights', 'Ramen toppings guide']),
      );
      // Four questions counted out of the Free month; nothing about them was stored.
      expect(ramen.allowance.questionsLeft).toBe(AI_QUOTA.free.questionsPerMonth - 4);
    });

    it('shows the From your shelf block: older seed links never opened (AI-4)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const res = await asUser(t.app, demo).get(REDISCOVER_ENDPOINT.Block).expect(200);
      const block = res.body as RediscoverResponse;
      expect(block.mode).toBe(REDISCOVER_MODE.Forgotten);
      expect(block.items.length).toBeGreaterThanOrEqual(REDISCOVER_LIMIT.ItemsMin);
      expect(block.items.length).toBeLessThanOrEqual(REDISCOVER_LIMIT.ItemsMax);
      const candidates = DEMO_SEED.links
        .filter(
          (link) =>
            link.createdDaysAgo >= REDISCOVER_LIMIT.SavedDaysMin &&
            (link.lastOpenedDaysAgo === null ||
              link.lastOpenedDaysAgo >= REDISCOVER_LIMIT.OpenedDaysMin),
        )
        .map((link) => link.url);
      expect(block.items.map((item) => item.url).sort()).toEqual(candidates.sort());
    });

    it('seeds AI summaries (source ai, status done) as in seed.json (#391)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const res = await asUser(t.app, demo).get(`${LINKS}?limit=100`).expect(200);
      const items = (res.body as ListLinksResponse).items;
      for (const link of DEMO_SEED.links) {
        const item = items.find((candidate) => candidate.url === link.url);
        expect(item?.summary).toBe(link.summary ?? null);
        expect(item?.summarySource).toBe(link.summary === undefined ? null : SUMMARY_SOURCE.Ai);
        if (link.summary !== undefined) expect(item?.aiStatus).toBe(AI_JOB_STATUS.Done);
      }
      expect(await t.db.prisma.aiJob.count({ where: { userId: demo.userId } })).toBe(0);
    });

    it('seeds pending suggestions on unsorted links: seed folders, seed tags and one new tag (#390)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const links = await t.db.prisma.link.findMany({
        where: { userId: demo.userId },
        include: { folder: true },
      });
      const folders = await t.db.prisma.folder.findMany({ where: { userId: demo.userId } });
      const nameOfFolder = new Map(folders.map((folder) => [folder.id, folder.name]));
      const suggesting = DEMO_SEED.links.filter(
        (link) => link.suggestFolder !== undefined || (link.suggestTags?.length ?? 0) > 0,
      );
      expect(suggesting.length).toBeGreaterThan(0);
      for (const seedLink of suggesting) {
        const link = links.find((candidate) => candidate.url === seedLink.url);
        expect(link?.folderId).toBeNull();
        expect(link?.aiStatus).toBe(AI_JOB_STATUS.Done);
        const res = await asUser(t.app, demo)
          .get(AI_ENDPOINT.LinkAi.replace(':id', link?.id ?? ''))
          .expect(200);
        const state = res.body as LinkAiState;
        expect(state.aiStatus).toBe(AI_JOB_STATUS.Done);
        expect(state.autoApplied).toBeNull();
        for (const suggestion of state.suggestions) {
          expect(suggestion.state).toBe(SUGGESTION_STATE.Suggested);
        }
        const folderNames = state.suggestions
          .filter((suggestion) => suggestion.kind === SUGGESTION_KIND.Folder)
          .map((suggestion) => nameOfFolder.get(suggestion.folderId ?? ''));
        const seedFolder = DEMO_SEED.folders.find(
          (folder) => folder.key === seedLink.suggestFolder,
        );
        expect(folderNames).toEqual(seedFolder === undefined ? [] : [seedFolder.name]);
        expect(
          state.suggestions
            .filter((suggestion) => suggestion.kind !== SUGGESTION_KIND.Folder)
            .map((suggestion) => suggestion.tagName),
        ).toEqual(seedLink.suggestTags ?? []);
      }
      const newTags = await t.db.prisma.linkSuggestion.findMany({
        where: { userId: demo.userId, kind: SUGGESTION_KIND.NewTag },
      });
      expect(newTags).toHaveLength(1);
      expect(await t.db.prisma.tag.count({ where: { userId: demo.userId } })).toBe(
        DEMO_SEED.tags.length,
      );
    });

    it('fills Tidy, and applying it makes the YouTube rule offer (AI-2)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const agent = asUser(t.app, demo);
      const tidy = (await agent.get(AI_ENDPOINT.Tidy).expect(200)).body as TidyListResponse;
      const suggesting = DEMO_SEED.links.filter(
        (link) => link.suggestFolder !== undefined || (link.suggestTags?.length ?? 0) > 0,
      );
      expect(tidy.total).toBe(suggesting.length);
      expect(tidy.total).toBeGreaterThanOrEqual(12);
      const items = tidy.items.map((item) => ({
        linkId: item.link.id,
        suggestionIds: item.suggestions.map((suggestion) => suggestion.id),
      }));
      const applied = (await agent.post(AI_ENDPOINT.TidyApply).send({ items }).expect(200))
        .body as TidyApplyResponse;
      expect(applied.applied).toBe(tidy.total);
      const fireship = applied.links.find((link) => link.url.includes('@Fireship'));
      const offer = (
        await agent
          .post(RULE_OFFER_ENDPOINT.Check)
          .send({ linkIds: [fireship?.id ?? ''] })
          .expect(200)
      ).body as RuleOfferResponse;
      expect(offer.offer).toEqual({
        domain: 'youtube.com',
        folderId: fireship?.folderId,
        count: 3,
      });
      expect((await agent.get(AI_ENDPOINT.TidyCount).expect(200)).body).toEqual({ total: 0 });
    });

    it('runs a new save of a demo user through the mock provider (#389)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const saved = (
        await asUser(t.app, demo)
          .post(LINKS)
          .send({ url: 'https://example.com/new', title: 'Fresh page' })
          .expect(201)
      ).body as LinkResponse;
      expect(saved.aiStatus).toBe(AI_JOB_STATUS.Pending);
      await deferrer.flush();
      const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: saved.id } });
      expect(row.summary).toBe('A page about Fresh page.');
      expect(row.summarySource).toBe(SUMMARY_SOURCE.Ai);
      expect(row.aiStatus).toBe(AI_JOB_STATUS.Done);
    });

    it('is readable through the API as the demo user, and each demo user has their own copy', async () => {
      const first = await signInDemo(t.app, t.baseUrl);
      const second = await signInDemo(t.app, t.baseUrl);
      for (const user of [first, second]) {
        const links = await asUser(t.app, user).get(`${LINKS}?limit=100`).expect(200);
        expect((links.body as ListLinksResponse).items).toHaveLength(DEMO_SEED.links.length);
        const folders = await asUser(t.app, user).get('/api/folders').expect(200);
        expect((folders.body as ListFoldersResponse).items).toHaveLength(DEMO_SEED.folders.length);
        const tags = await asUser(t.app, user).get('/api/tags').expect(200);
        expect((tags.body as ListTagsResponse).items).toHaveLength(DEMO_SEED.tags.length);
      }
    });
  });

  describe('link cap', () => {
    it('answers 409 for the 101st link of a demo user, not for the 100th', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const agent = asUser(t.app, demo);
      for (let i = DEMO_SEED.links.length; i < DEMO_LIMIT.MaxLinks - 1; i++) {
        await seedLink(t.db.prisma, demo.userId);
      }
      // 99 links: the 100th is allowed.
      await agent.post(LINKS).send({ url: 'https://cap.test/100', title: 'hundredth' }).expect(201);
      expect(await t.db.prisma.link.count({ where: { userId: demo.userId } })).toBe(
        DEMO_LIMIT.MaxLinks,
      );
      const res = await agent
        .post(LINKS)
        .send({ url: 'https://cap.test/101', title: 'one too many' })
        .expect(409);
      expect((res.body as { message: string }).message).toMatch(/demo link limit/i);
      expect(await t.db.prisma.link.count({ where: { userId: demo.userId } })).toBe(
        DEMO_LIMIT.MaxLinks,
      );
    });

    it('does not cap regular users at the demo limit', async () => {
      const regular = await signInAs(t.app, t.baseUrl, { email: 'big@example.com', name: 'Big' });
      for (let i = 0; i < DEMO_LIMIT.MaxLinks; i++) {
        await seedLink(t.db.prisma, regular.userId);
      }
      await asUser(t.app, regular)
        .post(LINKS)
        .send({ url: 'https://big.test/x', title: 'beyond the demo cap' })
        .expect(201);
    });
  });

  describe('expiry', () => {
    it('answers 401 on protected routes and null on get-session once the sandbox has expired', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await asUser(t.app, demo).get(LINKS).expect(200);
      const live = await asUser(t.app, demo).get(AUTH_ENDPOINT.GetSession).expect(200);
      expect((live.body as GetSessionResponse)?.user.isDemo).toBe(true);

      await t.db.prisma.user.update({
        where: { id: demo.userId },
        data: { demoExpiresAt: new Date(Date.now() - 1000) },
      });
      // The cookie and the database session are still valid: only the demo expiry ends it.
      expect(await t.db.prisma.session.count({ where: { userId: demo.userId } })).toBe(1);
      const res = await asUser(t.app, demo).get(LINKS).expect(401);
      expect((res.body as { statusCode: number }).statusCode).toBe(401);
      await asUser(t.app, demo)
        .post(LINKS)
        .send({ url: 'https://x.test/', title: 't' })
        .expect(401);
      const session = await asUser(t.app, demo).get(AUTH_ENDPOINT.GetSession).expect(200);
      expect(session.body).toBeNull();
    });

    it('cannot even store a demo user without an expiry (database check)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await expect(
        t.db.prisma.user.update({ where: { id: demo.userId }, data: { demoExpiresAt: null } }),
      ).rejects.toThrow(/users_demo_expiry_check/);
    });

    it('caps the reported session expiry at the demo expiry after a sliding refresh', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const user = await t.db.prisma.user.findUniqueOrThrow({ where: { id: demo.userId } });
      // Simulate Better Auth's refresh: the database session now outlives the sandbox.
      await t.db.prisma.session.updateMany({
        where: { userId: demo.userId },
        data: { expiresAt: new Date(Date.now() + 7 * DAY_MS) },
      });
      const res = await asUser(t.app, demo).get(AUTH_ENDPOINT.GetSession).expect(200);
      const body = res.body as GetSessionResponse;
      expect(body?.session.expiresAt).toBe(user.demoExpiresAt?.toISOString());
    });
  });

  describe('data isolation', () => {
    const create = async (owner: ReturnType<typeof asUser>): Promise<string> =>
      (
        (await owner.post(LINKS).send({ url: 'https://owner.test/a', title: 'secret' }).expect(201))
          .body as LinkResponse
      ).id;

    const scenario = {
      create,
      read: (agent: ReturnType<typeof asUser>, id: string) => agent.get(`${LINKS}/${id}`),
      update: (agent: ReturnType<typeof asUser>, id: string) =>
        agent.patch(`${LINKS}/${id}`).send({ title: 'hacked' }),
      remove: (agent: ReturnType<typeof asUser>, id: string) => agent.delete(`${LINKS}/${id}`),
      list: {
        request: (agent: ReturnType<typeof asUser>) => agent.get(`${LINKS}?limit=100`),
        ids: (body: unknown) => (body as ListLinksResponse).items.map((item) => item.id),
      },
      reference: (agent: ReturnType<typeof asUser>, foreignId: string) =>
        agent.post(LINKS).send({ url: 'https://x.test/', title: 't', folderId: foreignId }),
    };

    it('a demo user cannot reach a regular user data', async () => {
      const owner = await signInAs(t.app, t.baseUrl, { email: 'owner@example.com', name: 'Owner' });
      const intruder = await signInDemo(t.app, t.baseUrl);
      await expectIsolated(t.app, { owner, intruder }, scenario);
    });

    it('a regular user cannot reach a demo user data', async () => {
      const owner = await signInDemo(t.app, t.baseUrl);
      const intruder = await signInAs(t.app, t.baseUrl, { email: 'in@example.com', name: 'In' });
      await expectIsolated(t.app, { owner, intruder }, scenario);
    });

    it('two demo users cannot reach each other data', async () => {
      const owner = await signInDemo(t.app, t.baseUrl);
      const intruder = await signInDemo(t.app, t.baseUrl);
      await expectIsolated(t.app, { owner, intruder }, scenario);
    });

    it('keeps the regular isolation harness working with its own users', async () => {
      const users = await createIsolationUsers(t);
      await expectIsolated(t.app, users, scenario);
    });

    it('lets a demo user see none of the seed of another demo user', async () => {
      const first = await signInDemo(t.app, t.baseUrl);
      const second = await signInDemo(t.app, t.baseUrl);
      const firstIds = (
        (await asUser(t.app, first).get(`${LINKS}?limit=100`)).body as ListLinksResponse
      ).items.map((item) => item.id);
      for (const id of firstIds) {
        await request(t.app.getHttpServer())
          .get(`${LINKS}/${id}`)
          .set('Cookie', second.cookie)
          .expect(404);
      }
    });
  });
});
