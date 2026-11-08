import {
  FEEDBACK_ENDPOINT,
  FEEDBACK_LIMIT,
  type FeedbackMilestone,
  type FeedbackPromptResponse,
} from '@shelfmark/contracts';
import { afterEach, vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { FEEDBACK_ERROR_MESSAGE } from './models/feedback-error-message.const';

const PROMPT = FEEDBACK_ENDPOINT.Prompt;
const RECORD = FEEDBACK_ENDPOINT.Record;
const DAY = 86_400_000;
const NOW = new Date();

// Test-level retries (2): same PGlite socket-server artifact as the links concurrency spec.
describe('feedback API', { retry: 2 }, () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
    await signUpAgo(users.owner.userId, 400 * DAY);
    await signUpAgo(users.intruder.userId, 400 * DAY);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  /** An onboarded, non-demo user whose account is `age` ms old at the frozen "now". */
  async function signUpAgo(
    userId: string,
    age: number,
    patch: { isDemo?: boolean; onboardingCompletedAt?: Date | null } = {},
  ): Promise<void> {
    await t.db.prisma.user.update({
      where: { id: userId },
      data: {
        createdAt: new Date(NOW.getTime() - age),
        onboardingCompletedAt: NOW,
        isDemo: false,
        demoExpiresAt: null,
        ...patch,
        ...(patch.isDemo === true ? { demoExpiresAt: new Date(NOW.getTime() + DAY) } : {}),
      },
    });
  }

  const promptOf = async (agent: TestAgent): Promise<FeedbackMilestone | null> =>
    ((await agent.get(PROMPT).expect(200)).body as FeedbackPromptResponse).milestone;
  const rows = (userId: string) =>
    t.db.prisma.feedback.findMany({ where: { userId }, orderBy: { milestone: 'asc' } });
  const send = (agent: TestAgent, body: unknown) => agent.post(RECORD).send(body as object);

  describe('GET prompt', () => {
    it.each([
      ['3 days minus 1 ms', 3 * DAY - 1, null],
      ['exactly 3 days', 3 * DAY, 'day3'],
      ['day 10 (day3 skipped)', 10 * DAY, 'week1'],
      ['day 40', 40 * DAY, 'month1'],
      ['day 400', 400 * DAY, 'year1'],
    ])('%s -> %s', async (_label, age, expected) => {
      await signUpAgo(users.owner.userId, age);
      expect(await promptOf(a)).toBe(expected);
    });

    it('is null on day 10 once week1 has a row, even a skip', async () => {
      await signUpAgo(users.owner.userId, 10 * DAY);
      await send(a, { milestone: 'week1', score: null }).expect(204);
      expect(await promptOf(a)).toBeNull();
    });

    it('asks again about the newest milestone when only older ones have rows', async () => {
      await signUpAgo(users.owner.userId, 10 * DAY);
      await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, milestone: 'day3', score: 9 },
      });
      expect(await promptOf(a)).toBe('week1');
    });

    it('is null for a demo user and before onboarding', async () => {
      await signUpAgo(users.owner.userId, 10 * DAY, { isDemo: true });
      expect(await promptOf(a)).toBeNull();
      await signUpAgo(users.owner.userId, 10 * DAY, { onboardingCompletedAt: null });
      expect(await promptOf(a)).toBeNull();
    });

    it('is never cached', async () => {
      const res = await a.get(PROMPT).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('is a 401 for an anonymous caller', async () => {
      await anonymous(t.app).get(PROMPT).expect(401);
    });
  });

  describe('POST record', () => {
    it('creates the row on the first write and answers 204 without a body', async () => {
      const res = await send(a, { milestone: 'day3', score: 6, comment: '  needs tags  ' });
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      expect(await rows(users.owner.userId)).toMatchObject([
        { milestone: 'day3', score: 6, comment: 'needs tags' },
      ]);
    });

    it('records "not now" with a null score and no comment', async () => {
      await send(a, { milestone: 'week1', score: null }).expect(204);
      expect(await rows(users.owner.userId)).toMatchObject([{ score: null, comment: null }]);
    });

    it('treats a blank comment as absent, also with a null score', async () => {
      await send(a, { milestone: 'day3', score: null, comment: '   ' }).expect(204);
      await send(a, { milestone: 'week1', score: 5, comment: '' }).expect(204);
      expect(await rows(users.owner.userId)).toMatchObject([
        { milestone: 'day3', comment: null },
        { milestone: 'week1', comment: null },
      ]);
    });

    it('accepts tab, LF and CR in the comment', async () => {
      await send(a, { milestone: 'day3', score: 4, comment: 'a\tb\nc\r\nd' }).expect(204);
      expect((await rows(users.owner.userId))[0]?.comment).toBe('a\tb\nc\r\nd');
    });

    describe('validation', () => {
      it.each([
        ['an unknown milestone', { milestone: 'day4', score: 5 }],
        ['a missing milestone', { score: 5 }],
        ['a missing score key', { milestone: 'day3' }],
        ['score 0', { milestone: 'day3', score: 0 }],
        ['score 11', { milestone: 'day3', score: 11 }],
        ['a fractional score', { milestone: 'day3', score: 5.5 }],
        ['a string score', { milestone: 'day3', score: '5' }],
        ['a comment with a null score', { milestone: 'day3', score: null, comment: 'hi' }],
        ['a non-string comment', { milestone: 'day3', score: 5, comment: 12 }],
        ['a comment over the limit', { milestone: 'day3', score: 5, comment: 'x'.repeat(2001) }],
        ['NUL in the comment', { milestone: 'day3', score: 5, comment: 'a\u0000b' }],
        ['ESC in the comment', { milestone: 'day3', score: 5, comment: 'a\u001bb' }],
        ['an unknown field', { milestone: 'day3', score: 5, userId: 'x' }],
      ])('rejects %s with 400', async (_label, body) => {
        const res = await send(a, body).expect(400);
        expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
        expect(await t.db.prisma.feedback.count()).toBe(0);
      });

      it('accepts a comment of exactly the limit', async () => {
        await send(a, {
          milestone: 'day3',
          score: 3,
          comment: 'x'.repeat(FEEDBACK_LIMIT.CommentMax),
        }).expect(204);
      });
    });

    describe('who may write', () => {
      it('403 for a demo user', async () => {
        await signUpAgo(users.owner.userId, 10 * DAY, { isDemo: true });
        const res = await send(a, { milestone: 'day3', score: 5 }).expect(403);
        expect(res.body).toMatchObject({ message: FEEDBACK_ERROR_MESSAGE.DemoUser });
        expect(await t.db.prisma.feedback.count()).toBe(0);
      });

      it('409 while onboarding is pending', async () => {
        await signUpAgo(users.owner.userId, 10 * DAY, { onboardingCompletedAt: null });
        const res = await send(a, { milestone: 'day3', score: 5 }).expect(409);
        expect(res.body).toMatchObject({ message: FEEDBACK_ERROR_MESSAGE.OnboardingPending });
      });

      it('409 for a milestone not reached yet, 204 exactly at the boundary', async () => {
        await signUpAgo(users.owner.userId, 7 * DAY - 1);
        const res = await send(a, { milestone: 'week1', score: 5 }).expect(409);
        expect(res.body).toMatchObject({ message: FEEDBACK_ERROR_MESSAGE.MilestoneNotReached });
        await signUpAgo(users.owner.userId, 7 * DAY);
        await send(a, { milestone: 'week1', score: 5 }).expect(204);
      });

      it('401 for an anonymous caller and 403 for a foreign Origin', async () => {
        await send(anonymous(t.app), { milestone: 'day3', score: 5 }).expect(401);
        const res = await a
          .post(RECORD)
          .set('Origin', 'https://evil.test')
          .send({ milestone: 'day3', score: 5 });
        expect(res.status).toBe(403);
        expect(await t.db.prisma.feedback.count()).toBe(0);
      });

      it('429 after 10 writes in a minute', async () => {
        for (let i = 0; i < 10; i++) {
          await send(a, { milestone: 'day3', score: null }).expect(204);
        }
        const res = await send(a, { milestone: 'day3', score: null }).expect(429);
        expect(res.body).toMatchObject({ statusCode: 429 });
      });
    });

    describe('a repeat for the same milestone', () => {
      it('appends the comment after a blank line, the score stays', async () => {
        await send(a, { milestone: 'day3', score: 4 }).expect(204);
        await send(a, { milestone: 'day3', score: 4, comment: 'first' }).expect(204);
        await send(a, { milestone: 'day3', score: 4, comment: 'second' }).expect(204);
        expect(await rows(users.owner.userId)).toMatchObject([
          { score: 4, comment: 'first\n\nsecond' },
        ]);
      });

      it('changes nothing without a comment', async () => {
        await send(a, { milestone: 'day3', score: 4, comment: 'kept' }).expect(204);
        await send(a, { milestone: 'day3', score: 4 }).expect(204);
        expect(await rows(users.owner.userId)).toMatchObject([{ comment: 'kept' }]);
      });

      it('409 for a different score, nothing changes', async () => {
        await send(a, { milestone: 'day3', score: 4, comment: 'c' }).expect(204);
        await send(a, { milestone: 'day3', score: 9, comment: 'd' }).expect(409);
        await send(a, { milestone: 'day3', score: null }).expect(409);
        expect(await rows(users.owner.userId)).toMatchObject([{ score: 4, comment: 'c' }]);
      });

      it('400 when the combined comment is over the limit, nothing changes', async () => {
        await send(a, { milestone: 'day3', score: 4, comment: 'x'.repeat(1500) }).expect(204);
        const res = await send(a, {
          milestone: 'day3',
          score: 4,
          comment: 'y'.repeat(1500),
        }).expect(400);
        expect(res.body).toMatchObject({ message: FEEDBACK_ERROR_MESSAGE.CommentTooLong });
        expect((await rows(users.owner.userId))[0]?.comment).toHaveLength(1500);
      });

      it('two parallel first writes make one row and keep both comments', async () => {
        for (const milestone of ['day3', 'week1'] as const) {
          const [first, second] = await Promise.all([
            send(a, { milestone, score: 5, comment: 'one' }),
            send(a, { milestone, score: 5, comment: 'two' }),
          ]);
          expect([first.status, second.status]).toEqual([204, 204]);
        }
        const saved = await rows(users.owner.userId);
        expect(saved).toHaveLength(2);
        for (const row of saved) {
          expect(['one\n\ntwo', 'two\n\none']).toContain(row.comment);
        }
      });
    });
  });

  describe('data isolation', () => {
    it("A's row never hides B's prompt, and B cannot touch A's row", async () => {
      await send(a, { milestone: 'year1', score: 3, comment: 'secret-a' }).expect(204);
      expect(await promptOf(a)).toBeNull();
      expect(await promptOf(b)).toBe('year1');

      const before = await rows(users.owner.userId);
      // B writes the same milestone with another score: B gets its own row, A's row is untouched.
      const res = await send(b, { milestone: 'year1', score: 9, comment: 'from-b' }).expect(204);
      expect(res.text).toBe('');
      expect(await rows(users.owner.userId)).toEqual(before);
      expect(await rows(users.intruder.userId)).toMatchObject([{ score: 9, comment: 'from-b' }]);
    });

    it("A's comment never appears in B's responses", async () => {
      await send(a, { milestone: 'year1', score: 3, comment: 'secret-a' }).expect(204);
      const responses = [
        await b.get(PROMPT),
        await send(b, { milestone: 'year1', score: 3, comment: 'b' }),
        await send(b, { milestone: 'year1', score: 8 }),
      ];
      for (const response of responses) {
        expect(JSON.stringify(response.body) + response.text).not.toContain('secret-a');
      }
      expect((await rows(users.owner.userId))[0]?.comment).toBe('secret-a');
    });

    it('a user id in the body is rejected, not trusted', async () => {
      await send(b, {
        milestone: 'year1',
        score: 2,
        userId: users.owner.userId,
      }).expect(400);
      expect(await rows(users.owner.userId)).toHaveLength(0);
    });
  });

  it('deleting the user deletes their rows only', async () => {
    await send(a, { milestone: 'day3', score: 5, comment: 'x' }).expect(204);
    await send(b, { milestone: 'day3', score: 5 }).expect(204);
    await t.db.prisma.user.delete({ where: { id: users.owner.userId } });
    expect(await rows(users.owner.userId)).toHaveLength(0);
    expect(await rows(users.intruder.userId)).toHaveLength(1);
  });
});
