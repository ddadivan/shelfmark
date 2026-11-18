import { AI_ENDPOINT, AI_ERROR_MESSAGE, type AiSettingsResponse } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { AI_ENV } from './models/ai-env.const';
import { MockAiProvider } from './providers/mock-ai.provider';

const BASE = AI_ENDPOINT.Settings;

describe('AI settings API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({ env: { [AI_ENV.FullAccessEmails]: undefined } });
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    delete process.env[AI_ENV.FullAccessEmails];
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const get = async (agent: TestAgent = a): Promise<AiSettingsResponse> =>
    (await agent.get(BASE).expect(200)).body as AiSettingsResponse;
  const patch = async (body: object, agent: TestAgent = a): Promise<AiSettingsResponse> =>
    (await agent.patch(BASE).send(body).expect(200)).body as AiSettingsResponse;
  const job = (
    userId: string,
    data: { linkId?: string; status?: string; reason?: string | null; updatedAt?: Date },
  ) =>
    t.db.prisma.aiJob.create({
      data: {
        userId,
        linkId: data.linkId ?? null,
        source: data.linkId ? 'save' : 'draft',
        status: data.status ?? 'pending',
        reason: data.reason ?? null,
        parts: ['summary'],
        language: 'en',
        ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
      },
    });

  it('is closed to anonymous callers', async () => {
    await anonymous(t.app).get(BASE).expect(401);
    await anonymous(t.app).patch(BASE).send({ enabled: true }).expect(401);
  });

  it('answers the defaults with AI off for a new account', async () => {
    expect(await get()).toEqual({
      settings: {
        enabled: false,
        folderMode: 'suggest',
        tagsMode: 'suggest',
        summaries: true,
        includeNotes: false,
        summaryLanguage: 'app',
        meaningSearch: true,
        ask: true,
      },
      introSeen: false,
      announcementSeen: false,
      entitlements: { plan: 'free', aiTier: 'free' },
      usage: {
        linksUsed: 0,
        linksLimit: 50,
        resetsOn: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        backfillUsed: 0,
        backfillLimit: 0,
      },
      providerStatus: 'ok',
      pendingJobs: 0,
      backfill: { state: 'idle', eligible: 0, total: 0, done: 0, estimatedMinutes: null },
      search: { state: 'off', ready: 0, total: 0 },
      ask: {
        available: false,
        allowance: {
          questionsLeft: 5,
          period: 'month',
          resetsOn: expect.stringMatching(/^\d{4}-\d{2}-01$/),
        },
      },
    });
    expect(await t.db.prisma.aiSettings.count()).toBe(0);
  });

  it('records the intro and the first enable once', async () => {
    const on = await patch({ enabled: true });
    expect(on.settings.enabled).toBe(true);
    expect(on.introSeen).toBe(true);
    const first = await t.db.prisma.aiSettings.findUniqueOrThrow({
      where: { userId: users.owner.userId },
    });
    expect(first.enabledAt).not.toBeNull();
    await patch({ enabled: false });
    const again = await patch({ enabled: true, folderMode: 'auto', summaryLanguage: 'de' });
    expect(again.settings).toMatchObject({
      enabled: true,
      folderMode: 'auto',
      summaryLanguage: 'de',
    });
    const second = await t.db.prisma.aiSettings.findUniqueOrThrow({
      where: { userId: users.owner.userId },
    });
    expect(second.enabledAt).toEqual(first.enabledAt);
    expect(second.introSeenAt).toEqual(first.introSeenAt);
  });

  it('records that the AI announcement was seen, once, without turning AI on (#507)', async () => {
    const seen = await patch({ announcementSeen: true });
    expect(seen.announcementSeen).toBe(true);
    expect(seen.settings.enabled).toBe(false);
    const first = await t.db.prisma.aiSettings.findUniqueOrThrow({
      where: { userId: users.owner.userId },
    });
    expect(first.announcementSeenAt).not.toBeNull();
    await patch({ announcementSeen: true });
    const second = await t.db.prisma.aiSettings.findUniqueOrThrow({
      where: { userId: users.owner.userId },
    });
    expect(second.announcementSeenAt).toEqual(first.announcementSeenAt);
    // Only the owner's row changed; another user still has not seen it.
    const other = await t.db.prisma.aiSettings.findUnique({
      where: { userId: users.intruder.userId },
    });
    expect(other?.announcementSeenAt ?? null).toBeNull();
  });

  it('rejects announcementSeen: false', async () => {
    await a.patch(BASE).send({ announcementSeen: false }).expect(400);
  });

  it('changes single fields without turning AI on', async () => {
    const changed = await patch({ tagsMode: 'off', summaries: false, includeNotes: true });
    expect(changed.settings).toEqual({
      enabled: false,
      folderMode: 'suggest',
      tagsMode: 'off',
      summaries: false,
      includeNotes: true,
      summaryLanguage: 'app',
      meaningSearch: true,
      ask: true,
    });
    expect(changed.introSeen).toBe(false);
  });

  it('switches Ask your shelf, available only while AI is on too (AI-4)', async () => {
    const on = await patch({ enabled: true });
    expect(on.settings.ask).toBe(true);
    expect(on.ask.available).toBe(true);
    const off = await patch({ ask: false });
    expect(off.settings.ask).toBe(false);
    expect(off.ask.available).toBe(false);
    const back = await patch({ ask: true, enabled: false });
    expect(back.ask.available).toBe(false);
    await a.patch(BASE).send({ ask: null }).expect(400);
    await a.patch(BASE).send({ ask: 'yes' }).expect(400);
  });

  it('refuses an empty body, unknown fields, nulls and values outside the allow-lists', async () => {
    const empty = await a.patch(BASE).send({}).expect(400);
    expect(empty.body.message).toBe(AI_ERROR_MESSAGE.NothingToUpdate);
    for (const body of [
      { enabled: 'yes' },
      { enabled: null },
      { folderMode: 'always' },
      { tagsMode: null },
      { summaryLanguage: 'browser' },
      { summaryLanguage: 'xx' },
      { introSeen: true },
      { plan: 'pro' },
    ]) {
      await a.patch(BASE).send(body).expect(400);
    }
    expect(await t.db.prisma.aiSettings.count()).toBe(0);
  });

  it('computes entitlements per request from AI_FULL_ACCESS_EMAILS and never stores them', async () => {
    process.env[AI_ENV.FullAccessEmails] = 'someone@example.com, OWNER@example.com';
    const full = await get();
    expect(full.entitlements).toEqual({ plan: 'pro', aiTier: 'ai-pack' });
    expect(full.usage).toMatchObject({ linksLimit: 1000, backfillLimit: 5000 });
    expect((await get(b)).entitlements).toEqual({ plan: 'free', aiTier: 'free' });
    const account = await t.db.prisma.user.findUniqueOrThrow({ where: { id: users.owner.userId } });
    expect(account).toMatchObject({ plan: 'free', aiPack: false });
    delete process.env[AI_ENV.FullAccessEmails];
    expect((await get()).entitlements).toEqual({ plan: 'free', aiTier: 'free' });
  });

  it('ignores AI_FULL_ACCESS_EMAILS for an unverified or demo account', async () => {
    process.env[AI_ENV.FullAccessEmails] = 'owner@example.com';
    await t.db.prisma.user.update({
      where: { id: users.owner.userId },
      data: { emailVerified: false },
    });
    expect((await get()).entitlements).toEqual({ plan: 'free', aiTier: 'free' });
    await t.db.prisma.user.update({
      where: { id: users.owner.userId },
      data: { emailVerified: true, isDemo: true, demoExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    expect((await get()).entitlements).toEqual({ plan: 'free', aiTier: 'free' });
  });

  it('reads the stored AI pack and the month usage', async () => {
    await t.db.prisma.user.update({ where: { id: users.owner.userId }, data: { aiPack: true } });
    const now = new Date();
    await t.db.prisma.aiUsage.create({
      data: {
        userId: users.owner.userId,
        month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        links: 7,
      },
    });
    const response = await get();
    expect(response.entitlements.aiTier).toBe('ai-pack');
    expect(response.usage).toMatchObject({ linksUsed: 7, linksLimit: 1000 });
    expect((await get(b)).usage.linksUsed).toBe(0);
  });

  it('reports pending jobs, eligible links and the provider status per user', async () => {
    const linkId = await seedLink(t.db.prisma, users.owner.userId);
    await seedLink(t.db.prisma, users.owner.userId);
    await job(users.owner.userId, { linkId });
    await job(users.owner.userId, { status: 'running' });
    await job(users.owner.userId, { status: 'failed', reason: 'unavailable' });
    const response = await get();
    expect(response.pendingJobs).toBe(2);
    expect(response.providerStatus).toBe('unavailable');
    expect(response.backfill).toMatchObject({ state: 'idle', eligible: 2, estimatedMinutes: 1 });
    const other = await get(b);
    expect(other).toMatchObject({ pendingJobs: 0, providerStatus: 'ok' });
    expect(other.backfill.eligible).toBe(0);
  });

  it('clears the unavailable status after a success or once the window passed', async () => {
    await job(users.owner.userId, {
      status: 'failed',
      reason: 'unavailable',
      updatedAt: new Date(Date.now() - 20 * 60_000),
    });
    expect((await get()).providerStatus).toBe('ok');
    await job(users.owner.userId, { status: 'pending', reason: 'unavailable' });
    expect((await get()).providerStatus).toBe('unavailable');
    await job(users.owner.userId, { status: 'done' });
    expect((await get()).providerStatus).toBe('ok');
  });

  it('turning AI off skips queued jobs, stops the backfill and cancels open batches of that user only', async () => {
    const cancel = vi.spyOn(MockAiProvider.prototype, 'cancelLinkBatch');
    await patch({ enabled: true });
    await patch({ enabled: true }, b);
    const ownerLink = await seedLink(t.db.prisma, users.owner.userId);
    const otherLink = await seedLink(t.db.prisma, users.intruder.userId);
    await t.db.prisma.link.updateMany({ data: { aiStatus: 'pending' } });
    const queued = await job(users.owner.userId, { linkId: ownerLink });
    const running = await job(users.owner.userId, { status: 'running' });
    const done = await job(users.owner.userId, { status: 'done' });
    const foreign = await job(users.intruder.userId, { linkId: otherLink });
    await t.db.prisma.aiSettings.update({
      where: { userId: users.owner.userId },
      data: { backfillState: 'running', backfillTotal: 10 },
    });
    await t.db.prisma.aiBatch.createMany({
      data: [
        {
          userId: users.owner.userId,
          provider: 'mock',
          providerBatchId: 'mock-batch-a',
          requestCount: 2,
        },
        {
          userId: users.intruder.userId,
          provider: 'mock',
          providerBatchId: 'mock-batch-b',
          requestCount: 2,
        },
      ],
    });

    const off = await patch({ enabled: false });
    expect(off.settings.enabled).toBe(false);
    expect(off.pendingJobs).toBe(0);
    expect(off.backfill.state).toBe('stopped');
    const statuses = await t.db.prisma.aiJob.findMany({
      select: { id: true, status: true, reason: true },
    });
    const byId = new Map(statuses.map((row) => [row.id, row]));
    expect(byId.get(queued.id)).toMatchObject({ status: 'skipped', reason: 'off' });
    expect(byId.get(running.id)).toMatchObject({ status: 'skipped', reason: 'off' });
    expect(byId.get(done.id)).toMatchObject({ status: 'done', reason: null });
    expect(byId.get(foreign.id)).toMatchObject({ status: 'pending' });
    const links = await t.db.prisma.link.findMany({ select: { id: true, aiStatus: true } });
    expect(links.find((row) => row.id === ownerLink)?.aiStatus).toBe('skipped');
    expect(links.find((row) => row.id === otherLink)?.aiStatus).toBe('pending');
    const batches = await t.db.prisma.aiBatch.findMany({ orderBy: { providerBatchId: 'asc' } });
    expect(batches.map((row) => row.status)).toEqual(['canceled', 'submitted']);
    expect(cancel).toHaveBeenCalledExactlyOnceWith('mock-batch-a');
    expect((await get(b)).pendingJobs).toBe(1);
  });

  it('keeps answering when the provider cannot cancel a batch', async () => {
    vi.spyOn(MockAiProvider.prototype, 'cancelLinkBatch').mockRejectedValue(new Error('down'));
    await patch({ enabled: true });
    await t.db.prisma.aiBatch.create({
      data: {
        userId: users.owner.userId,
        provider: 'mock',
        providerBatchId: 'mock-batch-c',
        requestCount: 1,
      },
    });
    const off = await patch({ enabled: false });
    expect(off.settings.enabled).toBe(false);
  });

  it("never changes the other user's settings", async () => {
    await patch({ enabled: true, tagsMode: 'auto' });
    const other = await get(b);
    expect(other.settings).toMatchObject({ enabled: false, tagsMode: 'suggest' });
    expect(other.introSeen).toBe(false);
    await patch({ enabled: false }, b);
    expect((await get()).settings).toMatchObject({ enabled: true, tagsMode: 'auto' });
  });
});
