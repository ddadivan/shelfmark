import {
  AI_ENDPOINT,
  AI_ERROR_MESSAGE,
  AI_QUOTA,
  VIEW_DRAFT_ENDPOINT,
  VIEW_DRAFT_LIMIT,
  VIEW_DRAFT_OUTCOME,
  type ViewDraftResponse,
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
import { askDay } from './ask/ask-usage.service';
import { AiBackgroundService } from './background/ai-background.service';
import { AI_ENV } from './models/ai-env.const';
import { MockAiProvider } from './providers/mock-ai.provider';

describe('POST /api/ai/view-draft (#535)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined },
      overrides: [{ provide: AiBackgroundService, useValue: new AwaitableDeferrer() }],
    });
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

  const turnOn = (agent: TestAgent = a) =>
    agent.patch(AI_ENDPOINT.Settings).send({ enabled: true }).expect(200);
  const draft = (phrase: unknown, agent: TestAgent = a) =>
    agent.post(VIEW_DRAFT_ENDPOINT).send({ phrase });
  const ok = async (phrase: string, agent: TestAgent = a): Promise<ViewDraftResponse> =>
    (await draft(phrase, agent).expect(200)).body as ViewDraftResponse;
  const questionsToday = async (userId: string): Promise<number> =>
    (
      await t.db.prisma.aiAskUsage.findFirst({
        where: { userId, day: new Date(`${askDay(new Date())}T00:00:00Z`) },
      })
    )?.questions ?? 0;
  const folder = async (userId: string, name: string, parentId: string | null = null) =>
    (await t.db.prisma.folder.create({ data: { userId, name, parentId } })).id;

  it('needs a session', async () => {
    await anonymous(t.app).post(VIEW_DRAFT_ENDPOINT).send({ phrase: 'videos' }).expect(401);
  });

  it('is a 409 while AI is off and counts nothing', async () => {
    const res = await draft('angular videos').expect(409);
    expect(res.body.message).toBe(AI_ERROR_MESSAGE.AiOff);
    expect(await questionsToday(users.owner.userId)).toBe(0);
  });

  it.each([
    ['a missing phrase', undefined],
    ['a number', 42],
    ['a phrase under the minimum after trimming', '  ab  '],
    ['a phrase over the maximum', 'x'.repeat(VIEW_DRAFT_LIMIT.PhraseMax + 1)],
    ['control characters', 'videos\u0000now'],
  ])('rejects %s with a 400', async (_label, phrase) => {
    await turnOn();
    await draft(phrase).expect(400);
  });

  it('rejects unknown fields', async () => {
    await turnOn();
    await a.post(VIEW_DRAFT_ENDPOINT).send({ phrase: 'videos', scope: 'all' }).expect(400);
  });

  it("builds a filter from the user's own folders and tags and counts one question", async () => {
    await turnOn();
    const work = await folder(users.owner.userId, 'Work');
    const design = await folder(users.owner.userId, 'Design', work);
    await seedLink(t.db.prisma, users.owner.userId, { tags: ['Angular', 'signals'] });

    const body = await ok("angular videos in design I haven't watched, oldest first");
    expect(body.outcome).toBe(VIEW_DRAFT_OUTCOME.Done);
    expect(body.draft?.query).toEqual({
      scope: 'folder',
      folderId: design,
      tags: ['Angular'],
      kind: 'video',
      sort: 'createdAt',
      order: 'asc',
      q: '',
      saved: null,
      favorite: false,
    });
    expect(body.draft?.set).toEqual(['scope', 'tags', 'kind', 'sort']);
    expect(body.draft?.note).not.toBeNull();
    expect(body.draft?.name).toBe("Angular videos in design I haven't watch");
    expect(await questionsToday(users.owner.userId)).toBe(1);
    expect(body.allowance.questionsLeft).toBe(AI_QUOTA.free.questionsPerMonth - 1);
  });

  it('never creates a tag or folder: unknown names become search words', async () => {
    await turnOn();
    const before = await t.db.prisma.tag.count();
    const body = await ok('links about #gardening');
    expect(body.draft?.query.tags).toEqual([]);
    expect(body.draft?.query.q).toBe('gardening');
    expect(await t.db.prisma.tag.count()).toBe(before);
    expect(await t.db.prisma.folder.count()).toBe(0);
  });

  it("never uses another user's folders or tags", async () => {
    await turnOn(b);
    await folder(users.owner.userId, 'Secret');
    await seedLink(t.db.prisma, users.owner.userId, { tags: ['private'] });
    const body = await ok('videos in secret #private', b);
    expect(body.draft?.query).toMatchObject({
      scope: 'all',
      folderId: null,
      tags: [],
      kind: 'video',
      q: 'private',
    });
    expect(await questionsToday(users.owner.userId)).toBe(0);
    expect(await questionsToday(users.intruder.userId)).toBe(1);
  });

  it('answers quota when the Ask allowance is used up, without a model call', async () => {
    await turnOn();
    await t.db.prisma.aiAskUsage.create({
      data: {
        userId: users.owner.userId,
        day: new Date(`${askDay(new Date())}T00:00:00Z`),
        questions: AI_QUOTA.free.questionsPerMonth,
      },
    });
    const body = await ok('angular videos');
    expect(body).toMatchObject({ outcome: VIEW_DRAFT_OUTCOME.Quota, draft: null });
    expect(body.allowance.questionsLeft).toBe(0);
    expect(await questionsToday(users.owner.userId)).toBe(AI_QUOTA.free.questionsPerMonth);
  });

  it.each(['ai-fail', 'ai-refuse'])(
    'refunds the question and answers unavailable for %s',
    async (marker) => {
      await turnOn();
      const body = await ok(`videos ${marker}`);
      expect(body).toMatchObject({ outcome: VIEW_DRAFT_OUTCOME.Unavailable, draft: null });
      expect(await questionsToday(users.owner.userId)).toBe(0);
      expect(body.allowance.questionsLeft).toBe(AI_QUOTA.free.questionsPerMonth);
    },
  );

  it('refunds and answers unavailable when the model answer is unusable or a read throws', async () => {
    await turnOn();
    const spy = vi
      .spyOn(MockAiProvider.prototype, 'draftView')
      .mockResolvedValueOnce({ type: 'output', output: 'not an object' })
      .mockRejectedValueOnce(new Error('boom'));
    expect((await ok('angular videos')).outcome).toBe(VIEW_DRAFT_OUTCOME.Unavailable);
    expect((await ok('angular videos')).outcome).toBe(VIEW_DRAFT_OUTCOME.Unavailable);
    expect(await questionsToday(users.owner.userId)).toBe(0);
    spy.mockRestore();
  });

  it('collapses whitespace before the length check', async () => {
    await turnOn();
    await draft('  a  \t b ').expect(200);
  });

  it('shares the allowance with Ask: the settings show the question as used', async () => {
    await turnOn();
    await ok('angular videos');
    const settings = await a.get(AI_ENDPOINT.Settings).expect(200);
    expect(settings.body.ask.allowance.questionsLeft).toBe(AI_QUOTA.free.questionsPerMonth - 1);
  });
});
