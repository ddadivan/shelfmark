import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

describe('Ask and Rediscover schema (AI-4, ADR 0051)', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.truncateAll();
  });

  afterAll(async () => {
    await database.close();
  });

  const createUser = (email = 'ada@example.test') =>
    database.prisma.user.create({ data: { name: 'Ada', email } });

  const createLink = (userId: string, url = 'https://example.test/a') =>
    database.prisma.link.create({
      data: { userId, url, normalizedUrl: url, title: 'Example', titleSortKey: 'example' },
    });

  it('turns Ask on by default with no lease', async () => {
    const user = await createUser();
    const settings = await database.prisma.aiSettings.create({ data: { userId: user.id } });
    expect(settings.ask).toBe(true);
    expect(settings.askLeaseUntil).toBeNull();
  });

  it('counts questions per user and UTC day, never below zero', async () => {
    const user = await createUser();
    const day = new Date('2026-11-17T00:00:00.000Z');
    const row = await database.prisma.aiAskUsage.create({ data: { userId: user.id, day } });
    expect(row.questions).toBe(0);
    await expect(
      database.prisma.aiAskUsage.create({ data: { userId: user.id, day } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      database.prisma.aiAskUsage.update({
        where: { userId_day: { userId: user.id, day } },
        data: { questions: -1 },
      }),
    ).rejects.toThrow();
  });

  it('hides a link once per user and only a link of the same user', async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    const link = await createLink(ada.id);
    await database.prisma.rediscoverHidden.create({ data: { userId: ada.id, linkId: link.id } });
    await expect(
      database.prisma.rediscoverHidden.create({ data: { userId: ada.id, linkId: link.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      database.prisma.rediscoverHidden.create({ data: { userId: bob.id, linkId: link.id } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('keeps the dismissed week to the ISO week shape', async () => {
    const user = await createUser();
    const state = await database.prisma.rediscoverState.create({
      data: { userId: user.id, dismissedWeek: '2026-W47' },
    });
    expect(state.dismissedWeek).toBe('2026-W47');
    await expect(
      database.prisma.rediscoverState.update({
        where: { userId: user.id },
        data: { dismissedWeek: '2026-47x' },
      }),
    ).rejects.toThrow();
  });

  it('cascades with the link and with the user', async () => {
    const user = await createUser();
    const kept = await createLink(user.id, 'https://example.test/kept');
    const gone = await createLink(user.id, 'https://example.test/gone');
    await database.prisma.rediscoverHidden.createMany({
      data: [
        { userId: user.id, linkId: kept.id },
        { userId: user.id, linkId: gone.id },
      ],
    });
    await database.prisma.link.delete({ where: { id: gone.id } });
    expect(await database.prisma.rediscoverHidden.count()).toBe(1);

    await database.prisma.aiAskUsage.create({
      data: { userId: user.id, day: new Date('2026-11-17T00:00:00.000Z'), questions: 2 },
    });
    await database.prisma.rediscoverState.create({
      data: { userId: user.id, dismissedWeek: '2026-W47' },
    });
    await database.prisma.user.delete({ where: { id: user.id } });
    expect(await database.prisma.rediscoverHidden.count()).toBe(0);
    expect(await database.prisma.aiAskUsage.count()).toBe(0);
    expect(await database.prisma.rediscoverState.count()).toBe(0);
  });
});
