import {
  AI_ENDPOINT,
  AI_ERROR_MESSAGE,
  type FolderResponse,
  type LinkAiState,
  type LinkResponse,
} from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { AiBackgroundService } from './background/ai-background.service';
import { AiEmbedService } from './embeddings/ai-embed.service';
import { AiExcerptService } from './excerpt/ai-excerpt.service';
import { AI_ENV } from './models/ai-env.const';

const PAGE = { excerpt: null, description: null };

describe('AI link endpoints', () => {
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
  const folder = async (name: string, agent: TestAgent = a): Promise<string> =>
    ((await agent.post('/api/folders').send({ name }).expect(201)).body as FolderResponse).id;
  const tag = (name: string, userId = users.owner.userId) =>
    seedLink(t.db.prisma, userId, { title: `Tagged ${name}`, tags: [name] });
  const save = async (body: object = {}, agent: TestAgent = a): Promise<LinkResponse> =>
    (
      await agent
        .post('/api/links')
        .send({ url: 'https://example.com/design', title: 'Design systems', ...body })
        .expect(201)
    ).body as LinkResponse;
  /** A saved link whose job has run (Design folder and design tag exist for the owner). */
  const processed = async (
    settings: object = {},
    agent: TestAgent = a,
    userId = users.owner.userId,
  ): Promise<{ link: LinkResponse; design: string }> => {
    await turnOn(settings, agent);
    const design = await folder('Design', agent);
    await tag('design', userId);
    const link = await save({}, agent);
    await deferrer.flush();
    return { link, design };
  };
  const stateOf = async (id: string, agent: TestAgent = a): Promise<LinkAiState> =>
    (await agent.get(AI_ENDPOINT.LinkAi.replace(':id', id)).expect(200)).body as LinkAiState;
  const row = (id: string) =>
    t.db.prisma.link.findUniqueOrThrow({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
  const rows = (linkId: string) =>
    t.db.prisma.linkSuggestion.findMany({
      where: { linkId },
      orderBy: [{ kind: 'asc' }, { tagName: 'asc' }],
      select: { kind: true, tagName: true, folderId: true, state: true },
    });
  const rewrite = (id: string, agent: TestAgent = a) =>
    agent.post(AI_ENDPOINT.LinkAiRewrite.replace(':id', id));
  const undo = (id: string, part: string, agent: TestAgent = a) =>
    agent.post(AI_ENDPOINT.LinkAiUndo.replace(':id', id)).send({ part });
  const dismiss = (id: string, agent: TestAgent = a) =>
    agent.post(AI_ENDPOINT.DismissSuggestion.replace(':id', id));

  describe('GET /api/links/:id/ai', () => {
    it('answers an empty state for a link AI never saw', async () => {
      const link = await save();
      expect(await stateOf(link.id)).toEqual({
        aiStatus: null,
        reason: null,
        summary: null,
        summarySource: null,
        suggestions: [],
        autoApplied: null,
      });
    });

    it('answers status, summary and open suggestions after a job', async () => {
      const { link, design } = await processed();
      const state = await stateOf(link.id);
      expect(state).toMatchObject({
        aiStatus: 'done',
        reason: null,
        summary: 'A page about Design systems.',
        summarySource: 'ai',
        autoApplied: null,
      });
      expect(state.suggestions.map((s) => [s.kind, s.state, s.tagName, s.folderId])).toEqual(
        expect.arrayContaining([
          ['folder', 'suggested', null, design],
          ['tag', 'suggested', 'design', null],
          ['new-tag', 'suggested', 'example', null],
        ]),
      );
    });

    it('lists what Automatic mode applied while it is still in place', async () => {
      const { link, design } = await processed({ folderMode: 'auto', tagsMode: 'auto' });
      expect((await stateOf(link.id)).autoApplied).toEqual({ folderId: design, tags: ['design'] });
      // Moved elsewhere by hand outside the API: the folder mark no longer describes the link.
      await t.db.prisma.link.update({ where: { id: link.id }, data: { folderId: null } });
      expect((await stateOf(link.id)).autoApplied).toEqual({ folderId: null, tags: ['design'] });
    });

    it('shows the reason of the latest job', async () => {
      await turnOn();
      const link = await save({ url: 'https://example.com/ai-refuse' });
      await deferrer.flush();
      expect(await stateOf(link.id)).toMatchObject({ aiStatus: 'failed', reason: 'rejected' });
    });

    it('is 404 for a trashed link', async () => {
      const link = await save();
      await a.delete(`/api/links/${link.id}`).expect(204);
      await a.get(AI_ENDPOINT.LinkAi.replace(':id', link.id)).expect(404);
    });

    it("keeps one user's link AI routes away from another user", async () => {
      await turnOn({}, b);
      await expectIsolated(t.app, users, {
        create: async (owner) => {
          await turnOn({ folderMode: 'auto' }, owner);
          await folder('Design', owner);
          const link = await save({}, owner);
          await deferrer.flush();
          return link.id;
        },
        read: (agent, id) => agent.get(AI_ENDPOINT.LinkAi.replace(':id', id)),
        update: (agent, id) => undo(id, 'folder', agent),
        reference: (agent, id) => rewrite(id, agent),
        skip: {
          remove: 'AI state goes with its link (DELETE /api/ai/data is per user, tested below)',
          list: 'there is no list of link AI states',
        },
      });
      expect(await t.db.prisma.aiJob.count({ where: { userId: users.intruder.userId } })).toBe(0);
    });
  });

  describe('POST /api/ai/suggestions/:id/dismiss', () => {
    it('dismisses for good, idempotently', async () => {
      const { link } = await processed();
      const target = (await stateOf(link.id)).suggestions.find((s) => s.kind === 'new-tag');
      await dismiss(target?.id ?? '').expect(204);
      await dismiss(target?.id ?? '').expect(204);
      const state = await stateOf(link.id);
      expect(state.suggestions.map((s) => s.id)).not.toContain(target?.id);
      expect(await rows(link.id)).toContainEqual({
        kind: 'new-tag',
        tagName: 'example',
        folderId: null,
        state: 'dismissed',
      });
    });

    it('keeps an accepted suggestion accepted', async () => {
      const { link } = await processed();
      const target = (await stateOf(link.id)).suggestions.find((s) => s.kind === 'tag');
      await a
        .patch(`/api/links/${link.id}`)
        .send({ tags: ['design'] })
        .expect(200);
      await dismiss(target?.id ?? '').expect(204);
      expect(await rows(link.id)).toContainEqual(
        expect.objectContaining({ tagName: 'design', state: 'accepted' }),
      );
    });

    it("is 404 for another user's suggestion, like a missing one, and changes nothing", async () => {
      const { link } = await processed();
      const target = (await stateOf(link.id)).suggestions[0];
      const foreign = await dismiss(target?.id ?? '', b).expect(404);
      const missing = await dismiss('01900000-0000-7000-8000-000000000000', b).expect(404);
      expect(foreign.body.message).toBe(AI_ERROR_MESSAGE.SuggestionNotFound);
      expect(missing.body.message).toBe(foreign.body.message);
      expect((await stateOf(link.id)).suggestions).toHaveLength(3);
      await anonymous(t.app)
        .post(AI_ENDPOINT.DismissSuggestion.replace(':id', target?.id ?? ''))
        .expect(401);
    });
  });

  describe('POST /api/links/:id/ai/rewrite', () => {
    it('queues a rewrite that replaces the AI summary, counts quota and never auto-applies', async () => {
      const { link } = await processed({ folderMode: 'auto', tagsMode: 'auto' });
      await a.patch(`/api/links/${link.id}`).send({ folderId: null, tags: [] }).expect(200);
      await t.db.prisma.link.update({
        where: { id: link.id },
        data: { summary: 'Old AI text', summarySource: 'ai' },
      });
      const queued = await rewrite(link.id).expect(200);
      expect((queued.body as LinkAiState).aiStatus).toBe('pending');
      const job = await t.db.prisma.aiJob.findFirstOrThrow({
        where: { linkId: link.id, source: 'rewrite' },
      });
      expect(job.parts).toEqual(['tags', 'folder', 'summary']);
      // A second click while it is queued adds nothing.
      await rewrite(link.id).expect(200);
      expect(await t.db.prisma.aiJob.count({ where: { source: 'rewrite' } })).toBe(1);

      await deferrer.flush();
      const after = await row(link.id);
      expect(after).toMatchObject({
        summary: 'A page about Design systems.',
        summarySource: 'ai',
        aiStatus: 'done',
        folderId: null,
      });
      expect(after.tags).toEqual([]);
      const usage = await t.db.prisma.aiUsage.findFirstOrThrow({
        where: { userId: users.owner.userId },
      });
      expect(usage.links).toBe(2);
    });

    it("is refused while the summary is the user's, AI is off or summaries are off", async () => {
      const { link } = await processed();
      await a.patch(`/api/links/${link.id}`).send({ summary: 'Mine' }).expect(200);
      const mine = await rewrite(link.id).expect(409);
      expect(mine.body.message).toBe(AI_ERROR_MESSAGE.SummaryIsUsers);
      await a.patch(`/api/links/${link.id}`).send({ summary: null }).expect(200);
      await turnOn({ summaries: false });
      expect((await rewrite(link.id).expect(409)).body.message).toBe(AI_ERROR_MESSAGE.AiOff);
      await a.patch(AI_ENDPOINT.Settings).send({ enabled: false, summaries: true }).expect(200);
      expect((await rewrite(link.id).expect(409)).body.message).toBe(AI_ERROR_MESSAGE.AiOff);
    });

    it('skips at the monthly limit and says so', async () => {
      const { link } = await processed();
      await t.db.prisma.aiUsage.updateMany({
        where: { userId: users.owner.userId },
        data: { links: 50 },
      });
      await rewrite(link.id).expect(200);
      await deferrer.flush();
      expect(await stateOf(link.id)).toMatchObject({ aiStatus: 'skipped', reason: 'quota' });
    });
  });

  describe('POST /api/links/:id/ai/undo', () => {
    it('moves the link back to Unsorted and removes the tags AI added', async () => {
      const { link, design } = await processed({ folderMode: 'auto', tagsMode: 'auto' });
      expect((await row(link.id)).folderId).toBe(design);
      const before = (await row(link.id)).updatedAt;

      const folderUndo = await undo(link.id, 'folder').expect(200);
      expect((folderUndo.body as LinkResponse).folderId).toBeNull();
      expect((folderUndo.body as LinkResponse).tags).toEqual(['design']);
      const tagsUndo = await undo(link.id, 'tags').expect(200);
      expect((tagsUndo.body as LinkResponse).tags).toEqual([]);

      expect((await row(link.id)).updatedAt).toEqual(before);
      expect(await t.db.prisma.tag.count({ where: { userId: users.owner.userId } })).toBe(1);
      expect(await rows(link.id)).toEqual([
        { kind: 'folder', tagName: null, folderId: design, state: 'dismissed' },
        { kind: 'new-tag', tagName: 'example', folderId: null, state: 'suggested' },
        { kind: 'tag', tagName: 'design', folderId: null, state: 'dismissed' },
      ]);
      expect((await stateOf(link.id)).autoApplied).toBeNull();
    });

    it('flags the vector stale on AI apply and on tag undo, and starts the embed pass (AI-3)', async () => {
      const { link } = await processed({
        folderMode: 'auto',
        tagsMode: 'auto',
        summaries: true,
        meaningSearch: true,
      });
      const staleOf = async () =>
        (
          await t.db.prisma.$queryRaw<{ stale: boolean }[]>`
            SELECT stale FROM link_embeddings WHERE link_id = ${link.id}::uuid`
        )[0]?.stale;
      // The job's own pass embedded the link with its summary and the tags AI added.
      expect(await staleOf()).toBe(false);
      // From here the pass is observed, not run, so the flags stay visible.
      const pass = vi.spyOn(t.app.get(AiEmbedService), 'run').mockResolvedValue();

      // AI apply: a rewrite stores a new summary and flags the vector.
      await t.db.prisma.link.update({
        where: { id: link.id },
        data: { summary: 'Old AI text', summarySource: 'ai' },
      });
      await rewrite(link.id).expect(200);
      await deferrer.flush();
      expect((await row(link.id)).summary).toBe('A page about Design systems.');
      expect(await staleOf()).toBe(true);
      expect(pass).toHaveBeenCalled();

      // Tag undo: the tags AI added go, the vector is flagged and the pass is kicked.
      await t.db.prisma.$executeRaw`UPDATE link_embeddings SET stale = false`;
      pass.mockClear();
      await undo(link.id, 'tags').expect(200);
      expect(await staleOf()).toBe(true);
      await deferrer.flush();
      expect(pass).toHaveBeenCalledTimes(1);
    });

    it('never undoes a folder the user chose meanwhile', async () => {
      const { link } = await processed({ folderMode: 'auto' });
      const mine = await folder('Mine');
      await t.db.prisma.link.update({ where: { id: link.id }, data: { folderId: mine } });
      const res = await undo(link.id, 'folder').expect(200);
      expect((res.body as LinkResponse).folderId).toBe(mine);
      await undo(link.id, 'tags').expect(200);
    });

    it('rejects an unknown part', async () => {
      const link = await save();
      await undo(link.id, 'summary').expect(400);
      await a.post(AI_ENDPOINT.LinkAiUndo.replace(':id', link.id)).send({}).expect(400);
    });
  });

  describe('PATCH /api/links/:id', () => {
    it("stores the user's summary, clears it with null or blank, and validates it", async () => {
      const link = await save();
      const mine = await a
        .patch(`/api/links/${link.id}`)
        .send({ summary: '  My words  ' })
        .expect(200);
      expect(mine.body).toMatchObject({ summary: 'My words', summarySource: 'user' });
      const blank = await a.patch(`/api/links/${link.id}`).send({ summary: '   ' }).expect(200);
      expect(blank.body).toMatchObject({ summary: null, summarySource: null });
      await a.patch(`/api/links/${link.id}`).send({ summary: 'Again' }).expect(200);
      const cleared = await a.patch(`/api/links/${link.id}`).send({ summary: null }).expect(200);
      expect(cleared.body).toMatchObject({ summary: null, summarySource: null });
      await a
        .patch(`/api/links/${link.id}`)
        .send({ summary: 'x'.repeat(301) })
        .expect(400);
      await a.patch(`/api/links/${link.id}`).send({ summary: 'bad\u0000' }).expect(400);
      await a.patch(`/api/links/${link.id}`).send({ summary: 5 }).expect(400);
    });

    it('settles folder suggestions on a user folder change', async () => {
      const { link, design } = await processed({ folderMode: 'auto' });
      const mine = await folder('Mine');
      await a.patch(`/api/links/${link.id}`).send({ folderId: mine }).expect(200);
      expect(await rows(link.id)).toContainEqual({
        kind: 'folder',
        tagName: null,
        folderId: design,
        state: 'dismissed',
      });
      expect((await stateOf(link.id)).autoApplied).toBeNull();
    });

    it('accepts the suggested folder the user picks', async () => {
      const { link, design } = await processed();
      await a.patch(`/api/links/${link.id}`).send({ folderId: design }).expect(200);
      expect(await rows(link.id)).toContainEqual({
        kind: 'folder',
        tagName: null,
        folderId: design,
        state: 'accepted',
      });
    });

    it('settles tag suggestions only when the tag set really changes', async () => {
      const { link } = await processed({ tagsMode: 'auto' });
      await a
        .patch(`/api/links/${link.id}`)
        .send({ tags: ['DESIGN'] })
        .expect(200);
      expect(await rows(link.id)).toContainEqual(
        expect.objectContaining({ kind: 'tag', state: 'auto-applied' }),
      );
      await a
        .patch(`/api/links/${link.id}`)
        .send({ tags: ['example'] })
        .expect(200);
      expect(await rows(link.id)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'tag', tagName: 'design', state: 'dismissed' }),
          expect.objectContaining({ kind: 'new-tag', tagName: 'example', state: 'accepted' }),
        ]),
      );
    });

    it("asks AI again for a new URL unless the summary is the user's", async () => {
      const { link } = await processed();
      const moved = await a
        .patch(`/api/links/${link.id}`)
        .send({ url: 'https://example.org/other' })
        .expect(200);
      expect((moved.body as LinkResponse).aiStatus).toBe('pending');
      expect(await t.db.prisma.aiJob.count({ where: { linkId: link.id } })).toBe(2);
      await deferrer.flush();
      expect((await row(link.id)).aiStatus).toBe('done');

      await a.patch(`/api/links/${link.id}`).send({ summary: 'Mine' }).expect(200);
      await a.patch(`/api/links/${link.id}`).send({ url: 'https://example.net/third' }).expect(200);
      expect(await t.db.prisma.aiJob.count({ where: { linkId: link.id } })).toBe(2);
      // The same page written differently is not a new page.
      await a.patch(`/api/links/${link.id}`).send({ summary: null }).expect(200);
      await a.patch(`/api/links/${link.id}`).send({ url: 'https://EXAMPLE.net/third' }).expect(200);
      expect(await t.db.prisma.aiJob.count({ where: { linkId: link.id } })).toBe(2);
    });

    it('supersedes the jobs and open suggestions of the old page on a URL change', async () => {
      const { link } = await processed();
      await t.db.prisma.linkSuggestion.updateMany({
        where: { linkId: link.id, kind: 'new-tag' },
        data: { state: 'dismissed' },
      });
      // A job of the old page is still queued when the URL changes.
      await rewrite(link.id).expect(200);
      const [, old] = await t.db.prisma.aiJob.findMany({
        where: { linkId: link.id },
        orderBy: { createdAt: 'asc' },
      });
      await a.patch(`/api/links/${link.id}`).send({ url: 'https://example.org/other' }).expect(200);
      expect(
        await t.db.prisma.aiJob.findUniqueOrThrow({ where: { id: old?.id ?? '' } }),
      ).toMatchObject({ status: 'skipped', reason: null });
      const queued = await t.db.prisma.aiJob.findMany({
        where: { linkId: link.id, status: { in: ['pending', 'running'] } },
      });
      expect(queued).toHaveLength(1);
      expect(queued[0]?.source).toBe('save');
      // Only the dismissal survives; the old page's open suggestions are gone.
      expect(await rows(link.id)).toEqual([
        { kind: 'new-tag', tagName: 'example', folderId: null, state: 'dismissed' },
      ]);
      await deferrer.flush();
      expect((await row(link.id)).aiStatus).toBe('done');
    });
  });

  describe('DELETE /api/ai/data', () => {
    it("deletes AI output but keeps the user's edits, tags, folders and usage, and only the caller's", async () => {
      const own = await processed({ folderMode: 'auto', tagsMode: 'auto' });
      const other = await processed({}, b, users.intruder.userId);
      const mine = await save({ url: 'https://example.com/mine', title: 'Mine' });
      await a.patch(`/api/links/${mine.id}`).send({ summary: 'My words' }).expect(200);
      await t.db.prisma.aiSettings.update({
        where: { userId: users.owner.userId },
        data: { backfillState: 'running' },
      });
      await t.db.prisma.aiBatch.create({
        data: {
          userId: users.owner.userId,
          provider: 'mock',
          providerBatchId: 'mock-open',
          requestCount: 1,
        },
      });

      await a.delete(AI_ENDPOINT.Data).expect(204);

      expect(await row(own.link.id)).toMatchObject({
        summary: null,
        summarySource: null,
        aiStatus: null,
        folderId: own.design,
      });
      expect((await row(own.link.id)).tags.map((e) => e.tag.name)).toEqual(['design']);
      expect(await row(mine.id)).toMatchObject({ summary: 'My words', summarySource: 'user' });
      expect(
        await t.db.prisma.linkSuggestion.count({ where: { userId: users.owner.userId } }),
      ).toBe(0);
      expect(await t.db.prisma.aiJob.count({ where: { userId: users.owner.userId } })).toBe(0);
      expect(
        (await t.db.prisma.aiUsage.findFirstOrThrow({ where: { userId: users.owner.userId } }))
          .links,
      ).toBe(1);
      expect(
        await t.db.prisma.aiSettings.findUniqueOrThrow({ where: { userId: users.owner.userId } }),
      ).toMatchObject({ enabled: true, backfillState: 'stopped' });
      expect(
        await t.db.prisma.aiBatch.findUniqueOrThrow({ where: { providerBatchId: 'mock-open' } }),
      ).toMatchObject({ status: 'canceled' });
      expect(await stateOf(own.link.id)).toMatchObject({ suggestions: [], aiStatus: null });

      // The other user's AI data is untouched.
      expect(await row(other.link.id)).toMatchObject({ summarySource: 'ai', aiStatus: 'done' });
      expect(
        await t.db.prisma.linkSuggestion.count({ where: { userId: users.intruder.userId } }),
      ).toBe(3);
      expect(await t.db.prisma.aiJob.count({ where: { userId: users.intruder.userId } })).toBe(1);
    });

    it('discards the result of a job still running', async () => {
      await turnOn();
      const link = await save();
      await a.delete(AI_ENDPOINT.Data).expect(204);
      await deferrer.flush();
      expect(await row(link.id)).toMatchObject({ summary: null, aiStatus: null });
    });
  });
});
