import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { vector } from '@electric-sql/pglite-pgvector';
import { LIBRARY_VIEW } from '@shelfmark/contracts';
import { migrationFiles } from '../../test-utils/test-database';

const MIGRATION = '20261223120000_default_view_masonry';
const CARDS = '0193a3a0-0000-7000-8000-000000000011';
const LIST = '0193a3a0-0000-7000-8000-000000000012';
const NEW = '0193a3a0-0000-7000-8000-000000000013';

/** Shelf (ADR 0061): every account moves to the Masonry view, new ones start with it. */
describe(`migration ${MIGRATION}`, () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await PGlite.create({ extensions: { pg_trgm, vector } });
    const files = migrationFiles();
    const index = files.findIndex((file) => file.includes(MIGRATION));
    expect(index).toBeGreaterThan(0);
    for (const file of files.slice(0, index)) await db.exec(readFileSync(file, 'utf8'));

    await db.exec(`
      INSERT INTO users (id, name, email, default_view, updated_at) VALUES
        ('${CARDS}', 'Cards', 'cards@example.test', 'cards', now()),
        ('${LIST}', 'List', 'list@example.test', 'list', now());
    `);
    for (const file of files.slice(index)) await db.exec(readFileSync(file, 'utf8'));
  });

  afterAll(async () => {
    await db.close();
  });

  it('moves every existing account to masonry', async () => {
    const { rows } = await db.query<{ default_view: string }>(
      'SELECT default_view FROM users ORDER BY id',
    );
    expect(rows.map((row) => row.default_view)).toEqual([
      LIBRARY_VIEW.Masonry,
      LIBRARY_VIEW.Masonry,
    ]);
  });

  it('gives a new account masonry and still accepts every view of LIBRARY_VIEW', async () => {
    await db.exec(
      `INSERT INTO users (id, name, email, updated_at) VALUES ('${NEW}', 'New', 'new@example.test', now())`,
    );
    const { rows } = await db.query<{ default_view: string }>(
      `SELECT default_view FROM users WHERE id = '${NEW}'`,
    );
    expect(rows[0]?.default_view).toBe(LIBRARY_VIEW.Masonry);
    for (const view of Object.values(LIBRARY_VIEW)) {
      await db.query(`UPDATE users SET default_view = $1 WHERE id = '${NEW}'`, [view]);
    }
  });

  it('still refuses an unknown view', async () => {
    await expect(db.exec(`UPDATE users SET default_view = 'grid'`)).rejects.toThrow(
      /users_default_view_check/,
    );
  });
});
