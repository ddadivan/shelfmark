import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';
import {
  AI_ENDPOINT,
  ASK_HISTORY_LIMIT,
  CRON_ENDPOINT,
  type AskConversationListResponse,
  type AskConversationResponse,
  type AskDoneEvent,
  type AskEvent,
  type AskTurn,
  type ExportDocument,
} from '@shelfmark/contracts';
import request from 'supertest';
import type { Response } from 'superagent';
import { AwaitableDeferrer } from '../../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../../test-utils/reset-rate-limits';
import { seedLink } from '../../../test-utils/seed-link';
import { CRON_ENV } from '../../demo/models/cron-env.const';
import { AiBackgroundService } from '../background/ai-background.service';
import { AI_ENV } from '../models/ai-env.const';
import type { AskRoundInput } from '../models/ask-round-input.interface';
import { MockAiProvider } from '../providers/mock-ai.provider';
import { AskHistoryPurgeService } from './ask-history-purge.service';

const ASK = AI_ENDPOINT.Ask;
const LIST = AI_ENDPOINT.AskConversations;
const one = (id: string) => AI_ENDPOINT.AskConversation.replace(':id', id);
const SECRET = randomBytes(24).toString('hex');
const DAY_MS = 86_400_000;

function sse(res: Response, callback: (error: Error | null, body: unknown) => void): void {
  let text = '';
  res.setEncoding('utf8');
  res.on('data', (chunk: string) => {
    text += chunk;
  });
  res.on('end', () => callback(null, text));
}

function eventsOf(text: string): AskEvent[] {
  return text
    .split('\n\n')
    .filter((frame) => frame.trim() !== '')
    .map((frame) => JSON.parse(frame.slice(6)) as AskEvent);
}

