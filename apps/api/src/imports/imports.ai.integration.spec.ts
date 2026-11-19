import { randomUUID } from 'node:crypto';
import {
  AI_ENDPOINT,
  DEMO_LIMIT,
  IMPORT_AI_STATE,
  IMPORT_ENDPOINT,
  IMPORT_SOURCE,
  LINK_LIMIT,
  type ImportCheckResponse,
  type ImportGroupLink,
  type ImportLinkItem,
  type ImportSummary,
  type ListImportsResponse,
  type StartImportRequest,
  type StartImportResponse,
  type TidyCountResponse,
  type TidyListResponse,
} from '@shelfmark/contracts';
import { AiCatchUpService } from '../ai/catch-up/ai-catch-up.service';
import { AiTidyService } from '../ai/tidy/ai-tidy.service';
import { AiEmbedService } from '../ai/embeddings/ai-embed.service';
import { AiBackgroundService } from '../ai/background/ai-background.service';
import { AI_ENV } from '../ai/models/ai-env.const';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInDemo } from '../../test-utils/sign-in-demo';

const BASE = IMPORT_ENDPOINT.Base;
const linksUrl = (id: string): string => `${BASE}/${id}${IMPORT_ENDPOINT.Links}`;
const finishUrl = (id: string): string => `${BASE}/${id}${IMPORT_ENDPOINT.Finish}`;
const item = (url: string, extra: Partial<ImportLinkItem> = {}): ImportLinkItem => ({
  url,
  idempotencyKey: randomUUID(),
  title: `Design systems ${url.split('/').pop() ?? ''}`,
  ...extra,
});
const startBody = (extra: Partial<StartImportRequest> = {}): StartImportRequest => ({
  source: IMPORT_SOURCE.Browser,
  fileName: 'bookmarks.html',
  folders: [],
  ...extra,
});
const groupLinks = (count: number): ImportGroupLink[] =>
  Array.from({ length: count }, (_, i) => ({
    title: `Ramen number ${i}`,
    url: `https://noodles.example/${i}`,
  }));

