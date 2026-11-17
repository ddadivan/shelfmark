import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { vector } from '@electric-sql/pglite-pgvector';
import { createTestDatabase, migrationFiles } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

const EMBEDDINGS_MIGRATION = '20261128120000_ai_embeddings';

/** A 1,024-dimension vector literal with `1` at `hot` (a unit vector). */
function unit(hot: number): string {
  return `[${Array.from({ length: 1024 }, (_, i) => (i === hot ? 1 : 0)).join(',')}]`;
}

describe('link embeddings schema (AI-3, ADR 0050)', () => {
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

  const createLink = (userId: string, path = 'a') =>
    database.prisma.link.create({
      data: {
        userId,
        url: `https://example.test/${path}`,
        normalizedUrl: `https://example.test/${path}`,
        title: 'Example',
        titleSortKey: 'example',
      },
    });

  const insertEmbedding = (linkId: string, userId: string, hot = 0, model = 'mock-embed') =>
    database.prisma.$executeRaw`
      INSERT INTO link_embeddings (link_id, user_id, model, with_note, input_hash, embedding)
      VALUES (${linkId}::uuid, ${userId}::uuid, ${model}, false, ${'0'.repeat(64)},
        ${unit(hot)}::halfvec)`;

  it('runs pgvector 0.8 or newer', async () => {
    const rows = await database.prisma.$queryRaw<{ extversion: string }[]>`
      SELECT extversion FROM pg_extension WHERE extname = 'vector'`;
    const [major, minor] = (rows[0]?.extversion ?? '0.0').split('.').map(Number);
    expect((major ?? 0) * 100 + (minor ?? 0)).toBeGreaterThanOrEqual(8);
  });

  it('defaults the AI-3 columns', async () => {
    const user = await createUser();
    const settings = await database.prisma.aiSettings.create({ data: { userId: user.id } });
    expect(settings).toMatchObject({
      meaningSearch: true,
      embedLeaseUntil: null,
      embedNotBefore: null,
      embedFailures: 0,
      embedFailedAt: null,
    });
    const usage = await database.prisma.aiUsage.create({
      data: { userId: user.id, month: new Date('2026-11-01T00:00:00Z') },
    });
    expect(usage).toMatchObject({ links: 0, embeds: 0, searchQueries: 0 });
  });

  it('stores a halfvec(1024) and orders by cosine distance', async () => {
    const user = await createUser();
    const near = await createLink(user.id, 'near');
    const far = await createLink(user.id, 'far');
    await insertEmbedding(near.id, user.id, 0);
    await insertEmbedding(far.id, user.id, 1);
    const rows = await database.prisma.$queryRaw<{ linkId: string; distance: number }[]>`
      SELECT link_id::text AS "linkId", (embedding <=> ${unit(0)}::halfvec)::float8 AS distance
      FROM link_embeddings WHERE user_id = ${user.id}::uuid AND model <> ''
      ORDER BY embedding <=> ${unit(0)}::halfvec`;
    expect(rows.map((row) => row.linkId)).toEqual([near.id, far.id]);
    expect(rows[0]?.distance).toBeCloseTo(0);
    expect(rows[1]?.distance).toBeCloseTo(1);
    const row = await database.prisma.linkEmbedding.findUniqueOrThrow({
      where: { linkId: near.id },
      select: { stale: true, withNote: true, model: true },
    });
    expect(row).toEqual({ stale: false, withNote: false, model: 'mock-embed' });
  });

  it('refuses another dimension count, an empty model and a link of another user', async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    const link = await createLink(ada.id);
    await expect(database.prisma.$executeRaw`
      INSERT INTO link_embeddings (link_id, user_id, model, with_note, input_hash, embedding)
      VALUES (${link.id}::uuid, ${ada.id}::uuid, 'mock-embed', false, ${'0'.repeat(64)},
        '[1,0,0]'::halfvec)`).rejects.toThrow();
    await expect(insertEmbedding(link.id, ada.id, 0, '')).rejects.toThrow();
    await expect(insertEmbedding(link.id, bob.id)).rejects.toThrow();
    expect(await database.prisma.linkEmbedding.count()).toBe(0);
  });

  it('cascades with the link and with the user', async () => {
    const ada = await createUser();
    const first = await createLink(ada.id, 'one');
    const second = await createLink(ada.id, 'two');
    await insertEmbedding(first.id, ada.id);
    await insertEmbedding(second.id, ada.id, 1);
    await database.prisma.link.delete({ where: { id: first.id } });
    expect(await database.prisma.linkEmbedding.count()).toBe(1);
    await database.prisma.user.delete({ where: { id: ada.id } });
    expect(await database.prisma.linkEmbedding.count()).toBe(0);
  });

  it('keeps the HNSW cosine index and the user index', async () => {
    const rows = await database.prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'link_embeddings'
      ORDER BY indexname`;
    const hnsw = rows.find((row) => row.indexname === 'link_embeddings_embedding_hnsw_idx');
    expect(hnsw?.indexdef).toContain('USING hnsw (embedding halfvec_cosine_ops)');
    expect(hnsw?.indexdef).toContain("m='16'");
    expect(hnsw?.indexdef).toContain("ef_construction='64'");
    expect(rows.map((row) => row.indexname)).toContain('link_embeddings_user_id_stale_idx');
  });

  it('turns search by meaning off for settings rows that existed before AI-3', async () => {
    const db = await PGlite.create({ extensions: { pg_trgm, vector } });
    try {
      const files = migrationFiles();
      const at = files.findIndex((file) => file.includes(EMBEDDINGS_MIGRATION));
      expect(at).toBeGreaterThan(0);
      for (const file of files.slice(0, at)) await db.exec(readFileSync(file, 'utf8'));
      await db.exec(`
        INSERT INTO users (id, name, email, updated_at)
        VALUES ('00000000-0000-7000-8000-000000000001', 'Ada', 'ada@example.test', now());
        INSERT INTO ai_settings (user_id, enabled, updated_at)
        VALUES ('00000000-0000-7000-8000-000000000001', true, now());`);
      for (const file of files.slice(at)) await db.exec(readFileSync(file, 'utf8'));
      const { rows } = await db.query<{ meaning_search: boolean }>(
        'SELECT meaning_search FROM ai_settings',
      );
      expect(rows).toEqual([{ meaning_search: false }]);
    } finally {
      await db.close();
    }
  });
});
