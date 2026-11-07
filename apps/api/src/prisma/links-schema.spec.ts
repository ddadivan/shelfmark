import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Library schema (links, folders, tags)', () => {
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

  const linkData = (userId: string, overrides: Record<string, unknown> = {}) => ({
    userId,
    url: 'https://example.test/a',
    normalizedUrl: 'https://example.test/a',
    title: 'Example',
    ...overrides,
  });

  it('adds onboarding and demo columns to users, null by default', async () => {
    const user = await createUser();
    expect(user.onboardingCompletedAt).toBeNull();
    expect(user.demoExpiresAt).toBeNull();
  });

  it('creates a link with defaults and a UUID v7 id', async () => {
    const user = await createUser();
    const link = await database.prisma.link.create({ data: linkData(user.id) });
    expect(link.id).toMatch(UUID_V7);
    expect(link.isFavorite).toBe(false);
    expect(link.folderId).toBeNull();
    expect(link.note).toBeNull();
    expect(link.lastOpenedAt).toBeNull();
    expect(link.createdAt).toBeInstanceOf(Date);
  });

  it('allows duplicate normalized urls for one user', async () => {
    const user = await createUser();
    await database.prisma.link.create({ data: linkData(user.id) });
    await database.prisma.link.create({ data: linkData(user.id) });
    expect(await database.prisma.link.count()).toBe(2);
  });

  it('keeps tag names unique per user but not across users', async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    await database.prisma.tag.create({ data: { userId: ada.id, name: 'read-later' } });
    await expect(
      database.prisma.tag.create({ data: { userId: ada.id, name: 'read-later' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const other = await database.prisma.tag.create({
      data: { userId: bob.id, name: 'read-later' },
    });
    expect(other.id).toMatch(UUID_V7);
  });

  it('cascades the deletion of a user to folders, links, tags and link tags', async () => {
    const user = await createUser();
    const folder = await database.prisma.folder.create({
      data: { userId: user.id, name: 'Dev' },
    });
    const link = await database.prisma.link.create({
      data: linkData(user.id, { folderId: folder.id }),
    });
    const tag = await database.prisma.tag.create({ data: { userId: user.id, name: 'ts' } });
    await database.prisma.linkTag.create({ data: { linkId: link.id, tagId: tag.id } });

    await database.prisma.user.delete({ where: { id: user.id } });

    expect(await database.prisma.folder.count()).toBe(0);
    expect(await database.prisma.link.count()).toBe(0);
    expect(await database.prisma.tag.count()).toBe(0);
    expect(await database.prisma.linkTag.count()).toBe(0);
  });

  it('deletes subfolders with their parent and moves links to Unsorted', async () => {
    const user = await createUser();
    const parent = await database.prisma.folder.create({
      data: { userId: user.id, name: 'Parent' },
    });
    const child = await database.prisma.folder.create({
      data: { userId: user.id, name: 'Child', parentId: parent.id },
    });
    const link = await database.prisma.link.create({
      data: linkData(user.id, { folderId: child.id }),
    });

    await database.prisma.folder.delete({ where: { id: parent.id } });

    expect(await database.prisma.folder.count()).toBe(0);
    const kept = await database.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    expect(kept.folderId).toBeNull();
    expect(kept.userId).toBe(user.id);
  });

  it('uses a composite primary key on link tags and cascades from link and tag', async () => {
    const user = await createUser();
    const link = await database.prisma.link.create({ data: linkData(user.id) });
    const tagA = await database.prisma.tag.create({ data: { userId: user.id, name: 'a' } });
    const tagB = await database.prisma.tag.create({ data: { userId: user.id, name: 'b' } });
    await database.prisma.linkTag.createMany({
      data: [
        { linkId: link.id, tagId: tagA.id },
        { linkId: link.id, tagId: tagB.id },
      ],
    });
    await expect(
      database.prisma.linkTag.create({ data: { linkId: link.id, tagId: tagA.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await database.prisma.tag.delete({ where: { id: tagA.id } });
    expect(await database.prisma.linkTag.count()).toBe(1);
    await database.prisma.link.delete({ where: { id: link.id } });
    expect(await database.prisma.linkTag.count()).toBe(0);
    expect(await database.prisma.tag.count()).toBe(1);
  });

  it('rejects references to missing rows', async () => {
    const user = await createUser();
    const missing = '01990000-0000-7000-8000-000000000000';
    await expect(
      database.prisma.link.create({ data: linkData(user.id, { folderId: missing }) }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      database.prisma.folder.create({ data: { userId: user.id, name: 'x', parentId: missing } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects values over the column limits', async () => {
    const user = await createUser();
    await expect(
      database.prisma.link.create({ data: linkData(user.id, { title: 't'.repeat(301) }) }),
    ).rejects.toThrow();
    await expect(
      database.prisma.link.create({ data: linkData(user.id, { url: 'u'.repeat(2049) }) }),
    ).rejects.toThrow();
    await expect(
      database.prisma.link.create({ data: linkData(user.id, { note: 'n'.repeat(2001) }) }),
    ).rejects.toThrow();
    await expect(
      database.prisma.folder.create({ data: { userId: user.id, name: 'f'.repeat(101) } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.tag.create({ data: { userId: user.id, name: 't'.repeat(51) } }),
    ).rejects.toThrow();
    await database.prisma.link.create({
      data: linkData(user.id, { title: 't'.repeat(300), note: 'n'.repeat(2000) }),
    });
  });

  it('creates the specified indexes', async () => {
    const rows = await database.prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`;
    const defs = rows.map((row) => row.indexdef);
    const has = (fragment: string) => defs.some((def) => def.includes(fragment));
    expect(has('ON public.links USING btree (user_id, created_at)')).toBe(true);
    expect(has('ON public.links USING btree (user_id, normalized_url)')).toBe(true);
    expect(has('ON public.links USING btree (user_id, last_opened_at)')).toBe(true);
    expect(has('ON public.folders USING btree (user_id, parent_id)')).toBe(true);
    expect(
      has('UNIQUE INDEX tags_user_id_name_key ON public.tags USING btree (user_id, name)'),
    ).toBe(true);
    expect(has('ON public.links USING gin (title gin_trgm_ops)')).toBe(true);
    expect(has('UNIQUE INDEX links_user_id_normalized_url')).toBe(false);
  });

  it('serves ILIKE and similarity searches from the trigram index', async () => {
    const user = await createUser();
    await database.prisma.link.createMany({
      data: [
        linkData(user.id, { title: 'Learning TypeScript' }),
        linkData(user.id, { title: 'Cooking pasta' }),
      ],
    });
    const hits = await database.prisma.$queryRaw<{ title: string }[]>`
      SELECT title FROM links WHERE title ILIKE ${'%script%'}`;
    expect(hits.map((row) => row.title)).toEqual(['Learning TypeScript']);
    const similar = await database.prisma.$queryRaw<{ title: string }[]>`
      SELECT title FROM links WHERE similarity(title, ${'typescript'}) > 0.2`;
    expect(similar).toHaveLength(1);

    const plan = await database.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
      return tx.$queryRaw<{ 'QUERY PLAN': string }[]>`
        EXPLAIN SELECT id FROM links WHERE title ILIKE ${'%script%'}`;
    });
    expect(plan.map((row) => row['QUERY PLAN']).join('\n')).toContain('links_title_trgm_idx');
  });
});