describe('imports: no AI job, room and the AI pass (#387, ADR 0056 decisions 8-10)', () => {
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

  const turnOn = (settings: object = {}, agent: TestAgent = a) =>
    agent
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, meaningSearch: false, ...settings })
      .expect(200);
  const aiPack = (userId = users.owner.userId) =>
    t.db.prisma.user.update({ where: { id: userId }, data: { aiPack: true } });
  const ready = async (): Promise<void> => {
    await turnOn();
    await aiPack();
  };
  const settingsRow = () =>
    t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: users.owner.userId } });
  const importRow = (id: string) => t.db.prisma.import.findUniqueOrThrow({ where: { id } });
  const group = (count: number) =>
    a
      .post(IMPORT_ENDPOINT.Groups)
      .send({ links: groupLinks(count), folderNames: [] })
      .expect(200);
  const start = async (body: StartImportRequest, agent = a): Promise<StartImportResponse> =>
    (await agent.post(BASE).send(body).expect(201)).body as StartImportResponse;
  const send = (id: string, items: ImportLinkItem[], agent = a) =>
    agent.post(linksUrl(id)).send({ items }).expect(200);
  const finish = (id: string, agent = a) =>
    agent.post(finishUrl(id)).send({ skipped: 0, failed: 0 }).expect(204);
  const summary = async (id: string, agent = a): Promise<ImportSummary> =>
    (await agent.get(`${BASE}/${id}`).expect(200)).body as ImportSummary;
  /** An import of `count` links with the AI pass, finished (the run is deferred, not yet run). */
  const importWithPass = async (count: number, extra: Partial<StartImportRequest> = {}) => {
    const created = await start(startBody({ aiPass: true, ...extra }));
    await send(
      created.id,
      Array.from({ length: count }, (_, i) => item(`https://pass.example/${i}`)),
    );
    await finish(created.id);
    return created;
  };

  describe('no AI job on import batches', () => {
    it('enqueues nothing and never uses the monthly allowance, but still kicks the embed pass', async () => {
      await ready();
      const kick = vi.spyOn(AiEmbedService.prototype, 'kick');
      const created = await start(startBody());
      await send(created.id, [item('https://one.example/a'), item('https://one.example/b')]);
      expect(await t.db.prisma.link.count({ where: { importId: created.id } })).toBe(2);
      expect(await t.db.prisma.aiJob.count()).toBe(0);
      expect(await t.db.prisma.aiUsage.count()).toBe(0);
      expect(await t.db.prisma.link.count({ where: { aiStatus: { not: null } } })).toBe(0);
      expect(kick).toHaveBeenCalledWith(users.owner.userId);
      expect(deferrer.size).toBe(0);
    });

    it('still gives a normal save its job (the allowance is for new saves)', async () => {
      await ready();
      await a
        .post('/api/links')
        .send({ url: 'https://new.example/save', title: 'Saved' })
        .expect(201);
      expect(await t.db.prisma.aiJob.count()).toBe(1);
    });
  });

  describe('room in the check', () => {
    const room = async (agent = a): Promise<number> =>
      (
        (
          await agent
            .post(IMPORT_ENDPOINT.Check)
            .send({ urls: ['https://room.example/x'] })
            .expect(200)
        ).body as ImportCheckResponse
      ).room;

    it('answers how many more links fit the per-user cap, trashed ones included', async () => {
      expect(await room()).toBe(LINK_LIMIT.PerUserMax);
      await seedLink(t.db.prisma, users.owner.userId);
      const trashed = await seedLink(t.db.prisma, users.owner.userId);
      await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
      expect(await room()).toBe(LINK_LIMIT.PerUserMax - 2);
      // Another user's links never count.
      await seedLink(t.db.prisma, users.intruder.userId);
      expect(await room()).toBe(LINK_LIMIT.PerUserMax - 2);
    });

    it('answers the demo cap in a demo sandbox', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const agent = asUser(t.app, demo);
      const have = await t.db.prisma.link.count({ where: { userId: demo.userId } });
      expect(await room(agent)).toBe(DEMO_LIMIT.MaxLinks - have);
      await seedLink(t.db.prisma, demo.userId);
      expect(await room(agent)).toBe(DEMO_LIMIT.MaxLinks - have - 1);
    });
  });

  describe('start with aiPass', () => {
    it('marks the import and moves the units of the grouping onto it, once', async () => {
      await ready();
      await group(6);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 6, importAiPrepaid: 6 });
      const created = await start(startBody({ aiPass: true }));
      expect(await importRow(created.id)).toMatchObject({ aiRequested: true, aiPrepaid: 6 });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 6, importAiPrepaid: 0 });
      // A second import cannot take the same units.
      const second = await start(startBody({ aiPass: true }));
      expect(await importRow(second.id)).toMatchObject({ aiRequested: true, aiPrepaid: 0 });
    });

    it('leaves an import without aiPass alone and its units where they are', async () => {
      await ready();
      await group(6);
      const created = await start(startBody());
      expect(await importRow(created.id)).toMatchObject({ aiRequested: false, aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({ importAiPrepaid: 6 });
      expect((await summary(created.id)).ai).toBeNull();
    });
  });

  describe('the AI pass', () => {
    it('runs a backfill scoped to the import, spends the prepaid units first and refunds the rest', async () => {
      await ready();
      // An older link of the user must stay untouched by the scoped run.
      const older = await seedLink(t.db.prisma, users.owner.userId, {
        createdAt: new Date(Date.now() - 7 * 86_400_000),
      });
      await group(6);
      const created = await importWithPass(4);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'running', aiTotal: 4 });
      expect(await settingsRow()).toMatchObject({
        backfillState: 'running',
        backfillImportId: created.id,
        backfillTotal: 4,
      });
      expect(await summary(created.id)).toMatchObject({
        ai: { state: 'running', total: 4, done: 0, summaries: 0 },
      });

      await deferrer.flush();

      expect(await importRow(created.id)).toMatchObject({
        aiState: IMPORT_AI_STATE.Done,
        aiPrepaid: 0,
        aiTotal: 4,
      });
      // 4 of the 6 prepaid units were used; the 2 left went back to the allowance.
      expect(await settingsRow()).toMatchObject({
        backfillState: 'done',
        backfillImportId: null,
        backfillUsed: 4,
        backfillDone: 4,
      });
      expect(
        await t.db.prisma.aiUsage.count({
          where: { OR: [{ links: { gt: 0 } }, { embeds: { gt: 0 } }] },
        }),
      ).toBe(0);
      const links = await t.db.prisma.link.findMany({ where: { importId: created.id } });
      expect(links).toHaveLength(4);
      for (const link of links) {
        expect(link).toMatchObject({ summarySource: 'ai', aiStatus: 'done' });
      }
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: older } })).aiStatus,
      ).toBeNull();
      const jobs = await t.db.prisma.aiJob.findMany();
      expect(jobs).toHaveLength(4);
      expect(jobs.every((job) => job.source === 'backfill')).toBe(true);

      const done = await summary(created.id);
      expect(done.ai).toMatchObject({ state: 'done', total: 4, done: 4, summaries: 4 });
      const open = (
        (await a.get(`${AI_ENDPOINT.TidyCount}?import=${created.id}`).expect(200))
          .body as TidyCountResponse
      ).total;
      expect(open).toBeGreaterThan(0);
      expect(done.ai?.suggestions).toBe(open);
      const listed = (await a.get(BASE).expect(200)).body as ListImportsResponse;
      expect(listed.items[0]?.ai).toMatchObject({ state: 'done', total: 4, summaries: 4 });
    });

    it('takes what the prepaid units do not cover from the allowance as usual', async () => {
      await ready();
      await group(2);
      const created = await importWithPass(5);
      await deferrer.flush();
      expect(await importRow(created.id)).toMatchObject({ aiState: 'done', aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 5, backfillDone: 5 });
    });

    it('runs without a grouping too (units come from the allowance only)', async () => {
      await ready();
      const created = await importWithPass(3);
      await deferrer.flush();
      expect(await importRow(created.id)).toMatchObject({ aiState: 'done' });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 3 });
    });

    it('is idempotent: a second finish starts nothing', async () => {
      await ready();
      const created = await importWithPass(2);
      await deferrer.flush();
      await finish(created.id);
      expect(deferrer.size).toBe(0);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'done' });
    });

    it('is skipped and the units go back while "Process existing links" is running', async () => {
      await ready();
      await group(6);
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillState: 'running' },
      });
      const created = await importWithPass(3);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'skipped', aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({
        backfillState: 'running',
        backfillImportId: null,
        backfillUsed: 0,
      });
      expect(deferrer.size).toBe(0);
      expect((await summary(created.id)).ai).toMatchObject({ state: 'skipped', total: 0 });
    });

    it('is skipped and the units go back when AI is off', async () => {
      await ready();
      await group(6);
      await a.patch(AI_ENDPOINT.Settings).send({ enabled: false }).expect(200);
      const created = await importWithPass(3);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'skipped', aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0 });
    });

    it('is skipped on a plan without the allowance', async () => {
      await turnOn();
      const created = await importWithPass(2);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'skipped' });
      expect(await t.db.prisma.aiJob.count()).toBe(0);
    });

    it('is done at once when the import has no link to process', async () => {
      await ready();
      await group(6);
      const created = await start(startBody({ aiPass: true }));
      await finish(created.id);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'done', aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, backfillState: 'idle' });
    });

    it('ends as skipped, with the unused units back, when the run is stopped', async () => {
      await ready();
      await group(6);
      const created = await importWithPass(4);
      await a.delete(AI_ENDPOINT.Backfill).expect(200);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'skipped', aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({
        backfillState: 'stopped',
        backfillImportId: null,
        backfillUsed: 0,
      });
    });

    it('ends as skipped when AI is turned off during the run', async () => {
      await ready();
      await group(6);
      const created = await importWithPass(4);
      await a.patch(AI_ENDPOINT.Settings).send({ enabled: false }).expect(200);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'skipped', aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({ backfillImportId: null, backfillUsed: 0 });
    });

    it('ends as skipped when the AI data is deleted during the run', async () => {
      await ready();
      await group(6);
      const created = await importWithPass(4);
      await a.delete(AI_ENDPOINT.Data).expect(204);
      expect(await importRow(created.id)).toMatchObject({ aiState: 'skipped', aiPrepaid: 0 });
      expect(await settingsRow()).toMatchObject({ backfillImportId: null, backfillUsed: 0 });
    });

    it('lets "Process existing links" run unscoped afterwards (older links only)', async () => {
      await ready();
      const created = await importWithPass(2);
      await deferrer.flush();
      const old = await seedLink(t.db.prisma, users.owner.userId, {
        createdAt: new Date(Date.now() - 2 * 86_400_000),
      });
      await a.post(AI_ENDPOINT.Backfill).expect(200);
      expect(await settingsRow()).toMatchObject({
        backfillImportId: null,
        backfillState: 'running',
      });
      await deferrer.flush();
      expect((await t.db.prisma.link.findUniqueOrThrow({ where: { id: old } })).aiStatus).toBe(
        'done',
      );
      expect(await importRow(created.id)).toMatchObject({ aiState: 'done' });
    });
  });

  describe('finish', () => {
    it('stores the counts of the first finish only and answers 204 to repeats', async () => {
      const created = await start(startBody());
      await a.post(finishUrl(created.id)).send({ skipped: 3, failed: 1 }).expect(204);
      const first = await importRow(created.id);
      await a.post(finishUrl(created.id)).send({ skipped: 9, failed: 9 }).expect(204);
      expect(await importRow(created.id)).toMatchObject({
        skipped: 3,
        failed: 1,
        finishedAt: first.finishedAt,
      });
    });

    it('is 404 for a foreign or unknown import, repeats included', async () => {
      const created = await start(startBody());
      await b.post(finishUrl(created.id)).send({ skipped: 0, failed: 0 }).expect(404);
      await a.post(finishUrl(randomUUID())).send({ skipped: 0, failed: 0 }).expect(404);
    });
  });

  describe('suggestions count', () => {
    it('asks Tidy only for a pass that is done', async () => {
      await ready();
      const count = vi.spyOn(AiTidyService.prototype, 'count');
      const created = await importWithPass(2);
      expect((await summary(created.id)).ai).toMatchObject({ state: 'running', suggestions: 0 });
      await a.get(BASE).expect(200);
      expect(count).not.toHaveBeenCalled();
      await t.db.prisma.import.update({
        where: { id: created.id },
        data: { aiState: IMPORT_AI_STATE.Done },
      });
      await summary(created.id);
      expect(count).toHaveBeenCalledTimes(1);
    });
  });

  describe('units nobody used (AI sweep and the grouping token)', () => {
    const sweep = () => t.app.get(AiCatchUpService).sweep();
    const old = (hours: number) => new Date(Date.now() - hours * 3_600_000);

    it('gives back the prepaid units of an import that never finished, once its window is over', async () => {
      await ready();
      await group(6);
      const created = await start(startBody({ aiPass: true }));
      const fresh = await start(startBody());
      await sweep();
      // Still open: nothing happens.
      expect(await importRow(created.id)).toMatchObject({ aiPrepaid: 6, aiState: null });
      await t.db.prisma.import.update({ where: { id: created.id }, data: { createdAt: old(25) } });
      await sweep();
      expect(await importRow(created.id)).toMatchObject({ aiPrepaid: 0, aiState: 'skipped' });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, importAiPrepaid: 0 });
      expect(await importRow(fresh.id)).toMatchObject({ aiState: null });
      // A second sweep refunds nothing more.
      await sweep();
      expect((await settingsRow()).backfillUsed).toBe(0);
    });

    it('leaves a finished pass and a running one alone', async () => {
      await ready();
      await group(4);
      const created = await importWithPass(2);
      await t.db.prisma.import.update({ where: { id: created.id }, data: { createdAt: old(30) } });
      const before = await importRow(created.id);
      await sweep();
      expect(await importRow(created.id)).toMatchObject({
        aiState: before.aiState,
        aiPrepaid: before.aiPrepaid,
      });
    });

    it('gives back pending grouping units older than the window and clears the token', async () => {
      await ready();
      await group(6);
      await sweep();
      expect(await settingsRow()).toMatchObject({ backfillUsed: 6, importAiPrepaid: 6 });
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { importAiPrepaidAt: old(25) },
      });
      await sweep();
      expect(await settingsRow()).toMatchObject({
        backfillUsed: 0,
        importAiPrepaid: 0,
        importAiGroupingId: null,
        importAiPrepaidAt: null,
      });
    });

    it('only touches the units of the user they belong to', async () => {
      await ready();
      await group(6);
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { importAiPrepaidAt: old(25) },
      });
      await turnOn({}, b);
      await t.db.prisma.aiSettings.update({
        where: { userId: users.intruder.userId },
        data: { backfillUsed: 5, importAiPrepaid: 5, importAiPrepaidAt: new Date() },
      });
      await sweep();
      const other = await t.db.prisma.aiSettings.findUniqueOrThrow({
        where: { userId: users.intruder.userId },
      });
      expect(other).toMatchObject({ backfillUsed: 5, importAiPrepaid: 5 });
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, importAiPrepaid: 0 });
    });

    it('start clears the grouping token with the units it takes', async () => {
      await ready();
      await group(6);
      expect((await settingsRow()).importAiGroupingId).not.toBeNull();
      await start(startBody({ aiPass: true }));
      expect(await settingsRow()).toMatchObject({
        importAiPrepaid: 0,
        importAiGroupingId: null,
        importAiPrepaidAt: null,
      });
    });
  });

  describe('GET /api/imports/:id', () => {
    it('answers an own import, and null ai when none was asked for', async () => {
      const created = await start(startBody({ fileName: 'mine.html' }));
      expect(await summary(created.id)).toMatchObject({
        id: created.id,
        fileName: 'mine.html',
        ai: null,
      });
    });

    it("answers 404 for another user's import, an unknown id and a bad id", async () => {
      const created = await start(startBody());
      await b.get(`${BASE}/${created.id}`).expect(404);
      await a.get(`${BASE}/${randomUUID()}`).expect(404);
      await a.get(`${BASE}/not-a-uuid`).expect(400);
    });

    it('reads running while an import still takes batches and skipped once it was left open for good', async () => {
      await ready();
      const created = await start(startBody({ aiPass: true }));
      expect((await summary(created.id)).ai?.state).toBe('running');
      await t.db.prisma.import.update({
        where: { id: created.id },
        data: { createdAt: new Date(Date.now() - 48 * 3_600_000) },
      });
      expect((await summary(created.id)).ai?.state).toBe('skipped');
    });
  });

  describe('Tidy limited to an import', () => {
    const run = async () => {
      await ready();
      const docs = await start(
        startBody({ aiPass: true, folders: [{ key: 'k1', parentKey: null, name: 'Docs' }] }),
      );
      const folderId = docs.folders[0]?.id ?? '';
      await send(docs.id, [
        item('https://tidy.example/unsorted'),
        item('https://tidy.example/filed', { folderId }),
      ]);
      await finish(docs.id);
      await deferrer.flush();
      return { docs, folderId };
    };

    it('lists the import links in any folder; without it only Unsorted', async () => {
      const { docs, folderId } = await run();
      const scoped = (await a.get(`${AI_ENDPOINT.Tidy}?import=${docs.id}`).expect(200))
        .body as TidyListResponse;
      expect(scoped.items.map((entry) => entry.link.url).sort()).toEqual([
        'https://tidy.example/filed',
        'https://tidy.example/unsorted',
      ]);
      const filed = scoped.items.find((entry) => entry.link.url.endsWith('/filed'));
      expect(filed?.link.folderId).toBe(folderId);
      // A link already in a folder shows tag suggestions only: apply never moves it.
      expect(filed?.suggestions.length).toBeGreaterThan(0);
      expect(filed?.suggestions.every((suggestion) => suggestion.kind !== 'folder')).toBe(true);
      const plain = (await a.get(AI_ENDPOINT.Tidy).expect(200)).body as TidyListResponse;
      expect(plain.items.map((entry) => entry.link.url)).toEqual(['https://tidy.example/unsorted']);
      const count = (await a.get(`${AI_ENDPOINT.TidyCount}?import=${docs.id}`).expect(200))
        .body as TidyCountResponse;
      expect(count.total).toBe(2);
    });

    it('applies a tag suggestion of a filed link and leaves its folder alone', async () => {
      const { docs, folderId } = await run();
      const scoped = (await a.get(`${AI_ENDPOINT.Tidy}?import=${docs.id}`).expect(200))
        .body as TidyListResponse;
      const filed = scoped.items.find((entry) => entry.link.folderId === folderId);
      const suggestion = filed?.suggestions[0];
      expect(suggestion).toBeDefined();
      const applied = await a
        .post(AI_ENDPOINT.TidyApply)
        .send({
          items: [{ linkId: filed?.link.id, suggestionIds: [suggestion?.id] }],
        })
        .expect(200);
      expect(applied.body).toMatchObject({ applied: 1, folders: 0 });
      expect(
        (await t.db.prisma.link.findUniqueOrThrow({ where: { id: filed?.link.id ?? '' } }))
          .folderId,
      ).toBe(folderId);
    });

    it("lists nothing for another user's or an unknown import, and refuses a bad id", async () => {
      const { docs } = await run();
      await turnOn({}, b);
      const foreign = (await b.get(`${AI_ENDPOINT.Tidy}?import=${docs.id}`).expect(200))
        .body as TidyListResponse;
      expect(foreign).toEqual({ items: [], total: 0 });
      const unknown = (await a.get(`${AI_ENDPOINT.Tidy}?import=${randomUUID()}`).expect(200))
        .body as TidyListResponse;
      expect(unknown).toEqual({ items: [], total: 0 });
      expect(
        (
          (await b.get(`${AI_ENDPOINT.TidyCount}?import=${docs.id}`).expect(200))
            .body as TidyCountResponse
        ).total,
      ).toBe(0);
      await a.get(`${AI_ENDPOINT.Tidy}?import=nope`).expect(400);
      await a.get(`${AI_ENDPOINT.TidyCount}?import=nope`).expect(400);
    });
  });
});
