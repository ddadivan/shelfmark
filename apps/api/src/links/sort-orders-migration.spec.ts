import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { vector } from '@electric-sql/pglite-pgvector';
import { linkSiteKey } from '@shelfmark/contracts';
import { migrationFiles } from '../../test-utils/test-database';

const MIGRATION = '20261231100000_sort_orders';

/** The expand migration of the sort orders on a database that already holds links. */
describe(`migration ${MIGRATION}`, () => {
  let db: PGlite;
  const USER = '0193a3a0-0000-7000-8000-000000000001';
  const urls = [
    'https://www.Example.com/a?x=1',
    'http://user:pw@Blog.Example.org:8080/p',
    'https://sub.domain.dev',
    'https://news.site.test/#frag',
  ];

  beforeAll(async () => {
    db = await PGlite.create({ extensions: { pg_trgm, vector } });
    const files = migrationFiles();
    const index = files.findIndex((file) => file.includes(MIGRATION));
    expect(index).toBeGreaterThan(0);
    for (const file of files.slice(0, index)) await db.exec(readFileSync(file, 'utf8'));
    await db.exec(
      `INSERT INTO users (id, name, email, updated_at)
       VALUES ('${USER}', 'Old', 'old@example.test', now());`,
    );
    for (const [position, url] of urls.entries()) {
      await db.query(
        `INSERT INTO links (id, user_id, url, normalized_url, title, title_sort_key, updated_at)
         VALUES ($1, $2, $3, $3, 't', 't', now())`,
        [`0193a3a0-0000-7000-8000-00000000010${position}`, USER, url],
      );
    }
    for (const file of files.slice(index)) await db.exec(readFileSync(file, 'utf8'));
  });

  afterAll(async () => {
    await db.close();
  });

  it('backfills the site of existing links like linkSiteKey', async () => {
    const { rows } = await db.query<{ host: string }>('SELECT host FROM links ORDER BY id');
    expect(rows.map((row) => row.host)).toEqual([
      'example.com',
      'blog.example.org',
      'sub.domain.dev',
      'news.site.test',
    ]);
    expect(urls.slice(0, 4).map(linkSiteKey)).toEqual(rows.slice(0, 4).map((row) => row.host));
  });

  it('accepts every library sort as an account default', async () => {
    const sorts = [
      'newest',
      'oldest',
      'opened',
      'edited',
      'title',
      'titleDesc',
      'site',
      'favorites',
    ];
    for (const sort of sorts) {
      await db.query('UPDATE users SET default_sort = $1', [sort]);
    }
    await expect(db.query(`UPDATE users SET default_sort = 'random'`)).rejects.toThrow();
  });
});
