import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { vector } from '@electric-sql/pglite-pgvector';
import { LINK_KIND } from '@shelfmark/contracts';
import { migrationFiles } from '../../test-utils/test-database';

const MIGRATION = '20261212120000_link_kinds';
const USER = '0193a3a0-0000-7000-8000-000000000001';

/** The CHECK widening of #537 on a database that already holds links of every old kind. */
describe(`migration ${MIGRATION}`, () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await PGlite.create({ extensions: { pg_trgm, vector } });
    const files = migrationFiles();
    const index = files.findIndex((file) => file.includes(MIGRATION));
    expect(index).toBeGreaterThan(0);
    for (const file of files.slice(0, index)) await db.exec(readFileSync(file, 'utf8'));

    await db.exec(`
      INSERT INTO users (id, name, email, updated_at) VALUES ('${USER}', 'Old', 'old@example.test', now());
    `);
    // Old kinds, including a GitHub link saved as `other` before code existed: it must stay `other`.
    const rows = [
      ['https://youtu.be/abc', 'video', false],
      ['https://example.com/post', 'article', false],
      ['https://www.etsy.com/x', 'shopping', true],
      ['https://github.com/angular/angular', 'other', false],
    ] as const;
    for (const [index, [url, kind, byUser]] of rows.entries()) {
      await db.query(
        `INSERT INTO links (id, user_id, url, normalized_url, title, title_sort_key, kind, kind_by_user, updated_at)
         VALUES ($1, '${USER}', $2, $2, 't', 't', $3, $4, now())`,
        [`0193a3a0-0000-7000-8000-0000000001${String(index).padStart(2, '0')}`, url, kind, byUser],
      );
    }
    for (const file of files.slice(index)) await db.exec(readFileSync(file, 'utf8'));
  });

  afterAll(async () => {
    await db.close();
  });

  it('keeps every existing kind and the user flag', async () => {
    const { rows } = await db.query<{ kind: string; kind_by_user: boolean }>(
      'SELECT kind, kind_by_user FROM links ORDER BY id',
    );
    expect(rows).toEqual([
      { kind: 'video', kind_by_user: false },
      { kind: 'article', kind_by_user: false },
      { kind: 'shopping', kind_by_user: true },
      { kind: 'other', kind_by_user: false },
    ]);
  });

  it('accepts exactly the ten kinds of LINK_KIND', async () => {
    for (const kind of Object.values(LINK_KIND)) {
      await db.query(
        `UPDATE links SET kind = $1 WHERE url = 'https://github.com/angular/angular'`,
        [kind],
      );
    }
    const { rows } = await db.query<{ check: string }>(
      `SELECT pg_get_constraintdef(oid) AS check FROM pg_constraint WHERE conname = 'links_kind_check'`,
    );
    const allowed = [...(rows[0]?.check ?? '').matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
    expect(allowed.sort()).toEqual(Object.values(LINK_KIND).sort());
  });

  it('still refuses an unknown kind', async () => {
    await expect(db.exec(`UPDATE links SET kind = 'sticker'`)).rejects.toThrow(/links_kind_check/);
  });
});
