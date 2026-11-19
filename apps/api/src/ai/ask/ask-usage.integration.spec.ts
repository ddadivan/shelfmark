import { AI_QUOTA, AI_TIER } from '@shelfmark/contracts';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import { AskUsageService, askDay } from './ask-usage.service';

const NOW = new Date('2026-11-19T10:00:00Z');

describe('AskUsageService deep counter (ADR 0055)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let usage: AskUsageService;

  beforeAll(async () => {
    t = await createAuthTestApp();
    usage = t.app.get(AskUsageService);
  });

  beforeEach(async () => {
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const row = async (userId: string, day: string = askDay(NOW)) =>
    t.db.prisma.aiAskUsage.findUnique({
      where: { userId_day: { userId, day: new Date(`${day}T00:00:00Z`) } },
    });

  it('counts a deeper answer on the day of its question, inside the question count', async () => {
    const userId = users.owner.userId;
    const day = await usage.reserve(userId, AI_TIER.AiPack, NOW);
    expect(day).toBe('2026-11-19');
    expect(await usage.reserveDeep(userId, AI_TIER.AiPack, day ?? '', NOW)).toBe(true);
    expect(await row(userId)).toMatchObject({ questions: 1, deep: 1 });
    // At most one deeper answer per counted question.
    expect(await usage.reserveDeep(userId, AI_TIER.AiPack, day ?? '', NOW)).toBe(false);
  });

  it('stops at the daily deep limit of the tier', async () => {
    const userId = users.owner.userId;
    const limit = AI_QUOTA[AI_TIER.AiPack].deepQuestionsPerDay;
    for (let i = 0; i < limit; i += 1) {
      const day = await usage.reserve(userId, AI_TIER.AiPack, NOW);
      expect(await usage.reserveDeep(userId, AI_TIER.AiPack, day ?? '', NOW)).toBe(true);
    }
    const day = await usage.reserve(userId, AI_TIER.AiPack, NOW);
    expect(await usage.reserveDeep(userId, AI_TIER.AiPack, day ?? '', NOW)).toBe(false);
    expect(await row(userId)).toMatchObject({ questions: limit + 1, deep: limit });
  });

  it('stops at the monthly deep limit across the days of the UTC month', async () => {
    const userId = users.owner.userId;
    const monthly = AI_QUOTA[AI_TIER.AiPack].deepQuestionsPerMonth;
    await t.db.prisma.aiAskUsage.create({
      data: {
        userId,
        day: new Date('2026-11-02T00:00:00Z'),
        questions: monthly,
        deep: monthly,
      },
    });
    // Last month's deep answers do not count.
    await t.db.prisma.aiAskUsage.create({
      data: { userId, day: new Date('2026-10-30T00:00:00Z'), questions: 5, deep: 5 },
    });
    const day = await usage.reserve(userId, AI_TIER.AiPack, NOW);
    expect(await usage.reserveDeep(userId, AI_TIER.AiPack, day ?? '', NOW)).toBe(false);
  });

  it('refunds a deeper answer alone or together with its question', async () => {
    const userId = users.owner.userId;
    const day = (await usage.reserve(userId, AI_TIER.AiPack, NOW)) ?? '';
    await usage.reserveDeep(userId, AI_TIER.AiPack, day, NOW);
    await usage.refundDeep(userId, day);
    expect(await row(userId)).toMatchObject({ questions: 1, deep: 0 });
    await usage.refundDeep(userId, day);
    expect(await row(userId)).toMatchObject({ deep: 0 });
    await usage.reserveDeep(userId, AI_TIER.AiPack, day, NOW);
    await usage.refund(userId, day);
    expect(await row(userId)).toMatchObject({ questions: 0, deep: 0 });
  });

  it("never moves another user's counters (data isolation)", async () => {
    const owner = users.owner.userId;
    const intruder = users.intruder.userId;
    const day = (await usage.reserve(owner, AI_TIER.AiPack, NOW)) ?? '';
    await usage.reserveDeep(owner, AI_TIER.AiPack, day, NOW);
    // The intruder has no question today: nothing to count a deeper answer on.
    expect(await usage.reserveDeep(intruder, AI_TIER.AiPack, day, NOW)).toBe(false);
    await usage.refundDeep(intruder, day);
    await usage.refund(intruder, day);
    expect(await row(owner)).toMatchObject({ questions: 1, deep: 1 });
    expect(await row(intruder)).toBeNull();
  });

  it('gives Free deeper answers inside its five questions', async () => {
    const userId = users.owner.userId;
    const free = AI_QUOTA[AI_TIER.Free];
    expect(free.deepQuestionsPerMonth).toBeLessThanOrEqual(free.questionsPerMonth);
    const day = (await usage.reserve(userId, AI_TIER.Free, NOW)) ?? '';
    expect(await usage.reserveDeep(userId, AI_TIER.Free, day, NOW)).toBe(true);
  });
});
