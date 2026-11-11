import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { migrationFiles } from '../../test-utils/test-database';

const MIGRATION = '20261111120000_link_kind_saved_views';

/**
 * The expand migration of #264 on a database that already holds data: the host backfill of
 * `links.kind`, the starter views of existing users and the trigger for new ones.
 */
describe(`migration ${MIGRATION}`, () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await PGlite.create({ extensions: { pg_trgm } });
    const files = migrationFiles();
    const index = files.findIndex((file) => file.includes(MIGRATION));
    expect(index).toBeGreaterThan(0);
    for (const file of files.slice(0, index)) await db.exec(readFileSync(file, 'utf8'));

    await db.exec(`
      INSERT INTO users (id, name, email, updated_at)
      VALUES ('0193a3a0-0000-7000-8000-000000000001', 'Old', 'old@example.test', now());
    `);
    const urls = [
      'https://www.youtube.com/watch?v=1',
      'https://youtu.be/abc',
      'http://user:pw@VIMEO.com:443/1',
      'https://www.amazon.de/dp/1',
      'https://shop.etsy.com./x',
      'https://notyoutube.com/x',
      'https://example.com/youtube.com',
      'https://[::1]/x',
    ];
    for (const [index, url] of urls.entries()) {
      await db.query(
        `INSERT INTO links (id, user_id, url, normalized_url, title, title_sort_key, updated_at)
         VALUES ($1, '0193a3a0-0000-7000-8000-000000000001', $2, $2, 't', 't', now())`,
        [`0193a3a0-0000-7000-8000-0000000001${String(index).padStart(2, '0')}`, url],
      );
    }
    for (const file of files.slice(index)) await db.exec(readFileSync(file, 'utf8'));
  });

  afterAll(async () => {
    await db.close();
  });

  it('backfills the kind from the host only', async () => {
    const { rows } = await db.query<{ url: string; kind: string }>(
      'SELECT url, kind FROM links ORDER BY id',
    );
    expect(rows.map((row) => row.kind)).toEqual([
      'video',
      'video',
      'video',
      'shopping',
      'shopping',
      'other',
      'other',
      'other',
    ]);
  });

  it('gives existing users the starter views', async () => {
    const { rows } = await db.query<{ name: string; position: number; kind: string }>(
      `SELECT name, position, query->>'kind' AS kind FROM saved_views ORDER BY position`,
    );
    expect(rows).toEqual([
      { name: 'Videos', position: 0, kind: 'video' },
      { name: 'Articles', position: 1, kind: 'article' },
    ]);
  });

  it('gives every new user the starter views through the trigger', async () => {
    await db.exec(`
      INSERT INTO users (id, name, email, updated_at)
      VALUES ('0193a3a0-0000-7000-8000-000000000002', 'New', 'new@example.test', now());
    `);
    const { rows } = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM saved_views WHERE user_id = '0193a3a0-0000-7000-8000-000000000002'`,
    );
    expect(rows[0]?.count).toBe(2);
  });

  it('refuses an unknown kind', async () => {
    await expect(db.exec(`UPDATE links SET kind = 'podcast'`)).rejects.toThrow(/links_kind_check/);
  });
});
