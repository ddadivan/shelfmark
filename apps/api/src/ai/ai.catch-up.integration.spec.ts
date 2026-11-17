import { randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  AI_ENDPOINT,
  AI_ERROR_MESSAGE,
  type AiBackfillStatus,
  type AiTickResponse,
  type FolderResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { CRON_ENV } from '../demo/models/cron-env.const';
import { AiBackgroundService } from './background/ai-background.service';
import { AiCatchUpService } from './catch-up/ai-catch-up.service';
import { AiExcerptService } from './excerpt/ai-excerpt.service';
import { AI_ENV } from './models/ai-env.const';
import type { LinkBatchRequest } from './models/link-batch-request.interface';
import { MockAiProvider } from './providers/mock-ai.provider';

const SECRET = randomBytes(24).toString('hex');
const PAGE = { excerpt: 'Visible page text', description: 'From the page' };
const OLD = new Date(Date.now() - 7 * 86_400_000);

describe('AI tick, sweep and backfill', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const deferrer = new AwaitableDeferrer();
  const excerpts = { load: vi.fn(() => Promise.resolve(PAGE)) };

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined, [CRON_ENV.Secret]: SECRET },
      overrides: [
        { provide: AiBackgroundService, useValue: deferrer },
        { provide: AiExcerptService, useValue: excerpts },
      ],
    });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    process.env[CRON_ENV.Secret] = SECRET;
    deferrer.clear();
    excerpts.load.mockClear();
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const turnOn = (settings: object = {}, agent: TestAgent = a) =>
    agent
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, ...settings })
      .expect(200);
  const save = async (body: object = {}, agent: TestAgent = a): Promise<LinkResponse> =>
    (
      await agent
        .post('/api/links')
        .send({ url: 'https://example.com/design', title: 'Design systems', ...body })
        .expect(201)
    ).body as LinkResponse;
  const jobsOf = (linkId: string) =>
    t.db.prisma.aiJob.findMany({ where: { linkId }, orderBy: { createdAt: 'asc' } });
  const age = (jobId: string, seconds: number) =>
    t.db.prisma.$executeRaw`
      UPDATE ai_jobs SET updated_at = now() - make_interval(secs => ${seconds}),
        created_at = now() - make_interval(secs => ${seconds})
      WHERE id = ${jobId}::uuid`;
  const tick = async (agent: TestAgent = a): Promise<AiTickResponse> =>
    (await agent.post(AI_ENDPOINT.Tick).expect(200)).body as AiTickResponse;
  /** A saved job whose deferred run was lost (the instance went away). */
  const lostJob = async (body: object = {}, agent: TestAgent = a): Promise<string> => {
    const link = await save(body, agent);
    deferrer.clear();
    return (await jobsOf(link.id))[0]?.id ?? '';
  };
  const sweep = (authorization?: string) => {
    const req = request(t.app.getHttpServer()).get(AI_ENDPOINT.Sweep);
    return authorization === undefined ? req : req.set('Authorization', authorization);
  };
  const aiPack = (userId = users.owner.userId) =>
    t.db.prisma.user.update({ where: { id: userId }, data: { aiPack: true } });
  /** Live links saved a week ago, before AI was turned on. */
  const oldLinks = async (count: number, userId = users.owner.userId, prefix = 'a') => {
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      ids.push(
        await seedLink(t.db.prisma, userId, {
          url: `https://${prefix}.example/design-${i}`,
          title: `Design ${prefix} ${i}`,
          createdAt: OLD,
        }),
      );
    }
    return ids;
  };
  const backfill = async (agent: TestAgent = a): Promise<AiBackfillStatus> =>
    (await agent.get(AI_ENDPOINT.Backfill).expect(200)).body as AiBackfillStatus;
  const settingsRow = (userId = users.owner.userId) =>
    t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId } });

  describe('POST /api/ai/tick', () => {
    it('answers the progress now and runs stale jobs after the response', async () => {
      await turnOn();
      const jobId = await lostJob();
      await age(jobId, 60);
      const answer = await tick();
      expect(answer).toEqual({
        pendingJobs: 1,
        backfill: { state: 'idle', eligible: 0, total: 0, done: 0, estimatedMinutes: null },
      });
      await deferrer.flush();
      expect((await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: jobId } })).status).toBe(
        'done',
      );
      expect((await tick()).pendingJobs).toBe(0);
    });

    it('leaves fresh jobs, unattached drafts and due-later retries alone', async () => {
      await turnOn();
      const fresh = await lostJob();
      const retry = await lostJob({ url: 'https://example.com/retry' });
      await t.db.prisma.aiJob.update({
        where: { id: retry },
        data: { notBefore: new Date(Date.now() + 60_000) },
      });
      await age(retry, 120);
      await a
        .post(AI_ENDPOINT.Drafts)
        .send({ draftId: randomUUID(), url: 'https://example.com/draft' })
        .expect(202);
      deferrer.clear();
      const draft = await t.db.prisma.aiJob.findFirstOrThrow({ where: { source: 'draft' } });
      await age(draft.id, 120);
      await tick();
      await deferrer.flush();
      const statuses = await t.db.prisma.aiJob.findMany({ select: { id: true, status: true } });
      expect(statuses.every((job) => job.status === 'pending')).toBe(true);
      expect([fresh, retry, draft.id].sort()).toEqual(statuses.map((job) => job.id).sort());
    });

    it('re-runs a job whose lease expired', async () => {
      await turnOn();
      const jobId = await lostJob();
      await t.db.prisma.aiJob.update({
        where: { id: jobId },
        data: { status: 'running', attempts: 1, leaseUntil: new Date(Date.now() - 1000) },
      });
      await tick();
      await deferrer.flush();
      expect(await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: jobId } })).toMatchObject({
        status: 'done',
        attempts: 2,
      });
    });

    it("never runs another user's jobs", async () => {
      await turnOn();
      await turnOn({}, b);
      const jobId = await lostJob();
      await age(jobId, 60);
      expect((await tick(b)).pendingJobs).toBe(0);
      await deferrer.flush();
      expect((await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: jobId } })).status).toBe(
        'pending',
      );
    });

    it('starts nothing once the budget is spent', async () => {
      await turnOn();
      const jobId = await lostJob();
      await age(jobId, 60);
      const run = vi.spyOn(MockAiProvider.prototype, 'runLinkJob');
      await t.app.get(AiCatchUpService).catchUp(users.owner.userId, Date.now() - 1);
      expect(run).not.toHaveBeenCalled();
      expect((await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: jobId } })).status).toBe(
        'pending',
      );
    });

    it('needs a session', async () => {
      await anonymous(t.app).post(AI_ENDPOINT.Tick).expect(401);
    });
  });

  describe('GET /api/cron/ai-sweep', () => {
    it('answers 401 without, with a wrong or with a short secret', async () => {
      await sweep().expect(401);
      await sweep('Bearer wrong').expect(401);
      await sweep(`Basic ${SECRET}`).expect(401);
      process.env[CRON_ENV.Secret] = 'short';
      await sweep('Bearer short').expect(401);
    });

    it('fails used-up jobs, deletes old drafts and catches up every user with work', async () => {
      await turnOn();
      await turnOn({}, b);
      const used = await lostJob({ url: 'https://example.com/used' });
      await t.db.prisma.aiJob.update({ where: { id: used }, data: { attempts: 3 } });
      const killed = await lostJob({ url: 'https://example.com/killed' });
      await t.db.prisma.aiJob.update({
        where: { id: killed },
        data: { status: 'running', attempts: 3, leaseUntil: new Date(Date.now() - 1000) },
      });
      const stale = await lostJob({}, b);
      await age(stale, 60);
      for (const draftId of [randomUUID(), randomUUID()]) {
        await a
          .post(AI_ENDPOINT.Drafts)
          .send({ draftId, url: 'https://example.com/draft' })
          .expect(202);
      }
      deferrer.clear();
      const [oldDraft] = await t.db.prisma.aiJob.findMany({ where: { source: 'draft' } });
      await t.db.prisma.$executeRaw`
        UPDATE ai_jobs SET created_at = now() - interval '25 hours' WHERE id = ${oldDraft?.id}::uuid`;

      const res = await sweep(`Bearer ${SECRET}`).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toEqual({ failed: 2, deletedDrafts: 1, users: 1 });
      expect(await t.db.prisma.aiJob.count({ where: { source: 'draft' } })).toBe(1);
      const failed = await t.db.prisma.aiJob.findMany({
        where: { id: { in: [used, killed] } },
        include: { link: { select: { aiStatus: true } } },
      });
      expect(failed.map((job) => [job.status, job.reason, job.link?.aiStatus])).toEqual([
        ['failed', 'unavailable', 'failed'],
        ['failed', 'unavailable', 'failed'],
      ]);

      await deferrer.flush();
      expect((await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: stale } })).status).toBe(
        'done',
      );
    });

    it('stops starting users once its budget is spent', async () => {
      await turnOn();
      const stale = await lostJob();
      await age(stale, 60);
      await sweep(`Bearer ${SECRET}`).expect(200);
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);
      await deferrer.flush();
      vi.mocked(Date.now).mockRestore();
      expect((await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: stale } })).status).toBe(
        'pending',
      );
    });
  });

  describe('/api/ai/backfill', () => {
    it('is refused without the AI pack, while AI is off and while a run is in progress', async () => {
      await turnOn();
      const free = await a.post(AI_ENDPOINT.Backfill).expect(409);
      expect(free.body.message).toBe(AI_ERROR_MESSAGE.BackfillNotIncluded);
      await aiPack();
      await a.patch(AI_ENDPOINT.Settings).send({ enabled: false }).expect(200);
      expect((await a.post(AI_ENDPOINT.Backfill).expect(409)).body.message).toBe(
        AI_ERROR_MESSAGE.AiOff,
      );
      await turnOn();
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillState: 'running' },
      });
      expect((await a.post(AI_ENDPOINT.Backfill).expect(409)).body.message).toBe(
        AI_ERROR_MESSAGE.BackfillRunning,
      );
    });

    it("processes the user's old links in one batch, never auto-applies, and never touches another user's links", async () => {
      const ownLinks = await oldLinks(3);
      const otherLinks = await oldLinks(2, users.intruder.userId, 'b');
      await turnOn({ folderMode: 'auto', tagsMode: 'auto' });
      await turnOn({}, b);
      await aiPack();
      await aiPack(users.intruder.userId);
      const design = (
        (await a.post('/api/folders').send({ name: 'Design' }).expect(201)).body as FolderResponse
      ).id;
      const submitted: LinkBatchRequest[][] = [];
      const original = MockAiProvider.prototype.submitLinkBatch;
      vi.spyOn(MockAiProvider.prototype, 'submitLinkBatch').mockImplementation(function (
        this: MockAiProvider,
        requests,
      ) {
        submitted.push([...requests]);
        return original.call(this, requests);
      });

      const started = (await a.post(AI_ENDPOINT.Backfill).expect(200)).body as AiBackfillStatus;
      expect(started).toMatchObject({ state: 'running', eligible: 3, total: 3, done: 0 });
      await deferrer.flush();

      expect(submitted).toHaveLength(1);
      const urls = submitted.flat().map((entry) => entry.input.url);
      expect(urls.every((url) => url.startsWith('https://a.example/'))).toBe(true);
      const links = await t.db.prisma.link.findMany({
        where: { id: { in: ownLinks } },
        include: { tags: true },
      });
      for (const link of links) {
        expect(link).toMatchObject({ summarySource: 'ai', aiStatus: 'done', folderId: null });
        expect(link.tags).toEqual([]);
      }
      const states = await t.db.prisma.linkSuggestion.findMany({
        where: { linkId: { in: ownLinks }, kind: 'folder' },
      });
      expect(states.map((s) => [s.folderId, s.state])).toEqual(
        ownLinks.map(() => [design, 'suggested']),
      );
      expect(
        await t.db.prisma.aiBatch.findMany({ select: { status: true, requestCount: true } }),
      ).toEqual([{ status: 'ended', requestCount: 3 }]);
      expect(
        await t.db.prisma.aiJob.findMany({
          where: { source: 'backfill' },
          select: { result: true },
        }),
      ).toEqual(ownLinks.map(() => ({ result: null })));
      expect(await settingsRow()).toMatchObject({ backfillUsed: 3, backfillDone: 3 });
      expect(await backfill()).toMatchObject({ state: 'done', total: 3, done: 3, eligible: 0 });

      // The other user's links and backfill are untouched.
      expect(
        await t.db.prisma.link.count({ where: { id: { in: otherLinks }, summary: { not: null } } }),
      ).toBe(0);
      expect(await backfill(b)).toMatchObject({ state: 'idle', eligible: 2 });
    });

    it('submits chunks of 40 and stops at the one-time allowance', async () => {
      await oldLinks(45);
      await turnOn({ tagsMode: 'off', folderMode: 'off' });
      await aiPack();
      const submit = vi.spyOn(MockAiProvider.prototype, 'submitLinkBatch');
      await a.post(AI_ENDPOINT.Backfill).expect(200);
      await deferrer.flush();
      expect(submit.mock.calls.map((call) => call[0].length)).toEqual([40, 5]);
      expect(await backfill()).toMatchObject({ state: 'done', done: 45 });

      await t.db.prisma.link.updateMany({
        data: { summary: null, summarySource: null, aiStatus: null },
      });
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillUsed: 4_998 },
      });
      submit.mockClear();
      expect((await a.post(AI_ENDPOINT.Backfill).expect(200)).body).toMatchObject({ total: 2 });
      await deferrer.flush();
      expect(submit.mock.calls.map((call) => call[0].length)).toEqual([2]);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 5_000, backfillState: 'done' });
      expect((await a.post(AI_ENDPOINT.Backfill).expect(200)).body).toMatchObject({
        state: 'done',
        total: 0,
      });
    });

    it('polls a batch the provider answers later and applies its items by folder keys', async () => {
      const [first, second, third] = await oldLinks(3);
      await turnOn();
      await aiPack();
      await a.post('/api/folders').send({ name: 'Design' }).expect(201);
      vi.spyOn(MockAiProvider.prototype, 'submitLinkBatch').mockResolvedValue({
        providerBatchId: 'mock-later',
        completed: null,
      });
      await a.post(AI_ENDPOINT.Backfill).expect(200);
      await deferrer.flush();
      expect(await backfill()).toMatchObject({ state: 'running', done: 0 });
      const jobs = await t.db.prisma.aiJob.findMany({ where: { source: 'backfill' } });
      const jobOf = (linkId: string | undefined) =>
        jobs.find((job) => job.linkId === linkId)?.id ?? '';
      // A folder created meanwhile shifts nothing: the stored keys still map to the old folder.
      await a.post('/api/folders').send({ name: 'Archive' }).expect(201);
      vi.spyOn(MockAiProvider.prototype, 'readLinkBatchResults').mockResolvedValue([
        {
          customId: jobOf(first),
          outcome: {
            type: 'output',
            output: { tags: [], newTag: null, folder: 'f1', summary: 'Polled.', kind: null },
          },
        },
        { customId: jobOf(second), outcome: { type: 'refusal' } },
        { customId: 'not-a-job', outcome: { type: 'refusal' } },
      ]);
      await tick();
      await deferrer.flush();
      const rows = await t.db.prisma.aiJob.findMany({
        where: { source: 'backfill' },
        select: { linkId: true, status: true, reason: true },
      });
      const byLink = new Map(rows.map((row) => [row.linkId, [row.status, row.reason]]));
      expect(byLink.get(first)).toEqual(['done', null]);
      expect(byLink.get(second)).toEqual(['failed', 'rejected']);
      expect(byLink.get(third)).toEqual(['failed', 'unavailable']);
      const suggestion = await t.db.prisma.linkSuggestion.findFirstOrThrow({
        where: { linkId: first },
        include: { folder: true },
      });
      expect(suggestion.folder?.name).toBe('Design');
      expect(await settingsRow()).toMatchObject({
        backfillUsed: 2,
        backfillDone: 3,
        backfillState: 'done',
      });
    });

    it('stops a run, cancels the open batch and gives back the allowance', async () => {
      await oldLinks(2);
      await turnOn();
      await aiPack();
      vi.spyOn(MockAiProvider.prototype, 'submitLinkBatch').mockResolvedValue({
        providerBatchId: 'mock-open',
        completed: null,
      });
      const cancel = vi.spyOn(MockAiProvider.prototype, 'cancelLinkBatch');
      await a.post(AI_ENDPOINT.Backfill).expect(200);
      await deferrer.flush();
      const stopped = (await a.delete(AI_ENDPOINT.Backfill).expect(200)).body as AiBackfillStatus;
      expect(stopped.state).toBe('stopped');
      expect(cancel).toHaveBeenCalledWith('mock-open');
      expect(await t.db.prisma.aiBatch.findFirstOrThrow()).toMatchObject({ status: 'canceled' });
      expect(await t.db.prisma.aiJob.findMany({ select: { status: true, reason: true } })).toEqual([
        { status: 'skipped', reason: 'off' },
        { status: 'skipped', reason: 'off' },
      ]);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0 });
      // Idempotent, and the links can be processed again.
      await a.delete(AI_ENDPOINT.Backfill).expect(200);
      expect((await backfill()).eligible).toBe(2);
    });

    it('fails a real batch when the real provider is not available, never using the mock', async () => {
      const [linkId] = await oldLinks(1);
      await turnOn();
      const batch = await t.db.prisma.aiBatch.create({
        data: {
          userId: users.owner.userId,
          provider: 'anthropic',
          providerBatchId: 'msgbatch_test',
          requestCount: 1,
        },
      });
      const job = await t.db.prisma.aiJob.create({
        data: {
          userId: users.owner.userId,
          linkId: linkId ?? '',
          source: 'backfill',
          status: 'running',
          attempts: 1,
          parts: ['summary'],
          language: 'en',
          batchId: batch.id,
        },
      });
      const read = vi.spyOn(MockAiProvider.prototype, 'readLinkBatchResults');
      await tick();
      await deferrer.flush();
      expect(read).not.toHaveBeenCalled();
      expect(
        await t.db.prisma.aiBatch.findUniqueOrThrow({ where: { id: batch.id } }),
      ).toMatchObject({ status: 'ended' });
      expect(await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({
        status: 'failed',
        reason: 'unavailable',
      });
    });

    it('fails and refunds a chunk the provider does not accept, and refunds error items', async () => {
      await oldLinks(2);
      await turnOn();
      await aiPack();
      vi.spyOn(MockAiProvider.prototype, 'submitLinkBatch').mockRejectedValueOnce(
        new Error('down'),
      );
      await a.post(AI_ENDPOINT.Backfill).expect(200);
      await deferrer.flush();
      expect(await t.db.prisma.aiJob.findMany({ select: { status: true } })).toEqual([
        { status: 'failed' },
        { status: 'failed' },
      ]);
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, backfillDone: 2 });

      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillState: 'idle' },
      });
      await t.db.prisma.link.updateMany({ data: { url: 'https://a.example/ai-fail' } });
      await a.post(AI_ENDPOINT.Backfill).expect(200);
      await deferrer.flush();
      expect(await settingsRow()).toMatchObject({ backfillUsed: 0, backfillState: 'done' });
    });

    it('reads pages only while previews are on', async () => {
      await oldLinks(1);
      await turnOn();
      await aiPack();
      await a.patch('/api/me/settings').send({ fetchPreviews: false }).expect(200);
      await a.post(AI_ENDPOINT.Backfill).expect(200);
      await deferrer.flush();
      expect(excerpts.load).not.toHaveBeenCalled();
    });
  });
});
