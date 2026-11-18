import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

describe('AI schema (#389)', () => {
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

  const createLink = (userId: string) =>
    database.prisma.link.create({
      data: {
        userId,
        url: 'https://example.test/a',
        normalizedUrl: 'https://example.test/a',
        title: 'Example',
        titleSortKey: 'example',
      },
    });

  it('defaults the plan to free without an AI pack, and AI settings to off', async () => {
    const user = await createUser();
    expect(user.plan).toBe('free');
    expect(user.aiPack).toBe(false);
    const settings = await database.prisma.aiSettings.create({ data: { userId: user.id } });
    expect(settings).toMatchObject({
      enabled: false,
      folderMode: 'suggest',
      tagsMode: 'suggest',
      summaries: true,
      includeNotes: false,
      summaryLanguage: 'app',
      backfillState: 'idle',
      enabledAt: null,
      introSeenAt: null,
      announcementSeenAt: null,
    });
  });

  it('rejects values outside the allow-lists', async () => {
    const user = await createUser();
    await expect(
      database.prisma.user.update({ where: { id: user.id }, data: { plan: 'gold' } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.aiSettings.create({ data: { userId: user.id, folderMode: 'maybe' } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.aiSettings.create({ data: { userId: user.id, summaryLanguage: 'xx' } }),
    ).rejects.toThrow();
  });

  it('keeps summary and summary source together', async () => {
    const user = await createUser();
    const link = await createLink(user.id);
    await expect(
      database.prisma.link.update({ where: { id: link.id }, data: { summary: 'Text' } }),
    ).rejects.toThrow();
    const updated = await database.prisma.link.update({
      where: { id: link.id },
      data: { summary: 'Text', summarySource: 'ai', aiStatus: 'done' },
    });
    expect(updated.summarySource).toBe('ai');
    await expect(
      database.prisma.link.update({
        where: { id: link.id },
        data: { summary: 'Text', summarySource: 'bot' },
      }),
    ).rejects.toThrow();
  });

  it('counts usage per user and month and only on the first day of a month', async () => {
    const user = await createUser();
    await database.prisma.aiUsage.create({
      data: { userId: user.id, month: new Date('2026-11-01'), links: 3 },
    });
    await expect(
      database.prisma.aiUsage.create({ data: { userId: user.id, month: new Date('2026-12-15') } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.aiUsage.create({ data: { userId: user.id, month: new Date('2026-11-01') } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('needs a link for every job except a draft, and keeps drafts unique per user', async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    const draftId = '01990000-0000-7000-8000-000000000001';
    await expect(
      database.prisma.aiJob.create({
        data: { userId: ada.id, source: 'save', parts: ['tags'], language: 'en' },
      }),
    ).rejects.toThrow();
    await database.prisma.aiJob.create({
      data: { userId: ada.id, source: 'draft', draftId, parts: ['tags'], language: 'en' },
    });
    await expect(
      database.prisma.aiJob.create({
        data: { userId: ada.id, source: 'draft', draftId, parts: ['tags'], language: 'en' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    // The same draft id is fine for another user.
    await database.prisma.aiJob.create({
      data: { userId: bob.id, source: 'draft', draftId, parts: ['tags'], language: 'en' },
    });
  });

  it("refuses a job that points at another user's link", async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    const link = await createLink(ada.id);
    await expect(
      database.prisma.aiJob.create({
        data: { userId: bob.id, linkId: link.id, source: 'save', parts: ['tags'], language: 'en' },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects unknown parts, statuses and reasons', async () => {
    const user = await createUser();
    const link = await createLink(user.id);
    const base = { userId: user.id, linkId: link.id, source: 'save', language: 'en' };
    await expect(
      database.prisma.aiJob.create({ data: { ...base, parts: ['everything'] } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.aiJob.create({ data: { ...base, parts: ['tags'], status: 'weird' } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.aiJob.create({ data: { ...base, parts: ['tags'], reason: 'bored' } }),
    ).rejects.toThrow();
  });

  it('holds exactly one of tag name and folder per suggestion kind', async () => {
    const user = await createUser();
    const link = await createLink(user.id);
    const folder = await database.prisma.folder.create({ data: { userId: user.id, name: 'Dev' } });
    const base = { userId: user.id, linkId: link.id };
    await database.prisma.linkSuggestion.create({ data: { ...base, kind: 'tag', tagName: 'css' } });
    await database.prisma.linkSuggestion.create({
      data: { ...base, kind: 'folder', folderId: folder.id },
    });
    await expect(
      database.prisma.linkSuggestion.create({ data: { ...base, kind: 'tag' } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.linkSuggestion.create({
        data: { ...base, kind: 'folder', folderId: folder.id, tagName: 'x' },
      }),
    ).rejects.toThrow();
    // One suggestion per link and tag.
    await expect(
      database.prisma.linkSuggestion.create({ data: { ...base, kind: 'new-tag', tagName: 'css' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it("refuses a suggestion for another user's folder and cascades with the link and the user", async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    const link = await createLink(ada.id);
    const bobsFolder = await database.prisma.folder.create({
      data: { userId: bob.id, name: 'Bob' },
    });
    await expect(
      database.prisma.linkSuggestion.create({
        data: { userId: ada.id, linkId: link.id, kind: 'folder', folderId: bobsFolder.id },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });

    await database.prisma.linkSuggestion.create({
      data: { userId: ada.id, linkId: link.id, kind: 'tag', tagName: 'css' },
    });
    await database.prisma.aiJob.create({
      data: { userId: ada.id, linkId: link.id, source: 'save', parts: ['tags'], language: 'en' },
    });
    await database.prisma.aiSettings.create({ data: { userId: ada.id } });
    await database.prisma.link.delete({ where: { id: link.id } });
    expect(await database.prisma.linkSuggestion.count()).toBe(0);
    expect(await database.prisma.aiJob.count()).toBe(0);

    await database.prisma.user.delete({ where: { id: ada.id } });
    expect(await database.prisma.aiSettings.count()).toBe(0);
  });

  it('keeps the batch id unique and nulls it on a job when the batch goes', async () => {
    const user = await createUser();
    const link = await createLink(user.id);
    const batch = await database.prisma.aiBatch.create({
      data: { userId: user.id, provider: 'mock', providerBatchId: 'b-1', requestCount: 1 },
    });
    await expect(
      database.prisma.aiBatch.create({
        data: { userId: user.id, provider: 'mock', providerBatchId: 'b-1', requestCount: 1 },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const job = await database.prisma.aiJob.create({
      data: {
        userId: user.id,
        linkId: link.id,
        batchId: batch.id,
        source: 'backfill',
        parts: ['summary'],
        language: 'en',
      },
    });
    await database.prisma.aiBatch.delete({ where: { id: batch.id } });
    expect(
      (await database.prisma.aiJob.findUniqueOrThrow({ where: { id: job.id } })).batchId,
    ).toBeNull();
  });
});
