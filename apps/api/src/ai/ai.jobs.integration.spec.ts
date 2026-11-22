import { randomUUID } from 'node:crypto';
import {
  AI_ENDPOINT,
  AI_ERROR_MESSAGE,
  type AiJobResponse,
  type CreateLinksBatchResponse,
  type FolderResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import { AiApplyService } from './apply/ai-apply.service';
import { AiBackgroundService } from './background/ai-background.service';
import { AiExcerptService } from './excerpt/ai-excerpt.service';
import { AI_ENV } from './models/ai-env.const';
import type { LinkJobInput } from './models/link-job-input.interface';
import { MockAiProvider } from './providers/mock-ai.provider';
import { AiRunnerService } from './runner/ai-runner.service';

const PAGE = { excerpt: 'Visible page text', description: 'From the page' };

describe('AI link jobs', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const deferrer = new AwaitableDeferrer();
  const excerpts = { load: vi.fn(() => Promise.resolve(PAGE)) };

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined },
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
      // Search by meaning has its own specs (ai.embeddings.integration.spec.ts).
      .send({ enabled: true, meaningSearch: false, ...settings })
      .expect(200);
  const folder = async (name: string, agent: TestAgent = a): Promise<string> =>
    ((await agent.post('/api/folders').send({ name }).expect(201)).body as FolderResponse).id;
  const tag = (name: string, userId = users.owner.userId) =>
    seedLink(t.db.prisma, userId, { title: `Tagged ${name}`, tags: [name] });
  const save = async (body: object, agent: TestAgent = a): Promise<LinkResponse> =>
    (
      await agent
        .post('/api/links')
        .send({ url: 'https://example.com/design', title: 'Design systems', ...body })
        .expect(201)
    ).body as LinkResponse;
  const link = (id: string) =>
    t.db.prisma.link.findUniqueOrThrow({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
  const jobsOf = (linkId: string) =>
    t.db.prisma.aiJob.findMany({ where: { linkId }, orderBy: { createdAt: 'asc' } });
  const suggestions = (linkId: string) =>
    t.db.prisma.linkSuggestion.findMany({
      where: { linkId },
      orderBy: [{ kind: 'asc' }, { tagName: 'asc' }],
      select: { kind: true, tagName: true, folderId: true, state: true },
    });
  const captureInputs = (): LinkJobInput[] => {
    const inputs: LinkJobInput[] = [];
    const original = MockAiProvider.prototype.runLinkJob;
    vi.spyOn(MockAiProvider.prototype, 'runLinkJob').mockImplementation(function (
      this: MockAiProvider,
      input,
    ) {
      inputs.push(input);
      return original.call(this, input);
    });
    return inputs;
  };
  const draft = async (body: object, agent: TestAgent = a): Promise<AiJobResponse> =>
    (
      await agent
        .post(AI_ENDPOINT.Drafts)
        .send({ url: 'https://example.com/design', title: 'Design systems', ...body })
        .expect(202)
    ).body as AiJobResponse;
  const job = async (id: string, agent: TestAgent = a): Promise<AiJobResponse> =>
    (await agent.get(AI_ENDPOINT.Job.replace(':id', id)).expect(200)).body as AiJobResponse;
  const monthUsage = async (userId = users.owner.userId): Promise<number> =>
    (await t.db.prisma.aiUsage.findFirst({ where: { userId } }))?.links ?? 0;
  const makeDue = (jobId: string) =>
    t.db.prisma.aiJob.update({
      where: { id: jobId },
      data: { notBefore: new Date(Date.now() - 1) },
    });

  describe('enqueue on save', () => {
    it('saves exactly as before while AI is off', async () => {
      const saved = await save({});
      expect(saved).toMatchObject({ aiStatus: null, summary: null, summarySource: null });
      expect(await t.db.prisma.aiJob.count()).toBe(0);
      expect(deferrer.size).toBe(0);
    });

    it('enqueues a job in the save, runs it after the response and writes summary and suggestions', async () => {
      await turnOn();
      const design = await folder('Design');
      await tag('design');
      const saved = await save({});
      expect(saved.aiStatus).toBe('pending');
      const [queued] = await jobsOf(saved.id);
      expect(queued).toMatchObject({
        source: 'save',
        status: 'pending',
        parts: ['tags', 'folder', 'summary'],
        language: 'en',
      });
      expect(deferrer.size).toBe(1);

      await deferrer.flush();
      const row = await link(saved.id);
      expect(row).toMatchObject({
        summary: 'A page about Design systems.',
        summarySource: 'ai',
        aiStatus: 'done',
        folderId: null,
        kind: 'other',
      });
      expect(row.tags).toEqual([]);
      expect(await suggestions(saved.id)).toEqual([
        { kind: 'folder', tagName: null, folderId: design, state: 'suggested' },
        { kind: 'new-tag', tagName: 'example', folderId: null, state: 'suggested' },
        { kind: 'tag', tagName: 'design', folderId: null, state: 'suggested' },
      ]);
      expect((await jobsOf(saved.id))[0]).toMatchObject({
        status: 'done',
        reason: null,
        attempts: 1,
      });
      const read = (await a.get(`/api/links/${saved.id}`).expect(200)).body as LinkResponse;
      expect(read).toMatchObject({ summarySource: 'ai', aiStatus: 'done' });
      const usage = await t.db.prisma.aiUsage.findFirstOrThrow({
        where: { userId: users.owner.userId },
      });
      expect(usage.links).toBe(1);
    });

    it('suggests two new tags and three more ideas for a link no tag fits, in both modes, never creating one', async () => {
      for (const tagsMode of ['suggest', 'auto'] as const) {
        await turnOn({ tagsMode });
        const saved = await save({
          url: `https://comedy.example/${tagsMode}`,
          title: 'Stand-up special about airports',
        });
        await deferrer.flush();
        const rows = await t.db.prisma.linkSuggestion.findMany({
          where: { linkId: saved.id },
          orderBy: { createdAt: 'asc' },
          select: { kind: true, tagName: true, more: true, state: true },
        });
        expect(rows.filter((row) => row.kind === 'tag')).toEqual([]);
        // The best two are primary; the rest are "more" chips; none is applied, even in Automatic.
        const byName = new Map(rows.map((row) => [row.tagName, row]));
        expect([...byName.keys()].sort()).toEqual([
          'about',
          'airports',
          'comedy',
          'special',
          'stand',
        ]);
        for (const [name, row] of byName) {
          expect(row).toMatchObject({
            kind: 'new-tag',
            state: 'suggested',
            more: !['comedy', 'stand'].includes(name ?? ''),
          });
        }
        const state = (await a.get(`/api/links/${saved.id}/ai`).expect(200)).body as {
          suggestions: { tagName: string; more?: boolean }[];
        };
        expect(state.suggestions.map((item) => item.tagName)).toEqual([
          'comedy',
          'stand',
          'special',
          'about',
          'airports',
        ]);
        expect(state.suggestions.filter((item) => item.more).length).toBe(3);
        expect((await link(saved.id)).tags).toEqual([]);
      }
      expect(await t.db.prisma.tag.count({ where: { userId: users.owner.userId } })).toBe(0);
    });

    it('asks only for what the save left open, and nothing when every part is off', async () => {
      await turnOn();
      const design = await folder('Design');
      const withFolder = await save({ folderId: design, tags: ['mine'] });
      expect((await jobsOf(withFolder.id))[0]?.parts).toEqual(['summary']);
      await a.post('/api/rules').send({ domain: 'rules.example', folderId: design }).expect(201);
      const ruled = await save({ url: 'https://rules.example/a' });
      expect((await jobsOf(ruled.id))[0]?.parts).toEqual(['tags', 'summary']);
      await turnOn({ tagsMode: 'off', folderMode: 'off', summaries: false });
      const none = await save({ url: 'https://example.com/none' });
      expect(none.aiStatus).toBeNull();
      expect(await jobsOf(none.id)).toEqual([]);
    });

    it('applies Automatic mode to what the user left empty: folder and existing tags, never the new tag', async () => {
      await turnOn({ folderMode: 'auto', tagsMode: 'auto' });
      const design = await folder('Design');
      await tag('design');
      const saved = await save({});
      await deferrer.flush();
      const row = await link(saved.id);
      expect(row.folderId).toBe(design);
      expect(row.tags.map((entry) => entry.tag.name)).toEqual(['design']);
      expect(await suggestions(saved.id)).toEqual([
        { kind: 'folder', tagName: null, folderId: design, state: 'auto-applied' },
        { kind: 'new-tag', tagName: 'example', folderId: null, state: 'suggested' },
        { kind: 'tag', tagName: 'design', folderId: null, state: 'auto-applied' },
      ]);
      expect(await t.db.prisma.tag.count({ where: { userId: users.owner.userId } })).toBe(1);
    });

    it('never overrides a choice the user made before the job finished', async () => {
      await turnOn({ folderMode: 'auto', tagsMode: 'auto' });
      const design = await folder('Design');
      const other = await folder('Elsewhere');
      await tag('design');
      const saved = await save({});
      await a
        .patch(`/api/links/${saved.id}`)
        .send({ folderId: other, tags: ['picked'], summary: undefined })
        .expect(200);
      await t.db.prisma.link.update({
        where: { id: saved.id },
        data: { summary: 'Mine', summarySource: 'user' },
      });
      await deferrer.flush();
      const row = await link(saved.id);
      expect(row).toMatchObject({ folderId: other, summary: 'Mine', summarySource: 'user' });
      expect(row.tags.map((entry) => entry.tag.name)).toEqual(['picked']);
      expect(await suggestions(saved.id)).toEqual([
        { kind: 'folder', tagName: null, folderId: design, state: 'suggested' },
        { kind: 'new-tag', tagName: 'example', folderId: null, state: 'suggested' },
        { kind: 'tag', tagName: 'design', folderId: null, state: 'suggested' },
      ]);
    });

    it('never brings back a dismissed or accepted suggestion and skips what the link already has', async () => {
      await turnOn();
      await tag('design');
      const saved = await save({});
      await deferrer.flush();
      await t.db.prisma.linkSuggestion.updateMany({
        where: { linkId: saved.id, kind: 'new-tag' },
        data: { state: 'dismissed' },
      });
      await t.db.prisma.link.update({
        where: { id: saved.id },
        data: { summary: null, summarySource: null },
      });
      await t.db.prisma.aiJob.create({
        data: {
          userId: users.owner.userId,
          linkId: saved.id,
          source: 'rewrite',
          parts: ['tags', 'summary'],
          language: 'en',
        },
      });
      const second = (await jobsOf(saved.id))[1];
      await t.app.get(AiRunnerService).run(second?.id ?? '', users.owner.userId);
      expect(await suggestions(saved.id)).toEqual([
        { kind: 'new-tag', tagName: 'example', folderId: null, state: 'dismissed' },
        { kind: 'tag', tagName: 'design', folderId: null, state: 'suggested' },
      ]);
      expect((await link(saved.id)).summary).toBe('A page about Design systems.');
    });

    it('marks a job that found nothing', async () => {
      await turnOn({ tagsMode: 'off', folderMode: 'off' });
      vi.spyOn(MockAiProvider.prototype, 'runLinkJob').mockResolvedValue({
        type: 'output',
        output: { tags: [], newTags: [], folder: null, summary: null, kind: null },
      });
      const saved = await save({});
      await deferrer.flush();
      expect((await jobsOf(saved.id))[0]).toMatchObject({
        status: 'done',
        reason: 'nothing-found',
      });
      expect((await link(saved.id)).aiStatus).toBe('done');
    });

    it('reads the page only while previews are on and sends the note only with the switch', async () => {
      const inputs = captureInputs();
      await turnOn();
      await save({ note: 'private note' });
      await deferrer.flush();
      expect(excerpts.load).toHaveBeenCalledOnce();
      expect(inputs[0]).toMatchObject({
        note: null,
        excerpt: PAGE.excerpt,
        description: PAGE.description,
      });

      await turnOn({ includeNotes: true });
      await a.patch('/api/me/settings').send({ fetchPreviews: false }).expect(200);
      await save({ url: 'https://example.com/2', note: 'private note' });
      await deferrer.flush();
      expect(excerpts.load).toHaveBeenCalledOnce();
      expect(inputs[1]).toMatchObject({ note: 'private note', excerpt: null, description: null });
    });

    it('writes the summary in the explicit language, else the interface language, else Accept-Language', async () => {
      await turnOn();
      const browser = await a
        .post('/api/links')
        .set('Accept-Language', 'nl, fr;q=0.9')
        .send({ url: 'https://example.com/a', title: 'A' })
        .expect(201);
      expect((await jobsOf((browser.body as LinkResponse).id))[0]?.language).toBe('fr');
      await a.patch('/api/me/settings').send({ language: 'it' }).expect(200);
      const ui = await save({ url: 'https://example.com/b' });
      expect((await jobsOf(ui.id))[0]?.language).toBe('it');
      await turnOn({ summaryLanguage: 'uk' });
      const fixed = await save({ url: 'https://example.com/c' });
      expect((await jobsOf(fixed.id))[0]?.language).toBe('uk');
    });

    it('skips a job past the monthly limit and shows it on the link', async () => {
      await turnOn();
      const now = new Date();
      await t.db.prisma.aiUsage.create({
        data: {
          userId: users.owner.userId,
          month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
          links: 50,
        },
      });
      const saved = await save({});
      await deferrer.flush();
      expect((await jobsOf(saved.id))[0]).toMatchObject({ status: 'skipped', reason: 'quota' });
      expect((await link(saved.id)).aiStatus).toBe('skipped');
    });

    it('fails a refusal and an invalid answer at once, nothing shown', async () => {
      await turnOn();
      const refused = await save({ url: 'https://example.com/ai-refuse' });
      await deferrer.flush();
      expect((await jobsOf(refused.id))[0]).toMatchObject({ status: 'failed', reason: 'rejected' });
      expect(await link(refused.id)).toMatchObject({ aiStatus: 'failed', summary: null });

      vi.spyOn(MockAiProvider.prototype, 'runLinkJob').mockResolvedValue({
        type: 'output',
        output: 'not json',
      });
      const invalid = await save({ url: 'https://example.com/invalid' });
      await deferrer.flush();
      expect((await jobsOf(invalid.id))[0]).toMatchObject({ status: 'failed', reason: 'rejected' });
      expect(await suggestions(invalid.id)).toEqual([]);
    });

    it('retries an outage with growing delays, refunds the quota and fails after three attempts', async () => {
      await turnOn();
      const runner = t.app.get(AiRunnerService);
      const saved = await save({ url: 'https://example.com/ai-fail' });
      await deferrer.flush();
      let [queued] = await jobsOf(saved.id);
      expect(queued).toMatchObject({ status: 'pending', reason: 'unavailable', attempts: 1 });
      const delay = (queued?.notBefore?.getTime() ?? 0) - Date.now();
      expect(delay).toBeGreaterThan(25_000);
      expect(delay).toBeLessThanOrEqual(30_000);
      expect((await link(saved.id)).aiStatus).toBe('pending');
      const usage = await t.db.prisma.aiUsage.findFirstOrThrow({
        where: { userId: users.owner.userId },
      });
      expect(usage.links).toBe(0);
      expect((await a.get(AI_ENDPOINT.Settings).expect(200)).body.providerStatus).toBe(
        'unavailable',
      );

      await runner.run(queued?.id ?? '', users.owner.userId);
      expect((await jobsOf(saved.id))[0]?.attempts).toBe(1);
      await makeDue(queued?.id ?? '');
      await runner.run(queued?.id ?? '', users.owner.userId);
      [queued] = await jobsOf(saved.id);
      expect(queued).toMatchObject({ status: 'pending', attempts: 2 });
      expect((queued?.notBefore?.getTime() ?? 0) - Date.now()).toBeGreaterThan(100_000);
      await makeDue(queued?.id ?? '');
      await runner.run(queued?.id ?? '', users.owner.userId);
      expect((await jobsOf(saved.id))[0]).toMatchObject({
        status: 'failed',
        reason: 'unavailable',
        attempts: 3,
      });
      expect((await link(saved.id)).aiStatus).toBe('failed');
    });

    it('fails at once when the provider rejects the request, and treats a throw as an outage', async () => {
      await turnOn();
      vi.spyOn(MockAiProvider.prototype, 'runLinkJob').mockResolvedValueOnce({
        type: 'error',
        retryable: false,
      });
      const rejected = await save({ url: 'https://example.com/1' });
      await deferrer.flush();
      expect((await jobsOf(rejected.id))[0]).toMatchObject({
        status: 'failed',
        reason: 'unavailable',
      });
      vi.spyOn(MockAiProvider.prototype, 'runLinkJob').mockRejectedValueOnce(new Error('boom'));
      const thrown = await save({ url: 'https://example.com/2' });
      await deferrer.flush();
      expect((await jobsOf(thrown.id))[0]).toMatchObject({ status: 'pending', attempts: 1 });
    });

    it('puts a job back in the queue when the database fails mid-run', async () => {
      await turnOn();
      const saved = await save({});
      excerpts.load.mockRejectedValueOnce(new Error('db gone'));
      await deferrer.flush();
      expect((await jobsOf(saved.id))[0]).toMatchObject({
        status: 'pending',
        reason: 'unavailable',
      });
      // The reservation is given back: the retry reserves again.
      expect(await monthUsage()).toBe(0);
    });

    it('refunds the quota when writing the answer fails, so the retry never counts twice', async () => {
      await turnOn();
      const saved = await save({});
      vi.spyOn(AiApplyService.prototype, 'finish').mockRejectedValueOnce(new Error('db gone'));
      await deferrer.flush();
      const [queued] = await jobsOf(saved.id);
      expect(queued).toMatchObject({ status: 'pending', reason: 'unavailable', attempts: 1 });
      expect(await monthUsage()).toBe(0);
      await makeDue(queued?.id ?? '');
      await t.app.get(AiRunnerService).run(queued?.id ?? '', users.owner.userId);
      expect((await jobsOf(saved.id))[0]?.status).toBe('done');
      expect(await monthUsage()).toBe(1);
    });

    it('fails a job whose account cannot be read', async () => {
      await turnOn();
      const saved = await save({});
      vi.spyOn(t.app.get(PrismaService).user, 'findUnique').mockResolvedValueOnce(null);
      await deferrer.flush();
      expect((await jobsOf(saved.id))[0]).toMatchObject({
        status: 'failed',
        reason: 'unavailable',
      });
      expect((await link(saved.id)).aiStatus).toBe('failed');
    });

    it('keeps tags the user added while the job ran: Automatic mode then only suggests', async () => {
      await turnOn({ tagsMode: 'auto' });
      await tag('design');
      await tag('picked');
      const saved = await save({});
      const picked = await t.db.prisma.tag.findFirstOrThrow({
        where: { userId: users.owner.userId, name: 'picked' },
      });
      // The user's tag write commits between the job's read of the link and its tags lock. The
      // test database has one session, so the write goes through the job's own transaction: what
      // matters is that it is visible once the lock is held (READ COMMITTED).
      const original = TagsService.prototype.lockUserTags;
      vi.spyOn(TagsService.prototype, 'lockUserTags').mockImplementationOnce(async function (
        this: TagsService,
        tx,
        userId,
      ) {
        await tx.linkTag.create({ data: { linkId: saved.id, tagId: picked.id } });
        return original.call(this, tx, userId);
      });
      await deferrer.flush();
      expect((await link(saved.id)).tags.map((entry) => entry.tag.name)).toEqual(['picked']);
      expect(await suggestions(saved.id)).toContainEqual({
        kind: 'tag',
        tagName: 'design',
        folderId: null,
        state: 'suggested',
      });
    });

    it('discards the result of a job that finishes after AI was turned off', async () => {
      await turnOn();
      const original = MockAiProvider.prototype.runLinkJob;
      vi.spyOn(MockAiProvider.prototype, 'runLinkJob').mockImplementation(async function (
        this: MockAiProvider,
        input,
      ) {
        await a.patch(AI_ENDPOINT.Settings).send({ enabled: false }).expect(200);
        return original.call(this, input);
      });
      const saved = await save({});
      await deferrer.flush();
      expect((await jobsOf(saved.id))[0]).toMatchObject({ status: 'skipped', reason: 'off' });
      expect(await link(saved.id)).toMatchObject({ aiStatus: 'skipped', summary: null });
      expect(await suggestions(saved.id)).toEqual([]);
    });

    it('skips a queued job when AI was turned off before it ran', async () => {
      await turnOn();
      const saved = await save({});
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { enabled: false },
      });
      await deferrer.flush();
      expect((await jobsOf(saved.id))[0]).toMatchObject({ status: 'skipped', reason: 'off' });
    });

    it('fails a job whose link is gone', async () => {
      await turnOn();
      const saved = await save({});
      vi.spyOn(t.db.prisma.link, 'findFirst').mockResolvedValueOnce(null);
      await deferrer.flush();
      expect((await jobsOf(saved.id))[0]).toMatchObject({
        status: 'failed',
        reason: 'unavailable',
      });
    });

    it('gives every link of a paste its own job and runs them after the response', async () => {
      await turnOn();
      const design = await folder('Design');
      const pasted = (
        await a
          .post('/api/links/batch')
          .set('Accept-Language', 'de')
          .send({
            items: [
              { url: 'https://example.com/1', idempotencyKey: randomUUID() },
              { url: 'https://example.com/2', idempotencyKey: randomUUID(), folderId: design },
              { url: 'https://example.com/3', idempotencyKey: randomUUID(), tags: ['x'] },
            ],
          })
          .expect(201)
      ).body as CreateLinksBatchResponse;
      expect(pasted.links.map((entry) => entry.aiStatus)).toEqual([
        'pending',
        'pending',
        'pending',
      ]);
      const parts = await Promise.all(
        pasted.links.map(async (entry) => (await jobsOf(entry.id))[0]),
      );
      expect(parts.map((entry) => entry?.parts)).toEqual([
        ['tags', 'folder', 'summary'],
        ['tags', 'summary'],
        ['folder', 'summary'],
      ]);
      expect(parts.every((entry) => entry?.language === 'de')).toBe(true);
      await deferrer.flush();
      const done = await t.db.prisma.link.findMany({ where: { userId: users.owner.userId } });
      expect(done.every((row) => row.aiStatus === 'done' && row.summarySource === 'ai')).toBe(true);
    });

    describe('batch with aiDraftId (#569)', () => {
      const paste = async (items: object[], agent: TestAgent = a): Promise<LinkResponse[]> =>
        (
          (await agent.post('/api/links/batch').send({ items }).expect(201))
            .body as CreateLinksBatchResponse
        ).links;
      const row = (url: string, extra: object = {}) => ({
        url,
        idempotencyKey: randomUUID(),
        ...extra,
      });

      it('picks up the draft of an item and gives the others a job each', async () => {
        await turnOn();
        const draftId = randomUUID();
        const started = await draft({ draftId, url: 'https://example.com/1' });
        await deferrer.flush();
        const usedBefore = await monthUsage();

        const [first, second] = await paste([
          row('https://example.com/1', { aiDraftId: draftId }),
          row('https://example.com/2'),
        ]);
        expect(first).toMatchObject({ aiStatus: 'done', summary: 'A page about Design systems.' });
        expect((await jobsOf(first?.id ?? '')).map((entry) => entry.id)).toEqual([started.id]);
        expect(await jobsOf(second?.id ?? '')).toHaveLength(1);
        expect(await t.db.prisma.aiJob.count({ where: { userId: users.owner.userId } })).toBe(2);
        await deferrer.flush();
        // Only the second link was counted now; the draft was counted when it ran.
        expect(await monthUsage()).toBe(usedBefore + 1);
      });

      it('runs a still pending draft on the saved link and starts no second job', async () => {
        await turnOn();
        const draftId = randomUUID();
        const started = await draft({ draftId, url: 'https://example.com/1' });
        const [saved] = await paste([row('https://example.com/1', { aiDraftId: draftId })]);
        expect((await jobsOf(saved?.id ?? '')).map((entry) => entry.id)).toEqual([started.id]);
        await deferrer.flush();
        expect(await t.db.prisma.aiJob.count({ where: { userId: users.owner.userId } })).toBe(1);
      });

      it('gives an unknown draft id a normal job', async () => {
        await turnOn();
        const [saved] = await paste([row('https://example.com/1', { aiDraftId: randomUUID() })]);
        expect(await jobsOf(saved?.id ?? '')).toHaveLength(1);
        await deferrer.flush();
      });

      it("never attaches another user's draft to a batch", async () => {
        await turnOn();
        await turnOn({}, b);
        const theirs = randomUUID();
        const owners = await draft({ draftId: theirs });
        await deferrer.flush();
        const [saved] = await paste([row('https://example.com/b', { aiDraftId: theirs })], b);
        const untouched = await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: owners.id } });
        expect(untouched.linkId).toBeNull();
        expect(untouched.result).not.toBeNull();
        expect(saved).toMatchObject({ summary: null, summarySource: null });
        const jobs = await jobsOf(saved?.id ?? '');
        expect(jobs).toHaveLength(1);
        expect(jobs[0]?.id).not.toBe(owners.id);
        await deferrer.flush();
      });

      it('lets only the first item of a batch use a repeated draft id', async () => {
        await turnOn();
        const draftId = randomUUID();
        const started = await draft({ draftId });
        await deferrer.flush();
        const [first, second] = await paste([
          row('https://example.com/1', { aiDraftId: draftId }),
          row('https://example.com/2', { aiDraftId: draftId }),
        ]);
        expect((await jobsOf(first?.id ?? '')).map((entry) => entry.id)).toEqual([started.id]);
        const jobs = await jobsOf(second?.id ?? '');
        expect(jobs).toHaveLength(1);
        expect(jobs[0]?.id).not.toBe(started.id);
        await deferrer.flush();
      });

      it('ignores the draft while AI is off, like a single save', async () => {
        const [saved] = await paste([row('https://example.com/1', { aiDraftId: randomUUID() })]);
        expect(saved?.aiStatus).toBeNull();
        expect(await t.db.prisma.aiJob.count()).toBe(0);
      });

      it('refuses a draft id that is not a UUID', async () => {
        await a
          .post('/api/links/batch')
          .send({ items: [row('https://example.com/1', { aiDraftId: 'nope' })] })
          .expect(400);
      });
    });

    it('stops starting jobs of a deferred run once its budget is spent', async () => {
      await turnOn();
      const first = await save({ url: 'https://example.com/1' });
      deferrer.clear();
      const runner = t.app.get(AiRunnerService);
      await runner.runMany(users.owner.userId, [(await jobsOf(first.id))[0]?.id ?? ''], 0);
      expect((await jobsOf(first.id))[0]?.status).toBe('pending');
      await runner.runMany(users.owner.userId, []);
    });
  });

  describe('link kind (#535)', () => {
    it("sets the model's kind while the link is 'other'", async () => {
      await turnOn();
      const saved = await save({ title: 'A conference talk on signals' });
      expect(saved.kind).toBe('other');
      await deferrer.flush();
      expect((await link(saved.id)).kind).toBe('video');
    });

    it.each([
      ['Episode 12 of the signals podcast', 'podcast'],
      ['Lemon tart recipe', 'recipe'],
      ['Annual report pdf', 'document'],
      ['A tiny state library', 'code'],
      ['The best notes app', 'app'],
      ['A thread on CSS', 'post'],
    ])("sets a new kind (#537) from '%s' while the link is 'other'", async (title, kind) => {
      await turnOn();
      const saved = await save({ title });
      expect(saved.kind).toBe('other');
      await deferrer.flush();
      expect((await link(saved.id)).kind).toBe(kind);
    });

    it('never puts a new kind over a kind the page gave or the user chose (#537)', async () => {
      await turnOn();
      const fromPage = await save({ title: 'Lemon tart recipe', kind: 'article' });
      const chosen = await save({ title: 'Episode 12 of the signals podcast' });
      await a.patch(`/api/links/${chosen.id}`).send({ kind: 'other' }).expect(200);
      await deferrer.flush();
      expect((await link(fromPage.id)).kind).toBe('article');
      expect((await link(chosen.id)).kind).toBe('other');
    });

    it('keeps a kind the page or the host gave', async () => {
      await turnOn();
      const saved = await save({ title: 'A conference talk on signals', kind: 'article' });
      await deferrer.flush();
      expect((await link(saved.id)).kind).toBe('article');
    });

    it('never changes a kind the user chose, even back to other', async () => {
      await turnOn();
      const saved = await save({ title: 'A conference talk on signals' });
      await a.patch(`/api/links/${saved.id}`).send({ kind: 'other' }).expect(200);
      expect((await link(saved.id)).kindByUser).toBe(true);
      await deferrer.flush();
      expect((await link(saved.id)).kind).toBe('other');
    });

    it('leaves the kind when the model is unsure', async () => {
      await turnOn();
      const saved = await save({});
      await deferrer.flush();
      expect((await link(saved.id)).kind).toBe('other');
    });

    it('lets the host decide again after a new URL, which clears the choice', async () => {
      const saved = await save({});
      await a.patch(`/api/links/${saved.id}`).send({ kind: 'shopping' }).expect(200);
      await a
        .patch(`/api/links/${saved.id}`)
        .send({ url: 'https://www.youtube.com/watch?v=abcdefghijk' })
        .expect(200);
      expect(await link(saved.id)).toMatchObject({ kind: 'video', kindByUser: false });
    });
  });

  describe('drafts', () => {
    it('answers skipped without a job while AI is off or asks for nothing', async () => {
      const draftId = randomUUID();
      expect(await draft({ draftId })).toEqual({
        id: draftId,
        status: 'skipped',
        reason: 'off',
        suggestions: [],
        summary: null,
        title: null,
      });
      await turnOn({ tagsMode: 'off', folderMode: 'off', summaries: false });
      expect((await draft({ draftId })).reason).toBe('off');
      expect(await t.db.prisma.aiJob.count()).toBe(0);
    });

    it('runs a draft before the save and the save picks up its result', async () => {
      await turnOn({ folderMode: 'auto' });
      const design = await folder('Design');
      await tag('design');
      const draftId = randomUUID();
      const started = await draft({ draftId, description: 'About design', note: 'n' });
      expect(started).toMatchObject({ status: 'pending', reason: null, suggestions: [] });
      expect(await draft({ draftId })).toMatchObject({ id: started.id, status: 'pending' });
      await deferrer.flush();

      const ready = await job(started.id);
      expect(ready.status).toBe('done');
      expect(ready.summary).toBe('A page about Design systems.');
      expect(ready.suggestions.map((entry) => [entry.kind, entry.tagName, entry.folderId])).toEqual(
        [
          ['folder', null, design],
          ['new-tag', 'example', null],
          ['tag', 'design', null],
        ],
      );
      expect((await job(started.id)).suggestions).toEqual(ready.suggestions);

      const saved = await save({ aiDraftId: draftId, tags: ['chosen'] });
      expect(saved).toMatchObject({
        folderId: design,
        summary: 'A page about Design systems.',
        summarySource: 'ai',
        aiStatus: 'done',
        tags: ['chosen'],
      });
      expect(deferrer.size).toBe(0);
      const attached = await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: started.id } });
      expect(attached).toMatchObject({
        linkId: saved.id,
        parts: ['folder', 'summary'],
        result: null,
      });
      expect(await suggestions(saved.id)).toEqual([
        { kind: 'folder', tagName: null, folderId: design, state: 'auto-applied' },
      ]);
      const polled = await job(started.id);
      expect(polled.summary).toBe('A page about Design systems.');
      expect(polled.suggestions).toEqual([
        {
          id: expect.any(String),
          kind: 'folder',
          state: 'auto-applied',
          tagName: null,
          folderId: design,
        },
      ]);
    });

    it('answers a cleaned-up title for a draft, never applies it, and keeps the user summary (#507)', async () => {
      await turnOn();
      const draftId = randomUUID();
      const started = await draft({ draftId, title: 'Design systems | Example' });
      await deferrer.flush();
      const ready = await job(started.id);
      expect(ready.title).toBe('Design systems');
      const saved = await save({
        aiDraftId: draftId,
        title: 'My own title',
        summary: 'My own words about it.',
      });
      expect(saved).toMatchObject({
        title: 'My own title',
        summary: 'My own words about it.',
        summarySource: 'user',
      });
      expect((await job(started.id)).title).toBeNull();
    });

    it("saves without a summary when the user cleared AI's text (summary: null, #507)", async () => {
      await turnOn();
      await tag('design');
      const draftId = randomUUID();
      const started = await draft({ draftId });
      await deferrer.flush();
      expect((await job(started.id)).summary).toBe('A page about Design systems.');
      const saved = await save({ aiDraftId: draftId, summary: null });
      expect(saved).toMatchObject({ summary: null, summarySource: null, aiStatus: 'done' });
      const attached = await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: started.id } });
      expect(attached).toMatchObject({ linkId: saved.id, parts: ['tags', 'folder'] });
      // The rest of the draft still lands: its suggestions.
      expect((await suggestions(saved.id)).map((entry) => entry.tagName).sort()).toEqual([
        'design',
        'example',
      ]);
      expect((await link(saved.id)).summary).toBeNull();
    });

    it('keeps the link without a summary when the draft finishes after a save with summary: null', async () => {
      await turnOn();
      const draftId = randomUUID();
      await draft({ draftId });
      const saved = await save({ aiDraftId: draftId, summary: null });
      expect(saved).toMatchObject({ summary: null, aiStatus: 'pending' });
      await deferrer.flush();
      expect(await link(saved.id)).toMatchObject({
        summary: null,
        summarySource: null,
        aiStatus: 'done',
      });
    });

    it('applies the draft summary when the save leaves summary out, and the user text wins', async () => {
      await turnOn();
      const left = randomUUID();
      await draft({ draftId: left, url: 'https://example.com/left' });
      const edited = randomUUID();
      await draft({ draftId: edited, url: 'https://example.com/edited' });
      await deferrer.flush();
      const auto = await save({ aiDraftId: left, url: 'https://example.com/left' });
      expect(auto).toMatchObject({ summary: 'A page about Design systems.', summarySource: 'ai' });
      const mine = await save({
        aiDraftId: edited,
        url: 'https://example.com/edited',
        summary: '  Edited by me.  ',
      });
      expect(mine).toMatchObject({ summary: 'Edited by me.', summarySource: 'user' });
    });

    it('does not ask a new save job for a summary with summary: null', async () => {
      await turnOn();
      const saved = await save({ summary: null });
      expect((await jobsOf(saved.id)).map((row) => row.parts)).toEqual([['tags', 'folder']]);
      await deferrer.flush();
      expect(await link(saved.id)).toMatchObject({ summary: null, summarySource: null });
    });

    it('applies the result on the link when the draft finishes after the save', async () => {
      await turnOn();
      await tag('design');
      const draftId = randomUUID();
      const started = await draft({ draftId });
      const saved = await save({ aiDraftId: draftId });
      expect(saved.aiStatus).toBe('pending');
      expect(await t.db.prisma.aiJob.count()).toBe(1);
      await deferrer.flush();
      const row = await link(saved.id);
      expect(row).toMatchObject({ summarySource: 'ai', aiStatus: 'done' });
      expect((await suggestions(saved.id)).map((entry) => entry.tagName)).toEqual([
        'example',
        'design',
      ]);
      expect(
        await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: started.id } }),
      ).toMatchObject({
        status: 'done',
        linkId: saved.id,
        result: null,
      });
      const usage = await t.db.prisma.aiUsage.findFirstOrThrow({
        where: { userId: users.owner.userId },
      });
      expect(usage.links).toBe(1);
    });

    it('runs the draft again on the saved link after an outage, and "Try again" retries it', async () => {
      await turnOn();
      const draftId = randomUUID();
      const started = await draft({ draftId, url: 'https://example.com/ai-fail' });
      await deferrer.flush();
      await t.db.prisma.aiJob.update({
        where: { id: started.id },
        data: { status: 'failed', reason: 'unavailable' },
      });
      expect((await job(started.id)).reason).toBe('unavailable');
      const again = await draft({ draftId, url: 'https://example.com/ok' });
      expect(again).toMatchObject({ id: started.id, status: 'pending' });
      await deferrer.flush();
      expect((await job(started.id)).status).toBe('done');

      const second = randomUUID();
      const failing = await draft({ draftId: second, url: 'https://example.com/ai-fail' });
      await deferrer.flush();
      // Every attempt used up before the save: the requeued job starts its attempts over.
      await t.db.prisma.aiJob.update({
        where: { id: failing.id },
        data: { status: 'failed', reason: 'unavailable', attempts: 3 },
      });
      const saved = await save({ aiDraftId: second, url: 'https://example.com/fine' });
      expect(saved.aiStatus).toBe('pending');
      expect((await jobsOf(saved.id))[0]).toMatchObject({ status: 'pending', attempts: 0 });
      expect(deferrer.size).toBe(1);
      await deferrer.flush();
      expect((await link(saved.id)).aiStatus).toBe('done');
      expect((await jobsOf(saved.id))[0]).toMatchObject({ status: 'done', attempts: 1 });

      // "Try again" for a draft the save already attached changes nothing.
      await t.db.prisma.aiJob.update({
        where: { id: failing.id },
        data: { status: 'failed', reason: 'unavailable' },
      });
      await a
        .post(AI_ENDPOINT.Drafts)
        .send({ draftId: second, url: 'https://example.com/fine' })
        .expect(202);
      expect(deferrer.size).toBe(0);
      expect(
        await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: failing.id } }),
      ).toMatchObject({ status: 'failed', linkId: saved.id });
    });

    it('keeps a refused or quota-skipped draft as it is on the saved link', async () => {
      await turnOn();
      const refused = randomUUID();
      await draft({ draftId: refused, url: 'https://example.com/ai-refuse' });
      await deferrer.flush();
      const saved = await save({ aiDraftId: refused, url: 'https://example.com/ai-refuse' });
      expect(saved.aiStatus).toBe('failed');
      expect(deferrer.size).toBe(0);
    });

    it('answers skipped with reason quota at the monthly limit', async () => {
      await turnOn();
      const now = new Date();
      await t.db.prisma.aiUsage.create({
        data: {
          userId: users.owner.userId,
          month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
          links: 50,
        },
      });
      const draftId = randomUUID();
      const skipped = await draft({ draftId });
      expect(skipped).toMatchObject({ id: draftId, status: 'skipped', reason: 'quota' });
      expect(deferrer.size).toBe(0);
      // No row without room.
      expect(await t.db.prisma.aiJob.count()).toBe(0);
    });

    it('answers skipped without a row past the open drafts of a day', async () => {
      await turnOn();
      await t.db.prisma.aiJob.createMany({
        data: Array.from({ length: 20 }, () => ({
          userId: users.owner.userId,
          draftId: randomUUID(),
          source: 'draft',
          status: 'done',
          parts: ['summary'],
          language: 'en',
        })),
      });
      const draftId = randomUUID();
      expect(await draft({ draftId })).toMatchObject({
        id: draftId,
        status: 'skipped',
        reason: 'quota',
      });
      expect(await t.db.prisma.aiJob.count()).toBe(20);
      // Another user's drafts do not count, nor do drafts older than the window.
      await turnOn({}, b);
      expect((await draft({ draftId: randomUUID() }, b)).status).toBe('pending');
      await t.db.prisma.$executeRaw`UPDATE ai_jobs SET created_at = now() - interval '25 hours'`;
      expect((await draft({ draftId })).status).toBe('pending');
      deferrer.clear();
    });

    it('answers a job as skipped (off) without suggestions while AI is off', async () => {
      await turnOn();
      await tag('design');
      const started = await draft({ draftId: randomUUID() });
      await deferrer.flush();
      expect((await job(started.id)).suggestions.length).toBeGreaterThan(0);
      await a.patch(AI_ENDPOINT.Settings).send({ enabled: false }).expect(200);
      expect(await job(started.id)).toEqual({
        id: started.id,
        status: 'skipped',
        reason: 'off',
        suggestions: [],
        summary: null,
        title: null,
      });
    });

    it('fails a draft that lost its dialog data and ignores a draft while AI is off at save', async () => {
      await turnOn();
      const draftId = randomUUID();
      const started = await draft({ draftId });
      deferrer.clear();
      await t.app.get(AiRunnerService).run(started.id, users.owner.userId);
      expect((await job(started.id)).reason).toBe('unavailable');

      const other = randomUUID();
      const pending = await draft({ draftId: other });
      await deferrer.flush();
      await a.patch(AI_ENDPOINT.Settings).send({ enabled: false }).expect(200);
      const saved = await save({ aiDraftId: other });
      expect(saved).toMatchObject({ aiStatus: null, summary: null });
      expect(
        (await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: pending.id } })).linkId,
      ).toBeNull();
    });

    it('validates the draft body and the job id', async () => {
      await turnOn();
      for (const body of [
        { draftId: 'nope', url: 'https://example.com' },
        { draftId: randomUUID(), url: 'javascript:alert(1)' },
        { draftId: randomUUID(), url: 'https://example.com', note: 'a\u0000b' },
        { draftId: randomUUID(), url: 'https://example.com', extra: true },
      ]) {
        await a.post(AI_ENDPOINT.Drafts).send(body).expect(400);
      }
      await a
        .post('/api/links')
        .send({ url: 'https://example.com', aiDraftId: 'nope' })
        .expect(400);
      // The create summary: text, null or left out; nothing else.
      for (const summary of [5, false, 'x'.repeat(301), 'a\u0000b', ['x']]) {
        await a.post('/api/links').send({ url: 'https://example.com', summary }).expect(400);
      }
      await a.get(AI_ENDPOINT.Job.replace(':id', 'nope')).expect(400);
      const missing = await a.get(AI_ENDPOINT.Job.replace(':id', randomUUID())).expect(404);
      expect(missing.body.message).toBe(AI_ERROR_MESSAGE.JobNotFound);
    });
  });

  describe('data isolation', () => {
    it("keeps a user's jobs to that user", async () => {
      await turnOn();
      await expectIsolated(t.app, users, {
        create: async (owner) =>
          (
            (
              await owner
                .post(AI_ENDPOINT.Drafts)
                .send({ draftId: randomUUID(), url: 'https://example.com/x' })
                .expect(202)
            ).body as AiJobResponse
          ).id,
        read: (agent, id) => agent.get(AI_ENDPOINT.Job.replace(':id', id)),
        skip: {
          update: 'jobs are written by the runner only',
          remove: 'jobs are removed with their link or account',
          list: 'there is no job list',
          reference: 'a job is referenced only by its own draftId, covered below',
        },
      });
    });

    it("never attaches another user's draft and keeps draft ids per user", async () => {
      await turnOn();
      await turnOn({}, b);
      const draftId = randomUUID();
      const owners = await draft({ draftId });
      const intruders = await draft({ draftId }, b);
      expect(intruders.id).not.toBe(owners.id);
      await deferrer.flush();
      const saved = await save({ aiDraftId: draftId, url: 'https://example.com/b' }, b);
      const ownerJob = await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: owners.id } });
      expect(ownerJob.linkId).toBeNull();
      expect(ownerJob.result).not.toBeNull();
      expect((await jobsOf(saved.id)).map((row) => row.id)).toEqual([intruders.id]);

      // A draft id only the owner has: the intruder's save gets none of its result.
      const ownOnly = randomUUID();
      const ownerOnly = await draft({ draftId: ownOnly });
      await deferrer.flush();
      const foreign = await save({ aiDraftId: ownOnly, url: 'https://example.com/c' }, b);
      expect(foreign).toMatchObject({ summary: null, summarySource: null });
      const untouched = await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: ownerOnly.id } });
      expect(untouched.linkId).toBeNull();
      expect(untouched.result).not.toBeNull();
      expect((await jobsOf(foreign.id)).map((row) => row.id)).not.toContain(ownerOnly.id);
    });

    it("never puts another user's tags or folders into a prompt", async () => {
      const inputs = captureInputs();
      await turnOn();
      await folder('Owner folder');
      await tag('ownertag');
      await folder('Intruder folder', b);
      await tag('intrudertag', users.intruder.userId);
      await save({});
      await deferrer.flush();
      expect(inputs).toHaveLength(1);
      expect(inputs[0]?.tags).toEqual(['ownertag']);
      expect(inputs[0]?.folders).toEqual([{ key: 'f1', path: 'Owner folder' }]);
      expect(JSON.stringify(inputs[0])).not.toContain('intruder');
      expect(JSON.stringify(inputs[0])).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    });

    it("passes the owner's earlier choices for the same site, never the other user's", async () => {
      const inputs = captureInputs();
      await turnOn();
      const videos = await folder('Videos');
      const theirs = await folder('Intruder videos', b);
      await seedLink(t.db.prisma, users.owner.userId, {
        url: 'https://www.youtube.com/watch?v=1',
        folderId: videos,
        tags: ['talks'],
      });
      await seedLink(t.db.prisma, users.intruder.userId, {
        url: 'https://youtube.com/watch?v=2',
        folderId: theirs,
        tags: ['intrudertag'],
      });
      await save({ url: 'https://youtube.com/watch?v=3', title: 'A talk' });
      await deferrer.flush();
      expect(inputs).toHaveLength(1);
      expect(inputs[0]?.folders).toEqual([{ key: 'f1', path: 'Videos' }]);
      expect(inputs[0]?.examples).toEqual([{ folderKey: 'f1', tags: ['talks'] }]);
      expect(JSON.stringify(inputs[0])).not.toContain('intruder');
    });
  });
});