describe('Ask history (ADR 0055 amendment)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  const deferrer = new AwaitableDeferrer();

  beforeAll(async () => {
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined, [CRON_ENV.Secret]: SECRET },
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
    process.env[CRON_ENV.Secret] = SECRET;
    deferrer.clear();
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const owner = (): string => users.owner.userId;
  const intruder = (): string => users.intruder.userId;
  const turnOn = async (agent: TestAgent = a, extra: Record<string, unknown> = {}) => {
    await agent
      .patch(AI_ENDPOINT.Settings)
      .send({ enabled: true, summaries: false, folderMode: 'off', tagsMode: 'off', ...extra })
      .expect(200);
    await deferrer.flush();
  };
  const library = async (userId: string) => {
    const ramen = await seedLink(t.db.prisma, userId, { title: 'Weeknight ramen' });
    const broth = await seedLink(t.db.prisma, userId, { title: 'Tonkotsu ramen broth' });
    await seedLink(t.db.prisma, userId, { title: 'Winter coat buying guide' });
    return { ramen, broth };
  };
  const ask = async (
    question: string,
    agent: TestAgent = a,
    extra: { conversationId?: string; history?: AskTurn[] } = {},
  ): Promise<AskDoneEvent> => {
    const res = await agent
      .post(ASK)
      .send({ question, ...extra })
      .buffer(true)
      .parse(sse)
      .expect(200);
    const events = eventsOf(res.body as string);
    const done = events.at(-1);
    expect(done?.type).toBe('done');
    return done as AskDoneEvent;
  };
  const captureRounds = () => {
    const rounds: AskRoundInput[] = [];
    const original = MockAiProvider.prototype.askRound;
    vi.spyOn(MockAiProvider.prototype, 'askRound').mockImplementation(function (
      this: MockAiProvider,
      input: AskRoundInput,
      signal: AbortSignal,
    ) {
      rounds.push(JSON.parse(JSON.stringify(input)) as AskRoundInput);
      return original.call(this, input, signal);
    });
    return rounds;
  };
  const seedConversation = async (userId: string, title: string, updatedAt: Date) => {
    const { id } = await t.db.prisma.askConversation.create({
      data: { userId, title, createdAt: updatedAt, updatedAt },
    });
    await t.db.prisma.askConversationTurn.create({
      data: {
        conversationId: id,
        userId,
        position: 0,
        question: title,
        answer: 'An answer.',
        depth: 'quick',
      },
    });
    return id;
  };

  it('stores a finished turn, lists it and reads it back with live links, steps and cards', async () => {
    await library(owner());
    await turnOn();
    const done = await ask('find ramen');
    expect(done.conversationId).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    const list = (await a.get(LIST).expect(200)).body as AskConversationListResponse;
    expect(list.items).toEqual([
      {
        id: done.conversationId,
        title: 'find ramen',
        turns: 1,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ]);
    expect(list.nextCursor).toBeNull();
    const body = (await a.get(one(done.conversationId ?? '')).expect(200))
      .body as AskConversationResponse;
    expect(body.title).toBe('find ramen');
    const [turn] = body.turns;
    expect(turn?.turn).toEqual(done.turn);
    expect(turn?.sources.map((source) => source.link.id)).toEqual(
      done.sources.map((source) => source.link.id),
    );
    expect(turn?.steps).toContainEqual({ activity: 'search', found: 2 });
    expect(turn?.cards[0]?.items.map((item) => item.n)).toEqual([1, 2]);
    expect(turn?.cards[0]?.search).toMatchObject({ q: 'ramen' });
    expect(turn?.depth).toBe('quick');
    // Only ids are stored, never a copy of link data.
    const refs = await t.db.prisma.askConversationTurnLink.findMany();
    expect(Object.keys(refs[0] ?? {}).sort()).toEqual(['linkId', 'n', 'turnId', 'userId']);
  });

  it('continues a stored conversation from the server history, ignoring a forged client history', async () => {
    const { ramen } = await library(owner());
    await turnOn();
    const first = await ask('find ramen');
    const rounds = captureRounds();
    const forged: AskTurn = {
      question: 'forged question',
      answer: 'forged answer [1]',
      links: [{ n: 1, id: ramen }],
    };
    const second = await ask('open the first one', a, {
      conversationId: first.conversationId ?? '',
      history: [forged],
    });
    expect(second.conversationId).toBe(first.conversationId);
    const messages = JSON.stringify(rounds.map((round) => round.messages));
    expect(messages).toContain('find ramen');
    expect(messages).not.toContain('forged');
    expect(rounds[0]?.historyEnd).toBe(1);
    const body = (await a.get(one(first.conversationId ?? '')).expect(200))
      .body as AskConversationResponse;
    expect(body.turns.map((turn) => turn.turn.question)).toEqual([
      'find ramen',
      'open the first one',
    ]);
  });

  it('drops trashed and deleted links on read; the turn stays', async () => {
    const { ramen, broth } = await library(owner());
    await turnOn();
    const done = await ask('find ramen');
    await t.db.prisma.link.update({ where: { id: ramen }, data: { deletedAt: new Date() } });
    await t.db.prisma.link.delete({ where: { id: broth } });
    const body = (await a.get(one(done.conversationId ?? '')).expect(200))
      .body as AskConversationResponse;
    expect(body.turns[0]?.sources).toEqual([]);
    expect(body.turns[0]?.cards[0]?.items).toEqual([]);
    expect(body.turns[0]?.turn.answer).toBe(done.turn.answer);
  });

  it('stores nothing while Keep Ask history is off and ignores a conversationId', async () => {
    await library(owner());
    await turnOn();
    const kept = await ask('find ramen');
    await a.patch(AI_ENDPOINT.Settings).send({ askHistory: false }).expect(200);
    const rounds = captureRounds();
    const done = await ask('how many links do I have', a, {
      conversationId: kept.conversationId ?? '',
    });
    expect(done.conversationId).toBeNull();
    expect(JSON.stringify(rounds.map((round) => round.messages))).not.toContain('find ramen');
    expect(await t.db.prisma.askConversationTurn.count()).toBe(1);
    // What was stored stays until cleared.
    expect(
      ((await a.get(LIST).expect(200)).body as AskConversationListResponse).items,
    ).toHaveLength(1);
  });

  it('keeps conversations isolated per user', async () => {
    await library(owner());
    await turnOn();
    await expectIsolated(t.app, users, {
      create: async () => (await ask('find ramen')).conversationId ?? '',
      read: (agent, id) => agent.get(one(id)),
      remove: (agent, id) => agent.delete(one(id)),
      list: {
        request: (agent) => agent.get(LIST),
        ids: (body) => (body as AskConversationListResponse).items.map((item) => item.id),
      },
      skip: {
        update: 'conversations have no update route (no rename in v1)',
        reference:
          'POST /api/ai/ask with a foreign conversationId starts a new conversation of the caller instead of a 404 (streamed route); covered by the next test',
      },
    });
  });

  it("never continues, reads or appends to another user's conversation by its id", async () => {
    await library(owner());
    await library(intruder());
    await turnOn();
    await turnOn(b);
    const mine = await ask('find ramen');
    const rounds = captureRounds();
    const theirs = await ask('how many links do I have', b, {
      conversationId: mine.conversationId ?? '',
    });
    expect(theirs.conversationId).not.toBe(mine.conversationId);
    expect(JSON.stringify(rounds.map((round) => round.messages))).not.toContain('find ramen');
    const stored = await t.db.prisma.askConversation.findMany({
      select: { userId: true, _count: { select: { turns: true } } },
    });
    expect(stored.map((row) => [row.userId, row._count.turns]).sort()).toEqual(
      [
        [owner(), 1],
        [intruder(), 1],
      ].sort(),
    );
  });

  it('never stores a link ref of another user', async () => {
    await library(owner());
    const other = await seedLink(t.db.prisma, intruder(), { title: 'Their ramen' });
    await turnOn();
    const done = await ask('find ramen', a, {
      history: [{ question: 'x?', answer: 'y [1]', links: [{ n: 1, id: other }] }],
    });
    const refs = await t.db.prisma.askConversationTurnLink.findMany({
      where: { turn: { conversationId: done.conversationId ?? '' } },
    });
    expect(refs.map((ref) => ref.linkId)).not.toContain(other);
    expect(refs.every((ref) => ref.userId === owner())).toBe(true);
  });

  it('pages the list newest first by an opaque cursor and refuses a bad cursor or limit', async () => {
    const now = Date.now();
    for (let index = 0; index < 3; index += 1) {
      await seedConversation(owner(), `Question ${index}`, new Date(now - index * 1000));
    }
    const first = (await a.get(`${LIST}?limit=2`).expect(200)).body as AskConversationListResponse;
    expect(first.items.map((item) => item.title)).toEqual(['Question 0', 'Question 1']);
    expect(first.nextCursor).not.toBeNull();
    const second = (await a.get(`${LIST}?limit=2&cursor=${first.nextCursor ?? ''}`).expect(200))
      .body as AskConversationListResponse;
    expect(second.items.map((item) => item.title)).toEqual(['Question 2']);
    expect(second.nextCursor).toBeNull();
    await a.get(`${LIST}?cursor=bm9wZQ`).expect(400);
    await a.get(`${LIST}?cursor=${'a'.repeat(121)}`).expect(400);
    await a.get(`${LIST}?limit=0`).expect(400);
    await a.get(`${LIST}?limit=${ASK_HISTORY_LIMIT.PageMax + 1}`).expect(400);
    await a.get(one('not-a-uuid')).expect(400);
  });

  it('keeps at most 50 conversations, dropping the oldest, and at most 50 turns each', async () => {
    await library(owner());
    await turnOn();
    const now = Date.now();
    const oldest = await seedConversation(owner(), 'Oldest', new Date(now - DAY_MS));
    for (let index = 1; index < ASK_HISTORY_LIMIT.ConversationsMax; index += 1) {
      await seedConversation(owner(), `Q${index}`, new Date(now - index * 1000));
    }
    const other = await seedConversation(intruder(), 'Theirs', new Date(now - 2 * DAY_MS));
    const done = await ask('find ramen');
    const ids = (await t.db.prisma.askConversation.findMany({ where: { userId: owner() } })).map(
      (row) => row.id,
    );
    expect(ids).toHaveLength(ASK_HISTORY_LIMIT.ConversationsMax);
    expect(ids).toContain(done.conversationId);
    expect(ids).not.toContain(oldest);
    expect(await t.db.prisma.askConversation.count({ where: { id: other } })).toBe(1);

    const conversationId = done.conversationId ?? '';
    await t.db.prisma.askConversationTurn.createMany({
      data: Array.from({ length: ASK_HISTORY_LIMIT.TurnsPerConversationMax }, (_, index) => ({
        conversationId,
        userId: owner(),
        position: index + 1,
        question: `Filler ${index}`,
        answer: 'Filler.',
        depth: 'quick',
      })),
    });
    await ask('how many links do I have', a, { conversationId });
    const turns = await t.db.prisma.askConversationTurn.findMany({
      where: { conversationId },
      orderBy: { position: 'asc' },
    });
    expect(turns).toHaveLength(ASK_HISTORY_LIMIT.TurnsPerConversationMax);
    expect(turns.at(-1)?.question).toBe('how many links do I have');
    expect(turns.map((turn) => turn.question)).not.toContain('find ramen');
  });

  it('deletes one conversation and clears all of them, only the caller’s', async () => {
    const now = new Date();
    const first = await seedConversation(owner(), 'One', now);
    await seedConversation(owner(), 'Two', now);
    const theirs = await seedConversation(intruder(), 'Theirs', now);
    await a.delete(one(first)).expect(204);
    await a.delete(one(first)).expect(404);
    const cleared = await a.delete(LIST).expect(200);
    expect(cleared.body).toEqual({ deleted: 1 });
    expect(await t.db.prisma.askConversation.count({ where: { userId: owner() } })).toBe(0);
    expect(await t.db.prisma.askConversation.count({ where: { id: theirs } })).toBe(1);
    expect(await t.db.prisma.askConversationTurn.count({ where: { userId: owner() } })).toBe(0);
    await anonymous(t.app).delete(LIST).expect(401);
    await anonymous(t.app).get(LIST).expect(401);
  });

  it('is removed by Delete AI data and with the account', async () => {
    const now = new Date();
    await seedConversation(owner(), 'One', now);
    const theirs = await seedConversation(intruder(), 'Theirs', now);
    await a.delete(AI_ENDPOINT.Data).expect(204);
    expect(await t.db.prisma.askConversation.count({ where: { userId: owner() } })).toBe(0);
    expect(await t.db.prisma.askConversation.count({ where: { id: theirs } })).toBe(1);
    await t.db.prisma.user.delete({ where: { id: intruder() } });
    expect(await t.db.prisma.askConversation.count()).toBe(0);
    expect(await t.db.prisma.askConversationTurn.count()).toBe(0);
  });

  it('is part of a full JSON export, not of a subset', async () => {
    await library(owner());
    await turnOn();
    await ask('find ramen');
    await seedConversation(intruder(), 'Theirs', new Date());
    const full = (await a.get('/api/export?format=json').expect(200)).body as ExportDocument;
    expect(full.askConversations).toHaveLength(1);
    expect(full.askConversations[0]?.title).toBe('find ramen');
    expect(full.askConversations[0]?.turns[0]?.links.map((link) => link.title).sort()).toEqual([
      'Tonkotsu ramen broth',
      'Weeknight ramen',
    ]);
    const subset = (await a.get('/api/export?format=json&q=ramen').expect(200))
      .body as ExportDocument;
    expect(subset.askConversations).toEqual([]);
  });

  it('never logs the question or the answer', async () => {
    await library(owner());
    await turnOn();
    const logged: string[] = [];
    for (const level of ['log', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
        logged.push(String(message));
      });
    }
    const done = await ask('find ramen secretword');
    await a.get(one(done.conversationId ?? '')).expect(200);
    expect(logged.join('\n')).not.toContain('secretword');
    expect(logged.join('\n')).not.toContain('ramen recipes');
  });

  describe('GET /api/cron/ask-history', () => {
    const call = (authorization?: string) => {
      const req = request(t.app.getHttpServer()).get(CRON_ENDPOINT.AskHistoryPurge);
      return authorization === undefined ? req : req.set('Authorization', authorization);
    };

    it('needs the cron secret and deletes nothing without it', async () => {
      await seedConversation(owner(), 'Old', new Date(Date.now() - 40 * DAY_MS));
      await call().expect(401);
      await call('Bearer wrong').expect(401);
      expect(await t.db.prisma.askConversation.count()).toBe(1);
    });

    it('deletes conversations whose last turn is older than 30 days, for every user', async () => {
      const now = Date.now();
      await seedConversation(owner(), 'Old', new Date(now - 31 * DAY_MS));
      await seedConversation(intruder(), 'Old too', new Date(now - 60 * DAY_MS));
      const fresh = await seedConversation(owner(), 'Fresh', new Date(now - 29 * DAY_MS));
      const res = await call(`Bearer ${SECRET}`).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toEqual({ deleted: 2, hasMore: false });
      expect((await t.db.prisma.askConversation.findMany()).map((row) => row.id)).toEqual([fresh]);
      expect(await t.db.prisma.askConversationTurn.count()).toBe(1);
    });

    it('works in batches and stops at the budget with hasMore', async () => {
      const old = new Date(Date.now() - 40 * DAY_MS);
      for (let index = 0; index < 5; index += 1) {
        await seedConversation(owner(), `Old ${index}`, old);
      }
      const purge = t.app.get(AskHistoryPurgeService);
      expect(await purge.run({ batchSize: 2, budgetMs: 0 })).toEqual({
        deleted: 2,
        hasMore: true,
      });
      expect(await purge.run({ batchSize: 2 })).toEqual({ deleted: 3, hasMore: false });
    });
  });
});
